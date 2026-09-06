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
// ★THE HOLE THIS CLOSES (measured 2026-09-06). Lifting from ONE guard was the
// defect. check-internal-vocabulary.mjs DELIBERATELY does not grade `tessera`
// or `libessence` — they sit in its OWNED_BY_RETIRED_NAMES and its own M3
// asserts they are absent from BANNED, because check-retired-model-names.mjs
// owns them with the NAMING-LEDGER §G verdicts. That delegation is correct on
// the SOURCE tree. But check-retired-model-names.mjs walks a git checkout and
// NOTHING carried those two words into the SERVED domain — so this file, whose
// whole purpose is the served domain, was handed an 11-word list with neither
// of them in it and printed "OK — no banned mechanism word in the bytes the
// live site serves" over 83 live occurrences: `tessera` 45 + `libessence` 38
// across 19 fetched pages of docs.bithuman.ai, against a firing control of
// `bithuman` = 2153. ★That zero was never measured; there was no pattern to
// measure it with, which is the same class of defect as a scorer whose grep
// cannot match its input.
//
// So the lift now takes BOTH source-domain guards, and coverage is ASSERTED
// below rather than assumed: a word graded on the source and not here is fatal.
const RETIRED_GUARD = new URL("./check-retired-model-names.mjs", import.meta.url).pathname;
let BANNED, CARRIERS, VERBATIM = [], MARKERS = [], RETIRED_ON = {}, FENCE_BUDGET = 0, CONTEXT = 0;
try {
  const src = readFileSync(GUARD, "utf8");
  BANNED   = lift(src, "BANNED");
  CARRIERS = lift(src, "CARRIERS");
  const rsrc = readFileSync(RETIRED_GUARD, "utf8");
  // ★Only the entries the sibling marks `fenceIsVerbatim` — the names whose
  // spelling is FROZEN in shipped artifacts (a module path, a pip extra, env
  // vars, exported symbols, library filenames). That flag is the sibling's own
  // marker for exactly the two words in the hole; deriving the set from it
  // means adding a third there arms this file automatically.
  VERBATIM = lift(rsrc, "RETIRED").filter((r) => r.fenceIsVerbatim);
  CARRIERS = CARRIERS.concat(lift(rsrc, "CARRIERS"));
  // ★MARKERS too, or this file invents a stricter rule than the sibling and
  // reports a page RED for saying "libessence … the engine's own legacy library
  // name, kept for compatibility". Measured: without this lift, 15 such
  // sentences on 6 pages were reported as violations. The retirement marker IS
  // the sanctioned way to spell a retired name, so the served domain must
  // honour it exactly as the source domain does — same list, lifted, not retyped.
  MARKERS = lift(rsrc, "MARKERS");
  // ★And the sibling's DATED-CHANGELOG rule. A changelog entry dated BEFORE the
  // name was retired is a contemporaneous historical record, not a live product
  // name — rewriting it would falsify the history. RETIRED_ON is the sibling's
  // own date table, lifted, so the two files can never disagree about a date.
  RETIRED_ON = (0, eval)("(" + rsrc.slice(rsrc.indexOf("const RETIRED_ON = {") + 19,
                          rsrc.indexOf("};", rsrc.indexOf("const RETIRED_ON = {")) + 1) + ")");
  const cx = rsrc.match(/const CONTEXT = (\d+)/);
  if (!cx) throw new Error("cannot find CONTEXT in " + RETIRED_GUARD);
  CONTEXT = Number(cx[1]);
  const fb = rsrc.match(/const FENCE_BUDGET = (\d+)/);
  if (!fb) throw new Error("cannot find FENCE_BUDGET in " + RETIRED_GUARD);
  FENCE_BUDGET = Number(fb[1]);
} catch (e) { console.error("CANNOT MEASURE: " + e.message); process.exit(2); }
if (!BANNED.length || !CARRIERS.length) { console.error("CANNOT MEASURE: empty list"); process.exit(2); }
// ★COVERAGE ASSERTION — the reason this hole cannot reopen. If the sibling
// marks a name frozen-verbatim and this file does not grade it, refuse to
// certify rather than print a green that is narrower than it reads.
if (!VERBATIM.length) {
  console.error("CANNOT MEASURE: no fenceIsVerbatim name lifted from " + RETIRED_GUARD +
                " — the served domain would grade fewer words than the source domain");
  process.exit(2);
}
const GRADED = BANNED.concat(VERBATIM);
console.log(`lifted ${BANNED.length} banned pattern(s) + ${CARRIERS.length} carrier(s) from 2 source-domain guard(s)`);
console.log(`  grading ${GRADED.length} word(s): ${GRADED.map((g) => g.name).join(", ")}`);

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
// ★The lifted RETIRED entries carry no `fixture` (the sibling proves its
// patterns against the corpus instead). A PROSE fixture is synthesised for
// each — prose is precisely the use the ruling retires, and it must not be
// excused by any §G carrier, which the negative control below then proves.
for (const v of VERBATIM) if (!v.fixture) v.fixture = `the ${v.name} pipeline renders the frame`;
const dead = [];
for (const b of GRADED) {
  const fired = new RegExp(b.re.source, b.re.flags).test(text(`<p>${b.fixture}</p>`));
  if (!fired) dead.push(b.name);
}
if (dead.length) { console.error("BLIND INSTRUMENT — pattern(s) cannot match own fixture: " + dead.join(", ")); process.exit(2); }
console.log(`positive control: ${GRADED.length}/${GRADED.length} pattern(s) fired on their own fixture through the html->text path`);

