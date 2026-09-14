#!/usr/bin/env node
// EVERY ENVIRONMENT VARIABLE THE CLI PAGES NAME EXISTS IN A SHIPPED ARTIFACT.
//
// WHY THIS EXISTS. Measured 2026-09-14: the pricing page told developers that
// `BITHUMAN_UNMETERED=1` renders free in the Python SDK. Run on the customer
// path, the published wheel refuses a credential-less render identically with
// and without it — the escape is compiled out of public wheels. The claim had
// been live for weeks because nothing ever drove it against the artifact.
//
// The general defect is a page naming something the shipped thing does not
// have. The mechanizable slice of it is the NAME: an environment variable a
// page tells a reader to set must at least exist in the artifact that reads
// it. A renamed or removed variable otherwise goes stale in silence — no
// registry serves these, so no currency check can see them.
//
// WHAT IT CANNOT DO, said plainly so nobody reads more into a green run: this
// grades that the NAME EXISTS, never what the artifact DOES with it. A string
// in a shipped artifact is evidence the name exists and nothing more — which
// is exactly the error that put the false Python claim on the page, where a
// real string and a real docstring sat beside a behaviour that refused. Only a
// run on the customer path settles behaviour.
//
// WHAT IT DOES
//   1. Collects BITHUMAN_* names from the CLI pages (and only those: other
//      pages name variables belonging to other artifacts, which this check
//      has no business grading).
//   2. Asks the tap for the newest cli-v* release that is neither a draft nor
//      a pre-release — the tag-prefix discipline the other checks use, because
//      `gh release view` on that tap returns the Swift SDK, not the CLI.
//   3. Downloads that binary and the installer, and requires every name to
//      appear in one of them.
//
// EXIT 0 every name is accounted for · 1 a page names something no shipped
// artifact has · 2 CANNOT CHECK — an artifact could not be fetched. Two is a
// failure you can see, never a pass.
//
// USAGE
//   node scripts/check-env-names-exist.mjs
//   node scripts/check-env-names-exist.mjs --selftest

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TAP = "bithuman-product/homebrew-bithuman";
const ASSET = "bithuman-x86_64-unknown-linux-gnu.tar.gz";
const INSTALLER = `https://raw.githubusercontent.com/${TAP}/main/install.sh`;
const UA = "bithuman-public-docs-env-name-check (+https://github.com/bithuman-product/public-docs)";

// Only pages about the CLI. A variable named on a Python or Android page is
// read by that artifact, not by this binary, and grading it here would produce
// exactly the kind of confident wrong answer this check exists to prevent.
const PAGES = [
  "src/content/docs/sdk/cli.md",
  "src/content/docs/sdk/cli/reference.md",
  "src/content/docs/sdk/cli/local-mode.md",
];

// Names a CLI page may legitimately mention that this binary does not read.
// Each needs a reason and the artifact that DOES read it, so the list cannot
// quietly become a place to silence real findings.
const READ_ELSEWHERE = {
  // e.g. BITHUMAN_UNMETERED: "read by the Android Essence 2 SDK; the CLI ignores it from 2.6.20",
};

const NAME = /BITHUMAN_[A-Z0-9_]+/g;

class CannotCheck extends Error {}

