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
//     Maven Central does not allow deletion, so on Central a version that was
//     released stays released — the `0.2.0` in the changelog still resolves.
//     That is a property of Central, NOT a property this rule may assume: the
//     rule asks the registry every run and believes the answer. Note the one
//     hole even Central has — `ai.bithuman:essence2-android:0.5.4` is absent
//     from Central today while 0.5.3 and 0.5.5 are present, because a staged
//     deployment that is never released never becomes immutable in the first
//     place. "It shipped" is our record; "it resolves" is the registry's, and
//     only the second one is what a reader's build gets.
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
//   R1  Gradle    every `implementation("<group>:<artifact>:<version>")` —
//                 <version> must appear in that coordinate's maven-metadata.xml
//                 on Maven Central. EVERY group, not only ours: see the note on
//                 the extractor for what that widening was measured to add.
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
//   R5  SwiftPM   every page that attaches the `Essence2` product must pin the
//                 tap at a FLOOR whose own tag already carries
//                 `essence2-v1.9.0` or newer. R2 grades the tag SwiftPM would
//                 resolve TODAY; this grades the tag a reader can be LEFT ON.
//   R4  PyPI      every `pip install <req>` a page prints in COPYABLE form —
//                 the distribution must exist on PyPI, every extra it names in
//                 `<dist>[a,b]` must be declared by the published wheel, and a
//                 version specifier must be satisfiable by something published.
//
//  3. PYTHON — THE ONE REGISTRY ON THE SELF-HOSTING PATH THAT NOTHING ASKED.
//     R1-R3 were written for the two handset example pages, so Maven Central
//     and the Swift tap got graded and PyPI did not. That left the Python
//     wheel — the coordinate on `guides/self-host-local` and `sdk/python`, the
//     one a Linux or macOS self-hoster actually types — as the only dependency
//     on this site whose truth lives in another system and whose truth nobody
//     checked. Measured 2026-09-13: the platform table on
//     guides/self-host-local.md named `bithuman` 3.1.3 while PyPI had served
//     3.1.4 since 05:12Z that morning, and 3.1.3 is specifically the wheel
//     WITHOUT the short-window audio frontend — so a reader who pinned the
//     documented version got the slow legacy path and nothing said a word.
//     Extras are the sharper half: `pip install "bithuman[offline]"` with an
//     extra the wheel does not declare does NOT fail. pip emits a warning and
//     installs the BASE package, so the reader gets a successful install, an
//     import that works, and a render that cannot find its engine.
//
//     ★PYPI IS NOT IMMUTABLE AND THIS RULE MUST NOT ASSUME IT IS. An earlier
//     version of this header argued that "PyPI forbids re-uploading a version,
//     so every version that ever shipped still resolves and the changelog's
//     history is safe." The first clause is true and the conclusion does not
//     follow: re-upload is forbidden, DELETION IS NOT. On 2026-09-15 the owner
//     deleted `bithuman` 2.9.0 and 3.1.3-3.1.8, and deleted the projects
//     `bithuman-cli` and `bithuman-mcp` outright — `/simple/<name>/` went 404,
//     which is stronger than a yank and unrecoverable, because a deleted
//     version number is burned on PyPI forever. So the gate VERIFIES; it never
//     infers existence from immutability. Every version this file grades is
//     checked against the live index on the run that grades it, and a version
//     that resolved yesterday and not today fails today. Proven by mutation on
//     2026-09-15: a page citing `pip install bithuman==3.1.4` — a version that
//     existed that morning and was deleted that evening — turns this gate red.
//
//     A yanked version still resolves for an exact pin, which is why yanking
//     is not graded as absence. A DELETED one resolves for nothing, which is
//     why deletion is graded exactly like a version that never existed: the
//     registry is asked, and its answer is the verdict.
//
//     THE RESIDUAL GAP, STATED RATHER THAN PAPERED OVER: this rule grades the
//     COPYABLE form only, so a version named in prose — the changelog's own
//     history, the version stamps in sdk/performance.md — is not graded, and
//     after a deletion some of those now name versions that no longer resolve.
//     That exemption used to be justified by immutability. It no longer is, so
//     it is now a deliberate choice with a named cost: a changelog is a record
//     of what happened, and a record that must be rewritten every time someone
//     deletes a version is not a record. The cost is that prose can go stale
//     silently. Deliberately NOT fixed by adding a second rule that greps
//     prose for version-shaped strings — that would redden the changelog on
//     every deletion and grade the one text on this site that is supposed to
//     describe the past. If this gap must close, close it by not deleting
//     published versions.
//
// ─────────────────────────────────────────────────────────────────────────────
// PUBLISHED-COORDINATE POLICY (owner ruling, 2026-09-15). This gate enforces
// the last line of it; the rest is written here because this is the file that
// reasons about what a registry does and does not guarantee.
//
//   ONE COORDINATE PER REGISTRY, and the docs name that one way:
//     PyPI            `bithuman` — the Python library, and NOTHING else.
//                     Any other bitHuman-named PyPI package is not ours.
//                     `bithuman-cli` and `bithuman-mcp` were deleted 2026-09-15;
//                     the names were deliberately NOT reserved, so anyone may
//                     now claim them. The CLI ships from install.bithuman.ai
//                     and the Homebrew tap; MCP ships inside it as `bithuman mcp`.
//     Maven Central   `ai.bithuman:essence2-android`, `:expression2-android`.
//     Homebrew tap    `bithuman-product/homebrew-bithuman`, formula `bithuman-cli`.
//     SwiftPM         the same tap repo; consumers land on the highest BARE
//                     semver tag, so a `cli-v*` or `essence2-v*` tag is
//                     invisible to them and a bare `v*` tag is an SDK release
//                     whether or not anyone meant it to be.
//     npm, pub.dev    NOTHING IS PUBLISHED. Do not cite a coordinate there.
//
//   YANK vs DELETE — these are different tools and the difference is the whole
//   point. YANK means "stop new installs from choosing it": the version still
//   resolves for anyone who pinned it exactly, so existing builds keep working
//   and nobody is broken. It is reversible. DELETE means "this must never be
//   installable again": every pin to it fails hard, the version number is
//   burned forever, and it CANNOT be undone. Yank is the default; deletion
//   needs a reason that survives being told to the customer whose build it
//   breaks.
//
//   BEFORE ANY DELETION, check what pins the version — our docs, our examples,
//   and our dependents — and repoint them FIRST. On 2026-09-15 the order was
//   reversed and the docs lane had to repoint six pages after the fact, while
//   this gate sat red on a `pip install bithuman-mcp` line whose distribution
//   had ceased to exist.
// ─────────────────────────────────────────────────────────────────────────────
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

