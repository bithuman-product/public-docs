#!/usr/bin/env node
// The page-weight budget (docs spec §4.3), on the built HTML:
//   * first-party JavaScript per page  ≤ 25 KB gzipped (Pagefind loads on ⌘K, not counted)
//   * any one script                   ≤ 5 KB gzipped (one widget, one budget)
//   * third-party script               none, on every page (the API reference is static since W3)
//   * inlined CSS per page             ≤ 30 KB gzipped
//   * each interactive widget          its own budget (WIDGETS, spec §3.2): the widget's
//                                      script in src/scripts, bundled with everything it
//                                      imports and minified, gzipped
//
//   node scripts/check-js-budget.mjs            # dist/ after npm run build
//   node scripts/check-js-budget.mjs --widgets  # the widget budgets only (no build needed)
//   node scripts/check-js-budget.mjs --selftest
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const KB = 1024;
export const BUDGET = { pageJs: 25 * KB, script: 5 * KB, css: 30 * KB };
/** Pages allowed a third-party script: none since the static API reference (W3). */
const THIRD_PARTY_OK = new Set([]);
/** Per-widget budgets, gzipped (docs spec §3.2 and §4.3). */
export const WIDGETS = {
  "tabs-sync": 2 * KB,
  "picker": 2 * KB,
  "perf-explorer": 5 * KB,
  "calculator": 3 * KB,
  "matrix-filter": 2 * KB,
};

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
  ok("a third-party script on the API reference fires too", grade("api/reference/index.html", '<script src="https://cdn.example/x.js"></script>').faults.some((f) => f.includes("third-party")));
  ok("a widget over its budget fires", gradeWidget("calculator", 4 * KB).length === 1);
  ok("a widget within its budget passes", gradeWidget("calculator", 2 * KB).length === 0);
  ok("an unbudgeted widget fires", gradeWidget("new-thing", 100).length === 1);
  ok("heavy inline CSS fires", grade("a/index.html", `<style>${rnd(6000)}</style>`).faults.some((f) => f.includes("CSS")));
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

export function gradeWidget(name, size) {
  const budget = WIDGETS[name];
  if (budget === undefined) return [`src/scripts/${name}.ts has no budget in WIDGETS (scripts/check-js-budget.mjs)`];
  return size > budget ? [`widget ${name}: ${(size / KB).toFixed(2)} KB gzipped (budget ${budget / KB} KB)`] : [];
}

/** Bundle each widget script the way a page loads it (with its imports, minified) and weigh it. */
async function widgets() {
  let esbuild;
  try { esbuild = await import("esbuild"); } catch { console.log("::error::esbuild is not installed (it comes with astro): npm ci"); return 2; }
  const dir = join(ROOT, "src/scripts");
  const faults = [];
  const sizes = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const name = f.replace(/\.ts$/, "");
    if (name === "platform-state") continue; // a module the widgets import, weighed inside each of them
    const out = await esbuild.build({ entryPoints: [join(dir, f)], bundle: true, minify: true, format: "esm", write: false, target: "es2020", logLevel: "silent" });
    const size = gz(out.outputFiles[0].text);
    sizes.push(`${name} ${(size / KB).toFixed(2)}`);
    faults.push(...gradeWidget(name, size));
  }
  for (const f of faults) console.log(`::error::${f}`);
  console.log(`${faults.length ? "FAIL" : "OK"}: widgets (KB gz): ${sizes.join(", ")}`);
  return faults.length ? 1 : 0;
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  if (process.argv.includes("--widgets")) return widgets();
  const w = await widgets();
  if (w === 2) return 2;
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
  return faults.length || w ? 1 : 0;
}
process.exit(await main());
