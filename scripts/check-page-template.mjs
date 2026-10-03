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
  // A. Platform page (docs spec §3.3 A). A section that does not apply is
  // omitted (a web page has nothing to install), so Install is not required.
  // Docs v2 (SPEC §5, G3 v2, W3): a platform's own page is its quickstart. Building it
  // into an app, its troubleshooting and its reference are pages of their own; the
  // CLI and REST quickstarts keep their Complete example (cli-sample-output).
  platform: {
    order: ["What you get", "Before you start", "Install", "Authenticate", "Run your first avatar", "Complete example",
      "Performance", "Next"],
    required: ["Authenticate", "Run your first avatar"],
  },
  // Building it into an app (SPEC §5): what moved off the quickstart, in this order.
  "platform-app": {
    order: ["Integrate into your app", "Complete example", "Platform notes", "Reference", "Next"],
    required: ["Integrate into your app"],
  },
  // B. Recipe (§3.3 B): the outcome, the steps with a check each, how it works.
  recipe: {
    order: ["What you'll build", "Steps", "How it works", "Make it your own", "Troubleshooting", "Next"],
    required: ["Steps", "Troubleshooting"],
  },
  // E. Deploy mode (§3.3 E): what it is, where it renders and what reaches
  // bitHuman, the models, the speed, the price, the limits.
  deploy: {
    // Docs v2 (SPEC §5, G3 v2, W4): "Models available here" and "Choosing between modes"
    // left each mode page for the one #compare matrix on /deploy (gradeDeploy pins that each
    // mode names its models there); a mode page links to it instead.
    order: ["What it is", "Where it renders", "Speed", "Price", "Limits", "First command"],
    required: ["What it is", "Where it renders", "Speed", "Price", "Limits"],
    links: ["/deploy#compare"],
  },
  // Example (§3.3): the run, what you see, and "The code that matters" (the
  // core lines, verbatim from bithuman-examples: scripts/check-example-excerpts.mjs).
  example: {
    order: ["Requirements", "Get the code", "Set up the app", "Set your API secret", "Run it",
      "Expected output", "How it works", "The code that matters", "Make it your own", "Troubleshooting", "Next"],
    required: ["Requirements", "Run it", "Expected output", "The code that matters", "Troubleshooting", "Next"],
  },
};

/** Pages that do not follow their template yet. Each entry says why, and the
 *  check refuses an entry whose page already conforms. */
export const EXCEPTIONS = {
  "src/content/docs/platforms/windows.md": "the Windows/Apps lane owns this page and its split (docs v2 SPEC §3 Apps, §11); it keeps the pre-W3 platform sections until then",
  "src/content/docs/platforms/rest.md": "docs v2 W5 (API): its Integrate, Troubleshooting and Reference move to the API pages (SPEC §4 rest# rows); /api/errors#handling-errors is built there",
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
    for (const l of t.links ?? []) if (!body.includes(`](${l})`)) faults.push(`no link to ${l}`);
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
  const good = ["Requirements", "Get the code", "Run it", "Expected output", "The code that matters", "Troubleshooting", "Next"];
  ok("a conforming example passes", grade(ex(good)).faults.length === 0);
  ok("a missing required section fires", grade(ex(good.filter((h) => h !== "Expected output"))).faults.some((f) => f.includes("missing")));
  ok("an unknown section fires", grade(ex([...good.slice(0, 3), "Full code", ...good.slice(3)])).faults.some((f) => f.includes("not a example")));
  ok("a reordered section fires", grade(ex(["Requirements", "Expected output", "Run it", "The code that matters", "Troubleshooting", "Next"])).faults.some((f) => f.includes("comes before")));
  ok("an example without the code that matters fires", grade(ex(good.filter((h) => h !== "The code that matters"))).faults.some((f) => f.includes("The code that matters")));
  ok("a ## inside a code fence is not a section", grade(ex(good, "```bash\n## Not a heading\n```\n")).faults.length === 0);
  const callouts = (n, words = 5, sameSection = false) => `---\ntype: guide\n---\n` +
    Array.from({ length: n }, (_, i) => `${sameSection ? "" : `## S${i}\n`}\n> ${"w ".repeat(words)}\n\ntext\n`).join("\n");
  ok("three short callouts pass", grade(callouts(3)).faults.length === 0);
  ok("a fourth callout fires", grade(callouts(4)).faults.some((f) => f.includes("per page")));
  ok("two callouts in one section fire", grade(`---\ntype: guide\n---\n## A\n\n> one\n\ntext\n\n> two\n`).faults.some((f) => f.includes("per section")));
  ok("a 40-word callout fires", grade(callouts(1, 40)).faults.some((f) => f.includes("words")));
  ok("a pages without a template type is only graded on callouts", grade(`---\ntype: reference\n---\n## Anything\n`).faults.length === 0);
  const pf = (h2s) => `---\ntype: platform\n---\n${h2s.map((h) => `## ${h}\n\ntext\n`).join("\n")}`;
  ok("a platform page with nothing to install passes", grade(pf(["Authenticate", "Run your first avatar", "Performance"])).faults.length === 0);
  ok("a platform page missing its first run fires", grade(pf(["Authenticate", "Performance"])).faults.some((f) => f.includes("Run your first avatar")));
  ok("a platform page that still carries its troubleshooting fires", grade(pf(["Authenticate", "Run your first avatar", "Troubleshooting"])).faults.some((f) => f.includes("Troubleshooting")));
  const pa = (h2s) => `---\ntype: platform-app\n---\n${h2s.map((h) => `## ${h}\n\ntext\n`).join("\n")}`;
  ok("an app page in order passes", grade(pa(["Integrate into your app", "Complete example", "Platform notes", "Reference"])).faults.length === 0);
  ok("an app page without Integrate fires", grade(pa(["Complete example", "Platform notes"])).faults.some((f) => f.includes("Integrate")));
  ok("a deploy page missing Limits fires", grade(`---\ntype: deploy\n---\n## What it is\n\n[c](/deploy#compare)\n## Where it renders\n\nx\n## Speed\n\nx\n## Price\n\nx\n`).faults.some((f) => f.includes("Limits")));
  ok("a deploy page with no /deploy#compare link fires", grade(`---\ntype: deploy\n---\n## What it is\n\nx\n`).faults.some((f) => f.includes("/deploy#compare")));
  ok("a recipe without Steps fires", grade(`---\ntype: recipe\n---\n## How it works\n\nx\n## Troubleshooting\n\nx\n`).faults.some((f) => f.includes("Steps")));
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
