#!/usr/bin/env node
// The redirects in vercel.json are generated from scripts/ia-map.json, so a
// moved page, a re-pointed legacy URL and a short URL are one row each, and
// nothing is typed twice.
//
//   node scripts/gen-redirects.mjs          # rewrite vercel.json's redirects
//   node scripts/gen-redirects.mjs --check  # fail when vercel.json differs from the map
//
// Rules (each one fails the run):
//   * every destination is a page this repo builds (an `interim` is used while
//     the final page is not built yet);
//   * no chain: a destination is never itself a redirect source;
//   * no shadow: a source is never a page (a legacy source that became a page
//     is dropped, and listed);
//   * every source has its trailing-slash twin.
// Anchors are checked against the built HTML by scripts/check-redirects.mjs.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { routeOf } from "./content-routes.mjs";

const ROOT = join(import.meta.dirname, "..");
const CONTENT = join(ROOT, "src/content/docs");
const PAGES = join(ROOT, "src/pages");
const MAP = JSON.parse(readFileSync(join(ROOT, "scripts/ia-map.json"), "utf8"));

const walk = (d, ext) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p, ext) : n.endsWith(ext) ? [p] : [];
});

/** Every route this repo builds as a page (plus the generated agent files). */
export function builtRoutes() {
  const r = new Set();
  for (const f of walk(CONTENT, ".md")) {
    const md = readFileSync(f, "utf8");
    if (/^draft:\s*true/m.test((/^---\n([\s\S]*?)\n---/.exec(md) || [])[1] || "")) continue;
    r.add(routeOf(CONTENT, f, md));
  }
  for (const f of walk(PAGES, ".astro")) {
    const rel = relative(PAGES, f).replace(/\.astro$/, "");
    if (rel.includes("[")) continue;
    const route = "/" + rel.replace(/(^|\/)index$/, "");
    r.add(route === "/" ? "/" : route.replace(/\/$/, ""));
  }
  // endpoints that write one file (/changelog.xml, /versions.json, …)
  for (const f of walk(PAGES, ".ts")) {
    const rel = relative(PAGES, f).replace(/\.ts$/, "");
    if (rel.includes("[") || !/\.[a-z]+$/.test(rel)) continue;
    r.add("/" + rel);
  }
  const llms = readFileSync(join(ROOT, "src/lib/llms-sections.ts"), "utf8");
  for (const m of llms.matchAll(/^\s*id:\s*"([a-z-]+)",\s*title:/gm)) r.add(`/llms/${m[1]}.txt`);
  for (const f of ["/llms.txt", "/llms-full.txt"]) r.add(f);
  return r;
}

const pathOf = (d) => (d.split("#")[0].replace(/\/+$/, "") || "/");
const external = (d) => /^https?:\/\//.test(d);

export function generate() {
  const built = builtRoutes();
  const errors = [];
  const dropped = [];
  const pick = (row, where) => {
    const final = row.new;
    if (built.has(pathOf(final))) return final;
    if (row.interim && built.has(pathOf(row.interim))) return row.interim;
    errors.push(`${where} ${row.source ?? row.old}: neither ${final}${row.interim ? ` nor the interim ${row.interim}` : ""} is a built page`);
    return null;
  };

  // source -> { destination, permanent }
  const dest = new Map();
  const set = (src, d, permanent = true, from = "") => {
    if (!d) return;
    if (built.has(src)) {
      if (from === "legacy") { dropped.push(src); return; }
      errors.push(`${from} source ${src} is a page, so a redirect there would hide it`);
      return;
    }
    dest.set(src, { destination: d, permanent });
  };
  for (const m of MAP.moves) set(m.old, pick({ ...m, source: m.old }, "move"), true, "move");
  for (const l of MAP.legacy) {
    if (dest.has(l.source)) continue;
    // Internal redirects are all permanent (308); an external one keeps what it had.
    set(l.source, l.destination, external(l.destination) ? l.permanent !== false : true, "legacy");
  }
  for (const r of MAP.repoint) set(r.source, pick(r, "repoint"), true, "repoint");
  for (const s of MAP.short) set(s.source, pick(s, "short"), true, "short");
  // A moved media file: the destination is a file this repo publishes, not a page.
  const assets = new Set();
  for (const a of MAP.assets ?? []) {
    if (!existsSync(join(ROOT, "public", a.new)) || !statSync(join(ROOT, "public", a.new)).isFile()) { errors.push(`asset ${a.source}: ${a.new} is not a file in public/`); continue; }
    if (existsSync(join(ROOT, "public", a.source))) { errors.push(`asset ${a.source} is still a file in public/, so the redirect would never run`); continue; }
    dest.set(a.source, { destination: a.new, permanent: true });
    assets.add(a.source);
  }

  // Collapse chains: follow a destination that is itself a source.
  for (const [src, v] of dest) {
    let d = v.destination, hops = 0;
    while (!external(d) && dest.has(pathOf(d)) && hops < 10) {
      const next = dest.get(pathOf(d)).destination;
      const frag = d.includes("#") ? d.slice(d.indexOf("#")) : "";
      d = next.includes("#") || !frag ? next : next + frag;
      hops++;
    }
    if (hops >= 10) errors.push(`redirect loop at ${src}`);
    v.destination = d;
  }
  for (const [src, v] of dest) {
    if (external(v.destination) || assets.has(src)) continue;
    if (!built.has(pathOf(v.destination))) errors.push(`${src} -> ${v.destination}: not a built page`);
  }

  const out = [];
  for (const src of [...dest.keys()].sort()) {
    const { destination, permanent } = dest.get(src);
    out.push({ source: src, destination, permanent });
    if (src !== "/") out.push({ source: src + "/", destination, permanent });
  }
  return { redirects: out, errors, dropped: [...new Set(dropped)].sort(), built };
}

function main() {
  const { redirects, errors, dropped } = generate();
  for (const e of errors) console.log(`::error::${e}`);
  if (errors.length) { console.log(`gen-redirects: ${errors.length} error(s)`); process.exit(1); }
  const vpath = join(ROOT, "vercel.json");
  const vercel = JSON.parse(readFileSync(vpath, "utf8"));
  const next = { ...vercel, redirects };
  const text = JSON.stringify(next, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(vpath, "utf8") !== text) {
      console.log("::error file=vercel.json::the redirects differ from scripts/ia-map.json. Run `node scripts/gen-redirects.mjs` and commit vercel.json.");
      process.exit(1);
    }
    console.log(`redirects ok: ${redirects.length} entries (${redirects.filter((r) => !r.source.endsWith("/")).length} sources), no chains, no shadows, every destination built`);
    return;
  }
  writeFileSync(vpath, text);
  console.log(`wrote ${redirects.length} redirects to vercel.json`);
  if (dropped.length) console.log(`dropped legacy sources that are pages now: ${dropped.join(", ")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
