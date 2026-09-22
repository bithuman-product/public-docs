#!/usr/bin/env node
// THE SAMPLE OUTPUT ON THE PAGE IS WHAT THE PUBLISHED BINARY PRINTS.
//
// WHY THIS EXISTS. Two pages print what `bithuman --version` and
// `bithuman version --json` produce, and a reader compares their own terminal
// against them. Those blocks carry THREE facts: the CLI's own version, the
// version of the engine inside it, and the ABI. check-versions-current.mjs
// grades the first, because a registry serves it. Nothing graded the other two.
//
// Measured 2026-09-14: cli-v2.6.15 moved the engine inside from 3.1.4 to 3.1.5
// in the same release that moved the CLI from 2.6.14 to 2.6.15. A bump that
// only followed the registry would have written the new CLI number beside a
// stale engine number and read as correct. The engine version has no registry
// at all — the only thing that knows it is the published binary — so this
// check runs the published binary and compares.
//
// WHY DAILY AND NOT HOURLY. It downloads a 168 MB tarball and executes it.
// That is too heavy to run beside the version guard every hour, and it does not
// need to be: the sample output can only go stale when a release publishes, and
// check-versions-current fails within the hour on the CLI number in the same
// block, which is the signal to re-print both. This is the backstop that
// catches the half that has no registry.
//
// WHAT IT DOES
//   1. Asks the tap for the newest cli-v* release that is neither a draft nor a
//      pre-release (the same tag-prefix discipline the version guard uses,
//      because `gh release view` on that tap returns the Swift SDK).
//   2. Downloads the Linux x86_64 tarball, extracts it, and runs
//      `bithuman version --json` on a fresh HOME.
//   3. Compares cli, libessence and abi against BOTH sample blocks:
//      sdk/cli.md's `--version` text and sdk/cli/reference.md's JSON shape.
//
// EXIT 0 the page matches the binary · 1 it does not · 2 the binary could not
// be obtained or run. Two is a failure you can see, never a pass.
//
// USAGE
//   node scripts/check-cli-sample-output.mjs
//   node scripts/check-cli-sample-output.mjs --observed '{"cli":"2.6.15","libessence":"3.1.5","abi":7}'
//   node scripts/check-cli-sample-output.mjs --selftest

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TAP = "bithuman-product/homebrew-bithuman";
const ASSET = "bithuman-x86_64-unknown-linux-gnu.tar.gz";
const UA = "bithuman-public-docs-cli-sample-check (+https://github.com/bithuman-product/public-docs)";

const PAGES = {
  text: "src/content/docs/sdk/cli.md",
  json: "src/content/docs/sdk/cli/reference.md",
};

/* ═══════════════════════════════════════════════════════════════════════════
   THE NAME HALF: every `bithuman <name>` a page teaches is a name the binary
   answers to.

   WHY. Measured 2026-09-22: www.bithuman.ai taught `bithuman demo` and
   `bithuman fingerprint`. Neither has ever been a subcommand of anything. They
   were written, reviewed, shipped and served for weeks, and the reason nothing
   caught them is that no check knew what the CLI is CALLED — the version guard
   watches numbers, the refusal driver watches behaviour, and a name that never
   existed has no registry to go stale against.

   ★ALLOWLIST, NEVER A DENYLIST. A denylist of bad names catches a bad name only
   AFTER it has shipped and someone noticed. An allowlist catches it the first
   time someone writes it. The allowlist is not curated here: it is the surface
   of the published binary, read out of its own `__schema`, so it cannot drift
   from the tool a reader actually installs.

   THE ONE PLACE THAT KNOWS WHAT THE CLI IS CALLED is scripts/cli-surface.json.
   This script already downloads and executes the published tarball to grade the
   sample blocks, so it extracts the schema in the SAME download and writes that
   file — no second fetch, and no second opinion. bithuman-ui's customer surfaces
   read the same file over raw.githubusercontent, which is why it is committed
   rather than computed on the fly.
   ═══════════════════════════════════════════════════════════════════════════ */

const SURFACE_REL = "scripts/cli-surface.json";

