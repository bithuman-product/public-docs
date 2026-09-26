#!/usr/bin/env node
// THE TWO HANDSET EXAMPLES MUST COMPILE — AS PUBLISHED, FROM WHERE THE PAGE SENDS THE READER.
//
// ★THE SUBJECT MOVED (docs redesign, 2026-09-23). The example pages no longer
// print the projects: /examples/android-expression2 and /examples/swift-ios-expression2
// tell the reader to `git clone bithuman-examples` and `cd` into one directory,
// and that directory is what the reader builds. So this gate now grades exactly
// that, in two steps: (1) the SERVED page still sends the reader to the directory
// (the clone line and the `cd` line, in a code block), and (2) that directory at
// bithuman-examples main compiles, with the same build, artifact and mutation
// arms as before. The history below describes the page-extraction era; the build
// arms, exit codes and controls are unchanged.
//
// WHY THIS EXISTS
// ---------------
// examples/kotlin-android-hello.md and examples/swift-ios-expression2.md are
// ~2,000 lines of instructions that end with a talking avatar on a real phone.
// Every one of them is a whole project printed in full, and until today NOTHING
// in this repo compiled a line of it. What the other checkers here grade:
//
//   check-internal-links          a /route resolves
//   check-kotlin-buildconfig      a constant a snippet reads is generated
//   check-model-enum-examples     a model name is in its endpoint's enum
//   check-dependency-coordinates  the coordinate on the FIRST executable line
//                                 exists at the registry that serves it
//
// The last of those is the closest, and it is still only the first line. It
// proves `ai.bithuman:expression2-android:0.3.1` RESOLVES; it cannot see that
// `MainActivity.kt` calls a method the AAR renamed, that the manifest lost a
// permission, that `app/build.gradle.kts` dropped `useLegacyPackaging`, or that
// the first Swift block on a page needs `@MainActor` under Swift 6. Those are
// compile errors, and a compile error is the reader's whole experience: the page
// looks perfect and their build stops.
//
// ★AND IT GRADES THE PAGE THE READER GETS, NOT A COPY. The obvious cheaper gate
// is to check the example projects into this repo and build those. That gate
// goes green forever the moment the page and the checked-in copy diverge —
// which is the exact rot it was built to catch, and the copy is what rots
// because nobody reads it. So this fetches https://docs.bithuman.ai, pulls the
// code blocks out of the SERVED HTML, writes them to disk as the page's own
// filenames say, and runs the toolchain. If the page is wrong, this is red.
//
// WHERE IT RUNS, AND WHY NOT IN GITHUB ACTIONS
// --------------------------------------------
// A GitHub-hosted runner has no Android SDK and no Xcode, and `macos-latest`
// has no Android SDK either. This gate therefore CANNOT live in CI here; it
// runs daily on a private build Mac that has Xcode, a JDK 17 and an Android SDK
// with platform 35, driven by a runner outside this repository that pins this
// file to origin/main before grading. .github/workflows/examples-extractor-selftest.yml
// is the half that CAN run here: this file's own --selftest and --controls, so
// the extractor cannot rot unnoticed between host runs.
//
// WHAT IT DOES
// ------------
//   1. FETCH   both example pages from --origin (default https://docs.bithuman.ai),
//              or read them from --from-dir (a fixture; that is the failure arm).
//   2. EXTRACT every `<pre data-language=...>` block, strip the Shiki markup and
//              decode entities — the served HTML round-trips to the exact source.
//   3. ASSIGN  Android: the path comment on the block's own first lines
//              (`// app/build.gradle.kts`), against the allow-list of the seven
//              files the page's own tree diagram names.
//              iOS: content signatures (the XcodeGen spec, the Info.plist, the
//              `@main` Swift file), because those blocks carry no path comment.
//   4. BUILD   Android: `gradle wrapper --gradle-version 8.11.1` in the written
//              tree (the ORDER the page insists on — Gradle 9 refuses an empty
//              directory), then `./gradlew :app:assembleDebug`.
//              iOS: `xcodegen generate`, then `xcodebuild build` for
//              `generic/platform=iOS` with CODE_SIGNING_ALLOWED=NO.
//   5. ASSERT  a real artifact: the APK exists and carries `lib/arm64-v8a/*.so`;
//              the `.app` exists and carries a Mach-O executable.
//   6. CLEAN   the whole run tree, including DerivedData, always (the build Mac's
//              data volume runs low on free space). --keep opts out, for debugging.
//
// ★NO SIGNING. The iOS arm builds for a generic iOS device with signing off, on
// purpose. A gate that needs a provisioning profile goes red when a keychain is
// locked or a certificate rolls, and a gate that is red for a reason that is not
// its subject gets ignored. Signing is a separate, human concern.
//
// ★NO CUSTOMER CONTENT. The iOS project needs a `Sources/Model` directory to
// exist for its resource build phase. This writes three EMPTY placeholder files
// there. No `.avatar`, no identity, no rendered frame is fetched or written by
// this gate, on any arm.
//
// WHAT THIS GATE DOES NOT COVER — read this before trusting a green
// ----------------------------------------------------------------
//   * IT DOES NOT RUN THE APPS. `assembleDebug` and `xcodebuild build` prove the
//     printed code COMPILES and LINKS. They do not prove a frame is rendered, a
//     model downloads, the audio clock is right, or the numbers on the pages are
//     still true. Only a handset run does that, and a handset run needs an
//     unlocked phone and (on iOS) a signing team.
//   * IT DOES NOT SIGN, INSTALL OR LAUNCH ANYTHING (see above).
//   * IT GRADES TWO PAGES. Every other code block on this site — the Python,
//     JavaScript, cURL, WASM, CLI and essence-1 samples, and the essence-2
//     fragments further down the Android page — is still graded by nothing that
//     compiles it.
//   * THE iOS Info.plist IS LINTED, NOT LINKED. The page's XcodeGen spec carries
//     an `info:` block, so XcodeGen SYNTHESISES `Sources/Info.plist` and the
//     printed one never reaches the compiler. It is graded instead by
//     `plutil -lint` plus a required-key assertion (CFBundleIdentifier is the
//     one whose absence cost a measured afternoon), which is weaker than a
//     build.
//   * IT CANNOT SEE A PAGE THAT IS RIGHT AND USELESS. Code that compiles can
//     still tell a reader to buy something they do not need.
//
// EXIT CODES — a network flake must never read as a pass.
//   0  every requested arm built
//   1  A REAL DISAGREEMENT: the published code did not assemble, did not build,
//      produced no artifact, or the page no longer carries a file it must
//   2  INFRASTRUCTURE: a page could not be fetched, or a required tool is absent
//
// --selftest proves the EXTRACTOR against fixtures, with no network and no
// toolchain, and requires every defect arm to fire. It is not a substitute for
// the real failure control: run `--from-dir` against a deliberately broken page
// to watch the compilers themselves go red.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const NL = String.fromCharCode(10);
const ORIGIN_DEFAULT = "https://docs.bithuman.ai";

