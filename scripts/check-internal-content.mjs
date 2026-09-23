#!/usr/bin/env node
// G1 — NO INTERNAL CONTENT IN A PUBLIC PAGE.
//
// Developer pages describe the release you install today. Internal hosts,
// infrastructure ids, process language, measurement jargon, dated
// investigation logs, version history, shas in prose, `★` and billing-pipeline
// internals belong in private engineering notes (STYLE.md, "Never in a public
// page").
//
//   node scripts/check-internal-content.mjs             report per file and category (exit 0)
//   node scripts/check-internal-content.mjs --strict    exit 1 on any hit
//   node scripts/check-internal-content.mjs --dist dist also grade the built site's text,
//                                                        llms*.txt and public JSON
//   node scripts/check-internal-content.mjs --self-test fixtures only
//
// Every pattern carries a FIXTURE it must match; a pattern that cannot match its
// fixture fails every run. A correct hit is fixed by rewording, or by a named
// CARRIER in scripts/internal-content-carriers.json (path + exact string +
// reason), and every carrier is asserted present. Path exclusions are not
// allowed, with one exception: the changelog is exempt from dated-log and
// version-history.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

export const PATTERNS = [
  { name: "internal-host", re: /\b(moraga|lafayette|orinda|echelon|alpharetta)\b|\btailnet\b|\/home\/(?!you\b|user\b|runner\b)\w+/gi,
    fixture: "hosted on moraga-serve-03" },
  { name: "infra-id", re: /tmoobjxlwcwvxvjeppzq|supabase\.co|sgubithuman|\bModal\b|\bbaked-\d+|\bhosted [a-z0-9]+-[a-z0-9-]{4,}/g,
    fixture: "the Modal CPU container" },
  { name: "governance", re: /\bowner (ruling|directive|decision)s?\b|\bby owner\b|\bruled\b|\brulings?\b|\blanes?\b|\bsecond reader\b|\breader that did not write\b|\bcontrol query\b/gi,
    fixture: "by owner ruling, the lane ships it" },
  { name: "measure-jargon", re: /\be2e-(unpaced|steady-state|paced)\b|\bsteady[- ]state\b|\bruled shape\b|\bdrive \d{4}-\d{5}-\d{4}\b|\bpositive control\b|\bbyte-identical\b|\b30-day clock\b/gi,
    fixture: "e2e-unpaced (not re-measured on the ruled shape)" },
  { name: "dated-log", re: /\b(measured|re-measured|verified|counted|executed|run|read|tested)\b[^.\n]{0,40}\b20\d\d-\d\d-\d\d\b/gi,
    fixture: "Measured on 2026-09-21 against the shipped header", exempt: /changelog/ },
  { name: "version-history", re: /\b(from|through|until|since|up to|before|after)\s+`?(v|cli-v|essence2-v)?\d+\.\d+\.\d+/gi,
    fixture: "From 2.6.20 the CLI ignores it", exempt: /changelog/ },
  { name: "sha-in-prose", re: /(?<![\w/.#-])(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{9,40}(?![\w/-])/g,
    fixture: "fixed in core 876ce210a", prose: true },
  { name: "star", re: /★/g, fixture: "★ the load-bearing line" },
  { name: "essay", re: /Nobody types this page|load-bearing|the whole point/gi,
    fixture: "why that distinction is the whole point" },
  { name: "billing-internals", re: /\b(metering|billing|final) beats?\b|\bUNACKED\b|\bre-claimed\b|\[selfhost-meter\]|BITHUMAN_UNMETERED|BITHUMAN_METER_ENFORCE|\bfail-open\b/g,
    fixture: "the final beat stays UNACKED" },
  { name: "partner-incident", re: /reported [^.\n]{0,40}privately/gi,
    fixture: "has been reported to LiveKit privately" },
  { name: "html-comment-leak", re: /<!--(?!\s*\/?(FLOORS|VERSIONS|PYAPI|ANDROIDAPI)\b)/g, served: true,
    fixture: "<!-- note to self -->" },
];

// The customer corpus. STYLE.md and scripts/ are the rulebook, not pages.
const ROOTS = ["src/content", "src/pages", "src/components", "src/layouts", "src/config", "src/data", "src/partials", "src/openapi"];
const EXT = /\.(md|mdx|astro|ts|yaml|yml|json)$/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(n)) out.push(p);
  }
  return out;
}

/** Source comments are not served: strip them from .astro/.ts so a developer
 *  note in code is not graded as page text. Markdown is graded whole. */
function servedText(rel, text) {
  if (/\.(ts|astro)$/.test(rel)) {
    text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1").replace(/<!--[\s\S]*?-->/g, "");
  }
  if (/\.md$/.test(rel)) text = text.replace(/^---\n[\s\S]*?\n---\n/, (m) => m.replace(/^(?!description|title).*$/gm, ""));
  return text;
}

/** Markdown code fences (and inline code) are not prose for sha-in-prose. */
function proseOnly(text) {
  return text.replace(/^```[\s\S]*?^```/gm, (m) => m.replace(/[^\n]/g, " ")).replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length));
}

function loadCarriers() {
  const p = join(ROOT, "scripts/internal-content-carriers.json");
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8")).carriers || [];
}

export function scan(rel, text, carriers = []) {
  const hits = [];
  const mine = carriers.filter((c) => c.path === rel);
  for (const pat of PATTERNS) {
    if (pat.exempt && pat.exempt.test(rel)) continue;
    if (pat.served && !rel.startsWith("dist/")) continue;
    const body = pat.prose ? proseOnly(text) : text;
    pat.re.lastIndex = 0;
    let m;
    while ((m = pat.re.exec(body)) !== null) {
      const at = m.index;
      const covered = mine.some((c) => {
        let i = text.indexOf(c.string);
        while (i >= 0) {
          if (at >= i && at < i + c.string.length) return true;
          i = text.indexOf(c.string, i + 1);
        }
        return false;
      });
      if (!covered) hits.push({ name: pat.name, found: m[0], line: text.slice(0, at).split("\n").length });
      if (m.index === pat.re.lastIndex) pat.re.lastIndex++;
    }
  }
  return hits;
}

function selfTest() {
  let bad = 0;
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    const ok = p.re.test(p.fixture);
    p.re.lastIndex = 0;
    if (!ok) { bad++; console.log(`BLIND ${p.name}: cannot match its own fixture "${p.fixture}"`); }
  }
  // negative controls: sentences a correct page may carry
  const clean = [
    "Essence 2 plays at 25 fps. Requires bithuman 2.11 or newer.",
    "Set `BITHUMAN_API_SECRET`, then run the command.",
    "Agent code A23WJF0199 and UUID 00000000-0000-0000-0000-000000000000.",
    "Output goes to /home/you/.cache/bithuman.",
  ];
  for (const s of clean) {
    const h = scan("src/content/docs/x.md", s).filter((x) => x.name !== "html-comment-leak");
    if (h.length) { bad++; console.log(`OVER-MATCH on a clean sentence: ${JSON.stringify(h)} in "${s}"`); }
  }
  return bad;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    const b = selfTest();
    console.log(b ? `self-test FAILED (${b})` : `self-test ok: ${PATTERNS.length} patterns fire on their fixtures, 0 over-matches`);
    process.exit(b ? 1 : 0);
  }
  if (selfTest()) process.exit(1);

  const carriers = loadCarriers();
  const files = [];
  for (const r of ROOTS) for (const p of walk(join(ROOT, r))) files.push(relative(ROOT, p));
  const di = args.indexOf("--dist");
  if (di >= 0) {
    const dist = join(ROOT, args[di + 1] || "dist");
    for (const p of walk(dist).concat(readdirSync(dist).filter((n) => /\.(txt|json)$/.test(n)).map((n) => join(dist, n)))) {
      const rel = relative(ROOT, p);
      if (/\/_astro\//.test(rel) || /pagefind/.test(rel)) continue;
      files.push(rel);
    }
    for (const p of walk(dist)) if (p.endsWith(".html")) files.push(relative(ROOT, p));
  }
  if (files.length < 40) { console.log(`read only ${files.length} files — the corpus moved; refusing to pass`); process.exit(2); }

  const byCat = {}, byFile = {};
  let total = 0;
  for (const rel of [...new Set(files)]) {
    let text = readFileSync(join(ROOT, rel), "utf8");
    if (rel.endsWith(".html")) {
      const m = text.match(/<main[^>]*>([\s\S]*)<\/main>/);
      text = (m ? m[1] : text).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<!--(\s*\/?(FLOORS|VERSIONS)[^>]*)-->/g, "").replace(/<[^>]+>/g, " ");
    } else text = servedText(rel, text);
    const hits = scan(rel, text, carriers);
    if (!hits.length) continue;
    byFile[rel] = hits;
    for (const h of hits) { byCat[h.name] = (byCat[h.name] || 0) + 1; total++; }
  }

  // every carrier must still be present
  let missing = 0;
  for (const c of carriers) {
    const p = join(ROOT, c.path);
    if (!existsSync(p) || !readFileSync(p, "utf8").includes(c.string)) {
      missing++;
      console.log(`::error::carrier no longer present — remove it from internal-content-carriers.json: ${c.path}: "${c.string}"`);
    }
  }

  const verbose = !args.includes("--quiet");
  for (const [f, hs] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${String(hs.length).padStart(4)}  ${f}`);
    if (verbose) for (const h of hs.slice(0, 50)) console.log(`        ${h.name.padEnd(18)} L${h.line}: ${h.found.slice(0, 80)}`);
  }
  console.log(`\nG1 internal content: ${total} hit(s) in ${Object.keys(byFile).length} file(s)`);
  for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} ${v}`);
  if (missing) process.exit(1);
  process.exit(args.includes("--strict") && total ? 1 : 0);

}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
