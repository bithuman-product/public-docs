#!/usr/bin/env node
// THE REFUSALS ARE DRIVEN, NOT ATTESTED.
//
// WHY THIS EXISTS. credential-claims.json records the version each credential
// claim was driven against, and a human moves that version after re-driving the
// arm. For most claims that is the best available: proving a render happens
// costs a credential and real money.
//
// ★But the REFUSAL arms are free. "X refuses without a credential" is driven by
// running the artifact with NO credential: nothing renders, nothing is billed,
// no secret and no device are needed, and the arm ends in a non-zero exit in
// seconds. For those claims a version field is a promise that someone looked,
// and a promise can be bumped by a tired person at 2 a.m. to clear a red run.
// This driver removes the promise: it reproduces the refusals on today's
// published bytes, so there is nothing left to attest.
//
// ★WHY EACH ARM ASSERTS AN EXACT CODE AND NOT "NON-ZERO". Measured while
// building this: the CLI resolves the MODEL BEFORE it checks the credential, so
// an arm pointed at a path that does not exist exits 66 MODEL_NOT_FOUND. An
// arm asserting only "it failed" would pass on a run that never reached the
// credential check at all — a green earned by the wrong refusal. Hence the
// model-resolution control below: one arm deliberately names a missing model
// and REQUIRES 66, which proves the other arms got past the step that would
// otherwise fake their result.
//
// EXIT 0 every refusal reproduced on today's bytes · 1 one did not · 2 CANNOT
// CHECK — the binary or model could not be obtained. Two is a failure you can
// see, never a pass.
//
// USAGE
//   node scripts/check-cli-refusals.mjs
//   node scripts/check-cli-refusals.mjs --selftest

import { writeFileSync, mkdtempSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const TAP = "bithuman-product/homebrew-bithuman";
const ASSET = "bithuman-x86_64-unknown-linux-gnu.tar.gz";
const UA = "bithuman-public-docs-cli-refusals (+https://github.com/bithuman-product/public-docs)";
const SLUG = "marmalade"; // a showcase avatar: anonymous pull, no account, no charge

class CannotCheck extends Error {}

async function get(url, headers = {}) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
      if (res.ok) return res;
      if (![403, 408, 429].includes(res.status) && res.status < 500) throw new CannotCheck(`${url} -> HTTP ${res.status}`);
      last = new CannotCheck(`${url} -> HTTP ${res.status}`);
    } catch (err) {
      if (err instanceof CannotCheck && !/HTTP (403|408|429|5\d\d)/.test(err.message)) throw err;
      last = err instanceof CannotCheck ? err : new CannotCheck(`${url} -> ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
  throw last;
}

async function newestCli() {
  const headers = { Accept: "application/vnd.github+json" };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const rows = await (await get(`https://api.github.com/repos/${TAP}/releases?per_page=100`, headers)).json();
  if (!Array.isArray(rows)) throw new CannotCheck("the tap's release list did not parse");
  const cmp = (a, b) => {
    const A = a.split(".").map(Number), B = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0);
    return 0;
  };
  // Tag prefix, never `gh release view`: that returns the Swift SDK on this tap.
  const tags = rows.filter((r) => !r.draft && !r.prerelease)
    .map((r) => /^cli-v(\d+\.\d+\.\d+)$/.exec(r.tag_name || "")).filter(Boolean)
    .map((m) => m[1]).sort(cmp);
  if (!tags.length) throw new CannotCheck(`${TAP}: no published cli-v* release`);
  return tags.at(-1);
}

/** Run one arm with a clean environment. Returns {code, json, stderr}. */
function drive(bin, home, args, env = {}) {
  const base = { ...process.env, HOME: home };
  delete base.BITHUMAN_API_SECRET;
  delete base.BITHUMAN_UNMETERED;
  delete base.BITHUMAN_API_BASE;
  const res = spawnSync(bin, args, {
    env: { ...base, ...env }, encoding: "utf8", timeout: 240_000, killSignal: "SIGKILL",
  });
  const blob = `${res.stdout || ""}\n${res.stderr || ""}`;
  const m = /"code"\s*:\s*"([A-Z_]+)"/.exec(blob);
  return { code: res.status, name: m ? m[1] : null, blob };
}

