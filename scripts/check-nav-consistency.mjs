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
const TYPES = new Set(["hub", "quickstart", "platform", "recipe", "concept", "endpoint", "deploy", "guide", "reference", "example", "changelog", "generated", "legal",
  // docs v2 templates (SPEC §1, §5): the same list as src/content.config.ts
  "landing", "platform-app", "model", "troubleshooting", "catalogue", "record"]);
// docs v2 (SPEC §2, §8): a sidebar group holds 2–8 entries: its pages (a `parent:`
// child included, except the posts a hub lists instead, HUB_LISTED) plus its
// SIDEBAR_LINKS. A fault since W2b. A group that holds one entry until a later
// wave adds its pages is named here with that wave; nothing else may.
const GROUP_MIN = 2, GROUP_MAX = 8, GROUP_SIZE_FAILS = 1;
const GROUP_SIZE_ALLOW = {
  "overview / Pricing": "W4 adds /pricing/estimate",
  "platforms / Flutter": "W3 adds /platforms/flutter/app and /troubleshooting",
  "platforms / Web": "W3 adds /platforms/web/app, /webgpu and /troubleshooting",
  "platforms / LiveKit": "W3 adds /platforms/livekit/app, /troubleshooting and the cloud-avatar move",
  "platforms / REST": "SPEC §3: REST is one page (its sections point at the API reference tab)",
  "platforms / Apps": "reserved for the Windows/apps lane's split (SPEC §3)",
  "build / Conversations": "W4 adds /build/voice-agent/python and /build/barge-in",
  "deploy / Privacy & compliance": "W4 adds /deploy/privacy/retention",
};
const hubListed = [...((/export const HUB_LISTED[^=]*=\s*\[([^\]]*)\]/.exec(navSrc) || [])[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const groupCount = {};
// SIDEBAR_LINKS entries count toward their group (and an internal one must be a page)
const sl = /export const SIDEBAR_LINKS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(navSrc);
if (!sl) { console.log("::error::cannot read SIDEBAR_LINKS from src/config/nav.ts"); process.exit(2); }
const sideLinks = [];
for (const b of sl[1].matchAll(/(\w+):\s*\[([\s\S]*?)\n\s*\]/g))
  for (const m of b[2].matchAll(/group:\s*"([^"]+)",\s*label:\s*"[^"]+",\s*href:\s*"([^"]+)"/g)) {
    sideLinks.push({ sec: b[1], grp: m[1], href: m[2] });
    const key = `${b[1]} / ${m[1]}`;
    groupCount[key] = (groupCount[key] || 0) + 1;
    if (!groups[b[1]]?.includes(m[1])) fail.push(`SIDEBAR_LINKS: group "${m[1]}" is not a sidebar group of section "${b[1]}"`);
  }
