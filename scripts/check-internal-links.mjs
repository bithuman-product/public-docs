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

// --- 1. Build the set of valid routes ---
const routes = new Set(["/"]);

for (const f of walk(CONTENT, [".md", ".mdx"])) {
  const slug = relative(CONTENT, f).replace(/\.mdx?$/, "");
  routes.add("/" + slug);
}

for (const f of walk(PAGES, [".astro"])) {
  let r = relative(PAGES, f).replace(/\.astro$/, "");
  if (r.includes("[")) continue; // dynamic route ([...slug]) — covered by content
  r = r.replace(/\/index$/, "").replace(/^index$/, "");
  routes.add("/" + r);
}

// --- 2. Scan markdown for internal links and validate ---
const LINK_RE = /\]\((\/[^)\s#]*)(#[^)\s]*)?\)/g;
const failures = [];

for (const f of walk(CONTENT, [".md", ".mdx"])) {
  const text = readFileSync(f, "utf8");
  let m;
  while ((m = LINK_RE.exec(text)) !== null) {
    let target = m[1].replace(/\/$/, "");
    if (target === "") target = "/";
    // ignore links to static assets (have a file extension) and external-ish
    if (/\.[a-z0-9]{2,4}$/i.test(target)) continue;
    if (!routes.has(target)) {
      failures.push({ file: relative(ROOT, f), target });
    }
  }
}

// --- 3. Report ---
if (failures.length) {
  console.error(`Found ${failures.length} broken internal link(s):\n`);
  for (const { file, target } of failures) {
    console.error(`  ${file}  ->  ${target}`);
    console.error(`    ::error file=${file}::broken internal link ${target}`);
  }
  console.error(
    `\nFix the link or add the page. Valid routes (${routes.size}):\n  ` +
      [...routes].sort().join("\n  ")
  );
  process.exit(1);
}

console.log(
  `OK — all internal links resolve (${routes.size} routes known).`
);
