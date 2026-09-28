#!/usr/bin/env node
// A MEASURED FRAME RATE HAS ONE WRITER, AND IT IS NOT A PERSON.
//
// WHY THIS EXISTS
// ---------------
// Every speed this site publishes is generated from the measurement record in
// bithuman-models (models/essence-2/perf/FLOORS.json) by that repository's emitter,
// and written only between `<!-- FLOORS:… -->` markers: the performance page, the
// headline the landing page, /start and the SDK hub show, and /performance.json.
// A number typed anywhere else is a copy, and the day the record moves it becomes
// false with nothing to notice. That has happened on this site repeatedly: sdk/ios
// said "33 frames per second" while the record already said 52 (2026-09-14), and
// the audit of 2026-09-23 found "31.3 FPS, 1.56x real time" in a sample on the same
// page while the table said something else for the same hardware.
//
// So this gate fails on any MEASURED rate literal outside a generated block. It
// does not decide whether a number is right; it decides whether a person typed it.
//
// WHAT COUNTS AS A MEASURED RATE LITERAL
//   * a number next to fps / FPS / frames per second / frames a second / frames/s
//   * a number next to "x real time" / "× real time" (a multiple of real time is
//     always a measurement: nothing plays at "2.2x")
//
// WHAT IS ALLOWED, EACH WITH ITS REASON
//   * the two PLAY RATES — 20 (Expression 2) and 25 (Essence 2). They are the
//     product's output contract, stated all over the site, not measurements.
//   * anything inside a generated FLOORS block (scripts/floors-blocks.mjs finds
//     them; an unclosed marker is a fault here, so it cannot exempt a whole file).
//   * the changelog and its archive: dated history, not a current claim.
//   * ALLOW below: named literals, each with the page, the exact text and why.
//     A stale entry (its text no longer on the page) is reported so it gets
//     deleted; the list only ever shrinks.
//
// SCOPE: what is published or feeds a published page — the docs collection, the
// explicit pages, the partials they import, the components and layouts, the
// config the llms.txt / llms-full.txt builders read, and src/data.
//
// FIX: link to the performance page (/performance), or place a
// `<!-- FLOORS:HEADLINE -->…<!-- /FLOORS:HEADLINE -->` block and let the emitter
// fill it. Never add the number to ALLOW to get a green.
//
// THE BUILT JSON-LD. Every page's structured data states speed, and its source
// (src/config/site-jsonld.ts) types no number: it reads the generated headline
// and performance.json. So once dist/ is built the rendered graph is graded
// instead: no frame rate at all (the play rates included) and no resolution —
// structured data states speed as × real time only — and every multiple in it
// is a published cell of public/performance.json, floored as formatMultiple
// floors it. The changelog pages are dated history and are not graded.
//
// USAGE
//   node scripts/check-perf-literals.mjs
//   node scripts/check-perf-literals.mjs --selftest
//
// EXIT 0 clean · 1 a hand-typed measured rate (or a malformed marker)

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findBlocks, withoutBlocks, lineOf, walk } from "./floors-blocks.mjs";
import { builtJsonLd } from "./jsonld.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
export const ROOTS = [
  "src/content",
  "src/pages",
  "src/partials",
  "src/components",
  "src/layouts",
  "src/config",
  "src/data",
];

/** The two play rates: Expression 2 plays at 20 fps, Essence 2 at 25. */
export const PLAY_RATES = new Set(["20", "25"]);

/** Dated history is not a current claim. */
const isHistory = (rel) => /(^|\/)changelog(\/[^/]+)?\.mdx?$/.test(rel);

/** Named exceptions. Every entry: the file, the exact literal as it appears, and
 *  why it may stay. Delete an entry the moment its text is gone. */
export const ALLOW = [];

const RATE = /(?<![\w.])(\d+(?:\.\d+)?)\s?(?:fps|FPS|frames?\s+(?:per|a)\s+second|frames\/s)\b/g;
const MULTIPLE = /(?<![\w.])(\d+(?:\.\d+)?)\s?[x×]\s?real[ -]?time\b/gi;

