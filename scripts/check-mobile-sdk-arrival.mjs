#!/usr/bin/env node
// A PLATFORM SDK PAGE ANSWERS THE ARRIVAL QUESTIONS FOR EVERY MODEL IT SHIPS,
// ABOVE THE FOLD — OR IT IS NOT THE LINK YOU CAN SEND A DEVELOPER.
//
// WHY THIS EXISTS
// ---------------
// MEASURED on src/content/docs/sdk/android.md as it stood on 2026-09-21, at
// 188 lines:
//
//   Expression 2 had `## Install` with a copyable
//   `implementation("ai.bithuman:expression2-android:0.4.7")`, an
//   authentication section, a download size and a linked worked example.
//
//   Essence 2 had ONE ROW of the Troubleshooting table. That row carried the
//   real coordinate — `implementation("ai.bithuman:essence2-android:0.5.12")`,
//   which resolves — and ended "a walkthrough is pending". The walkthrough was
//   NOT pending: examples/kotlin-android-hello.md had carried the complete
//   Essence 2 project, every file, since 0.5.12 landed.
//
//   THREE other pages deep-linked readers to `/sdk/android#troubleshooting` to
//   find that coordinate: downloads.md once, concepts/essence-2.md twice. A
//   developer asking "how do I ship Essence 2 on Android" was sent, by our own
//   links, into a defect list.
//
// Essence 2 is the default model. On the handsets it was the under-documented
// one, and every checker in this repo was green the whole time — correctly, in
// each one's own terms. check-internal-links resolved the anchor: it exists.
// check-dependency-coordinates resolved the coordinate: it is published, and it
// does not care WHERE on a page a `implementation(...)` line sits.
// check-discoverability found an inbound link: there were three. Nothing in
// this repo graded whether a page ANSWERS A READER, because every rule here
// grades a fact, and "the page tells you how to start" is not one fact.
//
// ★ THE POPULATION IS READ OFF THE PAGE, NOT TYPED HERE. A page "ships" a model
// when it carries that model's dependency line in COPYABLE form — the same
// bytes check-dependency-coordinates.mjs already resolves against Maven Central
// and the Swift tap. So the two gates compose, and each does the half it can:
//
//   this file           the line is PRESENT, and above the fold, per model
//   check-dependency-…  the line RESOLVES at the registry that serves it
//
// and neither can be satisfied by the other. A page cannot escape this rule by
// deleting a model's coordinate either: deleting it is the one thing that makes
// the page honestly a single-model page, which is a different page and is
// allowed. That is why the population is derived and not listed — a typed list
// goes quietly short exactly when someone adds a model.
//
// WHAT "ABOVE THE FOLD" MEANS, MECHANICALLY: the page LEAD — everything between
// the end of the frontmatter and the first `## ` heading — must carry one table
// with a column per shipped model. Not a preference for tables: a reader
// deciding between two engines is comparing them, and a comparison that makes
// them scroll between two sections is the defect this file exists for.
//
// WHAT IT CHECKS, for every src/content/docs/sdk/*.md that ships 2+ models, and
// for each model it ships, against that model's own column of the lead table:
//   R1  what it is   — a link to /concepts/<slug>
//   R2  devices      — a device or OS floor (minSdk N, iOS N, arm64, Apple Silicon)
//   R3  dependency   — the copyable dependency line for THAT model
//   R4  credential   — a credential answer, and the page links somewhere to get one
//   R5  download     — a size figure in MB or GB
//   R6  example      — a link to an /examples/ page
//   R7  and page-wide: no "pending" / "not written yet" / "coming soon" promise.
//       R1-R6 guarantee every shipped model has a linked worked example, so such
//       a phrase on one of these pages is either false or a promise a docs page
//       must not make. This is the rule that fires on the 2026-09-21 android.md.
//
// WHAT IT CANNOT CHECK: that the answers are TRUE. R5 reads "226-281 MB" as a
// size and cannot know it was measured; R3's line is graded for existence here
// and for resolution by the gate named above. Truth of a measured figure is
// what the dated comment beside it is for. This is a necessary condition, not a
// sufficient one — and it is exactly the necessary condition that was violated.
//
// LIMIT, STATED: the table parser splits cells on `|` and does not honour an
// escaped pipe inside a cell. No cell on these pages has one; a cell that grows
// one will be mis-split, and the failure direction is a false FINDING, not a
// false pass.
//
// `--selftest` runs every rule against fixtures — 10 arms that must FIRE, 3
// that must stay QUIET, a mutation arm proving a green fixture can be turned
// red, and a real-corpus arm proving the rules have a live subject. A checker
// that has never been seen to fail is decoration.
//
// Deliberately dependency-free, matching the checkers beside it.
//
// EXIT
//   0  every shipped model is answered above the fold
//   1  a model is unanswered, or the instrument is blind
//   2  could not run (never a silent pass)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SDK = join(ROOT, "src/content/docs/sdk");

