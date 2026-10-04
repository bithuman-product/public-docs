#!/usr/bin/env node
// ONE VERSIONS FILE (G2).
//
// src/data/versions.json holds the current published version of every bitHuman
// artifact. Every pin on the site is a copy of it, written by this script:
//
//   node scripts/sync-versions.mjs            check: exit 1 if any pin or generated block differs
//   node scripts/sync-versions.mjs --write    rewrite every pin and block from versions.json
//   node scripts/sync-versions.mjs --registries
//                                             check versions.json itself against PyPI, bitHuman's
//                                             Maven repository (maven.bithuman.ai, for the Android
//                                             keys), the GitLab tags, pub.dev and downloads.bithuman.ai (exit 2 if unreachable)
//   node scripts/sync-versions.mjs --release-files [--write]
//                                             src/data/release-files.json (the /downloads
//                                             "Release files" table) against downloads.bithuman.ai's
//                                             releases.json for the versions above (exit 2 if
//                                             unreachable or incomplete); --write rewrites it
//   node scripts/sync-versions.mjs --examples [DIR] [--write]
//                                             check the pins in bithuman-examples (a checkout at DIR,
//                                             or $BITHUMAN_EXAMPLES_DIR; else main on GitLab, exit 2
//                                             if unreachable): exit 1 when a pin LAGS versions.json.
//                                             --write (checkout only) moves those pins, so a release
//                                             run moves the examples with the docs.
//
// A release bump is one edit to versions.json, then `--write`. Pins stay literal
// in the markdown, so GitHub, the .md twins, llms-full.txt and the gates that
// compile served code all read real versions.
//
// Only PIN FORMS are rewritten: the lines a developer copies (a SwiftPM
// `.package(...)`, a Gradle coordinate, a `==` pin, a Flutter `ref:`, the Apple
// resources URL). A version mentioned in prose is history, and history belongs
// in the changelog; the no-internal-content gate reports it elsewhere.
// Exempt: the changelog (it names past releases on purpose) and legal notices
// (they name the exact versions they audited).

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { BITHUMAN_GROUP, artifactUrls } from "./maven-repo.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const VJ = JSON.parse(readFileSync(join(ROOT, "src/data/versions.json"), "utf8"));
const V = VJ.versions;
const SEMVER = String.raw`\d+\.\d+\.\d+`;

// key → pattern with exactly one capture group: the version. `legacy` marks the 2.x identity of an
// artifact whose next major moved home (the Swift package on the archived GitHub tap, the Flutter
// plugin's git tag); `sample` is a pin in that form, for the selftest. Such a pin stays on its own
// major: it is synced while versions.json is on that major and never rewritten into a newer one,
// which that identity does not publish. A pin on an older major is reported as a move to `legacy`
// (by hand, with that major's API) and never fails the check.
const SWIFT_HOME = "https://gitlab.com/bithuman/sdk/bithuman-swift";
const FLUTTER_HOME = "pub.dev `bithuman: ^X` (source https://gitlab.com/bithuman/sdk/bithuman-flutter)";
const LEGACY_SWIFT_URL = "https://github.com/" + "bithuman-product/homebrew-bithuman"; // the archived 2.x home
export const PIN_FORMS = [
  { key: "swift", re: new RegExp(String.raw`bithuman-swift(?:\.git)?"\s*,\s*(?:from:\s*|\.upToNextMajor\(from:\s*|exact:\s*)"(${SEMVER})"`, "g") },
  { key: "swift", legacy: SWIFT_HOME, sample: (v) => `.package(url: "${LEGACY_SWIFT_URL}.git", from: "${v}")`,
    re: new RegExp(String.raw`github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?"\s*,\s*(?:from:\s*|\.upToNextMajor\(from:\s*|exact:\s*)"(${SEMVER})"`, "g") },
  { key: "essence2_engine", re: new RegExp(String.raw`(?:releases/(?:download|tag)/|/-/releases/|downloads\.bithuman\.ai/homebrew-bithuman/)essence2-v(${SEMVER})(?![\\d.])`, "g") },
  { key: "expression2_android", re: new RegExp(String.raw`ai\.bithuman:expression2-android:(${SEMVER})`, "g") },
  { key: "essence2_android", re: new RegExp(String.raw`ai\.bithuman:essence2-android:(${SEMVER})`, "g") },
  { key: "python", re: new RegExp(String.raw`(?<![\w-])bithuman(?:\[[^\]\s]*\])?==(${SEMVER})`, "g") },
  { key: "livekit_plugin", re: new RegExp(String.raw`livekit-plugins-bithuman==(${SEMVER})`, "g") },
  { key: "cli", re: new RegExp(String.raw`"cli"\s*:\s*"(${SEMVER})"`, "g") },
  { key: "flutter_plugin", legacy: FLUTTER_HOME, sample: (v) => `      ref: flutter-plugin-v${v}\n`,
    re: new RegExp(String.raw`ref:\s*flutter-plugin-v(${SEMVER})`, "g") },
  { key: "flutter_plugin", re: new RegExp(String.raw`(?<![\w-])bithuman:\s*\^(${SEMVER})`, "g") },
];