/** R1 — Gradle coordinates written in the form a developer copies.
 *
 * ★WIDENED 2026-09-21 FROM `ai.bithuman` TO EVERY GROUP. The law at the top of
 * this file is "every dependency this site tells a developer to type must exist
 * at the registry that serves it", and for three weeks the rule under it read
 * only our own group — so the two lines on sdk/android.md that a reader is told
 * to paste beside ours,
 *
 *     implementation("com.qualcomm.qti:qnn-litert-delegate:2.49.0")
 *     implementation("com.qualcomm.qti:qnn-runtime:2.49.0")
 *
 * were graded by nothing. They are not decoration: without them the Hexagon
 * delegate is absent and the avatar renders on the CPU, and a reader whose build
 * stops at `Could not find com.qualcomm.qti:…` never reaches a frame either way.
 * A coordinate a page prints is a coordinate a page owns, whoever publishes it —
 * and a third-party group is the one we are LEAST able to notice moving.
 *
 * Measured when widened: 4 new subjects, both artifacts present at 2.49.0 on
 * Central. The group is now part of the key, so two groups publishing the same
 * artifact name can never be conflated.
 */
export function gradleCoordinates(text) {
  const out = [];
  // Kotlin DSL  implementation("g:a:v")   and Groovy  implementation 'g:a:v'
  const re = /\bimplementation\s*(?:\(\s*)?["']([a-z][a-z0-9]*(?:\.[A-Za-z0-9_-]+)+):([A-Za-z0-9._-]+):([0-9][A-Za-z0-9._-]*?)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ group: m[1], artifact: m[2], version: m[3], line: lineOf(text, m.index) });
  }
  return out;
}

/** R4 — PyPI requirements written in the form a developer copies.
 *
 *  THE DISCRIMINATOR IS A CODE REGION, not the string `pip install`. This site
 *  writes that phrase in prose constantly ("`pip install bithuman` is the
 *  library, and the CLI comes from the universal installer"), and a sentence
 *  about installing is not a line anyone copies. Reading only fenced blocks and
 *  inline code spans is the same choice R1-R3 make by grading `implementation(`
 *  and `.product(name:` rather than every version-shaped string on the page.
 *  Measured on the real corpus: whole-file scanning produced 86 subjects across
 *  40 "distributions" including `and`, `for`, `then`, `GB` and `CUDA` — four of
 *  which exist on PyPI and would have graded green as a coincidence. Bounded to
 *  code regions and terminated at a backtick it finds 51 subjects across 11
 *  real distributions and nothing else.
 */
export function pypiRequirements(path, text) {
  const out = [];
  for (const region of codeRegions(path, text)) {
    const re = /\bpip[0-9.]*\s+install\s+([^\n]*)/g;
    let m;
    while ((m = re.exec(region.text)) !== null) {
      // Stop at a shell comment, a chained command, or the backtick that closes
      // a code span embedded in a JS template literal (src/pages/*.ts writes
      // its spans as \`…\`, and the prose after one is not the command).
      const cmd = m[1].split(/\s#|&&|\|\||[;|`]/)[0];
      const abs = region.offset + m.index;
      const line = lineOf(text, abs);
      let skipNext = false;
      for (const t of shTokens(cmd)) {
        if (skipNext) { skipNext = false; continue; }
        if (t.startsWith("-")) { if (PIP_VALUE_FLAGS.has(t)) skipNext = true; continue; }
        // a path, a URL, a VCS spec or a shell variable is not a named release
        if (t.includes("/") || t.includes("::") || t.startsWith("$") || t.startsWith(".")) continue;
        const g = PEP508.exec(t);
        if (!g) continue;
        out.push({
          dist: g[1],
          extras: (g[2] || "").split(",").map((x) => x.trim()).filter(Boolean),
          spec: (g[3] || "").trim(),
          raw: t,
          line,
        });
      }
    }
  }
  return out;
}

/** pip flags that swallow the following token, so it is never a requirement. */
const PIP_VALUE_FLAGS = new Set([
  "--index-url", "--extra-index-url", "-i", "-r", "--requirement", "-c",
  "--constraint", "-f", "--find-links", "--target", "-t", "--proxy", "--cert",
  "--timeout", "--retries", "--upgrade-strategy", "--prefix", "--root", "--src",
  "--report", "--no-binary", "--only-binary",
]);

const PEP508 =
  /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[([^\]]*)\])?((?:[<>=!~]=?[0-9][^,\s]*)(?:\s*,\s*[<>=!~]=?[0-9][^,\s]*)*)?$/;