// The prose spelling and the API slug are vocabulary, fixed by STYLE.md; which
// of them a PAGE ships is derived from the page. `dep` is the copyable form,
// and is the same shape check-dependency-coordinates.mjs grades.
const MODELS = [
  {
    slug: "essence-2",
    prose: "Essence 2",
    dep: [
      /implementation\("ai\.bithuman:essence2-android:\d+\.\d+\.\d+"\)/,
      /\.product\(\s*name:\s*"Essence2"/,
    ],
  },
  {
    slug: "expression-2",
    prose: "Expression 2",
    dep: [
      /implementation\("ai\.bithuman:expression2-android:\d+\.\d+\.\d+"\)/,
      /\.product\(\s*name:\s*"Expression2"/,
    ],
  },
];

const PROMISE = /\b(?:is|are)\s+pending\b|\bnot written yet\b|\bcoming soon\b|\bwalkthrough is pending\b/i;

/* ─────────────────────────────────── R8 ──────────────────────────────────
 * THE LOWEST VERSION A PAGE PRINTS IS THE ONE SOME READER WILL TYPE.
 *
 * Measured on src/content/docs/sdk/ios.md at origin/main 24a1593, the commit
 * whose whole purpose was raising the SwiftPM floor from 2.11.0 to 2.13.8. The
 * copyable block was raised. Fourteen lines below it the page still said:
 *
 *     `from:` is a floor, not a pin — it resolves the newest 2.x tag. The newest
 *     package tag, **2.13.8**, … and `from: "2.11.0"` resolves it for you.
 *
 * That sentence is true of a FRESH resolve and false of the case a reader is
 * in, and it re-authorises the exact number the commit had just removed —
 * `from: "2.11.0"` leaves a project on `essence2-v1.4.0`, where an iPhone under
 * a 16 Pro warms up, refuses by name and stays idle-only: the face moves, it
 * never speaks, nothing is thrown.
 *
 * ★WHY NOTHING CAUGHT IT, which is the reason this rule is HERE and not
 * somewhere else. Two gates already grade versions and both were green:
 *
 *   check-dependency-coordinates R5  grades the FLOOR for exactly this hazard
 *                                    — but its extractor requires a
 *                                    `.package(url: "…homebrew-bithuman…")`
 *                                    prefix, and this `from:` sat in prose.
 *   check-versions-current V6        grades that a `from:` RESOLVES to the
 *                                    newest tag — and 2.11.0 does. Green, and
 *                                    correctly so, in its own terms.
 *
 * Both ask the registry a question about one well-formed manifest line. Neither
 * asks the question a reader's eye asks: OF THE NUMBERS ON THIS PAGE, WHICH ONE
 * DO I TYPE? A page that prints two answers has already failed, whatever the
 * registry says about either. That is a property of the PAGE, it needs no
 * network, and this is the file that grades pages.
 *
 * ★AND IT IS THE ANDROID HALF THAT HAS NO REGISTRY ANSWER AT ALL. Gradle takes
 * an exact version and never moves you down, so "does it resolve" is always yes
 * and "is it the newest" is check-versions-current's V1. Neither can see the
 * real Android hazard: `essence2-android` 0.5.11 and 0.5.12 ship a
 * BYTE-IDENTICAL `classes.jar` — the whole difference is inside a `.so` — so an
 * older pin compiles, runs, renders, and renders WRONG, with no exception, no
 * log a caller reads, and nothing the API reference or a compiler can see. The
 * only defence a docs page has is to print one number and never a lower one.
 *
 * WHAT IT CHECKS: every pin-shaped string on a graded page, grouped by what it
 * pins, must equal the highest one printed for that thing.
 *   - Maven      `<reverse.dns.group>:<artifact>:<version>` anywhere on the page
 *   - SwiftPM    `from:`/`exact:` + a quoted version, on a page that names the tap
 * PIN-SHAPED is the discriminator, deliberately, and it is the same choice
 * check-dependency-coordinates makes: a version written in the form a developer
 * copies is graded wherever it sits — fence, inline span or prose — and prose
 * that merely discusses a number ("v2.13.2 pins essence2-v1.6.2", "older than
 * 1.9.0") is free to describe history, because nobody copies it into a build.
 *
 * LIMIT, STATED: a page that must show a bad pin in pin shape — a negative
 * control — cannot, on these two pages. That is the intended trade: on a page
 * whose job is to be copied, a copyable wrong answer is the defect. Write it
 * as a bare tag instead, the way the iOS floor table does.
 */
const SEMVER = String.raw`\d+\.\d+(?:\.\d+)?`;
const TAP = "homebrew-bithuman";

/** Every pin-shaped string on the page, as { key, version, line }. */
function pins(md) {
  const out = [];
  const re = new RegExp(String.raw`\b([a-z][a-z0-9]*(?:\.[a-z0-9-]+)+):([A-Za-z0-9._-]+):(${SEMVER})\b`, "g");
  let m;
  while ((m = re.exec(md)) !== null) {
    out.push({ key: `${m[1]}:${m[2]}`, version: m[3], line: lineOf(md, m.index), raw: m[0] });
  }
  if (md.includes(TAP)) {
    const fre = new RegExp(String.raw`\b(?:from|exact)\s*:\s*["'](${SEMVER})["']`, "g");
    while ((m = fre.exec(md)) !== null) {
      out.push({ key: `swiftpm:${TAP}`, version: m[1], line: lineOf(md, m.index), raw: m[0] });
    }
  }
  return out;
}

/** a < b, numerically, component by component. */
function lower(a, b) {
  const n = (s) => s.split(".").map((x) => parseInt(x, 10) || 0);
  const A = n(a), B = n(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) < (B[i] || 0);
  }
  return false;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/* ─────────────────────────────────── R9 ──────────────────────────────────
 * A PAGE THAT DEPENDS ON A VERSION MUST HAND THE READER A WAY TO READ BACK THE
 * ONE THEY ACTUALLY GOT.
 *
 * R8 makes the page print one number. It cannot make the reader's toolchain
 * USE it, and on both rails the toolchain is entitled not to: SwiftPM keeps a
 * `Package.resolved` that predates the edit, and a Gradle build can be handed a
 * different version by a platform BOM or another module. In both failures the
 * symptom is a silent behavioural difference — on Apple an engine that never
 * speaks and throws nothing, on Android a `classes.jar` byte-identical to the
 * right one. A reader who cannot read back what they resolved has no way to
 * falsify the page, and "check your version" is not actionable advice without
 * the command that checks it.
 *
 * So: a graded page must carry, in a code block, the command that prints the
 * resolved version — `Package.resolved` on the SwiftPM rail, a dependency
 * report on the Gradle rail. Which rail is asked for is derived from the
 * dependency lines the page itself ships, so a page cannot pass by answering
 * for the rail it does not document.
 */
const READBACK = [
  {
    rail: "SwiftPM",
    ships: (md) => /\.product\(\s*name:\s*"(?:Essence2|Expression2)"/.test(md),
    re: /Package\.resolved/,
    want: "a code block that reads `Package.resolved` back",
  },
  {
    rail: "Gradle",
    ships: (md) => /implementation\("ai\.bithuman:/.test(md),
    re: /(?:gradlew|gradle)[^\n]*\bdependencies\b/,
    want: "a code block running a `gradlew … dependencies` report",
  },
];

/** The text inside every fenced code block. */
function fences(md) {
  const out = [];
  const re = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[2]);
  return out.join("\n");
}

/** Everything between the end of the frontmatter and the first `## ` heading. */
function lead(md) {
  let body = md;
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) body = body.slice(body.indexOf("\n", end + 1) + 1);
  }
  const h2 = body.search(/^## /m);
  return h2 === -1 ? body : body.slice(0, h2);
}

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/** Every markdown table in `md`, as { header, rows }. */
function tables(md) {
  const lines = md.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (!(i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1]))) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) rows.push(splitRow(lines[j]));
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

