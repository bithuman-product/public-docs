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
// ★AND WHY THE ARMS WATCH MORE THAN THE EXIT CODE. An arm tends to watch the
// step just BEFORE the thing being claimed, and the cheap version of the arm
// stops there. The pages do not claim "exit 2"; they claim NOTHING IS
// LISTENING. They do not claim "exit 77"; they claim NO OUTPUT WAS WRITTEN. A
// build that printed the right refusal, exited the right code, and still bound
// a socket or wrote a file would pass an exit-code-only gate with a clean
// green. So the wildcard arm polls the socket table WHILE the command runs,
// and the render arm checks the output path afterwards.
//
// ★THE DETECTOR HAS ITS OWN READ CONTROL. "No listener was ever seen" and "the
// socket table was never readable" are the same output. Before any arm runs,
// this gate opens a wildcard listener of its own and requires the detector to
// find it; if it cannot, that is CANNOT CHECK, not a pass.
//
// EXIT 0 every refusal reproduced on today's bytes · 1 one did not · 2 CANNOT
// CHECK — the binary or model could not be obtained, or the socket detector is
// blind. Two is a failure you can see, never a pass.
//
// USAGE
//   node scripts/check-cli-refusals.mjs
//   node scripts/check-cli-refusals.mjs --selftest

import { writeFileSync, mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync, spawn } from "node:child_process";
import { createServer } from "node:net";

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

/** Every wildcard listener the socket table shows on `port`, as raw rows. */
function wildcardListeners(port) {
  const res = spawnSync("ss", ["-ltn"], { encoding: "utf8" });
  if (res.status !== 0 || typeof res.stdout !== "string") return null; // detector blind
  return res.stdout.split("\n").filter((l) => /LISTEN/.test(l) && new RegExp(`[:.]${port}\\b`).test(l));
}

/** Prove the detector can see a listener before trusting it not to see one. */
async function proveDetectorReads(port) {
  const srv = createServer();
  await new Promise((resolve, reject) => {
    srv.once("error", reject);
    srv.listen(port, "0.0.0.0", resolve);
  });
  try {
    const seen = wildcardListeners(port);
    if (seen === null) throw new CannotCheck("`ss` is not readable on this host — the socket detector cannot look at all");
    if (seen.length === 0) {
      throw new CannotCheck(
        `the socket table shows nothing while this gate is itself listening on :${port} — ` +
        `the detector is not reading, so "nothing ever listened" would mean "nothing was looked at"`);
    }
    return seen[0].trim().replace(/\s+/g, " ");
  } finally {
    await new Promise((r) => srv.close(r));
  }
}

/** Run one arm with a clean environment.
 *  ★THE EMPTY HOME IS PART OF THE SUBJECT, not tidiness: `bithuman login`
 *  stores a per-device key under HOME, so an arm inheriting a developer's or a
 *  runner's HOME can find a real credential and RENDER — turning every refusal
 *  arm green for the one reason that invalidates the whole gate. The
 *  BITHUMAN_* credential variables (SECRET, its deprecated alias KEY, and
 *  TOKEN) are deleted for the same reason. */
function drive(bin, home, args, env = {}) {
  const base = { ...process.env, HOME: home };
  delete base.BITHUMAN_API_SECRET;
  delete base.BITHUMAN_API_KEY;     // the deprecated alias the CLI still reads
  delete base.BITHUMAN_API_TOKEN;   // a short-lived token a runner may carry
  delete base.BITHUMAN_UNMETERED;
  delete base.BITHUMAN_API_BASE;
  const res = spawnSync(bin, args, {
    env: { ...base, ...env }, encoding: "utf8", timeout: 240_000, killSignal: "SIGKILL",
  });
  const blob = `${res.stdout || ""}\n${res.stderr || ""}`;
  const m = /"code"\s*:\s*"([A-Z_]+)"/.exec(blob);
  return { code: res.status, name: m ? m[1] : null, blob };
}

/** Drive an arm while watching the socket table, so a bind that happens and is
 *  then torn down cannot slip through a post-hoc check. */
function driveWatching(bin, home, args, env, port) {
  const base = { ...process.env, HOME: home };
  delete base.BITHUMAN_API_SECRET;
  delete base.BITHUMAN_API_KEY;     // the deprecated alias the CLI still reads
  delete base.BITHUMAN_API_TOKEN;   // a short-lived token a runner may carry
  delete base.BITHUMAN_UNMETERED;
  delete base.BITHUMAN_API_BASE;
  return new Promise((resolve) => {
    const child = spawn(bin, args, { env: { ...base, ...env }, encoding: "utf8" });
    let blob = "";
    child.stdout.on("data", (d) => { blob += d; });
    child.stderr.on("data", (d) => { blob += d; });
    let sawListener = null;
    const poll = setInterval(() => {
      const rows = wildcardListeners(port);
      if (rows && rows.length && !sawListener) sawListener = rows[0].trim().replace(/\s+/g, " ");
    }, 120);
    const kill = setTimeout(() => child.kill("SIGKILL"), 120_000);
    child.on("close", (code) => {
      clearInterval(poll); clearTimeout(kill);
      const m = /"code"\s*:\s*"([A-Z_]+)"/.exec(blob);
      resolve({ code, name: m ? m[1] : null, sawListener });
    });
  });
}