/** Shell-ish tokenizer: the quotes around `"bithuman[offline]"` are shell
 *  syntax protecting the brackets, not part of the requirement. */
export function shTokens(s) {
  const out = [];
  let cur = "", q = null;
  for (const ch of s) {
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ""; } continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** The regions of a file a reader copies from. Markdown: fenced blocks and
 *  inline spans. Everything else (.astro/.ts/.js/.yml) is already code. */
export function codeRegions(path, text) {
  if (!/\.(md|mdx)$/.test(path)) return [{ text, offset: 0 }];
  const out = [];
  const masked = text.split("");
  const fence = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;
  let m;
  while ((m = fence.exec(text)) !== null) {
    out.push({ text: m[2], offset: m.index + m[0].indexOf(m[2], m[1].length) });
    for (let i = m.index; i < m.index + m[0].length; i++) masked[i] = " ";
  }
  const rest = masked.join("");
  const span = /`([^`\n]+)`/g;
  while ((m = span.exec(rest)) !== null) out.push({ text: m[1], offset: m.index + 1 });
  return out;
}

/** Is any published version acceptable to this specifier set? An `==` pin is
 *  graded as existence; a range is graded as satisfiable by something. */
export function specSatisfied(spec, versions) {
  if (!spec) return true;
  const rel = (v) => v.split(/[^0-9]+/).filter((x) => x !== "").map(Number);
  const cmp = (a, b) => {
    const A = rel(a), B = rel(b);
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      const d = (A[i] || 0) - (B[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  };
  const clauses = spec.split(",").map((c) => c.trim()).filter(Boolean);
  const ok = (v) =>
    clauses.every((c) => {
      const g = /^([<>=!~]=?)\s*(.+)$/.exec(c);
      if (!g) return true;
      const [, op, want] = g;
      switch (op) {
        case "==": return want.endsWith(".*") ? v.startsWith(want.slice(0, -1)) : cmp(v, want) === 0;
        case "!=": return cmp(v, want) !== 0;
        case ">=": return cmp(v, want) >= 0;
        case ">":  return cmp(v, want) > 0;
        case "<=": return cmp(v, want) <= 0;
        case "<":  return cmp(v, want) < 0;
        // ~=X.Y is >=X.Y within the same X; ~=X.Y.Z is >=X.Y.Z within X.Y.
        case "~=": {
          if (cmp(v, want) < 0) return false;
          const w = rel(want);
          const keep = Math.max(1, w.length - 1);
          return rel(v).slice(0, keep).join(".") === w.slice(0, keep).join(".");
        }
        default: return true;
      }
    });
  return versions.some(ok);
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
  async mavenVersions(coord) {
    const [group, artifact] = coord.split(":");
    const url = `https://repo1.maven.org/maven2/${group.replace(/\./g, "/")}/${artifact}/maven-metadata.xml`;
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

  async pypiProject(dist) {
    const url = `https://pypi.org/pypi/${encodeURIComponent(dist)}/json`;
    let res;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch (e) {
      throw new RegistryUnreachable(`${url}: ${e.message}`);
    }
    if (res.status === 404) return null; // no such distribution — a real answer
    if (!res.ok) throw new RegistryUnreachable(`${url}: HTTP ${res.status}`);
    const j = await res.json();
    // provides_extra is the declared list; older metadata only carries the
    // markers, so fall back to the `extra == "…"` markers in requires_dist.
    let extras = j.info?.provides_extra;
    if (!Array.isArray(extras) || extras.length === 0) {
      extras = [
        ...new Set(
          (j.info?.requires_dist || [])
            .map((r) => /extra\s*==\s*["']([^"']+)["']/.exec(r))
            .filter(Boolean)
            .map((m) => m[1]),
        ),
      ];
    }
    const versions = Object.keys(j.releases || {}).filter((v) => (j.releases[v] || []).length > 0);
    if (versions.length === 0) {
      throw new RegistryUnreachable(`${url}: parsed zero released versions — the API shape changed`);
    }
    return { latest: j.info?.version ?? null, extras, versions };
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

  // R5 — which essence-2 engine release a given tap tag pins. The manifest
  // declares it once, as `let essence2Tag = "essence2-vX.Y.Z"`, and every
  // essence-2 binaryTarget URL is built from it.
  async tapEssence2TagAt(tag) {
    const url = `https://raw.githubusercontent.com/${TAP}/${tag}/Package.swift`;
    let res;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch (e) {
      throw new RegistryUnreachable(`${url}: ${e.message}`);
    }
    if (!res.ok) throw new RegistryUnreachable(`${url}: HTTP ${res.status}`);
    const m = /^let\s+essence2Tag\s*=\s*["']([^"']+)["']/m.exec(await res.text());
    if (!m) {
      throw new RegistryUnreachable(
        `${url}: no \`let essence2Tag = "…"\` — the manifest shape changed, so R5 cannot grade`,
      );
    }
    return m[1];
  },
};