/** Which models this page ships, judged by a copyable dependency line anywhere on it. */
function shipped(md) {
  return MODELS.filter((m) => m.dep.some((re) => re.test(md)));
}

/**
 * Grade one page. Returns [] when clean, else human-readable findings.
 * `name` is only used in the message.
 */
function gradePage(name, md) {
  const found = [];
  const models = shipped(md);
  if (models.length < 2) return found; // single-model page: out of population

  if (PROMISE.test(md)) {
    const hit = md.match(PROMISE)[0];
    found.push(
      `${name}: R7 promises future documentation ("${hit}"). Every model this page ships must already have a linked worked example.`,
    );
  }

  const head = lead(md);
  const table = tables(head).find((t) =>
    models.every((m) => t.header.some((h) => h.includes(m.prose))),
  );
  if (!table) {
    found.push(
      `${name}: no lead table answers all ${models.length} models it ships (${models
        .map((m) => m.prose)
        .join(", ")}). A reader comparing two engines must not have to scroll to do it.`,
    );
    return found;
  }

  for (const m of models) {
    const idx = table.header.findIndex((h) => h.includes(m.prose));
    const col = table.rows.map((r) => r[idx] ?? "").join("\n");
    const miss = (r, what) => {
      if (!r.test(col)) found.push(`${name}: ${m.prose} column of the lead table does not answer ${what}.`);
    };
    miss(new RegExp(`\\(/concepts/${m.slug}\\)`), "R1 what it is (a link to /concepts/" + m.slug + ")");
    miss(/minSdk\s*`?\s*\d+|iOS\s+\d+|iPadOS\s+\d+|macOS\s+\d+|Apple Silicon|arm64/i, "R2 which devices");
    if (!m.dep.some((re) => re.test(col))) {
      found.push(`${name}: ${m.prose} column of the lead table carries no copyable dependency line.`);
    }
    miss(/credential|api key|api-secret|secret|\bnone\b|\bkey\b/i, "R4 what credential is needed");
    miss(/\d[\d,.]*\s*(?:MB|GB)\b/, "R5 how big the download is");
    miss(/\]\(\/examples\//, "R6 where the worked example is");
  }

  if (found.length === 0 && !/\]\(https:\/\/www\.bithuman\.ai\/developer\/api-keys\)|\]\(\/api\/authentication\)/.test(md)) {
    found.push(`${name}: R4 no page-wide link to where a credential comes from.`);
  }

  found.push(...gradePins(name, md));
  found.push(...gradeReadback(name, md));
  return found;
}

/** R8 — no pin-shaped string on the page may be lower than the highest one it
 *  prints for the same thing. Returns findings; `pinsSeen` counts subjects. */
function gradePins(name, md) {
  const found = [];
  const byKey = new Map();
  for (const p of pins(md)) {
    if (!byKey.has(p.key)) byKey.set(p.key, []);
    byKey.get(p.key).push(p);
  }
  for (const [key, list] of byKey) {
    pinsSeen += list.length;
    const top = list.reduce((a, b) => (lower(a.version, b.version) ? b : a));
    for (const p of list) {
      if (!lower(p.version, top.version)) continue;
      found.push(
        `${name}:${p.line}: R8 prints \`${p.raw}\` while the same page pins ${key} at ${top.version} ` +
          `(line ${top.line}). A version written in the form a developer copies is an instruction, ` +
          `wherever it sits — and the lower number is the one some reader will type. On the SwiftPM ` +
          `rail a lower \`from:\` is a FLOOR a project stays on; on the Gradle rail an older ` +
          `coordinate compiles and renders differently with nothing thrown. Print one version, or ` +
          `write the older one as a bare tag rather than as a pin.`,
      );
    }
  }
  return found;
}

