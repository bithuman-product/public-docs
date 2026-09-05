#!/usr/bin/env node
// Every redirect must resolve in BOTH spellings — with and without the
// trailing slash.
//
// WHY THIS EXISTS
// ---------------
// ★MEASURED ON THE LIVE SITE 2026-09-05, before this guard: all 44 redirect
// sources resolved bare (43x 308, 1x 307) and ALL 44 returned 404 with a
// trailing slash. 100 %, not a corner case.
//
// Vercel matches `source` against the request path literally, so `/cli/commands`
// does not match `/cli/commands/`. Every one of these paths WAS a real page, and
// this site builds directory-format output — so the URL a reader copied out of
// their address bar, and the URL anything that crawled the old site recorded,
// carries the trailing slash. The frozen-redirect promise in
// check-internal-vocabulary.mjs ("the retired URLs must keep resolving
// forever", asserted PRESENT in the corpus) was therefore true of the source
// and false of the site: a source-only assertion cannot see this.
//
// ★THE RULE, NOT AN EXCEPTION: for every non-root `source` without a trailing
// slash there must be an entry with the identical destination and permanence
// carrying one. Adding a redirect and forgetting its twin is fatal here, so the
// pairing cannot decay one entry at a time.
//
// EXIT 0 paired · 1 unpaired or inconsistent · 2 could not measure
import { readFileSync } from "node:fs";

const PATH = process.argv[2] || new URL("../vercel.json", import.meta.url).pathname;
let redirects;
try {
  redirects = JSON.parse(readFileSync(PATH, "utf8")).redirects;
} catch (e) { console.error("CANNOT MEASURE: " + e.message); process.exit(2); }
if (!Array.isArray(redirects) || redirects.length === 0) {
  console.error("CANNOT MEASURE: no redirects array"); process.exit(2);
}

const bySource = new Map();
for (const r of redirects) {
  if (!r || typeof r.source !== "string") { console.error("CANNOT MEASURE: a redirect has no string source"); process.exit(2); }
  if (bySource.has(r.source)) { console.error(`FAIL: duplicate source ${r.source}`); process.exit(1); }
  bySource.set(r.source, r);
}

const problems = [];
let pairs = 0;
for (const [src, r] of bySource) {
  if (src === "/" || src.endsWith("/")) continue;
  const twin = bySource.get(src + "/");
  if (!twin) {
    problems.push(`${src} has no trailing-slash twin — a saved link to ${src}/ 404s`);
    continue;
  }
  if (twin.destination !== r.destination)
    problems.push(`${src} and ${src}/ disagree on destination (${r.destination} vs ${twin.destination})`);
  else if (Boolean(twin.permanent) !== Boolean(r.permanent))
    problems.push(`${src} and ${src}/ disagree on permanent`);
  else pairs++;
}

console.log(`${redirects.length} redirect rule(s), ${pairs} fully paired`);
if (problems.length) {
  for (const p of problems) console.error("FAIL: " + p);
  process.exit(1);
}
console.log("OK — every redirect resolves with and without the trailing slash");