/* ------------------------------------------------------------------- R5 --
 * A `from:` FLOOR IS A PROMISE ABOUT THE OLDEST TAG A READER CAN BE LEFT ON,
 * AND FOR essence-2 THAT TAG IS A DIFFERENT ENGINE.
 *
 * R2 asks "does the tag this resolves to exist" and R3 asks "does it vend the
 * product" — both look at the tag SwiftPM picks on a FRESH resolve, which is
 * the newest 2.x. Neither is the tag a reader ends up on. `from:` is satisfied
 * by the floor itself, SwiftPM keeps whatever `Package.resolved` already holds,
 * and the tap's tags do not carry the engine — they PIN one, and the pin moved:
 *
 *     v2.11.0, v2.11.2 -> essence2-v1.4.0
 *     v2.12.1          -> essence2-v1.5.1
 *     v2.13.0          -> essence2-v1.6.0
 *     v2.13.8          -> essence2-v1.9.0
 *
 * Read out of each tag's own Package.swift on 2026-09-21. It matters because
 * the iPhone answer changed with the engine: on essence2-v1.5.x and older,
 * `be_essence2_create` returns 0 on an iPhone below a 16 Pro and the warm-up
 * then refuses by name ("unsupported hardware — iPhone15,4 detected"), leaving
 * the engine idle-only — the identity's motion plays and it never speaks, with
 * nothing thrown and nothing logged that a reader is looking at. The pages say
 * essence-2 has no iPhone model floor, and that sentence is only true from
 * essence2-v1.9.0.
 *
 * So a page carrying `from: "2.11.0"` beside an `Essence2` attach is GREEN on
 * R2 and R3 and still hands a reader a silent, unexplainable phone. This rule
 * grades the floor, not the resolution.
 */