/** R9 — the page must show how to read back the version actually resolved. */
function gradeReadback(name, md) {
  const found = [];
  const code = fences(md);
  for (const r of READBACK) {
    if (!r.ships(md)) continue;
    readbackSeen++;
    if (r.re.test(code)) continue;
    found.push(
      `${name}: R9 documents the ${r.rail} rail and never shows the reader how to read back the ` +
        `version they actually resolved — it needs ${r.want}. R8 makes the page print one number; ` +
        `it cannot make a toolchain use it, and when the toolchain does not, the symptom on both ` +
        `rails is a silent behavioural difference and nothing thrown.`,
    );
  }
  return found;
}

/** Subject counters, so a green run can prove it graded something. */
let pinsSeen = 0;
let readbackSeen = 0;

// ───────────────────────────── selftest ─────────────────────────────────────

const GOOD = `---
title: "X"
---
Lead sentence.

| | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [a scene](/concepts/expression-2) | [your portrait](/concepts/essence-2) |
| **Devices** | arm64, minSdk 26 | arm64, minSdk 29 |
| **Dependency line** | \`implementation("ai.bithuman:expression2-android:0.4.7")\` | \`implementation("ai.bithuman:essence2-android:0.5.12")\` |
| **Credential** | none | required, a key |
| **Download** | 160 MB | 238 MB |
| **Example** | [one](/examples/kotlin-android-hello) | [two](/examples/kotlin-android-hello#essence-2) |

## Install
Keys are free at [your API keys](https://www.bithuman.ai/developer/api-keys).

\`\`\`kotlin
implementation("ai.bithuman:expression2-android:0.4.7")
implementation("ai.bithuman:essence2-android:0.5.12")
\`\`\`

Check what you actually resolved:

\`\`\`bash
./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep ai.bithuman
\`\`\`
`;

