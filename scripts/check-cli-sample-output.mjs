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

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TAP = "bithuman-product/homebrew-bithuman";
const ASSET = "bithuman-x86_64-unknown-linux-gnu.tar.gz";
const UA = "bithuman-public-docs-cli-sample-check (+https://github.com/bithuman-product/public-docs)";

const PAGES = {
  text: "src/content/docs/sdk/cli.md",
  json: "src/content/docs/sdk/cli/reference.md",
};

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
    const tarball = join(dir, ASSET);
    writeFileSync(tarball, buf);
    execFileSync("tar", ["xzf", tarball, "-C", dir], { stdio: "inherit" });
    const bin = join(dir, "bithuman");
    const home = join(dir, "home");
    mkdirSync(home, { recursive: true });
    const out = execFileSync(bin, ["version", "--json"], {
      encoding: "utf8",
      timeout: 120000,
      env: { ...process.env, HOME: home },
    });
    const j = JSON.parse(out);
    if (!j.cli || !j.libessence || j.abi === undefined) {
      throw new CannotCheck(`the binary's version --json lacks cli/libessence/abi: ${out.slice(0, 200)}`);
    }
    return { cli: j.cli, libessence: j.libessence, abi: j.abi };
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
  console.log(
    bad === 0
      ? "check-cli-sample-output --selftest: OK — 4 defect arms fire, 2 good arms stay silent, both real pages carry a block."
      : `check-cli-sample-output --selftest: ${bad} arm(s) wrong`,
  );
  return bad === 0 ? 0 : 1;
}

/* -------------------------------------------------------------------- main */

if (process.argv.includes("--selftest")) process.exit(selftest());

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

console.log(`the published binary prints cli ${binary.cli}, libessence ${binary.libessence}, abi ${binary.abi}`);

const faults = [];
for (const [kind, rel] of Object.entries(PAGES)) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const sample = kind === "text" ? sampleFromText(text) : sampleFromJson(text);
  const needle = kind === "text" ? "libessence" : '{"abi":';
  for (const f of compare(rel, sample, binary)) faults.push({ rel, line: lineOf(text, needle), msg: f });
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