/** Every measured-rate literal in a text, outside generated blocks. */
export function literals(text) {
  const [blocks, faults] = findBlocks(text);
  const open = withoutBlocks(text, blocks);
  const out = [];
  for (const re of [RATE, MULTIPLE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(open)) !== null) {
      const multiple = re === MULTIPLE;
      if (!multiple && PLAY_RATES.has(m[1])) continue;
      // ★1× IS THE THRESHOLD, NOT A MEASUREMENT: "at 1× real time or faster an avatar holds a
      //  live conversation" states the contract every cell is read against, like the play rates.
      if (multiple && /^1(\.0+)?$/.test(m[1])) continue;
      out.push({ value: m[1], text: m[0], line: lineOf(open, m.index), multiple });
    }
  }
  return { hits: out.sort((a, b) => a.line - b.line), faults };
}

/** A frame rate or a resolution: neither belongs in the structured data. */
const LD_FRAME_RATE = /\b\d+(?:\.\d+)?\s?(?:fps|FPS)\b|\bfps\b|\bframes?\s+(?:per|a)\s+second\b|\bframes\/s\b/i;
const LD_RESOLUTION = /\b\d{3,4}\s?[x×]\s?\d{3,4}\b|\b(?:480|720|1080|1440|2160)p\b|\b[48]K\b/;
const LD_MULTIPLE = /(?<![\w.])(\d+(?:\.\d+)?)\s?×(?!\s?\d)/g;

/** Faults in one JSON-LD node's text, against the set of published multiples
 *  (each as formatMultiple prints it, e.g. "4.1×"). */
export function gradeJsonLdText(text, published) {
  const faults = [];
  const fr = LD_FRAME_RATE.exec(text);
  if (fr) faults.push(`a frame rate ("${fr[0]}"): structured data states speed as × real time only`);
  const res = LD_RESOLUTION.exec(text);
  if (res) faults.push(`a resolution ("${res[0]}"): structured data makes no resolution claim`);
  for (const m of text.matchAll(LD_MULTIPLE)) {
    if (/^1(\.0+)?$/.test(m[1])) continue; // 1.0× is the real-time threshold, not a measurement
    if (!published.has(`${m[1]}×`)) faults.push(`"${m[0]}" is not a published cell of performance.json`);
  }
  return faults;
}

/** Every published cell's multiple, floored to one decimal as the pages print it. */
export async function publishedMultiples(perf) {
  const { formatMultiple } = await import(new URL("../src/lib/format-multiple.ts", import.meta.url).href);
  return new Set(perf.rows.filter((r) => r.published).flatMap((r) => Object.values(r.cells).filter(Boolean).map((c) => formatMultiple(c.x_realtime))));
}

/** (failures, allowed, stale) for a corpus of {rel, text}. */
export function grade(files, allow = ALLOW) {
  const failures = [];
  const allowed = [];
  const used = new Set();
  for (const { rel, text } of files) {
    const { hits, faults } = literals(text);
    for (const f of faults) failures.push({ rel, line: 0, what: "malformed generated block", why: f });
    if (isHistory(rel)) continue;
    for (const h of hits) {
      const i = allow.findIndex((a) => a.file === rel && h.text === a.text);
      if (i !== -1) {
        used.add(i);
        allowed.push({ rel, line: h.line, text: h.text, why: allow[i].why });
        continue;
      }
      failures.push({ rel, line: h.line, what: h.text, why: h.multiple ? "a multiple of real time typed by hand" : "a measured frame rate typed by hand" });
    }
  }
  const scanned = new Set(files.map((f) => f.rel));
  const stale = allow.filter((a, i) => !used.has(i) && scanned.has(a.file));
  const missing = allow.filter((a) => !scanned.has(a.file));
  return { failures, allowed, stale: [...stale, ...missing] };
}

function corpus() {
  return walk(ROOT, ROOTS).map((rel) => ({ rel, text: readFileSync(join(ROOT, rel), "utf8") }));
}

/** The built JSON-LD's failures, or null when dist/ is not built. */
async function builtFailures() {
  const dist = join(ROOT, "dist");
  if (!existsSync(join(dist, "index.html"))) return null;
  const ld = builtJsonLd(dist, { root: ROOT, skip: (rel) => /(^|\/)changelog(\/|\.html$)/.test(rel) });
  const failures = ld.faults.map((f) => ({ rel: f, line: 0, what: "JSON-LD", why: "does not parse" }));
  if (!ld.nodes.length) failures.push({ rel: "dist/", line: 0, what: "JSON-LD", why: "no built page carries JSON-LD — the reader of the <head> moved" });
  const published = await publishedMultiples(JSON.parse(readFileSync(join(ROOT, "public/performance.json"), "utf8")));
  for (const n of ld.nodes) for (const why of gradeJsonLdText(n.text, published)) failures.push({ rel: n.page, line: 0, what: `JSON-LD (${n.type})`, why });
  return { failures, nodes: ld.nodes.length, pages: ld.pages };
}

