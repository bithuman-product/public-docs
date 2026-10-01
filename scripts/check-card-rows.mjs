#!/usr/bin/env node
// Docs v2 W9 (owner, 2026-10-01), graded on the BUILT pages:
//
//  R1  CARD ROWS. "The platforms section each row should contain no more than 4
//      cards": every Platforms grid (the landing's band and each /platforms group)
//      is at most four across, in balanced rows (12 → 4+4+4, 8 → 4+4, 6 → 3+3,
//      5 → 3+2), the column count src/lib/grid.ts balancedCols() gives.
//  R2  MODEL CARDS. "each model should come up with highlights, description, and
//      supported devices rather than just merely stating the performance number":
//      on / and on /models every model in src/data/models.ts has one card with an
//      image, a line, two or three highlights and a "Runs on" line that is exactly
//      the places its MATRIX marks available, in matrix order.
//
//   node scripts/check-card-rows.mjs            grade dist/
//   node scripts/check-card-rows.mjs --selftest
// EXIT 0 ok · 1 a fault · 2 could not run
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MODELS, PLACES, MATRIX } from "../src/data/models.ts";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const MAX = 4;
export const balancedCols = (n) => (n <= 0 ? 1 : Math.ceil(n / Math.ceil(n / MAX)));
const unesc = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Every <ul class="card-grid …"> holding platform cards: its classes and its card count. */
export function platformGrids(html) {
  const out = [];
  for (const m of html.matchAll(/<ul\b[^>]*class="([^"]*\bcard-grid\b[^"]*)"[^>]*>([\s\S]*?)<\/ul>/g)) {
    const cards = (m[2].match(/class="card card-platform\b/g) || []).length;
    if (cards) out.push({ cls: m[1], cards });
  }
  return out;
}

export function gradeGrids(html, page) {
  const f = [];
  const grids = platformGrids(html);
  if (!grids.length) f.push(`${page}: no Platforms grid found (the extractor stopped seeing cards)`);
  for (const g of grids) {
    const cols = Number((/\bcols-(\d+)\b/.exec(g.cls) || [])[1]);
    if (!cols) { f.push(`${page}: a Platforms grid of ${g.cards} has no cols-N class ("${g.cls}")`); continue; }
    if (cols > MAX) f.push(`${page}: a Platforms grid of ${g.cards} is ${cols} across (at most ${MAX})`);
    else if (cols !== balancedCols(g.cards)) f.push(`${page}: a Platforms grid of ${g.cards} is ${cols} across; balanced rows need ${balancedCols(g.cards)}`);
  }
  return f;
}

/** Every model card (src/lib/model-card.ts) on a page. */
export function modelCards(html) {
  return [...html.matchAll(/<a class="card card-model mcard[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => {
    const b = m[1];
    const title = unesc((/<(?:h[234]|strong)>([^<]+)<\/(?:h[234]|strong)>/.exec(b) || [])[1] ?? "");
    return {
      title,
      img: /<img\b[^>]*\bsrc="[^"]+\.webp"[^>]*\balt="[^"]+"/.test(b),
      line: /<span class="card-line">[^<]{10,}<\/span>/.test(b),
      points: (b.match(/class="mcard-point"/g) || []).length,
      runs: [...b.matchAll(/<span class="mcard-place">([^<]+)<\/span>/g)].map((x) => unesc(x[1])),
    };
  });
}

export function gradeModels(html, page) {
  const f = [];
  const cards = modelCards(html);
  for (const m of MODELS) {
    const c = cards.filter((x) => x.title === m.name);
    if (c.length !== 1) { f.push(`${page}: ${c.length} cards for ${m.name} (want 1)`); continue; }
    const [k] = c;
    const want = PLACES.filter((p) => MATRIX[m.id][p.id].ok).map((p) => p.short);
    if (!k.img) f.push(`${page}: the ${m.name} card has no image with alt text`);
    if (!k.line) f.push(`${page}: the ${m.name} card has no description line`);
    if (k.points < 2 || k.points > 3) f.push(`${page}: the ${m.name} card has ${k.points} highlights (want 2–3)`);
    if (k.runs.join("|") !== want.join("|")) f.push(`${page}: the ${m.name} card runs on "${k.runs.join(", ")}", the matrix says "${want.join(", ")}"`);
  }
  if (cards.length !== MODELS.length) f.push(`${page}: ${cards.length} model cards (want ${MODELS.length})`);
  return f;
}

function selftest() {
  const grid = (cols, n) => `<ul class="card-grid tiles cols-${cols}" role="list">${'<li><a class="card card-platform" href="/x">x</a></li>'.repeat(n)}</ul>`;
  const cases = [
    ["12 at 4", grid(4, 12), 0], ["6 at 3", grid(3, 6), 0], ["5 at 3", grid(3, 5), 0], ["8 at 4", grid(4, 8), 0],
    ["12 at 5", grid(5, 12), 1], ["6 at 4 (4+2)", grid(4, 6), 1], ["no cols", `<ul class="card-grid">${'<li><a class="card card-platform">x</a></li>'.repeat(3)}</ul>`, 1],
  ];
  let bad = 0;
  for (const [name, html, want] of cases) {
    const got = gradeGrids(html, "t").length ? 1 : 0;
    if (got !== want) { bad++; console.log(`selftest FAIL ${name}: ${got ? "faulted" : "passed"}`); }
  }
  const card = (m, runs, pts = 2) => `<a class="card card-model mcard mcard-x" href="/m"><picture><img src="/a.webp" alt="A"></picture><span class="card-body"><span class="card-title"><h3>${m.name}</h3></span><span class="card-line">A line long enough.</span>` +
    `${'<span class="mcard-point">p</span>'.repeat(pts)}<span class="mcard-runs">${runs.map((r) => `<span class="mcard-place">${r.replace(/&/g, "&amp;")}</span>`).join("")}</span></span></a>`;
  const ok = (m) => PLACES.filter((p) => MATRIX[m.id][p.id].ok).map((p) => p.short);
  const good = MODELS.map((m) => card(m, ok(m))).join("");
  if (gradeModels(good, "t").length) { bad++; console.log("selftest FAIL good model cards faulted:", gradeModels(good, "t")); }
  const wrongRuns = MODELS.map((m, i) => card(m, i === 3 ? [...ok(m), "Android"] : ok(m))).join("");
  if (!gradeModels(wrongRuns, "t").length) { bad++; console.log("selftest FAIL a Runs on line off the matrix passed"); }
  const onePoint = MODELS.map((m, i) => card(m, ok(m), i === 0 ? 1 : 2)).join("");
  if (!gradeModels(onePoint, "t").length) { bad++; console.log("selftest FAIL one highlight passed"); }
  const missing = MODELS.slice(1).map((m) => card(m, ok(m))).join("");
  if (!gradeModels(missing, "t").length) { bad++; console.log("selftest FAIL a missing model passed"); }
  console.log(bad ? `card-rows selftest: ${bad} FAIL` : "card-rows selftest ok");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const read = (rel) => { const p = join(DIST, rel); if (!existsSync(p)) return null; return readFileSync(p, "utf8"); };
  const home = read("index.html"), hub = read("platforms/index.html"), models = read("models/index.html");
  if (!home || !hub || !models) { console.log("::error::card-rows: dist/ has no index.html, platforms/index.html or models/index.html; build first"); return 2; }
  const f = [...gradeGrids(home, "/"), ...gradeGrids(hub, "/platforms"), ...gradeModels(home, "/"), ...gradeModels(models, "/models")];
  for (const x of f) console.log(`::error::${x}`);
  console.log(f.length ? `card-rows: ${f.length} fault(s)` : `card-rows ok: Platforms grids at most ${MAX} across in balanced rows on / and /platforms; ${MODELS.length} model cards with image, line, highlights and the matrix's Runs on, on / and /models`);
  return f.length ? 1 : 0;
}

process.exit(main());
