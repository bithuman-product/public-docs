#!/usr/bin/env node
// Retired-product-name guard for docs.bithuman.ai.
//
// WHY THIS EXISTS
// ---------------
// The owner's 2026-09-02 ruling: a developer reading this site should meet only
// **essence-2** and **expression-2**. `elevate`, `embody`, `essence-2-light`,
// `essence-2-quality`, `lebundle` and their variants are DEPRECATED.
//
// ★DEPRECATE IS NOT RENAME. Nothing that carries a retired name is renamed or
// deleted here. A developer who must TYPE one — the `.lebundle.imx` file the
// download endpoint hands them, the `libelevate-web` artifact path, a tier slug
// a saved link carries — still gets it spelled exactly, because hiding a name a
// developer must type is worse than showing a retired one. This script does not
// hunt for the strings; it checks that every one of them is either a FROZEN
// CARRIER or is plainly marked as retired.
//
// THE RULE, in one sentence: every occurrence of a retired name must be either
//   (a) a frozen carrier literal (CARRIERS below), or
//   (b) within ±2 lines of a retirement marker (MARKERS below) — the migration
//       note, the 400-hint, the dated changelog entry. A retired spelling MUST
//       stay spellable, or a reader with an old integration can never learn it
//       is dead.
// Anything else is a retired name used as if it were live. That fails.
//
// It also proves the ACCEPT-BOTH half: the vercel.json redirects that keep the
// old /concepts/ URLs resolving must still exist AND still point at real pages.
// Deleting one would break a saved link, so it is asserted, not allowed.
//
// Deliberately dependency-free, matching the three checkers beside it.
// Exit 1 on any violation. Exits 1 rather than passing vacuously if the scan
// stops finding anything — a checker that silently stops checking is worse than
// no checker.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;

// ── corpus ───────────────────────────────────────────────────────────────────
const ROOTS = ["src/content", "src/pages", "src/openapi", "STYLE.md"];
const EXT = /\.(md|astro|ts|yaml|yml)$/;
const files = [];
const walk = (rel) => {
  const abs = ROOT + rel;
  if (!existsSync(abs)) return;
  if (statSync(abs).isFile()) { if (EXT.test(rel) || rel.endsWith(".md")) files.push(rel); return; }
  for (const e of readdirSync(abs)) walk(`${rel}/${e}`);
};
for (const r of ROOTS) walk(r);

// ── the retired names ────────────────────────────────────────────────────────
const RETIRED = [
  { name: "elevate",           re: /elevate/gi },
  { name: "embody",            re: /embody/gi },
  { name: "essence-2-light",   re: /essence-2-light/gi },
  { name: "essence-2-quality", re: /essence-2-quality/gi },
  { name: "lebundle",          re: /lebundle/gi },
  { name: "Essence 2 Light",   re: /Essence 2 Light/g },
  { name: "Essence 2 Quality", re: /Essence 2 Quality/g },
];

// ── (a) FROZEN CARRIERS — never rename, never delete ─────────────────────────
// A hit whose surrounding text matches one of these is a literal a developer
// receives or types. Each entry names why it is frozen.
const CARRIERS = [
  { why: "the artifact filename the download endpoint and `bithuman pull` produce",
    re: /\.lebundle\.imx/i },
  { why: "the frozen public browser-artifact path under models.bithuman.ai",
    re: /libelevate-web/i },
  { why: "the vendored on-device engine and its native library, named verbatim in a runtime error",
    re: /libelevate|lible_core/i },
  { why: "tier slugs that saved links, embeds and signed share JWTs carry verbatim",
    re: /essence-2-light-(gpu|cpu|ane)/i },
  { why: "a CSS surface token, not the product",
    re: /--color-elevated|color-elevated|var\(--color-elevated\)/i },
  { why: "the retired /concepts/ URLs, which must keep redirecting for saved links",
    re: /\/concepts\/essence-2-(light|quality)/i },
  { why: "`?model=` values saved links, embeds and share JWTs already carry",
    re: /[?&]model=essence-2-(light|quality)/i },
];

// ── (b) RETIREMENT MARKERS — the retired spelling stays spellable here ────────
const MARKERS = [
  /retir(ed|ing|ement)/i, /no longer accepted/i, /consolidat/i, /renam/i,
  /legacy/i, /former(ly)?/i, /pre-rename/i, /deprecat/i, /migration/i,
  /transitional/i, /alias/i, /historical/i, /not a product name/i,
  /kept for compatibility/i, /were called/i, /then called/i, /was removed/i,
  /frozen artifact path/i, /Named as of today/i, /400/, /VALIDATION_ERROR/,
  /is retired/i, /still pin/i, /route to/i, /fold(ed)? (on|be)/i,
  /previously/i, /no longer/i, /since been/i, /was consolidated/i,
];

// ── (c) CONTEMPORANEOUS HISTORY — the dated changelog ────────────────────────
// A changelog entry dated BEFORE a name was retired described the product by the
// name it actually had that day. Rewriting it would falsify the record, so it is
// allowed — but only up to that name's retirement date. An entry dated AFTER it
// must carry a marker like anything else, so a NEW entry cannot reintroduce a
// dead name under cover of "it's history".
const RETIRED_ON = {
  "elevate": "2026-06-30",
  "embody": "2026-06-30",
  "essence-2-light": "2026-07-05",
  "Essence 2 Light": "2026-07-05",
  "essence-2-quality": "2026-07-29",
  "Essence 2 Quality": "2026-07-29",
};
const DATED_HEADING = /^#{2,3} .*\((\d{4}-\d{2}-\d{2})\)\s*$/;

