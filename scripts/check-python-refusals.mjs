#!/usr/bin/env node
// THE PYTHON SDK'S REFUSAL IS DRIVEN, NOT ATTESTED.
//
// WHY THIS EXISTS, and it is the most expensive lesson on these pages. The
// pricing page said `BITHUMAN_UNMETERED=1` renders free in the Python SDK. The
// published wheel refuses a credential-less render identically with and without
// it — the escape is compiled out of public wheels. That claim was live for
// weeks, across several releases, because nothing ever ran the wheel.
//
// A refusal arm costs nothing: no credential, no render, nothing billed. So
// this reproduces it on the newest published wheel instead of recording a
// version somebody promises they checked.
//
// ★THE CONTROL, and why a green here means something. If the wheel raised
// NotAuthorised for every unhappy path, these arms would pass while proving
// nothing. So the first arm opens a model that does not exist and REQUIRES
// InvalidAvatar — a different exception — which shows NotAuthorised is specific
// to the credential path rather than the wheel's answer to everything.
//
// ★AND WHY THE ARMS PULL FRAMES. Measured 2026-09-14: `bithuman.open()`
// SUCCEEDS with no credential. Metering bites at the FIRST FRAME. An arm that
// only opened the avatar would go green against a wheel that renders for free,
// which is the exact claim this file exists to disprove. Every arm iterates
// Avatar.render() until a frame or an exception arrives.
//
// EXIT 0 the refusal reproduced on today's wheel · 1 it did not · 2 CANNOT
// CHECK. Two is a failure you can see, never a pass.
//
// USAGE
//   node scripts/check-python-refusals.mjs
//   node scripts/check-python-refusals.mjs --selftest

import { writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const TAP = "bithuman-product/homebrew-bithuman";
const ASSET = "bithuman-x86_64-unknown-linux-gnu.tar.gz";
const DIST = "bithuman";
const EXTRA = "expression-2";
const SLUG = "marmalade";
const UA = "bithuman-public-docs-python-refusals (+https://github.com/bithuman-product/public-docs)";

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

async function newestWheel() {
  const j = await (await get(`https://pypi.org/pypi/${DIST}/json?_=${Date.now()}`)).json();
  const v = j?.info?.version;
  if (!v) throw new CannotCheck(`pypi ${DIST}: no version in the index`);
  return v;
}

async function newestCli() {
  const headers = { Accept: "application/vnd.github+json" };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const rows = await (await get(`https://api.github.com/repos/${TAP}/releases?per_page=100`, headers)).json();
  if (!Array.isArray(rows)) throw new CannotCheck("the tap's release list did not parse");
  const cmp = (a, b) => { const A = a.split(".").map(Number), B = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0); return 0; };
  const tags = rows.filter((r) => !r.draft && !r.prerelease)
    .map((r) => /^cli-v(\d+\.\d+\.\d+)$/.exec(r.tag_name || "")).filter(Boolean)
    .map((m) => m[1]).sort(cmp);
  if (!tags.length) throw new CannotCheck(`${TAP}: no published cli-v* release`);
  return tags.at(-1);
}

const PROBE = `
import sys, bithuman, numpy as np
model = sys.argv[1]
try:
    av = bithuman.open(model)
    # open() succeeds without a credential; the meter bites at the FIRST FRAME.
    for _ in av.render(np.zeros(16000, dtype=np.int16)):
        print("OUTCOME:RENDERED"); break
    else:
        print("OUTCOME:NO_FRAMES_NO_ERROR")
except Exception as e:
    print("OUTCOME:" + type(e).__name__)
`;

