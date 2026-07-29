#!/usr/bin/env node
// Static internal-link checker for the docs content.
//
// Round-2 audit found several dead in-site links (e.g. /sdk/kotlin when the
// page is /sdk/android, /concepts/pricing when it's /guides/pricing). Those
// rot silently because nothing resolves them. This script collects every
// valid route, then flags any markdown link to an internal /route that does
// not resolve — failing CI so link rot is caught in the PR.
//
// Valid routes come from two places (mirrors astro.config + [...slug].astro):
//   1. content collection: src/content/docs/**/*.md  ->  /<path-minus-.md>
//   2. explicit pages:      src/pages/**/*.astro      ->  /<path> (index -> dir)
//
// Pure Node, no deps. Exit 1 on any unresolved internal link.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "src/content/docs");
const PAGES = join(ROOT, "src/pages");

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

// --- 0. Heading slugs, so #fragments can be resolved too ---
// A link's fragment was captured but never checked, so a heading rename broke
// every deep link to it in silence. The 2026-07-28 audit found 5 such dead
// fragments plus two headings that had tried to pin an id with the
// `## Title {#custom-id}` syntax — which Astro's markdown does NOT support, so
// the literal `{#custom-id}` rendered into the visible heading text and the id
// became `title-custom-id`.
//
// Slugs are derived from source (no build needed). The rule below is
// github-slugger's, which is what rehype-slug applies: lowercase, drop
// everything except word chars / hyphen / space, then spaces to hyphens.
// Calibrated 2026-07-28 against a real `npm run build`: 581 source headings,
// 0 disagreements with the rendered ids.
function slugify(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // link text only
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "")
    .replace(/ /g, "-");
}

function headingSlugs(md) {
  const out = new Set();
  let fenced = false;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const m = /^(#{2,6})\s+(.*?)\s*$/.exec(line);
    if (m) out.add(slugify(m[2]));
  }
  return out;
}

// --- 1. Build the set of valid routes ---
const routes = new Set(["/"]);
// route -> Set(heading slug). Only for content-collection pages: routes backed
// by an .astro page (e.g. /api/reference, which renders the OpenAPI spec on the
// client) have no headings we can see from source, so their fragments are not
// checked rather than guessed at.
const anchors = new Map();
const customIdHeadings = [];

for (const f of walk(CONTENT, [".md", ".mdx"])) {
  const slug = relative(CONTENT, f).replace(/\.mdx?$/, "");
  routes.add("/" + slug);
  const md = readFileSync(f, "utf8");
  anchors.set("/" + slug, headingSlugs(md));
  for (const m of md.matchAll(/^#{2,6}\s+.*(\{#[^}]+\}).*$/gm)) {
    customIdHeadings.push({ file: relative(ROOT, f), snippet: m[1] });
  }
}

for (const f of walk(PAGES, [".astro"])) {
  let r = relative(PAGES, f).replace(/\.astro$/, "");
  if (r.includes("[")) continue; // dynamic route ([...slug]) — covered by content
  r = r.replace(/\/index$/, "").replace(/^index$/, "");
  routes.add("/" + r);
}

// --- 1b. Load the vercel.json redirect map ---
// Redirects are part of the routing surface: a destination that resolves
// nowhere is redirect rot, and a content link that points at a redirect
// SOURCE works via a 308 but should point at the canonical page instead.
const redirects = new Map(); // source -> destination
try {
  const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  for (const r of vercel.redirects ?? []) redirects.set(r.source, r.destination);
} catch {
  /* no vercel.json — nothing to check */
}

const redirectFailures = [];
for (const [source, destination] of redirects) {
  if (source.includes(":") || source.includes("*")) continue; // dynamic patterns
  if (routes.has(source)) {
    redirectFailures.push(
      `redirect source ${source} shadows a real page (the page becomes unreachable)`
    );
  }
  const dest = destination.replace(/\/$/, "") || "/";
  if (!routes.has(dest) && !redirects.has(dest)) {
    redirectFailures.push(`redirect ${source} -> ${destination} points at no known route`);
  }
}

// --- 2. Scan markdown for internal links and validate ---
// Route is optional so same-page links -- ](#section) -- are checked too.
const LINK_RE = /\]\((\/[^)\s#]*)?(#[^)\s]*)?\)/g;
const failures = [];
const anchorFailures = [];
let anchorsChecked = 0;

for (const f of walk(CONTENT, [".md", ".mdx"])) {
  const text = readFileSync(f, "utf8");
  const selfRoute = "/" + relative(CONTENT, f).replace(/\.mdx?$/, "");
  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    const frag = m[2] ? m[2].slice(1) : "";
    if (m[1] === undefined && !frag) continue; // ](...) with neither — not ours
    let target = (m[1] ?? selfRoute).replace(/\/$/, "");
    if (target === "") target = "/";
    // ignore links to static assets (have a file extension) and external-ish
    if (/\.[a-z0-9]{2,4}$/i.test(target)) continue;
    if (!routes.has(target)) {
      const note = redirects.has(target)
        ? ` (redirects to ${redirects.get(target)} — link the canonical page instead)`
        : "";
      failures.push({ file: relative(ROOT, f), target, note });
      continue;
    }
    // Fragment: only resolvable for content pages (see `anchors` above).
    if (frag && anchors.has(target)) {
      anchorsChecked++;
      if (!anchors.get(target).has(frag)) {
        anchorFailures.push({
          file: relative(ROOT, f),
          target: `${target}#${frag}`,
          known: [...anchors.get(target)],
        });
      }
    }
  }
}

// `## Title {#custom-id}` is not supported by Astro's markdown: the literal
// braces render into the heading text and the id becomes `title-custom-id`.
for (const { file, snippet } of customIdHeadings) {
  anchorFailures.push({
    file,
    target: snippet,
    known: null,
    custom: true,
  });
}

// --- 3. Report ---
if (failures.length || redirectFailures.length || anchorFailures.length) {
  if (anchorFailures.length) {
    console.error(`Found ${anchorFailures.length} broken anchor(s):\n`);
    for (const { file, target, known, custom } of anchorFailures) {
      const msg = custom
        ? `${target} — Astro's markdown does not support custom heading ids; ` +
          `the braces render into the visible heading text. Delete it and link the natural slug.`
        : `${target} — no heading on that page produces this id` +
          (known && known.length ? ` (page has: ${known.join(", ")})` : "");
      console.error(`  ${file}  ->  ${msg}`);
      console.error(`    ::error file=${file}::broken anchor ${target}`);
    }
    console.error("");
  }
  if (failures.length) {
    console.error(`Found ${failures.length} broken internal link(s):\n`);
    for (const { file, target, note } of failures) {
      console.error(`  ${file}  ->  ${target}${note}`);
      console.error(`    ::error file=${file}::broken internal link ${target}${note}`);
    }
  }
  if (redirectFailures.length) {
    console.error(`\nFound ${redirectFailures.length} vercel.json redirect problem(s):\n`);
    for (const msg of redirectFailures) {
      console.error(`  ${msg}`);
      console.error(`    ::error file=vercel.json::${msg}`);
    }
  }
  console.error(
    `\nFix the link or add the page. Valid routes (${routes.size}):\n  ` +
      [...routes].sort().join("\n  ")
  );
  process.exit(1);
}

if (anchorsChecked === 0) {
  console.error(
    "No #fragment links were resolved at all — the anchor check would pass " +
      "vacuously, which is indistinguishable from it not running."
  );
  process.exit(1);
}

console.log(
  `OK — all internal links resolve (${routes.size} routes known, ` +
    `${redirects.size} redirects checked, ${anchorsChecked} anchors resolved).`
);
