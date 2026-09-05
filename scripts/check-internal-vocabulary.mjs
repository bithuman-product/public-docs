#!/usr/bin/env node
// Internal-mechanism vocabulary guard for docs.bithuman.ai.
//
// WHY THIS EXISTS
// ---------------
// Owner rulings, 2026-09-04, verbatim:
//
//   "borrow is a tech internal concept and should never be exposed to client
//    side — expression-2 is fundamentally a different model than essence-2
//    anyway."
//   "as a developer they don't need to know any technical details at all."
//   "dream-1 is GPU only"  — and it is INTERNAL-ONLY ALPHA: it appears in NO
//    customer-facing artifact.
//
// The canonical vocabulary is docs/DISTRIBUTION-SURFACE.md §1b in
// bithuman-models, generated from tools/check_taught_surface.py. That tool
// grades the TAUGHT SURFACE of the design document. ★This file is its other
// half: the same words, graded on the pages a customer actually reads.
//
// WHAT IT DOES *NOT* OWN
// ----------------------
// `tessera` and `libessence` as RETIRED PRODUCT NAMES belong to
// check-retired-model-names.mjs, which already carries the NAMING-LEDGER §G
// per-carrier verdicts for them. Two checkers grading one word would drift,
// which is the failure this whole lane exists to remove. So the two lists are
// DISJOINT and this file asserts that below — if a word ever appears in both,
// this run is fatal rather than quietly double-reporting.
//
// THE RULE, in one sentence: an internal mechanism word may appear on this site
// ONLY as a FROZEN CARRIER — a literal a developer TYPES or a program PARSES
// (a public API method, an env var, a shell command, a filename, a log line
// they grep). Anywhere else it is an implementation detail in a customer's
// face, and that is what the ruling forbids.
//
// ★DEPRECATE IS NOT RENAME, and it is not delete either. `rt.compose(...)` is a
// method a developer calls; `docker compose` is a command they run. Hiding a
// string a developer must type is worse than showing an internal one. So the
// carriers below are ASSERTED PRESENT, not merely permitted: if one stops
// appearing, that is a rename and this exits non-zero.
//
// ★WHY THE FIRING CONTROL IS SYNTHETIC. The sibling checker proves its patterns
// work by finding them in the corpus. This one cannot: once the site is fixed
// the corpus is legitimately ZERO for most of these words, and `w0` was never
// there at all. A per-name corpus-presence rule would therefore be permanently
// red on a clean site, and the tempting fix — deleting the rule — is exactly
// how this estate shipped a docs checker that printed "OK — 234 occurrences"
// over 165 it had NO PATTERN FOR. So every pattern is fired against a FIXTURE
// in the same run instead. A pattern that cannot match its own fixture is a
// pattern that was never added, and that is fatal here.
//
// Deliberately dependency-free, matching the five checkers beside it.
//
// EXIT
//   0  the site names no mechanism AND every pattern is demonstrably able to fire
//   1  a mechanism word reached a customer-facing page, or the instrument is blind
//   2  could not run (never a silent pass)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

// ── corpus ───────────────────────────────────────────────────────────────────
// Identical to check-retired-model-names.mjs on purpose: "customer-facing" must
// mean the same set of bytes to both guards, or one of them is grading a
// different site. ★That used to be this comment and nothing else — the ROOTS
// array and EXT below were duplicated by hand and NOTHING compared them, so
// the two guards could quietly grade different sites. It is now asserted
// against the sibling's own walk output (`--emit-corpus`) in sameCorpus()
// below, which is fatal on any difference.
const ROOTS = [
  "src/content", "src/pages", "src/openapi", "public/api", "STYLE.md",
  "src/components", "src/layouts", "src/config", "src/data", "src/styles",
  "README.md", "vercel.json",
];
const EXT = /\.(md|astro|ts|yaml|yml|json|css)$/;

function collect(root) {
  const files = [];
  const walk = (rel) => {
    const abs = root + rel;
    if (!existsSync(abs)) return;
    if (statSync(abs).isFile()) {
      if (EXT.test(rel) || rel.endsWith(".md")) files.push(rel);
      return;
    }
    for (const e of readdirSync(abs)) walk(`${rel}/${e}`);
  };
  for (const r of ROOTS) walk(r);
  return files;
}

