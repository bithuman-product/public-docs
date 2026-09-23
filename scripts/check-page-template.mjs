#!/usr/bin/env node
// G3 — every page follows its type's template (STYLE.md).
//
//   * `platform` and `example` pages carry their type's H2 sections, in order,
//     with no sections of their own. The H2 names are stable anchors, so a
//     renamed or reordered section breaks links from other pages and from agents.
//   * Callouts (a blockquote) stay rare and short everywhere: at most one per
//     H2 section, three per page, each under 40 words.
//
// Legal notices and the changelog are exempt (they are records, not templates).
// A named exception must say why and is refused once its page conforms.
//
//   node scripts/check-page-template.mjs            # the site
//   node scripts/check-page-template.mjs --selftest # every rule fires on a fixture

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DOCS = join(ROOT, "src/content/docs");

export const TEMPLATES = {
  platform: {
    order: ["What you get", "Before you start", "Install", "Authenticate", "First frame",
      "Integrate into your app", "Platform notes", "Performance", "Troubleshooting", "Reference"],
    required: ["Install", "Authenticate", "First frame", "Integrate into your app", "Troubleshooting", "Reference"],
  },
  example: {
    order: ["Requirements", "Get the code", "Set up the app", "Set your API secret", "Run it",
      "Expected output", "How it works", "Make it your own", "Troubleshooting", "Next"],
    required: ["Requirements", "Run it", "Expected output", "Troubleshooting", "Next"],
  },
};

/** Pages that do not follow their template yet. Each entry says why, and the
 *  check refuses an entry whose page already conforms. */
export const EXCEPTIONS = {
  "src/content/docs/examples/ai-conversation.md":
    "its example folder (python/local-essence) is being reworked in bithuman-examples #59; the page follows once that lands",
};

const EXEMPT = /(^|\/)(legal\/|changelog(\/|\.md$))/;
const MAX_CALLOUTS_PAGE = 3;
const MAX_CALLOUTS_H2 = 1;
const MAX_CALLOUT_WORDS = 40;

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  const fm = {};
  if (m) for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*"?([^"]*)"?\s*$/.exec(line);
    if (kv) fm[kv[1]] = kv[2];
  }
  return { fm, body: m ? text.slice(m[0].length) : text };
}

/** Removes fenced code so a `## ` or `>` inside a code block is not read as markup. */
const stripFences = (s) => s.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "");

export function grade(text) {
  const { fm, body } = frontmatter(text);
  const faults = [];
  const lines = stripFences(body).split("\n");
  const h2 = lines.filter((l) => l.startsWith("## ")).map((l) => l.slice(3).trim());

  const t = TEMPLATES[fm.type];
  if (t) {
    for (const r of t.required) if (!h2.includes(r)) faults.push(`missing the "${r}" section`);
    for (const h of h2) if (!t.order.includes(h)) faults.push(`"${h}" is not a ${fm.type} section (${t.order.join(" → ")})`);
    const known = h2.filter((h) => t.order.includes(h));
    for (let i = 1; i < known.length; i++) {
      if (t.order.indexOf(known[i]) < t.order.indexOf(known[i - 1])) faults.push(`"${known[i]}" comes before "${known[i - 1]}" in the ${fm.type} template`);
    }
  }

  // Callouts: a run of consecutive `>` lines is one callout.
  let section = "(top)";
  const perSection = new Map();
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("## ")) section = l.slice(3).trim();
    if (!l.startsWith(">")) continue;
    let words = 0;
    while (i < lines.length && lines[i].startsWith(">")) {
      words += lines[i].replace(/^>\s?/, "").split(/\s+/).filter(Boolean).length;
      i++;
    }
    total++;
    perSection.set(section, (perSection.get(section) ?? 0) + 1);
    if (words >= MAX_CALLOUT_WORDS) faults.push(`a callout in "${section}" is ${words} words (under ${MAX_CALLOUT_WORDS})`);
  }
  if (total > MAX_CALLOUTS_PAGE) faults.push(`${total} callouts (at most ${MAX_CALLOUTS_PAGE} per page)`);
  for (const [s, n] of perSection) if (n > MAX_CALLOUTS_H2) faults.push(`${n} callouts in "${s}" (at most ${MAX_CALLOUTS_H2} per section)`);
  return { type: fm.type, faults };
}