async function main() {
  if (process.argv.includes("--selftest") || process.argv.includes("--self-test")) return selftest();
  const files = corpus();
  const { failures, allowed, stale } = grade(files);
  const built = await builtFailures();
  if (built) failures.push(...built.failures);
  console.log(`check-perf-literals — ${files.length} files under ${ROOTS.join(", ")}` +
    (built ? `, and the built JSON-LD (${built.nodes} distinct node(s) on ${built.pages} page(s))` : "; the built JSON-LD is graded once dist/ is built"));
  for (const a of allowed) console.log(`  allowed  ${a.rel}:${a.line}  "${a.text}" — ${a.why}`);
  for (const s of stale) {
    console.log(`  ★STALE ALLOW ENTRY — "${s.text}" is no longer in ${s.file}. Delete it from ALLOW in scripts/check-perf-literals.mjs.`);
  }
  if (failures.length) {
    console.error(`\nFAILED — ${failures.length} measured rate(s) typed outside a generated FLOORS block:`);
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.rel}:${f.line}  "${f.what}" — ${f.why}`));
    console.error(
      "\n  Every measured speed is generated from bithuman-models' perf/FLOORS.json. Link to the\n" +
        "  performance page (/performance) instead, or place a <!-- FLOORS:HEADLINE --> …\n" +
        "  <!-- /FLOORS:HEADLINE --> block and let the emitter fill it. The play rates (20 fps\n" +
        "  Expression 2, 25 fps Essence 2) are exempt: they are the output contract. In the built\n" +
        "  JSON-LD nothing is exempt: it states speed as × real time from a published cell only.",
    );
    process.exit(1);
  }
  console.log(`\nOK — no measured rate outside a generated block (${allowed.length} named exception(s), ${stale.length} stale)` +
    (built ? "; the built JSON-LD states speed only as published × real time." : "."));
}

/* ---------------------------------------------------------------- selftest */

async function selftest() {
  let bad = 0;
  const arm = (name, ok) => {
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name}`);
  };
  const g = (text, rel = "src/content/docs/sdk/x.md", allow = []) => grade([{ rel, text }], allow).failures;
  const HEAD = "<!-- FLOORS:HEADLINE -->\n| | Cloud API |\n|---|---|\n| **Essence 2** | **103 fps** · 4.1× real time |\n<!-- /FLOORS:HEADLINE -->\n";

  console.log("DEFECT ARMS — each must FIRE");
  arm("a planted measured rate reddens", g("The browser renders at 118 fps today.\n").length === 1);
  arm("FPS in capitals reddens", g("generated 407 frames in 13.02 s (31.3 FPS)\n").length === 1);
  arm("'frames per second' reddens", g("measured on an iPhone 15 at 52 frames per second\n").length === 1);
  arm("'frames a second' reddens", g("it sustains about 40 frames a second when warm\n").length === 1);
  arm("a multiple of real time reddens", g("that is 1.56x real time\n").length === 1 && g("that is 4.1× real time\n").length === 1);
  arm("...but 1× — the real-time threshold itself — is the contract, not a measurement",
    g("At 1× real time or faster, an avatar holds a live conversation.\n").length === 0
      && g("at 1.0× real time or more\n").length === 0 && g("that is 1.5× real time\n").length === 1);
  arm("a rate in an Astro page reddens", g("<p>Up to 357 fps on a GPU</p>\n", "src/pages/index.astro").length === 1);
  arm("a rate in the llms config reddens", g("`- **Speed**: 177 fps on an M4`", "src/config/agent-facts.ts").length === 1);
  arm("a rate inside a code sample reddens (a sample is still a published number)", g("```text\ngenerated 407 frames (31.3 FPS)\n```\n").length === 1);
  arm("a rate typed right AFTER a generated block reddens", g(`${HEAD}The GPU does 103 fps.\n`).length === 1);
  arm("an unclosed FLOORS marker is a fault, and exempts nothing after it",
    (() => {
      const f = g("<!-- FLOORS:HEADLINE -->\nlater: 118 fps\n");
      return f.some((x) => x.what === "malformed generated block") && f.some((x) => x.what === "118 fps");
    })());
  arm("a closing marker with no opener is a fault", g("text\n<!-- /FLOORS:HEADLINE -->\n").some((x) => x.what === "malformed generated block"));
  arm("an allow entry covers only its own file", g("31.3 FPS\n", "src/content/docs/platforms/web.md", [{ file: "src/content/docs/platforms/ios.md", text: "31.3 FPS", why: "t" }]).length === 1);
  arm("a range whose top is not a play rate reddens", g("renders 40–60 fps\n").length === 1);

  console.log("\nGOOD ARMS — each must stay SILENT");
  arm("the play rates are the contract", g("Expression 2 plays at 20 fps and Essence 2 at 25 frames per second.\n").length === 0);
  arm("a play-rate range is the contract", g("<p>20–25 fps real-time lip-sync</p>\n", "src/pages/index.astro").length === 0);
  arm("a generated FLOORS:HEADLINE block is exempt", g(HEAD).length === 0);
  arm("a generated keyed table is exempt", g("<!-- FLOORS:TABLE all -->\n| Cloud API | 357 | **17.8×** real time |\n<!-- /FLOORS:TABLE -->\n").length === 0);
  arm("two generated blocks on one page are both exempt", g(`${HEAD}\nprose\n${HEAD}`).length === 0);
  arm("a named allow entry is honoured", g("31.3 FPS\n", "src/content/docs/platforms/ios.md", [{ file: "src/content/docs/platforms/ios.md", text: "31.3 FPS", why: "t" }]).length === 0);
  arm("the changelog is dated history", g("- 0.5.12: Android Essence 2 went from 52 to 46 fps\n", "src/content/docs/changelog.md").length === 0);
  arm("the changelog archive is dated history", g("- rendered at 12 fps\n", "src/content/docs/changelog/archive.md").length === 0);
  arm("a placeholder is not a number", g("render <frames> frames in <seconds> s = <rate> fps\n").length === 0);
  arm("an identifier is not a literal", g('"render_fps":39.3 and AVATAR_VIDEO_MAX_FPS\n').length === 0);
  arm("a jq template is not a literal", g("\"\\(.fps) fps, \\(.x_realtime)x real time\"\n").length === 0);
  arm("a version number is not a rate", g("bithuman 2.11.6 and 25fpsx\n").length === 0);

  console.log("\nBUILT JSON-LD — structured data states speed as published × real time only");
  const pub = new Set(["4.1×", "17.0×", "2.0×"]);
  const j = (t) => gradeJsonLdText(t, pub);
  arm("a frame rate reddens, the play rates included", j("Real-time lip-sync — 25 fps (Essence 2), 20 fps (Expression 2)").length === 1 && j("up to 25 frames per second").length === 1);
  arm("a resolution reddens", j("renders 1920×1080 video").length === 1 && j("a 1080p avatar").length === 1 && j("416x720 frames").length === 1);
  arm("a multiple that is not a published cell reddens", j("Essence 2, × real time: Cloud API 9.9×").length === 1);
  arm("...and one copied from a published cell is silent", j("Essence 2, × real time: Cloud API 4.1×, Android 2.0×; Expression 2 17.0×").length === 0);
  arm("1.0× is the threshold, not a measurement", j("at 1.0× or more an avatar holds a live conversation").length === 0);
  arm("the published set is floored as the pages floor it", (await publishedMultiples({ rows: [{ published: true, cells: { a: { x_realtime: 4.16 }, b: null } }, { published: false, cells: { a: { x_realtime: 9.9 } } }] })).has("4.1×")
    && !(await publishedMultiples({ rows: [{ published: false, cells: { a: { x_realtime: 9.9 } } }] })).has("9.9×"));

  console.log("\nCORPUS CONTROLS — the arms above must be grading something");
  const files = corpus();
  arm("the corpus is non-trivial (the docs collection and the pages are scanned)",
    files.length > 50 && files.some((f) => f.rel.startsWith("src/content/docs/")) && files.some((f) => f.rel.startsWith("src/pages/")));
  arm("the corpus states the play rates, and they are silent", (() => {
    const n = files.reduce((k, f) => k + (f.text.match(/\b(20|25) fps\b/g) ?? []).length, 0);
    return n > 10;
  })());

  console.log(bad ? `\nFAILED — ${bad} arm(s)` : "\nPASSED — every defect arm fired and every good arm stayed silent");
  process.exit(bad ? 1 : 0);
}

await main();
