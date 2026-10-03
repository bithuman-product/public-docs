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
//                                             keys) and the GitHub tags (exit 2 if unreachable)
//   node scripts/sync-versions.mjs --examples [DIR] [--write]
//                                             check the pins in bithuman-examples (a checkout at DIR,
//                                             or $BITHUMAN_EXAMPLES_DIR; else main on GitHub, exit 2
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

// key → pattern with exactly one capture group: the version.
export const PIN_FORMS = [
  { key: "swift", re: new RegExp(String.raw`homebrew-bithuman(?:\.git)?"\s*,\s*(?:from:\s*|\.upToNextMajor\(from:\s*|exact:\s*)"(${SEMVER})"`, "g") },
  { key: "essence2_engine", re: new RegExp(String.raw`releases/(?:download|tag)/essence2-v(${SEMVER})(?![\\d.])`, "g") },
  { key: "expression2_android", re: new RegExp(String.raw`ai\.bithuman:expression2-android:(${SEMVER})`, "g") },
  { key: "essence2_android", re: new RegExp(String.raw`ai\.bithuman:essence2-android:(${SEMVER})`, "g") },
  { key: "python", re: new RegExp(String.raw`(?<![\w-])bithuman(?:\[[^\]\s]*\])?==(${SEMVER})`, "g") },
  { key: "livekit_plugin", re: new RegExp(String.raw`livekit-plugins-bithuman==(${SEMVER})`, "g") },
  { key: "cli", re: new RegExp(String.raw`"cli"\s*:\s*"(${SEMVER})"`, "g") },
  { key: "flutter_plugin", re: new RegExp(String.raw`ref:\s*flutter-plugin-v(${SEMVER})`, "g") },
];

