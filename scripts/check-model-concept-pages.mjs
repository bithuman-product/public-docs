#!/usr/bin/env node
// Every billable model has a concept page of its own, and the pricing table
// links to it.
//
// WHY THIS EXISTS
// ---------------
// MEASURED against the live site on 2026-09-02 and again on 2026-09-05, with
// the 200s as the positive control that the fetch discriminates:
//
//     /concepts/essence-2       200
//     /concepts/expression-2    200
//     /concepts/essence-1       404   ← a model we bill for
//     /concepts/expression-1    404   ← a model we bill for
//
// A developer who learns the URL pattern from any second-generation model and
// applies it to a first-generation one got nothing. Not a wrong page — NO
// page, which is invisible to every checker beside this one: they all grade
// bytes that exist. `check-internal-links.mjs` cannot see it either, because
// nothing linked to the missing page in the first place.
//
// THE POPULATION, AND WHY IT COMES FROM THE PRICING TABLE
// ------------------------------------------------------
// The list of models is NOT typed here. It is read from the "Serving — credits
// per live minute" table in guides/pricing.md, which is this site's own
// customer-facing authority for what a customer can be billed for. That gives
// exactly the right rule, in one sentence:
//
//     ★ IF WE CHARGE FOR IT, IT GETS A PAGE.
//
// and it excludes the right things by construction rather than by an exception
// list. An internal-only model has no rate-card row, so it is not in this
// population and it is not a gap — which is the same reasoning
// check-internal-vocabulary.mjs applies when it forbids naming one at all. An
// exception list would have to name that model to exempt it, on the public
// site, which is precisely what it must not do.
//
// A list this file typed would agree with itself forever; a list read from the
// page a customer is billed against cannot go quietly short.
//
// ★ AND "EXISTS" MEANS "WILL BE PUBLISHED", NOT "IS ON THIS DISK" (2026-09-06)
// ---------------------------------------------------------------------------
// This checker was GREEN on 2026-09-05 and both pages were still 404 the next
// day. It was not lying about anything it looked at: essence-1.md and
// expression-1.md were on disk, carried titles, were not drafts, and were
// linked from the rate card. They were never `git add`ed.
//
// docs.bithuman.ai is built by Vercel from the PUSHED tree, so a file that is
// only in a working copy is a file the site does not have. Measured against the
// live site on 2026-09-06, with the 200s as the positive control and
// /concepts/zzz-not-a-page as the negative:
//
//     /concepts/essence-2       200   73,215 B
//     /concepts/expression-2    200   48,003 B
//     /concepts/essence-1       404   ← on disk, untracked
//     /concepts/expression-1    404   ← on disk, untracked
//     /concepts/zzz-not-a-page  404   ← negative control
//
// An untracked page is INVISIBLE to every rule that reads bytes, because the
// bytes are right there. So rule 4 below asks git, not the filesystem. That is
// the whole difference between grading a path and grading the system that
// publishes it.
//
// WHAT IT CHECKS
//   1. every model in the serving table has src/content/docs/concepts/<slug>.md
//   2. that file is not a draft and carries a title
//   3. the pricing row LINKS to that page — a page nothing points at is a page
//      nobody finds
//   4. ★ that file is TRACKED BY GIT. An untracked page is not published, and
//      is indistinguishable from a correct one to rules 1-3.
//
// FIRING CONTROL: every rule is run against a synthetic fixture in the same
// pass, because a clean site legitimately produces zero findings and a checker
// that has never been seen to fail is decoration. If a rule cannot fail on its
// own fixture, this exits non-zero.
//
// Deliberately dependency-free, matching the checkers beside it.
//
// EXIT
//   0  every billable model has a page, linked from its rate-card row
//   1  a model is missing a page or a link, or the instrument is blind
//   2  could not run (never a silent pass)

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const PRICING = `${ROOT}src/content/docs/guides/pricing.md`;
const CONCEPTS = `${ROOT}src/content/docs/concepts`;
const HEADING = "## Serving — credits per live minute";

function die(msg) {
  console.error(`check-model-concept-pages: ${msg}`);
  process.exit(2);
}

// ── the population, read from the rate card ─────────────────────────────────
// A row looks like:
//   | [Essence 2](/concepts/essence-2) (`essence-2`) | 4 credits/min | ... |
// The backticked token is the model id; the link (if any) is where the row
// sends a reader.
export function servingRows(text) {
  const start = text.indexOf(HEADING);
  if (start < 0) return null;              // shape changed -> refuse, never pass
  const after = text.slice(start + HEADING.length);
  const rows = [];
  for (const line of after.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) {
      if (rows.length) break;              // table ended
      continue;
    }
    if (/^\|[\s|:-]+\|$/.test(t)) continue;              // separator
    const cell = t.split("|")[1] || "";
    const id = (cell.match(/`([a-z0-9-]+)`/) || [])[1];
    if (!id) continue;                                    // header row
    const href = (cell.match(/\]\((\/[^)\s]+)\)/) || [])[1] || null;
    rows.push({ id, href, cell: cell.trim() });
  }
  return rows.length ? rows : null;
}

