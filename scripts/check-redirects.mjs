#!/usr/bin/env node
// Every redirect in vercel.json lands on a page the build serves, and on an
// anchor that page has. Run after `npm run build`.
//
//   node scripts/check-redirects.mjs            # vercel.json against dist/
//   node scripts/check-redirects.mjs --selftest # the checker's own arms fire
//
// scripts/gen-redirects.mjs --check guards the rest (generated from the map,
// no chains, no shadows, twins).
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");

function served(dist, path) {
  const p = decodeURIComponent(path.replace(/\/$/, "")) || "/";
  for (const c of [p, `${p}.html`, `${p}/index.html`, p === "/" ? "/index.html" : null]) {
    if (c && existsSync(join(dist, c)) && statSync(join(dist, c)).isFile()) return join(dist, c);
  }
  return null;
}

export function grade(redirects, dist) {
  const faults = [];
  const sources = new Set(redirects.map((r) => r.source));
  const html = new Map();
  for (const r of redirects) {
    const d = r.destination;
    if (/^https?:\/\//.test(d)) continue;
    const [path, anchor] = d.split("#");
    if (sources.has(path) || sources.has(path + "/")) { faults.push(`${r.source} -> ${d}: a chain (the destination redirects again)`); continue; }
    const f = served(dist, path);
    if (!f) { faults.push(`${r.source} -> ${d}: the build serves no ${path}`); continue; }
    if (served(dist, r.source.replace(/\/$/, "")) && r.source !== "/") faults.push(`${r.source} is also a built page; the redirect hides it`);
    if (anchor && f.endsWith(".html")) {
      if (!html.has(f)) html.set(f, readFileSync(f, "utf8"));
      if (!html.get(f).includes(`id="${anchor}"`)) faults.push(`${r.source} -> ${d}: ${path} has no #${anchor}`);
    }
  }
  return faults;
}

function selftest() {
  const fx = join(ROOT, "scripts", "fixtures", "redirects");
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); return cond ? 0 : 1; };
  let bad = 0;
  bad += ok("a redirect to a served page with its anchor passes", grade([{ source: "/old", destination: "/page#here" }], fx).length === 0);
  bad += ok("a missing page fires", grade([{ source: "/old", destination: "/nope" }], fx).some((f) => f.includes("serves no")));
  bad += ok("a missing anchor fires", grade([{ source: "/old", destination: "/page#gone" }], fx).some((f) => f.includes("no #gone")));
  bad += ok("a chain fires", grade([{ source: "/a", destination: "/b" }, { source: "/b", destination: "/page" }], fx).some((f) => f.includes("chain")));
  bad += ok("a source that is a page fires", grade([{ source: "/page", destination: "/other" }], fx).some((f) => f.includes("hides it")));
  bad += ok("an external destination is not graded", grade([{ source: "/status", destination: "https://status.example" }], fx).length === 0);
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  if (!existsSync(join(DIST, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); return 2; }
  const { redirects } = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  const faults = grade(redirects, DIST);
  for (const f of faults) console.log(`::error file=vercel.json::${f}`);
  console.log(faults.length ? `redirects: ${faults.length} fault(s)` : `redirects ok: ${redirects.length} entries land on built pages and anchors`);
  return faults.length ? 1 : 0;
}
process.exit(main());