const CONTEXT = 2; // lines either side
const violations = [];
let totalHits = 0;
const carrierHits = new Map(CARRIERS.map((c) => [c.why, 0]));
const markerHits = { n: 0 };

let historyHits = 0;
for (const rel of files) {
  const lines = readFileSync(ROOT + rel, "utf8").split("\n");
  const isChangelog = rel.endsWith("changelog.md");
  let entryDate = null;
  lines.forEach((line, i) => {
    if (isChangelog) {
      const h = DATED_HEADING.exec(line);
      if (h) entryDate = h[1];
    }
    for (const { name, re } of RETIRED) {
      re.lastIndex = 0;
      if (!re.test(line)) continue;
      totalHits++;
      const carrier = CARRIERS.find((c) => c.re.test(line));
      if (carrier) { carrierHits.set(carrier.why, carrierHits.get(carrier.why) + 1); continue; }
      // The marker must be in the SAME markdown block as the hit. Expanding a
      // flat +/-CONTEXT window let a marker on an unrelated NEIGHBOURING line
      // rescue a genuine violation — a new changelog entry reintroducing a dead
      // name passed because the next paragraph happened to say "alias". So the
      // window stops at a blank line: prose that soft-wraps is still covered,
      // an adjacent unrelated block is not.
      let lo = i, hi = i;
      while (lo > i - CONTEXT && lo > 0 && lines[lo - 1].trim() !== "") lo--;
      while (hi < i + CONTEXT && hi < lines.length - 1 && lines[hi + 1].trim() !== "") hi++;
      const window = lines.slice(lo, hi + 1).join("\n");
      if (MARKERS.some((m) => m.test(window))) { markerHits.n++; continue; }
      if (isChangelog && entryDate && RETIRED_ON[name] && entryDate <= RETIRED_ON[name]) {
        historyHits++; continue; // contemporaneous: the name was live on that date
      }
      violations.push(
        `${rel}:${i + 1}: retired name \`${name}\` used as a live product name.\n` +
        `      ${line.trim().slice(0, 140)}\n` +
        `      → Use essence-2 / expression-2. If a developer must TYPE this string,\n` +
        `        keep it and say plainly it is a legacy name kept for compatibility\n` +
        `        (see /concepts/avatars-imx for the .lebundle note), or add it to\n` +
        `        CARRIERS in this file with the reason it is frozen.`
      );
    }
  });
}

// ── ACCEPT-BOTH: the old URLs must still resolve ─────────────────────────────
const REDIRECTS = [
  ["/concepts/essence-2-light",   "/concepts/essence-2",     "src/content/docs/concepts/essence-2.md"],
  ["/concepts/essence-2-quality", "/concepts/essence-2-max", "src/content/docs/concepts/essence-2-max.md"],
];
const vercel = readFileSync(ROOT + "vercel.json", "utf8");
for (const [from, to, page] of REDIRECTS) {
  const has = new RegExp(
    `"source"\\s*:\\s*"${from}"\\s*,\\s*"destination"\\s*:\\s*"${to}"`
  ).test(vercel.replace(/\s+/g, " "));
  if (!has) violations.push(
    `vercel.json: the redirect ${from} → ${to} is MISSING. A saved link to the ` +
    `retired URL would 404. Deprecating a name never deletes its redirect.`
  );
  if (!existsSync(ROOT + page)) violations.push(
    `${page}: redirect target for ${from} does not exist — ${to} would 404.`
  );
}

// ── non-vacuity: refuse to pass by finding nothing ───────────────────────────
const fatal = [];
if (files.length < 20) fatal.push(`only ${files.length} files scanned — corpus globbing broke`);
if (totalHits < 40) fatal.push(`only ${totalHits} retired-name occurrences found (expected 40+) — the scan is not reading the corpus`);
if (markerHits.n < 10) fatal.push(`only ${markerHits.n} occurrences matched a retirement marker (expected 10+) — MARKERS or the corpus changed shape`);
if (historyHits < 3) fatal.push(`only ${historyHits} occurrences resolved as dated changelog history (expected 3+) — the DATED_HEADING parse broke, so the changelog is no longer being dated-checked`);
for (const [why, n] of carrierHits) {
  if (n === 0) fatal.push(`frozen carrier never seen in the corpus (${why}) — it was renamed or deleted, which is exactly what must not happen`);
}
if (fatal.length) {
  console.error("check-retired-model-names: REFUSING TO PASS VACUOUSLY —");
  for (const f of fatal) console.error(` - ${f}`);
  process.exit(1);
}

if (violations.length) {
  console.error(`check-retired-model-names: ${violations.length} violation(s):\n`);
  for (const v of violations) console.error(` - ${v}`);
  process.exit(1);
}

console.log(
  `check-retired-model-names: OK — ${totalHits} occurrence(s) of a retired name ` +
  `across ${files.length} files; ${[...carrierHits.values()].reduce((a, b) => a + b, 0)} are ` +
  `frozen carriers a developer types, ${markerHits.n} are plainly marked as retired, ` +
  `${historyHits} are dated changelog entries from before that name was retired, ` +
  `0 used as a live product name. Both retired /concepts/ URLs still redirect to a real page.`
);
