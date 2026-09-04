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
  // ── ★ADDED 2026-09-04 — the two names this guard could not see ───────────
  // Owner ruling 2026-09-04: *"tessera is internal code name and isn't needed
  // anymore — we only need essence-1/2, expression-1/2 and nothing beyond
  // that."* `docs/NAMING.md` §6a is the vocabulary (six products, nothing
  // else); `docs/NAMING-LEDGER.md` §G is the per-carrier verdict for these two
  // spellings and is where every CARRIERS entry below marked §G comes from.
  //
  // ★THIS IS THE DEFECT THIS EDIT CLOSES, and it is the same class as a scorer
  // whose grep can never match its input. Until now this list held NEITHER
  // spelling, so the checker printed OK while — measured 2026-09-04 by walking
  // this file's OWN ROOTS/EXT corpus, not a filesystem grep — **165 occurrences
  // of a retired name (88 `tessera` + 77 `libessence`) on 157 lines across 34
  // of the 107 files scanned** sat on the customer-facing site, unguarded.
  // A guard that cannot fail on the thing it exists to catch is not a guard,
  // and the per-name presence control added at the bottom of this file is what
  // stops the list silently losing an entry again.
  //
  // ★DEPRECATE IS STILL NOT RENAME, and for these two the frozen surface is
  // LARGE: a public module path, a pip extra, four env vars, five stats keys a
  // caller of GET /v1/video/{job_id} parses, a borrow_reason STATE CODE, four
  // `.imx` member names, exported C symbols, and every `libessence*.{a,so,dylib}`
  // filename `System.loadLibrary`/`dlopen` resolves by exact name. All of them
  // are CARRIERS below. What is retired is the PROSE use — the name of the
  // product/engine in a sentence a customer reads.
  { name: "tessera",    re: /tessera/gi,    fenceIsVerbatim: true },
  { name: "libessence", re: /libessence/gi, fenceIsVerbatim: true },
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
  // ★2026-09-02: the shipped Expression2.xcframework (v2.5.0) still carries its
  // pre-rename strings, and a developer meets them without ever writing the dead
  // name themselves — they EXPORT the env var and they GREP the log prefix.
  // Verified by inspecting the published binary: `strings` finds
  // BITHUMAN_EMBODY_DIR and EMBODY_DEBUG_FAIL_PREDICT beside their EXPRESSION2_
  // twins, and every engine log line is prefixed `[embody]`. Hiding a string a
  // developer must type is worse than showing a retired one.
  { why: "environment-variable names the shipped Expression2 binary still reads, typed verbatim by a developer",
    re: /EMBODY_[A-Z]|EMBODY\)_/ },
  { why: "the `[embody]` log-line prefix the shipped Expression2 engine emits, grepped verbatim by a developer",
    re: /\[embody\]/i },
  { why: "tier slugs that saved links, embeds and signed share JWTs carry verbatim",
    re: /essence-2-light-(gpu|cpu|ane)/i },
  { why: "a CSS surface token, not the product",
    re: /--color-elevated|color-elevated|var\(--color-elevated\)/i },
  { why: "the retired /concepts/ URLs, which must keep redirecting for saved links",
    re: /\/concepts\/essence-2-(light|quality)/i },
  { why: "`?model=` values saved links, embeds and share JWTs already carry",
    re: /[?&]model=essence-2-(light|quality)/i },

  // ── ★§G frozen carriers for `tessera` / `libessence` (ADDED 2026-09-04) ──
  // Every entry below is a row of `docs/NAMING-LEDGER.md` §G, which records the
  // probe that answered for each. They are literals a customer TYPES or a
  // program PARSES; renaming one is a runtime break with no compile error.
  { why: "§G: the public Python MODULE PATH `bithuman.tessera_offline` — `from bithuman.tessera_offline import …` resolves by exact match out of an installed, version-pinned wheel",
    re: /tessera_offline/i },
  { why: "§G: the wheel EXTRA `bithuman[tessera]` — pip resolves an extra by exact match, so deleting it fails every requirements.txt that pins it",
    re: /bithuman\[tessera\]|`tessera` extra/i },
  { why: "§G: BITHUMAN_TESSERA_* env names a customer sets in their own launcher; the reader takes BOTH spellings and never drops the frozen one",
    re: /BITHUMAN_TESSERA_[A-Z_]+/ },
  { why: "§G: exported CamelCase identifiers a customer binds by name — OfflineTesseraRenderer, TesseraOfflineError, Swift TesseraBorrow/TesseraStream, Kotlin attachTesseraBorrow",
    re: /\b[A-Za-z]*Tessera[A-Za-z]+\b/ },
  { why: "§G: the member-listing command a developer types verbatim (`bithuman info <file> | grep tessera`)",
    re: /grep tessera/i },
  // ★A carrier for the shipped CLI's `…owns the TESSERA teeth borrow` error/hint
  // string was written here and then REMOVED, because this file's own
  // "frozen carrier never seen in the corpus" control fired on it: all three
  // occurrences (sdk/cli/commands.md:222, sdk/cli/verified.md:362-363,
  // guides/self-host-local.md:231) also name `lible_core.so` and are already
  // taken by the `libelevate|lible_core` carrier above, which is first in this
  // list and wins. Recorded rather than deleted silently: the string IS frozen
  // (it is what the binary prints and what a developer greps), and if a page
  // ever quotes the hint WITHOUT the library name, this guard will flag it and
  // the carrier goes back in.
  { why: "§G: library FILENAMES — System.loadLibrary/dlopen resolve them by exact name inside an installed app (readelf -d reports SONAME=libengine-backend-essence2-light.so)",
    re: /libessence[A-Za-z0-9_]*\.(a|so|dylib)\b|libessence_jni|libengine-backend-essence2-light/i },
  { why: "§G: the `libessence` JSON KEY in `bithuman version --json` / `doctor --json`, which the CLI's own help calls a stable contract and customer scripts parse",
    re: /["']libessence["']\s*:/i },
  // ★NOT ADDED, deliberately, and this is a finding rather than an omission:
  // §G also freezes the npm ErrorCode members TESSERA_MEMBERS_{MISSING,INVALID}
  // / TESSERA_ATTACH_REFUSED and the env names BITHUMAN_LIBESSENCE2 /
  // LIBESSENCE_INTRA_THREADS. Measured 2026-09-04, this site mentions NEITHER
  // group — 0 occurrences each — so adding them here would trip this file's own
  // "frozen carrier never seen in the corpus" fatal below and turn a correct
  // guard red. They are frozen; they are simply not documented here yet. If a
  // page ever adds one, add the carrier with it.
  //
  // ★MOVED HERE 2026-09-04 (same reason, new cause) — FOUR carriers that were
  // listed above until this commit:
  //     tessera_(bank|head).v1        the .imx member names
  //     tessera_(armed|frames|ms_p50|ms_p95) / stats["tessera"]  the stats keys
  //     no-tessera-members            the borrow_reason state code
  //     le_tessera_ / le::tessera::   exported C/C++ symbols
  // Every one of them appeared ONLY inside the passages the owner's 2026-09-04
  // ruling removed — "borrow is a tech internal concept and should never be
  // exposed to client side" — so after that rewrite each matched 0 lines and
  // this file's own presence control went red on a CORRECT site.
  // ★They are NOT unfrozen. NAMING-LEDGER.md §G still governs them and renaming
  // one is still a runtime break. What changed is only that this site no longer
  // documents them, which is the same state the group above has always been in.
  // ★The tension is real and is recorded rather than resolved here: §G says a
  // frozen string must stay spellable for someone with an old integration, and
  // the ruling says the borrow is never exposed client-side. Where those two
  // conflict the RULING wins on the public site, and the spellings live in
  // NAMING-LEDGER §G. If a page documents one again, move its carrier back up.
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
  // Retired by the 2026-09-04 owner ruling (NAMING.md §6a). Every changelog
  // entry on this site predates it, so the changelog keeps its spellings and
  // this guard says so out loud rather than letting them pass unexplained.
  "tessera": "2026-09-04",
  "libessence": "2026-09-04",
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
let fenceHits = 0;
// ★PER-NAME PRESENCE. The whole point of this file's 2026-09-04 edit: an entry
// in RETIRED that matches NOTHING is indistinguishable from an entry that is
// absent, and this checker spent its whole life green on 165 occurrences it had
// no pattern for. Counted per name and asserted non-zero below.
const nameHits = new Map(RETIRED.map((r) => [r.name, 0]));
for (const rel of files) {
  const lines = readFileSync(ROOT + rel, "utf8").split("\n");
  const isChangelog = rel.endsWith("changelog.md");
  // ── ★PROSE / CODE-SPAN CONTROL (ADDED 2026-09-04) ────────────────────────
  // Two guards on this estate flagged a docstring and were wrong. A fenced
  // block on this site is a command a developer types, a program they paste, a
  // config they write, or a captured transcript of what a tool printed —
  // rewriting any of those makes the page describe software that does not
  // exist. So for the names flagged `fenceIsVerbatim`, a hit INSIDE a fence is
  // a literal, not a product word.
  //
  // ★AND THIS IS NOT A BLANKET EXCLUSION, which is the failure mode that makes
  // an allowance a guaranteed green. It is narrow in three ways, each of which
  // is proved by mutation in scripts/../ (see the commit message):
  //   1. It applies ONLY to `tessera` / `libessence`. `elevate`, `embody`,
  //      `essence-2-light`, the engine ids: a fence excuses none of them.
  //   2. An INLINE `code span` is NOT a fence. "a thin binding over
  //      `libessence`" is still a violation — the backticks are typography, and
  //      that sentence is exactly the product-word use the ruling retires.
  //   3. The allowance is BUDGETED (FENCE_BUDGET below). A fence is not a place
  //      to park a new retired product word.
  // ★Blockquote markers are stripped first: this site quotes captured terminal
  // sessions as `> ```bash` … `> ``` `, and a tracker that only understood a
  // bare fence read every line of those transcripts as prose. Found by running
  // this guard against the real corpus, where downloads.md:95 —
  // `> install: installed: libessence 2.3.8 ABI 7`, a line the installer
  // actually prints — was reported as a product-word violation.
  const fenced = new Array(lines.length).fill(false);
  if (rel.endsWith(".md")) {
    let open = false;
    lines.forEach((l, k) => {
      const bare = l.replace(/^\s{0,3}(>\s?)+/, "");
      if (/^\s{0,3}(```|~~~)/.test(bare)) { open = !open; fenced[k] = true; return; }
      fenced[k] = open;
    });
  }
  let entryDate = null;
  lines.forEach((line, i) => {
    if (isChangelog) {
      const h = DATED_HEADING.exec(line);
      if (h) entryDate = h[1];
    }
    for (const { name, re, engineId, fenceIsVerbatim } of RETIRED) {
      re.lastIndex = 0;
      if (!re.test(line)) continue;
      totalHits++;
      nameHits.set(name, nameHits.get(name) + 1);
      const carrier = CARRIERS.find((c) => c.re.test(line));
      if (carrier) { carrierHits.set(carrier.why, carrierHits.get(carrier.why) + 1); continue; }

      if (fenceIsVerbatim && fenced[i]) { fenceHits++; continue; }

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
      const CANON = {
        tessera: "the teeth borrow (the MECHANISM) — the product is essence-2",
        libessence: "the essence engine / essence-2",
      };
      violations.push(
        `${rel}:${i + 1}: retired name \`${name}\` used as a live product name.\n` +
        `      ${line.trim().slice(0, 140)}\n` +
        `      → Use ${CANON[name] || "essence-2 / expression-2"}. If a developer must TYPE\n` +
        `        this string, keep it and say plainly it is a legacy name kept for\n` +
        `        compatibility (see /concepts/avatars-imx for the .lebundle note), or add\n` +
        `        it to CARRIERS in this file with the reason it is frozen. For \`tessera\`\n` +
        `        and \`libessence\` the per-carrier verdicts are docs/NAMING-LEDGER.md §G\n` +
        `        in bithuman-models — do not invent a new one here.`
      );
    }
  });
}

// ── ACCEPT-BOTH: the old URLs must still resolve ─────────────────────────────
const REDIRECTS = [
  ["/concepts/essence-2-light",   "/concepts/essence-2",     "src/content/docs/concepts/essence-2.md"],
  ["/concepts/essence-2-quality", "/concepts/essence-2-max", "src/content/docs/concepts/essence-2-max.md"],
];
// ★Read defensively. Found by mutation 2026-09-04: pointed at a tree with no
// corpus — the exact case the zero-file control below exists for — this line
// threw ENOENT and the process died with a stack trace before that control
// could say anything. rc was still 1, so it "failed", but the operator got a
// Node traceback instead of "the corpus is EMPTY". A control whose message
// never reaches the reader is half an instrument.
const vercelPath = ROOT + "vercel.json";
if (!existsSync(vercelPath)) fatalPre.push(
  `vercel.json is missing — the /concepts/ redirect assertion below cannot run, ` +
  `and its absence usually means this was run against the wrong tree`
);
const vercel = existsSync(vercelPath) ? readFileSync(vercelPath, "utf8") : "";
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
// ★PRESENCE CONTROL — a zero must be EARNED. Stated separately from the `< 20`
// bound below and first, because "0 files" and "17 files" are different
// failures and only one of them can be read as health by accident: an empty
// glob prints no error of its own, every downstream count is legitimately 0,
// and the whole file would otherwise sail to its OK line having read nothing.
// Proved by mutation (see the commit message): pointed at a tree with no src/,
// this exits 1 with THIS message, not with a pass.
if (files.length === 0) fatal.push(
  `the corpus is EMPTY — 0 files scanned. Every count below is 0 because nothing ` +
  `was read, not because the site is clean. ROOTS/EXT or the walk stopped matching, ` +
  `or this was run from the wrong directory (ROOT resolves to ${ROOT}).`
);
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
// ★PER-NAME PRESENCE — the control that would have caught this file's own
// 2026-09-04 defect on the day it was introduced. A RETIRED entry that matches
// nothing is indistinguishable, from the outside, from an entry that was never
// added: both leave the checker green. So every name must be SEEN. If a
// spelling has genuinely left the site, that is not a pass either — DEPRECATE
// IS NOT RENAME, and the migration note that keeps the dead spelling readable
// for someone with an old integration must still be there. Deleting the note
// is the failure this catches.
for (const [name, n] of nameHits) {
  if (n === 0) fatal.push(
    `retired name \`${name}\` was never seen in the corpus — either its pattern ` +
    `stopped matching (the guard has gone blind on it, which is how 165 ` +
    `\`tessera\`/\`libessence\` occurrences sat unguarded until 2026-09-04), or the ` +
    `retirement note that must keep this spelling readable was deleted. Neither is a pass.`
  );
}
// ★THE FENCE ALLOWANCE IS BUDGETED. Treating a fenced block as verbatim is
// correct — it is a transcript or a program — but an unbounded allowance is an
// exclusion that covers the subject, and those only ever read green. Measured
// 2026-09-04: 12 fenced-verbatim hits (11 in bare fences, 1 in a blockquoted
// terminal capture). The budget is 14. A 15th means someone put a retired
// product word inside a fence; go and look at it before raising this number.
const FENCE_BUDGET = 14;
if (fenceHits > FENCE_BUDGET) fatal.push(
  `${fenceHits} retired-name hits were excused as fenced-verbatim, over the budget of ` +
  `${FENCE_BUDGET} (12 measured 2026-09-04). A code fence is a transcript or a program, ` +
  `not a place to park a retired product word — read the new ones and either fix them or ` +
  `raise this number deliberately.`
);
if (fenceHits < 5) fatal.push(
  `only ${fenceHits} fenced-verbatim hits (expected 5+) — the fence tracker stopped ` +
  `matching \`\`\` blocks, so quoted CLI transcripts are about to be reported as prose violations`
);
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
  `${fenceHits} are inside a code fence (a command, a program or a captured transcript — ` +
  `budget ${FENCE_BUDGET}), ` +
  `0 used as a live product name. Both retired /concepts/ URLs still redirect to a real page.\n` +
  `  per-name: ${[...nameHits].map(([k, v]) => `${k}=${v}`).join(" ")}`
);