const ARMS = [
  { id: "model-resolution control",
    why: "proves the other arms got PAST model resolution; without it a 66 would masquerade as a refusal",
    args: (m) => ["render", "/nonexistent/missing.imx", "-a", "/nonexistent/a.wav", "-o", "/dev/null", "--json"],
    env: {}, expectCode: 66, expectName: "MODEL_NOT_FOUND" },
  { id: "render refuses with no credential",
    why: "sdk/cli.md and the changelog say render stops before the first frame, having written nothing",
    args: (m, out) => ["render", m, "-a", m, "-o", out, "--json"],
    env: {}, expectCode: 77, expectName: "NOT_SIGNED_IN", expectNoOutput: true },
  // ★THE REASON CODE MOVED, THE REFUSAL DID NOT. Through cli-v2.6.20 a
  // credential-less `run` answered METERING_REFUSED; on cli-v2.6.22 both arms
  // below answer NOT_SIGNED_IN at the same exit 77, which is the same code
  // `render` has always used for the same state — the two commands now give one
  // answer instead of two. Driven 2026-09-19 on Linux x86_64 against the
  // installer's own bytes; `render` also answers 77 NOT_SIGNED_IN with no
  // credential, with an invalid one, and with BITHUMAN_UNMETERED=1 set, writing
  // no output file in any of the three. METERING_REFUSED appears nowhere on
  // 2.6.22 and is kept below only as the RED CONTROL's wrong-reason fixture.
  // What is graded here is unchanged: exit 77, a named reason, nothing served.
  { id: "run refuses with no credential",
    why: "from 2.6.20 this is true on Linux too, which is the claim the pages make",
    args: (m) => ["run", m, "--host", "127.0.0.1", "--port", "18991", "--json"],
    env: {}, expectCode: 77, expectName: "NOT_SIGNED_IN" },
  { id: "BITHUMAN_UNMETERED=1 does not buy a render",
    why: "guides/pricing says no environment variable renders free in the CLI",
    args: (m) => ["run", m, "--host", "127.0.0.1", "--port", "18992", "--json"],
    env: { BITHUMAN_UNMETERED: "1" }, expectCode: 77, expectName: "NOT_SIGNED_IN" },
  { id: "wildcard bind is refused without the opt-in",
    why: "sdk/cli and the changelog say exit 2 WITH NOTHING LISTENING — the socket, not the message, is the claim",
    args: (m) => ["run", m, "--host", "0.0.0.0", "--port", "18993", "--json"],
    env: {}, expectCode: 2, expectName: "PUBLIC_BIND_REFUSED", watchPort: 18993 },
];

// ★SPECIFICITY IS A PROPERTY OF THE GATE, NOT A HABIT OF WHOEVER WROTE THE
// ARMS. A gate whose arms all produce the SAME failure cannot tell you which
// condition produced it: point every arm at a broken install and they all go
// "exit 1, no code", and the run still reads as four independent checks. The
// arms below happen to provoke four different names today. "Happen to" is the
// problem — the next person to trim an arm will not know they removed the
// property, because a property nobody states is invisible to the second
// author. So it is required here, in the file, where an edit has to meet it.
const MIN_DISTINCT_CODES = 2;

function specificity(results) {
  const names = [...new Set(results.map((r) => r.name).filter(Boolean))].sort();
  if (names.length < MIN_DISTINCT_CODES) {
    return [`specificity: every arm produced the same result (${names.join(", ") || "no codes at all"}) — ` +
            `this gate can no longer tell which condition fired. Restore an arm that provokes a DIFFERENT named failure.`];
  }
  return { ok: names };
}