// clap generates `help` itself, so it is typeable (`bithuman help`, rc=0,
// measured on cli-v2.6.26) but appears in no `__schema` subcommand list. It is
// named here, not discovered, because the binary does not report it — the one
// name on this list that is a judgement rather than a measurement.
const BUILTIN_NAMES = ["help"];

// The customer-facing corpus. Every published page, plus the site chrome that
// renders on all of them — a command name in a nav label or a layout reaches a
// reader exactly as a command name in a code fence does.
// ★`src/openapi` AND `public/api` ARE BOTH HERE ON PURPOSE. public/api/openapi.yaml
// is a build-time copy of src/openapi/bithuman.yaml (`npm run sync-openapi`), but it
// is the file a developer actually FETCHES from docs.bithuman.ai/api/openapi.yaml.
// Grading only the published copy would leave an edit to the source unseen until a
// sync ran; grading only the source would leave the published bytes unchecked if the
// copy ever drifted. The spec teaches real commands — `bithuman pull <AGENT_CODE>`,
// `bithuman list --manifest`, `bithuman open` — so it is a CLI surface, not just a
// schema. This mirrors the roots the retired-name guard beside it walks.
const NAME_ROOTS = [
  "src/content", "src/pages", "src/components", "src/layouts",
  "src/config", "src/data", "src/openapi", "public/api",
  "README.md", "STYLE.md",
];
const NAME_EXT = /\.(md|mdx|astro|ts|tsx|js|mjs|json|yaml|yml|html|txt)$/;

// ★A CHANGELOG IS A HISTORICAL RECORD, and it must be able to say that a
//  command was REMOVED. `bithuman auth …` really did exist and really is gone;
//  an entry that says so is the only way a reader with an old script learns it.
//  Grading these pages would force us to delete true history to get a green,
//  which is how a check earns its way into someone's disable list.
//  THE COST, stated plainly rather than hidden: a NEW changelog entry that
//  teaches a command that never existed is NOT graded by this check.
const HISTORICAL = [/^src\/content\/docs\/changelog\.md$/, /^src\/content\/docs\/changelog\//];

// A page may name a command that does not exist in order to say IT DOES NOT
// EXIST. Each row is a (path, name) pair, never a whole path: a blanket path
// allow would let the NEXT invented name through on the same page.
// A row whose page no longer carries that name is STALE and is RED — the same
// discipline the retired-name ratchet in bithuman-ui uses for its allow rows.
const DENIAL_ROWS = [
  // e.g. ["src/content/docs/sdk/cli.md", "fingerprint"],
];

/** Every name typeable after `bithuman`, read out of the binary's own schema. */
export function typeableFromSchema(schema) {
  const names = new Set(BUILTIN_NAMES);
  const paths = new Set();
  const walk = (node, prefix) => {
    for (const sub of node?.subcommands || []) {
      for (const n of [sub.name, ...(sub.aliases || [])]) {
        if (!n) continue;
        paths.add(`${prefix}${n}`.trim());
        if (!prefix) names.add(n);
      }
      walk(sub, `${prefix}${sub.name} `);
    }
  };
  walk(schema?.commands, "");
  if (names.size <= BUILTIN_NAMES.length) {
    throw new CannotCheck("the binary's __schema listed no subcommands — nothing to build an allowlist from");
  }
  return { names: [...names].sort(), paths: [...paths].sort() };
}

/** The committed surface document, shaped like python-surface.json beside it. */
export function surfaceDoc({ version, digest, schema }) {
  const { names, paths } = typeableFromSchema(schema);
  return {
    artifact: {
      registry: "github-releases",
      coordinate: TAP,
      tag: `cli-v${version}`,
      version,
      asset: ASSET,
      digest,
      resolved_on: new Date().toISOString().slice(0, 10),
    },
    surface: {
      schema_version: schema.schema_version ?? null,
      note:
        "Every name typeable after `bithuman`, read out of the published binary's own `__schema`. " +
        "Regenerate with `node scripts/check-cli-sample-output.mjs --emit-surface`; never edit by hand.",
      builtins: BUILTIN_NAMES,
      names,
      paths,
    },
  };
}

function corpus(root = ROOT) {
  const files = [];
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    if (statSync(abs).isFile()) { if (NAME_EXT.test(rel)) files.push(rel); return; }
    for (const e of readdirSync(abs).sort()) walk(`${rel}/${e}`);
  };
  for (const r of NAME_ROOTS) walk(r);
  return files.filter((f) => !HISTORICAL.some((re) => re.test(f))).sort();
}