const ARMS = [
  { id: "model-resolution control",
    why: "proves the other arms got PAST model resolution; without it a 66 would masquerade as a refusal",
    args: (m) => ["render", "/nonexistent/missing.imx", "-a", "/nonexistent/a.wav", "-o", "/dev/null", "--json"],
    env: {}, expectCode: 66, expectName: "MODEL_NOT_FOUND" },
  { id: "render refuses with no credential",
    why: "sdk/cli.md and the changelog say render stops before the first frame",
    args: (m) => ["render", m, "-a", m, "-o", "/dev/null", "--json"],
    env: {}, expectCode: 77, expectName: "NOT_SIGNED_IN" },
  { id: "run refuses with no credential",
    why: "from 2.6.20 this is true on Linux too, which is the claim the pages make",
    args: (m) => ["run", m, "--host", "127.0.0.1", "--port", "18991", "--json"],
    env: {}, expectCode: 77, expectName: "METERING_REFUSED" },
  { id: "BITHUMAN_UNMETERED=1 does not buy a render",
    why: "guides/pricing says no environment variable renders free in the CLI",
    args: (m) => ["run", m, "--host", "127.0.0.1", "--port", "18992", "--json"],
    env: { BITHUMAN_UNMETERED: "1" }, expectCode: 77, expectName: "METERING_REFUSED" },
  { id: "wildcard bind is refused without the opt-in",
    why: "sdk/cli and the changelog say exit 2 with nothing listening",
    args: (m) => ["run", m, "--host", "0.0.0.0", "--port", "18993", "--json"],
    env: {}, expectCode: 2, expectName: "PUBLIC_BIND_REFUSED" },
];

function grade(results) {
  const findings = [];
  for (const r of results) {
    if (r.code !== r.expectCode || (r.expectName && r.name !== r.expectName)) {
      findings.push(`${r.id}: expected exit ${r.expectCode} ${r.expectName}, got exit ${r.code} ${r.name || "(no code in output)"} — ${r.why}`);
    }
  }
  return findings;
}

function selftest() {
  const arms = [
    { name: "an arm that reproduces its refusal passes",
      rows: [{ id: "a", why: "w", code: 77, name: "NOT_SIGNED_IN", expectCode: 77, expectName: "NOT_SIGNED_IN" }], expect: 0 },
    { name: "RED CONTROL: a refusal that stopped happening fails",
      rows: [{ id: "a", why: "w", code: 0, name: null, expectCode: 77, expectName: "NOT_SIGNED_IN" }], expect: 1 },
    { name: "RED CONTROL: right exit code, wrong reason fails",
      rows: [{ id: "a", why: "w", code: 77, name: "METERING_REFUSED", expectCode: 77, expectName: "NOT_SIGNED_IN" }], expect: 1 },
    { name: "RED CONTROL: a 66 standing in for a refusal fails",
      rows: [{ id: "a", why: "w", code: 66, name: "MODEL_NOT_FOUND", expectCode: 77, expectName: "NOT_SIGNED_IN" }], expect: 1 },
  ];
  let bad = 0;
  for (const a of arms) {
    const got = grade(a.rows).length ? 1 : 0;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  if (bad) { console.error(`selftest: ${bad} arm(s) wrong — the check cannot be trusted`); process.exit(1); }
  console.log("selftest: OK — three red controls fire, including a 66 masquerading as a refusal.");
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  let version, dir, bin, home, model;
  try {
    version = await newestCli();
    dir = mkdtempSync(join(tmpdir(), "bh-refuse-"));
    const tarball = join(dir, ASSET);
    writeFileSync(tarball, Buffer.from(await (await get(`https://github.com/${TAP}/releases/download/cli-v${version}/${ASSET}`)).arrayBuffer()));
    execFileSync("tar", ["xzf", tarball, "-C", dir], { stdio: "pipe" });
    bin = join(dir, "bithuman");
    home = join(dir, "home");
    mkdirSync(home, { recursive: true });
    // A showcase pull is anonymous: no account, no credential, no charge.
    const pull = drive(bin, home, ["pull", SLUG, "--json"]);
    const pm = /"path"\s*:\s*"([^"]+)"/.exec(pull.blob);
    if (!pm) throw new CannotCheck(`could not pull the showcase avatar '${SLUG}': ${pull.blob.slice(-300)}`);
    model = pm[1];
  } catch (err) {
    console.error(`::error::CANNOT CHECK — ${err instanceof CannotCheck ? err.message : err.message}`);
    console.error("CANNOT CHECK is a failure, never a pass: no refusal was driven.");
    if (dir) rmSync(dir, { recursive: true, force: true });
    process.exit(2);
  }
  console.log(`driving the refusals on cli-v${version}, published bytes, empty HOME, no credential in the environment`);
  const results = [];
  for (const arm of ARMS) {
    const r = drive(bin, home, arm.args(model), arm.env);
    results.push({ ...arm, code: r.code, name: r.name });
    console.log(`  ${arm.id}: exit ${r.code} ${r.name || ""}`);
  }
  rmSync(dir, { recursive: true, force: true });
  const findings = grade(results);
  if (findings.length) {
    for (const f of findings) console.error(`::error::${f}`);
    console.error("\nA refusal the pages promise did not happen on today's published bytes.");
    console.error("Either the product changed and the pages must, or the pages were wrong.");
    process.exit(1);
  }
  console.log("OK — every refusal the pages promise was reproduced on today's published bytes.");
  console.log("(These claims need no version field: nothing is attested, the arm was driven.)");
}

main();
