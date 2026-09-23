#!/usr/bin/env node
// Discoverability gate — the three things a crawler or an agent reaches first.
//
//   1. /llms.txt lists every page of the content collection, and nothing that
//      is not a built page (an agent reads only that file; a page missing from
//      it is invisible to one, and a line for a page that does not exist is a
//      dead end). The hub pages — src/config/hubs.ts — are listed there too,
//      with the description each one publishes, and they must be built.
//   2. Every page has at least one inbound link from a DIFFERENT built page
//      (hub, sidebar, footer, prose). check-internal-links grades outbound
//      links only, so an orphan reads green there.
//   3. With --origin <url>: every <loc> in the served sitemap answers 200 and
//      carries a <link rel=canonical> equal to itself, /sitemap-index.xml is
//      200, and so are /llms.txt and /llms-full.txt. Run it against a preview.
//
// Needs `npm run build` first (reads dist/). Pure Node, no deps. Exit 1 on
// any finding.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { routeOf as contentRoute } from "./content-routes.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "src/content/docs");
const DIST = join(ROOT, "dist");
const SITE = "https://docs.bithuman.ai";

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

if (!existsSync(join(DIST, "llms.txt"))) {
  console.error("check-discoverability: dist/llms.txt is missing — run `npm run build` first.");
  process.exit(2);
}

let failures = 0;
const fail = (msg) => { failures++; console.error(`::error::${msg}`); };

// --- 1. llms.txt vs the collection ---------------------------------------
const collection = new Set(
  walk(CONTENT, [".md"])
    .filter((f) => !/^draft:\s*true\s*$/m.test(readFileSync(f, "utf8")))
    .map((f) => contentRoute(CONTENT, f)),
);
const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
// Only the per-section blocks count as "the page list": the Start-here and
// Machine-readable bullets link a handful of pages by hand and are allowed.
const sectionBlock = llms.slice(llms.indexOf("\n## Site sections"));
const pageList = new Set(
  [...sectionBlock.matchAll(/^- \[[^\]]*\]\((https:\/\/docs\.bithuman\.ai\/[^)\s]+)\)/gm)].map((m) => m[1].slice(SITE.length)),
);
const isBuiltRoute = (route) => existsSync(join(DIST, route.replace(/^\//, ""), "index.html"));
const missing = [...collection].filter((p) => !pageList.has(p)).sort();
const extra = [...pageList].filter((p) => !collection.has(p) && !isBuiltRoute(p)).sort();
const hubs = [...pageList].filter((p) => !collection.has(p) && isBuiltRoute(p)).sort();
for (const p of missing) fail(`llms.txt: ${p} is in the content collection and not in llms.txt`);
for (const p of extra) fail(`llms.txt: ${p} is in llms.txt and is neither a content page nor a built page`);
console.log(`llms.txt: ${pageList.size} page line(s) vs ${collection.size} collection page(s) + ${hubs.length} built hub(s) — ${missing.length} missing, ${extra.length} extra`);

// --- 2. inbound links -----------------------------------------------------
const built = walk(DIST, [".html"]).filter((f) => !f.includes("/pagefind/"));
const routeOf = (f) => {
  const r = "/" + relative(DIST, f).replace(/\/?index\.html$/, "").replace(/\.html$/, "");
  return r === "/" ? "/" : r.replace(/\/$/, "");
};
const inbound = new Map(); // route -> Set(source routes)
for (const f of built) {
  const src = routeOf(f);
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const to = m[1].replace(/\/$/, "") || "/";
    if (to === src) continue;
    if (!inbound.has(to)) inbound.set(to, new Set());
    inbound.get(to).add(src);
  }
}
const orphans = [...collection].filter((p) => !(inbound.get(p)?.size > 0)).sort();
for (const p of orphans) fail(`orphan: ${p} has no inbound link from any other built page`);
console.log(`inbound links: ${collection.size - orphans.length} of ${collection.size} pages have one — ${orphans.length} orphan(s)`);

// --- 3. served sitemap + canonical (optional, needs a URL) -----------------
const originArg = process.argv.indexOf("--origin");
if (originArg !== -1) {
  const origin = process.argv[originArg + 1].replace(/\/$/, "");
  // A protected preview accepts the linked project's development token as a
  // header: `vercel env run -- node scripts/check-discoverability.mjs --origin <url>`.
  const headers = process.env.VERCEL_OIDC_TOKEN ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN } : {};
  const get = async (path) => {
    const r = await fetch(origin + path, { redirect: "manual", headers });
    return { status: r.status, type: r.headers.get("content-type") ?? "", body: r.status === 200 ? await r.text() : "" };
  };
  const sm = await get("/sitemap.xml");
  if (sm.status !== 200) fail(`${origin}/sitemap.xml → ${sm.status}`);
  const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let ok = 0;
  for (const loc of locs) {
    const path = loc.slice(SITE.length) || "/";
    const page = await get(path);
    if (page.status !== 200) { fail(`${loc} → ${page.status}`); continue; }
    const canon = page.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (canon !== loc) { fail(`${loc}: canonical is ${canon ?? "(none)"}`); continue; }
    ok++;
  }
  console.log(`sitemap: ${ok} of ${locs.length} URL(s) answer 200 with a canonical equal to themselves`);
  for (const path of ["/sitemap-index.xml", "/llms.txt", "/llms-full.txt", "/robots.txt"]) {
    const r = await get(path);
    if (r.status !== 200) fail(`${origin}${path} → ${r.status}`);
    else console.log(`${path}: 200 (${r.type})`);
  }
  const lastmod = (sm.body.match(/<lastmod>/g) ?? []).length;
  console.log(`sitemap: ${lastmod} of ${locs.length} URL(s) carry <lastmod>`);
  if (lastmod === 0) fail("sitemap: no <lastmod> at all — the build's git history was too shallow (set VERCEL_DEEP_CLONE=true on the project)");
}

if (failures) {
  console.error(`check-discoverability: FAIL — ${failures} finding(s).`);
  process.exit(1);
}
console.log("check-discoverability: OK");
