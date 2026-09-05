#!/usr/bin/env node
// SERVED-BYTES half of check-internal-vocabulary.mjs.
//
// The sibling guard grades the SOURCE corpus in git. Nothing graded what
// docs.bithuman.ai actually HANDS a browser. This estate has shipped a silent
// stale deploy (push green, site unmoved), so a source-only guard can be fully
// green over a live site that still teaches the mechanism.
//
// ★ONE LIST, NOT TWO. The BANNED patterns and the frozen CARRIERS are lifted
// out of scripts/check-internal-vocabulary.mjs at run time by parsing that
// file. Retyping them here would recreate the exact drift that file's own
// header warns about. If the extraction fails this exits 2 (cannot measure),
// never a silent pass.
//
// EXIT 0 clean + instrument demonstrably fires · 1 a hit · 2 cannot measure
import { readFileSync, readdirSync } from "node:fs";

// usage:
//   node scripts/check-served-vocabulary.mjs --live [origin]
//   node scripts/check-served-vocabulary.mjs <guard.mjs> <dir-of-fetched-html>
const args = process.argv.slice(2);
const LIVE = args[0] === "--live";
const ORIGIN = LIVE ? (args[1] || "https://docs.bithuman.ai") : null;
const GUARD = LIVE
  ? new URL("./check-internal-vocabulary.mjs", import.meta.url).pathname
  : args[0];
const DIR = LIVE ? null : args[1];
if (!GUARD || (!LIVE && !DIR)) {
  console.error("usage: --live [origin]  |  <guard.mjs> <dir-of-fetched-html>");
  process.exit(2);
}

// ── lift the one list ────────────────────────────────────────────────────────
function lift(src, name) {
  const start = src.indexOf(`const ${name} = [`);
  if (start < 0) throw new Error(`cannot find ${name}`);
  let i = src.indexOf("[", start), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) throw new Error(`unterminated ${name}`);
  // eslint-disable-next-line no-eval
  return eval(src.slice(i, end + 1));
}
let BANNED, CARRIERS;
try {
  const src = readFileSync(GUARD, "utf8");
  BANNED   = lift(src, "BANNED");
  CARRIERS = lift(src, "CARRIERS");
} catch (e) { console.error("CANNOT MEASURE: " + e.message); process.exit(2); }
if (!BANNED.length || !CARRIERS.length) { console.error("CANNOT MEASURE: empty list"); process.exit(2); }
console.log(`lifted ${BANNED.length} banned pattern(s) + ${CARRIERS.length} carrier(s) from ${GUARD}`);

// ── rendered text from served HTML ───────────────────────────────────────────
function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