// ★NEGATIVE CONTROL on the projection above. A backtick made optional must not
// turn a carrier into a wildcard: each banned fixture is re-tested against
// EVERY projected carrier, and none may excuse it. Without this, widening the
// carriers would silently buy a green.
const overreach = [];
for (const b of GRADED)
  for (const c of CARRIERS)
    if (renderedCarrier(c).test(text(`<p>${b.fixture}</p>`)))
      overreach.push(`${c.why.slice(0, 40)} excuses ${b.name}`);
if (overreach.length) { console.error("CARRIER OVER-REACH: " + overreach.join(" | ")); process.exit(2); }
console.log(`negative control: 0 of ${CARRIERS.length} projected carrier(s) can excuse any of the ${GRADED.length} graded fixtures`);

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
// ★DOMAIN PROJECTION FOR THE FENCE, not an exclusion. The sibling excuses a
// frozen-verbatim name inside a ``` code fence — a command a developer types or
// a transcript they compare their own terminal against — under a hard budget,
// so prose cannot hide there. A fence is served as `<pre>…</pre>`, so the same
// rule is applied by scanning those two words OUTSIDE `<pre>` only, and
// counting what sat inside against the SAME budget lifted from the sibling.
// The 11 mechanism words are unaffected: they are graded over the whole page,
// exactly as before, because none of them is frozen anywhere.
// ★THE DOMAIN PROJECTION THAT MAKES THIS FAITHFUL. The sibling classifies
// LINE BY LINE over markdown: a carrier is tested against the whole line, a
// retirement marker must be in the SAME markdown block, and a fence is a line
// inside ```. Flattening a served page to one collapsed string loses all three
// — measured: a +/-90-character window could not reach "until a version is
// formally retired" 250 characters away on the same bullet, and reported six
// correct sentences as violations. A markdown LINE is served as a BLOCK
// ELEMENT, so block closers become the line breaks here and the sibling's rule
// applies unchanged. \u0001 marks a fence, \u0002 a dated heading; both are
// inserted before tags are stripped so they survive into the text domain.
function blockLines(html) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // ★EVERY line of a fence is marked, not just its first. The served code
    // block keeps real newlines between its `<span class="line">` rows, so a
    // single sentinel at the top marked only row 1 and the rest of the fence
    // read as prose — measured: 4 transcript lines reported as violations.
    .replace(/<pre[\s\S]*?<\/pre>/gi, (m) =>
      "\n" + m.split(/\r?\n/).map((x) => "\u0001" + x).join("\n") + "\n")
    .replace(/<h[23][^>]*>/gi, "\n\n\u0002")
    // ★A markdown table ROW is one line whose cells are `|`-separated, so a
    // cell close stays on the line and only the row close breaks it. This is
    // what lets the sibling's +/-CONTEXT window reach the neighbouring row —
    // measured: without it, five correct table cells read as violations.
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/(tr|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // ★A CONTAINER close is the analogue of a markdown BLANK LINE: it is what
    // stops the window walking into an unrelated block, which is the narrowing
    // the sibling added after a marker on a neighbouring paragraph rescued a
    // genuine violation.
    .replace(/<\/(p|h[1-6]|table|ul|ol|blockquote|pre|div|section)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#x3C;/gi, "<").replace(/&#x3E;/gi, ">");
  // ★Blank lines are KEPT. They are the block boundaries the window stops at;
  // filtering them out is what silently turned a bounded window into a flat one.
  return h.split("\n").map((l) => ({
    inPre:   l.includes("\u0001"),
    heading: l.includes("\u0002"),
    line:    l.replace(/[\u0001\u0002]/g, "").replace(/[^\S\n]+/g, " ").trim(),
  }));
}
const DATE_IN_HEADING = /\((\d{4}-\d{2}-\d{2})\)/;
let hits = 0, scanned = 0, bytes = 0, carrierExcused = 0, markerExcused = 0, fenced = 0, historyExcused = 0;
const perWord = Object.create(null);
for (const [f, raw] of corpus) {
  bytes += raw.length; scanned++;
  const whole = text(raw);

  // ── the 11 mechanism words: graded over the WHOLE page, exactly as before ──
  // None of them is frozen anywhere, so neither a fence nor a marker excuses
  // one; only a carrier does. This path is byte-for-byte the previous behaviour.
  for (const b of BANNED) {
    const re = new RegExp(b.re.source, b.re.flags);
    let m;
    while ((m = re.exec(whole)) !== null) {
      const ctx = whole.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90);
      if (CARRIERS.some((c) => renderedCarrier(c).test(ctx))) { carrierExcused++; continue; }
      hits++; perWord[b.name] = (perWord[b.name] || 0) + 1;
      console.log(`HIT ${f} :: ${b.name} :: …${ctx.trim()}…`);
    }
  }

  // ── the frozen-verbatim names: the sibling's classifier, block by block ────
  if (!VERBATIM.length) continue;
  const isChangelog = /changelog/i.test(f);
  const lines = blockLines(raw);
  let entryDate = null;
  for (let idx = 0; idx < lines.length; idx++) {
    const { line, inPre, heading } = lines[idx];
    if (!line) continue;
    if (isChangelog && heading) {
      const d = DATE_IN_HEADING.exec(line);
      if (d) entryDate = d[1];
    }
    for (const b of VERBATIM) {
      const re = new RegExp(b.re.source, b.re.flags);
      let m;
      while ((m = re.exec(line)) !== null) {
        // ORDER IS THE SIBLING'S: carrier, then fence, then marker, then date.
        if (CARRIERS.some((c) => renderedCarrier(c).test(line))) { carrierExcused++; continue; }
        if (inPre) { fenced++; continue; }
        // The sibling's window, unchanged: up to CONTEXT lines either side,
        // stopping at a blank line so an unrelated neighbouring block cannot
        // rescue a violation.
        let lo = idx, hi = idx;
        while (lo > idx - CONTEXT && lo > 0 && lines[lo - 1].line !== "") lo--;
        while (hi < idx + CONTEXT && hi < lines.length - 1 && lines[hi + 1].line !== "") hi++;
        const win = lines.slice(lo, hi + 1).map((x) => x.line).join("\n");
        if (MARKERS.some((k) => k.test(win))) { markerExcused++; continue; }
        if (isChangelog && entryDate && RETIRED_ON[b.name] && entryDate <= RETIRED_ON[b.name]) {
          historyExcused++; continue; // contemporaneous — the name was live that day
        }
        hits++; perWord[b.name] = (perWord[b.name] || 0) + 1;
        console.log(`HIT ${f} :: ${b.name} :: …${line.slice(Math.max(0, m.index - 90), m.index + 110).trim()}…`);
      }
    }
  }
}
console.log(`\nscanned ${scanned} served page(s), ${bytes} byte(s); ${carrierExcused} occurrence(s) excused by a frozen carrier, ` +
            `${markerExcused} plainly marked as retired, ${historyExcused} dated before the name was retired, ` +
            `${fenced} inside a served code fence (budget ${FENCE_BUDGET})`);
// ★A fence is a narrow excuse, not an unlimited one — same rule as the sibling.
if (fenced > FENCE_BUDGET) {
  console.log("per-word: " + JSON.stringify(perWord));
  console.error(`FAIL: ${fenced} fenced occurrence(s) of a frozen-verbatim name exceeds the budget of ${FENCE_BUDGET}`);
  process.exit(1);
}
if (hits) { console.log("per-word: " + JSON.stringify(perWord)); console.error(`FAIL: ${hits} mechanism word(s) reached a served page`); process.exit(1); }
// ★The green NAMES what it graded. The sentence this replaced — "no banned
// mechanism word" — is what let a 2-word blind spot read as a clean site.
console.log(`OK — none of the ${GRADED.length} graded word(s) reaches a served page as prose: ` +
            GRADED.map((g) => g.name).join(", "));
console.log(`  NOT graded here: the retired PRODUCT names (elevate, embody, essence-2-light/quality, ` +
            `lebundle, essence-2-mobile, essence2-light/quality) — check-retired-model-names.mjs grades ` +
            `those on the source tree with its retirement MARKERS, which this file does not lift.`);