/* `bithuman` in COMMAND POSITION, followed by a bare word.

   The prefix test is what keeps this off prose, and it was built by running it
   over the whole site: `from bithuman import Avatar`, `pip install
   livekit-plugins-bithuman pillow`, `Computed homebrew-bithuman at 2.5.1`,
   `which bithuman wheel`, `Every bithuman subcommand` and `/bithuman` all name
   a package, a repo or a noun — not a command — and every one of them is
   silent here because the character before `bithuman` is a word character,
   a `-`, a `.` or a `/`. A command, by contrast, starts a line or follows a
   shell prompt, a backtick, a quote, a pipe or `<Code>`. */
const INVOCATION = /bithuman[ \t]+([a-z][a-z0-9-]*)/g;

export function inCommandPosition(text, idx) {
  let i = idx - 1;
  while (i >= 0 && (text[i] === " " || text[i] === "\t")) i--;
  if (i < 0) return true;
  const c = text[i];
  if (c === "\n" || c === "\r") return true;
  return "`>$(;&|\"'".includes(c);
}

/** Every `bithuman <name>` invocation on one page. */
export function invocationsIn(text) {
  const out = [];
  INVOCATION.lastIndex = 0;
  let m;
  while ((m = INVOCATION.exec(text))) {
    if (!inCommandPosition(text, m.index)) continue;
    out.push({ name: m[1], line: text.slice(0, m.index).split("\n").length });
  }
  return out;
}

/** Grade one tree. Returns faults; an empty corpus throws, never passes. */
export function gradeNames(files, allowed, readFile, denialRows = DENIAL_ROWS) {
  if (files.length === 0) {
    throw new CannotCheck("the name corpus is empty — nothing was graded, which is never a pass");
  }
  const faults = [];
  const used = new Set();
  for (const rel of files) {
    let text;
    try { text = readFile(rel); } catch { throw new CannotCheck(`${rel} could not be read`); }
    for (const { name, line } of invocationsIn(text)) {
      if (allowed.has(name)) continue;
      const row = denialRows.find(([p, n]) => p === rel && n === name);
      if (row) { used.add(row.join("\t")); continue; }
      faults.push({
        rel, line,
        msg: `\`bithuman ${name}\` is not a command the published CLI has. A reader who types it gets a usage error (exit 2). The binary's own names are in ${SURFACE_REL}.`,
      });
    }
  }
  for (const row of denialRows) {
    if (!used.has(row.join("\t"))) {
      faults.push({
        rel: row[0], line: 1,
        msg: `stale allow row: ${row[0]} no longer names \`bithuman ${row[1]}\`, so the row permits nothing and must be deleted.`,
      });
    }
  }
  return faults;
}

class CannotCheck extends Error {}

/* ----------------------------------------------------------- extraction */

/** The `bithuman --version` block: three facts, written as a terminal would. */
export function sampleFromText(text) {
  const eng = /^libessence\s+(\d+\.\d+\.\d+)\s+ABI\s+(\d+)/m.exec(text);
  const cli = /^bithuman\s+(\d+\.\d+\.\d+)\s*$|^bithuman\s+(\d+\.\d+\.\d+)\s+#/m.exec(text);
  if (!eng || !cli) return null;
  return { libessence: eng[1], abi: Number(eng[2]), cli: cli[1] || cli[2] };
}

