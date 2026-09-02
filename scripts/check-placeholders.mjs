#!/usr/bin/env node
// Placeholder guard — refuses to let a `TKTK` marker reach the live site.
//
// WHY THIS EXISTS. This site has withdrawn a published performance number
// three times (2026-07-28, 2026-08-26, 2026-09-02), and every one of them was
// the same mistake: a figure measured on one thing, printed as if it described
// another. The defence that actually works is to write the page BEFORE the
// measurement exists, with the number left as a marker, and to make the build
// fail while the marker is still there. A draft that is merely "not finished"
// gets published by the next person who runs `git push`; a draft that fails CI
// does not.
//
// The marker is `TKTK` — the newsroom convention for "to come". It is not a
// word, it does not occur in prose, and it is trivially greppable. Use it with
// a suffix naming what is missing: `TKTK-GPU-FPS`, `TKTK-ROLLOUT-DATE`.
//
// SCOPE. Only what is published: the docs content collection and the explicit
// pages. `drafts/` is deliberately NOT scanned — that directory has no route
// and holds page-sized text whose subject is not yet true, which is the whole
// point of it.
//
// Pure Node, no deps. Exit 1 on any marker found.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ROOTS = ["src/content", "src/pages", "src/openapi", "public/api"];
const MARKER = /TKTK[A-Z0-9-]*/g;

const files = [];
function walk(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return;
  if (statSync(abs).isDirectory()) {
    for (const name of readdirSync(abs)) walk(join(rel, name));
  } else if (/\.(md|astro|ts|yaml|yml|html|json)$/.test(rel)) {
    files.push(rel);
  }
}
for (const r of ROOTS) walk(r);

const hits = [];
for (const rel of files) {
  const lines = readFileSync(join(ROOT, rel), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const m of line.match(MARKER) ?? []) {
      hits.push({ rel, line: i + 1, marker: m, text: line.trim().slice(0, 120) });
    }
  });
}

if (hits.length === 0) {
  console.log(`check-placeholders: OK — no TKTK markers in ${files.length} published files.`);
  process.exit(0);
}

console.error(
  `check-placeholders: ${hits.length} unresolved placeholder(s). These pages are NOT ready to publish.\n`,
);
for (const h of hits) {
  console.error(`  ${h.rel}:${h.line}  ${h.marker}`);
  console.error(`      ${h.text}`);
}
console.error(
  `\nEach marker names a fact nobody has yet. Replace it with the measured value —\n` +
    `or move the page to drafts/ — before publishing. Do not delete the marker and\n` +
    `leave the sentence standing: the sentence is what would be false.`,
);
process.exit(1);