async function get(url, headers = {}) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
      if (res.ok) return res;
      if (![403, 408, 429].includes(res.status) && res.status < 500) {
        throw new CannotCheck(`${url} -> HTTP ${res.status}`);
      }
      last = new CannotCheck(`${url} -> HTTP ${res.status}`);
    } catch (err) {
      if (err instanceof CannotCheck && !/HTTP (403|408|429|5\d\d)/.test(err.message)) throw err;
      last = err instanceof CannotCheck ? err : new CannotCheck(`${url} -> ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
  throw last;
}

function namesOnPages(root = ROOT) {
  const found = new Map(); // name -> [pages]
  for (const rel of PAGES) {
    let text;
    try {
      text = readFileSync(join(root, rel), "utf8");
    } catch {
      throw new CannotCheck(`${rel} could not be read`);
    }
    for (const m of text.match(NAME) || []) {
      if (!found.has(m)) found.set(m, []);
      const pages = found.get(m);
      if (!pages.includes(rel)) pages.push(rel);
    }
  }
  return found;
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

/** The binary's bytes, as text we can search for literal names. */
async function publishedBinaryText(version) {
  const url = `https://github.com/${TAP}/releases/download/cli-v${version}/${ASSET}`;
  const dir = mkdtempSync(join(tmpdir(), "bh-env-"));
  try {
    const res = await get(url);
    const tarball = join(dir, ASSET);
    writeFileSync(tarball, Buffer.from(await res.arrayBuffer()));
    execFileSync("tar", ["xzf", tarball, "-C", dir], { stdio: "pipe" });
    const bin = join(dir, "bithuman");
    const bytes = readFileSync(bin);
    if (bytes.length < 1_000_000) throw new CannotCheck("the extracted binary is implausibly small");
    return bytes.toString("latin1");
  } catch (err) {
    if (err instanceof CannotCheck) throw err;
    throw new CannotCheck(`the published binary could not be obtained: ${err.message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function grade(names, haystacks) {
  const findings = [];
  for (const [name, pages] of names) {
    if (name in READ_ELSEWHERE) continue;
    const where = haystacks.filter(({ text }) => text.includes(name)).map(({ label }) => label);
    if (where.length === 0) {
      findings.push(`${name} is named by ${pages.join(", ")} but appears in no shipped artifact (binary, installer).`);
    }
  }
  return findings;
}

function selftest() {
  const bin = { label: "binary", text: "xx BITHUMAN_API_SECRET yy BITHUMAN_METER_ENFORCE zz" };
  const inst = { label: "installer", text: "BITHUMAN_INSTALL_DIR=/usr/local" };
  const arms = [
    {
      name: "a name in the binary passes",
      names: new Map([["BITHUMAN_API_SECRET", ["p.md"]]]),
      expect: 0,
    },
    {
      name: "a name only in the installer passes",
      names: new Map([["BITHUMAN_INSTALL_DIR", ["p.md"]]]),
      expect: 0,
    },
    {
      name: "RED CONTROL: a name in neither artifact fails",
      names: new Map([["BITHUMAN_GONE_AWAY", ["p.md"]]]),
      expect: 1,
    },
    {
      name: "a documented elsewhere-read name is skipped",
      names: new Map([["BITHUMAN_UNMETERED", ["p.md"]]]),
      expect: 0,
      elsewhere: { BITHUMAN_UNMETERED: "read by another artifact" },
    },
  ];
  let bad = 0;
  for (const arm of arms) {
    if (arm.elsewhere) Object.assign(READ_ELSEWHERE, arm.elsewhere);
    const got = grade(arm.names, [bin, inst]).length ? 1 : 0;
    if (arm.elsewhere) for (const k of Object.keys(arm.elsewhere)) delete READ_ELSEWHERE[k];
    const ok = got === arm.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${arm.name}`);
  }
  if (bad) {
    console.error(`selftest: ${bad} arm(s) wrong — the check cannot be trusted`);
    process.exit(1);
  }
  console.log("selftest: OK — the red control fails and the green arms pass.");
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  let names, version, binary, installer;
  try {
    names = namesOnPages();
    version = await newestCliRelease();
    binary = await publishedBinaryText(version);
    installer = await (await get(INSTALLER)).text();
  } catch (err) {
    console.error(`::error::CANNOT CHECK — ${err.message}`);
    console.error("CANNOT CHECK is a failure, never a pass: the pages were not graded.");
    process.exit(2);
  }
  console.log(`graded against cli-v${version} and the published installer`);
  console.log(`${names.size} BITHUMAN_* name(s) across ${PAGES.length} CLI page(s)`);
  const findings = grade(names, [
    { label: "binary", text: binary },
    { label: "installer", text: installer },
  ]);
  if (findings.length) {
    for (const f of findings) console.error(`::error::${f}`);
    console.error("\nA page names an environment variable no shipped artifact has.");
    console.error("Either the variable was renamed or removed, or the page invented it.");
    process.exit(1);
  }
  console.log("OK — every environment variable the CLI pages name exists in the binary or the installer.");
  console.log("(This grades the NAME only. What the artifact DOES with it needs a run on the customer path.)");
}

main();
