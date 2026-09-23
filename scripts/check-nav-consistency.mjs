#!/usr/bin/env node
// G8 — ONE NAVIGATION. Every content page sits in exactly one sidebar group of
// src/config/nav.ts, the header and footer read nav.ts (no hand-typed link
// lists), and every section's home resolves. Run: node scripts/check-nav-consistency.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { routeOf } from "./content-routes.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "src/content/docs");
const navSrc = readFileSync(join(ROOT, "src/config/nav.ts"), "utf8");
const fail = [];

// GROUP_ORDER, parsed from the source (no TS runtime needed)
const go = /export const GROUP_ORDER[^=]*=\s*\{([\s\S]*?)\n\};/.exec(navSrc);
if (!go) { console.log("::error::cannot read GROUP_ORDER from src/config/nav.ts"); process.exit(2); }
const groups = {};
for (const m of go[1].matchAll(/(\w+):\s*\[([^\]]*)\]/g)) groups[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
const homes = {};
for (const m of navSrc.matchAll(/(\w+):\s*\{\s*label:\s*"[^"]+",\s*home:\s*"([^"]+)"\s*\}/g)) homes[m[1]] = m[2];

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : []; });
const routes = new Set();
const TYPES = new Set(["hub", "quickstart", "platform", "endpoint", "guide", "reference", "example", "concept", "changelog", "generated"]);
let pages = 0;
for (const f of walk(CONTENT)) {
  const rel = relative(ROOT, f);
  const md = readFileSync(f, "utf8");
  const fm = (/^---\n([\s\S]*?)\n---/.exec(md) || [])[1] || "";
  if (/^draft:\s*true/m.test(fm)) continue;
  pages++;
  const get = (k) => ((new RegExp(`^${k}:\\s*"?([^"\\n]*)"?\\s*$`, "m").exec(fm)) || [])[1];
  const sec = get("section"), grp = get("group"), type = get("type");
  if (!groups[sec]) fail.push(`${rel}: section "${sec}" is not a section in nav.ts`);
  else if (!groups[sec].includes(grp)) fail.push(`${rel}: group "${grp}" is not a sidebar group of section "${sec}" (${groups[sec].join(", ")})`);
  if (!TYPES.has(type)) fail.push(`${rel}: type "${type}" is not a page template (${[...TYPES].join(", ")})`);
  const r = routeOf(CONTENT, f, md);
  if (routes.has(r)) fail.push(`${rel}: route ${r} is served by two pages`);
  routes.add(r);
}
const astroRoutes = new Set();
const walkA = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walkA(p) : n.endsWith(".astro") ? [p] : []; });
for (const f of walkA(join(ROOT, "src/pages"))) {
  const r = "/" + relative(join(ROOT, "src/pages"), f).replace(/\.astro$/, "").replace(/(^|\/)index$/, "");
  if (!r.includes("[")) astroRoutes.add(r === "/" ? "/" : r.replace(/\/$/, ""));
}
for (const [sec, home] of Object.entries(homes)) {
  if (!routes.has(home) && !astroRoutes.has(home)) fail.push(`section "${sec}" home ${home} is not a page`);
}
// header and footer derive from nav.ts
for (const c of ["src/components/Nav.astro", "src/components/Footer.astro"]) {
  const s = readFileSync(join(ROOT, c), "utf8");
  if (!/from "\.\.\/config\/nav"/.test(s)) fail.push(`${c} does not import src/config/nav.ts`);
  const hard = [...s.matchAll(/\{\s*label:\s*"[^"]+",\s*href:/g)].length;
  if (hard) fail.push(`${c} carries ${hard} hand-typed link object(s); put them in src/config/nav.ts`);
}
if (pages < 40) { console.log(`::error::read only ${pages} pages — the corpus moved`); process.exit(2); }
for (const f of fail) console.log(`::error::${f}`);
console.log(fail.length ? `\nG8: ${fail.length} navigation fault(s)` : `G8 ok: ${pages} pages, each in one sidebar group; header and footer from nav.ts`);
process.exit(fail.length ? 1 : 0);