/** The `version --json` shape. */
export function sampleFromJson(text) {
  const m = /\{"abi":(\d+),"cli":"(\d+\.\d+\.\d+)","libessence":"(\d+\.\d+\.\d+)"/.exec(text);
  if (!m) return null;
  return { abi: Number(m[1]), cli: m[2], libessence: m[3] };
}

export function lineOf(text, needle) {
  const i = text.indexOf(needle);
  return i < 0 ? 1 : text.slice(0, i).split("\n").length;
}

/** Compare one page's sample against the binary. Returns a list of faults. */
export function compare(where, sample, binary) {
  if (sample === null) {
    return [`${where}: no sample output found — the block changed shape, so this check is grading nothing`];
  }
  const out = [];
  for (const field of ["cli", "libessence", "abi"]) {
    if (String(sample[field]) !== String(binary[field])) {
      out.push(
        `${where}: the sample prints ${field} ${sample[field]}, but the published binary prints ` +
          `${binary[field]}. A reader comparing their own terminal against this page sees a mismatch.`,
      );
    }
  }
  return out;
}

/* ------------------------------------------------------------- the binary */

async function get(url, headers = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": UA, ...headers },
        signal: AbortSignal.timeout(180000),
      });
    } catch (e) {
      if (attempt === 4) throw new CannotCheck(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
      continue;
    }
    if (res.ok) return res;
    if (![403, 408, 429, 500, 502, 503, 504].includes(res.status) || attempt === 4) {
      throw new CannotCheck(`${url}: HTTP ${res.status}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
  }
  throw new CannotCheck(`${url}: exhausted retries`);
}

async function newestCliRelease() {
  const headers = { Accept: "application/vnd.github+json" };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const rows = await (await get(`https://api.github.com/repos/${TAP}/releases?per_page=100`, headers)).json();
  if (!Array.isArray(rows)) throw new CannotCheck("the tap's release list did not parse");
  const semver = (s) => s.split(".").map(Number);
  const cmp = (a, b) => {
    const A = semver(a), B = semver(b);
    for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0);
    return 0;
  };
  const tags = rows
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => /^cli-v(\d+\.\d+\.\d+)$/.exec(r.tag_name || ""))
    .filter(Boolean)
    .map((m) => m[1])
    .sort(cmp);
  const newest = tags.at(-1);
  if (!newest) throw new CannotCheck(`${TAP}: no published cli-v* release found`);
  return newest;
}

