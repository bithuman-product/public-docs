#!/usr/bin/env node
// THE HOME PAGE'S ANDROID SNIPPET MUST BE THE SDK PAGE'S ANDROID SNIPPET.
//
// WHY THIS EXISTS
// ---------------
// Until 2026-09-09 the home page Quickstart's "Kotlin" tab — the ONLY Android
// code on docs.bithuman.ai's front page — read
//
//     // build.gradle.kts: implementation("ai.bithuman:sdk:2.3.6")
//     Avatar.load(imxPath, apiSecret).use { avatar -> ... }
//
// which is `essence-1`: the one Android artifact that sdk/android.md says
// CANNOT AUTHENTICATE ON A DEVICE and therefore cannot render a frame there.
// The home page taught the one Android thing that cannot work, while the rail
// that does work — `expression-2`, measured at 213 frames on a Galaxy S25+ with
// no account, no API key and no credits — appeared nowhere on it.
//
// Nothing in this repo could see that. check-dependency-coordinates.mjs asks
// Maven Central whether `ai.bithuman:sdk:2.3.6` EXISTS, and it does; existing
// and rendering are different questions. check-retired-model-names.mjs grades
// NAMES, and `essence-1` is a current, un-retired name. A snippet can be
// perfectly spelled, perfectly resolvable and still be the wrong rail.
//
// The durable fix is not "write the right snippet once". It is to make the home
// page unable to drift from the page that owns the rail: the front page must
// quote sdk/android.md, byte for byte.
//
// WHAT IT CHECKS
//   1. src/pages/index.astro's `quickstart` array has a tab labelled "Kotlin".
//   2. That tab's code CONTAINS, as a contiguous verbatim substring, the whole
//      ```kotlin fence under "### Calling it — audio in, frames out" in
//      src/content/docs/sdk/android.md — the measured expression-2 loop.
//   3. The tab does not name a coordinate the Android page says cannot render
//      on a device (`ai.bithuman:sdk:` — essence-1) or the essence-2 store,
//      whose `fetch` has no published host to reach.
//
// Editing either side alone fails here. That is the whole point: the two files
// are now one fact.
//
// `--selftest` re-runs rules 2 and 3 against fixtures and REQUIRES each to
// fire, so a green run is evidence the instrument works rather than evidence it
// is asleep. Exit 1 on any violation.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const HOME = join(ROOT, "src/pages/index.astro");
const ANDROID = join(ROOT, "src/content/docs/sdk/android.md");

const HEADING = "### Calling it — audio in, frames out";
/** Coordinates/APIs the Android page documents as unable to render for a reader. */
const FORBIDDEN = [
  ["ai.bithuman:sdk:", "essence-1 — resolves and compiles, but cannot authenticate on a device"],
  ["Essence2ModelStore", "essence-2 on Android — no public host serves the android/v1 tree its store fetches"],
];

/** The canonical expression-2 loop, verbatim, from the Android SDK page. */
function sdkFence(md) {
  const i = md.indexOf(HEADING);
  if (i < 0) throw new Error(`sdk/android.md no longer has the heading "${HEADING}"`);
  const m = /^```kotlin[^\n]*\n([\s\S]*?)^```$/m.exec(md.slice(i));
  if (!m) throw new Error(`no \`\`\`kotlin fence after "${HEADING}" in sdk/android.md`);
  return m[1].replace(/\n+$/, "");
}

/** The `code:` template literal of the tab labelled `label` in the quickstart array. */
function quickstartTab(astro, label) {
  const re = new RegExp(
    `\\{\\s*label:\\s*"${label}",\\s*lang:\\s*"[a-z]+",\\s*code:\\s*\`([\\s\\S]*?)\`\\s*\\}`,
  );
  const m = re.exec(astro);
  return m ? m[1] : null;
}

/** Returns [] when clean, else human-readable violations. */
function grade(astro, androidMd) {
  const problems = [];
  const tab = quickstartTab(astro, "Kotlin");
  if (tab === null) {
    return ['index.astro has no quickstart tab labelled "Kotlin" — the home page must show the Android rail that renders'];
  }
  const fence = sdkFence(androidMd);
  if (!tab.includes(fence)) {
    problems.push(
      'the home page "Kotlin" tab is no longer a verbatim quote of the expression-2 loop under ' +
        `"${HEADING}" in sdk/android.md — the two have drifted. Copy the fence across unchanged, ` +
        "or change both together.",
    );
  }
  for (const [needle, why] of FORBIDDEN) {
    if (tab.includes(needle)) {
      problems.push(
        `the home page "Kotlin" tab names \`${needle}\` — ${why}. The front page must not teach ` +
          "an Android path that cannot render on a handset.",
      );
    }
  }
  return problems;
}

// ── firing control ──────────────────────────────────────────────────────────
if (process.argv.includes("--selftest")) {
  const FENCE = "val model = Expression2ModelStore(context).fetch(agentCode)";
  const MD = `### Calling it — audio in, frames out\n\n\`\`\`kotlin\n${FENCE}\n\`\`\`\n`;
  const home = (code) => `const quickstart = [\n  { label: "Kotlin", lang: "kotlin", code: \`${code}\` },\n];\n`;
  const arms = [
    ["good: tab quotes the fence verbatim", home(`// x\n${FENCE}`), MD, false],
    ["bad: drifted — one character changed", home(`// x\nval model = Expression2ModelStore(ctx).fetch(agentCode)`), MD, true],
    ["bad: tab teaches essence-1 (ai.bithuman:sdk:)", home(`// implementation("ai.bithuman:sdk:2.3.6")\n${FENCE}`), MD, true],
    ["bad: tab teaches the essence-2 store", home(`${FENCE}\nEssence2ModelStore(context)`), MD, true],
    ["bad: no Kotlin tab at all", `const quickstart = [\n  { label: "Python", lang: "python", code: \`x\` },\n];\n`, MD, true],
  ];
  let bad = 0;
  for (const [name, astro, md, mustFire] of arms) {
    const fired = grade(astro, md).length > 0;
    const ok = fired === mustFire;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(46)} fired=${fired} expected=${mustFire}`);
  }
  console.log(
    bad === 0
      ? "check-home-quickstart-kotlin --selftest: OK — 4/4 defect arms fire, 1/1 good arm stays silent."
      : `check-home-quickstart-kotlin --selftest: ${bad} arm(s) wrong`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const astro = readFileSync(HOME, "utf8");
const androidMd = readFileSync(ANDROID, "utf8");
const problems = grade(astro, androidMd);
if (problems.length) {
  for (const p of problems) console.log(`::error file=src/pages/index.astro::${p}`);
  console.log(`\nFound ${problems.length} problem(s) with the home page's Android snippet:\n`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
const fence = sdkFence(androidMd);
console.log(
  `check-home-quickstart-kotlin: OK — the home page "Kotlin" tab quotes all ` +
    `${fence.split("\n").length} lines of sdk/android.md's expression-2 loop verbatim, and names ` +
    `no Android coordinate that cannot render on a device.`,
);
