#!/usr/bin/env node
// Docs v2 (SPEC §1 "Budgets", §8): EACH PAGE FITS ITS TYPE. Prose words (code,
// tables, components and headings excluded), H2 count, callouts and bullets per page,
// graded against the budget of the page's template type, plus the rules for every
// page: paragraphs ≤60 words (fail at 80), callouts ≤3.
// Report-only in docs v2 W2a: each wave that moves pages onto the v2 templates flips
// its types to fail (FAIL_TYPES below), and W6 flips every type. Exceptions only
// through scripts/page-budget-allowlist.json, each with a reason.
//
//   node scripts/check-page-budget.mjs            grade; fails only on FAIL_TYPES pages
//   node scripts/check-page-budget.mjs --report   print every page over budget, exit 0
//   node scripts/check-page-budget.mjs --selftest
//   node scripts/check-page-budget.mjs --built    the H2 count of every hub and the landing,
//                                                 read off the BUILT page (docs v2 W7, SPEC "W7
//                                                 POLISH" 4): a hub's source can hold 1 H2 while a
//                                                 generated block draws 10 (/examples before W7)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { routeOf } from "./content-routes.mjs";

const ROOT = join(import.meta.dirname, "..");
const CONTENT = join(ROOT, "src/content/docs");
const ALLOW = join(ROOT, "scripts/page-budget-allowlist.json");

// the budget of each template type (SPEC §1). prose/h2 = [warn, fail]; null = uncapped.
export const BUDGETS = {
  landing: { prose: [120, 180], h2: [4, 5], bullets: 0, callouts: 0 },
  hub: { prose: [60, 90], h2: [4, 5], code: 0 },
  quickstart: { prose: [600, 800], h2: [5, 7], callouts: 1 },
  "platform-app": { prose: [700, 900], h2: [5, 7], callouts: 1 },
  guide: { prose: [700, 900], h2: [6, 7], callouts: 3 },
  concept: { prose: [700, 900], h2: [5, 7], callouts: 1 },
  troubleshooting: { prose: [400, 600], h2: [3, 4] },
  reference: { prose: null, h2: null, callouts: 3 },
  endpoint: { prose: null, h2: [10, 12], callouts: 3 },
  example: { prose: [600, 800], h2: [6, 6] },
  catalogue: { prose: null, h2: [6, 7] },
  record: { prose: null, h2: null },
};
// today's types onto the v2 budgets (pages get their v2 type as their wave lands)
export const TYPE_BUDGET = {
  landing: "landing", hub: "hub", quickstart: "quickstart", platform: "quickstart", "platform-app": "platform-app",
  recipe: "guide", guide: "guide", concept: "concept", deploy: "concept", model: "concept", troubleshooting: "troubleshooting",
  reference: "reference", generated: "reference", endpoint: "endpoint", example: "example", catalogue: "catalogue",
  changelog: "record", legal: "record", record: "record",
};
// types whose budget fails the build. Empty in W2a (report-only); W3 added the
// platform types, W4 guide/concept; W6 flips every type (records stay exempt by budget).
const FAIL_TYPES = new Set(Object.keys(BUDGETS));
const PARA_WARN = 60, PARA_FAIL = 80, CALLOUTS_PAGE = 3;