const EXEMPT = [/^src\/content\/docs\/changelog/, /^src\/content\/docs\/legal\//];

// The examples repository pins the same artifacts in two more forms: an xcodegen `project.yml`
// (`url: …homebrew-bithuman.git` then `from: 2.20.1`, comment lines allowed between) and the
// committed Xcode project (`minimumVersion = 2.20.1;` under the package's repositoryURL).
export const EXAMPLE_FORMS = [
  ...PIN_FORMS,
  { key: "swift", re: new RegExp(String.raw`homebrew-bithuman(?:\.git)?[ \t]*\n(?:[ \t]*#[^\n]*\n)*[ \t]*from:[ \t]*"?(${SEMVER})"?`, "g") },
  { key: "swift", re: new RegExp(String.raw`homebrew-bithuman(?:\.git)?";[^}]*?minimumVersion = (${SEMVER});`, "g") },
];
const EXAMPLES_REPO = "bithuman-product/bithuman-examples";
/** Files of the examples repository that carry pins, and the trees that never do. */
const EXAMPLE_FILE = /(\.(md|ya?ml|kts|gradle|swift|sh|pbxproj|toml)|requirements[^/]*\.txt)$/;
const EXAMPLE_SKIP = /(^|\/)(\.git|node_modules|build|\.build|\.dart_tool|Pods|DerivedData|ci|scripts)(\/|$)/;

const cmpSemver = (a, b) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

/** Every pin in one examples file: {key, have, want, lags}, and the text with lagging pins moved. */
export function examplePins(text) {
  const pins = [];
  let out = text;
  for (const { key, re } of EXAMPLE_FORMS) {
    out = out.replace(re, (m, ver) => {
      const want = V[key];
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

const BLOCKS = [{ open: "<!-- VERSIONS:TABLE -->", close: "<!-- /VERSIONS:TABLE -->", body: versionsTable }];

export function syncText(text) {
  const changes = [];
  let out = text;
  for (const { key, re } of PIN_FORMS) {
    out = out.replace(re, (m, ver) => {
      if (ver === V[key]) return m;
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
  return { out, changes };
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
  const gh = async (path) => {
    const h = { "User-Agent": "bithuman-docs-versions", Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const out = [];
    for (let page = 1; page < 20; page++) {
      const r = await fetch(`https://api.github.com/repos/bithuman-product/homebrew-bithuman/${path}?per_page=100&page=${page}`, { headers: h });
      if (!r.ok) throw new Error(`github ${path} → ${r.status}`);
      const j = await r.json();
      out.push(...j);
      if (j.length < 100) break;
    }
    return out;
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
  const tags = (await gh("tags")).map((t) => t.name);
  const releases = (await gh("releases")).filter((r) => !r.draft && !r.prerelease).map((r) => r.tag_name);
  const tagNewest = (prefix, list = tags) => newest(list.filter((t) => t.startsWith(prefix) && new RegExp(`^${prefix}${SEMVER}$`).test(t)).map((t) => t.slice(prefix.length)));
  const want = {
    python: (await get("https://pypi.org/pypi/bithuman/json")).info.version,
    livekit_plugin: (await get("https://pypi.org/pypi/livekit-plugins-bithuman/json")).info.version,
    essence2_android: await maven("essence2-android"),
    expression2_android: await maven("expression2-android"),
    cli: tagNewest("cli-v", releases),
    swift: tagNewest("v"),
    flutter_plugin: tagNewest("flutter-plugin-v"),
  };
  // The engines a developer gets are the ones the newest Swift package pins.
  const pkg = await get(`https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/v${want.swift}/Package.swift`, "text");
  const e2 = pkg.match(/essence2Tag\s*=\s*"essence2-v([^"]+)"/);
  const x2 = pkg.match(/expression2Tag\s*=\s*"v?([^"]+)"/);
  if (e2) want.essence2_engine = e2[1];
  if (x2) want.expression2_swift = x2[1];
  return want;
}

const args = process.argv.slice(2);

/** The examples repository's pin files: [{rel, text, path?}] from a checkout, or from main on GitHub. */
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
  const h = { "User-Agent": "bithuman-docs-versions", Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/repos/${EXAMPLES_REPO}/git/trees/main?recursive=1`, { headers: h });
  if (!r.ok) throw new Error(`github tree → ${r.status}`);
  const tree = (await r.json()).tree.filter((t) => t.type === "blob" && !EXAMPLE_SKIP.test(t.path) && EXAMPLE_FILE.test(t.path));
  const out = [];
  for (const t of tree) {
    const f = await fetch(`https://raw.githubusercontent.com/${EXAMPLES_REPO}/main/${t.path}`, { headers: { "User-Agent": h["User-Agent"] } });
    if (!f.ok) throw new Error(`${t.path} → ${f.status}`);
    out.push({ rel: t.path, text: await f.text() });
  }
  return out;
}

if (args.includes("--examples-selftest")) {
  // every example pin form fires on a lagging pin, moves the right number, and passes a current one
  const old = "0.0.1";
  const cases = [
    ["pubspec", `      ref: flutter-plugin-v${old}\n`, "flutter_plugin"],
    ["gradle", `implementation("ai.bithuman:essence2-android:${old}")`, "essence2_android"],
    ["Package.swift", `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git",\n    from: "${old}")`, "swift"],
    ["project.yml", `    url: https://github.com/bithuman-product/homebrew-bithuman.git\n    # ${old} or newer\n    from: ${old}\n`, "swift"],
    ["pbxproj", `repositoryURL = "https://github.com/bithuman-product/homebrew-bithuman.git";\n requirement = {\n kind = upToNextMajorVersion;\n minimumVersion = ${old};`, "swift"],
    ["setup.sh", `REL=https://github.com/bithuman-product/homebrew-bithuman/releases/download/essence2-v${old}\n`, "essence2_engine"],
  ];
  let bad = 0;
  for (const [name, text, key] of cases) {
    const { pins, out } = examplePins(text);
    const ok = pins.length === 1 && pins[0].key === key && pins[0].lags && examplePins(out).pins.every((p) => !p.lags)
      && out.includes(V[key]);
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: a lagging pin fires and --write moves it`);
  }
  const current = examplePins(`implementation("ai.bithuman:expression2-android:${V.expression2_android}")`).pins;
  const okCurrent = current.length === 1 && !current[0].lags;
  if (!okCurrent) bad++;
  console.log(`${okCurrent ? "ok  " : "FAIL"} a current pin passes`);
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
  let lag = 0, total = 0;
  for (const f of files) {
    const { pins, out } = examplePins(f.text);
    total += pins.length;
    for (const p of pins) {
      if (p.lags) { lag++; console.log(`${write ? "wrote" : "LAGS "} ${f.rel}: ${p.key} ${p.have} → ${p.want}`); }
      else if (p.have !== p.want) console.log(`ahead ${f.rel}: ${p.key} ${p.have} (versions.json ${p.want}; run --registries)`);
    }
    if (write && out !== f.text) writeFileSync(f.path, out);
  }
  const where = dirArg ? dirArg : `${EXAMPLES_REPO}@main`;
  if (total < 5) { console.error(`found only ${total} pins in ${where} — the layout moved; refusing to pass`); process.exit(2); }
  if (lag && !write) {
    console.log(`\n${lag} example pin(s) behind src/data/versions.json in ${where}. Move them in bithuman-examples ` +
      `(\`node scripts/sync-versions.mjs --examples <checkout> --write\`) in the same release run.`);
    process.exit(1);
  }
  console.log(`${write ? "synced" : "ok"}: ${total} example pins in ${where}, ${lag} ${write ? "moved" : "behind"}`);
  process.exit(0);
}

if (args.includes("--registries")) {
  let want;
  try { want = await registries(); } catch (e) {
    console.error(`UNREACHABLE: ${e.message} — this proves nothing, exit 2`);
    process.exit(2);
  }
  let bad = 0;
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
let drift = 0, files = 0;
for (const r of ROOTS) {
  for (const p of walk(join(ROOT, r))) {
    const rel = relative(ROOT, p);
    if (EXEMPT.some((x) => x.test(rel))) continue;
    files++;
    const text = readFileSync(p, "utf8");
    const { out, changes } = syncText(text);
    if (!changes.length) continue;
    drift += changes.length;
    for (const c of changes) console.log(`${write ? "wrote" : "DRIFT"} ${rel}: ${c.key} ${c.was} → ${c.now}`);
    if (write) writeFileSync(p, out);
  }
}
if (files < 20) { console.error(`read only ${files} files — the roots moved; refusing to pass`); process.exit(2); }
if (drift && !write) {
  console.log(`\n${drift} pin(s) differ from src/data/versions.json. Run \`node scripts/sync-versions.mjs --write\`.`);
  process.exit(1);
}
console.log(`${write ? "synced" : "ok"}: ${files} files, ${drift} change(s)`);