function grade(results) {
  const findings = [];
  for (const r of results) {
    if (r.code !== r.expectCode || (r.expectName && r.name !== r.expectName)) {
      findings.push(`${r.id}: expected exit ${r.expectCode} ${r.expectName}, got exit ${r.code} ${r.name || "(no code in output)"} — ${r.why}`);
    }
    if (r.expectNoOutput && r.wroteOutput) {
      findings.push(`${r.id}: ★REFUSED AND WROTE AN OUTPUT FILE ANYWAY — the page promises nothing is written, and the exit code alone cannot see this.`);
    }
    if (r.watchPort && r.sawListener) {
      findings.push(`${r.id}: ★REFUSED AND BOUND A SOCKET ANYWAY — ${r.sawListener}. The page promises nothing is listening; the message and the exit code were both correct and the claim was still false.`);
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
    { name: "RED CONTROL: right code, right message, but it WROTE A FILE",
      rows: [{ id: "a", why: "w", code: 77, name: "NOT_SIGNED_IN", expectCode: 77, expectName: "NOT_SIGNED_IN", expectNoOutput: true, wroteOutput: true }], expect: 1 },
    { name: "RED CONTROL: right code, right message, but it BOUND A SOCKET",
      rows: [{ id: "a", why: "w", code: 2, name: "PUBLIC_BIND_REFUSED", expectCode: 2, expectName: "PUBLIC_BIND_REFUSED", watchPort: 1, sawListener: "LISTEN 0.0.0.0:18993" }], expect: 1 },
    { name: "a refusal that neither wrote nor bound passes",
      rows: [{ id: "a", why: "w", code: 2, name: "PUBLIC_BIND_REFUSED", expectCode: 2, expectName: "PUBLIC_BIND_REFUSED", watchPort: 1, sawListener: null, expectNoOutput: true, wroteOutput: false }], expect: 0 },
  ];
  let bad = 0;
  for (const a of arms) {
    const got = grade(a.rows).length ? 1 : 0;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  const specArms = [
    { name: "arms provoking different failures satisfy specificity",
      rows: [{ name: "NOT_SIGNED_IN" }, { name: "MODEL_NOT_FOUND" }], expect: 0 },
    { name: "RED CONTROL: every arm answering the same code fails specificity",
      rows: [{ name: "NOT_SIGNED_IN" }, { name: "NOT_SIGNED_IN" }], expect: 1 },
    { name: "RED CONTROL: arms producing no code at all fail specificity",
      rows: [{ name: null }, { name: null }], expect: 1 },
  ];
  for (const a of specArms) {
    const got = Array.isArray(specificity(a.rows)) ? 1 : 0;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  if (bad) { console.error(`selftest: ${bad} arm(s) wrong — the check cannot be trusted`); process.exit(1); }
  console.log("selftest: OK — seven red controls fire, including a gate that has gone blind by answering one code everywhere.");
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
    // ★A transient 500 from the download service must not read as a product
    // defect. Retried with backoff, and still CANNOT CHECK if it persists: a
    // daily gate that goes red on somebody else's outage trains its readers to
    // ignore it, which is a slower way of having no gate at all.
    let lastPull = "";
    for (let attempt = 0; attempt < 3 && !model; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 3000 * attempt));
      const pull = drive(bin, home, ["pull", SLUG, "--json"]);
      lastPull = pull.blob;
      const pm = /"path"\s*:\s*"([^"]+)"/.exec(pull.blob);
      if (pm) model = pm[1];   // the OUTER model — shadowing it here left every arm with undefined
    }
    if (!model) throw new CannotCheck(`could not pull the showcase avatar '${SLUG}' in 3 attempts: ${lastPull.slice(-300)}`);
  } catch (err) {
    console.error(`::error::CANNOT CHECK — ${err instanceof CannotCheck ? err.message : err.message}`);
    console.error("CANNOT CHECK is a failure, never a pass: no refusal was driven.");
    if (dir) rmSync(dir, { recursive: true, force: true });
    process.exit(2);
  }
  // ★Before trusting the detector not to see a listener, make it see one.
  let proof;
  try {
    proof = await proveDetectorReads(19771);
  } catch (err) {
    console.error(`::error::CANNOT CHECK — ${err.message}`);
    console.error("CANNOT CHECK is a failure, never a pass: the socket detector was not proved able to read.");
    rmSync(dir, { recursive: true, force: true });
    process.exit(2);
  }
  console.log(`driving the refusals on cli-v${version}, published bytes, empty HOME, no credential in the environment`);
  console.log(`★read control    the socket detector sees this gate's own listener: ${proof}`);
  const results = [];
  for (const arm of ARMS) {
    const outPath = join(dir, `${arm.id.replace(/\W+/g, "_")}.mp4`);
    const args = arm.args(model, outPath);
    let code, name, sawListener = null;
    if (arm.watchPort) {
      ({ code, name, sawListener } = await driveWatching(bin, home, args, arm.env, arm.watchPort));
    } else {
      ({ code, name } = drive(bin, home, args, arm.env));
    }
    const wroteOutput = arm.expectNoOutput ? existsSync(outPath) : false;
    results.push({ ...arm, code, name, sawListener, wroteOutput });
    const extra = [
      arm.expectNoOutput ? (wroteOutput ? "WROTE A FILE" : "no output file") : null,
      arm.watchPort ? (sawListener ? `LISTENER SEEN: ${sawListener}` : "nothing ever listened") : null,
    ].filter(Boolean).join(", ");
    console.log(`  ${arm.id}: exit ${code} ${name || ""}${extra ? ` — ${extra}` : ""}`);
  }
  rmSync(dir, { recursive: true, force: true });
  const findings = grade(results);
  const spec = specificity(results);
  if (Array.isArray(spec)) findings.push(...spec);
  else console.log(`★specificity     arms provoked ${spec.ok.length} distinct codes (${spec.ok.join(" ")})`);
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
