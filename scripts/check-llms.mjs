#!/usr/bin/env node
// G5 — THE AGENT LAYER. Run after `npm run build`:
//   node scripts/check-llms.mjs [--dist dist] [--full-max-kb 160] [--section-max-kb 96]
//
// Fails when: /llms.txt is over 60 lines or 6 KB; a docs.bithuman.ai URL in it
// does not resolve in the build (or an #anchor it names is missing); a content
// page has no .md twin; /llms-full.txt or a /llms/<section>.txt is over its size
// cap; any of them leaks an HTML comment. Internal-content hits are reported (G1).
//
// Coverage (src/lib/llms-sections.ts): every start, API, platform, guide and
// performance page is inlined in exactly one /llms/<section>.txt or listed there
// as linked-only (.md twin), and everything /llms-full.txt inlines is in a
// section file. So a page cannot drop out of the agent layer when a file is split.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { scan } from "./check-internal-content.mjs";
import { routeOf } from "./content-routes.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIST = join(ROOT, arg("--dist", "dist"));
const FULL_MAX = Number(arg("--full-max-kb", "160")) * 1024;
const SECTION_MAX = Number(arg("--section-max-kb", "96")) * 1024;
const fail = [];

if (!existsSync(join(DIST, "llms.txt"))) { console.log("::error::no dist/llms.txt — run npm run build first"); process.exit(2); }
const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
// The billing rule an agent reads first (owner ruling 2026-09-26 13:35Z): realtime
// bills active session time, talking or idle. The old "talking time / idle is free"
// wording survived in the key facts after the pages moved on; fail on it here.
for (const re of [/idle time is free/i, /\bidle is free\b/i, /pay for talking time/i, /talking time only/i]) {
  if (re.test(llms)) fail.push(`llms.txt still states the retired billing rule (${re}) — realtime bills active session time, talking or idle`);
}
const full = readFileSync(join(DIST, "llms-full.txt"), "utf8");
const lines = llms.trimEnd().split("\n").length;
if (lines > 60) fail.push(`llms.txt has ${lines} lines (cap 60)`);
if (Buffer.byteLength(llms) > 6144) fail.push(`llms.txt is ${Buffer.byteLength(llms)} B (cap 6144)`);
if (Buffer.byteLength(full) > FULL_MAX) fail.push(`llms-full.txt is ${(Buffer.byteLength(full) / 1024).toFixed(0)} KB (cap ${FULL_MAX / 1024} KB)`);

// every site URL in llms.txt resolves in the build, anchors included
const resolve = (path) => {
  const p = decodeURIComponent(path.replace(/\/$/, "")) || "/";
  for (const c of [p, `${p}.html`, `${p}/index.html`, p === "/" ? "/index.html" : null]) {
    if (c && existsSync(join(DIST, c)) && statSync(join(DIST, c)).isFile()) return join(DIST, c);
  }
  return null;
};
let urls = 0;
for (const m of llms.matchAll(/https:\/\/docs\.bithuman\.ai(\/[^\s)`>\]]*)?/g)) {
  const [path, anchor] = (m[1] || "/").split("#");
  urls++;
  const f = resolve(path);
  if (!f) { fail.push(`llms.txt links ${m[0]}, which the build does not serve`); continue; }
  if (anchor && f.endsWith(".html") && !readFileSync(f, "utf8").includes(`id="${anchor}"`)) fail.push(`llms.txt links ${m[0]}, whose anchor is missing`);
}

// every content page has a markdown twin
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : []; });
const CONTENT = join(ROOT, "src/content/docs");
let twins = 0;
for (const f of walk(CONTENT)) {
  if (/^draft:\s*true/m.test(readFileSync(f, "utf8"))) continue;
  const r = routeOf(CONTENT, f);
  if (!existsSync(join(DIST, `${r}.md`))) fail.push(`${r} has no markdown twin at ${r}.md`);
  else twins++;
}
for (const hub of ["start", "sdk", "guides", "resources", "index"]) if (!existsSync(join(DIST, `${hub}.md`))) fail.push(`hub ${hub} has no markdown twin`);

// the section files: capped, and together they cover every page an agent needs once
const SECDIR = join(DIST, "llms");
const sections = existsSync(SECDIR) ? readdirSync(SECDIR).filter((n) => n.endsWith(".txt")).sort() : [];
if (!sections.length) fail.push("no dist/llms/<section>.txt files (src/pages/llms/[section].txt.ts)");
const inlined = (text) => new Set([...text.matchAll(/^URL: https:\/\/docs\.bithuman\.ai(\/\S*)?$/gm)].map((m) => m[1] || "/"));
const where = new Map();
const secText = {};
for (const n of sections) {
  const t = readFileSync(join(SECDIR, n), "utf8");
  secText[n] = t;
  if (Buffer.byteLength(t) > SECTION_MAX) fail.push(`llms/${n} is ${(Buffer.byteLength(t) / 1024).toFixed(0)} KB (cap ${SECTION_MAX / 1024} KB)`);
  for (const r of inlined(t)) where.set(r, [...(where.get(r) || []), n]);
}
for (const [r, ns] of where) if (ns.length > 1) fail.push(`${r} is inlined in ${ns.length} section files (${ns.join(", ")})`);
for (const r of inlined(full)) if (!where.has(r)) fail.push(`llms-full.txt inlines ${r}, which no llms/<section>.txt carries`);
const linkedAll = sections.map((n) => secText[n]).join("\n");
let covered = 0;
for (const f of walk(CONTENT)) {
  const src = readFileSync(f, "utf8");
  if (/^draft:\s*true/m.test(src)) continue;
  const sec = (src.match(/^section:\s*"?(\w+)/m) || [])[1];
  const type = (src.match(/^type:\s*"?(\w+)/m) || [])[1];
  const wanted = ["start", "api", "guides", "performance"].includes(sec) || (sec === "sdk" && ["platform", "guide"].includes(type));
  if (!wanted) continue;
  const r = routeOf(CONTENT, f);
  if (where.has(r) || linkedAll.includes(`https://docs.bithuman.ai${r}.md`)) covered++;
  else fail.push(`${r} (${sec}) is in no llms/<section>.txt, inlined or linked`);
}

// no HTML comment reaches an agent; internal content is reported
for (const [name, text] of [["llms.txt", llms], ["llms-full.txt", full], ...sections.map((n) => [`llms/${n}`, secText[n]])]) {
  const noFences = text.replace(/^```[\s\S]*?^```/gm, "");
  if (/<!--/.test(noFences)) fail.push(`${name} carries an HTML comment`);
  const hits = scan(`dist/${name}`, text).filter((h) => h.name !== "html-comment-leak");
  if (hits.length) console.log(`report: ${name} has ${hits.length} internal-content hit(s): ${[...new Set(hits.map((h) => h.name))].join(", ")}`);
}

for (const f of fail) console.log(`::error::${f}`);
const kb = (t) => (Buffer.byteLength(t) / 1024).toFixed(0);
console.log(`G5: llms.txt ${lines}/60 lines, ${Buffer.byteLength(llms)}/6144 B, ${urls} URLs; llms-full.txt ${kb(full)}/${FULL_MAX / 1024} KB; ` +
  `sections ${sections.map((n) => `${n} ${kb(secText[n])}`).join(", ")} (cap ${SECTION_MAX / 1024} KB each), ${covered} pages covered; ${twins} markdown twins — ${fail.length ? `${fail.length} FAILED` : "ok"}`);
process.exit(fail.length ? 1 : 0);