/* ------------------------------------------------------------------ extract */

// The served HTML is Shiki output: one <span class="line"> per line, real
// newlines between them, everything else entity-encoded. Stripping tags and
// decoding entities therefore round-trips to the byte-exact source of the fence.
export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&"); // last: an encoded &amp;lt; must survive as &lt;
}

export function extractBlocks(html) {
  const out = [];
  const re = /<pre\b[^>]*data-language="([^"]*)"[^>]*>([\s\S]*?)<\/pre>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ lang: m[1], text: decodeEntities(m[2].replace(/<[^>]+>/g, "")) });
  }
  return out;
}

/* ------------------------------------------------------------- the source */

// Each page sends the reader to one directory of this repository.
export const EXAMPLES_REPO = "https://github.com/bithuman-product/bithuman-examples.git";
const RAW_BASE = "https://raw.githubusercontent.com/bithuman-product/bithuman-examples/main/";

// The seven files of the Android project the gate writes and builds. The wrapper
// jar/gradlew are generated by `gradle wrapper`, not read, so they are not here.
const ANDROID_FILES = [
  "settings.gradle.kts",
  "build.gradle.kts",
  "gradle.properties",
  "gradle/wrapper/gradle-wrapper.properties",
  "app/build.gradle.kts",
  "app/src/main/AndroidManifest.xml",
  "app/src/main/java/com/example/x2hello/MainActivity.kt",
];

// The three files of the iOS project: the XcodeGen spec, the plist, the app.
const IOS_FILES = ["project.yml", "Sources/Info.plist", "Sources/App.swift"];

const sendsTo = (code, dir) =>
  code.includes(`git clone ${EXAMPLES_REPO}`) &&
  code.split(NL).some((l) => l.trim() === `cd bithuman-examples/${dir}`);

/** The SERVED page sends the reader to bithuman-examples/<dir>: both lines are
 *  in its code blocks, not merely mentioned in prose. */
export function pageSendsReaderTo(html, dir) {
  return sendsTo(extractBlocks(html).map((b) => b.text).join(NL), dir);
}

/** The same question of the page's markdown SOURCE (a pull request's change is
 *  not served yet). Only fenced code counts. */
