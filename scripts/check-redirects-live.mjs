#!/usr/bin/env node
// After a deploy: every redirect source answers exactly one 308 straight to
// its destination, and the destination answers 200. A trailing-slash twin
// ("/x/") may first take the platform's own 308 to "/x" (trailingSlash: false). Every URL of the sitemap
// from before the 2026-09 IA change (scripts/ia-map.json) still answers 200,
// or one 308 and then 200.
//
//   node scripts/check-redirects-live.mjs [--origin https://docs.bithuman.ai]
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const origin = (args[args.indexOf("--origin") + 1] && args.includes("--origin") ? args[args.indexOf("--origin") + 1] : "https://docs.bithuman.ai").replace(/\/$/, "");
const { redirects } = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
const { sitemap_2026_09: sitemap } = JSON.parse(readFileSync(join(ROOT, "scripts/ia-map.json"), "utf8"));

const head = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "bithuman-docs-redirect-check" } });
      return { status: r.status, location: r.headers.get("location") };
    } catch (e) { if (i === 2) return { status: 0, location: null, error: String(e) }; }
  }
};
const abs = (loc) => (loc ? new URL(loc, origin + "/").href : null);

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

const faults = [];
const destOk = new Map();
const landing = async (url) => {
  const key = url.split("#")[0];
  if (!destOk.has(key)) destOk.set(key, head(key).then((r) => r.status));
  return destOk.get(key);
};

await pool(redirects, 8, async (r) => {
  const external = /^https?:\/\//.test(r.destination);
  const res = await head(origin + r.source);
  const want = external ? r.destination : origin + r.destination;
  const okStatus = r.permanent ? res.status === 308 : [307, 308].includes(res.status);
  if (!okStatus) { faults.push(`${r.source}: ${res.status || res.error}, not ${r.permanent ? 308 : "a redirect"}`); return; }
  if (abs(res.location) !== new URL(want).href) {
    // vercel.json's `trailingSlash: false` answers "/x/" with its own 308 to "/x"
    // before the redirect table is read; the bare source then makes the one hop.
    const bare = r.source.replace(/\/$/, "");
    if (r.source.endsWith("/") && abs(res.location) === new URL(origin + bare).href) {
      const hop = await head(origin + bare);
      if (hop.status === (r.permanent ? 308 : hop.status) && abs(hop.location) === new URL(want).href) {
        if (external) return;
        const s2 = await landing(want);
        if (s2 !== 200) faults.push(`${r.source} -> ${r.destination}: the destination answers ${s2}`);
        return;
      }
    }
    faults.push(`${r.source}: -> ${res.location}, not ${r.destination}`);
    return;
  }
  if (external) return;
  const s = await landing(want);
  if (s !== 200) faults.push(`${r.source} -> ${r.destination}: the destination answers ${s}`);
});

await pool(sitemap, 8, async (path) => {
  const res = await head(origin + path);
  if (res.status === 200) return;
  if (res.status === 308 && res.location) {
    const s = await landing(abs(res.location));
    if (s === 200) return;
    faults.push(`sitemap ${path}: 308 -> ${res.location} answers ${s}`);
    return;
  }
  faults.push(`sitemap ${path}: ${res.status || res.error}`);
});

for (const f of faults.sort()) console.log(`::error::${f}`);
const sources = redirects.length;
console.log(faults.length
  ? `live redirects: ${faults.length} fault(s) on ${origin}`
  : `live redirects ok on ${origin}: ${sources} sources each one 308 to a 200; ${sitemap.length} old sitemap URLs answer 200 or one 308 to a 200`);
process.exit(faults.length ? 1 : 0);