/** Drop the row whose first cell matches `label` from the GOOD fixture. */
const withoutRow = (label) =>
  GOOD.split("\n").filter((l) => !l.startsWith(`| **${label}**`)).join("\n");

/** Blank out one model's cell in the row matching `label`. */
const blankCell = (label, col) =>
  GOOD.split("\n")
    .map((l) => {
      if (!l.startsWith(`| **${label}**`)) return l;
      const c = splitRow(l);
      c[col] = "";
      return "| " + c.join(" | ") + " |";
    })
    .join("\n");

// The page as it stood on 2026-09-21, compressed to the shape that matters:
// both coordinates present, only one model answered, and a pending promise.
const ANDROID_0921 = `---
title: "Android SDK"
---
## Install
\`\`\`kotlin
implementation("ai.bithuman:expression2-android:0.4.7")
\`\`\`
## Troubleshooting
| You see | It means | Do this |
|---|---|---|
| you want Essence 2 on Android | the coordinate is \`implementation("ai.bithuman:essence2-android:0.5.12")\` — published and measured; a walkthrough is pending | use \`0.5.12\` |
`;

// ★THE REAL DEFECT R8 WAS WRITTEN FOR. src/content/docs/sdk/ios.md at
// origin/main 24a1593 — the commit that raised the floor to 2.13.8 — still told
// the reader, fourteen lines under the raised block, that the number it had just
// removed "resolves it for you". Both gates that grade versions were green on
// this: R5 in check-dependency-coordinates never saw the prose `from:`, and V6
// in check-versions-current is satisfied because 2.11.0 does resolve to 2.13.8
// on a FRESH resolve. It is the reader with an existing Package.resolved who
// gets essence2-v1.4.0 and a face that never speaks.
const IOS_0921 = `---
title: "iOS SDK"
---
Lead.

| | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [a scene](/concepts/expression-2) | [your portrait](/concepts/essence-2) |
| **Devices** | any Apple Silicon iPhone, iOS 16 | any Apple Silicon iPhone, iOS 26 |
| **Product** | \`.product(name: "Expression2", package: "homebrew-bithuman")\` | \`.product(name: "Essence2", package: "homebrew-bithuman")\` |
| **Credential** | none | none |
| **Download** | 355 MB | 250 MB |
| **Example** | [one](/examples/swift-ios-expression2) | [two](/examples/swift-ios-essence2) |

## Install
Keys are free at [your API keys](https://www.bithuman.ai/developer/api-keys).

\`\`\`swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.13.8")
\`\`\`

\`from:\` is a floor, not a pin — it resolves the newest 2.x tag, and
\`from: "2.11.0"\` resolves it for you.

\`\`\`bash
grep -A3 'homebrew-bithuman' Package.resolved
\`\`\`
`;

