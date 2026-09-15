#!/usr/bin/env node
// EVERY VERSION THIS SITE NAMES AS THE ONE TO USE MUST BE THE NEWEST ONE
// PUBLISHED.
//
// WHY THIS EXISTS
// ---------------
// check-dependency-coordinates.mjs asks whether a version EXISTS. That is the
// wrong question for the failure this site actually has. On 2026-09-13 every
// pin below existed, resolved and built, and every one of them sent a
// developer to an older, slower artifact than the one already published:
//
//   - `essence2-android:0.5.3` on four pages while Maven Central's <release>
//     was 0.5.5 — the version whose defaults carry the fast settings;
//   - `bithuman` 3.1.4 on four pages while PyPI served 3.1.5;
//   - the changelog's newest entry telling readers to install `cli-v2.6.13`
//     while `cli-v2.6.14` was published and was what Homebrew installed, and
//     the CLI page's sample `bithuman --version` output printing 2.6.13.
//
// Each went stale within an hour of its release and nothing noticed, because
// the text did not change — the REGISTRY did. So this check runs on a schedule
// as well as on every push: a page that was current when it merged is graded
// again when a new version is published.
//
// WHY A CHECK AND NOT ONE GENERATED SOURCE
// ----------------------------------------
// The version strings live in build lines, sample CLI output, prose, a table
// and a changelog, and other gates here read those as literal text (the
// coordinate gate resolves `implementation(...)` lines; the handset-example
// gate compiles the served code blocks). A template placeholder would blind
// them. And a generated source would still need something to notice that a
// registry moved. That thing is this check.
//
// WHAT IT GRADES, over src/content and src/pages:
//   V1  Gradle    `implementation("ai.bithuman:<artifact>:<v>")` — v must be
//                 Maven Central's <release> for that artifact.
//   V1b Landing   any `ai.bithuman:<artifact>:<v>` on an .astro landing page —
//                 those pages state only what is current.
//   V2  PyPI      an exact pin `<dist>==<v>` in a code region — v must be the
//                 newest release on PyPI.
//   V3  PyPI      prose that states a version as current: "`bithuman` 3.1.5",
//                 "`pip install bithuman-mcp` (0.3.5)", "PyPI serves **3.1.5**".
//   V4  CLI       sample `bithuman --version` output (`bithuman    2.6.14`)
//                 and `version --json` output (`"cli":"2.6.14"`) — must be the
//                 newest `cli-v*` release that is neither a draft nor a
//                 pre-release.
//   V5  Table     the "Current shipping versions" table on downloads.md — the
//                 bold version in each graded row must be the newest.
//   V6  SwiftPM   every `from:` pin on the Swift package must RESOLVE to the
//                 newest tag (SwiftPM takes the highest tag in the same major,
//                 so `from: "2.11.0"` is current while 2.x is newest).
//   V8  Swift     "the newest package tag, **X**" must be the newest tag, and
//                 "Essence 2 engine **Y**" must be what that tag's Package.swift
//                 pins in `essence2Tag`. A page states the ENGINE a developer
//                 actually gets, so it is graded against the package, not
//                 against the engine's own release list. When that list is
//                 AHEAD of the package, the run prints a warning and stays
//                 green: no docs edit can fix an untagged package, and turning
//                 this repository red for another lane's release step would
//                 block every unrelated page change.
//   V9  Rates     ONE WRITER FOR A MEASURED RATE. sdk/performance.md is emitted
//                 from the floors record; no other page may state a number that
//                 equals one of its cells next to "fps" or "frames per second".
//                 Measured 2026-09-14: sdk/ios said "measured on an iPhone 15 at
//                 33 frames per second" while the cell had already moved to 52 —
//                 a hand-written copy of a fact that only one writer regenerates.
//                 The model PLAY rates (20 and 25) are exempt: they are product
//                 constants stated all over the site, not measurements, and a
//                 cell that happens to equal one must not silence them.
//                 ★THE LINE, so nobody has to re-derive it: a number is a CELL
//                 COPY when it states what a PLATFORM ACHIEVES. It is not one
//                 when it states what a model PLAYS at (20, 25), what a BROKEN
//                 configuration looks like (sdk/web's "~8 fps instead of 20"),
//                 or what a page MEASURED ITSELF (the Kotlin example's own
//                 all-CPU arm). Those three stay silent on purpose.
//   V7  Changelog the newest `cli-v*` the changelog names must be the newest
//                 CLI, and the newest version of the CLI, `bithuman` and both
//                 Android artifacts must each have an entry.
//
// WHAT IT DELIBERATELY DOES NOT GRADE: history. Changelog entries below the
// top are dated records and stay as written. A range (`bithuman>=2.7.0`,
// `bithuman<3`) is a requirement, not a claim about what is newest. A
// `BITHUMAN_VERSION=cli-v…` pin in prose is a deliberate pin to an old
// release. Grading only the forms above is what keeps those free.
//
// ★NEWEST IS NOT WHAT EVERY PLATFORM INSTALLS. Measured 2026-09-14: PyPI's
// info.version for `bithuman` went to 3.1.6 while 3.1.6 shipped only Linux
// wheels — the macOS publish job refused. On a Mac, `pip install bithuman`
// still resolved 3.1.5. Graded on info.version alone, this check demanded that
// every page say 3.1.6, including "3.1.6 runs on Apple Silicon", which was
// false. So for every PyPI artifact it also compares the newest release's
// wheel PLATFORMS with the release before it, and when a platform was dropped
// it says so on every finding for that artifact: which platform, and the newest
// version that still serves it. The fix for a platform-partial release is to
// split the claim by platform, never to bump it.
//
// THE CLI TRAP. `gh release view` on the tap returns the Swift SDK's release,
// not the CLI's: the tap publishes both. The CLI is found by TAG PREFIX over
// the whole release list, with drafts and pre-releases skipped.
//
// NETWORK. The registries are the subject. A registry that cannot be reached
// or parsed prints CANNOT CHECK, names every page subject it left ungraded,
// and exits 2. It never passes: "I could not look" is a failure you can see.
// Stale text exits 1.
//
// NON-VACUITY. Each rule asserts it found at least one subject in the real
// corpus. A regex that stops matching fails the run instead of printing a
// green over an empty set.
//
// USAGE
//   node scripts/check-versions-current.mjs              # grade this tree
//   node scripts/check-versions-current.mjs --root DIR   # grade another checkout
//   node scripts/check-versions-current.mjs --selftest   # no network; proves every arm

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const HERE = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const rootArg = process.argv.indexOf("--root");
const ROOT = rootArg > -1 ? resolve(process.argv[rootArg + 1]) : HERE;
const CORPUS_ROOTS = ["src/content", "src/pages"];
const TAP = "bithuman-product/homebrew-bithuman";

