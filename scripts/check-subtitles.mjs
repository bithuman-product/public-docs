#!/usr/bin/env node
// Docs v2 (SPEC §1 principle 1, W7 POLISH 2): EVERY PAGE'S SUBTITLE IS 6–14 WORDS.
// The subtitle is the one line under the H1 (`data-subtitle` on the element: the
// markdown `description` in DocLayout, the hub taglines, the landing line). The
// final acceptance of 2026-09-30 found 86 of 111 over the limit, up to 41 words,
// because no gate read it. Graded on the BUILT page, so every source (frontmatter,
// src/config/hubs.ts, the .astro pages) is covered by one rule.
//
//   node scripts/check-subtitles.mjs            grade every page in dist/sitemap.xml
//   node scripts/check-subtitles.mjs --selftest
// EXIT 0 all in range · 1 a page is out of range or has no/two subtitles · 2 could not run
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
export const MIN = 6, MAX = 14;
// the same word rule as check-page-budget.mjs
export const words = (s) => (s.match(/[A-Za-z0-9][A-Za-z0-9'’.\-/]*/g) || []).length;
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&[a-z]+;|&#\d+;/g, " ").replace(/\s+/g, " ").trim();

/** faults for one built page */
export function grade(html) {
  const subs = [...html.matchAll(/<(p|div|span)\b[^>]*\bdata-subtitle\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => text(m[2]));
  if (subs.length !== 1) return [`${subs.length} subtitles (data-subtitle) on the page, want exactly 1`];
  const n = words(subs[0]);
  return n < MIN || n > MAX ? [`subtitle is ${n} words, want ${MIN}–${MAX}: "${subs[0]}"`] : [];
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); bad += cond ? 0 : 1; };
  const p = (s) => `<main><h1>T</h1><p class="doc-lede" data-subtitle>${s}</p></main>`;
  ok("a 10-word subtitle passes", grade(p("one two three four five six seven eight nine ten")).length === 0);
  ok("a 15-word subtitle fails", grade(p(Array.from({ length: 15 }, (_, i) => `w${i}`).join(" "))).length === 1);
  ok("a 5-word subtitle fails", grade(p("one two three four five")).length === 1);
  ok("14 words pass, 6 words pass", grade(p(Array.from({ length: 14 }, (_, i) => `w${i}`).join(" "))).length === 0 && grade(p("a b c d e f")).length === 0);
  ok("the real /performance subtitle of 2026-09-30 (36 words) fails", grade(p("How fast Essence 2 and Expression 2 render on iPhone, Android, a WebGPU browser, a Mac, a Linux PC with no GPU and the bitHuman cloud, in times real time, with the raw data as performance.json.")).length === 1);
  ok("punctuation and inline tags are not words", grade(p("AI with <em>character</em>. Real-time — talking avatars &amp; more")).length === 0);
  ok("a page with no subtitle fails", grade("<main><h1>T</h1><p>x</p></main>").length === 1);
  ok("a page with two subtitles fails", grade(p("a b c d e f") + p("a b c d e f")).length === 1);
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const dist = join(ROOT, "dist");
  const map = join(dist, "sitemap.xml");
  if (!existsSync(map)) { console.log("::error::dist/sitemap.xml missing: build first"); return 2; }
  const routes = [...readFileSync(map, "utf8").matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map((m) => m[1].replace(/\/$/, "") || "/");
  if (routes.length < 80) { console.log(`::error::read only ${routes.length} routes from the sitemap — the instrument is blind`); return 2; }
  let failing = 0;
  const hist = {};
  for (const r of routes) {
    const f = join(dist, r.slice(1), "index.html");
    if (!existsSync(f)) { console.log(`::error::${r} is in the sitemap but not built`); failing++; continue; }
    const html = readFileSync(f, "utf8");
    const faults = grade(html);
    if (faults.length) { failing++; for (const x of faults) console.log(`::error file=dist${r === "/" ? "/" : r + "/"}index.html::${r} ${x}`); }
    else { const n = words(text(/data-subtitle[^>]*>([\s\S]*?)<\//.exec(html)[1])); hist[n] = (hist[n] ?? 0) + 1; }
  }
  console.log(`subtitles: ${routes.length} pages; ${failing} out of ${MIN}–${MAX} words; lengths ${Object.entries(hist).map(([k, v]) => `${k}:${v}`).join(" ")}`);
  return failing ? 1 : 0;
}
process.exit(main());