/** IOS_0921 with the stale sentence removed — the shape the fix must reach. */
const IOS_FIXED = IOS_0921.replace(/, and\n\`from: "2\.11\.0"\` resolves it for you\./, ".");

function selftest() {
  const arms = [
    ["R7 the real android.md of 2026-09-21", ANDROID_0921, true],
    // The lead table is deleted and both coordinates survive in `## Install`,
    // so the page still ships two models and still owes a comparison.
    ["no lead table at all", GOOD.split("\n").filter((l) => !/^\|/.test(l)).join("\n"), true],
    ["lead table missing a model column", GOOD.replace(/ Essence 2 \|/, " |"), true],
    ["R1 no concept link", blankCell("What renders", 2), true],
    ["R2 no device floor", blankCell("Devices", 2), true],
    // Only the COLUMN loses the line; `## Install` keeps it, so the page is
    // still in the population and R3 is what fires.
    ["R3 no copyable dependency line", blankCell("Dependency line", 2), true],
    ["R4 no credential answer", blankCell("Credential", 2), true],
    ["R5 no download size", blankCell("Download", 2), true],
    ["R6 no worked example", blankCell("Example", 2), true],
    ["R4 no page-wide link to a key", GOOD.replace(/Keys are free.*/, "Keys exist."), true],

    // ── R8: a pin lower than the one the page pins, wherever it is written ──
    ["R8 the real ios.md of 2026-09-21 (prose `from:` below the block)", IOS_0921, true],
    ["R8 an older Maven coordinate in a Troubleshooting cell", GOOD.replace(/use \`0\.5\.12\`/, "x").replace(
      /\`\`\`bash/,
      "| an older build | `implementation(\"ai.bithuman:essence2-android:0.5.8\")` |\n\n```bash",
    ), true],
    ["R8 the lead table and the Install block disagree", GOOD.replace(
      /\| \*\*Dependency line\*\* \| \`implementation\("ai\.bithuman:expression2-android:0\.4\.7"\)\`/,
      '| **Dependency line** | `implementation("ai.bithuman:expression2-android:0.4.1")`',
    ), true],
    ["R8 a third-party pin that disagrees with itself", GOOD.replace(
      /implementation\("ai\.bithuman:essence2-android:0\.5\.12"\)\n\`\`\`/,
      'implementation("ai.bithuman:essence2-android:0.5.12")\nimplementation("com.qualcomm.qti:qnn-runtime:2.49.0")\nimplementation("com.qualcomm.qti:qnn-runtime:2.48.0")\n```',
    ), true],

    // ── R9: the page never shows how to read back what was resolved ─────────
    ["R9 the Gradle rail with no dependency report", GOOD.replace(/\.\/gradlew[^\n]*/, "echo hello"), true],
    ["R9 the SwiftPM rail with no Package.resolved read-back", IOS_FIXED.replace(/grep -A3[^\n]*/, "echo hello"), true],

    ["GOOD fixture stays quiet", GOOD, false],
    // The same iOS page with only that one sentence removed: R8 goes silent,
    // which is what makes the arm above a measurement and not a coincidence.
    ["R8 the ios.md fixture with the stale sentence removed", IOS_FIXED, false],
    // A bare tag is not a pin. The iOS floor table names v2.11.0 on purpose,
    // to say what it costs — and R8 must not fire on a page for saying so.
    ["R8 an older version named as a bare tag, not a pin", IOS_FIXED.replace(
      /## Install/,
      "| v2.11.0 | essence2-v1.4.0 — silent refusal |\n| v2.13.8 | essence2-v1.9.0 |\n\n## Install",
    ), false],
    ["single-model page is out of population", GOOD.replace(/essence2-android:0\.5\.12/g, "expression2-android:0.4.7"), false],
    ["a page with no dependency line is out of population", "---\ntitle: T\n---\nProse only.\n", false],
  ];

  let bad = 0;
  let fire = 0, quiet = 0;
  for (const [name, md, expect] of arms) {
    const fired = gradePage("fixture", md).length > 0;
    const ok = fired === expect;
    if (!ok) bad++;
    if (expect) fire++; else quiet++;
    console.log(`  ${ok ? "OK  " : "WRONG"}  ${name.padEnd(62)} fired=${fired} expected=${expect}`);
  }

  // MUTATION: the green fixture must be turnable red by one edit. A fixture
  // that stays green under mutation proves the rules never looked at it.
  const mutated = withoutRow("Download");
  const mutFired = gradePage("fixture", mutated).length > 0;
  if (!mutFired) bad++;
  console.log(`  ${mutFired ? "OK  " : "WRONG"}  ${"MUTATION: GOOD minus one row goes red".padEnd(62)} fired=${mutFired} expected=true`);

  // REAL CORPUS: the rules must have a live subject, or a green run means only
  // that nothing was graded.
  const subjects = pages().filter(([, md]) => shipped(md).length >= 2);
  const haveSubjects = subjects.length > 0;
  if (!haveSubjects) bad++;
  console.log(
    `  ${haveSubjects ? "OK  " : "WRONG"}  ${"real corpus has a subject".padEnd(62)} n=${subjects.length} (${subjects
      .map(([n]) => n)
      .join(", ")})`,
  );

  // ★MUTATION ON THE REAL SUBJECT, not only on a fixture. A fixture proves the
  // regex; only the live page proves the regex is pointed at the live page. Each
  // graded page must be GREEN as it stands and RED under one edit that
  // reintroduces the defect this rule exists for.
  for (const [n, md] of subjects) {
    const clean = gradePage(n, md).length === 0;
    if (!clean) bad++;
    console.log(`  ${clean ? "OK  " : "WRONG"}  ${`real corpus: ${n} is green as it stands`.padEnd(62)} findings=${gradePage(n, md).length} expected=0`);

    // R8: reintroduce a lower pin, in prose, for something the page already pins.
    const anyPin = pins(md)[0];
    if (anyPin) {
      const older = anyPin.raw.replace(/(\d+)\.(\d+)\.(\d+)/, (_, a, b) => `${a}.${Math.max(0, Number(b) - 1)}.0`)
        .replace(/(\d+)\.(\d+)$/, (s) => s);
      const red = gradePage(n, `${md}\n\nAn older build used \`${older}\`.\n`).length > 0;
      if (!red) bad++;
      console.log(`  ${red ? "OK  " : "WRONG"}  ${`R8 MUTATION: ${n} + a lower pin in prose goes red`.padEnd(62)} fired=${red} expected=true`);
    }

    // R9: delete every read-back command the page carries.
    const noReadback = md.replace(/Package\.resolved/g, "X").replace(/gradlew/g, "X");
    const red9 = gradePage(n, noReadback).length > 0;
    if (!red9) bad++;
    console.log(`  ${red9 ? "OK  " : "WRONG"}  ${`R9 MUTATION: ${n} minus its read-back goes red`.padEnd(62)} fired=${red9} expected=true`);
  }

  if (bad) {
    console.error(`check-mobile-sdk-arrival --selftest: ${bad} arm(s) wrong — this instrument is not proven.`);
    process.exit(1);
  }
  console.log(
    `check-mobile-sdk-arrival --selftest: OK — ${fire}/${fire} defect arms fire, ${quiet}/${quiet} good arms stay ` +
      `silent, the mutation arm reddens a green fixture, and every real page in the population is green as it ` +
      `stands and red under a one-edit reintroduction of R8 and of R9.`,
  );
  process.exit(0);
}

