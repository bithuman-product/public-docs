#!/usr/bin/env node
// The page-weight budget (docs spec §4.3), on the built HTML:
//   * first-party JavaScript per page  ≤ 25 KB gzipped (Pagefind loads on ⌘K, not counted)
//   * any one script                   ≤ 5 KB gzipped (one widget, one budget)
//   * third-party script               none, except the pages listed in THIRD_PARTY_OK
//   * inlined CSS per page             ≤ 30 KB gzipped
//
//   node scripts/check-js-budget.mjs            # dist/ after npm run build
//   node scripts/check-js-budget.mjs --selftest
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const KB = 1024;
export const BUDGET = { pageJs: 25 * KB, script: 5 * KB, css: 30 * KB };
/** The API explorer embeds Scalar until the static reference replaces it (W3). */
const THIRD_PARTY_OK = new Set(["api/reference/index.html"]);

const gz = (s) => gzipSync(Buffer.from(s), { level: 9 }).length;

export function measure(html, readLocal = () => null) {
  const scripts = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs) || [])[1] || "";
    if (/json/i.test(type)) continue; // data, not code
    const src = (/\bsrc\s*=\s*["']([^"']+)/i.exec(attrs) || [])[1];
    if (src) {
      if (/^https?:\/\//.test(src) && !src.startsWith("https://docs.bithuman.ai/")) { scripts.push({ third: true, src, size: 0 }); continue; }
      const body = readLocal(src.replace(/^https:\/\/docs\.bithuman\.ai/, ""));
      scripts.push({ src, size: body == null ? 0 : gz(body) });
    } else scripts.push({ src: "(inline)", size: gz(m[2]) });
  }
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  return { scripts, js: scripts.reduce((a, s) => a + s.size, 0), css: gz(css) };
}

export function grade(page, html, readLocal) {
  const m = measure(html, readLocal);
  const out = [];
  if (m.js > BUDGET.pageJs) out.push(`${page}: ${(m.js / KB).toFixed(1)} KB of first-party JS gzipped (budget ${BUDGET.pageJs / KB} KB)`);
  for (const s of m.scripts) {
    if (s.third && !THIRD_PARTY_OK.has(page)) out.push(`${page}: third-party script ${s.src}`);
    if (s.size > BUDGET.script) out.push(`${page}: one script is ${(s.size / KB).toFixed(1)} KB gzipped (budget ${BUDGET.script / KB} KB per script): ${s.src}`);
  }
  if (m.css > BUDGET.css) out.push(`${page}: ${(m.css / KB).toFixed(1)} KB of inlined CSS gzipped (budget ${BUDGET.css / KB} KB)`);
  return { faults: out, m };
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) bad++; };
  const rnd = (n) => Array.from({ length: n }, () => Math.random().toString(36)).join("");
  ok("a small inline script passes", grade("a/index.html", "<script>let a=1</script>").faults.length === 0);
  ok("JSON-LD is not code", measure('<script type="application/ld+json">' + rnd(9000) + "</script>").js === 0);
  ok("a 6 KB script fires the per-script budget", grade("a/index.html", `<script>${rnd(900)}</script>`).faults.some((f) => f.includes("per script")));
  ok("six 5 KB scripts fire the page budget", grade("a/index.html", Array.from({ length: 6 }, () => `<script>${rnd(700)}</script>`).join("")).faults.some((f) => f.includes("first-party JS")));
  ok("a third-party script fires", grade("a/index.html", '<script src="https://cdn.example/x.js"></script>').faults.some((f) => f.includes("third-party")));
  ok("a third-party script on the allowed page passes", grade("api/reference/index.html", '<script src="https://cdn.example/x.js"></script>').faults.length === 0);
  ok("heavy inline CSS fires", grade("a/index.html", `<style>${rnd(6000)}</style>`).faults.some((f) => f.includes("CSS")));
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  if (!existsSync(join(DIST, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); return 2; }
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : n.endsWith(".html") ? [p] : []; });
  const readLocal = (src) => { const p = join(DIST, src.split("?")[0]); return existsSync(p) ? readFileSync(p, "utf8") : null; };
  const faults = [];
  let maxJs = { page: "", v: 0 }, maxCss = { page: "", v: 0 }, n = 0;
  for (const f of walk(DIST)) {
    const page = relative(DIST, f);
    if (page.startsWith("pagefind/")) continue;
    n++;
    const { faults: fs, m } = grade(page, readFileSync(f, "utf8"), readLocal);
    faults.push(...fs);
    if (m.js > maxJs.v) maxJs = { page, v: m.js };
    if (m.css > maxCss.v) maxCss = { page, v: m.css };
  }
  for (const f of faults) console.log(`::error::${f}`);
  console.log(`${faults.length ? "FAIL" : "OK"}: ${n} pages; heaviest JS ${(maxJs.v / KB).toFixed(1)} KB gz (${maxJs.page}), heaviest CSS ${(maxCss.v / KB).toFixed(1)} KB gz (${maxCss.page}); budgets ${BUDGET.pageJs / KB} / ${BUDGET.script / KB} per script / ${BUDGET.css / KB} KB CSS`);
  return faults.length ? 1 : 0;
}
process.exit(main());