const parents = [];
const sectionOf = {};
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
  // The H1 is the sidebar label: there is no second name for a page.
  if (/^label:/m.test(fm)) fail.push(`${rel}: a \`label:\` field; the H1 (title) is the sidebar label`);
  if (/^slug:/m.test(fm)) fail.push(`${rel}: a \`slug:\` override; the file path is the URL`);
  // Every page leads somewhere else in the docs.
  const body = md.slice(md.indexOf("\n---", 4) + 4);
  if (!/\]\(\/[^)\s]|href="\//.test(body) && !/^next:/m.test(fm)) fail.push(`${rel}: no link to another docs page`);
  const r = routeOf(CONTENT, f, md);
  const key = `${sec} / ${grp}`;
  const parent = get("parent");
  if (!hubListed.includes(parent)) groupCount[key] = (groupCount[key] || 0) + 1;
  sectionOf[r] = sec;
  if (parent !== undefined) parents.push({ rel, r, sec, parent });
  if (routes.has(r)) fail.push(`${rel}: route ${r} is served by two pages`);
  routes.add(r);
}
// `parent:` names a built page of the same section, one level up the URL, never itself.
for (const { rel, r, sec, parent } of parents) {
  if (parent === r) fail.push(`${rel}: parent is the page itself`);
  else if (!routes.has(parent)) fail.push(`${rel}: parent ${parent} is not a content page`);
  else if (sectionOf[parent] !== sec) fail.push(`${rel}: parent ${parent} is in section "${sectionOf[parent]}", this page in "${sec}"`);
  else if (!r.startsWith(parent + "/")) fail.push(`${rel}: parent ${parent} is not a URL prefix of ${r}`);
  else if (parents.some((p) => p.r === parent)) fail.push(`${rel}: parent ${parent} has a parent itself (one level only)`);
}
const groupWarn = Object.entries(groupCount).filter(([, n]) => n < GROUP_MIN || n > GROUP_MAX);
for (const [k, n] of groupWarn) {
  const w = `group "${k}" holds ${n} entr${n === 1 ? "y" : "ies"}; a group holds ${GROUP_MIN}–${GROUP_MAX}`;
  if (GROUP_SIZE_ALLOW[k] && n >= 1 && n < GROUP_MIN) console.log(`  allowed: ${w} — ${GROUP_SIZE_ALLOW[k]}`);
  else if (GROUP_SIZE_FAILS) fail.push(w);
  else console.log(`::warning::${w}`);
}
// an allowance that no longer applies is removed, never kept "just in case"
for (const k of Object.keys(GROUP_SIZE_ALLOW)) if ((groupCount[k] ?? 0) >= GROUP_MIN) fail.push(`GROUP_SIZE_ALLOW names "${k}", which now holds ${groupCount[k]}; remove the allowance`);
// every group of GROUP_ORDER has an entry (an empty group is a dead label)
for (const [sec, gs] of Object.entries(groups)) for (const g of gs) if (!groupCount[`${sec} / ${g}`]) fail.push(`group "${sec} / ${g}" in GROUP_ORDER holds nothing`);
const astroRoutes = new Set();
const walkA = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walkA(p) : n.endsWith(".astro") ? [p] : []; });
for (const f of walkA(join(ROOT, "src/pages"))) {
  const r = "/" + relative(join(ROOT, "src/pages"), f).replace(/\.astro$/, "").replace(/(^|\/)index$/, "");
  if (!r.includes("[")) astroRoutes.add(r === "/" ? "/" : r.replace(/\/$/, ""));
}
for (const l of sideLinks) if (l.href.startsWith("/") && !l.href.startsWith("/api/openapi") && !routes.has(l.href) && !astroRoutes.has(l.href)) fail.push(`SIDEBAR_LINKS: ${l.href} is not a page`);
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
// From W2: a card on the home page or a hub is a page, never an anchor on
// another page. A card that lands mid-page reads as a broken link, and the
// section it pointed at moves with every rewrite. The sources that define
// home and hub cards are graded; a menu or an inline link may still use one.
const CARD_SOURCES = ["src/data/home.ts", "src/data/platforms.ts", "src/data/deployments.ts", "src/data/perf-band.ts", "src/config/hubs.ts",
  "src/pages/index.astro", "src/pages/platforms/index.astro", "src/pages/build/index.astro", "src/pages/resources/index.astro", "src/components/SectionHub.astro", "src/components/Hub.astro"];
let cardTargets = 0;
for (const rel of CARD_SOURCES) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  const lines = readFileSync(p, "utf8").split("\n");
  lines.forEach((l, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    for (const m of l.matchAll(/\b(?:href|docs):\s*["'`](\/[^"'`]*)["'`]|<Card[^>]*\bhref=["'](\/[^"']*)["']/g)) {
      const target = m[1] ?? m[2];
      cardTargets++;
      if (target.includes("#")) fail.push(`${rel}:${i + 1}: a card targets the anchor ${target}; link the page itself`);
    }
  });
}
if (cardTargets < 20) fail.push(`card sources yielded only ${cardTargets} targets — the extractor stopped seeing cards`);

if (pages < 40) { console.log(`::error::read only ${pages} pages — the corpus moved`); process.exit(2); }
for (const f of fail) console.log(`::error::${f}`);
console.log(fail.length ? `\nG8: ${fail.length} navigation fault(s)` : `G8 ok: ${pages} pages, each in one sidebar group; header and footer from nav.ts; ${cardTargets} home and hub card targets, none an anchor`);
process.exit(fail.length ? 1 : 0);