// ── the internal mechanism vocabulary ────────────────────────────────────────
// Each entry carries the FIXTURE that proves its pattern can fire. The fixture
// is a sentence of the kind this guard exists to catch — not a copy of the
// regex, which would only prove the regex matches itself.
//
// ★Each pattern is bounded so it grades the WORD, not a substring. A bare
// /pi/ matches "pipeline"; a bare /arm/ matches "alarm"; /director/ must NOT
// match "directory" and does not. Where a word is only internal in one sense,
// the pattern says which sense. ★When this guard fires on something CORRECT the
// fix is a better pattern or a named carrier — never a blanket exclusion, which
// is a guaranteed green over the very subject it covers.
const BANNED = [
  { name: "borrow", re: /\bborrow\w*/gi,
    fixture: 'assert stats["borrow_state"] == "borrowed"',
    say: "the mouth interior is rendered — say what the customer SEES, never how" },
  { name: "passthrough", re: /\bpassthrough\b/gi,
    fixture: "the passthrough counter on the shipped path",
    say: "name the observable behaviour, not the code path" },
  { name: "donor", re: /\bdonors?\b/gi,
    fixture: "the four published bundles carry 1024 donors",
    say: "an internal term for training data — it has no customer meaning" },
  { name: "bank", re: /\bbanks?\b/gi,
    fixture: "the compositor that consumes the bank",
    say: "internal storage inside the avatar file — a customer never addresses it" },
  { name: "arming", re: /\barm(ed|ing)\b/gi,
    fixture: "the 1280x720 identity, armed, renders at 0.9 fps",
    say: "'enabled'/'on' if a customer can act on it; otherwise delete the row" },
  { name: "w0", re: /\bw0\b/gi,
    fixture: "the w0 latent is held across ticks",
    say: "a tensor name — never customer-facing" },
  { name: "pi-frame", re: /\bpi[ -]frames?\b/gi,
    fixture: "the pi frame is the reference the paste-back lands in",
    say: "an internal reference frame. ★NOTE the boundary: `Raspberry Pi` is a " +
         "DEVICE a customer owns and is deliberately NOT matched" },
  // ★KNOWN, MEASURED OVER-MATCH, kept deliberately. This also fires on the
  // corporate sense — "the directors of the company approved it" — found by
  // running the negative control below, not by guessing. It is kept because:
  //   (a) it matches NOTHING of that sense in the corpus today (measured
  //       2026-09-04: every `director` hit was the neural graph), and
  //   (b) every narrowing that would exclude it — requiring a nearby
  //       "quality"/"speed"/"graph" word — also loses the real cases, e.g.
  //       "the director still renders on wasm".
  // A guard tuned to a sentence the site will never contain is a weaker guard.
  // If that sense ever needs to appear, add it as a CARRIER with its reason —
  // do not widen the escape.
  { name: "director", re: /\bdirectors?\b/gi,
    fixture: "the quality director gained 2.1x from WebGPU",
    say: "the neural graph inside the engine — say 'the model' or name the " +
         "product. ★`directory` is a different word and is not matched" },
  { name: "plane", re: /\bplanes?\b/gi,
    fixture: "the hardware plane is called Apple, not ANE",
    say: "our word for a serving target. A developer never chooses one " +
         "(DISTRIBUTION-SURFACE §2c) — say the device, or say nothing" },
  { name: "compose", re: /\bcompos(e|ed|es|ing|ition|itions|ite|ited|ites|iting|itor|itors)\b/gi,
    // ★The fixture carries `compositing` on purpose: the first version of this
    // pattern had no arm for it, so `frame compositing` sat in a page
    // description the guard had already called clean. A fixture that only
    // exercises the form you remembered is a fixture that proves nothing about
    // the form you forgot.
    fixture: "the mouth-interior compose the encoder never sees, and frame compositing in WASM",
    say: "an internal pipeline stage. ★The public `compose()` method and " +
         "`docker compose` are CARRIERS below — a developer types both" },
  // ★dream-1 is not a mechanism word; it is a PRODUCT that must not be named
  // here at all. It is graded by this file because the question is the same
  // one — may a customer meet this string? — and a second checker for one
  // string would be a second place for the answer to live.
  { name: "dream-1", re: /\bdream[-_ ]?1\b/gi,
    fixture: "dream-1 is GPU only and in scope on two lanes",
    say: "INTERNAL-ONLY ALPHA. It has no pricing code, no rate-card row, no " +
         "SDK, CLI, wheel or self-host route. It appears in NO customer-facing " +
         "artifact — there is no carrier and no marker that admits it" },
];