const EXEMPT = [/^src\/content\/docs\/changelog/, /^src\/content\/docs\/legal\//];

// The examples repository pins the same artifacts in two more forms: an xcodegen `project.yml`
// (`url: …homebrew-bithuman.git` then `from: 2.20.1`, comment lines allowed between) and the
// committed Xcode project (`minimumVersion = 2.20.1;` under the package's repositoryURL).
export const EXAMPLE_FORMS = [
  ...PIN_FORMS,
  { key: "swift", re: new RegExp(String.raw`bithuman-swift(?:\.git)?[ \t]*\n(?:[ \t]*#[^\n]*\n)*[ \t]*from:[ \t]*"?(${SEMVER})"?`, "g") },
  { key: "swift", legacy: SWIFT_HOME, sample: (v) => `    url: ${LEGACY_SWIFT_URL}.git\n    from: ${v}\n`,
    re: new RegExp(String.raw`github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?[ \t]*\n(?:[ \t]*#[^\n]*\n)*[ \t]*from:[ \t]*"?(${SEMVER})"?`, "g") },
  { key: "swift", re: new RegExp(String.raw`bithuman-swift(?:\.git)?";[^}]*?minimumVersion = (${SEMVER});`, "g") },
  { key: "swift", legacy: SWIFT_HOME, sample: (v) => `repositoryURL = "${LEGACY_SWIFT_URL}.git";\n requirement = {\n minimumVersion = ${v};`,
    re: new RegExp(String.raw`github\.com\/bithuman-product\/homebrew-bithuman(?:\.git)?";[^}]*?minimumVersion = (${SEMVER});`, "g") },
];
const EXAMPLES_REPO = "bithuman/sdk/bithuman-examples"; // the gitlab.com project path
// The interim SPM identity (TARGET_ORG section 4): homebrew-bithuman on GitLab as a Swift package or a
// Flutter git dependency. No 3.x (or pub.dev) release ships from it, so it is never a pin form: every
// spelling is reported and fails the run, --write included (move it to its final home by hand). The
// `brew tap bithuman/bithuman <url>` line is the tap's own use of that URL and never matches.
const INTERIM_TAP = "https://gitlab.com/" + "bithuman/sdk/homebrew-bithuman";
const INTERIM_RE = new RegExp(String.raw`(?:\.package\s*\(\s*url:\s*\\?["']|^[ \t]*url:[ \t]*|repositoryURL\s*=\s*")` + INTERIM_TAP.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + String.raw`(?:\.git)?(?=["'\\\s;]|$)`, "gm");
/** Line numbers of every interim-identity pin in a text. */
export const interimLines = (text) => [...text.matchAll(INTERIM_RE)].map((m) => text.slice(0, m.index).split("\n").length);
const INTERIM_FIX = `use ${SWIFT_HOME} (Swift) or pub.dev \`bithuman: ^X\` (Flutter); GitLab homebrew-bithuman is the CLI tap only`;

/** Files of the examples repository that carry pins, and the trees that never do. */
const EXAMPLE_FILE = /(\.(md|ya?ml|kts|gradle|swift|sh|pbxproj|toml)|requirements[^/]*\.txt)$/;
const EXAMPLE_SKIP = /(^|\/)(\.git|node_modules|build|\.build|\.dart_tool|Pods|DerivedData|ci|scripts)(\/|$)/;

const cmpSemver = (a, b) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

const major = (v) => Number(v.split(".")[0]);
/** A pin in a `legacy` form on an older major than versions.json: frozen on its own line. */
export const frozenLegacy = (form, ver) => Boolean(form.legacy) && major(ver) < major(V[form.key]);

/** Every pin in one examples file: {key, have, want, lags, legacy}, and the text with lagging pins
 * moved. A frozen legacy pin never lags and is never moved (see PIN_FORMS). */
export function examplePins(text) {
  const pins = [];
  let out = text;
  for (const form of EXAMPLE_FORMS) {
    const { key, re } = form;
    out = out.replace(re, (m, ver) => {
      const want = V[key];
      if (frozenLegacy(form, ver)) {
        pins.push({ key, have: ver, want, lags: false, legacy: form.legacy });
        return m;
      }
      const lags = cmpSemver(ver, want) < 0;
      pins.push({ key, have: ver, want, lags });
      // the capture is the match's LAST version: a comment between `url:` and `from:` may name one too
      const at = m.lastIndexOf(ver);
      return lags ? m.slice(0, at) + want + m.slice(at + ver.length) : m;
    });
  }
  return { pins, out };
}
const ROOTS = ["src/content", "src/pages", "src/components", "src/config", "src/partials", "src/layouts"];
const EXT = /\.(md|mdx|astro|ts|mjs)$/;

function walk(dir, out = []) {
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(n)) out.push(p);
  }
  return out;
}

