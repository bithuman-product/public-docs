#!/usr/bin/env node
// A CREDENTIAL OR BILLING CLAIM DESCRIBES BYTES. WHEN THE BYTES MOVE, SOMEONE
// HAS TO LOOK AGAIN.
//
// WHY THIS EXISTS. Measured 2026-09-14: the pricing page said
// `BITHUMAN_UNMETERED=1` renders free in the Python SDK. The published wheel
// refuses a credential-less render identically with and without it. The claim
// had been live for weeks, through several `bithuman` releases, and nothing
// re-read the artifact. The same night, a release note credited 2.6.19 with a
// public-bind refusal it did not have, and the reference page documented an
// operator switch that does nothing on Linux.
//
// ★THE ASYMMETRY THIS EXISTS TO CORRECT, stated plainly because no other check
// here addresses it: how carefully a claim gets checked tends to scale with how
// BIG it looks, not with what it costs if it is wrong. "Our quickstart does not
// compile" is big, so it gets driven on three artifacts before anyone says it.
// "The Python SDK honours this variable" is one clause in a table, so it rode
// for weeks — and it was the one that could tell a developer they were not
// being billed when they were. Size is visible; cost is not. So the claims in
// the manifest are selected by COST IF WRONG — who finds out, and when — and
// every one of them is required to name the artifact version it was driven
// against.
//
// WHAT IT DOES
//   1. Reads scripts/credential-claims.json. Every claim names an artifact, the
//      version it was DRIVEN against, the page it is written on, and a phrase
//      from that page.
//   2. Asks each registry for the newest published version.
//   3. Fails when the artifact has moved past the version the claim was driven
//      against — the claim now describes bytes nobody has checked.
//   4. Fails when the phrase is no longer on the page: the claim was reworded
//      or removed and the record was not updated, so the record is fiction.
//   5. Refuses when a page names BITHUMAN_UNMETERED and no claim covers it.
//
// The version in the manifest IS the claim that someone looked. Editing it
// without re-driving the arm is the one way to make this file lie.
//
// EXIT 0 every claim was driven against the newest bytes · 1 one was not · 2
// CANNOT CHECK. Two is a failure you can see, never a pass.
//
// USAGE
//   node scripts/check-credential-claims-remeasured.mjs
//   node scripts/check-credential-claims-remeasured.mjs --selftest

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const MANIFEST = "scripts/credential-claims.json";
const TAP = "bithuman-product/homebrew-bithuman";
const UA = "bithuman-public-docs-credential-claims (+https://github.com/bithuman-product/public-docs)";

// Pages that may state an unmetered escape hatch. Any page naming the variable
// must be covered by a claim, so a new one cannot be written without a record.
const UNMETERED_SCAN_ROOT = "src/content/docs";

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

const cmp = (a, b) => {
  const A = String(a).split(".").map(Number), B = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0);
  }
  return 0;
};

async function newestCli() {
  const headers = { Accept: "application/vnd.github+json" };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const rows = await (await get(`https://api.github.com/repos/${TAP}/releases?per_page=100`, headers)).json();
  if (!Array.isArray(rows)) throw new CannotCheck("the tap's release list did not parse");
  // Tag prefix, not `gh release view`: that returns the Swift SDK on this tap.
  const tags = rows.filter((r) => !r.draft && !r.prerelease)
    .map((r) => /^cli-v(\d+\.\d+\.\d+)$/.exec(r.tag_name || "")).filter(Boolean)
    .map((m) => m[1]).sort(cmp);
  if (!tags.length) throw new CannotCheck(`${TAP}: no published cli-v* release`);
  return tags.at(-1);
}

async function newestPypi(dist) {
  const j = await (await get(`https://pypi.org/pypi/${dist}/json?_=${Date.now()}`)).json();
  const v = j?.info?.version;
  if (!v) throw new CannotCheck(`pypi ${dist}: no version in the index`);
  return v;
}

async function newestMaven(artifact) {
  const xml = await (await get(`https://repo1.maven.org/maven2/ai/bithuman/${artifact}/maven-metadata.xml`)).text();
  const m = /<release>([^<]+)<\/release>/.exec(xml);
  if (!m) throw new CannotCheck(`maven ${artifact}: no <release> in maven-metadata.xml`);
  return m[1];
}

async function newestFor(artifact) {
  if (artifact === "cli") return newestCli();
  if (artifact.startsWith("pypi:")) return newestPypi(artifact.slice(5));
  if (artifact.startsWith("maven:")) return newestMaven(artifact.slice(6));
  throw new CannotCheck(`unknown artifact kind: ${artifact}`);
}