// ── project the carriers into the RENDERED domain ───────────────────────────
// ★The carrier list is written against MARKDOWN SOURCE: `Compose `env_file``
// carries literal backticks because that is what the .md file holds. The
// browser is handed `Compose <code>env_file</code>` — same string, different
// domain — so a carrier keyed on backticks cannot excuse its own sentence
// here, and the guard reports a correct line as a violation. Measured: that is
// exactly what changelog.md:713 did on the first run.
//
// The fix is a DOMAIN PROJECTION, not an exclusion: a literal backtick in a
// carrier becomes optional, because markdown's code delimiter is not part of
// the string a customer reads. Nothing else about the carrier is relaxed, so
// it still cannot excuse a different sentence.
function renderedCarrier(c) {
  return new RegExp(c.re.source.replace(/\\?`/g, "`?"), c.re.flags);
}

// ── the instrument must fire before it is trusted ────────────────────────────
// Every pattern is run against its own fixture, wrapped in the SAME html->text
// path the real pages take. A pattern that cannot match its fixture through
// this pipeline is a pattern that was never added.
const dead = [];
for (const b of BANNED) {
  const fired = new RegExp(b.re.source, b.re.flags).test(text(`<p>${b.fixture}</p>`));
  if (!fired) dead.push(b.name);
}
if (dead.length) { console.error("BLIND INSTRUMENT — pattern(s) cannot match own fixture: " + dead.join(", ")); process.exit(2); }
console.log(`positive control: ${BANNED.length}/${BANNED.length} pattern(s) fired on their own fixture through the html->text path`);

// ★NEGATIVE CONTROL on the projection above. A backtick made optional must not
// turn a carrier into a wildcard: each banned fixture is re-tested against
// EVERY projected carrier, and none may excuse it. Without this, widening the
// carriers would silently buy a green.
const overreach = [];
for (const b of BANNED)
  for (const c of CARRIERS)
    if (renderedCarrier(c).test(text(`<p>${b.fixture}</p>`)))
      overreach.push(`${c.why.slice(0, 40)} excuses ${b.name}`);
if (overreach.length) { console.error("CARRIER OVER-REACH: " + overreach.join(" | ")); process.exit(2); }
console.log(`negative control: 0 of ${CARRIERS.length} projected carrier(s) can excuse any of the ${BANNED.length} banned fixtures`);

// ── scan ─────────────────────────────────────────────────────────────────────
// ── the corpus: the live site, or a directory of already-fetched pages ───────
// ★The route list comes from dist/, which is what this repo BUILDS. If dist/ is
// stale the list is stale, so every fetch is graded and a non-200 is reported
// rather than skipped — an unreachable page must not read as a clean page.
async function fetchLive(origin) {
  const distRoot = new URL("../dist", import.meta.url).pathname;
  const routes = [];
  const walk = (abs, rel) => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (e.name === "pagefind") continue;
      if (e.isDirectory()) walk(`${abs}/${e.name}`, `${rel}/${e.name}`);
      else if (e.name === "index.html") routes.push(`${rel}/`);
    }
  };
  try { walk(distRoot, ""); } catch { console.error("CANNOT MEASURE: no dist/ — run `npm run build` first"); process.exit(2); }
  if (!routes.length) { console.error("CANNOT MEASURE: dist/ has no pages"); process.exit(2); }
  const out = [], skipped = [];
  for (const r of routes.sort()) {
    let res;
    try { res = await fetch(origin + r, { headers: { "cache-control": "no-cache" } }); }
    catch (e) { console.error(`CANNOT MEASURE: ${r} did not respond: ${e.message}`); process.exit(2); }
    if (res.status !== 200) { skipped.push(`${r} -> ${res.status}`); continue; }
    out.push([r, await res.text()]);
  }
  if (skipped.length) console.log(`  ${skipped.length} route(s) in dist/ are not 200 live (stale build or retired page): ${skipped.join(", ")}`);
  if (!out.length) { console.error("CANNOT MEASURE: no page fetched 200"); process.exit(2); }
  console.log(`fetched ${out.length} live page(s) from ${origin}`);
  return out;
}

const corpus = LIVE
  ? await fetchLive(ORIGIN)
  : readdirSync(DIR).filter(f => f.endsWith(".html")).sort()
      .map(f => [f, readFileSync(`${DIR}/${f}`, "utf8")]);
if (!corpus.length) { console.error("CANNOT MEASURE: empty corpus"); process.exit(2); }
let hits = 0, scanned = 0, bytes = 0, carrierExcused = 0;
const perWord = Object.create(null);
for (const [f, raw] of corpus) {
  bytes += raw.length; scanned++;
  const t = text(raw);
  for (const b of BANNED) {
    const re = new RegExp(b.re.source, b.re.flags);
    let m;
    while ((m = re.exec(t)) !== null) {
      const ctx = t.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90);
      if (CARRIERS.some(c => renderedCarrier(c).test(ctx))) { carrierExcused++; continue; }
      hits++;
      perWord[b.name] = (perWord[b.name] || 0) + 1;
      console.log(`HIT ${f} :: ${b.name} :: …${ctx.trim()}…`);
    }
  }
}
console.log(`\nscanned ${scanned} served page(s), ${bytes} byte(s); ${carrierExcused} occurrence(s) excused by a frozen carrier`);
if (hits) { console.log("per-word: " + JSON.stringify(perWord)); console.error(`FAIL: ${hits} mechanism word(s) reached a served page`); process.exit(1); }
console.log("OK — no banned mechanism word in the bytes the live site serves");