export function findings(rows, pageExists, pageTracked = () => true) {
  const out = [];
  for (const r of rows) {
    if (!pageExists(r.id)) {
      out.push(`${r.id}: billed on the rate card and has NO ` +
               `/concepts/${r.id} page. A developer who learned the URL ` +
               `pattern from another model gets a 404.`);
      continue;
    }
    // ★ Rule 4. The file is here; that is not the same as published. The site
    // is built from the pushed tree, so an untracked page 404s exactly like a
    // missing one — and rules 1-3 cannot tell the difference, because the bytes
    // they grade are present.
    if (!pageTracked(r.id)) {
      out.push(`${r.id}: src/content/docs/concepts/${r.id}.md exists on this ` +
               `disk but is NOT TRACKED BY GIT, so it is not in the tree the ` +
               `site is built from and /concepts/${r.id} will 404 for every ` +
               `reader. Fix: git add src/content/docs/concepts/${r.id}.md`);
      continue;
    }
    if (r.href !== `/concepts/${r.id}`) {
      out.push(`${r.id}: the rate-card row does not link to ` +
               `/concepts/${r.id} (links to ${r.href ?? "nothing"}). ` +
               `A page nothing points at is a page nobody finds.`);
    }
  }
  return out;
}

// ── run ─────────────────────────────────────────────────────────────────────
if (!existsSync(PRICING)) die(`cannot read ${PRICING}`);
const pricing = readFileSync(PRICING, "utf8");
const rows = servingRows(pricing);
if (!rows) {
  die(`found no "${HEADING}" table in guides/pricing.md — the shape this ` +
      `checker reads has changed. Refusing to report a clean site off a ` +
      `parse that found nothing.`);
}

const pages = new Set(
  readdirSync(CONCEPTS).filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, "")));
const pageExists = (id) => {
  if (!pages.has(id)) return false;
  const body = readFileSync(`${CONCEPTS}/${id}.md`, "utf8");
  return /^title:\s*\S/m.test(body) && !/^draft:\s*true\s*$/m.test(body);
};

// ── ★ what git will actually publish ────────────────────────────────────────
// `git ls-files` lists the tracked paths, which is what Vercel builds from. A
// file present on disk and absent from this set is a page that will 404.
// If git cannot answer, this REFUSES (exit 2) rather than assuming everything
// is tracked: a checker that silently downgrades to "the bytes are here" is
// exactly the blindness this rule was added to remove.
let trackedConceptPages;
try {
  const out = execFileSync(
    "git", ["-C", ROOT, "ls-files", "--", "src/content/docs/concepts"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  trackedConceptPages = new Set(
    out.split("\n").filter(Boolean)
      .map((f) => f.replace(/^.*\//, "").replace(/\.md$/, "")));
} catch (e) {
  die(`cannot ask git which concept pages are tracked (${e.message.trim()}). ` +
      `This checker grades what will be PUBLISHED, and without git it can ` +
      `only see what is on this disk — which is how two pages sat green here ` +
      `and 404 on the site for a day. Refusing to pass.`);
}
if (trackedConceptPages.size === 0) {
  die(`git reports ZERO tracked files under src/content/docs/concepts. That ` +
      `is not a clean site, it is a broken query — refusing to grade every ` +
      `page as untracked or as fine off a result that found nothing.`);
}
const pageTracked = (id) => trackedConceptPages.has(id);

const real = findings(rows, pageExists, pageTracked);

// ── firing control: each rule must fail on its own fixture, in this run ─────
const control = [
  ["missing page",
   findings([{ id: "zz-fixture", href: "/concepts/zz-fixture" }],
            () => false, () => true)],
  ["untracked page",
   findings([{ id: "zz-fixture", href: "/concepts/zz-fixture" }],
            () => true, () => false)],
  ["unlinked page",
   findings([{ id: "zz-fixture", href: null }], () => true, () => true)],
  ["wrong link",
   findings([{ id: "zz-fixture", href: "/guides/pricing" }],
            () => true, () => true)],
];
const blind = control.filter(([, f]) => f.length === 0).map(([n]) => n);
// and the negative half: a well-formed row must produce NOTHING, or the rules
// above are firing on everything and prove nothing.
const falsePositive =
  findings([{ id: "zz-fixture", href: "/concepts/zz-fixture" }],
           () => true, () => true);

console.log(`check-model-concept-pages: ${rows.length} billable model(s) on ` +
            `the rate card: ${rows.map((r) => r.id).join(", ")}`);
console.log(`  ★firing control  ${control.length - blind.length}/` +
            `${control.length} rules failed their own fixture; ` +
            `${falsePositive.length} false positive(s) on a good row`);

if (blind.length || falsePositive.length) {
  console.error(`check-model-concept-pages: INSTRUMENT IS BLIND — ` +
                `${blind.join(", ") || "no dead rule"}; ` +
                `${falsePositive.length} false positive(s). A checker that ` +
                `cannot fail is not a checker.`);
  process.exit(1);
}
if (real.length) {
  console.error(`check-model-concept-pages: ${real.length} finding(s):`);
  for (const f of real) console.error(`\n - ${f}`);
  process.exit(1);
}
console.log(`check-model-concept-pages: OK — every model on the rate card ` +
            `has a /concepts/ page of its own, TRACKED IN GIT so the build ` +
            `will publish it, and its row links to it.`);