/** What a page can name, and where its truth lives. */
export const ARTIFACTS = [
  // ★The FIRST-GENERATION Android coordinate. Ungraded until 2026-09-15, and
  // the gap was invisible: a page could say ai.bithuman:sdk:0.0.1 and this
  // check still printed OK, because an extracted coordinate whose artifact is
  // not listed here was silently skipped. essence-1 is maintained, not
  // invested in — which is exactly why its coordinate needs a guard rather
  // than attention. changelog:false: v1 gets no new narrative, only truth.
  { id: "sdk", kind: "maven", changelog: false },
  { id: "essence2-android", kind: "maven", changelog: true },
  { id: "expression2-android", kind: "maven", changelog: true },
  { id: "bithuman", kind: "pypi", changelog: true },
  { id: "bithuman-mcp", kind: "pypi", changelog: false },
  { id: "cli", kind: "cli", changelog: true },
  { id: "swift", kind: "tap", changelog: false },
  { id: "swift-essence2-engine", kind: "tap-essence2", changelog: false },
];

/* --------------------------------------------------------------- versions */

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function cmpVer(a, b) {
  const A = a.replace(/^v/, "").split(".").map(Number);
  const B = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0);
  return 0;
}

export function newest(versions) {
  const v = versions.filter((x) => SEMVER.test(x)).sort(cmpVer);
  return v.at(-1) ?? null;
}

/** The platform families a release's wheels cover. A pure-Python wheel covers all. */
export function platformFamilies(files) {
  const out = new Set();
  for (const f of files || []) {
    const n = f.filename || "";
    if (!n.endsWith(".whl")) continue;
    if (/-none-any\.whl$/.test(n)) out.add("any");
    if (/macosx_[0-9_]+_(arm64|universal2)/.test(n)) out.add("macOS arm64");
    if (/macosx_[0-9_]+_x86_64/.test(n)) out.add("macOS x86_64");
    if (/(many|musl)linux[^-]*_x86_64/.test(n)) out.add("Linux x86_64");
    if (/(many|musl)linux[^-]*_aarch64/.test(n)) out.add("Linux aarch64");
    if (/win_amd64/.test(n)) out.add("Windows x86_64");
  }
  return out;
}

/** Platforms the newest release DROPPED relative to the release before it,
 *  each with the newest version that still serves that platform — which is
 *  what `pip install` resolves there. Empty when nothing was dropped. */
export function platformRegression(releases, newestVersion) {
  const withFiles = Object.keys(releases || {})
    .filter((v) => SEMVER.test(v) && (releases[v] || []).length)
    .sort(cmpVer);
  const i = withFiles.indexOf(newestVersion);
  if (i < 1) return [];
  const now = platformFamilies(releases[newestVersion]);
  if (now.has("any")) return [];
  const prev = platformFamilies(releases[withFiles[i - 1]]);
  const out = [];
  for (const family of prev) {
    if (family === "any" || now.has(family)) continue;
    const still = withFiles.filter((v) => platformFamilies(releases[v]).has(family)).at(-1);
    out.push({ family, newest: still ?? "(none)" });
  }
  return out;
}

/** The tag SwiftPM resolves for `from: X` — the highest tag in X's major that is >= X. */
export function resolvesTo(from, tags) {
  const major = from.split(".")[0];
  const c = tags.filter((t) => SEMVER.test(t) && t.split(".")[0] === major && cmpVer(t, from) >= 0);
  return newest(c);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ----------------------------------------------------------------- corpus */

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(md|mdx|astro|ts|js)$/.test(name)) out.push(p);
  }
  return out;
}

function corpus() {
  const files = [];
  for (const r of CORPUS_ROOTS) {
    const abs = join(ROOT, r);
    let found = [];
    try {
      found = walk(abs);
    } catch {
      /* reported below */
    }
    if (found.length === 0) {
      console.log(`::error::corpus root ${r} under ${ROOT} contributed no files — this gate is grading nothing`);
      process.exit(1);
    }
    files.push(...found);
  }
  return files.map((p) => ({ path: p, text: readFileSync(p, "utf8") }));
}

const isChangelog = (p) => /(^|\/)changelog\.mdx?$/.test(p);
const isPerformance = (p) => /(^|\/)sdk\/performance\.mdx?$/.test(p);
/** The rates a model PLAYS at — product constants, never a measurement. */
const PLAY_RATES = new Set(["20", "25"]);

/** Every number the emitted performance table states as a cell, mapped to the
 *  row and column it came from, so a failure can name the cell it matched
 *  rather than leaving a reader to hunt for it. */
