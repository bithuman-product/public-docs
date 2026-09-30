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
// types whose budget fails the build. Empty in W2a (report-only); W3 adds the
// platform types, W4 guide/concept, W5 endpoint, W6 the rest.
const FAIL_TYPES = new Set(["platform-app", "quickstart", "guide", "concept"]);
const PARA_WARN = 60, PARA_FAIL = 80, CALLOUTS_PAGE = 3;

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
    if (/^\s*(```|~~~)/.test(l)) { if (!inCode) code++; inCode = !inCode; endPara(); continue; }
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
  ok("a landing bullet fails", judge(measure(page("landing", "- one\n"))).fail.some((f) => f.startsWith("bullets")));
  ok("eight H2s on a quickstart fail", judge(measure(page("quickstart", "## a\n## b\n## c\n## d\n## e\n## f\n## g\n## h\n"))).fail.some((f) => f.startsWith("H2s")));
  ok("a second callout on a quickstart fails", judge(measure(page("quickstart", "> **Note:** a\n\ntext\n\n> **Note:** b\n"))).fail.some((f) => f.startsWith("callouts")));
  ok("records are exempt", judge(measure(page("changelog", Array.from({ length: 40 }, () => para(90)).join("\n\n")))).fail.length === 0);
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
  if (pages < 40) { console.log(`::error::read only ${pages} pages — the corpus moved`); return 2; }
  h2s.sort((a, b) => a - b);
  const median = h2s[Math.floor(h2s.length / 2)];
  console.log(`page budget: ${pages} pages; ${fails} over a fail line, ${warns} over a warn line; median H2 ${median}; fail types [${[...FAIL_TYPES].join(", ") || "none: report-only (docs v2 W2a)"}]`);
  return failing ? 1 : 0;
}
process.exit(main());