const fill = (s) => s.replace(/\{v\}/g, "").replace(/\{(\w+)\}/g, (m, k) => V[k] ?? m);

/** The generated table on /downloads: one row per artifact. */
export function versionsTable() {
  const rows = VJ.artifacts.map((a) => {
    const v = V[a.key];
    const inst = a.install.replace(/\{v\}/g, v).replace(/\|/g, "\\|");
    const incl = a.includes ? ` (${fill(a.includes)})` : "";
    return `| [${a.name}](${a.docs}) | **${v}**${incl} | ${a.platforms} | \`${inst}\` | [${a.registry.replace(/\{v\}/g, v)}](${a.registry_url}) |`;
  });
  return [
    "| Artifact | Version | Runs on | Install | Published at |",
    "|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

// ── Release files (/downloads#release-files): the files of the current CLI release, read from downloads.bithuman.ai's releases.json (GitHub's /releases shape) into
// src/data/release-files.json by `--release-files --write`. The page block renders offline from
// that file, so the table is literal markdown like every pin (no fetch at build time).
const RF_SOURCE = "https://downloads.bithuman.ai/homebrew-bithuman/releases.json";
const RF_PATH = join(ROOT, "src/data/release-files.json");
const RF_ABOUT = "The files of the current CLI release on downloads.bithuman.ai, read from its releases.json by `node scripts/sync-versions.mjs --release-files --write`; /downloads renders them.";
// (CLI only: the engine files carry frozen names the served-vocabulary gate keeps off prose; the
// pages that need one link it directly.)
export const RF_KEYS = [
  { key: "cli", tag: (v) => `cli-v${v}`, label: (v) => `CLI ${v}` },
];
export function sizeLabel(n) {
  if (n >= 1e6) { const t = Math.floor(n / 1e5); return `${Math.floor(t / 10)}.${t % 10} MB`; }
  const t = Math.floor(n / 100);
  return `${Math.floor(t / 10)}.${t % 10} KB`;
}
/** release-files.json from a releases.json array, at the versions in versions.json. Throws when a
 *  release is missing, a draft or has no files: an index that answers is not one that is complete. */
export function releaseFilesFrom(rows) {
  const byTag = new Map(rows.filter((r) => r && typeof r === "object").map((r) => [r.tag_name, r]));
  const releases = RF_KEYS.map(({ key, tag, label }) => {
    const t = tag(V[key]);
    const r = byTag.get(t);
    if (!r || r.draft || !Array.isArray(r.assets) || !r.assets.length) throw new Error(`${RF_SOURCE} has no published ${t} with files`);
    const urls = new Map(r.assets.map((a) => [a.name, a.browser_download_url]));
    const files = r.assets
      .filter((a) => !/\.(sha256|checksum)$/.test(a.name))
      .map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url, sha256_url: urls.get(`${a.name}.sha256`) ?? null }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return { key, label: label(V[key]), tag: t, files };
  });
  return { schema: 1, about: RF_ABOUT, source: RF_SOURCE, releases };
}
function readReleaseFiles() {
  try { return JSON.parse(readFileSync(RF_PATH, "utf8")); } catch { return null; }
}
export function releaseFilesTable() {
  const rf = readReleaseFiles();
  if (!rf) return "(src/data/release-files.json is missing: run `node scripts/sync-versions.mjs --release-files --write`)";
  const rows = rf.releases.flatMap((r) => r.files.map((f) =>
    `| ${r.label} | [${f.name}](${f.url})${f.sha256_url ? ` · [sha256](${f.sha256_url})` : ""} | ${sizeLabel(f.size)} |`));
  return ["| Release | File | Size |", "|---|---|---|", ...rows].join("\n");
}
/** release-files.json names the releases versions.json names (else: run --release-files --write). */
function releaseFilesLag() {
  const rf = readReleaseFiles();
  if (!rf) return [];
  return RF_KEYS.filter(({ key, tag }) => (rf.releases.find((r) => r.key === key)?.tag) !== tag(V[key]))
    .map(({ key, tag }) => `src/data/release-files.json: ${key} is ${rf.releases.find((r) => r.key === key)?.tag ?? "missing"}, versions.json names ${tag(V[key])}`);
}
async function fetchReleaseFiles() {
  const r = await fetch(RF_SOURCE, { headers: { "User-Agent": "bithuman-docs-versions" } });
  if (!r.ok) throw new Error(`${RF_SOURCE} → ${r.status}`);
  return releaseFilesFrom(await r.json());
}

const BLOCKS = [
  { open: "<!-- VERSIONS:TABLE -->", close: "<!-- /VERSIONS:TABLE -->", body: versionsTable },
  { open: "<!-- RELEASE-FILES:TABLE -->", close: "<!-- /RELEASE-FILES:TABLE -->", body: releaseFilesTable },
];

export function syncText(text) {
  const changes = [];
  const legacy = [];
  let out = text;
  for (const form of PIN_FORMS) {
    const { key, re } = form;
    out = out.replace(re, (m, ver) => {
      if (ver === V[key]) return m;
      if (frozenLegacy(form, ver)) { legacy.push({ key, was: ver, move: form.legacy }); return m; }
      changes.push({ key, was: ver, now: V[key] });
      return m.replace(ver, V[key]);
    });
  }
  for (const b of BLOCKS) {
    const a = out.indexOf(b.open);
    if (a < 0) continue;
    const e = out.indexOf(b.close, a);
    if (e < 0) { changes.push({ key: b.open, was: "no close marker", now: "" }); continue; }
    const want = `${b.open}\n${b.body()}\n${b.close}`;
    const have = out.slice(a, e + b.close.length);
    if (have !== want) {
      changes.push({ key: b.open, was: "stale block", now: "regenerated" });
      out = out.slice(0, a) + want + out.slice(e + b.close.length);
    }
  }
  return { out, changes, legacy };
}

async function registries() {
  const get = async (url, kind = "json") => {
    let r;
    try {
      r = await fetch(url, { headers: { "User-Agent": "bithuman-docs-versions" } });
    } catch (e) {
      throw new Error(`${url} → ${e.cause?.code ?? e.message}`);
    }
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return kind === "json" ? r.json() : r.text();
  };
  const newest = (vs) => vs.sort((a, b) => {
    const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
    return 0;
  })[0];
  // The Android keys: maven.bithuman.ai serves ai.bithuman (scripts/maven-repo.mjs), and
  // Central no longer receives new versions, so Central's <release> would read as stale.
  const maven = async (a) => {
    const url = `${artifactUrls(BITHUMAN_GROUP, a)[0]}/maven-metadata.xml`;
    const m = (await get(url, "text")).match(/<release>([^<]+)<\/release>/);
    if (!m) throw new Error(`${url} → no <release>`);
    return m[1].trim();
  };
  // Tags from the GitLab API (public projects: no token), 100 a page: the tap's (v* for the 2.x
  // Swift package, flutter-plugin-v*, cli-v*, essence2-v*) and, from 3.0, the Swift package's own.
  const glTags = async (project) => {
    const h = { "User-Agent": "bithuman-docs-versions" };
    const out = [];
    for (let page = 1; page < 20; page++) {
      const r = await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/repository/tags?per_page=100&page=${page}`, { headers: h });
      if (!r.ok) throw new Error(`gitlab ${project} tags → ${r.status}`);
      const j = await r.json();
      out.push(...j);
      if (j.length < 100) break;
    }
    return out.map((t) => t.name);
  };
  const tags = await glTags("bithuman/sdk/homebrew-bithuman");
  const swiftTags = await glTags("bithuman/sdk/bithuman-swift"); // the Swift package: 3.x + every mirrored 2.x tag
  // Releases: downloads.bithuman.ai/<repo>/releases.json (GitHub's /releases shape, every release).
  const releases = (await get("https://downloads.bithuman.ai/homebrew-bithuman/releases.json")).filter((r) => !r.draft && !r.prerelease).map((r) => r.tag_name);
  const tagNewest = (prefix, list = tags) => newest(list.filter((t) => t.startsWith(prefix) && new RegExp(`^${prefix}${SEMVER}$`).test(t)).map((t) => t.slice(prefix.length)));
  const want = {
    python: (await get("https://pypi.org/pypi/bithuman/json")).info.version,
    livekit_plugin: (await get("https://pypi.org/pypi/livekit-plugins-bithuman/json")).info.version,
    essence2_android: await maven("essence2-android"),
    expression2_android: await maven("expression2-android"),
    cli: tagNewest("cli-v", releases),
    swift: tagNewest("v", swiftTags),
    // pub.dev from 3.0 (the git tags flutter-plugin-v2.6.x stay frozen in the archived tap)
    flutter_plugin: (await get("https://pub.dev/api/packages/bithuman")).latest.version,
  };
  // A host that answers is not a host that is complete: a releases.json without one cli-v*
  // release (or a registry that answers without a version) proves nothing, so exit 2.
  for (const [k, v] of Object.entries(want)) {
    if (!v) throw new Error(`no published ${k}${k === "cli" ? " (downloads.bithuman.ai/homebrew-bithuman/releases.json lists no cli-v* release: not fully populated)" : ""}`);
  }
  // The engines a developer gets are the ones the newest Swift package pins.
  const pkg = await get(`https://gitlab.com/bithuman/sdk/bithuman-swift/-/raw/v${want.swift}/Package.swift`, "text");
  const e2 = pkg.match(/essence2Tag\s*=\s*"essence2-v([^"]+)"/);
  const x2 = pkg.match(/expression2Tag\s*=\s*"v?([^"]+)"/);
  if (e2) want.essence2_engine = e2[1];
  if (x2) want.expression2_swift = x2[1];
  return want;
}

const args = process.argv.slice(2);

/** The examples repository's pin files: [{rel, text, path?}] from a checkout, or from main on GitLab. */
async function exampleFiles(dir) {
  if (dir) {
    const out = [];
    const walkAll = (d) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n), rel = relative(dir, p);
        if (EXAMPLE_SKIP.test(rel)) continue;
        if (statSync(p).isDirectory()) walkAll(p);
        else if (EXAMPLE_FILE.test(n)) out.push({ rel, path: p, text: readFileSync(p, "utf8") });
      }
    };
    walkAll(dir);
    return out;
  }
  // main on GitLab (a public project, no token): the recursive tree API, 100 a page, then each
  // pin file's raw bytes.
  const h = { "User-Agent": "bithuman-docs-versions" };
  const api = `https://gitlab.com/api/v4/projects/${encodeURIComponent(EXAMPLES_REPO)}/repository/tree?ref=main&recursive=true&per_page=100`;
  const all = [];
  for (let page = 1; page < 50; page++) {
    const r = await fetch(`${api}&page=${page}`, { headers: h });
    if (!r.ok) throw new Error(`gitlab tree → ${r.status}`);
    const j = await r.json();
    all.push(...j);
    if (j.length < 100) break;
  }
  const tree = all.filter((t) => t.type === "blob" && !EXAMPLE_SKIP.test(t.path) && EXAMPLE_FILE.test(t.path));
  const out = [];
  for (const t of tree) {
    const f = await fetch(`https://gitlab.com/${EXAMPLES_REPO}/-/raw/main/${t.path.split("/").map(encodeURIComponent).join("/")}`, { headers: h });
    if (!f.ok) throw new Error(`${t.path} → ${f.status}`);
    out.push({ rel: t.path, text: await f.text() });
  }
  return out;
}

