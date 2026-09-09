#!/usr/bin/env node
// EVERY DEPENDENCY THIS SITE TELLS A DEVELOPER TO TYPE MUST EXIST AT THE
// REGISTRY THAT SERVES IT.
//
// WHY THIS EXISTS
// ---------------
// The two pages that end with a talking avatar on a real handset —
// examples/kotlin-android-hello.md and examples/swift-ios-expression2.md — are
// whole projects printed in full. Their FIRST executable line is a dependency
// coordinate, and if that coordinate does not resolve the reader never reaches
// any other line on the page. Nothing in this repo graded those coordinates.
// Every other checker here reads only bytes that are already in the tree:
// check-internal-links resolves /routes, check-kotlin-buildconfig resolves a
// constant against the same page, check-model-enum-examples resolves a model
// name against a spec in this repo. A version number is the one thing on these
// pages whose truth lives in ANOTHER SYSTEM, and no gate went and asked it.
//
// THE TWO LIVE WAYS THIS GOES WRONG, both of which are a stopped build:
//
//  1. ANDROID — A VERSION THAT WAS UPLOADED BUT NEVER PRESSED. On 2026-09-09
//     `ai.bithuman:expression2-android:0.4.0` is uploaded to the Central Portal
//     and VALIDATED, deployment 8990e3f3-b795-4047-899a-f8437d22fde3 — and NOT
//     RELEASED. It resolves for nobody. It is exactly one click away from
//     existing, it is the obvious number to write on a page, and the docs
//     correctly still say `0.3.1`. The distance between a staged version and a
//     published one is invisible in a diff and total for the reader: Gradle
//     answers `Could not find ai.bithuman:expression2-android:0.4.0`.
//     Maven Central is immutable, so this rule is safe for history — every
//     version that ever shipped still resolves, including the `0.2.0` in the
//     changelog. Only a version that was NEVER published can fail here.
//
//  2. APPLE — A PRODUCT THAT DOES NOT EXIST, WHICH `resolve` REPORTS AS FINE.
//     `swift package resolve` exits 0 against a manifest naming a product the
//     package does not vend; the error only lands on `swift build`. The tap
//     publishes four library products (bitHumanKit, Expression2, Essence2,
//     BithumanEngineProtocol) and the names a reader would guess — `Expression`
//     and `Bithuman` — are NOT among them; sdk/swift.md documents both guesses
//     failing with `product '…' not found in package 'homebrew-bithuman'`. A
//     page that told a reader to attach one of those would look correct, pass
//     every check in this repo, survive the reader's first command, and fail on
//     their build. There is no Xcode in this CI and there never will be, so the
//     manifest is asked directly instead.
//
// WHAT IT CHECKS, over src/content and src/pages:
//   R1  Gradle    every `implementation("ai.bithuman:<artifact>:<version>")` —
//                 <version> must appear in that artifact's maven-metadata.xml
//                 on Maven Central.
//   R2  SwiftPM   every typed dependency on the tap, in a Swift manifest
//                 (`.package(url: "…homebrew-bithuman…", from: "X")`) or an
//                 XcodeGen spec (`url: …homebrew-bithuman.git` + `from: X`) —
//                 tag `vX` must exist on the tap.
//   R3  SwiftPM   every product a page tells the reader to ATTACH
//                 (`.product(name: "P", package: "homebrew-bithuman")`, or a
//                 `product: P` under an XcodeGen dependency on the tap package)
//                 — P must be a `.library(name: "P")` in the tap's Package.swift
//                 AT THE TAG SwiftPM WOULD ACTUALLY RESOLVE for that `from:`,
//                 which is the highest tag sharing its major version.
//
// WHAT IT DELIBERATELY DOES NOT GRADE, and why the discriminator is the typed
// form and not the string: this site quotes coordinates that are SUPPOSED not to
// resolve — `ai.bithuman:expression2-android:9.9.9` is a stated negative control
// in sdk/android.md, `Could not find ai.bithuman:expression2-android:0.2.0.` is
// a pasted Gradle failure in sdk/android-verify.md, and `from: "0.8.1"` in
// sdk/swift.md is a documented resolution failure. None of those is written in
// the form a developer copies into a build file. Grading `implementation(...)`,
// `.package(url:…)`, `.product(name:…)` and the XcodeGen keys grades exactly the
// text that becomes a build, and leaves prose about failure free to describe it.
//
// NON-VACUITY. Each rule asserts it found at least one subject. If a regex here
// stops matching — a fence is reformatted, a page is renamed, the corpus roots
// move — the run fails instead of printing a green over an empty set. That is
// the failure mode a checker of this shape actually has.
//
// NETWORK. The registries are the subject; they are not optional. An
// unreachable registry exits 2 (infrastructure), distinct from exit 1 (a real
// disagreement), so a network flake can never be read as a pass.
//
// `--selftest` runs every rule against fixtures with a STUB registry whose
// contents are known, and REQUIRES each defect arm to fire and each good arm to
// stay silent. It needs no network, so the instrument is proven on every run
// including the ones where the network is what broke.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CORPUS_ROOTS = ["src/content", "src/pages"];
const TAP = "bithuman-product/homebrew-bithuman";
const TAP_URL = `https://github.com/${TAP}.git`;