/** A driven_by pointer must name a file that is really there. */
let driverPresent = (rel) => { try { readFileSync(join(ROOT, rel)); return true; } catch { return false; } };

function readManifest(root = ROOT) {
  let raw;
  try { raw = readFileSync(join(root, MANIFEST), "utf8"); }
  catch { throw new CannotCheck(`${MANIFEST} could not be read`); }
  let j;
  try { j = JSON.parse(raw); } catch (e) { throw new CannotCheck(`${MANIFEST} is not valid JSON: ${e.message}`); }
  if (!Array.isArray(j.claims) || j.claims.length === 0) {
    throw new CannotCheck(`${MANIFEST} lists no claims — an empty manifest is never a pass`);
  }
  return j.claims;
}

/** Every page naming the escape hatch must be covered by a claim, so a new
 *  unmetered statement cannot be written without a record that someone drove
 *  it. Pure over its inputs so the selftest can fire it. */
function uncoveredUnmeteredPages(pagesNaming, claims) {
  const covered = new Set(claims.map((c) => c.page));
  return pagesNaming.filter((p) => !covered.has(p));
}

function pagesNamingUnmetered(root = ROOT) {
  const out = [];
  const walk = (rel) => {
    let entries;
    try { entries = readdirSync(join(root, rel)); } catch { return; }
    for (const name of entries) {
      const child = `${rel}/${name}`;
      let st;
      try { st = statSync(join(root, child)); } catch { continue; }
      if (st.isDirectory()) walk(child);
      else if (name.endsWith(".md") || name.endsWith(".astro")) {
        try {
          if (readFileSync(join(root, child), "utf8").includes("BITHUMAN_UNMETERED")) out.push(child);
        } catch { /* unreadable, reported elsewhere */ }
      }
    }
  };
  walk(UNMETERED_SCAN_ROOT);
  return out.sort();
}

/** Grade claims against newest versions. Pure, so the selftest can drive it. */
function grade(claims, newest, pageText) {
  const findings = [];
  for (const c of claims) {
    // ★A ROUTE MUST BE STATED. This cannot check that the route is RIGHT — no
    // string comparison can. It checks that one was written down, because the
    // failure this exists for is omission-by-familiarity: an author who has
    // read the routing drops it at the handoff, since by then it is background
    // to them rather than news. A blank box gets noticed; confident prose with
    // a missing qualifier does not.
    if (!c.route || !String(c.route).trim()) {
      findings.push(`${c.id}: no \`route\` — say which invocation and code path was actually driven, ` +
                    `not just the command. A claim whose route is unstated cannot be scoped by the next reader.`);
    }
    const have = newest[c.artifact];
    if (have === undefined) { findings.push(`${c.id}: no published version was resolved for ${c.artifact}`); continue; }
    // ★A claim a machine reproduces on today's bytes is not attested, so its
    // version is history and grading it would only invite a bump. The pointer
    // must be real, though: a driver named here and absent would be the same
    // fiction as a stale version, wearing a better disguise.
    if (c.driven_by && !driverPresent(c.driven_by)) {
      findings.push(`${c.id}: driven_by names ${c.driven_by}, which does not exist — the claim says a machine checks it and nothing does.`);
    } else if (!c.driven_by && cmp(have, c.measured_version) > 0) {
      findings.push(
        `${c.id}: driven against ${c.artifact} ${c.measured_version} on ${c.measured_on}, but ${have} is published. ` +
        `The claim on ${c.page} now describes bytes nobody has checked — re-drive (${c.arms}), then move the version.` +
        // ★A red that does not carry the plan is a red someone has to reconstruct
        // at the worst possible moment. When a claim is KNOWN to be about to
        // flip, the entry says what to do and the failure prints it.
        (c.when_this_goes_red ? `\n    ★WHAT TO DO: ${c.when_this_goes_red}` : ""));
    }
    const text = pageText[c.page];
    if (text === undefined) { findings.push(`${c.id}: ${c.page} could not be read`); continue; }
    if (!text.includes(c.phrase)) {
      findings.push(`${c.id}: "${c.phrase}" is no longer on ${c.page} — the claim was reworded or removed and this record was not, so the record is fiction.`);
    }
  }
  return findings;
}

