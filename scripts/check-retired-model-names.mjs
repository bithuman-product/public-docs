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
// `public/api/openapi.yaml` is a build-time copy of `src/openapi/bithuman.yaml`
// (`npm run sync-openapi`, wired to pre{dev,build}), but it is the file a
// developer actually FETCHES from docs.bithuman.ai/api/openapi.yaml. Guarding
// only the source would leave the published bytes unchecked if the copy ever
// drifts, so both are scanned.
// ★2026-09-02: the first five roots left the SITE CHROME unscanned. A retired
// name in a nav label, a layout, a showcase entry or a style comment renders on
// every page and this guard could not see it — proved by mutation: appending
// "Essence 2 Light is the cheap tier; pick embody for mobile." to
// src/components/Nav.astro left the guard GREEN. vercel.json is scanned as text
// too (its redirect lines are frozen carriers), on top of the redirect
// assertion below.
const ROOTS = [
  "src/content", "src/pages", "src/openapi", "public/api", "STYLE.md",
  "src/components", "src/layouts", "src/config", "src/data", "src/styles",
  "README.md", "vercel.json",
];
const EXT = /\.(md|astro|ts|yaml|yml|json|css)$/;
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
  // Retired 2026-06-30 beside `elevate` and `embody` (see the 2026-06-29 and
  // 2026-06-26 changelog entries, which name all three as transitional aliases
  // that now 400). No pattern above matched it, so a NEW page could have used
  // `essence-2-mobile` as a live product name and passed.
  { name: "essence-2-mobile",  re: /essence-2-mobile/gi },
  // The UNHYPHENATED container engine ids. These were invisible to the four
  // patterns above (`essence-2-light` does not match `essence2-light`), so the
  // guard passed a page using `essence2-light` as a live product name — proved
  // by mutation before this entry existed. They are frozen manifest values, not
  // product names: `bithuman info` prints one, `--json` exposes it as `engine`,
  // and the loader quotes it verbatim (`backend loader for
  // engine='essence2-light'`). Confirmed live in the shipped readers —
  // ENGINE_ESSENCE2_LIGHT / ENGINE_ESSENCE2_QUALITY in the Python
  // `unified_header.py` and the Rust `engine_id.rs`, both conformance-tested
  // against the canonical `unified-engine-ids.json`, where public `essence-2`
  // maps to engine `essence2-light` and `essence-2-max` to `essence2-quality`.
  { name: "essence2-light",    re: /essence2[-_]light/gi,   engineId: true },
  { name: "essence2-quality",  re: /essence2[-_]quality/gi, engineId: true },
];

// An engine id is legitimate ONLY where it is presented as the container's
// `engine` field — the value you READ off a file. Anywhere else it is a dead
// name used as if it were a product, which is what the ruling forbids. So
// instead of a blanket carrier (which would re-open the hole this entry closes)
// the surrounding markdown BLOCK must actually be talking about the engine
// field. "Pick `essence2-light` for cheap renders" has no such context and
// fails; the mapping table, the `--json` sample and the quoted loader error all
// do and pass.
const ENGINE_FIELD_CONTEXT = /engine/i;

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

const fatalPre = []; // structural failures found before the corpus scan
const CONTEXT = 2; // lines either side
const violations = [];
let totalHits = 0;
const carrierHits = new Map(CARRIERS.map((c) => [c.why, 0]));
const markerHits = { n: 0 };