// Words this file must NOT grade, because check-retired-model-names.mjs already
// does, with the NAMING-LEDGER §G per-carrier verdicts. Asserted disjoint.
const OWNED_BY_RETIRED_NAMES = [
  "elevate", "embody", "essence-2-light", "essence-2-quality", "lebundle",
  "Essence 2 Light", "Essence 2 Quality", "essence-2-mobile",
  "essence2-light", "essence2-quality", "tessera", "libessence",
];

// ── FROZEN CARRIERS — a literal a developer types or a program parses ────────
// Each names WHY it is frozen and is asserted present in the corpus below.
// ★These are not exemptions for prose. Every one of them is a string that, if
// this guard forced it off the page, a developer could no longer type.
const CARRIERS = [
  { why: "`docker compose` / `docker-compose.yml` — the command a developer runs and the file they write",
    re: /docker[- ]compose|Compose `env_file`|docker-compose\.yml/i },
  { why: "`compose()` / `composeFromFile()` — public streaming methods on the on-device Python and Kotlin runtimes, called by name",
    re: /\bcompose\(|`compose\(\)`|rt\.compose\b|\bcomposeFromFile\b/ },
  // ★A VERBATIM LOADER ERROR. `…the native essence-2 runtime that owns the
  // TESSERA teeth borrow` is printed by the shipped CLI; a developer meets it
  // in their own terminal and searches for it. Keyed on the whole emitted
  // phrase, not on `lible_core.so`, so it excuses that sentence and nothing
  // else. ★It is also a FINDING and not only a carrier: the string itself
  // names the mechanism, and the fix is in the binary's message, which this
  // repo does not own. Filed as such rather than papered over here.
  // Keyed on `TESSERA teeth borrow` rather than the longer `owns the …`
  // because the site quotes this error WRAPPED, and a line-based carrier that
  // only matches the unwrapped form leaves the continuation line reported as
  // prose — which is what happened.
  { why: "the shipped CLI's loader error/hint — `…the TESSERA teeth borrow` — read verbatim in a developer's own terminal",
    re: /TESSERA teeth borrow/i },
  // ★A FROZEN REDIRECT. `/concepts/models-and-planes` was a live URL and is in
  // saved links, embeds and search results. Deprecate is not delete: the
  // redirect must keep resolving forever, so the retired path is spelled here
  // on purpose. Same verdict as the /concepts/essence-2-{light,quality}
  // redirects in check-retired-model-names.mjs, which asserts them present.
  // ★WIDENED 2026-09-05 TO THE TRAILING-SLASH FORM — the same frozen redirect,
  // in the spelling a saved link actually has. Measured on the live site that
  // day: all 44 redirect sources resolved bare and ALL 44 returned 404 with a
  // trailing slash, so the twins were added to vercel.json. The retired
  // /concepts/ paths were directory-format pages, so the URL a reader copied
  // out of their address bar ends in `/`. Widening the carrier to `/?` keeps
  // it keyed on a `"source":` line of a retired /concepts/ path and nothing
  // else — it is the SAME frozen string, not a new escape.
  { why: "the retired /concepts/ URLs, both spellings, which must keep redirecting for saved links",
    re: /"source"\s*:\s*"\/concepts\/[a-z0-9-]+\/?"/i },
  { why: "`be_runtime_tick_compose*` — exported C ABI entry points, resolved by the dynamic loader by exact name",
    re: /be_runtime_tick_compose\w*/i },
  { why: "BITHUMAN_TESSERA_DIRECTOR — an env var a customer sets in their own launcher; the reader takes it by exact name",
    re: /BITHUMAN_[A-Z_]*DIRECTOR\b/ },
  // ★A CAPTURED LOG LINE, not prose. `[selfhost-meter] metering armed for
  // identity=…` is what the shipped binary PRINTS; a developer greps it to
  // confirm their self-host is being metered. Same class as the `[embody]`
  // prefix carrier in check-retired-model-names.mjs. Deliberately keyed on the
  // whole emitted string and not on the `[selfhost-meter]` prefix alone —
  // a prefix carrier would excuse every banned word on any meter line, which
  // is the blanket exclusion this file refuses to write.
  { why: "`[selfhost-meter] metering armed for identity=` — the line the shipped self-host meter prints, grepped verbatim by a developer",
    re: /\[selfhost-meter\][^\n]*metering armed for identity=/ },
  // ★NOT ADDED, deliberately, and this is a finding rather than an omission:
  // the shipped essence-2 browser artifact names its two graphs `m4b` and
  // `m3c2` in a path a developer fetches. Those SLUGS are frozen and are
  // spelled exactly on the page — but the English word "director" beside them
  // is ours, not theirs, and is what this guard removes. A slug is a carrier;
  // the gloss around it is prose.
];

// ─────────────────────────────────────────────────────────────────────────────
// scan
// ─────────────────────────────────────────────────────────────────────────────
function scanText(text) {
  const hits = [];
  for (const b of BANNED) {
    b.re.lastIndex = 0;
    let m;
    while ((m = b.re.exec(text)) !== null) {
      hits.push({ name: b.name, found: m[0] });
      if (m.index === b.re.lastIndex) b.re.lastIndex++;
    }
  }
  return hits;
}

// ── THE SIBLING-CORPUS ASSERTION ─────────────────────────────────────────────
// ★Found by mutation 2026-09-04, not by reading: dropping ONE file from this
// guard's walk (`&& !rel.endsWith("community.md")`) left it GREEN while eleven
// mechanism words sat unread on that page. The per-root control passed (the
// root still contributed files) and the minimum-count control passed (106 of
// 107 is well over the floor of 20). Only a comparison against the OTHER
// guard's corpus can see it, and that comparison is what the comment at the top
// of ROOTS had been promising without code.
//
// It compares the sibling's WALK OUTPUT, not its ROOTS literal, so a divergent
// EXT or walk predicate is caught too — which is the shape the mutation took.
// Fatal, never a warning: a guard grading a different site than it claims is
// the "OK — 234 occurrences" defect with a different subject.
function siblingCorpusMismatch(root, mine) {
  const sib = "scripts/check-retired-model-names.mjs";
  let out;
  try {
    out = execFileSync(process.execPath, [root + sib, "--emit-corpus"],
                       { encoding: "utf8", timeout: 60000 });
  } catch (e) {
    return [`could not read the sibling corpus from ${sib} --emit-corpus ` +
            `(${(e && e.message || e).toString().split("\n")[0]}). The two guards ` +
            `claim to grade the same site and that claim is now unverifiable, so ` +
            `this run refuses rather than assuming it.`];
  }
  const theirs = out.split("\n").filter(Boolean).sort();
  if (theirs.length === 0) {
    return [`${sib} --emit-corpus produced 0 files — the comparison would pass ` +
            `vacuously against an empty list.`];
  }
  const a = new Set(mine.slice().sort());
  const b = new Set(theirs);
  const onlyMine = [...a].filter((f) => !b.has(f));
  const onlyTheirs = [...b].filter((f) => !a.has(f));
  if (!onlyMine.length && !onlyTheirs.length) return [];
  const show = (xs) => xs.slice(0, 5).join(", ") + (xs.length > 5 ? ` … +${xs.length - 5}` : "");
  const msg = [];
  if (onlyTheirs.length) msg.push(
    `${onlyTheirs.length} customer-facing file(s) are graded by ${sib} but NOT by ` +
    `this guard, so no mechanism word on them can ever be reported: ${show(onlyTheirs)}`);
  if (onlyMine.length) msg.push(
    `${onlyMine.length} file(s) are graded here but not by ${sib}: ${show(onlyMine)}`);
  return msg;
}

function run({ verbose = true, root = ROOT, files = null } = {}) {
  const fatal = [];
  const violations = [];
  const corpus = files || collect(root);
  // Only on a REAL run: the self-test's synthetic corpora are deliberately
  // not the site, and comparing them to the sibling would be meaningless.
  const siblingFatal = files ? [] : siblingCorpusMismatch(root, corpus);

  // ── the firing control, FIRST: a pattern that cannot match its own fixture
  //    is a pattern that was never added.
  const blind = [];
  for (const b of BANNED) {
    b.re.lastIndex = 0;
    if (!b.re.test(b.fixture)) blind.push(b.name);
  }
  if (blind.length) fatal.push(
    `THE INSTRUMENT IS BLIND — ${blind.length} pattern(s) do not match their own ` +
    `fixture: ${blind.join(", ")}. A guard with no working pattern for a word ` +
    `reports exactly what a clean site reports, which is how this estate printed ` +
    `"OK — 234 occurrences" over 165 it could not see.`
  );

  // ── the two guards must grade the same word once, not twice
  for (const b of BANNED) {
    if (OWNED_BY_RETIRED_NAMES.some((w) => w.toLowerCase() === b.name.toLowerCase())) {
      fatal.push(
        `\`${b.name}\` is graded by BOTH this file and check-retired-model-names.mjs. ` +
        `Two guards on one word drift apart and then disagree; pick one owner.`
      );
    }
  }

  // ★TWO DIFFERENT NUMBERS, and conflating them made this control fire on a
  // CORRECT page. `carrierRescues` counts how often a carrier EXCUSED a banned
  // word. `carrierPresent` counts whether the frozen literal is on the site AT
  // ALL. They come apart the moment the prose around a carrier is cleaned up:
  // `BITHUMAN_TESSERA_DIRECTOR` kept its row while the English word "director"
  // left the gloss beside it, so the carrier rescued nothing — and a control
  // keyed on rescues called that a rename and went red on a fixed page.
  // ★The rule was wrong, not the page. What "DEPRECATE IS NOT RENAME" asserts
  // is that the literal is still SPELLED here, which is what is measured now.
  const carrierRescues = new Map(CARRIERS.map((c) => [c.why, 0]));
  const carrierPresent = new Map(CARRIERS.map((c) => [c.why, 0]));
  const perName = new Map(BANNED.map((b) => [b.name, 0]));
  let carried = 0;
  let controlHits = 0; // a word that MUST be everywhere — proves the read works

  for (const rel of corpus) {
    const lines = readFileSync(root + rel, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/\bavatars?\b/i.test(line)) controlHits++;
      for (const c of CARRIERS) {
        if (c.re.test(line)) carrierPresent.set(c.why, carrierPresent.get(c.why) + 1);
      }
      for (const h of scanText(line)) {
        perName.set(h.name, perName.get(h.name) + 1);
        const carrier = CARRIERS.find((c) => c.re.test(line));
        if (carrier) {
          carrierRescues.set(carrier.why, carrierRescues.get(carrier.why) + 1);
          carried++;
          continue;
        }
        const b = BANNED.find((x) => x.name === h.name);
        violations.push(
          `${rel}:${i + 1}: internal vocabulary \`${h.found}\` [${h.name}] on a ` +
          `customer-facing page.\n` +
          `      ${line.trim().slice(0, 150)}\n` +
          `      → ${b.say}.\n` +
          `        The canonical word is in DISTRIBUTION-SURFACE.md §1b\n` +
          `        (bithuman-models). If a developer must TYPE this string, add it\n` +
          `        to CARRIERS in this file with the reason it is frozen — never a\n` +
          `        blanket exclusion, which reads green over its own subject.`
        );
      }
    });
  }

  // ── non-vacuity: a zero must be EARNED ─────────────────────────────────────
  if (corpus.length === 0) fatal.push(
    `the corpus is EMPTY — 0 files scanned. Every count below is 0 because ` +
    `nothing was read, not because the site is clean (ROOT resolves to ${root}).`
  );
  for (const m of siblingFatal) fatal.push(m);
  if (corpus.length > 0 && corpus.length < 20) fatal.push(
    `only ${corpus.length} files scanned — corpus globbing broke`
  );
  for (const r of ROOTS) {
    if (!existsSync(root + r)) continue;
    if (!corpus.some((f) => f === r || f.startsWith(r + "/"))) fatal.push(
      `root \`${r}\` exists but contributed 0 files — EXT or the walk stopped ` +
      `matching it, so that tree is now unguarded`
    );
  }
  // ★The read-path control. Distinct from the pattern control above: the
  // fixtures prove the REGEXES fire, this proves the FILES are being read. Both
  // can fail independently and only one message tells you which.
  if (corpus.length > 20 && controlHits < 200) fatal.push(
    `the control word \`avatar\` appears on only ${controlHits} lines (expected ` +
    `200+). The corpus is being walked but not READ, so every zero above is the ` +
    `zero of an empty string.`
  );
  for (const [why, n] of carrierPresent) {
    if (n === 0) fatal.push(
      `frozen carrier never seen in the corpus (${why}) — it was renamed or ` +
      `deleted. DEPRECATE IS NOT RENAME: a developer who types that string must ` +
      `still find it spelled here.`
    );
  }

  if (verbose) {
    console.log(`check-internal-vocabulary: ${corpus.length} customer-facing files scanned`);
    // ★This number is COUNTED, not asserted. It printed a hardcoded
    // `${BANNED.length}/${BANNED.length}` until a mutation blinded one pattern
    // and watched the line keep claiming 11/11 while the run failed beneath it.
    // A status line that cannot disagree with the thing it reports is the same
    // instrument defect this whole file exists to prevent, one level up.
    console.log(`  ★firing control  ${BANNED.length - blind.length}/${BANNED.length} ` +
                `patterns matched their own fixture`);
    console.log(`  ★read control    \`avatar\` on ${controlHits} lines — the files are being read`);
    console.log(`  frozen carriers  ${CARRIERS.length} present on the site; ` +
                `${carried} occurrence(s) of a mechanism word excused as a literal`);
    console.log(`  per-word         ${[...perName].map(([k, v]) => `${k}=${v}`).join(" ")}`);
    // ★Printed from the same array the fatal list is built from, so it cannot
    // claim agreement while the run fails beneath it.
    if (!files) console.log(`  ★corpus control  ${siblingFatal.length === 0 ? "same 107-file corpus as check-retired-model-names.mjs" : "DIVERGED from check-retired-model-names.mjs"}`.replace("107", String(corpus.length)));
  }

  if (fatal.length) {
    console.error("check-internal-vocabulary: REFUSING TO PASS VACUOUSLY —");
    for (const f of fatal) console.error(` - ${f}`);
    return 1;
  }
  if (violations.length) {
    console.error(`check-internal-vocabulary: ${violations.length} violation(s):\n`);
    for (const v of violations) console.error(` - ${v}`);
    return 1;
  }
  console.log(
    `check-internal-vocabulary: OK — 0 internal mechanism words on ${corpus.length} ` +
    `customer-facing files; ${carried} occurrence(s) are frozen carriers a developer ` +
    `types. Every one of the ${BANNED.length} patterns was proved able to fire in ` +
    `this same run.`
  );
  return 0;
}