async function runPublishedBinary(version) {
  const url = `https://github.com/${TAP}/releases/download/cli-v${version}/${ASSET}`;
  const dir = mkdtempSync(join(tmpdir(), "bh-cli-"));
  try {
    const res = await get(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = createHash("sha256").update(buf).digest("hex");
    const tarball = join(dir, ASSET);
    writeFileSync(tarball, buf);
    execFileSync("tar", ["xzf", tarball, "-C", dir], { stdio: "inherit" });
    const bin = join(dir, "bithuman");
    const home = join(dir, "home");
    mkdirSync(home, { recursive: true });
    const run = (args) =>
      execFileSync(bin, args, { encoding: "utf8", timeout: 120000, maxBuffer: 64 << 20, env: { ...process.env, HOME: home } });

    const out = run(["version", "--json"]);
    const j = JSON.parse(out);
    if (!j.cli || !j.libessence || j.abi === undefined) {
      throw new CannotCheck(`the binary's version --json lacks cli/libessence/abi: ${out.slice(0, 200)}`);
    }

    // The SAME download serves the name half. `__schema` is the binary
    // describing its own surface; it is the only thing that knows it.
    let schema;
    try {
      schema = JSON.parse(run(["__schema"]));
    } catch (e) {
      throw new CannotCheck(`the published cli-v${version} binary would not emit __schema: ${e.message}`);
    }
    if (!schema?.commands?.subcommands?.length) {
      throw new CannotCheck("the binary's __schema carries no subcommands — an allowlist built from it would permit nothing");
    }

    return { cli: j.cli, libessence: j.libessence, abi: j.abi, schema, digest: `sha256:${sha}` };
  } catch (e) {
    if (e instanceof CannotCheck) throw e;
    throw new CannotCheck(`could not run the published cli-v${version} binary: ${e.message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ---------------------------------------------------------------- selftest */

const GOOD_TEXT =
  "```text\n$ bithuman --version\nlibessence  3.1.5 ABI 7          # the engine inside\nbithuman    2.6.15               # the CLI itself\n```\n";
const STALE_ENGINE =
  "```text\nlibessence  3.1.4 ABI 7\nbithuman    2.6.15\n```\n";
const STALE_CLI = "```text\nlibessence  3.1.5 ABI 7\nbithuman    2.6.14\n```\n";
const GOOD_JSON = '{"abi":7,"cli":"2.6.15","libessence":"3.1.5",\n "build":{}}';
const STALE_JSON_ABI = '{"abi":6,"cli":"2.6.15","libessence":"3.1.5",\n "build":{}}';
const SHAPE_CHANGED = "```text\nversion 2.6.15\n```\n";

function selftest() {
  const binary = { cli: "2.6.15", libessence: "3.1.5", abi: 7 };
  const arms = [
    ["good: the text block matches the binary", () => compare("p", sampleFromText(GOOD_TEXT), binary), 0],
    ["bad: the engine version is a release behind", () => compare("p", sampleFromText(STALE_ENGINE), binary), 1],
    ["bad: the CLI version is a release behind", () => compare("p", sampleFromText(STALE_CLI), binary), 1],
    ["good: the json shape matches the binary", () => compare("p", sampleFromJson(GOOD_JSON), binary), 0],
    ["bad: the json ABI disagrees", () => compare("p", sampleFromJson(STALE_JSON_ABI), binary), 1],
    ["bad: the block changed shape, so nothing is graded", () => compare("p", sampleFromText(SHAPE_CHANGED), binary), 1],
  ];
  let bad = 0;
  for (const [name, fn, want] of arms) {
    const n = fn().length;
    const ok = want === 0 ? n === 0 : n >= 1;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(56)} faults=${n}`);
  }
  // The extractors must see the real pages, or the arms above describe fixtures only.
  for (const [kind, rel] of Object.entries(PAGES)) {
    const text = readFileSync(join(ROOT, rel), "utf8");
    const got = kind === "text" ? sampleFromText(text) : sampleFromJson(text);
    const ok = got !== null;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${(rel + " still carries a sample block").padEnd(56)} ${JSON.stringify(got)}`);
  }
  /* ── the name half ──────────────────────────────────────────────────────
     The positive control is THE REAL HISTORY: `bithuman fingerprint` is the
     name www.bithuman.ai actually taught, and the one a customer actually
     could not run. The negative controls are the prose this matcher must not
     fire on — every one of them is a real line from this site. */
  const SCHEMA = {
    schema_version: 1,
    commands: {
      name: "bithuman",
      subcommands: [
        { name: "run", aliases: ["chat"], subcommands: [] },
        { name: "render", aliases: [], subcommands: [] },
        { name: "engine", aliases: [], subcommands: [{ name: "list", aliases: [], subcommands: [] }] },
      ],
    },
  };
  const allowed = new Set(typeableFromSchema(SCHEMA).names);
  const one = (text, rows = []) => gradeNames(["p.md"], allowed, () => text, rows).length;

  const nameArms = [
    ["FIRES: the real defect — `bithuman fingerprint` in a code span", () => one("Print it with `bithuman fingerprint` first.\n"), 1],
    ["FIRES: the other real defect — `bithuman demo` at a shell prompt", () => one("```sh\n$ bithuman demo\n```\n"), 1],
    ["FIRES: an invented name at the start of a line", () => one("```sh\nbithuman setup --all\n```\n"), 1],
    ["FIRES: an invented name inside <Code>", () => one("<Code>bithuman activate</Code>\n"), 1],
    ["silent: a real subcommand", () => one("Run `bithuman run` to start.\n"), 0],
    ["silent: a real ALIAS", () => one("Run `bithuman chat` to start.\n"), 0],
    ["silent: clap's own `help`", () => one("Try `bithuman help`.\n"), 0],
    ["silent: a nested subcommand", () => one("```sh\nbithuman engine list\n```\n"), 0],
    ["silent: a python import, not a command", () => one("```py\nfrom bithuman import AsyncBithuman\n```\n"), 0],
    ["silent: a pip coordinate, not a command", () => one("```sh\npip install livekit-plugins-bithuman pillow\n```\n"), 0],
    ["silent: a hyphenated repo name", () => one("Computed homebrew-bithuman at 2.5.1\n"), 0],
    ["silent: `bithuman` as a noun in prose", () => one("Every bithuman subcommand is listed here.\n"), 0],
    ["silent: a URL vanity path", () => one("Join discord.gg/x (not the /bithuman vanity)\n"), 0],
    ["silent: a long flag is not a name", () => one("Run `bithuman --version` to check.\n"), 0],
    ["silent: a denial row permits the exact (page, name) pair", () => one("There is no `bithuman fingerprint` command.\n", [["p.md", "fingerprint"]]), 0],
    ["FIRES: a denial row whose page no longer names it is STALE", () => one("The page was rewritten.\n", [["p.md", "fingerprint"]]), 1],
  ];
  for (const [name, fn, want] of nameArms) {
    const n = fn();
    const ok = want === 0 ? n === 0 : n >= 1;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(56)} faults=${n}`);
  }

  // An empty corpus must REFUSE, never pass silently.
  let refused = false;
  try { gradeNames([], allowed, () => ""); } catch (e) { refused = e instanceof CannotCheck; }
  if (!refused) bad++;
  console.log(`  ${refused ? "OK  " : "FAIL"}  ${"an empty corpus refuses rather than passing".padEnd(56)} ${refused ? "CannotCheck" : "PASSED VACUOUSLY"}`);

  // The real corpus must be non-empty and must include the CLI pages, or every
  // arm above describes fixtures only.
  const real = corpus();
  const hasCli = real.includes(PAGES.text) && real.includes(PAGES.json);
  if (real.length === 0 || !hasCli) bad++;
  console.log(`  ${real.length > 0 && hasCli ? "OK  " : "FAIL"}  ${"the real corpus is populated and holds the CLI pages".padEnd(56)} files=${real.length}`);

  // The committed surface must parse and carry names — it is the authority a
  // second repository reads.
  let surfaceNames = 0;
  try { surfaceNames = JSON.parse(readFileSync(join(ROOT, SURFACE_REL), "utf8")).surface.names.length; } catch { /* absent */ }
  if (surfaceNames === 0) bad++;
  console.log(`  ${surfaceNames > 0 ? "OK  " : "FAIL"}  ${(SURFACE_REL + " parses and carries names").padEnd(56)} names=${surfaceNames}`);

  console.log(
    bad === 0
      ? "check-cli-sample-output --selftest: OK — version arms and name arms all behave; the matcher fires on the two names the site really taught and stays silent on the prose it must not touch."
      : `check-cli-sample-output --selftest: ${bad} arm(s) wrong`,
  );
  return bad === 0 ? 0 : 1;
}

/* -------------------------------------------------------------------- main */

if (process.argv.includes("--selftest")) process.exit(selftest());

/* ── --from-surface: the name half alone, with no network ──────────────────
   The surface file is committed, so grading pages against it needs no
   download. That is what lets this run on every pull request beside the other
   cheap guards, while the 171 MB download stays on the daily schedule.
   A missing or unparseable surface is exit 2: the authority was unreachable,
   and a check that cannot reach its authority has not passed. */
if (process.argv.includes("--from-surface")) {
  try {
    const raw = readFileSync(join(ROOT, SURFACE_REL), "utf8");
    const doc = JSON.parse(raw);
    const names = doc?.surface?.names;
    if (!Array.isArray(names) || names.length === 0) {
      throw new CannotCheck(`${SURFACE_REL} carries no names — an empty allowlist would permit nothing and prove nothing`);
    }
    const files = corpus();
    const faults = gradeNames(files, new Set(names), (rel) => readFileSync(join(ROOT, rel), "utf8"));
    console.log(`allowlist: ${names.length} name(s) from ${doc.artifact?.tag || "?"} · corpus: ${files.length} file(s)`);
    if (faults.length) {
      console.log(`\n${faults.length} page(s) name a command the published CLI does not have:\n`);
      for (const f of faults) {
        console.log(`::error file=${f.rel},line=${f.line}::${f.msg}`);
        console.log(`  ${f.rel}:${f.line}\n      ${f.msg}\n`);
      }
      process.exit(1);
    }
    console.log("check-cli-sample-output --from-surface: OK — every `bithuman <name>` on a page is a name the published binary answers to.");
    process.exit(0);
  } catch (e) {
    if (e instanceof CannotCheck || e.code === "ENOENT" || e instanceof SyntaxError) {
      console.log(`::error::CANNOT CHECK — ${e.message}`);
      console.log("check-cli-sample-output --from-surface: COULD NOT GRADE. This is exit 2 (infrastructure), not a pass.");
      process.exit(2);
    }
    throw e;
  }
}

let binary;
const obsIdx = process.argv.indexOf("--observed");
try {
  if (obsIdx > -1) {
    binary = JSON.parse(process.argv[obsIdx + 1]);
  } else {
    const version = await newestCliRelease();
    console.log(`newest published CLI: cli-v${version} — running its Linux tarball`);
    binary = await runPublishedBinary(version);
  }
} catch (e) {
  if (e instanceof CannotCheck) {
    console.log(`::error::CANNOT CHECK — ${e.message}`);
    console.log("check-cli-sample-output: COULD NOT GRADE. This is exit 2 (infrastructure), not a pass.");
    process.exit(2);
  }
  throw e;
}

/* ── the surface file, written from the download we already did ─────────── */
if (binary.schema) {
  const doc = surfaceDoc({ version: binary.cli, digest: binary.digest, schema: binary.schema });
  if (process.argv.includes("--emit-surface")) {
    writeFileSync(join(ROOT, SURFACE_REL), JSON.stringify(doc, null, 2) + "\n");
    console.log(`wrote ${SURFACE_REL} — ${doc.surface.names.length} typeable name(s) from ${doc.artifact.tag}`);
    process.exit(0);
  }
  // Not emitting: the COMMITTED file must already say what the binary says.
  // `resolved_on` and `digest` move with every re-run, so only the NAMES are
  // graded — the surface is what this file exists to state.
  let committed = null;
  try { committed = JSON.parse(readFileSync(join(ROOT, SURFACE_REL), "utf8")); } catch { /* absent */ }
  const have = JSON.stringify(committed?.surface?.names || []);
  const want = JSON.stringify(doc.surface.names);
  if (have !== want) {
    console.log(`::error file=${SURFACE_REL},line=1::${SURFACE_REL} disagrees with the published binary. It lists ${JSON.parse(have).length} name(s); cli-v${binary.cli} has ${doc.surface.names.length}. Regenerate with \`node scripts/check-cli-sample-output.mjs --emit-surface\`.`);
    console.log(`  committed: ${have}`);
    console.log(`  binary   : ${want}`);
    process.exit(1);
  }
  console.log(`${SURFACE_REL} matches cli-v${binary.cli}: ${doc.surface.names.length} typeable name(s)`);
}