if (args.includes("--examples-selftest")) {
  // every example pin form fires on a lagging pin, moves the right number, and passes a current one
  const old = "0.0.1";
  const cases = [
    ["pubspec", `  bithuman: ^${old}\n`, "flutter_plugin"],
    ["gradle", `implementation("ai.bithuman:essence2-android:${old}")`, "essence2_android"],
    ["Package.swift", `.package(url: "${SWIFT_HOME}",\n    from: "${old}")`, "swift"],
    ["project.yml", `    url: ${SWIFT_HOME}.git\n    # ${old} or newer\n    from: ${old}\n`, "swift"],
    ["pbxproj", `repositoryURL = "${SWIFT_HOME}.git";\n requirement = {\n kind = upToNextMajorVersion;\n minimumVersion = ${old};`, "swift"],
    ["setup.sh", `REL=https://downloads.bithuman.ai/homebrew-bithuman/essence2-v${old}\n`, "essence2_engine"],
  ];
  let bad = 0;
  for (const [name, text, key] of cases) {
    const { pins, out } = examplePins(text);
    const ok = pins.length === 1 && pins[0].key === key && pins[0].lags && examplePins(out).pins.every((p) => !p.lags)
      && out.includes(V[key]);
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: a lagging pin fires and --write moves it`);
  }
  // a legacy-identity pin on an older major is left exactly as it is (never moved to a version that
  // identity does not publish); on versions.json's own major it is graded like any pin
  for (const f of EXAMPLE_FORMS.filter((x) => x.legacy && major(V[x.key]) > 0)) {
    const t = f.sample(`${major(V[f.key]) - 1}.9.9`);
    const a = examplePins(t);
    const b = examplePins(f.sample(V[f.key])).pins;
    const ok = a.pins.length === 1 && a.pins[0].legacy && !a.pins[0].lags && a.out === t && syncText(t).out === t
      && b.length === 1 && !b[0].legacy && !b[0].lags;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} legacy ${f.key} ${JSON.stringify(f.sample("X").trim().slice(-40))}: an older major is left alone`);
  }
  const current = examplePins(`implementation("ai.bithuman:expression2-android:${V.expression2_android}")`).pins;
  const okCurrent = current.length === 1 && !current[0].lags;
  if (!okCurrent) bad++;
  console.log(`${okCurrent ? "ok  " : "FAIL"} a current pin passes`);
  // the interim identity is never a pin: each spelling is found (and fails a run); the brew tap line is not
  for (const [name, t, n] of [
    ["Package.swift", `.package(url: "${INTERIM_TAP}.git", from: "2.20.4")`, 1],
    ["project.yml", `    url: ${INTERIM_TAP}.git\n    from: 2.20.4\n`, 1],
    ["pbxproj", `repositoryURL = "${INTERIM_TAP}";\n requirement = {\n minimumVersion = 2.20.4;`, 1],
    ["pubspec git", `  bithuman:\n    git:\n      url: ${INTERIM_TAP}.git\n      path: packages/flutter-plugin\n`, 1],
    ["brew tap (the tap's own URL)", `brew tap bithuman/bithuman ${INTERIM_TAP}\n`, 0],
  ]) {
    const got = interimLines(t).length;
    const ok = got === n && examplePins(t).pins.length === 0 && syncText(t).out === t;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} interim ${name}: found ${got}, expected ${n}; never a pin`);
  }
  process.exit(bad ? 1 : 0);
}

if (args.includes("--examples")) {
  const i = args.indexOf("--examples");
  const dirArg = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : process.env.BITHUMAN_EXAMPLES_DIR;
  const write = args.includes("--write");
  if (write && !dirArg) { console.error("--examples --write needs a checkout (DIR or BITHUMAN_EXAMPLES_DIR)"); process.exit(64); }
  let files;
  try { files = await exampleFiles(dirArg); } catch (e) {
    console.error(`UNREACHABLE: ${e.message} — this proves nothing, exit 2`);
    process.exit(2);
  }
  let lag = 0, total = 0, legacy = 0;
  let interim = 0;
  for (const f of files) {
    const { pins, out } = examplePins(f.text);
    total += pins.length;
    for (const n of interimLines(f.text)) { interim++; console.log(`INTERIM ${f.rel}:${n}: the GitLab homebrew-bithuman as a package URL; ${INTERIM_FIX}`); }
    for (const p of pins) {
      if (p.lags) { lag++; console.log(`${write ? "wrote" : "LAGS "} ${f.rel}: ${p.key} ${p.have} → ${p.want}`); }
      else if (p.legacy) { legacy++; console.log(`legacy ${f.rel}: ${p.key} ${p.have} stays on its ${major(p.have)}.x identity (${p.want} ships at ${p.legacy}); move it by hand with the ${major(p.want)}.0 API`); }
      else if (p.have !== p.want) console.log(`ahead ${f.rel}: ${p.key} ${p.have} (versions.json ${p.want}; run --registries)`);
    }
    if (write && out !== f.text) writeFileSync(f.path, out);
  }
  const where = dirArg ? dirArg : `${EXAMPLES_REPO}@main`;
  if (total < 5) { console.error(`found only ${total} pins in ${where} — the layout moved; refusing to pass`); process.exit(2); }
  if (interim) { console.log(`\n${interim} example pin(s) on the interim GitLab homebrew-bithuman URL in ${where}; nothing can sync them.`); process.exit(1); }
  if (lag && !write) {
    console.log(`\n${lag} example pin(s) behind src/data/versions.json in ${where}. Move them in bithuman-examples ` +
      `(\`node scripts/sync-versions.mjs --examples <checkout> --write\`) in the same release run.`);
    process.exit(1);
  }
  console.log(`${write ? "synced" : "ok"}: ${total} example pins in ${where}, ${lag} ${write ? "moved" : "behind"}${legacy ? `, ${legacy} on a legacy identity (left as is)` : ""}`);
  process.exit(0);
}