// a fenced block whose language is a generated component (src/lib/doc-blocks.ts
// BLOCK_LANGS: ```deploy-matrix, ```cards, ```example-gallery …) draws cards, tables or
// widgets, not code a reader copies: it is not counted against the "0 code" of a hub
const DOC_BLOCKS = (() => {
  const src = existsSync(join(ROOT, "src/lib/doc-blocks.ts")) ? readFileSync(join(ROOT, "src/lib/doc-blocks.ts"), "utf8") : "";
  const m = /BLOCK_LANGS = new Set\(\[([\s\S]*?)\]\)/.exec(src);
  return new Set(m ? [...m[1].matchAll(/"([\w-]+)"/g)].map((x) => x[1]) : []);
})();
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : []; });
const words = (s) => (s.match(/[A-Za-z0-9][A-Za-z0-9'’.\-/]*/g) || []).length;

/** measure one page's markdown */
export function measure(md) {
  const fm = (/^---\n([\s\S]*?)\n---/.exec(md) || [])[1] || "";
  const type = (/^type:\s*"?([\w-]+)"?/m.exec(fm) || [])[1] || "";
  const body = md.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const lines = body.split("\n");
  let inCode = false, prose = 0, h2 = 0, callouts = 0, bullets = 0, code = 0, inCallout = false;
  const paras = [];
  let para = 0;
  const endPara = () => { if (para) paras.push(para); para = 0; };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\s*(```|~~~)/.test(l)) { if (!inCode && !DOC_BLOCKS.has((/^\s*(?:```|~~~)\s*([\w-]+)/.exec(l) || [])[1])) code++; inCode = !inCode; endPara(); continue; }
    if (inCode) continue;
    if (/^>/.test(l)) { if (!inCallout) callouts++; inCallout = true; endPara(); continue; }
    inCallout = false;
    if (!l.trim()) { endPara(); continue; }
    if (/^##\s/.test(l)) { h2++; endPara(); continue; }
    if (/^#{1,6}\s/.test(l) || /^\s*\|/.test(l) || /^\s*(import|export)\s/.test(l) || /^\s*<\/?[A-Za-z]/.test(l) || /^\s*[{}]/.test(l)) { endPara(); continue; }
    const text = l.replace(/<[^>]+>/g, " ").replace(/\]\([^)]*\)/g, "]").replace(/`[^`]*`/g, "x");
    if (/^\s*([-*+]|\d+\.)\s/.test(l)) { bullets++; endPara(); prose += words(text); continue; }
    const w = words(text);
    prose += w; para += w;
  }
  endPara();
  return { type, prose, h2, callouts, bullets, code, longest: Math.max(0, ...paras) };
}

/** faults and warnings for one measured page */
export function judge(m, allow = {}) {
  const budget = BUDGETS[TYPE_BUDGET[m.type]];
  const warn = [], fail = [];
  if (!budget) { warn.push(`type "${m.type}" has no v2 budget`); return { warn, fail }; }
  const over = (what, n, [w, f]) => { if (n > f) fail.push(`${what} ${n} > ${f}`); else if (n > w) warn.push(`${what} ${n} > ${w} (warn)`); };
  if (budget.prose && !allow.prose) over("prose words", m.prose, budget.prose);
  if (budget.h2 && !allow.h2) over("H2s", m.h2, budget.h2);
  const maxC = budget.callouts ?? CALLOUTS_PAGE;
  if (m.callouts > maxC && !allow.callouts) fail.push(`callouts ${m.callouts} > ${maxC}`);
  if (budget.bullets !== undefined && m.bullets > budget.bullets && !allow.bullets) fail.push(`bullets ${m.bullets} > ${budget.bullets}`);
  if (budget.code !== undefined && m.code > budget.code && !allow.code) fail.push(`code blocks ${m.code} > ${budget.code}`);
  if (TYPE_BUDGET[m.type] !== "record" && !allow.paragraph) {
    if (m.longest > PARA_FAIL) fail.push(`a ${m.longest}-word paragraph > ${PARA_FAIL}`);
    else if (m.longest > PARA_WARN) warn.push(`a ${m.longest}-word paragraph > ${PARA_WARN} (warn)`);
  }
  return { warn, fail };
}

// The Astro pages that are no markdown: the landing and the three drawn hubs,
// graded from the build (docs v2 SPEC §1, §6). Prose = words in <p> inside <main>,
// minus cards, tables, code, the live demo and the moved-anchor stubs; a bullet is
// an <li> of a list that is not a card or tile list (role="list").
export const BUILT_PAGES = { "/": "landing", "/platforms": "hub", "/build": "hub", "/resources": "hub" };
export function measureHtml(html) {
  let h = (/<main[\s\S]*<\/main>/.exec(html) || [html])[0];
  const cut = (open, tag) => { for (let i = h.indexOf(open); i >= 0; i = h.indexOf(open)) { let depth = 0, j = i; const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g"); re.lastIndex = i; for (let m; (m = re.exec(h));) { depth += m[1] ? -1 : 1; if (!depth) { j = re.lastIndex; break; } } if (j === i) break; h = h.slice(0, i) + h.slice(j); } };
  cut("<section class=\"ld\"", "section");
  h = h.replace(/<div class="moved-stubs[\s\S]*?<\/div>/g, "").replace(/<(script|style|pre|table|button|h[1-6])\b[\s\S]*?<\/\1>/g, "");
  const paras = [...h.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => words(m[1].replace(/<[^>]+>/g, " ")));
  const bullets = [...h.matchAll(/<(ul|ol)\b(?![^>]*role="list")[^>]*>([\s\S]*?)<\/\1>/g)].reduce((n, m) => n + (m[2].match(/<li\b/g) || []).length, 0);
  return { type: "", prose: paras.reduce((a, b) => a + b, 0), h2: (html.match(/<h2\b/g) || []).length, callouts: 0, bullets, code: 0, longest: Math.max(0, ...paras) };
}

/** H2 elements inside <main> of a built page: what a reader sees, generated blocks included. */
export const renderedH2 = (html) => (((/<main[\s\S]*<\/main>/.exec(html) || [html])[0]).match(/<h2\b/g) || []).length;

/** --built: grade the H2 budget of every hub-type page (and the landing) on its rendered HTML. */
function builtMain(allow) {
  const dist = join(ROOT, "dist");
  if (!existsSync(join(dist, "index.html"))) { console.log("::error::dist/ missing: build first"); return 2; }
  const pages = { ...BUILT_PAGES };
  for (const f of walk(CONTENT)) {
    const md = readFileSync(f, "utf8");
    if (/^draft:\s*true/m.test(md.slice(0, 2000))) continue;
    const { type } = measure(md);
    if (["hub", "landing"].includes(TYPE_BUDGET[type])) pages[routeOf(CONTENT, f, md)] = type;
  }
  let failing = 0, n = 0;
  for (const [route, type] of Object.entries(pages).sort()) {
    const file = join(dist, route.slice(1), "index.html");
    if (!existsSync(file)) { console.log(`::error::${route} is not built`); failing++; continue; }
    const h2 = renderedH2(readFileSync(file, "utf8"));
    const [, max] = BUDGETS[TYPE_BUDGET[type]].h2;
    n++;
    if (h2 > max && !(allow[route] ?? {}).h2) { failing++; console.log(`::error file=dist${route === "/" ? "/" : route + "/"}index.html::${route} [${type}] ${h2} H2s in the rendered page > ${max}`); }
    else console.log(`  ok ${route} [${type}] ${h2} rendered H2s (max ${max})`);
  }
  if (n < 6) { console.log(`::error::graded only ${n} hub pages — the corpus moved`); return 2; }
  console.log(`page budget (built): ${n} hub and landing pages graded on their rendered H2s; ${failing} over`);
  return failing ? 1 : 0;
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); bad += cond ? 0 : 1; };
  const page = (type, body) => `---\ntype: ${type}\n---\n${body}`;
  const para = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  ok("code, tables and headings are not prose", measure(page("concept", "## A\n\n```\none two three\n```\n\n| a | b |\n|---|---|\n\nfour five\n")).prose === 2);
  ok("a concept page in budget passes", judge(measure(page("concept", "## A\n\n" + para(50) + "\n"))).fail.length === 0);
  ok("a concept page over 900 words fails", judge(measure(page("concept", Array.from({ length: 20 }, () => para(50)).join("\n\n")))).fail.some((f) => f.startsWith("prose")));
  ok("an 81-word paragraph fails", judge(measure(page("concept", para(81)))).fail.some((f) => f.includes("paragraph")));
  ok("a 61-word paragraph warns", judge(measure(page("concept", para(61)))).warn.some((f) => f.includes("paragraph")));
  ok("a component fence is not code on a hub", judge(measure(page("hub", "```deploy-matrix\n```\n"))).fail.length === 0);
  ok("a bash fence on a hub fails", judge(measure(page("hub", "```bash\nls\n```\n"))).fail.some((f) => f.startsWith("code")));
  ok("the landing's HTML: card lines and the demo are not prose", measureHtml('<main><h2>A</h2><p>one two</p><a class="card"><span class="card-line">x y z</span></a><section class="ld"><p>demo words here</p></section></main>').prose === 2);
  ok("a plain list on the landing is bullets", judge({ ...measureHtml('<main><ul><li>a</li><li>b</li></ul><ul role="list"><li>c</li></ul></main>'), type: "landing" }).fail.some((f) => f.startsWith("bullets")));
  ok("a landing bullet fails", judge(measure(page("landing", "- one\n"))).fail.some((f) => f.startsWith("bullets")));
  ok("eight H2s on a quickstart fail", judge(measure(page("quickstart", "## a\n## b\n## c\n## d\n## e\n## f\n## g\n## h\n"))).fail.some((f) => f.startsWith("H2s")));
  ok("a second callout on a quickstart fails", judge(measure(page("quickstart", "> **Note:** a\n\ntext\n\n> **Note:** b\n"))).fail.some((f) => f.startsWith("callouts")));
  ok("records are exempt", judge(measure(page("changelog", Array.from({ length: 40 }, () => para(90)).join("\n\n")))).fail.length === 0);
  ok("rendered H2s: ten gallery cards drawn by a block count, though the source has one", renderedH2('<main><h2>More</h2>' + '<li><h2>card</h2></li>'.repeat(10) + '</main>') === 11);
  ok("rendered H2s: cards as H3 do not count", renderedH2('<main><h2>More</h2>' + '<li><h3>card</h3></li>'.repeat(10) + '</main>') === 1);
  ok("rendered H2s: the header outside <main> does not count", renderedH2('<header><h2>x</h2></header><main><h2>a</h2></main>') === 1);
  ok("an allowlist entry waives its budget", judge(measure(page("quickstart", "## a\n## b\n## c\n## d\n## e\n## f\n## g\n## h\n")), { h2: "reason" }).fail.length === 0);
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) return selftest();
  const report = argv.includes("--report");
  const allow = existsSync(ALLOW) ? JSON.parse(readFileSync(ALLOW, "utf8")).pages ?? {} : {};
  for (const [r, a] of Object.entries(allow)) if (!a.reason) { console.log(`::error::page-budget-allowlist ${r}: every entry needs a reason`); return 1; }
  if (argv.includes("--built")) return builtMain(allow);
  let pages = 0, fails = 0, warns = 0, failing = 0;
  const h2s = [];
  for (const f of walk(CONTENT).sort()) {
    const md = readFileSync(f, "utf8");
    if (/^draft:\s*true/m.test(md.slice(0, 2000))) continue;
    const route = routeOf(CONTENT, f, md);
    const m = measure(md);
    const { warn, fail } = judge(m, allow[route] ?? {});
    pages++;
    h2s.push(m.h2);
    warns += warn.length; fails += fail.length;
    const hard = FAIL_TYPES.has(TYPE_BUDGET[m.type]) && !report;
    if (hard && fail.length) failing++;
    for (const x of fail) console.log(`${hard ? "::error" : "::warning"} file=${relative(ROOT, f)}::${route} [${m.type}] ${x}`);
    if (report) for (const x of warn) console.log(`  note ${route} [${m.type}] ${x}`);
  }
  const dist = join(ROOT, "dist");
  for (const [route, type] of Object.entries(existsSync(join(dist, "index.html")) ? BUILT_PAGES : {})) {
    const f = join(dist, route.slice(1), "index.html");
    if (!existsSync(f)) { console.log(`::error::${route} is not built`); failing++; continue; }
    const m = { ...measureHtml(readFileSync(f, "utf8")), type };
    const { warn, fail } = judge(m, allow[route] ?? {});
    pages++; h2s.push(m.h2); warns += warn.length; fails += fail.length;
    if (fail.length && !report) failing++;
    for (const x of fail) console.log(`${report ? "::warning" : "::error"} file=dist${route === "/" ? "/" : route + "/"}index.html::${route} [${type}] ${x}`);
    if (report) for (const x of warn) console.log(`  note ${route} [${type}] ${x}`);
    if (route === "/") console.log(`landing: ${m.prose} prose words, ${m.h2} H2s, ${m.bullets} bullets`);
  }
  if (pages < 40) { console.log(`::error::read only ${pages} pages — the corpus moved`); return 2; }
  h2s.sort((a, b) => a - b);
  const median = h2s[Math.floor(h2s.length / 2)];
  console.log(`page budget: ${pages} pages; ${fails} over a fail line, ${warns} over a warn line; median H2 ${median}; fail types [${[...FAIL_TYPES].join(", ") || "none: report-only (docs v2 W2a)"}]`);
  return failing ? 1 : 0;
}
process.exit(main());