function selftest() {
  const claims = [{ id: "c", artifact: "cli", measured_version: "2.6.20", measured_on: "d", arms: "a", route: "r", page: "p.md", phrase: "hello" }];
  const arms = [
    { name: "artifact still at the measured version passes", newest: { cli: "2.6.20" }, text: { "p.md": "hello" }, expect: 0 },
    { name: "RED CONTROL: artifact moved past the measurement fails", newest: { cli: "2.6.21" }, text: { "p.md": "hello" }, expect: 1 },
    { name: "RED CONTROL: the phrase left the page fails", newest: { cli: "2.6.20" }, text: { "p.md": "something else" }, expect: 1 },
    { name: "RED CONTROL: a claim with no route fails", newest: { cli: "2.6.20" }, text: { "p.md": "hello" }, expect: 1,
      claims: [{ id: "c", artifact: "cli", measured_version: "2.6.20", measured_on: "d", arms: "a", page: "p.md", phrase: "hello" }] },
    { name: "an older published version does not fail (never happens, but must not)", newest: { cli: "2.6.19" }, text: { "p.md": "hello" }, expect: 0 },
  ];
  const drivenClaim = [{ id: "d", artifact: "cli", measured_version: "2.6.20", measured_on: "d", arms: "a", route: "r", page: "p.md", phrase: "hello", driven_by: "scripts/real.mjs" }];
  const drivenArms = [
    { name: "a machine-driven claim is not graded on version drift", newest: { cli: "9.9.9" }, present: true, expect: 0 },
    { name: "RED CONTROL: a driven_by pointing at nothing fails", newest: { cli: "2.6.20" }, present: false, expect: 1 },
  ];
  let bad = 0;
  for (const a of arms) {
    const got = grade(a.claims || claims, a.newest, a.text).length ? 1 : 0;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  const realDriverPresent = driverPresent;
  for (const a of drivenArms) {
    driverPresent = () => a.present;
    const got = grade(drivenClaim, a.newest, { "p.md": "hello" }).length ? 1 : 0;
    driverPresent = realDriverPresent;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  const coverArms = [
    { name: "a page naming the hatch that a claim covers passes", pages: ["p.md"], expect: 0 },
    { name: "RED CONTROL: a page naming the hatch with no claim fails", pages: ["p.md", "rogue.md"], expect: 1 },
  ];
  for (const a of coverArms) {
    const got = uncoveredUnmeteredPages(a.pages, claims).length ? 1 : 0;
    const ok = got === a.expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${a.name}`);
  }
  if (bad) { console.error(`selftest: ${bad} arm(s) wrong — the check cannot be trusted`); process.exit(1); }
  console.log("selftest: OK — both red controls fire and the green arms pass.");
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  let claims, newest = {}, pageText = {};
  try {
    claims = readManifest();
    for (const art of [...new Set(claims.map((c) => c.artifact))]) newest[art] = await newestFor(art);
    for (const rel of [...new Set(claims.map((c) => c.page))]) {
      try { pageText[rel] = readFileSync(join(ROOT, rel), "utf8"); }
      catch { throw new CannotCheck(`${rel} could not be read`); }
    }
  } catch (err) {
    console.error(`::error::CANNOT CHECK — ${err.message}`);
    console.error("CANNOT CHECK is a failure, never a pass: no claim was graded.");
    process.exit(2);
  }
  const machine = claims.filter((c) => c.driven_by).length;
  console.log(`${claims.length} credential/billing claim(s): ${machine} reproduced on today's bytes by a driver, ${claims.length - machine} held by a version a human moves`);
  for (const [a, v] of Object.entries(newest)) console.log(`  newest ${a}: ${v}`);
  const naming = pagesNamingUnmetered();
  console.log(`pages naming BITHUMAN_UNMETERED: ${naming.length ? naming.join(", ") : "(none)"}`);
  const findings = grade(claims, newest, pageText);
  for (const p of uncoveredUnmeteredPages(naming, claims)) {
    findings.push(`${p} names BITHUMAN_UNMETERED but no claim in ${MANIFEST} covers it — an unmetered statement with no record that anyone drove it.`);
  }
  if (findings.length) {
    for (const f of findings) console.error(`::error::${f}`);
    console.error("\nA claim about credentials or billing is only as current as the bytes it was driven against.");
    console.error("Re-drive the arm on the customer path, then update scripts/credential-claims.json.");
    process.exit(1);
  }
  console.log("OK — every registered claim was driven against the newest published version of its artifact.");
}

main();