function pages(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...pages(p));
    else if (/\.mdx?$/.test(e)) out.push(p);
  }
  return out;
}

function selftest() {
  const fails = [];
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) fails.push(name); };
  const ex = (h2s, extra = "") => `---\ntype: example\n---\n${h2s.map((h) => `## ${h}\n\ntext\n`).join("\n")}${extra}`;
  const good = ["Requirements", "Get the code", "Run it", "Expected output", "Troubleshooting", "Next"];
  ok("a conforming example passes", grade(ex(good)).faults.length === 0);
  ok("a missing required section fires", grade(ex(good.filter((h) => h !== "Expected output"))).faults.some((f) => f.includes("missing")));
  ok("an unknown section fires", grade(ex([...good.slice(0, 3), "Full code", ...good.slice(3)])).faults.some((f) => f.includes("not a example")));
  ok("a reordered section fires", grade(ex(["Requirements", "Expected output", "Run it", "Troubleshooting", "Next"])).faults.some((f) => f.includes("comes before")));
  ok("a ## inside a code fence is not a section", grade(ex(good, "```bash\n## Not a heading\n```\n")).faults.length === 0);
  const callouts = (n, words = 5, sameSection = false) => `---\ntype: guide\n---\n` +
    Array.from({ length: n }, (_, i) => `${sameSection ? "" : `## S${i}\n`}\n> ${"w ".repeat(words)}\n\ntext\n`).join("\n");
  ok("three short callouts pass", grade(callouts(3)).faults.length === 0);
  ok("a fourth callout fires", grade(callouts(4)).faults.some((f) => f.includes("per page")));
  ok("two callouts in one section fire", grade(`---\ntype: guide\n---\n## A\n\n> one\n\ntext\n\n> two\n`).faults.some((f) => f.includes("per section")));
  ok("a 40-word callout fires", grade(callouts(1, 40)).faults.some((f) => f.includes("words")));
  ok("a pages without a template type is only graded on callouts", grade(`---\ntype: reference\n---\n## Anything\n`).faults.length === 0);
  console.log(fails.length ? `selftest RED: ${fails.join(", ")}` : "selftest GREEN (every rule fired)");
  return fails.length ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  let bad = 0, graded = 0;
  const seen = new Set();
  for (const abs of pages(DOCS).sort()) {
    const rel = relative(ROOT, abs);
    if (EXEMPT.test(rel.replace(/^src\/content\/docs\//, ""))) continue;
    graded++;
    const { faults } = grade(readFileSync(abs, "utf8"));
    if (rel in EXCEPTIONS) {
      seen.add(rel);
      if (!faults.length) { console.log(`::error::${rel} conforms now — delete its EXCEPTIONS entry`); bad++; }
      else console.log(`  excepted  ${rel}: ${EXCEPTIONS[rel]}`);
      continue;
    }
    for (const f of faults) { console.log(`::error::${rel}: ${f}`); bad++; }
  }
  for (const rel of Object.keys(EXCEPTIONS)) if (!seen.has(rel)) { console.log(`::error::EXCEPTIONS names ${rel}, which is not a page — delete the entry`); bad++; }
  if (graded < 30) { console.log(`::error::only ${graded} pages graded — the walker stopped seeing pages`); return 1; }
  console.log(bad ? `G3: ${bad} fault(s) across ${graded} pages` : `G3: ${graded} pages follow their templates and callout rules`);
  return bad ? 1 : 0;
}

process.exit(main());
