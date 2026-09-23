#!/usr/bin/env node
// ONE VERSIONS FILE (G2).
//
// src/data/versions.json holds the current published version of every bitHuman
// artifact. Every pin on the site is a copy of it, written by this script:
//
//   node scripts/sync-versions.mjs            check: exit 1 if any pin or generated block differs
//   node scripts/sync-versions.mjs --write    rewrite every pin and block from versions.json
//   node scripts/sync-versions.mjs --registries
//                                             check versions.json itself against PyPI, Maven
//                                             Central and the GitHub tags (exit 2 if unreachable)
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

const ROOT = new URL("..", import.meta.url).pathname;
const VJ = JSON.parse(readFileSync(join(ROOT, "src/data/versions.json"), "utf8"));
const V = VJ.versions;
const SEMVER = String.raw`\d+\.\d+\.\d+`;

// key → pattern with exactly one capture group: the version.
export const PIN_FORMS = [
  { key: "swift", re: new RegExp(String.raw`homebrew-bithuman(?:\.git)?"\s*,\s*(?:from:\s*|\.upToNextMajor\(from:\s*|exact:\s*)"(${SEMVER})"`, "g") },
  { key: "essence2_engine", re: new RegExp(String.raw`releases/download/essence2-v(${SEMVER})(?![\\d.])`, "g") },
  { key: "expression2_android", re: new RegExp(String.raw`ai\.bithuman:expression2-android:(${SEMVER})`, "g") },
  { key: "essence2_android", re: new RegExp(String.raw`ai\.bithuman:essence2-android:(${SEMVER})`, "g") },
  { key: "python", re: new RegExp(String.raw`(?<![\w-])bithuman(?:\[[^\]\s]*\])?==(${SEMVER})`, "g") },
  { key: "livekit_plugin", re: new RegExp(String.raw`livekit-plugins-bithuman==(${SEMVER})`, "g") },
  { key: "flutter_plugin", re: new RegExp(String.raw`ref:\s*flutter-plugin-v(${SEMVER})`, "g") },
];

const EXEMPT = [/^src\/content\/docs\/changelog/, /^src\/content\/docs\/legal\//];
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
    const r = await fetch(url, { headers: { "User-Agent": "bithuman-docs-versions" } });
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
  const maven = async (a) => (await get(`https://repo1.maven.org/maven2/ai/bithuman/${a}/maven-metadata.xml`, "text")).match(/<release>([^<]+)<\/release>/)[1];
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