console.log(`the published binary prints cli ${binary.cli}, libessence ${binary.libessence}, abi ${binary.abi}`);

const faults = [];
for (const [kind, rel] of Object.entries(PAGES)) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const sample = kind === "text" ? sampleFromText(text) : sampleFromJson(text);
  const needle = kind === "text" ? "libessence" : '{"abi":';
  for (const f of compare(rel, sample, binary)) faults.push({ rel, line: lineOf(text, needle), msg: f });
}

// The name half, graded against the schema this same binary just printed —
// not against the committed file, so a green here is a statement about the
// BINARY and not about a file we also wrote.
if (binary.schema) {
  const files = corpus();
  console.log(`grading ${files.length} page(s) for command names the binary does not have`);
  for (const f of gradeNames(files, new Set(typeableFromSchema(binary.schema).names), (rel) => readFileSync(join(ROOT, rel), "utf8"))) {
    faults.push(f);
  }
}

if (faults.length) {
  console.log(`\n${faults.length} disagreement(s) between the pages and the published binary:\n`);
  for (const f of faults) {
    console.log(`::error file=${f.rel},line=${f.line}::${f.msg}`);
    console.log(`  ${f.rel}:${f.line}\n      ${f.msg}\n`);
  }
  console.log("Fix: re-print both sample blocks from the published binary — the CLI version, the engine version and the ABI move together.");
  process.exit(1);
}

console.log("check-cli-sample-output: OK — both sample blocks print what the published binary prints (cli, engine version and ABI).");