const ESSENCE2_PRODUCT = "Essence2";
const ESSENCE2_FLOOR = "essence2-v1.9.0";

/** Compare two `essence2-vX.Y.Z` tags. Returns true when a >= b. */
export function engineAtLeast(a, b) {
  const n = (s) => (s ?? "").replace(/^essence2-v/, "").split(".").map((x) => parseInt(x, 10) || 0);
  const A = n(a), B = n(b);
  for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) > (B[i] || 0);
  return true;
}

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
  const seen = { maven: 0, tapVersion: 0, tapProduct: 0, pypi: 0, essence2Floor: 0 };

  const mavenWanted = new Map(); // "group:artifact" -> [{version, where}]
  const versionWanted = [];
  const productWanted = [];
  const pypiWanted = new Map(); // dist -> [{extras, spec, where}]

  for (const { path, text } of files) {
    for (const c of gradleCoordinates(text)) {
      seen.maven++;
      const coord = `${c.group}:${c.artifact}`;
      if (!mavenWanted.has(coord)) mavenWanted.set(coord, []);
      mavenWanted.get(coord).push({ ...c, path });
    }
    for (const v of tapVersions(text)) {
      seen.tapVersion++;
      versionWanted.push({ ...v, path });
    }
    for (const p of tapProducts(text)) {
      seen.tapProduct++;
      productWanted.push({ ...p, path });
    }
    for (const r of pypiRequirements(path, text)) {
      seen.pypi++;
      if (!pypiWanted.has(r.dist)) pypiWanted.set(r.dist, []);
      pypiWanted.get(r.dist).push({ ...r, path });
    }
  }

  // R1 — Maven Central
  for (const [coord, uses] of [...mavenWanted].sort()) {
    const published = await registry.mavenVersions(coord);
    for (const u of uses) {
      if (!published.includes(u.version)) {
        failures.push({
          path: u.path,
          line: u.line,
          msg:
            `implementation("${coord}:${u.version}") names a version Maven Central ` +
            `does not serve. Published: ${published.length ? published.join(", ") : "(none — no such artifact)"}. ` +
            `A reader who copies this line gets "Could not find ${coord}:${u.version}".`,
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

  // R5 — the essence-2 engine floor. Graded per PAGE: a pin is only a promise
  // about the engine on a page that also tells the reader to attach Essence2.
  if (versionWanted.length && productWanted.some((p) => p.product === ESSENCE2_PRODUCT)) {
    const tags = await registry.tapTags();
    const essence2Pages = new Set(
      productWanted.filter((p) => p.product === ESSENCE2_PRODUCT).map((p) => p.path),
    );
    for (const v of versionWanted) {
      if (!essence2Pages.has(v.path)) continue;
      // The floor tag itself, spelled the way the tap spells its tags. If it
      // does not exist R2 has already said so; do not say it twice.
      const floorTag = tags.includes(`v${v.version}`)
        ? `v${v.version}`
        : tags.includes(v.version)
          ? v.version
          : null;
      if (!floorTag) continue;
      seen.essence2Floor++;
      const engine = await registry.tapEssence2TagAt(floorTag);
      if (engineAtLeast(engine, ESSENCE2_FLOOR)) continue;
      failures.push({
        path: v.path,
        line: v.line,
        msg:
          `pins the ${TAP} package at ${v.version} (${v.dialect}) on a page that attaches ` +
          `${ESSENCE2_PRODUCT}, but ${floorTag} pins engine ${engine}, older than ${ESSENCE2_FLOOR}. ` +
          `\`from:\` is satisfied by the floor and SwiftPM keeps whatever Package.resolved already ` +
          `holds, so a reader can sit on ${engine} while the page promises ${ESSENCE2_FLOOR} ` +
          `behaviour: below 1.9.0 an iPhone under a 16 Pro warms up, refuses by name and stays ` +
          `idle-only — the face moves and never speaks, and nothing is thrown. ` +
          `Raise the floor to a tag that pins ${ESSENCE2_FLOOR} or newer.`,
      });
    }
  }

  // R4 — PyPI
  for (const [dist, uses] of [...pypiWanted].sort()) {
    const proj = await registry.pypiProject(dist);
    if (proj === null) {
      for (const u of uses) {
        failures.push({
          path: u.path,
          line: u.line,
          msg:
            `\`pip install ${u.raw}\` names the distribution "${dist}", which PyPI does not serve. ` +
            `A reader who copies this line gets "No matching distribution found for ${dist}".`,
        });
      }
      continue;
    }
    for (const u of uses) {
      const missing = u.extras.filter((e) => !proj.extras.includes(e));
      if (missing.length) {
        failures.push({
          path: u.path,
          line: u.line,
          msg:
            `\`pip install ${u.raw}\` asks for the extra${missing.length > 1 ? "s" : ""} ` +
            `${missing.map((e) => `"${e}"`).join(", ")}, which ${dist} ${proj.latest} does not declare. ` +
            `Declared: ${proj.extras.length ? proj.extras.join(", ") : "(none)"}. ` +
            `pip does NOT fail on this — it warns and installs the base package, so the reader ` +
            `gets a green install and a broken import.`,
        });
      }
      if (u.spec && !specSatisfied(u.spec, proj.versions)) {
        failures.push({
          path: u.path,
          line: u.line,
          msg:
            `\`pip install ${u.raw}\` names a version of ${dist} PyPI cannot satisfy. ` +
            `Newest published: ${proj.latest}. ` +
            `A reader who copies this line gets "No matching distribution found for ${u.raw}".`,
        });
      }
    }
  }

  return { failures, seen };
}

/* ---------------------------------------------------------------- selftest */

const FIX_GOOD_GRADLE = 'x\n```kotlin\nimplementation("ai.bithuman:expression2-android:0.3.1")\n```\n';
const FIX_BAD_GRADLE = 'x\n```kotlin\nimplementation("ai.bithuman:expression2-android:0.4.0")\n```\n';
// ★The widening of R1 off `ai.bithuman` is only real if a third-party group can
// turn this gate red. These two prove it: the stub publishes
// com.qualcomm.qti:qnn-runtime at 2.48.0 and 2.49.0 and nothing else.
const FIX_BAD_THIRD_PARTY_GRADLE =
  'x\n```kotlin\nimplementation("com.qualcomm.qti:qnn-runtime:9.9.9")\n```\n';
const FIX_GOOD_THIRD_PARTY_GRADLE =
  'x\n```kotlin\nimplementation("com.qualcomm.qti:qnn-runtime:2.49.0")\n```\n';
// A group the stub has never heard of must fail too — "no such artifact" is the
// same verdict as "no such version", and it is what a typo'd group looks like.
const FIX_BAD_UNKNOWN_GROUP_GRADLE =
  'x\n```kotlin\nimplementation("com.example.nope:widget:1.0.0")\n```\n';
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
const FIX_GOOD_PYPI = 'x\n```bash\npip install "bithuman[offline]"\n```\n';
const FIX_BAD_PYPI_EXTRA = 'x\n```bash\npip install "bithuman[nosuchextra]"\n```\n';
const FIX_BAD_PYPI_DIST = "x\n```bash\npip install bithuman-notapackage\n```\n";
const FIX_BAD_PYPI_VERSION = 'x\n```bash\npip install "bithuman>=99.0.0"\n```\n';
// The phrase in a SENTENCE is prose about installing, not a line to copy: this
// site writes exactly this and it must stay silent.
const FIX_CONTROL_PYPI_PROSE =
  "The Python library and the CLI are separate: pip install bithuman-notapackage is\n" +
  "not how you install the CLI and never should be.\n";
// A flag's value is not a requirement.
const FIX_CONTROL_PYPI_INDEX =
  "x\n```bash\npip install torch --index-url https://download.pytorch.org/whl/cpu\n```\n";

const FIX_IRRELEVANT = "This page has no dependency coordinate at all.\n";

// R5 — the floor a reader can be left on, beside an Essence2 attach.
const FIX_BAD_ESSENCE2_FLOOR =
  '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0"),\n' +
  '.product(name: "Essence2", package: "homebrew-bithuman")\n```\n';
const FIX_GOOD_ESSENCE2_FLOOR =
  '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.13.8"),\n' +
  '.product(name: "Essence2", package: "homebrew-bithuman")\n```\n';
const FIX_BAD_ESSENCE2_FLOOR_XCODEGEN =
  "```yaml\npackages:\n  bithuman:\n    url: https://github.com/bithuman-product/homebrew-bithuman.git\n" +
  "    from: 2.11.0\ntargets:\n  App:\n    dependencies:\n      - package: bithuman\n        product: Essence2\n```\n";
// The floor rule is essence-2's alone: Expression 2's engine tag has not moved
// under these pins, so the SAME low floor beside an Expression2 attach must
// stay silent. Without this arm R5 would read as "2.11.0 is banned".
const FIX_CONTROL_LOW_FLOOR_OTHER_PRODUCT =
  '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0"),\n' +
  '.product(name: "bitHumanKit", package: "homebrew-bithuman")\n```\n';

const STUB = {
  async mavenVersions(coord) {
    const t = {
      "ai.bithuman:expression2-android": ["0.3.0", "0.3.1"],
      "ai.bithuman:essence2-android": ["0.2.0", "0.3.0", "0.4.0", "0.5.0", "0.5.1"],
      "ai.bithuman:sdk": ["2.3.5", "2.3.6"],
      "com.qualcomm.qti:qnn-runtime": ["2.48.0", "2.49.0"],
    };
    return t[coord] ?? [];
  },
  async tapTags() {
    return ["v2.9.0", "v2.10.0", "v2.11.0", "v2.11.1", "v2.11.2", "v2.12.1", "v2.13.0", "v2.13.8"];
  },
  async tapProductsAt() {
    return ["bitHumanKit", "BithumanEngineProtocol", "Expression2", "Essence2"];
  },
  // The five tags below were read out of their own Package.swift on
  // 2026-09-21; the rest of this table is not claimed to be real, it is a
  // fixture floor so an unlisted tag cannot accidentally PASS the rule.
  async tapEssence2TagAt(tag) {
    return {
      "v2.11.0": "essence2-v1.4.0",
      "v2.11.2": "essence2-v1.4.0",
      "v2.12.1": "essence2-v1.5.1",
      "v2.13.0": "essence2-v1.6.0",
      "v2.13.8": "essence2-v1.9.0",
    }[tag] ?? "essence2-v1.0.0";
  },
  async pypiProject(dist) {
    const t = {
      bithuman: {
        latest: "3.1.4",
        extras: ["test", "offline", "tessera", "expression-2"],
        versions: ["2.10.0", "3.0.0", "3.1.2", "3.1.3", "3.1.4"],
      },
      torch: { latest: "2.6.0", extras: ["opt-einsum"], versions: ["2.5.1", "2.6.0"] },
    };
    return t[dist] ?? null;
  },
};

if (process.argv.includes("--selftest")) {
  const arms = [
    ["bad: a Gradle version never pressed (0.4.0)", FIX_BAD_GRADLE, true],
    ["bad: a THIRD-PARTY Gradle version Central does not serve", FIX_BAD_THIRD_PARTY_GRADLE, true],
    ["bad: a Gradle group Central has never heard of", FIX_BAD_UNKNOWN_GROUP_GRADLE, true],
    ["good: the third-party pair sdk/android.md prints", FIX_GOOD_THIRD_PARTY_GRADLE, false],
    ["bad: a tap tag that does not exist", FIX_BAD_SWIFT_TAG, true],
    ["bad: a SwiftPM product the tap does not vend", FIX_BAD_SWIFT_PRODUCT, true],
    ["bad: an XcodeGen product the tap does not vend", FIX_BAD_XCODEGEN_PRODUCT, true],
    ["good: the coordinate on the Android example", FIX_GOOD_GRADLE, false],
    ["good: the Swift manifest the SDK page prints", FIX_GOOD_SWIFT, false],
    ["good: the XcodeGen spec the iOS example prints", FIX_GOOD_XCODEGEN, false],
    ["control: a quoted failure transcript is not a typed coordinate", FIX_CONTROL_PROSE, false],
    ["control: a page with no coordinate at all", FIX_IRRELEVANT, false],
    ["bad: a PyPI extra the published wheel does not declare", FIX_BAD_PYPI_EXTRA, true],
    ["bad: a PyPI distribution that does not exist", FIX_BAD_PYPI_DIST, true],
    ["bad: a PyPI version nothing published satisfies", FIX_BAD_PYPI_VERSION, true],
    ["good: the extra the self-hosting page prints", FIX_GOOD_PYPI, false],
    ["control: `pip install` written in a sentence is not a copyable line", FIX_CONTROL_PYPI_PROSE, false],
    ["control: an --index-url value is not a requirement", FIX_CONTROL_PYPI_INDEX, false],
    ["bad: Essence2 attached on a from: 2.11.0 floor (engine 1.4.0)", FIX_BAD_ESSENCE2_FLOOR, true],
    ["bad: the same floor in an XcodeGen spec", FIX_BAD_ESSENCE2_FLOOR_XCODEGEN, true],
    ["good: Essence2 attached on a from: 2.13.8 floor (engine 1.9.0)", FIX_GOOD_ESSENCE2_FLOOR, false],
    ["control: the same low floor beside a non-Essence2 product", FIX_CONTROL_LOW_FLOOR_OTHER_PRODUCT, false],
  ];
  let bad = 0;
  for (const [name, text, mustFire] of arms) {
    const { failures } = await grade([{ path: "fixture.md", text }], STUB);
    const fired = failures.length > 0;
    const ok = fired === mustFire;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(58)} fired=${fired} expected=${mustFire}`);
  }

  // MUTATION ARM. Every "good" arm above is silence, and silence is also what a
  // dead rule produces. Re-grade the GOOD R5 fixture against a registry whose
  // only difference is that v2.13.8 pins the old engine: if R5 still says
  // nothing, its silence on the real corpus means nothing either.
  {
    const mutated = { ...STUB, async tapEssence2TagAt() { return "essence2-v1.4.0"; } };
    const { failures } = await grade([{ path: "fixture.md", text: FIX_GOOD_ESSENCE2_FLOOR }], mutated);
    const ok = failures.length > 0;
    if (!ok) bad++;
    console.log(
      `  ${ok ? "OK  " : "FAIL"}  ${"mutation: the good R5 arm fires when the engine pin moves back".padEnd(58)} fired=${failures.length > 0} expected=true`,
    );
  }
  // The extractors must also actually see the real pages, or every arm above is
  // a statement about fixtures and nothing else.
  const real = corpus().map((p) => ({ path: p, text: readFileSync(p, "utf8") }));
  const counts = real.reduce(
    (a, f) => ({
      maven: a.maven + gradleCoordinates(f.text).length,
      ver: a.ver + tapVersions(f.text).length,
      prod: a.prod + tapProducts(f.text).length,
      pypi: a.pypi + pypiRequirements(f.path, f.text).length,
    }),
    { maven: 0, ver: 0, prod: 0, pypi: 0 },
  );
  // R5's subjects are pages that BOTH pin the tap and attach Essence2 — the
  // intersection, because either alone is not a promise about the engine.
  const r5 = real.filter(
    (f) =>
      tapVersions(f.text).length > 0 &&
      tapProducts(f.text).some((p) => p.product === ESSENCE2_PRODUCT),
  ).length;
  for (const [rule, n] of [["R1 gradle", counts.maven], ["R2 tap version", counts.ver], ["R3 tap product", counts.prod], ["R4 pypi", counts.pypi], ["R5 essence-2 floor", r5]]) {
    const ok = n > 0;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${(rule + " finds subjects in the real corpus").padEnd(58)} n=${n}`);
  }
  console.log(
    bad === 0
      ? `check-dependency-coordinates --selftest: OK — ${arms.filter((a) => a[2]).length + 1}/` +
        `${arms.filter((a) => a[2]).length + 1} defect arms fire (one of them a mutation), ` +
        `${arms.filter((a) => !a[2]).length}/${arms.filter((a) => !a[2]).length} good arms stay silent, ` +
        `all 5 rules have real subjects.`
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
  ["R4 (PyPI requirements)", seen.pypi],
  ["R5 (essence-2 engine floor)", seen.essence2Floor],
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
    `${seen.tapVersion} tap pin(s) name a tag that exists, ${seen.tapProduct} attached SwiftPM ` +
    `product(s) are vended by the manifest at the tag those pins resolve to, ${seen.pypi} ` +
    `PyPI requirement(s) name a distribution, extras and a version PyPI actually serves, and ` +
    `${seen.essence2Floor} Essence2 page pin(s) have a FLOOR tag that already carries ` +
    `${ESSENCE2_FLOOR} or newer.`,
);