/* ------------------------------------------------------------------ corpus */

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(md|mdx|astro|ts|js|json|yaml|yml)$/.test(name)) out.push(p);
  }
  return out;
}

function corpus() {
  const files = [];
  for (const r of CORPUS_ROOTS) {
    const abs = join(ROOT, r);
    let st;
    try {
      st = statSync(abs);
    } catch {
      console.log(`::error::corpus root ${r} does not exist — this gate is grading nothing`);
      process.exit(1);
    }
    if (!st.isDirectory()) {
      console.log(`::error::corpus root ${r} is not a directory`);
      process.exit(1);
    }
    const found = walk(abs);
    if (found.length === 0) {
      console.log(`::error::corpus root ${r} contributed no files — the corpus has silently shrunk`);
      process.exit(1);
    }
    files.push(...found);
  }
  return files;
}

/* ------------------------------------------------------------- extraction */

/** R1 — Gradle coordinates written in the form a developer copies. */
export function gradleCoordinates(text) {
  const out = [];
  // Kotlin DSL  implementation("g:a:v")   and Groovy  implementation 'g:a:v'
  const re = /\bimplementation\s*(?:\(\s*)?["']ai\.bithuman:([A-Za-z0-9._-]+):([0-9][A-Za-z0-9._-]*?)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ artifact: m[1], version: m[2], line: lineOf(text, m.index) });
  }
  return out;
}

/** R2 — versions pinned against the tap, in either manifest dialect. */
export function tapVersions(text) {
  const out = [];
  // Swift manifest: .package(url: "…homebrew-bithuman[.git]" … from: "X")
  // `from:` may sit on a following line, so take a short window after the url.
  const swiftRe = /\.package\s*\(\s*url:\s*["']https:\/\/github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?["']/g;
  let m;
  while ((m = swiftRe.exec(text)) !== null) {
    const window = text.slice(m.index, m.index + 400);
    const v = /\b(?:from|exact)\s*:\s*["']([0-9][0-9A-Za-z.\-]*)["']/.exec(window);
    if (v) out.push({ version: v[1], dialect: "swiftpm", line: lineOf(text, m.index) });
  }
  // XcodeGen: url: https://…homebrew-bithuman.git  /  from: X   (yaml, unquoted)
  const yamlRe = /^[ \t]*url:\s*https:\/\/github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?[ \t]*$/gm;
  while ((m = yamlRe.exec(text)) !== null) {
    const window = text.slice(m.index, m.index + 300);
    const v = /^[ \t]*(?:from|exactVersion|version)\s*:\s*["']?([0-9][0-9A-Za-z.\-]*?)["']?[ \t]*$/m.exec(window);
    if (v) out.push({ version: v[1], dialect: "xcodegen", line: lineOf(text, m.index) });
  }
  return out;
}

/** R3 — products a page tells the reader to ATTACH to a target. */
export function tapProducts(text) {
  const out = [];
  const swiftRe = /\.product\s*\(\s*name:\s*["']([A-Za-z0-9_]+)["']\s*,\s*package:\s*["']homebrew-bithuman["']\s*\)/g;
  let m;
  while ((m = swiftRe.exec(text)) !== null) {
    out.push({ product: m[1], dialect: "swiftpm", line: lineOf(text, m.index) });
  }
  // XcodeGen: the package KEY that maps to the tap url, then every
  //   - package: <key>
  //     product: <P>
  // The key is found by walking BACK from the url line to the nearest preceding
  // mapping key indented LESS than it. A single regex reaching forward from a
  // key cannot do this: `packages:` also precedes the url, and matches first,
  // which is the bug this gate's own selftest caught before it ever ran live.
  const keys = new Set();
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const u = /^([ \t]*)url:[ \t]*https:\/\/github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?[ \t]*$/.exec(
      lines[i],
    );
    if (!u) continue;
    const urlIndent = u[1].length;
    for (let j = i - 1; j >= 0; j--) {
      const k = /^([ \t]*)([A-Za-z0-9_.-]+):[ \t]*$/.exec(lines[j]);
      if (!k) continue;
      if (k[1].length < urlIndent) {
        keys.add(k[2]);
        break;
      }
    }
  }
  for (const key of keys) {
    const depRe = new RegExp(
      `^[ \\t]*-[ \\t]*package:[ \\t]*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[ \\t]*\\n[ \\t]*product:[ \\t]*["']?([A-Za-z0-9_]+)["']?[ \\t]*$`,
      "gm",
    );
    let d;
    while ((d = depRe.exec(text)) !== null) {
      out.push({ product: d[1], dialect: "xcodegen", line: lineOf(text, d.index) });
    }
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/* -------------------------------------------------------------- registries */

class RegistryUnreachable extends Error {}

const liveRegistry = {
  async mavenVersions(artifact) {
    const url = `https://repo1.maven.org/maven2/ai/bithuman/${artifact}/maven-metadata.xml`;
    let res;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch (e) {
      throw new RegistryUnreachable(`${url}: ${e.message}`);
    }
    if (res.status === 404) return []; // artifact does not exist at all
    if (!res.ok) throw new RegistryUnreachable(`${url}: HTTP ${res.status}`);
    const xml = await res.text();
    return [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1].trim());
  },

  async tapTags() {
    let out;
    try {
      out = execFileSync("git", ["ls-remote", "--tags", TAP_URL], {
        encoding: "utf8",
        timeout: 120000,
      });
    } catch (e) {
      throw new RegistryUnreachable(`git ls-remote ${TAP_URL}: ${e.message}`);
    }
    const tags = out
      .split("\n")
      .map((l) => l.split("\t")[1])
      .filter(Boolean)
      .filter((r) => r.startsWith("refs/tags/") && !r.endsWith("^{}"))
      .map((r) => r.slice("refs/tags/".length));
    if (tags.length === 0) throw new RegistryUnreachable(`git ls-remote ${TAP_URL}: no tags returned`);
    return tags;
  },

  async tapProductsAt(tag) {
    const url = `https://raw.githubusercontent.com/${TAP}/${tag}/Package.swift`;
    let res;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch (e) {
      throw new RegistryUnreachable(`${url}: ${e.message}`);
    }
    if (!res.ok) throw new RegistryUnreachable(`${url}: HTTP ${res.status}`);
    const manifest = await res.text();
    const products = [...manifest.matchAll(/\.library\s*\(\s*name:\s*["']([A-Za-z0-9_]+)["']/g)].map(
      (m) => m[1],
    );
    if (products.length === 0) {
      throw new RegistryUnreachable(`${url}: parsed zero library products — the manifest shape changed`);
    }
    return products;
  },
};

/** The tag SwiftPM resolves for `from: X` — highest tag with the same major. */
export function resolvesTo(from, tags) {
  const semver = (s) => s.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const [fMaj] = semver(from);
  const cmp = (a, b) => {
    const A = semver(a), B = semver(b);
    for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0);
    return 0;
  };
  const candidates = tags
    .filter((t) => /^v?\d+\.\d+(\.\d+)?$/.test(t))
    .filter((t) => semver(t)[0] === fMaj)
    .filter((t) => cmp(t, from) >= 0);
  if (candidates.length === 0) return null;
  return candidates.sort(cmp).at(-1);
}

/** Newest published tag by SEMVER, not lexicographically: v2.9.0 sorts after
 *  v2.11.2 as a string, which would print a false "newest" in the error. */
export function newestTag(tags) {
  const semver = (s) => s.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const cmp = (a, b) => {
    const A = semver(a), B = semver(b);
    for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0);
    return 0;
  };
  const v = tags.filter((t) => /^v?\d+\.\d+(\.\d+)?$/.test(t)).sort(cmp);
  return v.at(-1) ?? null;
}

/* ------------------------------------------------------------------- grade */

export async function grade(files, registry) {
  const failures = [];
  const seen = { maven: 0, tapVersion: 0, tapProduct: 0 };

  const mavenWanted = new Map(); // artifact -> [{version, where}]
  const versionWanted = [];
  const productWanted = [];

  for (const { path, text } of files) {
    for (const c of gradleCoordinates(text)) {
      seen.maven++;
      if (!mavenWanted.has(c.artifact)) mavenWanted.set(c.artifact, []);
      mavenWanted.get(c.artifact).push({ ...c, path });
    }
    for (const v of tapVersions(text)) {
      seen.tapVersion++;
      versionWanted.push({ ...v, path });
    }
    for (const p of tapProducts(text)) {
      seen.tapProduct++;
      productWanted.push({ ...p, path });
    }
  }

  // R1 — Maven Central
  for (const [artifact, uses] of [...mavenWanted].sort()) {
    const published = await registry.mavenVersions(artifact);
    for (const u of uses) {
      if (!published.includes(u.version)) {
        failures.push({
          path: u.path,
          line: u.line,
          msg:
            `implementation("ai.bithuman:${artifact}:${u.version}") names a version Maven Central ` +
            `does not serve. Published: ${published.length ? published.join(", ") : "(none — no such artifact)"}. ` +
            `A reader who copies this line gets "Could not find ai.bithuman:${artifact}:${u.version}".`,
        });
      }
    }
  }

  // R2/R3 — the tap
  if (versionWanted.length || productWanted.length) {
    const tags = await registry.tapTags();
    for (const v of versionWanted) {
      const resolved = resolvesTo(v.version, tags);
      if (!tags.includes(`v${v.version}`) && !tags.includes(v.version)) {
        failures.push({
          path: v.path,
          line: v.line,
          msg:
            `pins the ${TAP} package at ${v.version} (${v.dialect}), but that tag does not exist. ` +
            `Newest published tag: ${newestTag(tags) ?? "(none)"}. ` +
            `SwiftPM answers with no versions matching the requirement.`,
        });
      } else if (resolved === null) {
        failures.push({
          path: v.path,
          line: v.line,
          msg: `pins the ${TAP} package at ${v.version} (${v.dialect}), which resolves to no tag.`,
        });
      }
    }

    // Products are graded at the tag the pages actually resolve to. When the
    // pages pin more than one, grade every distinct resolved tag: a product must
    // exist at each of them or one of those pages is broken.
    const resolvedTags = [
      ...new Set(versionWanted.map((v) => resolvesTo(v.version, tags)).filter(Boolean)),
    ];
    if (productWanted.length && resolvedTags.length === 0) {
      failures.push({
        path: productWanted[0].path,
        line: productWanted[0].line,
        msg:
          `names ${TAP} products but no page in the corpus pins a resolvable version of that ` +
          `package — the product names cannot be graded against any manifest.`,
      });
    }
    for (const tag of resolvedTags) {
      const products = await registry.tapProductsAt(tag);
      for (const p of productWanted) {
        if (!products.includes(p.product)) {
          failures.push({
            path: p.path,
            line: p.line,
            msg:
              `attaches the product "${p.product}" from ${TAP} (${p.dialect}), which ${tag} does not ` +
              `vend. Published products at ${tag}: ${products.join(", ")}. ` +
              `\`swift package resolve\` exits 0 on this and \`swift build\` fails with ` +
              `"product '${p.product}' not found in package 'homebrew-bithuman'".`,
          });
        }
      }
    }
  }

  return { failures, seen };
}

/* ---------------------------------------------------------------- selftest */

const FIX_GOOD_GRADLE = 'x\n```kotlin\nimplementation("ai.bithuman:expression2-android:0.3.1")\n```\n';
const FIX_BAD_GRADLE = 'x\n```kotlin\nimplementation("ai.bithuman:expression2-android:0.4.0")\n```\n';
const FIX_CONTROL_PROSE =
  "The probe discriminates: `ai.bithuman:expression2-android:9.9.9` returned 404, and\n" +
  "Gradle printed `Could not find ai.bithuman:expression2-android:0.2.0.`\n";
const FIX_GOOD_SWIFT =
  '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0"),\n' +
  '.product(name: "Expression2", package: "homebrew-bithuman")\n```\n';
const FIX_BAD_SWIFT_TAG =
  '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.99.0"),\n```\n';
const FIX_BAD_SWIFT_PRODUCT =
  '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0"),\n' +
  '.product(name: "Expression", package: "homebrew-bithuman")\n```\n';
const FIX_GOOD_XCODEGEN =
  "```yaml\npackages:\n  bithuman:\n    url: https://github.com/bithuman-product/homebrew-bithuman.git\n" +
  "    from: 2.11.0\ntargets:\n  App:\n    dependencies:\n      - package: bithuman\n        product: Expression2\n```\n";
const FIX_BAD_XCODEGEN_PRODUCT =
  "```yaml\npackages:\n  bithuman:\n    url: https://github.com/bithuman-product/homebrew-bithuman.git\n" +
  "    from: 2.11.0\ntargets:\n  App:\n    dependencies:\n      - package: bithuman\n        product: Bithuman\n```\n";
const FIX_IRRELEVANT = "This page has no dependency coordinate at all.\n";

const STUB = {
  async mavenVersions(artifact) {
    const t = {
      "expression2-android": ["0.3.0", "0.3.1"],
      "essence2-android": ["0.2.0", "0.3.0", "0.4.0", "0.5.0", "0.5.1"],
      sdk: ["2.3.5", "2.3.6"],
    };
    return t[artifact] ?? [];
  },
  async tapTags() {
    return ["v2.9.0", "v2.10.0", "v2.11.0", "v2.11.1", "v2.11.2"];
  },
  async tapProductsAt() {
    return ["bitHumanKit", "BithumanEngineProtocol", "Expression2", "Essence2"];
  },
};

if (process.argv.includes("--selftest")) {
  const arms = [
    ["bad: a Gradle version never pressed (0.4.0)", FIX_BAD_GRADLE, true],
    ["bad: a tap tag that does not exist", FIX_BAD_SWIFT_TAG, true],
    ["bad: a SwiftPM product the tap does not vend", FIX_BAD_SWIFT_PRODUCT, true],
    ["bad: an XcodeGen product the tap does not vend", FIX_BAD_XCODEGEN_PRODUCT, true],
    ["good: the coordinate on the Android example", FIX_GOOD_GRADLE, false],
    ["good: the Swift manifest the SDK page prints", FIX_GOOD_SWIFT, false],
    ["good: the XcodeGen spec the iOS example prints", FIX_GOOD_XCODEGEN, false],
    ["control: a quoted failure transcript is not a typed coordinate", FIX_CONTROL_PROSE, false],
    ["control: a page with no coordinate at all", FIX_IRRELEVANT, false],
  ];
  let bad = 0;
  for (const [name, text, mustFire] of arms) {
    const { failures } = await grade([{ path: "fixture.md", text }], STUB);
    const fired = failures.length > 0;
    const ok = fired === mustFire;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(58)} fired=${fired} expected=${mustFire}`);
  }
  // The extractors must also actually see the real pages, or every arm above is
  // a statement about fixtures and nothing else.
  const real = corpus().map((p) => ({ path: p, text: readFileSync(p, "utf8") }));
  const counts = real.reduce(
    (a, f) => ({
      maven: a.maven + gradleCoordinates(f.text).length,
      ver: a.ver + tapVersions(f.text).length,
      prod: a.prod + tapProducts(f.text).length,
    }),
    { maven: 0, ver: 0, prod: 0 },
  );
  for (const [rule, n] of [["R1 gradle", counts.maven], ["R2 tap version", counts.ver], ["R3 tap product", counts.prod]]) {
    const ok = n > 0;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${(rule + " finds subjects in the real corpus").padEnd(58)} n=${n}`);
  }
  console.log(
    bad === 0
      ? "check-dependency-coordinates --selftest: OK — 4/4 defect arms fire, 5/5 good arms stay silent, all 3 rules have real subjects."
      : `check-dependency-coordinates --selftest: ${bad} arm(s) wrong`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/* -------------------------------------------------------------------- main */

const files = corpus().map((p) => ({ path: p, text: readFileSync(p, "utf8") }));

let result;
try {
  result = await grade(files, liveRegistry);
} catch (e) {
  if (e instanceof RegistryUnreachable) {
    console.log(`::error::registry unreachable — ${e.message}`);
    console.log(
      "check-dependency-coordinates: COULD NOT GRADE. This is exit 2 (infrastructure), not a pass.",
    );
    process.exit(2);
  }
  throw e;
}

const { failures, seen } = result;

for (const [rule, n] of [
  ["R1 (Gradle coordinates)", seen.maven],
  ["R2 (tap versions)", seen.tapVersion],
  ["R3 (tap products)", seen.tapProduct],
]) {
  if (n === 0) {
    console.log(
      `::error::${rule} matched nothing in ${CORPUS_ROOTS.join(" + ")}. This site has always carried ` +
        `such a coordinate, so a zero here means the extractor stopped seeing them, not that they are gone.`,
    );
    process.exit(1);
  }
}

if (failures.length) {
  console.log(`\nFound ${failures.length} dependency coordinate(s) that do not resolve:\n`);
  for (const f of failures) {
    const rel = relative(ROOT, f.path);
    console.log(`::error file=${rel},line=${f.line}::${f.msg}`);
    console.log(`  ${rel}:${f.line}\n      ${f.msg}\n`);
  }
  console.log(
    "Fix: publish the version, or write the version that is published. A staged " +
      "Central Portal deployment is not a published one.",
  );
  process.exit(1);
}

console.log(
  `check-dependency-coordinates: OK — ${seen.maven} Gradle coordinate(s) resolve on Maven Central, ` +
    `${seen.tapVersion} tap pin(s) name a tag that exists, and ${seen.tapProduct} attached SwiftPM ` +
    `product(s) are vended by the manifest at the tag those pins resolve to.`,
);