let historyHits = 0;
let engineIdHits = 0;
for (const rel of files) {
  const lines = readFileSync(ROOT + rel, "utf8").split("\n");
  const isChangelog = rel.endsWith("changelog.md");
  let entryDate = null;
  lines.forEach((line, i) => {
    if (isChangelog) {
      const h = DATED_HEADING.exec(line);
      if (h) entryDate = h[1];
    }
    for (const { name, re, engineId } of RETIRED) {
      re.lastIndex = 0;
      if (!re.test(line)) continue;
      totalHits++;
      const carrier = CARRIERS.find((c) => c.re.test(line));
      if (carrier) { carrierHits.set(carrier.why, carrierHits.get(carrier.why) + 1); continue; }

      if (engineId) {
        // The whole blank-line-delimited block, NOT the +/-CONTEXT window: a
        // mapping table's `engine` header row and a fenced loader error are
        // both legitimately more than two lines from the hit.
        let blo = i, bhi = i;
        while (blo > 0 && lines[blo - 1].trim() !== "") blo--;
        while (bhi < lines.length - 1 && lines[bhi + 1].trim() !== "") bhi++;
        const block = lines.slice(blo, bhi + 1).join("\n");
        if (ENGINE_FIELD_CONTEXT.test(block)) { engineIdHits++; continue; }
        violations.push(
          `${rel}:${i + 1}: container engine id \`${name}\` used outside the ` +
          `\`engine\`-field context.\n` +
          `      ${line.trim().slice(0, 140)}\n` +
          `      → \`${name}\` is a frozen manifest value a developer READS off a\n` +
          `        file (\`bithuman info\`, \`--json\` \`engine\`, the loader error), never a\n` +
          `        product name and never a valid \`model\` value. Say which product it\n` +
          `        means — see /concepts/avatars-imx#the-engine-value-is-a-legacy-name —\n` +
          `        or use the product name: essence-2 / essence-2-max.`
        );
        continue;
      }
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

// ── CI actually RUNS on everything this file reads ───────────────────────────
// ★THE DEFECT THIS CLOSES. This checker only protects a file if the workflow
// that invokes it is TRIGGERED by a change to that file. On 2026-09-02 it was
// not: the job's `paths:` filter listed src/content, src/pages, src/openapi,
// scripts and its own file — so a commit that deleted a frozen
// /concepts/ redirect from vercel.json ran NO workflow, even though the
// assertion below catches that deletion in a fraction of a second when it runs.
// A green checkbox meant "nothing I watch changed", not "the redirects survive".
//
// So the corpus and the trigger set must not be allowed to drift apart again:
// every ROOT scanned here, plus vercel.json, must be covered by a trigger glob.
// Parsed line-wise rather than with a YAML dependency, matching the
// no-dependencies rule these four checkers share.
const WF = ".github/workflows/link-check.yml";
if (!existsSync(ROOT + WF)) {
  fatalPre.push(`${WF} is missing — nothing invokes this checker, so every check below is decorative`);
} else {
  const wfLines = readFileSync(ROOT + WF, "utf8").split("\n");
  const globs = new Set();
  let inPaths = false;
  for (const raw of wfLines) {
    if (/^\s*paths:\s*$/.test(raw)) { inPaths = true; continue; }
    if (!inPaths) continue;
    const m = /^\s*-\s*'([^']+)'\s*$/.exec(raw);
    if (m) { globs.add(m[1]); continue; }
    if (/^\s*#/.test(raw) || raw.trim() === "") continue; // comments inside the list
    inPaths = false;
  }
  // A glob covers a path if the path equals it, or the glob is `<dir>/**` and
  // the path is that dir or under it.
  const covered = (rel) => [...globs].some((g) =>
    g === rel || (g.endsWith("/**") && (rel === g.slice(0, -3) || rel.startsWith(g.slice(0, -2))))
  );
  if (globs.size < 5) {
    fatalPre.push(`parsed only ${globs.size} trigger glob(s) from ${WF} — the paths: block moved or changed shape, so this coverage check is no longer reading it`);
  }
  for (const r of new Set([...ROOTS, "vercel.json"])) {
    if (!covered(r)) fatalPre.push(
      `${WF} has no \`paths:\` glob covering \`${r}\`, but this checker reads it. ` +
      `A commit touching only \`${r}\` would run no workflow, so this checker could ` +
      `not fail on it — which is how deleting a frozen redirect once landed green. ` +
      `Add \`${r}\` (or a \`${r}/**\` glob) to BOTH the push and pull_request path lists.`
    );
  }
}

// ── non-vacuity: refuse to pass by finding nothing ───────────────────────────
const fatal = [...fatalPre];
if (files.length < 20) fatal.push(`only ${files.length} files scanned — corpus globbing broke`);
// Per-ROOT non-vacuity. `files.length < 20` is satisfied by src/content alone,
// so it would NOT notice EXT losing `.astro`/`.json` or the components moving —
// the corpus would silently shrink back to the blind spot this root list was
// added to close. A root that no longer exists is not a failure (a tree may be
// legitimately deleted); a root that exists and contributes nothing is.
for (const r of ROOTS) {
  if (!existsSync(ROOT + r)) continue;
  if (!files.some((f) => f === r || f.startsWith(r + "/"))) {
    fatal.push(`root \`${r}\` exists but contributed 0 files to the scan — EXT or the walk stopped matching it, so that tree is now unguarded`);
  }
}
if (totalHits < 40) fatal.push(`only ${totalHits} retired-name occurrences found (expected 40+) — the scan is not reading the corpus`);
if (markerHits.n < 10) fatal.push(`only ${markerHits.n} occurrences matched a retirement marker (expected 10+) — MARKERS or the corpus changed shape`);
if (historyHits < 3) fatal.push(`only ${historyHits} occurrences resolved as dated changelog history (expected 3+) — the DATED_HEADING parse broke, so the changelog is no longer being dated-checked`);
if (engineIdHits < 3) fatal.push(`only ${engineIdHits} container engine ids (essence2-light / essence2-quality) seen in an \`engine\`-field context (expected 3+) — either the loader error and the mapping table were deleted (they are frozen carriers a developer reads) or the unhyphenated pattern stopped matching, which is the exact blind spot this check was added to close`);
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
  `${engineIdHits} are container engine ids shown in an \`engine\`-field context, ` +
  `0 used as a live product name. Both retired /concepts/ URLs still redirect to a real page.`
);