// ── --emit: the measurement, regenerable ─────────────────────────────────────
// ★Every number on a page must carry its date and its instrument. This prints
// the table so a doc citing it can be REGENERATED rather than hand-maintained.
function emit(root = ROOT) {
  const corpus = collect(root);
  const per = new Map(BANNED.map((b) => [b.name, { hits: 0, files: new Set() }]));
  for (const rel of corpus) {
    const text = readFileSync(root + rel, "utf8");
    for (const h of scanText(text)) {
      const e = per.get(h.name);
      e.hits++; e.files.add(rel);
    }
  }
  const total = [...per.values()].reduce((a, b) => a + b.hits, 0);
  console.log(`<!-- generated by scripts/check-internal-vocabulary.mjs --emit -->`);
  console.log(`| internal word on the public site | files | hits |`);
  console.log(`|---|---:|---:|`);
  for (const [name, e] of per) {
    if (e.hits) console.log(`| \`${name}\` | ${e.files.size} | ${e.hits} |`);
  }
  console.log(`| | | **${total}** |`);
  console.log(`<!-- corpus: ${corpus.length} files; instrument: this script; run it to refresh -->`);
  return 0;
}

// ── --self-test: prove every arm goes red ────────────────────────────────────
function selfTest() {
  let fails = 0;
  // ★arms is COUNTED. The summary line below used to say "6 arms" as a string
  // literal; adding M7 left it claiming 6 while 7 ran. A count that cannot
  // disagree with what it counts is the same blind-instrument shape this file
  // exists to catch, one level up — and it was caught here by adding an arm.
  let arms = 0;
  const T = (label, ok) => { arms++; console.log(`${ok ? "  ok  " : "  FAIL"} ${label}`); if (!ok) fails++; };

  console.log("check-internal-vocabulary --self-test");

  // M1 — every pattern matches its own fixture (the control that would have
  //      caught the 165-occurrence defect on the day it was introduced).
  const blind = BANNED.filter((b) => { b.re.lastIndex = 0; return !b.re.test(b.fixture); });
  T(`M1 all ${BANNED.length} patterns fire on their fixture`, blind.length === 0);

  // M2 — each pattern must NOT match a near-twin that is legitimate English.
  //      This is the other half: a pattern that matches everything is as
  //      useless as one that matches nothing, and it is what makes an author
  //      switch the guard off.
  // ★These are sentences a docs page could legitimately contain. Each must NOT
  // fire. A pattern that matches everything switches its own author off, which
  // is how a guard ends up deleted rather than fixed.
  // ★NOT LISTED, and it is a finding rather than an oversight: "the directors
  // of the company" DOES fire. See the note on the `director` entry above —
  // measured, accepted, and recorded here so nobody rediscovers it as a bug.
  const NEAR_TWINS = {
    director: "the home directory is rewritten",
    "pi-frame": "runs on CPU (Raspberry Pi to server)",
    arming: "the alarm never fired",
    w0: "the w0rd is not a token",
    bank: "bankruptcy is not our concern",
    borrow: "borrowed is what this must never say",   // deliberately DOES match
  };
  const twinFails = [];
  for (const [name, twin] of Object.entries(NEAR_TWINS)) {
    if (name === "borrow") continue; // the one that must match, checked in M1
    const b = BANNED.find((x) => x.name === name);
    b.re.lastIndex = 0;
    if (b.re.test(twin)) twinFails.push(`${name} <- "${twin}"`);
  }
  T(`M2 no pattern fires on its legitimate near-twin${twinFails.length ? " — " + twinFails.join("; ") : ""}`,
    twinFails.length === 0);

  // M3 — the two checkers grade disjoint word sets.
  const overlap = BANNED.filter((b) =>
    OWNED_BY_RETIRED_NAMES.some((w) => w.toLowerCase() === b.name.toLowerCase()));
  T("M3 disjoint from check-retired-model-names.mjs", overlap.length === 0);

  // M4 — the real corpus passes as it stands.
  T("M4 the site as it stands passes", run({ verbose: false }) === 0);

  // M5 — an empty corpus is REFUSED, never a silent pass.
  T("M5 an empty corpus is refused (not a pass)", run({ verbose: false, files: [] }) === 1);

  // M6 — carriers are asserted present: a corpus with none is refused.
  //      Proved by scanning a single file that has no carrier in it.
  const one = collect(ROOT).filter((f) => f === "vercel.json");
  T("M6 a corpus with no frozen carrier is refused", one.length === 1 && run({ verbose: false, files: one }) === 1);

  // ★M7 — the arm that would have caught the defect that produced this rule.
  // A corpus one file short of the sibling's passes every other control here:
  // the root still contributes files, and 106 is far above the floor of 20.
  // Only the sibling comparison sees it, so it is exercised directly.
  const full = collect(ROOT);
  const short = full.filter((f) => !f.endsWith("community.md"));
  T("M7 a corpus one file short of the sibling's is refused",
    short.length === full.length - 1 &&
    siblingCorpusMismatch(ROOT, short).length > 0 &&
    siblingCorpusMismatch(ROOT, full).length === 0);

  console.log(`self-test: ${arms} arms, ${fails} failed`);
  return fails ? 1 : 0;
}

const arg = process.argv[2];
if (arg === "--self-test") process.exit(selfTest());
else if (arg === "--emit") process.exit(emit());
else process.exit(run());