const ARMS = [
  { id: "specificity control (a model that does not exist)",
    why: "shows NotAuthorised is the credential answer, not the wheel's answer to everything",
    model: "/nonexistent/missing.imx", env: {}, expect: "InvalidAvatar" },
  { id: "render refuses with no credential",
    why: "guides/pricing says a public wheel refuses a credential-less render",
    model: null, env: {}, expect: "NotAuthorised" },
  { id: "BITHUMAN_UNMETERED=1 does not buy a render",
    why: "the escape is compiled out of public wheels; this is the claim that was false for weeks",
    model: null, env: { BITHUMAN_UNMETERED: "1" }, expect: "NotAuthorised" },
];

// ★SPECIFICITY IS A PROPERTY, NOT A HABIT. The control arm below provokes
// InvalidAvatar precisely so that NotAuthorised means something — but an arm
// can be deleted and the property would vanish with it, silently, because a
// property nobody states is invisible to the second author. So it is required
// here: the arms must produce at least two distinct outcomes.
const MIN_DISTINCT_OUTCOMES = 2;

function specificity(rows) {
  const seen = [...new Set(rows.map((r) => r.got).filter(Boolean))].sort();
  if (seen.length < MIN_DISTINCT_OUTCOMES) {
    return [`specificity: every arm produced ${seen.join(", ") || "nothing"} — if the wheel answered NotAuthorised ` +
            `for every unhappy path these arms would all pass while proving nothing. Restore an arm that provokes a DIFFERENT exception.`];
  }
  return { ok: seen };
}

function grade(rows) {
  const findings = [];
  for (const r of rows) {
    if (r.got !== r.expect) {
      findings.push(`${r.id}: expected ${r.expect}, got ${r.got} — ${r.why}`);
    }
  }
  return findings;
}