if (args.includes("--release-files")) {
  // src/data/release-files.json against downloads.bithuman.ai (exit 1 = differs; --write rewrites it)
  let want;
  try { want = await fetchReleaseFiles(); } catch (e) {
    console.error(`UNREACHABLE or incomplete: ${e.message} — this proves nothing, exit 2`);
    process.exit(2);
  }
  const text = JSON.stringify(want, null, 2) + "\n";
  let have = "";
  try { have = readFileSync(RF_PATH, "utf8"); } catch { /* first run */ }
  if (have === text) { console.log(`ok: src/data/release-files.json = ${RF_SOURCE} (${want.releases.map((r) => r.tag).join(", ")})`); process.exit(0); }
  if (args.includes("--write")) {
    writeFileSync(RF_PATH, text);
    console.log(`wrote src/data/release-files.json (${want.releases.map((r) => r.tag).join(", ")}); now run \`node scripts/sync-versions.mjs --write\``);
    process.exit(0);
  }
  console.log(`DIFF src/data/release-files.json differs from ${RF_SOURCE}. Run \`node scripts/sync-versions.mjs --release-files --write\`, then \`--write\`.`);
  process.exit(1);
}

if (args.includes("--registries")) {
  let want;
  try { want = await registries(); } catch (e) {
    console.error(`UNREACHABLE: ${e.message} — this proves nothing, exit 2`);
    process.exit(2);
  }
  let bad = 0;
  try {
    const rf = JSON.stringify(await fetchReleaseFiles(), null, 2) + "\n";
    let have = "";
    try { have = readFileSync(RF_PATH, "utf8"); } catch { /* none */ }
    const ok = have === rf;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "DIFF"} ${"release-files".padEnd(20)} src/data/release-files.json ${ok ? "=" : "!="} ${RF_SOURCE}`);
  } catch (e) {
    console.error(`UNREACHABLE: ${e.message} — this proves nothing, exit 2`);
    process.exit(2);
  }
  for (const [k, v] of Object.entries(want)) {
    const ok = V[k] === v;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "DIFF"} ${k.padEnd(20)} versions.json ${V[k] ?? "(missing)"}  published ${v}`);
  }
  if (bad) {
    console.log(`\n${bad} version(s) behind what is published. Edit src/data/versions.json, then run \`node scripts/sync-versions.mjs --write\`.`);
    process.exit(1);
  }
  process.exit(0);
}