export function markdownSendsReaderTo(md, dir) {
  const fences = [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map((m) => m[1]);
  return sendsTo(fences.join(NL), dir);
}

/** Reads the named files of one example directory. A file that is not there is
 *  MISSING, never skipped: a project that lost a file is a red, not a smaller green. */
export function readProject(root, files) {
  const found = new Map();
  const missing = [];
  for (const p of files) {
    const abs = join(root, p);
    if (existsSync(abs)) found.set(p, readFileSync(abs, "utf8"));
    else missing.push(p);
  }
  return { files: found, missing };
}

/* ---------------------------------------------------------------- mutation */

// THE FAILURE CONTROL, RUN AGAINST THE SAME COMPILERS THIS GATE TRUSTS.
//
// A green from a build gate is only worth what its red is worth, and the way a
// build gate silently dies is that it stops compiling the page's code and
// starts compiling something else (an empty tree, a cached artifact, a project
// whose sources it never wrote). Both of those still exit 0.
//
// So `--mutate` takes the SAME published page, renames one bitHuman API symbol
// inside it — the exact rot this gate exists to catch, an SDK method the page
// still calls by its old name — and REQUIRES the toolchain to reject it. The
// VERDICT IS INVERTED under --mutate, in this file, not in its caller: a mutant
// that FAILS to build exits 0 ("the control fired"), and a mutant that BUILDS
// exits 2 — the gate is not compiling the page and every green it has ever
// printed means nothing. A control whose result a caller has to remember to
// invert is a control that will one day be read the wrong way round.
//
// ★The token each mutation needs is asserted PRESENT first. A control that
// silently matches nothing is the failure this estate has already paid for.
const MUTATIONS = {
  android: {
    file: "app/src/main/java/com/example/x2hello/MainActivity.kt",
    from: "Expression2ModelStore(this).fetch(",
    to: "Expression2ModelStore(this).fetchRenamedByTheSdk(",
    // ★the symbol the toolchain must NAME in its rejection. A control that
    // grades "the build failed" and not "the build failed FOR MY REASON"
    // reports FIRED for any unrelated failure — which is exactly what the iOS
    // arm did, every Sunday, while compiling no Swift at all.
    token: "fetchRenamedByTheSdk",
    what: "the model-store call the page makes, renamed as the SDK might rename it",
  },
  ios: {
    file: "Sources/App.swift",
    from: "Expression2Engine.create(modelPath:",
    to: "Expression2Engine.createRenamedByTheSdk(modelPath:",
    token: "createRenamedByTheSdk",
    what: "the engine factory the page calls, renamed as the SDK might rename it",
  },
};

// ★Every build command's output, for the arm being built right now. main()
// clears it per arm so the --mutate grader can ask whether the toolchain
// rejection NAMED the mutated symbol.
let ARM_TRANSCRIPT = "";

function mutate(arm, files) {
  const m = MUTATIONS[arm];
  const text = files.get(m.file);
  if (text === undefined) {
    console.log(`::error::[${arm}] the control cannot run: ${m.file} was not extracted`);
    return 2;
  }
  if (!text.includes(m.from)) {
    console.log(`::error::[${arm}] THE FAILURE CONTROL IS BLIND: ${m.file} no longer contains ${JSON.stringify(m.from)}, so the mutation would change nothing and the "red" arm would be a green`);
    return 2;
  }
  files.set(m.file, text.split(m.from).join(m.to));
  console.log(`[${arm}] MUTANT: ${m.what}`);
  return 0;
}

/* ---------------------------------------------------------- fixture maker */

// HOW TO WATCH THIS GATE GO RED, ON DEMAND, WITHOUT WAITING FOR A REAL BREAK.
//
//   node scripts/check-published-examples-build.mjs --make-fixture /tmp/fx
//   node scripts/check-published-examples-build.mjs --from-dir /tmp/fx/good     # 0
//   node scripts/check-published-examples-build.mjs --from-dir /tmp/fx/broken   # 1
//
// The fixtures are BUILT FROM THE LIVE PAGES at the moment you ask, never
// checked in. A checked-in fixture is a second copy of the thing this gate
// exists to stop anyone from keeping: it drifts from the page, and the day it
// does, the red arm is testing a document nobody serves.
//
// The two breaks are the two rots these pages are most likely to suffer, and
// neither is the one --mutate uses, so the arms are not the same test twice:
//   android  the `import ai.bithuman.expression2.Expression2Avatar` line
//            disappears from MainActivity.kt — the page stops printing an import
//   ios      the `import Expression2` line disappears from App.swift
// Each break asserts it removed exactly one line. A fixture maker that silently
// breaks nothing produces a "red arm" that is green, which is the failure this
// whole file is about.
const FIXTURE_BREAKS = {
  android: {
    match: (line) => line.trim() === "import ai.bithuman.expression2.Expression2Avatar",
    what: "the `import ai.bithuman.expression2.Expression2Avatar` line in MainActivity.kt",
  },
  ios: {
    match: (line) => line.trim() === "import Expression2",
    what: "the `import Expression2` line in App.swift",
  },
};

/** Removes the ONE line that matches. Zero or two matches return null: a break
 *  that has to guess which line to remove will one day remove the wrong one. */
export function dropLine(text, matches) {
  const lines = text.split(NL);
  const hits = [];
  lines.forEach((l, i) => { if (matches(l)) hits.push(i); });
  if (hits.length !== 1) return { text: null, hits: hits.length };
  const removed = lines[hits[0]].trim();
  lines.splice(hits[0], 1);
  return { text: lines.join(NL), hits: 1, removed };
}

// The fixtures are two fresh clones of bithuman-examples main, never checked in:
// good/ as it is, broken/ with one import removed from each example.
async function makeFixture(dir) {
  let bad = 0;
  for (const arm of ["good", "broken"]) {
    const target = join(dir, arm);
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    const c = run("git", ["clone", "--depth", "1", "--quiet", EXAMPLES_REPO, target]);
    if (c.rc !== 0) {
      console.log(`::error::cannot clone ${EXAMPLES_REPO}: ${tail(c.out, 5)}`);
      return 2;
    }
  }
  for (const which of Object.keys(PAGES)) {
    const f = join(dir, "broken", PAGES[which].dir, MUTATIONS[which].file);
    const brk = FIXTURE_BREAKS[which];
    const r = dropLine(readFileSync(f, "utf8"), brk.match);
    if (r.text === null) {
      console.log(`::error::cannot break ${which}: ${brk.what} matched ${r.hits} lines, not exactly 1. The red arm would be a green.`);
      bad++;
      continue;
    }
    writeFileSync(f, r.text);
    console.log(`  ${which}: broken copy removed ${JSON.stringify(r.removed)}`);
  }
  console.log(bad ? "FIXTURE MAKER RED" : `fixtures written under ${dir} — run --from-dir ${join(dir, "good")} (expect 0) and --from-dir ${join(dir, "broken")} (expect 1)`);
  return bad ? 2 : 0;
}

/* ------------------------------------------------------ controls-in-source */

// THE HALF THAT CAN RUN IN GITHUB ACTIONS.
//
// The host gate's failure control renames one bitHuman API symbol in the page
// and requires the compiler to reject it. That control is only as good as the
// token it renames: the day an author rewrites MainActivity.kt and the string
// `Expression2ModelStore(this).fetch(` stops appearing, the mutation changes
// nothing, the mutant builds, and the "red arm" is a green — the exact way this
// estate has already gone blind (a positive control that named one watcher; an
// API lock that filtered out every nested type).
//
// The host gate catches that at its next run, on a Mac, once a day. This catches
// it on the PULL REQUEST that causes it, on ubuntu, with no toolchain and no
// network, by grading the markdown SOURCE the page is built from. It is
// deliberately not the live page: a PR's change is not published yet.
// The docs side of the subject: the page source must still send the reader to
// the directory whose code the mutation renames.
const CONTROL_SOURCES = {
  android: "src/content/docs/examples/android-expression2.md",
  ios: "src/content/docs/examples/swift-ios-expression2.md",
};

export function controlTokenCount(text, token) {
  return text.split(token).length - 1;
}

async function controlsInSource(repoRoot, examplesDir) {
  let bad = 0;
  let infra = 0;
  for (const [arm, rel] of Object.entries(CONTROL_SOURCES)) {
    const m = MUTATIONS[arm];
    const dir = PAGES[arm].dir;
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) {
      console.log(`::error::${rel} does not exist — the ${arm} example page is gone, and with it the gate's subject`);
      bad++;
      continue;
    }
    if (!markdownSendsReaderTo(readFileSync(abs, "utf8"), dir)) {
      console.log(`::error::${rel} no longer sends the reader to bithuman-examples/${dir} (a \`git clone ${EXAMPLES_REPO}\` and a \`cd bithuman-examples/${dir}\` line in its code). Fix PAGES.${arm} in this file to the directory the page names.`);
      bad++;
    } else {
      console.log(`  ok  ${arm}: ${rel} sends the reader to bithuman-examples/${dir}`);
    }
    // The code the mutation renames: a local bithuman-examples checkout when
    // given, else the file on main.
    const srcRel = `${dir}/${m.file}`;
    let text = null;
    if (examplesDir) {
      const f = join(examplesDir, srcRel);
      text = existsSync(f) ? readFileSync(f, "utf8") : null;
    } else {
      try {
        const res = await fetch(RAW_BASE + srcRel, { headers: { "cache-control": "no-cache" } });
        text = res.ok ? await res.text() : null;
      } catch {
        text = null;
      }
    }
    if (text === null) {
      console.log(`::error::cannot read bithuman-examples/${srcRel} — cannot grade the ${arm} control`);
      infra++;
      continue;
    }
    const n = controlTokenCount(text, m.from);
    if (n === 0) {
      console.log(`::error::THE ${arm.toUpperCase()} FAILURE CONTROL HAS GONE BLIND: bithuman-examples/${srcRel} no longer contains ${JSON.stringify(m.from)}. the host runner's --mutate would mutate nothing, its build would SUCCEED, and a control that cannot fail is not a control. Fix MUTATIONS.${arm} in this file to name a symbol the example really calls.`);
      bad++;
    } else {
      console.log(`  ok  ${arm}: bithuman-examples/${srcRel} calls ${JSON.stringify(m.from)} (${n}x) — the mutation has something to rename`);
    }
  }
  // ★THE TOKEN THE REJECTION MUST NAME HAS TO BE PART OF WHAT WE WRITE.
  for (const [arm, m] of Object.entries(MUTATIONS)) {
    if (!m.token || !m.to.includes(m.token)) {
      console.log(`::error::MUTATIONS.${arm}.token ${JSON.stringify(m.token)} is not part of what the mutation writes (${JSON.stringify(m.to)}) — the --mutate arm could never see its own symbol in a rejection`);
      bad++;
    } else {
      console.log(`  ok  ${arm}: the rejection must name ${JSON.stringify(m.token)}, which the mutation really writes`);
    }
  }
  const negative = controlTokenCount("nothing to see here", MUTATIONS.android.from);
  if (negative !== 0) {
    console.log("::error::controlTokenCount is broken: it found a token in text that does not contain it");
    bad++;
  } else {
    console.log("  ok  negative control: the counter returns 0 on text without the token");
  }
  if (bad) {
    console.log("CONTROLS RED");
    return 1;
  }
  if (infra) {
    console.log("CONTROLS UNPROVEN — a source could not be read");
    return 2;
  }
  console.log("CONTROLS GREEN — both pages send the reader to their directory, and both mutation tokens are still in the code they mutate");
  return 0;
}