function pages() {
  if (!existsSync(SDK)) {
    console.error(`check-mobile-sdk-arrival: ${SDK} is missing — cannot run.`);
    process.exit(2);
  }
  return readdirSync(SDK)
    .filter((f) => f.endsWith(".md"))
    .map((f) => [`sdk/${f}`, readFileSync(join(SDK, f), "utf8")]);
}

if (process.argv.includes("--selftest")) selftest();

const all = pages();
const findings = all.flatMap(([n, md]) => gradePage(n, md));
const graded = all.filter(([, md]) => shipped(md).length >= 2);

if (graded.length === 0) {
  console.error("check-mobile-sdk-arrival: no page ships two models — nothing was graded, which is not a pass.");
  process.exit(1);
}
for (const f of findings) console.error(`::error::${f}`);
if (findings.length) {
  console.error(`check-mobile-sdk-arrival: FAIL — ${findings.length} finding(s) across ${graded.length} multi-model page(s).`);
  process.exit(1);
}

// NON-VACUITY, per added rule. R1-R7 cannot be vacuous — they run once per
// shipped model, and the population is defined by shipping one. R8 and R9 can
// be: if the pin regex stops matching (a fence is reformatted, a coordinate
// changes shape) R8 grades an empty set and prints a green. So each says how
// many subjects it found, and zero is a failure, not a pass.
if (pinsSeen === 0) {
  console.error(
    "::error::R8 found no pin-shaped string on any graded page — the extractor has gone blind, " +
      "and a green over an empty set is the failure mode this rule actually has.",
  );
  process.exit(1);
}
if (readbackSeen === 0) {
  console.error(
    "::error::R9 recognised neither rail on any graded page — the rail detector has gone blind.",
  );
  process.exit(1);
}

console.log(
  `check-mobile-sdk-arrival: OK — ${graded.length} multi-model SDK page(s) answer all six arrival questions for ` +
    `every model they ship (${graded.map(([n]) => n).join(", ")}); R8 graded ${pinsSeen} pin(s) and found no page ` +
    `printing two answers; R9 found a version read-back on ${readbackSeen} documented rail(s).`,
);
