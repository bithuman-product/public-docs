#!/usr/bin/env node
// A Kotlin snippet that reads BuildConfig.X must ship the Gradle that GENERATES it.
//
// WHY THIS EXISTS
// ---------------
// examples/kotlin-android-hello.md printed, for months, a `MainActivity.kt` whose
// only line touching the API secret was
//
//     Avatar.load(model, apiSecret = BuildConfig.BITHUMAN_API_SECRET)
//
// beside an `app/build.gradle.kts` block that declared no `buildConfigField` and
// did not turn `buildFeatures.buildConfig` on. The Android Gradle Plugin has
// defaulted `buildConfig` to FALSE since AGP 8.0, and the AGP this site pins is
// 8.7.3 (sdk/android-verify.md), so the BuildConfig class is never generated:
// the page's "Full code" does not compile. It fails at COMPILE time with
// `Unresolved reference: BuildConfig` — the reader never reaches a runtime error
// they could debug, and nothing on the page tells them which half is missing.
//
// This is the class of defect a docs repo cannot catch by building the site:
// Astro renders a broken code fence exactly as happily as a working one.
//
// WHAT IT CHECKS, per markdown page under src/content/docs:
//   For every `BuildConfig.<NAME>` read inside a ```kotlin fence on the page,
//   SOME kotlin fence on the SAME page must
//     (1) declare it   — `buildConfigField(... "<NAME>" ...)`, and
//     (2) enable it    — `buildConfig = true`.
//   A page that reads a constant it never generates is the defect above.
//
// WHAT IT CANNOT CHECK: that the project actually compiles. There is no Android
// SDK and no Gradle on the docs host, and running one would not belong in a docs
// gate anyway. This is a necessary condition, not a sufficient one — but it is
// exactly the necessary condition that was violated.
//
// `--selftest` runs both rules against fixtures and REQUIRES each to fire, so a
// green run here is evidence the instrument works rather than evidence it is
// asleep. Exit 1 on any violation.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DOCS = join(ROOT, "src/content/docs");

/** Every ```kotlin fence in a markdown source, as raw strings. */
function kotlinFences(md) {
  const out = [];
  const re = /^```kotlin[^\n]*\n([\s\S]*?)^```$/gm;
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[1]);
  return out;
}

/**
 * Grade one page's kotlin fences.
 * Returns [] when clean, else a list of human-readable violations.
 */
function gradePage(md) {
  const fences = kotlinFences(md);
  if (fences.length === 0) return [];
  const all = fences.join("\n");

  // Constants the snippets READ.
  const read = new Set();
  const re = /\bBuildConfig\.([A-Za-z_][A-Za-z0-9_]*)\b/g;
  let m;
  while ((m = re.exec(all)) !== null) read.add(m[1]);
  if (read.size === 0) return [];

  const problems = [];
  // (2) the feature must be switched on at all.
  const enabled = /\bbuildConfig\s*=\s*true\b/.test(all);
  if (!enabled) {
    problems.push(
      `reads BuildConfig.${[...read].join(", BuildConfig.")} but no kotlin fence on the page sets ` +
        `\`buildConfig = true\` — AGP 8.x defaults it to false, so the BuildConfig class is never ` +
        `generated and the snippet fails to compile with "Unresolved reference: BuildConfig"`,
    );
  }
  // (1) each constant must be declared.
  for (const name of [...read].sort()) {
    const declared = new RegExp(
      `buildConfigField\\s*\\([^)]*["']${name}["']`,
    ).test(all);
    if (!declared) {
      problems.push(
        `reads BuildConfig.${name} but no kotlin fence on the page declares it with ` +
          `buildConfigField(..., "${name}", ...)`,
      );
    }
  }
  return problems;
}

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (e.endsWith(".md") || e.endsWith(".mdx")) acc.push(p);
  }
  return acc;
}

// ── firing control ──────────────────────────────────────────────────────────
const FIXTURE_BAD_NO_FEATURE = `
\`\`\`kotlin
android { defaultConfig { minSdk = 29
  buildConfigField("String", "BITHUMAN_API_SECRET", "\\"x\\"") } }
\`\`\`
\`\`\`kotlin
Avatar.load(model, apiSecret = BuildConfig.BITHUMAN_API_SECRET)
\`\`\`
`;
const FIXTURE_BAD_NO_FIELD = `
\`\`\`kotlin
android { buildFeatures { buildConfig = true } }
\`\`\`
\`\`\`kotlin
Avatar.load(model, apiSecret = BuildConfig.BITHUMAN_API_SECRET)
\`\`\`
`;
const FIXTURE_BAD_BOTH = `
\`\`\`kotlin
android { defaultConfig { minSdk = 29 } }
\`\`\`
\`\`\`kotlin
Avatar.load(model, apiSecret = BuildConfig.BITHUMAN_API_SECRET)
\`\`\`
`;
const FIXTURE_GOOD = `
\`\`\`kotlin
android {
  defaultConfig {
    buildConfigField("String", "BITHUMAN_API_SECRET", "\\"\$s\\"")
  }
  buildFeatures { buildConfig = true }
}
\`\`\`
\`\`\`kotlin
Avatar.load(model, apiSecret = BuildConfig.BITHUMAN_API_SECRET)
\`\`\`
`;
const FIXTURE_IRRELEVANT = "```kotlin\nval x = 1\n```\n";

if (process.argv.includes("--selftest")) {
  const arms = [
    ["bad: buildConfig feature off", FIXTURE_BAD_NO_FEATURE, true],
    ["bad: constant never declared", FIXTURE_BAD_NO_FIELD, true],
    ["bad: neither half present", FIXTURE_BAD_BOTH, true],
    ["good: both halves present", FIXTURE_GOOD, false],
    ["control: no BuildConfig read at all", FIXTURE_IRRELEVANT, false],
  ];
  let bad = 0;
  for (const [name, md, mustFire] of arms) {
    const fired = gradePage(md).length > 0;
    const ok = fired === mustFire;
    if (!ok) bad++;
    console.log(
      `  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(36)} fired=${fired} expected=${mustFire}`,
    );
  }
  console.log(
    bad === 0
      ? "check-kotlin-buildconfig --selftest: OK — 3/3 defect arms fire, 2/2 good arms stay silent."
      : `check-kotlin-buildconfig --selftest: ${bad} arm(s) wrong`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

let pages = 0;
let reads = 0;
const failures = [];
for (const file of walk(DOCS)) {
  const md = readFileSync(file, "utf8");
  const fences = kotlinFences(md);
  if (fences.length === 0) continue;
  pages++;
  const names = new Set();
  const re = /\bBuildConfig\.([A-Za-z_][A-Za-z0-9_]*)\b/g;
  let m;
  const all = fences.join("\n");
  while ((m = re.exec(all)) !== null) names.add(m[1]);
  reads += names.size;
  for (const p of gradePage(md)) {
    failures.push(`  ${relative(ROOT, file)}\n      ${p}`);
    console.log(`::error file=${relative(ROOT, file)}::${p}`);
  }
}

if (failures.length) {
  console.log(`\nFound ${failures.length} un-generated BuildConfig read(s):\n`);
  console.log(failures.join("\n"));
  console.log(
    "\nFix: declare the constant with buildConfigField(...) AND set " +
      "buildFeatures { buildConfig = true } in a kotlin fence on the same page.",
  );
  process.exit(1);
}
console.log(
  `check-kotlin-buildconfig: OK — ${reads} BuildConfig constant(s) read across ` +
    `${pages} page(s) with kotlin snippets, every one of them generated by the ` +
    `Gradle on its own page.`,
);