/* -------------------------------------------------------------------- shell */

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    timeout: opts.timeoutMs || 45 * 60 * 1000,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  ARM_TRANSCRIPT += out;
  return { rc: r.status, out, err: r.error };
}

function have(tool) {
  return spawnSync("which", [tool], { encoding: "utf8" }).status === 0;
}

// Truncate long lines: one failed Swift file makes xcodebuild echo a ~4,000
// character swift-frontend invocation, and a transcript nobody can read is a
// transcript nobody reads.
function tail(s, n = 60) {
  const lines = s.split(NL);
  return lines
    .slice(Math.max(0, lines.length - n))
    .map((l) => (l.length > 240 ? l.slice(0, 240) + " …[" + (l.length - 240) + " more chars]" : l))
    .join(NL);
}

// xcodebuild prints one ~4,000-character frontend invocation per failed file, so
// a plain tail buries the one line a human needs under a screenful of -Xcc flags.
// Show the diagnostics first, then a short tail for context. If there are no
// diagnostic lines at all, fall back to the tail rather than printing nothing —
// a failure with no visible reason must never look like a quiet success.
function diagnostics(s, n = 40) {
  const hits = s
    .split(NL)
    // clang/swift say `error:`; the Kotlin compiler says `e: file://…`.
    .filter((l) => (/(^|\s)(error|fatal error):/.test(l) || /^e: file:\/\//.test(l)) && l.length < 400);
  const uniq = [...new Set(hits)].slice(0, n);
  return uniq.length ? uniq.join(NL) + NL + "--- last 20 lines ---" + NL + tail(s, 20) : tail(s, 60);
}

/* --------------------------------------------------------------------- args */

const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(name);
}
function opt(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}

const ORIGIN = opt("--origin", ORIGIN_DEFAULT).replace(/\/$/, "");
const FROM_DIR = opt("--from-dir", null);
const ONLY = opt("--only", null);
const KEEP = flag("--keep");
const MUTATE = flag("--mutate");

const PAGES = {
  android: { route: "/examples/android-expression2", dir: "android/expression2-hello", files: ANDROID_FILES },
  ios: { route: "/examples/swift-ios-expression2", dir: "swift/ios-expression2", files: IOS_FILES },
};

async function loadPage(which) {
  const url = ORIGIN + PAGES[which].route;
  let res;
  try {
    res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  } catch (e) {
    console.log(`::error::cannot reach ${url}: ${e.message}`);
    process.exit(2);
  }
  if (!res.ok) {
    console.log(`::error::${url} answered HTTP ${res.status}`);
    process.exit(2);
  }
  return { html: await res.text(), where: url };
}

/** The files of one example, from where the served page sends the reader:
 *  bithuman-examples main, cloned once per run. --from-dir <a bithuman-examples
 *  tree> reads that tree instead and skips the page (the fixture arms). */
async function loadSource(which, workRoot) {
  const p = PAGES[which];
  let root = FROM_DIR;
  if (!root) {
    const page = await loadPage(which);
    if (!pageSendsReaderTo(page.html, p.dir)) {
      console.log(`::error::[${which}] ${page.where} no longer sends the reader to bithuman-examples/${p.dir} — the gate's subject moved; fix PAGES.${which} in this file`);
      return { rc: 1 };
    }
    console.log(`[${which}] ${page.where} sends the reader to bithuman-examples/${p.dir}`);
    root = join(workRoot, "bithuman-examples");
    if (!existsSync(join(root, ".git"))) {
      const c = run("git", ["clone", "--depth", "1", "--quiet", EXAMPLES_REPO, root]);
      if (c.rc !== 0) {
        console.log(`::error::cannot clone ${EXAMPLES_REPO}`);
        console.log(tail(c.out, 10));
        return { rc: 2 };
      }
    }
    console.log(`[${which}] bithuman-examples main @ ${run("git", ["-C", root, "rev-parse", "--short", "HEAD"]).out.trim()}`);
  }
  const { files, missing } = readProject(join(root, p.dir), p.files);
  return { rc: 0, files, missing, where: join(root, p.dir) };
}

/* ------------------------------------------------------------------ selftest */

function fixtureHtml(blocks) {
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return blocks
    .map(
      ([lang, text]) =>
        `<pre class="astro-code" tabindex="0" data-language="${lang}"><code>` +
        text
          .split(NL)
          .map((l) => `<span class="line"><span style="color:#111">${esc(l)}</span></span>`)
          .join(NL) +
        `</code></pre>`
    )
    .join(NL + "<p>prose</p>" + NL);
}

function selftest() {
  const fails = [];
  const check = (name, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
    if (!ok) fails.push(name);
  };

  // A. entity decoding round-trips the two characters that matter in a manifest
  check("A1 entities decode", decodeEntities("&lt;manifest&gt; &amp;&amp; &quot;x&quot; &#39;y&#39;"), '<manifest> && "x" \'y\'');
  check("A2 &amp;lt; survives as &lt;", decodeEntities("&amp;lt;"), "&lt;");

  // B. the served page sends the reader to the directory — only code counts
  const CLONE = `git clone ${EXAMPLES_REPO}`;
  const good = fixtureHtml([["bash", CLONE + NL + "cd bithuman-examples/android/expression2-hello"]]);
  check("B1 clone + cd in a code block", pageSendsReaderTo(good, "android/expression2-hello"), true);
  check("B2 NEGATIVE: another directory", pageSendsReaderTo(good, "swift/ios-expression2"), false);
  check("B3 NEGATIVE: no clone line", pageSendsReaderTo(fixtureHtml([["bash", "cd bithuman-examples/android/expression2-hello"]]), "android/expression2-hello"), false);
  check("B4 NEGATIVE: the cd line only in prose", pageSendsReaderTo(fixtureHtml([["bash", CLONE]]) + "<p>cd bithuman-examples/android/expression2-hello</p>", "android/expression2-hello"), false);
  check("B5 NEGATIVE: a longer directory is not the directory", pageSendsReaderTo(fixtureHtml([["bash", CLONE + NL + "cd bithuman-examples/android/expression2-hello-old"]]), "android/expression2-hello"), false);

  // C. the markdown source, fenced code only
  const md = "Text cd bithuman-examples/x\n\n```bash\n" + CLONE + "\ncd bithuman-examples/swift/ios-expression2\n```\n";
  check("C1 markdown: fenced clone + cd", markdownSendsReaderTo(md, "swift/ios-expression2"), true);
  check("C2 NEGATIVE: markdown, the cd only in prose", markdownSendsReaderTo("cd bithuman-examples/x\n```bash\n" + CLONE + "\n```\n", "x"), false);

  // D. a project that lost a file is missing it; an empty directory is missing all
  const tmp = join(tmpdir(), `examples-selftest-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  for (const f of IOS_FILES) { mkdirSync(dirname(join(tmp, f)), { recursive: true }); writeFileSync(join(tmp, f), "x"); }
  check("D1 a whole project misses nothing", readProject(tmp, IOS_FILES).missing, []);
  rmSync(join(tmp, "project.yml"));
  check("D2 NEGATIVE: a dropped file fires", readProject(tmp, IOS_FILES).missing, ["project.yml"]);
  check("D3 NEGATIVE: an empty directory misses all", readProject(join(tmp, "nothing"), ANDROID_FILES).missing.length, ANDROID_FILES.length);
  rmSync(tmp, { recursive: true, force: true });

  // E. the fixture break removes exactly one line, or refuses
  const br = FIXTURE_BREAKS.ios.match;
  check("E1 one import removed", dropLine("a" + NL + "import Expression2" + NL + "b", br).text, "a" + NL + "b");
  check("E2 NEGATIVE: no match refuses", dropLine("a" + NL + "b", br).text, null);
  check("E3 NEGATIVE: two matches refuse", dropLine("import Expression2" + NL + "import Expression2", br).text, null);

  // I. the extractor must not read a <pre> without a language
  const i2 = extractBlocks("<pre><code>x</code></pre>" + fixtureHtml([["bash", CLONE]]));
  check("I1 an unlabelled pre is not a block", i2.length, 1);

  console.log(fails.length ? `selftest RED: ${fails.join(", ")}` : "selftest GREEN (all arms fired)");
  return fails.length ? 1 : 0;
}

/* ------------------------------------------------------------------- writing */

function writeTree(root, files) {
  for (const [p, text] of files) {
    const abs = join(root, p);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text.endsWith(NL) ? text : text + NL);
  }
}

/* ------------------------------------------------------------------- android */

async function buildAndroid(workRoot) {
  const src = await loadSource("android", workRoot);
  if (src.rc) return src.rc;
  const { files, missing } = src;
  console.log(`[android] ${src.where}`);
  console.log(`[android] read ${files.size} of ${ANDROID_FILES.length} project files`);
  if (missing.length) {
    console.log(`::error::[android] the example no longer carries: ${missing.join(", ")}`);
    return 1;
  }

  if (MUTATE) {
    const rc = mutate("android", files);
    if (rc) return rc;
  }

  const JAVA_HOME = process.env.JAVA_HOME_17 || process.env.JAVA_HOME;
  const ANDROID_HOME = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!JAVA_HOME || !existsSync(JAVA_HOME)) {
    console.log(`::error::[android] no JDK 17 — set JAVA_HOME (got ${JAVA_HOME || "unset"})`);
    return 2;
  }
  if (!ANDROID_HOME || !existsSync(join(ANDROID_HOME, "platforms", "android-35"))) {
    console.log(`::error::[android] no Android SDK with platform 35 — set ANDROID_HOME (got ${ANDROID_HOME || "unset"})`);
    return 2;
  }
  if (!have("gradle")) {
    console.log("::error::[android] `gradle` is not on PATH — the page's Step 2 needs it to write the wrapper");
    return 2;
  }

  const proj = join(workRoot, "x2hello");
  mkdirSync(proj, { recursive: true });
  writeTree(proj, files);
  // The page tells the reader to do exactly this if they are not in Android
  // Studio ("write one line into local.properties next to settings.gradle.kts").
  writeFileSync(join(proj, "local.properties"), `sdk.dir=${ANDROID_HOME}${NL}`);

  const env = { JAVA_HOME, ANDROID_HOME, ANDROID_SDK_ROOT: ANDROID_HOME, PATH: process.env.PATH };

  // Step 2 of the page, in the order the page insists on: the seven files are
  // already written, so `gradle wrapper` has a build to attach itself to.
  console.log("[android] gradle wrapper --gradle-version 8.11.1");
  const w = run("gradle", ["wrapper", "--gradle-version", "8.11.1"], { cwd: proj, env });
  if (w.rc !== 0 || !existsSync(join(proj, "gradlew"))) {
    console.log("::error::[android] `gradle wrapper` failed in the tree the page prints");
    console.log(tail(w.out));
    return 1;
  }

  console.log("[android] ./gradlew :app:assembleDebug");
  const b = run("./gradlew", ["--no-daemon", "--console=plain", ":app:assembleDebug"], { cwd: proj, env });
  const apk = join(proj, "app/build/outputs/apk/debug/app-debug.apk");
  if (b.rc !== 0) {
    console.log("::error::[android] THE PUBLISHED ANDROID EXAMPLE DOES NOT COMPILE");
    console.log(diagnostics(b.out));
    return 1;
  }
  if (!existsSync(apk)) {
    console.log(`::error::[android] gradle exited 0 but produced no APK at ${apk}`);
    return 1;
  }
  // A green that cannot go red: assert the artifact is really an arm64 APK, not
  // an empty zip a misconfigured build would also leave behind.
  const z = run("unzip", ["-l", apk]);
  if (!/lib\/arm64-v8a\/.*\.so/.test(z.out)) {
    console.log("::error::[android] the APK carries no lib/arm64-v8a/*.so — the SDK's native libraries are not in it");
    return 1;
  }
  const size = run("stat", ["-f", "%z", apk]).out.trim() || run("stat", ["-c", "%s", apk]).out.trim();
  console.log(`[android] GREEN — app-debug.apk ${size} bytes, carries lib/arm64-v8a/*.so`);
  return 0;
}

/* ----------------------------------------------------------------------- ios */

async function buildIos(workRoot) {
  const src = await loadSource("ios", workRoot);
  if (src.rc) return src.rc;
  const { files, missing } = src;
  console.log(`[ios] ${src.where}`);
  console.log(`[ios] read ${files.size} of ${IOS_FILES.length} project files`);
  if (missing.length) {
    console.log(`::error::[ios] the example no longer carries: ${missing.join(", ")}`);
    return 1;
  }
  if (MUTATE) {
    const rc = mutate("ios", files);
    if (rc) return rc;
  }
  if (!have("xcodebuild")) {
    console.log("::error::[ios] xcodebuild is not on PATH");
    return 2;
  }
  if (!have("xcodegen")) {
    console.log("::error::[ios] xcodegen is not on PATH — it is what the page's spec is fed to");
    return 2;
  }

  const proj = join(workRoot, "ios-expression2");
  mkdirSync(proj, { recursive: true });
  writeTree(proj, files);

  // The published Info.plist never reaches the compiler: the page's own XcodeGen
  // spec carries an `info:` block, so XcodeGen synthesises Sources/Info.plist
  // over it. Grade it here, before that happens, or it is graded by nothing.
  const plistPath = join(proj, "Sources/Info.plist");
  const lint = run("plutil", ["-lint", plistPath]);
  if (lint.rc !== 0) {
    console.log("::error::[ios] the published Info.plist is not valid property-list XML");
    console.log(tail(lint.out));
    return 1;
  }
  const plistText = files.get("Sources/Info.plist");
  const REQUIRED_PLIST_KEYS = ["CFBundleIdentifier", "CFBundleExecutable", "CFBundleName", "CFBundleVersion"];
  const lostKeys = REQUIRED_PLIST_KEYS.filter((k) => !plistText.includes(`<key>${k}</key>`));
  if (lostKeys.length) {
    console.log(`::error::[ios] the published Info.plist lost required key(s): ${lostKeys.join(", ")} — devicectl refuses a bundle without CFBundleIdentifier`);
    return 1;
  }
  console.log(`[ios] Info.plist lints and carries ${REQUIRED_PLIST_KEYS.length} required keys`);

  // The resource folder the spec references must exist for XcodeGen to accept
  // it. SYNTHETIC placeholders only — no identity, no avatar, no customer bytes.
  //
  // ★AND THEY MUST SATISFY THE PAGE'S OWN preBuildScripts PHASE, WHICH THIS
  // GATE SPENT EIGHT DAYS FAILING. The published spec gained a phase named
  // "Sources/Model must hold a real model, not the placeholder" in 4d3ae37
  // (2026-09-09) — it refuses an agent.avatar under 1 MB and a missing
  // shared_engine/w2v_frontend_cpuAndNE.mlpackage. This writer still wrote
  // zero-byte files, so every run since died in that phase with
  //     error: Sources/Model/agent.avatar is only 0 B … Re-run ./setup.sh
  // before a single line of Swift was compiled. MEASURED 2026-09-17:
  // `grep -c "[ios] GREEN" ~/scripts/docs-examples-build.log` = 0 — the iOS arm
  // has NEVER been green, and the daily `docs-examples-build` page said "the
  // published iOS example no longer builds" about a tree this gate crippled
  // itself. The page is fine for a developer who ran ./setup.sh; ARM 1/ARM 2
  // control (0 B -> rc 1, 1.1 MB -> rc 0) confirmed the size is the whole
  // difference.
  // ★WORSE, IT BLINDED THE WEEKLY CONTROL: --mutate grades "did the build
  // fail", and this arm failed every time for a reason that has nothing to do
  // with the mutation, so docs-examples-control reported FIRED on iOS
  // unconditionally. See the MUTATION-TOKEN check in main().
  mkdirSync(join(proj, "Sources/Model/shared_engine/w2v_frontend_cpuAndNE.mlpackage"),
            { recursive: true });
  writeFileSync(join(proj, "Sources/Model/agent.avatar"), Buffer.alloc(1_100_000));
  writeFileSync(join(proj, "Sources/Model/speech16k.wav"), "");

  console.log("[ios] xcodegen generate");
  const g = run("xcodegen", ["generate", "--spec", "project.yml"], { cwd: proj });
  if (g.rc !== 0 || !existsSync(join(proj, "IOSExpression2.xcodeproj"))) {
    console.log("::error::[ios] the published XcodeGen spec does not generate a project");
    console.log(tail(g.out));
    return 1;
  }

  const dd = join(workRoot, "DerivedData");
  console.log("[ios] xcodebuild build -destination generic/platform=iOS (unsigned)");
  const b = run(
    "xcodebuild",
    [
      "-project", "IOSExpression2.xcodeproj",
      "-scheme", "IOSExpression2",
      "-configuration", "Debug",
      "-destination", "generic/platform=iOS",
      "-derivedDataPath", dd,
      "-skipPackagePluginValidation",
      "CODE_SIGNING_ALLOWED=NO",
      "CODE_SIGNING_REQUIRED=NO",
      "CODE_SIGN_IDENTITY=",
      "build",
    ],
    { cwd: proj, timeoutMs: 60 * 60 * 1000 }
  );
  const app = join(dd, "Build/Products/Debug-iphoneos/IOSExpression2.app");
  if (b.rc !== 0) {
    console.log("::error::[ios] THE PUBLISHED iOS EXAMPLE DOES NOT BUILD");
    console.log(diagnostics(b.out));
    return 1;
  }
  const bin = join(app, "IOSExpression2");
  if (!existsSync(bin)) {
    console.log(`::error::[ios] xcodebuild exited 0 but produced no executable at ${bin}`);
    return 1;
  }
  const file = run("file", [bin]);
  if (!/Mach-O.*arm64/.test(file.out)) {
    console.log(`::error::[ios] the product is not an arm64 Mach-O: ${file.out.trim()}`);
    return 1;
  }
  console.log(`[ios] GREEN — ${file.out.trim()}`);
  return 0;
}

/* -------------------------------------------------------------------- driver */

async function main() {
  if (flag("--selftest")) return selftest();
  if (flag("--controls")) return await controlsInSource(opt("--repo", process.cwd()), opt("--examples", null));
  if (flag("--make-fixture")) return await makeFixture(opt("--make-fixture", join(tmpdir(), "docs-examples-fixture")));

  const arms = ONLY ? [ONLY] : ["android", "ios"];
  for (const a of arms) {
    if (!PAGES[a]) {
      console.log(`::error::--only must be android or ios, got ${a}`);
      return 2;
    }
  }

  const workRoot = join(opt("--workdir", tmpdir()), `docs-examples-gate-${Date.now()}`);
  mkdirSync(workRoot, { recursive: true });
  console.log(`work tree: ${workRoot}`);
  const started = Date.now();
  let worst = 0;
  const perArm = {};
  const armOut = {};
  try {
    for (const a of arms) {
      ARM_TRANSCRIPT = "";
      const rc = a === "android" ? await buildAndroid(workRoot) : await buildIos(workRoot);
      armOut[a] = ARM_TRANSCRIPT;
      perArm[a] = rc;
      worst = Math.max(worst, rc === 2 ? 2 : rc);
      if (rc === 2) break; // infrastructure: stop, do not report a build verdict
    }
  } finally {
    if (KEEP) {
      console.log(`--keep: left ${workRoot} on disk`);
    } else {
      rmSync(workRoot, { recursive: true, force: true });
      console.log(`cleaned ${workRoot}${existsSync(workRoot) ? " FAILED" : ""}`);
    }
  }
  const mins = ((Date.now() - started) / 60000).toFixed(1);

  // ★THE CONTROL GRADES ITSELF. Under --mutate the page has been deliberately
  // broken, so the ONLY acceptable outcome is that the toolchain rejected it.
  if (MUTATE) {
    // ★EVERY arm must reject its mutant, not "at least one". Grading the worst
    // rc across arms would let a blind iOS control hide behind a firing Android
    // one — a single number standing in for two independent questions is how a
    // half-dead control reads as alive.
    const blind = arms.filter((a) => perArm[a] === 0);
    const unrun = arms.filter((a) => perArm[a] === undefined || perArm[a] === 2);
    if (blind.length) {
      console.log(`::error::THE CONTROL DID NOT FIRE on: ${blind.join(", ")}. A page with a renamed bitHuman API symbol BUILT anyway, so on that arm this gate is not compiling what it claims to compile and every green it has printed there is worthless.`);
      console.log(`CONTROL BLIND (exit 2) after ${mins} min`);
      return 2;
    }
    if (unrun.length) {
      console.log(`::error::the control could not be RUN on: ${unrun.join(", ")} — cannot-measure is not the same as the control firing`);
      console.log(`INFRASTRUCTURE (exit 2) after ${mins} min`);
      return 2;
    }
    // ★AND IT MUST HAVE FAILED FOR *MY* REASON. A rejection that never names
    // the mutated symbol is a build that died before it compiled anything, and
    // grading it as FIRED is how this control certified a blind arm for eight
    // days: the iOS placeholder made every run die in a preBuildScripts phase,
    // `perArm.ios === 1` every Sunday, and "CONTROL FIRED on android + ios"
    // was printed over a Swift compiler that was never invoked.
    const wrongReason = arms.filter(
      (a) => !(armOut[a] || "").includes(MUTATIONS[a].token));
    if (wrongReason.length) {
      for (const a of wrongReason) {
        console.log(`::error::[${a}] THE CONTROL FIRED FOR THE WRONG REASON: the build failed without ever naming ${JSON.stringify(MUTATIONS[a].token)}, so the mutated source was never compiled and this arm certifies nothing. Read the transcript for what actually stopped it.`);
      }
      console.log(`CONTROL BLIND (exit 2) after ${mins} min`);
      return 2;
    }
    console.log(`CONTROL FIRED on ${arms.join(" + ")} in ${mins} min — every mutated page was REJECTED by its toolchain, so this gate really is compiling the published code`);
    return 0;
  }

  console.log(worst === 0 ? `ALL GREEN in ${mins} min` : worst === 2 ? `INFRASTRUCTURE (exit 2) after ${mins} min` : `RED (exit 1) after ${mins} min`);
  return worst;
}

main().then((rc) => process.exit(rc));
