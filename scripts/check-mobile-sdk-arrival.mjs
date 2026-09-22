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
  return found;
}

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
    ["GOOD fixture stays quiet", GOOD, false],
    ["single-model page is out of population", GOOD.replace(/essence2-android:0\.5\.12/g, "expression2-android:0.4.7"), false],
    ["a page with no dependency line is out of population", "---\ntitle: T\n---\nProse only.\n", false],
  ];

  let bad = 0;
  for (const [name, md, expect] of arms) {
    const fired = gradePage("fixture", md).length > 0;
    const ok = fired === expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "WRONG"}  ${name.padEnd(46)} fired=${fired} expected=${expect}`);
  }

  // MUTATION: the green fixture must be turnable red by one edit. A fixture
  // that stays green under mutation proves the rules never looked at it.
  const mutated = withoutRow("Download");
  const mutFired = gradePage("fixture", mutated).length > 0;
  if (!mutFired) bad++;
  console.log(`  ${mutFired ? "OK  " : "WRONG"}  MUTATION: GOOD minus one row goes red    fired=${mutFired} expected=true`);

  // REAL CORPUS: the rules must have a live subject, or a green run means only
  // that nothing was graded.
  const subjects = pages().filter(([, md]) => shipped(md).length >= 2);
  const haveSubjects = subjects.length > 0;
  if (!haveSubjects) bad++;
  console.log(
    `  ${haveSubjects ? "OK  " : "WRONG"}  real corpus has a subject                 n=${subjects.length} (${subjects
      .map(([n]) => n)
      .join(", ")})`,
  );

  if (bad) {
    console.error(`check-mobile-sdk-arrival --selftest: ${bad} arm(s) wrong — this instrument is not proven.`);
    process.exit(1);
  }
  console.log(
    "check-mobile-sdk-arrival --selftest: OK — 10/10 defect arms fire, 3/3 good arms stay silent, the mutation arm reddens a green fixture, and the rules have a real subject.",
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
console.log(
  `check-mobile-sdk-arrival: OK — ${graded.length} multi-model SDK page(s) answer all six arrival questions for every model they ship (${graded
    .map(([n]) => n)
    .join(", ")}).`,
);