export function performanceCells(text) {
  const out = new Map();
  let columns = ["Expression 2", "Essence 2"];
  for (const line of text.split("\n")) {
    if (!/^\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (/^platform$/i.test(cells[0])) {
      columns = [cells[2], cells[3]];
      continue;
    }
    if (/^-+$/.test(cells[0].replace(/:/g, ""))) continue;
    cells.slice(2).forEach((c, i) => {
      const m = /(\d+(?:\.\d+)?)/.exec(c);
      if (m && !out.has(m[1])) out.set(m[1], `${cells[0]} · ${columns[i]}`);
    });
  }
  return out;
}

/** Rate literals on a page: the number written next to fps / frames per second. */
export function rateLiterals(text) {
  const out = [];
  const re = /(\d+(?:\.\d+)?)\s*(fps|frames per second)/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ value: m[1], line: lineOf(text, m.index), what: m[0] });
  return out;
}
const isDownloads = (p) => /(^|\/)downloads\.mdx?$/.test(p);

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** The regions of a file a reader copies from. Markdown: fenced blocks and
 *  inline spans. Everything else (.astro/.ts/.js) is already code. */
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

/* ------------------------------------------------------------- extraction */

/** Every subject on one page: {artifact, version, line, rule, what}. */
export function subjects(path, text) {
  const out = [];
  if (isChangelog(path)) return out; // history — graded only by V7
  const push = (artifact, version, abs, rule, what) =>
    out.push({ artifact, version, line: lineOf(text, abs), rule, what });

  const mavenIds = ARTIFACTS.filter((a) => a.kind === "maven").map((a) => a.id);
  const pypiIds = ARTIFACTS.filter((a) => a.kind === "pypi").map((a) => a.id);

  for (const region of codeRegions(path, text)) {
    let m;
    // V1 — a Gradle line a developer copies (Markdown pages)
    // V1b — any coordinate on a landing page (.astro/.ts/.js): those pages
    //       state only what is current, so a bare coordinate there is a claim.
    const gradle = /\bimplementation\s*(?:\(\s*)?["']ai\.bithuman:([A-Za-z0-9._-]+):([0-9][A-Za-z0-9._-]*?)["']/g;
    const bare = /\bai\.bithuman:([A-Za-z0-9_-]+):(\d+\.\d+\.\d+)(?![0-9.])/g;
    const md = /\.(md|mdx)$/.test(path);
    const re1 = md ? gradle : bare;
    while ((m = re1.exec(region.text)) !== null) {
      if (mavenIds.includes(m[1])) {
        push(m[1], m[2], region.offset + m.index, md ? "V1" : "V1b", `ai.bithuman:${m[1]}:${m[2]}`);
      }
    }
    // V2 — an exact PyPI pin
    for (const dist of pypiIds) {
      const pin = new RegExp(`(?<![A-Za-z0-9_-])${esc(dist)}(?:\\[[^\\]]*\\])?==(\\d+\\.\\d+\\.\\d+)(?![0-9.])`, "g");
      while ((m = pin.exec(region.text)) !== null) {
        push(dist, m[1], region.offset + m.index, "V2", `${dist}==${m[1]}`);
      }
    }
    // V4 — sample CLI output
    const verLine = /^[ \t]*bithuman[ \t]+(\d+\.\d+\.\d+)\b/gm;
    while ((m = verLine.exec(region.text)) !== null) {
      push("cli", m[1], region.offset + m.index, "V4", `\`bithuman --version\` output naming ${m[1]}`);
    }
    const verJson = /"cli"\s*:\s*"(\d+\.\d+\.\d+)"/g;
    while ((m = verJson.exec(region.text)) !== null) {
      push("cli", m[1], region.offset + m.index, "V4", `\`version --json\` output "cli":"${m[1]}"`);
    }
  }

  // V3 — prose that states a PyPI version as current
  for (const dist of pypiIds) {
    // A version followed by "+" is a minimum ("0.3.4+"), not a claim. The bare
    // "`dist` X" form is graded for `bithuman` only: the MCP page writes
    // "`bithuman-mcp` 0.3.4" as history, and states its current version in the
    // `pip install` form instead.
    const forms = [
      new RegExp("`pip install " + esc(dist) + "`[,\\s]*(?:currently\\s+)?\\(?\\**(\\d+\\.\\d+\\.\\d+)(?![0-9.+])", "g"),
    ];
    if (dist === "bithuman") {
      forms.push(new RegExp("`bithuman`\\s+\\**v?(\\d+\\.\\d+\\.\\d+)(?![0-9.+])", "g"));
      forms.push(/\bPyPI serves\s+\**(\d+\.\d+\.\d+)(?![0-9.+])/g);
    }
    for (const re of forms) {
      let m;
      while ((m = re.exec(text)) !== null) {
        push(dist, m[1], m.index, "V3", `"${m[0].replace(/\s+/g, " ")}"`);
      }
    }
  }

  // V8 — the Swift package's newest tag, and the engine that tag ships
  {
    let m;
    const tagRe = /newest package tag, \*\*(\d+\.\d+\.\d+)\*\*/g;
    while ((m = tagRe.exec(text)) !== null) {
      push("swift", m[1], m.index, "V8", `"the newest package tag, ${m[1]}"`);
    }
    const engRe = /Essence 2 engine \*\*(\d+\.\d+\.\d+)\*\*/g;
    while ((m = engRe.exec(text)) !== null) {
      push("swift-essence2-engine", m[1], m.index, "V8", `"Essence 2 engine ${m[1]}"`);
    }
  }

  // V5 — the downloads table
  if (isDownloads(path)) {
    for (const row of shippingTable(text)) {
      push(row.artifact, row.version, row.index, "V5", `the "Current shipping versions" row for ${row.artifact}`);
    }
  }
  return out;
}

const TABLE_KEYS = {
  "`bithuman`": "bithuman",
  "`bithuman-mcp`": "bithuman-mcp",
  "`ai.bithuman:expression2-android`": "expression2-android",
  "`ai.bithuman:essence2-android`": "essence2-android",
};

/** Rows of downloads.md's "Current shipping versions" table that name a graded artifact. */
export function shippingTable(text) {
  const h = /^##\s+Current shipping versions\s*$/m.exec(text);
  if (!h) return [];
  const out = [];
  let idx = h.index + h[0].length;
  const lines = text.slice(idx).split("\n");
  let inTable = false;
  for (const line of lines) {
    const at = idx;
    idx += line.length + 1;
    if (/^\|/.test(line)) {
      inTable = true;
      const cells = line.split("|").slice(1, -1);
      if (cells.length < 2) continue;
      const key = Object.keys(TABLE_KEYS).find((k) => cells[0].includes(k));
      if (!key) continue;
      const v = /\*\*(\d+\.\d+\.\d+)\*\*/.exec(cells[1]);
      out.push({ artifact: TABLE_KEYS[key], version: v ? v[1] : "(no bold version)", index: at });
    } else if (inTable && line.trim() === "") {
      break;
    } else if (/^##\s/.test(line)) {
      break;
    }
  }
  return out;
}

/** V6 — `from:` pins on the Swift package, in a Swift manifest or an XcodeGen spec. */
export function tapPins(text) {
  const out = [];
  const swiftRe = /\.package\s*\(\s*url:\s*\\?["']https:\/\/github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?\\?["']/g;
  let m;
  while ((m = swiftRe.exec(text)) !== null) {
    const v = /\b(?:from|exact)\s*:\s*\\?["']([0-9][0-9A-Za-z.\-]*)\\?["']/.exec(text.slice(m.index, m.index + 400));
    if (v) out.push({ version: v[1], line: lineOf(text, m.index) });
  }
  const yamlRe = /^[ \t]*url:\s*https:\/\/github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?[ \t]*$/gm;
  while ((m = yamlRe.exec(text)) !== null) {
    const v = /^[ \t]*(?:from|exactVersion|version)\s*:\s*["']?([0-9][0-9A-Za-z.\-]*?)["']?[ \t]*$/m.exec(
      text.slice(m.index, m.index + 300),
    );
    if (v) out.push({ version: v[1], line: lineOf(text, m.index) });
  }
  return out;
}

/** V7 — how the changelog may name each artifact's newest version. */
export function changelogMentions(artifact, v) {
  const V = esc(v);
  const forms = {
    cli: [`cli-v${V}(?![0-9.])`],
    bithuman: ["`bithuman`\\s+\\**" + V + "(?![0-9.])", `bithuman==${V}(?![0-9.])`],
    "essence2-android": [`essence2-android:${V}(?![0-9.])`, "`essence2-android`\\s+\\**`?" + V + "(?![0-9.])"],
    "expression2-android": [`expression2-android:${V}(?![0-9.])`, "`expression2-android`\\s+\\**`?" + V + "(?![0-9.])"],
  }[artifact];
  return (forms || []).map((f) => new RegExp(f));
}

/* ------------------------------------------------------------------ grade */

class CannotCheck extends Error {}

/** latest: {artifact -> version}; failures on text; cannot = registries not read. */
export async function grade(files, registry) {
  const failures = [];
  const cannot = [];
  const seen = { V1: 0, V1b: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0, V7: 0, V8: 0, V9: 0 };
  const latest = {};

  for (const a of ARTIFACTS) {
    try {
      latest[a.id] = await registry.latest(a);
      if (!latest[a.id]) throw new CannotCheck("the registry answered with no parsable version");
    } catch (e) {
      cannot.push({ artifact: a.id, reason: e.message, ungraded: [] });
      latest[a.id] = null;
    }
  }
  const unread = (artifact) => cannot.find((c) => c.artifact === artifact);

  const cells = new Map();
  for (const f of files) {
    if (!isPerformance(f.path)) continue;
    for (const [value, where] of performanceCells(f.text)) if (!cells.has(value)) cells.set(value, where);
  }

  for (const { path, text } of files) {
    for (const s of subjects(path, text)) {
      seen[s.rule]++;
      const want = latest[s.artifact];
      if (want === null) {
        unread(s.artifact).ungraded.push(`${path}:${s.line}`);
        continue;
      }
      if (s.version !== want) {
        const dropped = registry.platformNotes?.[s.artifact] || [];
        const hint = dropped.length
          ? ` ★But ${s.artifact} ${want} ships no wheel for ${dropped
              .map((d) => `${d.family} (pip resolves ${d.newest} there)`)
              .join(", ")}. Do not write ${want} for that platform: split the claim by platform.`
          : "";
        failures.push({
          path,
          line: s.line,
          msg: `${s.rule}: ${s.what} names ${s.artifact} ${s.version}; the newest published is ${want}.${hint}`,
        });
      }
    }

    // V6 — the Swift package
    for (const p of tapPins(text)) {
      seen.V6++;
      const tags = latest.swift;
      if (tags === null) {
        unread("swift").ungraded.push(`${path}:${p.line}`);
        continue;
      }
      const to = resolvesTo(p.version, registry.tapTagsSeen || []);
      if (to !== tags) {
        failures.push({
          path,
          line: p.line,
          msg:
            `V6: pins the Swift package at from: "${p.version}", which resolves to ${to ?? "no tag"}; ` +
            `the newest published tag is ${tags}.`,
        });
      }
    }

    // V9 — one writer for a measured rate
    if (!isChangelog(path) && !isPerformance(path) && cells.size) {
      for (const r of rateLiterals(text)) {
        seen.V9++;
        if (PLAY_RATES.has(r.value)) continue;
        if (cells.has(r.value)) {
          failures.push({
            path,
            line: r.line,
            msg:
              `V9: "${r.what}" repeats the performance page's ${cells.get(r.value)} cell (${r.value}), ` +
              `which is emitted from the floors record by its one writer. When that cell moves, this ` +
              `copy silently becomes false — sdk/ios said 33 while the cell already said 52. ` +
              `State the rate only on /sdk/performance and link to it.`,
          });
        }
      }
    }

    // V7 — the changelog
    if (isChangelog(path)) {
      seen.V7++;
      // The NEWEST cli-v the changelog names, not the first: entries of one
      // date can sit in any order, and an entry may cite an older release.
      const named = [...text.matchAll(/cli-v(\d+\.\d+\.\d+)(?![0-9.])/g)];
      const top = named.reduce((a, m) => (a === null || cmpVer(m[1], a[1]) > 0 ? m : a), null);
      if (latest.cli === null) {
        unread("cli").ungraded.push(`${path} (newest CLI entry)`);
      } else if (!top || top[1] !== latest.cli) {
        failures.push({
          path,
          line: top ? lineOf(text, top.index) : 1,
          msg:
            `V7: the newest CLI the changelog names is ${top ? "cli-v" + top[1] : "(none)"}; ` +
            `cli-v${latest.cli} is published and has no entry.`,
        });
      }
      for (const a of ARTIFACTS.filter((x) => x.changelog)) {
        const v = latest[a.id];
        if (v === null) {
          unread(a.id).ungraded.push(`${path} (entry for the newest ${a.id})`);
          continue;
        }
        if (!changelogMentions(a.id, v).some((re) => re.test(text))) {
          failures.push({
            path,
            line: 1,
            msg: `V7: ${a.id} ${v} is the newest published and the changelog has no entry naming it.`,
          });
        }
      }
    }
  }
  return { failures, cannot, seen, latest };
}

/* -------------------------------------------------------------- registries */

// Maven Central answered a GitHub runner with HTTP 403 on this check's first
// CI run, while the same host answered the coordinate gate a minute earlier.
// So a refusal or an overload is retried with backoff, under a User-Agent that
// says who is asking, and Maven is asked on a second Central hostname. If every
// attempt still fails it is CANNOT CHECK, exit 2, never a pass. A 404 is an
// answer and is not retried.
const UA = "bithuman-public-docs-versions-check (+https://github.com/bithuman-product/public-docs)";
const RETRY = new Set([403, 408, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(urls, headers = {}) {
  const list = Array.isArray(urls) ? urls : [urls];
  let last = "";
  for (const url of list) {
    for (let attempt = 1; attempt <= 4; attempt++) {
      let res;
      try {
        res = await fetch(url, {
          redirect: "follow",
          headers: { "User-Agent": UA, ...headers },
          signal: AbortSignal.timeout(30000),
        });
      } catch (e) {
        last = `${url}: ${e.message}`;
        await sleep(2000 * 2 ** (attempt - 1));
        continue;
      }
      if (res.ok) return res;
      last = `${url}: HTTP ${res.status}`;
      if (!RETRY.has(res.status)) break;
      await sleep(2000 * 2 ** (attempt - 1));
    }
  }
  throw new CannotCheck(`${last} (4 attempts per host, ${list.length} host${list.length > 1 ? "s" : ""})`);
}

const liveRegistry = {
  tapTagsSeen: null,
  async latest(a) {
    if (a.kind === "maven") {
      const path = `maven2/ai/bithuman/${a.id}/maven-metadata.xml`;
      const url = `https://repo1.maven.org/${path}`;
      const xml = await (await get([url, `https://repo.maven.apache.org/${path}`])).text();
      const release = /<release>([^<]+)<\/release>/.exec(xml)?.[1]?.trim();
      const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1].trim());
      if (!release && versions.length === 0) throw new CannotCheck(`${url}: no <release> and no <version>`);
      return release && SEMVER.test(release) ? release : newest(versions);
    }
    if (a.kind === "pypi") {
      // Cache-busted: on 2026-09-14 PyPI's CDN served a project JSON that still
      // listed no macOS files for 3.1.6 a minute after the simple index (what
      // pip reads) had all five, and a stale copy would report a platform
      // regression that pip no longer sees.
      const url = `https://pypi.org/pypi/${a.id}/json`;
      const j = await (await get(`${url}?cb=${Date.now()}`, { "Cache-Control": "no-cache" })).json();
      const v = j?.info?.version;
      if (!v || !SEMVER.test(v)) throw new CannotCheck(`${url}: info.version is ${JSON.stringify(v)}`);
      this.platformNotes = this.platformNotes || {};
      this.platformNotes[a.id] = platformRegression(j.releases, v);
      return v;
    }
    if (a.kind === "cli") {
      const headers = { Accept: "application/vnd.github+json" };
      const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
      if (token) headers.Authorization = `Bearer ${token}`;
      const tags = [];
      for (let page = 1; page <= 10; page++) {
        const url = `https://api.github.com/repos/${TAP}/releases?per_page=100&page=${page}`;
        const rows = await (await get(url, headers)).json();
        if (!Array.isArray(rows)) throw new CannotCheck(`${url}: not a release list`);
        for (const r of rows) {
          if (r.draft || r.prerelease) continue;
          const m = /^cli-v(\d+\.\d+\.\d+)$/.exec(r.tag_name || "");
          if (m) tags.push(m[1]);
        }
        if (rows.length < 100) break;
      }
      if (tags.length === 0) throw new CannotCheck(`${TAP} releases: no published cli-v* release found`);
      return newest(tags);
    }
    if (a.kind === "tap-essence2") {
      const tag = `v${await this.latest({ id: "swift", kind: "tap" })}`;
      const url = `https://raw.githubusercontent.com/${TAP}/${tag}/Package.swift`;
      const manifest = await (await get(url)).text();
      const m = /^\s*let\s+essence2Tag\s*=\s*"essence2-v(\d+\.\d+\.\d+)"/m.exec(manifest);
      if (!m) throw new CannotCheck(`${url}: no essence2Tag — the manifest shape changed`);
      return m[1];
    }
    if (a.kind === "tap") {
      let out;
      try {
        out = execFileSync("git", ["ls-remote", "--tags", `https://github.com/${TAP}.git`], {
          encoding: "utf8",
          timeout: 120000,
        });
      } catch (e) {
        throw new CannotCheck(`git ls-remote ${TAP}: ${e.message.split("\n")[0]}`);
      }
      const tags = out
        .split("\n")
        .map((l) => l.split("\t")[1])
        .filter((r) => r && r.startsWith("refs/tags/v") && !r.endsWith("^{}"))
        .map((r) => r.slice("refs/tags/v".length))
        .filter((t) => SEMVER.test(t));
      if (tags.length === 0) throw new CannotCheck(`git ls-remote ${TAP}: no vX.Y.Z tags`);
      this.tapTagsSeen = tags;
      return newest(tags);
    }
    throw new CannotCheck(`no registry for kind ${a.kind}`);
  },
};

/* --------------------------------------------------------------- selftest */

const STUB_LATEST = {
  // ai.bithuman:sdk — the first-generation Android coordinate. A stub entry is
  // not optional: an ARTIFACTS id the stub cannot answer makes EVERY arm fail,
  // which is how adding this artifact first showed up (38 arms wrong).
  sdk: "2.3.6",
  "essence2-android": "0.5.5",
  "expression2-android": "0.4.1",
  bithuman: "3.1.5",
  "bithuman-mcp": "0.3.5",
  cli: "2.6.14",
  swift: "2.13.3",
  "swift-essence2-engine": "1.6.3",
};
const stub = (down = []) => ({
  tapTagsSeen: ["1.9.0", "2.11.0", "2.11.2", "2.13.2", "2.13.3"],
  async latest(a) {
    if (down.includes(a.id)) throw new CannotCheck(`stub: ${a.id} registry unreachable`);
    return STUB_LATEST[a.id];
  },
});

const TABLE = (py, e2) =>
  "## Current shipping versions\n\n| Artifact | Latest version | Where |\n|---|---|---|\n" +
  `| Python SDK (\`bithuman\`) | **${py}** — the 2.x line ends at 2.9.0 | PyPI |\n` +
  "| Android AAR (`ai.bithuman:expression2-android`) | **0.4.1** | Central |\n" +
  `| Android AAR (\`ai.bithuman:essence2-android\`) | **${e2}** (\`0.2.0\` through \`0.5.3\` stay on Central) | Central |\n` +
  "| bitHuman MCP server (`bithuman-mcp`) | **0.3.5** | PyPI |\n\n";

const CL = (firstCli, e2, py) =>
  "## September 2026\n\n" +
  `### Android (2026-09-13)\n\n\`ai.bithuman:essence2-android:${e2}\` on Maven Central.\n\n` +
  `### Python (2026-09-13)\n\n\`bithuman\` ${py} on PyPI.\n\n` +
  `### CLI (2026-09-13)\n\nCLI \`cli-v${firstCli}\`.\n\n` +
  "### Older (2026-09-11)\n\nCLI `cli-v2.6.6`, `ai.bithuman:expression2-android:0.4.1`.\n";

const PERF_FIXTURE =
  "| Platform | Reference hardware | Expression 2 | Essence 2 |\n|---|---|---:|---:|\n" +
  "| iOS | iPhone 15 | 118 | 52 |\n| Web | Chrome on M4 | 30 | being re-measured |\n";

const ARMS = [
  // defects — each must fire
  ["bad: the pre-#70 Android coordinate (0.5.3)", "p/sdk/android.md", '`implementation("ai.bithuman:essence2-android:0.5.3")`', true],
  ["bad: `bithuman` 3.1.4 stated as current", "p/sdk/python.md", "`bithuman` 3.1.4 runs on Python 3.10–3.14", true],
  ["bad: PyPI serves an old version across a line break", "p/concepts/essence-1.md", "PyPI serves\n  **3.1.4** with wheels", true],
  ["bad: an exact pip pin to an old version", "p/x.md", '```bash\npip install "bithuman==3.1.4"\n```\n', true],
  ["bad: an old MCP version in prose", "p/guides/mcp.md", "(`pip install bithuman-mcp`, currently **0.3.4**, Python", true],
  ["bad: sample --version output naming an old CLI", "p/sdk/cli.md", "```text\nlibessence  3.1.4 ABI 7\nbithuman    2.6.13\n```\n", true],
  ["bad: sample version --json naming an old CLI", "p/sdk/cli/reference.md", '```json\n{"abi":7,"cli":"2.6.13","libessence":"3.1.4"}\n```\n', true],
  ["bad: the downloads table naming an old wheel", "p/downloads.md", TABLE("3.1.4", "0.5.5"), true],
  ["bad: the downloads table naming an old AAR", "p/downloads.md", TABLE("3.1.5", "0.5.3"), true],
  ["bad: a Swift pin that resolves to an old major", "p/sdk/ios.md", '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "1.9.0")\n```\n', true],
  ["bad: the pre-#70 landing-page coordinate (0.5.3)", "p/pages/start.astro", '<p>the Android library <code>ai.bithuman:essence2-android:0.5.3</code> is published</p>', true],
  ["bad: a changelog whose newest CLI entry is not the newest CLI", "p/changelog.md", CL("2.6.13", "0.5.5", "3.1.5"), true],
  ["bad: a changelog with no entry for the newest AAR", "p/changelog.md", CL("2.6.14", "0.5.3", "3.1.5"), true],
  ["bad: a changelog with no entry for the newest wheel", "p/changelog.md", CL("2.6.14", "0.5.5", "3.1.4"), true],
  // current text — each must stay silent
  ["good: the current Android coordinates", "p/sdk/android.md", '```kotlin\nimplementation("ai.bithuman:essence2-android:0.5.5")\nimplementation("ai.bithuman:expression2-android:0.4.1")\n```\n', false],
  ["good: `bithuman` 3.1.5 stated as current", "p/sdk/python.md", "`bithuman` 3.1.5 runs on Python 3.10–3.14", false],
  ["good: sample output naming the newest CLI", "p/sdk/cli.md", '```text\nbithuman    2.6.14\n```\n```json\n{"cli":"2.6.14"}\n```\n', false],
  ["good: the current downloads table", "p/downloads.md", TABLE("3.1.5", "0.5.5"), false],
  ["good: from: 2.11.0 resolves to the newest 2.x tag", "p/sdk/ios.md", '```swift\n.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")\n```\n', false],
  ["good: a changelog with every newest entry", "p/changelog.md", CL("2.6.14", "0.5.5", "3.1.5"), false],
  // history and ranges — each must stay silent
  ["control: a version range is a requirement, not a claim", "p/guides/actions.md", '> **Requires `bithuman>=2.7.0`** (`pip install "bithuman>=2.7.0"`) and `pip install "bithuman<3"`', false],
  ["control: a deliberate pin to an old CLI release", "p/sdk/cli/reference.md", "`BITHUMAN_VERSION=cli-v2.3.27` still resolves a Linux-ARM tarball", false],
  ["control: old coordinates in prose about history", "p/examples/failure-states.md", "produced against **`ai.bithuman:expression2-android:0.3.1`** — the version current that day", false],
  ["control: old versions inside the changelog's history", "p/changelog.md", CL("2.6.14", "0.5.5", "3.1.5") + "`bithuman` 2.3.9 and `implementation(\"ai.bithuman:essence2-android:0.2.0\")`\n", false],
  ["control: a minimum version is not a claim", "p/guides/mcp.md", "Needs CLI **2.4.1+** (or `bithuman-mcp` **0.3.4+**) and `bithuman` 3.1.2+", false],
  ["control: MCP history in prose, current version in the pip form", "p/guides/mcp.md", "The `bithuman-mcp` 0.3.4 schema still listed a field. (`pip install bithuman-mcp`, currently **0.3.5**, Python", false],
  ["good: the current landing-page coordinate", "p/pages/start.astro", "<code>ai.bithuman:essence2-android:0.5.5</code> and implementation(\"ai.bithuman:expression2-android:0.4.1\")", false],
  ["good: a newer entry citing an older CLI above the newest CLI's entry", "p/changelog.md", "### Python (2026-09-13)\n\nThe change `cli-v2.6.13` made.\n\n" + CL("2.6.14", "0.5.5", "3.1.5"), false],
  ["bad: the newest Swift package tag named as an older tag", "p/sdk/ios.md", "The newest package tag, **2.13.2**, ships Essence 2 engine **1.6.3**.", true],
  ["bad: an older Essence 2 engine named as what the newest tag ships", "p/sdk/ios.md", "The newest package tag, **2.13.3**, ships Essence 2 engine **1.6.2**.", true],
  ["good: the newest tag and the engine it ships", "p/sdk/ios.md", "The newest package tag, **2.13.3**, ships Essence 2 engine **1.6.3**.", false],
  ["control: a minimum Swift version is not a claim about the newest", "p/downloads.md", "Essence 2 in your own iOS or macOS app works from **2.13.2** — it opens the file you download.", false],
  ["bad: a page repeating a performance cell", "p/sdk/ios.md", "measured on an iPhone 15 at 52 frames per second", true],
  ["bad: a page repeating the other column's cell", "p/sdk/web.md", "the browser renders at 118 fps today", true],
  ["good: the model play rate is a product constant, not a cell", "p/concepts/essence-2.md", "lip-synced live at ~25 frames per second, and 20 fps for the other model", false],
  ["good: a page's own measurement that is not a cell", "p/examples/kotlin.md", "this phone renders about 5.6 frames per second, and playback needs 20", false],
  ["control: the performance page itself states its cells", "p/sdk/performance.md", PERF_FIXTURE, false],
  ["control: a page with no version at all", "p/x.md", "Nothing versioned here.\n", false],
];

async function selftest() {
  let bad = 0;
  for (const [name, path, text, mustFire] of ARMS) {
    // V9 needs the performance page in the corpus to know what a cell is, so
    // every arm is graded beside it — except the arm that IS that page.
    const corpusFiles = isPerformance(path)
      ? [{ path, text }]
      : [{ path, text }, { path: "p/sdk/performance.md", text: PERF_FIXTURE }];
    const { failures, cannot } = await grade(corpusFiles, stub());
    const fired = failures.length > 0;
    const ok = fired === mustFire && cannot.length === 0;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(64)} fired=${fired} expected=${mustFire}`);
  }
  // PLATFORM REGRESSION: the case measured 2026-09-14.
  {
    const w = (tag) => ({ filename: `bithuman-X-cp312-cp312-${tag}.whl` });
    const rel = {
      "3.1.5": [w("macosx_14_0_arm64"), w("manylinux_2_28_x86_64"), w("manylinux_2_28_aarch64")],
      "3.1.6": [w("manylinux_2_28_x86_64"), w("manylinux_2_28_aarch64")],
    };
    const got = platformRegression(rel, "3.1.6");
    const ok1 = got.length === 1 && got[0].family === "macOS arm64" && got[0].newest === "3.1.5";
    const full = { ...rel, "3.1.6": [...rel["3.1.6"], w("macosx_14_0_arm64")] };
    const ok2 = platformRegression(full, "3.1.6").length === 0;
    const pure = { "1.0.0": [w("macosx_14_0_arm64")], "1.0.1": [{ filename: "x-1.0.1-py3-none-any.whl" }] };
    const ok3 = platformRegression(pure, "1.0.1").length === 0;
    // The real case: PyPI's newest is 3.1.6, the page still says 3.1.5, and a
    // Mac resolves 3.1.5. The finding must say both halves.
    const base = stub();
    const hinted = await grade(
      [{ path: "p/sdk/python.md", text: "`bithuman` 3.1.5 runs on Python" }],
      {
        ...base,
        async latest(a) { return a.id === "bithuman" ? "3.1.6" : base.latest(a); },
        platformNotes: { bithuman: [{ family: "macOS arm64", newest: "3.1.5" }] },
      },
    );
    const ok4 = hinted.failures.length === 1 && /macOS arm64 \(pip resolves 3\.1\.5 there\)/.test(hinted.failures[0].msg);
    for (const [name, ok] of [
      ["platform: a release that drops macOS arm64 is reported, with 3.1.5", ok1],
      ["platform: a release that keeps every platform reports nothing", ok2],
      ["platform: a pure-Python wheel covers every platform", ok3],
      ["platform: the dropped platform is named ON the finding a fixer reads", ok4],
    ]) {
      if (!ok) bad++;
      console.log(`  ${ok ? "OK  " : "FAIL"}  ${name.padEnd(64)}`);
    }
  }

  // CANNOT CHECK: an unreachable registry must never read as a pass.
  {
    const { failures, cannot } = await grade(
      [{ path: "p/sdk/python.md", text: "`bithuman` 3.1.4 runs on Python" }],
      stub(["bithuman"]),
    );
    const c = cannot.find((x) => x.artifact === "bithuman");
    const ok = failures.length === 0 && c && c.ungraded.length === 1 && verdict(failures, cannot) === 2;
    if (!ok) bad++;
    console.log(
      `  ${ok ? "OK  " : "FAIL"}  ${"cannot: an unreachable registry exits 2 and names what it left".padEnd(64)} ` +
        `cannot=${cannot.length} ungraded=${c ? c.ungraded.length : 0} exit=${verdict(failures, cannot)}`,
    );
  }
  // The rules must see the real pages, or every arm above is about fixtures only.
  const real = corpus();
  const counts = { V1: 0, V1b: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0, V7: 0, V8: 0, V9: 0 };
  for (const f of real) {
    for (const s of subjects(f.path, f.text)) counts[s.rule]++;
    counts.V6 += tapPins(f.text).length;
    if (isChangelog(f.path)) counts.V7++;
    if (!isChangelog(f.path) && !isPerformance(f.path)) counts.V9 += rateLiterals(f.text).length;
  }
  for (const [rule, n] of Object.entries(counts)) {
    if (rule === "V2") continue; // no page pins with == today; the fixture arm proves it fires
    const ok = n > 0;
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${(rule + " finds subjects in the real corpus").padEnd(64)} n=${n}`);
  }
  console.log(
    bad === 0
      ? `check-versions-current --selftest: OK — ${ARMS.filter((a) => a[3]).length} defect arms fire, ` +
          `${ARMS.filter((a) => !a[3]).length} good/control arms stay silent, CANNOT CHECK exits 2, every rule has real subjects.`
      : `check-versions-current --selftest: ${bad} arm(s) wrong`,
  );
  return bad === 0 ? 0 : 1;
}

/** 1 = stale text, 2 = a registry could not be read, 0 = every version current. */
function verdict(failures, cannot) {
  if (failures.length) return 1;
  if (cannot.length) return 2;
  return 0;
}

/* ------------------------------------------------------------------- main */

if (process.argv.includes("--selftest")) process.exit(await selftest());

const files = corpus();
const { failures, cannot, seen, latest } = await grade(files, liveRegistry);

if (!files.some((f) => isChangelog(f.path))) {
  console.log("::error::no changelog.md in the corpus — V7 is grading nothing");
  process.exit(1);
}
for (const rule of ["V1", "V1b", "V3", "V4", "V5", "V6", "V8"]) {
  if (seen[rule] === 0 && !cannot.length) {
    console.log(`::error::${rule} matched nothing in ${CORPUS_ROOTS.join(" + ")} — the extractor stopped seeing pages, not the pages stopped naming versions`);
    process.exit(1);
  }
}
if (seen.V5 > 0 && seen.V5 < 4) {
  console.log(`::error::V5 graded ${seen.V5} row(s) of the downloads table; it carries 4 — the table changed shape`);
  process.exit(1);
}

console.log(
  "newest published: " +
    ARTIFACTS.map((a) => `${a.id} ${latest[a.id] ?? "CANNOT CHECK"}`).join(" · "),
);
for (const f of failures) {
  const rel = relative(ROOT, f.path);
  console.log(`::error file=${rel},line=${f.line}::${f.msg}`);
  console.log(`  ${rel}:${f.line}\n      ${f.msg}\n`);
}
for (const [dist, dropped] of Object.entries(liveRegistry.platformNotes || {})) {
  for (const d of dropped) {
    console.log(
      `::warning::PLATFORM REGRESSION — ${dist} ${latest[dist]} ships no ${d.family} wheel, which the ` +
        `release before it had. On ${d.family}, pip installs ${d.newest}. A page must not say ` +
        `${latest[dist]} runs there.`,
    );
  }
}
for (const c of cannot) {
  console.log(`::error::CANNOT CHECK ${c.artifact} — ${c.reason}`);
  console.log(`  ${c.ungraded.length} subject(s) left ungraded: ${c.ungraded.join(", ") || "(none on the pages)"}`);
}
const code = verdict(failures, cannot);
if (code === 1) {
  const rates = failures.filter((f) => f.msg.startsWith("V9:")).length;
  const versions = failures.length - rates;
  const parts = [];
  if (versions) parts.push(`${versions} version(s) older than the newest published`);
  if (rates) parts.push(`${rates} rate literal(s) repeating a performance-page cell`);
  console.log(
    `check-versions-current: ${failures.length} finding(s) — ${parts.join(", ")}` +
      (cannot.length ? `, and ${cannot.length} registr${cannot.length > 1 ? "ies" : "y"} could not be read` : "") +
      ". Fix: write the newest version and add its changelog entry; state a measured rate only on /sdk/performance.",
  );
} else if (code === 2) {
  console.log(`check-versions-current: CANNOT CHECK — ${cannot.length} registr${cannot.length > 1 ? "ies" : "y"} unreadable. This is not a pass.`);
} else {
  const n = Object.values(seen).reduce((a, b) => a + b, 0);
  console.log(`check-versions-current: OK — ${n} subject(s) across V1–V9: every version is the newest published, and no page repeats a performance cell.`);
}
process.exit(code);