const write = args.includes("--write");
// A release bump stays ONE command (versions.json, then --write): a release-files.json that lags
// versions.json is refreshed from downloads.bithuman.ai first, so the /downloads block below renders
// the new release. The release's files must be published there before the docs bump (exit 2 until
// releases.json lists them); --release-files [--write] does the same step on its own.
if (write && releaseFilesLag().length) {
  try {
    writeFileSync(RF_PATH, JSON.stringify(await fetchReleaseFiles(), null, 2) + "\n");
    console.log(`wrote src/data/release-files.json from ${RF_SOURCE}`);
  } catch (e) {
    console.error(`UNREACHABLE or incomplete: ${e.message} — publish the release's files on downloads.bithuman.ai ` +
      `(its releases.json must list them), then rerun --write; exit 2`);
    process.exit(2);
  }
}
let drift = 0, files = 0;
let interim = 0;
for (const r of ROOTS) {
  for (const p of walk(join(ROOT, r))) {
    const rel = relative(ROOT, p);
    if (EXEMPT.some((x) => x.test(rel))) continue;
    files++;
    const text = readFileSync(p, "utf8");
    for (const n of interimLines(text)) { interim++; console.log(`INTERIM ${rel}:${n}: the GitLab homebrew-bithuman as a package URL; ${INTERIM_FIX}`); }
    const { out, changes, legacy } = syncText(text);
    for (const l of legacy) console.log(`legacy ${rel}: ${l.key} ${l.was} stays on its ${major(l.was)}.x identity (versions.json ${V[l.key]}); move it to ${l.move} by hand`);
    if (!changes.length) continue;
    drift += changes.length;
    for (const c of changes) console.log(`${write ? "wrote" : "DRIFT"} ${rel}: ${c.key} ${c.was} → ${c.now}`);
    if (write) writeFileSync(p, out);
  }
}
if (files < 20) { console.error(`read only ${files} files — the roots moved; refusing to pass`); process.exit(2); }
for (const l of releaseFilesLag()) { console.log(`DRIFT ${l} — run \`node scripts/sync-versions.mjs --write\` (it refreshes release-files.json from downloads.bithuman.ai)`); drift++; }
if (drift && write && releaseFilesLag().length) process.exit(1);
if (interim) { console.log(`\n${interim} pin(s) on the interim GitLab homebrew-bithuman URL; --write cannot move them.`); process.exit(1); }
if (drift && !write) {
  console.log(`\n${drift} pin(s) differ from src/data/versions.json. Run \`node scripts/sync-versions.mjs --write\`.`);
  process.exit(1);
}
console.log(`${write ? "synced" : "ok"}: ${files} files, ${drift} change(s)`);