function selftest() {
  const arms = [
    { name: "the refusal reproducing passes",
      rows: [{ id: "a", why: "w", got: "NotAuthorised", expect: "NotAuthorised" }], expect: 0 },
    { name: "RED CONTROL: a wheel that renders instead of refusing fails",
      rows: [{ id: "a", why: "w", got: "RENDERED", expect: "NotAuthorised" }], expect: 1 },
    { name: "RED CONTROL: refusing for the wrong reason fails",
      rows: [{ id: "a", why: "w", got: "InvalidAvatar", expect: "NotAuthorised" }], expect: 1 },
    { name: "RED CONTROL: the specificity control losing its distinct error fails",
      rows: [{ id: "c", why: "w", got: "NotAuthorised", expect: "InvalidAvatar" }], expect: 1 },
    { name: "RED CONTROL: no frames and no error is not a refusal",
      rows: [{ id: "a", why: "w", got: "NO_FRAMES_NO_ERROR", expect: "NotAuthorised" }], expect: 1 },
  ];
  let bad = 0;
  for (const a of arms) {
    const got = grade(a.rows).length ? 1 : 0;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  const specArms = [
    { name: "distinct outcomes satisfy specificity", rows: [{ got: "NotAuthorised" }, { got: "InvalidAvatar" }], expect: 0 },
    { name: "RED CONTROL: one outcome everywhere fails specificity", rows: [{ got: "NotAuthorised" }, { got: "NotAuthorised" }], expect: 1 },
  ];
  for (const a of specArms) {
    const got = Array.isArray(specificity(a.rows)) ? 1 : 0;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  if (bad) { console.error(`selftest: ${bad} arm(s) wrong — the check cannot be trusted`); process.exit(1); }
  console.log("selftest: OK — five red controls fire, including a wheel that answers one exception everywhere.");
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  let dir, wheelVersion, cliVersion, py, model;
  try {
    wheelVersion = await newestWheel();
    cliVersion = await newestCli();
    dir = mkdtempSync(join(tmpdir(), "bh-pyref-"));
    const home = join(dir, "home");
    mkdirSync(home, { recursive: true });

    const venv = join(dir, "venv");
    const mk = spawnSync("python3", ["-m", "venv", venv], { encoding: "utf8" });
    if (mk.status !== 0) throw new CannotCheck(`could not create a venv: ${mk.stderr || mk.stdout}`);
    py = join(venv, "bin", "python");
    const pip = spawnSync(join(venv, "bin", "pip"),
      ["install", "-q", `${DIST}[${EXTRA}]==${wheelVersion}`],
      { encoding: "utf8", timeout: 900_000, env: { ...process.env, HOME: home } });
    if (pip.status !== 0) throw new CannotCheck(`pip install ${DIST}[${EXTRA}]==${wheelVersion} failed: ${(pip.stderr || "").slice(-400)}`);

    // A showcase pull is anonymous; the CLI is only the download tool here.
    const tarball = join(dir, ASSET);
    writeFileSync(tarball, Buffer.from(await (await get(`https://github.com/${TAP}/releases/download/cli-v${cliVersion}/${ASSET}`)).arrayBuffer()));
    execFileSync("tar", ["xzf", tarball, "-C", dir], { stdio: "pipe" });
    // ★A transient 500 from the download service must not read as a product
    // defect. Retried with backoff, and still CANNOT CHECK if it persists: a
    // daily gate that goes red on somebody else's outage trains its readers to
    // ignore it, which is a slower way of having no gate at all. Seen for real
    // on 2026-09-14: HTTP 500 on one runner while the CLI gate's pull, minutes
    // earlier on the same commit, succeeded.
    let last = "";
    for (let attempt = 0; attempt < 3 && !model; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 3000 * attempt));
      const pull = spawnSync(join(dir, "bithuman"), ["pull", SLUG, "--json"],
        { encoding: "utf8", timeout: 600_000, env: { ...process.env, HOME: home } });
      last = `${pull.stdout || ""}\n${pull.stderr || ""}`;
      const pm = /"path"\s*:\s*"([^"]+)"/.exec(last);
      if (pm) model = pm[1];
    }
    if (!model) throw new CannotCheck(`could not pull the showcase avatar '${SLUG}' in 3 attempts: ${last.slice(-300)}`);

    writeFileSync(join(dir, "probe.py"), PROBE);
  } catch (err) {
    console.error(`::error::CANNOT CHECK — ${err.message}`);
    console.error("CANNOT CHECK is a failure, never a pass: the wheel was not driven.");
    if (dir) rmSync(dir, { recursive: true, force: true });
    process.exit(2);
  }

  console.log(`driving the Python refusal on ${DIST}==${wheelVersion}, published wheel, fresh venv and HOME, no credential`);
  const rows = [];
  for (const arm of ARMS) {
    const env = { ...process.env, HOME: join(dir, "home"), ...arm.env };
    delete env.BITHUMAN_API_SECRET;
    delete env.BITHUMAN_API_KEY;     // the deprecated alias; a newer wheel reads it
    delete env.BITHUMAN_API_TOKEN;   // a short-lived token a runner may carry
    if (!arm.env.BITHUMAN_UNMETERED) delete env.BITHUMAN_UNMETERED;
    const res = spawnSync(py, [join(dir, "probe.py"), arm.model || model],
      { encoding: "utf8", timeout: 900_000, env });
    const m = /OUTCOME:(\w+)/.exec(`${res.stdout}\n${res.stderr}`);
    const got = m ? m[1] : "(no outcome printed)";
    rows.push({ ...arm, got });
    console.log(`  ${arm.id}: ${got}`);
  }
  rmSync(dir, { recursive: true, force: true });

  const findings = grade(rows);
  const spec = specificity(rows);
  if (Array.isArray(spec)) findings.push(...spec);
  else console.log(`★specificity     arms provoked ${spec.ok.length} distinct outcomes (${spec.ok.join(" ")})`);
  if (findings.length) {
    for (const f of findings) console.error(`::error::${f}`);
    console.error("\nThe Python SDK did not behave the way guides/pricing says it does.");
    console.error("Either the wheel changed and the page must, or the page is wrong — it was, for weeks, once.");
    process.exit(1);
  }
  console.log("OK — the published wheel refuses a credential-less render, with and without the variable.");
}

main();
