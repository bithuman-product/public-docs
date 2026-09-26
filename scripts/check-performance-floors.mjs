#!/usr/bin/env node
// THE PERFORMANCE NUMBERS ARE A MEASUREMENT, AND THIS REPOSITORY IS WHERE THEY
// CAN BE EDITED BY HAND.
//
// WHY THIS EXISTS
// ---------------
// Every speed this site publishes is GENERATED. bithuman-models' emitter
//
//     python3 models/essence-2/tools/check_perf_floors.py \
//       --emit-docs <page> --emit-json public/performance.json
//
// reads models/essence-2/perf/FLOORS.json (the measurement record) and writes
// the numbers between `<!-- FLOORS:… -->` markers: the performance page's speed
// table, its release line, memory table and method paragraph, the headline
// partial the landing page, /start and the SDK hub import, and per-platform
// snippets, plus /performance.json beside them. The record's own workflow
// re-reads the LIVE page daily and reddens when the two disagree, but from the
// other repository, after this one has merged, on a branch that cannot fix it.
//
// ★THE HOLE THAT LEAVES, AND THE ONLY THING THIS FILE IS FOR. A pull request
// here can retype a cell, drop a row, hand-edit performance.json, or merge a
// rebase that loses a regenerated block, and nothing else in this repository
// looks. So this gate grades every generated block against a PIN.
//
// ★AND THIS IS NOT A SECOND EMITTER. It computes no fps. The pin is taken only
// when a fresh emit from bithuman-models `origin/main` reproduces every
// generated block and performance.json BYTE FOR BYTE (`--write`), so a pin can
// never launder a hand edit into a record. Between pins, the one semantic check
// it makes is that the page's speed table and performance.json AGREE: every
// row, fps and multiple of real time on the page is the one the JSON carries.
// That is how a hand edit to BOTH files (with a hand-edited pin) is still caught.
//
// WHY THE RECORD IS PINNED RATHER THAN FETCHED
// --------------------------------------------
// `bithuman-models` is PRIVATE and this repository holds no secret, so the
// record is unreachable from CI. The questions are separated:
//
//   blocks <-> pin     always: has a generated block or performance.json been
//                      edited since the emitter wrote it?
//   table  <-> json    always: does the page say what the JSON says?
//   json   <-> clock   always: is every published cell inside the record's
//                      re-measure clock (30 days)? The calendar moves with no
//                      push, so the workflow also runs daily.
//   json   <-> record  needs the record (a devbox checkout, `--models`); in CI
//                      it prints COULD NOT LOOK, never "matched".
//   served <-> pin     on the trunk: what docs.bithuman.ai actually serves.
//
// RETIRED FOR GOOD (REDESIGN.md §3.1): the per-row currency table
// (`PERF-CURRENCY`) and the investigation-log notes (`FLOORS:NOTES`). Either
// marker anywhere on the site is a failure.
//
// EXIT 0 MATCHED · 1 DRIFTED · 2 COULD NOT LOOK (a failure you can see, never
// a pass).
//
// USAGE
//   node scripts/check-performance-floors.mjs
//   node scripts/check-performance-floors.mjs --served https://docs.bithuman.ai
//   node scripts/check-performance-floors.mjs --models ../bithuman-models
//   node scripts/check-performance-floors.mjs --regen --models ../bithuman-models
//   node scripts/check-performance-floors.mjs --write --models ../bithuman-models
//   node scripts/check-performance-floors.mjs --selftest
//
//   --regen  runs origin/main's emitter over every file that carries FLOORS
//            markers and writes public/performance.json, then pins.
//   --write  pins what is on disk, and REFUSES unless a fresh emit reproduces it.

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { findBlocks, filesWithBlocks, RETIRED_MARKERS } from "./floors-blocks.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PIN = "scripts/performance-floors.json";
const JSON_PATH = "public/performance.json";
const RECORD_PATH = "models/essence-2/perf/FLOORS.json";
const EMITTER_PATH = "models/essence-2/tools/check_perf_floors.py";
/** Where generated blocks may live: pages, the partials they import, Astro pages. */
const BLOCK_ROOTS = ["src/content", "src/partials", "src/pages"];
/** The page is the one file carrying the merged speed table. */
const PAGE_TABLE_KEY = "all";

// ★THE RECORD IS READ FROM `origin/main`, NOT FROM A WORKING TREE. Measured
// 2026-09-21: a working-tree read on a feature branch graded this page against
// 52 findings that were pure checkout state.
const RECORD_REF = "origin/main";

// ★THE PLAY RATE IS A PRODUCT CONSTANT, NOT A MEASUREMENT. It is read from
// performance.json's own `models` block; this pair is only the fallback that
// lets a malformed JSON be named rather than crash. Expression 2 plays at 20,
// Essence 2 at 25.
const MODEL_NAME = { "essence-2": "Essence 2", "expression-2": "Expression 2" };

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const isoToday = () => new Date().toISOString().slice(0, 10);

/** Whole days between two ISO dates, or null when either is unreadable. */
export function ageDays(measured, today) {
  const a = Date.parse(`${measured}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / 86400000);
}

/* --------------------------------------------------------- the corpus */

/** {rel: text} for every file that carries a FLOORS marker (or a retired one). */
export function loadCorpus(root = ROOT) {
  const out = {};
  for (const rel of filesWithBlocks(root, BLOCK_ROOTS)) out[rel] = readFileSync(join(root, rel), "utf8");
  // a retired marker with no FLOORS block beside it must still be seen
  for (const rel of filesWithRetired(root)) if (!(rel in out)) out[rel] = readFileSync(join(root, rel), "utf8");
  return out;
}

function filesWithRetired(root) {
  const hits = [];
  try {
    const r = spawnSync("grep", ["-rlE", "PERF-CURRENCY|FLOORS:NOTES", ...BLOCK_ROOTS], { cwd: root, encoding: "utf8" });
    for (const l of (r.stdout || "").split("\n")) if (l.trim()) hits.push(l.trim());
  } catch {
    /* grep missing: the FLOORS walk still sees any file that also has a block */
  }
  return hits;
}

/** The performance page: the ONE file whose table is keyed `all`. */
export function findPage(corpus) {
  const hits = Object.entries(corpus).filter(([, t]) => findBlocks(t)[0].some((b) => b.marker === "TABLE" && b.key === PAGE_TABLE_KEY));
  if (hits.length === 1) return { rel: hits[0][0], text: hits[0][1], why: null };
  return {
    rel: null,
    text: null,
    why: hits.length
      ? `${hits.length} files carry <!-- FLOORS:TABLE ${PAGE_TABLE_KEY} -->: ${hits.map(([r]) => r).join(", ")} — the speed table is published once`
      : `no file under ${BLOCK_ROOTS.join(", ")} carries <!-- FLOORS:TABLE ${PAGE_TABLE_KEY} --> — the generated speed table is gone`,
  };
}

/** src/content/docs/sdk/performance.md -> /sdk/performance ; …/docs/performance.md -> /performance */
export function routeOf(rel) {
  const m = /^src\/content\/docs\/(.+?)\.mdx?$/.exec(rel ?? "");
  return m ? `/${m[1].replace(/\/index$/, "")}` : null;
}

/** Every generated block on the site, in a stable order. */
export function allBlocks(corpus) {
  const blocks = [];
  const faults = [];
  for (const rel of Object.keys(corpus).sort()) {
    const [bs, fs] = findBlocks(corpus[rel]);
    fs.forEach((f) => faults.push({ rule: "B0", where: rel, why: f }));
    const seen = {};
    for (const b of bs) {
      const id = `${b.marker}${b.key ? ` ${b.key}` : ""}`;
      seen[id] = (seen[id] ?? 0) + 1;
      blocks.push({ file: rel, marker: b.marker, key: b.key, index: seen[id] - 1, body: b.body, line: b.line });
    }
    for (const r of RETIRED_MARKERS) {
      if (r.re.test(corpus[rel])) {
        faults.push({
          rule: "B1",
          where: rel,
          why:
            `${rel} carries ${r.name}. It is retired for good (REDESIGN §3.1): staleness is the ` +
            "emitter's refusal and this gate's clock, and the notes were an investigation log. Delete the block.",
        });
      }
    }
  }
  return [blocks, faults];
}

const blockId = (b) => `${b.file} · ${b.marker}${b.key ? ` ${b.key}` : ""}${b.index ? ` #${b.index + 1}` : ""}`;

/* ------------------------------------------------ the speed table (§3.3) */

const cellsOf = (line) => line.split("|").slice(1, -1).map((c) => c.trim());

/** {header, cols, rows: Map(label -> line)} for a table span, or a fault string. */
export function parseTable(span) {
  const lines = span.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (lines.length < 2) return "the speed table has no rows";
  const header = cellsOf(lines[0]);
  const cols = { label: 0, hardware: 1 };
  for (const [model, name] of Object.entries(MODEL_NAME)) {
    cols[`${model}:fps`] = header.indexOf(`${name} fps`);
    cols[`${model}:x`] = header.indexOf(`${name} × real time`);
    if (cols[`${model}:fps`] < 0 || cols[`${model}:x`] < 0) {
      return `the speed table's header has no "${name} fps" / "${name} × real time" columns: | ${header.join(" | ")} |`;
    }
  }
  const rows = new Map();
  for (const l of lines.slice(1)) {
    if (/^\|[\s:|-]+\|$/.test(l)) continue;
    rows.set(cellsOf(l)[0], l);
  }
  return { header: lines[0], cols, rows };
}

/** The play rate per model, from the JSON (fallback: the contract pair). */
const rateOf = (json, model) => Number(json?.models?.[model]?.fps ?? { "essence-2": 25, "expression-2": 20 }[model]);

/** One decimal, TRUNCATED (REDESIGN §3.3: a 0.98 must never read 1.0). Integer
 *  arithmetic, so 357/20 is 17.8 and not a float's 17.85 → 17.9. */
export function truncTenths(fps, rate) {
  const t = Math.floor((Math.round(fps * 1000) * 10) / Math.round(rate * 1000));
  return (t / 10).toFixed(1);
}

/** What the page's two cells for one model must say, given the JSON cell. The
 *  badge is decided on the UNROUNDED ratio. */
export function expectedCells(cell, rate) {
  if (!cell || cell.fps === null || cell.fps === undefined) return ["—", "—"];
  const x = truncTenths(cell.fps, rate);
  return [String(cell.fps), cell.fps / rate >= 1 ? `**${x}×** real time` : `${x}× below real time`];
}

/** Page table <-> performance.json. Findings; empty means they agree cell for cell. */
export function gradeTableAgainstJson(page, json, where) {
  const out = [];
  const [blocks] = findBlocks(page);
  const tb = blocks.find((b) => b.marker === "TABLE" && b.key === PAGE_TABLE_KEY);
  if (!tb) return [{ rule: "J0", where, why: `no <!-- FLOORS:TABLE ${PAGE_TABLE_KEY} --> block` }];
  const t = parseTable(tb.body);
  if (typeof t === "string") return [{ rule: "J0", where, why: t }];
  // ★A HELD-SESSION ROW (`sustained: true`) IS PUBLISHED IN ITS OWN BLOCK, FLOORS:SUSTAINED,
  //  under the speed table, and never as a speed-table row (product rule: the rate a
  //  phone holds for ten minutes goes on this page, off the headline).
  const rows = (json.rows ?? []).filter((r) => r.published !== false && !r.sustained);
  const want = rows.map((r) => r.label);
  const have = [...t.rows.keys()];
  for (const r of rows) {
    const line = t.rows.get(r.label);
    if (line === undefined) {
      out.push({ rule: "J1", where, why: `performance.json publishes the "${r.label}" row and the speed table does not carry it` });
      continue;
    }
    const c = cellsOf(line);
    if (c[t.cols.hardware] !== r.hardware) {
      out.push({ rule: "J2", where, why: `${r.label}: the hardware reads "${c[t.cols.hardware]}" and performance.json says "${r.hardware}"` });
    }
    for (const model of Object.keys(MODEL_NAME)) {
      const [wf, wx] = expectedCells(r.cells?.[model], rateOf(json, model));
      const gf = c[t.cols[`${model}:fps`]];
      const gx = c[t.cols[`${model}:x`]];
      if (gf !== wf) {
        out.push({ rule: "J3", where, why: `${r.label} / ${MODEL_NAME[model]}: the page says ${JSON.stringify(gf)} fps and performance.json says ${JSON.stringify(wf)}` });
      }
      if (gx !== wx) {
        out.push({ rule: "J4", where, why: `${r.label} / ${MODEL_NAME[model]}: the page says ${JSON.stringify(gx)} and ${wf} fps at the play rate is ${JSON.stringify(wx)}` });
      }
    }
  }
  for (const label of have) {
    if (!want.includes(label)) out.push({ rule: "J5", where, why: `the speed table carries a "${label}" row that performance.json does not publish:\n    ${t.rows.get(label)}` });
  }
  if (!out.length && want.join("\n") !== have.join("\n")) {
    out.push({ rule: "J6", where, why: `the rows are in a different order from performance.json:\n    page: ${have.join(" / ")}\n    json: ${want.join(" / ")}` });
  }
  return out;
}

/** The per-platform snippets (`<!-- FLOORS:TABLE cli -->` …) carry rows of the
 *  same table; every row they print must be a published JSON row, cell for cell. */
export function gradeKeyedTables(corpus, json) {
  const out = [];
  const byLabel = new Map((json.rows ?? []).filter((r) => r.published !== false && !r.sustained).map((r) => [r.label, r]));
  for (const rel of Object.keys(corpus).sort()) {
    for (const b of findBlocks(corpus[rel])[0]) {
      if (b.marker !== "TABLE" || b.key === PAGE_TABLE_KEY) continue;
      const where = `${rel} · TABLE ${b.key}`;
      const t = parseTable(b.body);
      if (typeof t === "string") {
        out.push({ rule: "K0", where, why: t });
        continue;
      }
      if (!t.rows.size) out.push({ rule: "K0", where, why: "the snippet has no rows" });
      for (const [label, line] of t.rows) {
        const r = byLabel.get(label);
        if (!r) {
          out.push({ rule: "K1", where, why: `the snippet carries a "${label}" row that performance.json does not publish` });
          continue;
        }
        const c = cellsOf(line);
        for (const model of Object.keys(MODEL_NAME)) {
          const [wf, wx] = expectedCells(r.cells?.[model], rateOf(json, model));
          if (c[t.cols[`${model}:fps`]] !== wf || c[t.cols[`${model}:x`]] !== wx) {
            out.push({ rule: "K2", where, why: `${label} / ${MODEL_NAME[model]}: the snippet says ${JSON.stringify([c[t.cols[`${model}:fps`]], c[t.cols[`${model}:x`]]])} and performance.json says ${JSON.stringify([wf, wx])}` });
          }
        }
      }
    }
  }
  return out;
}

/** performance.json against itself: each cell's multiple and badge follow from
 *  its fps and the model's play rate. */
export function gradeJsonSelf(json, where = JSON_PATH) {
  const out = [];
  if (!Array.isArray(json?.rows)) return [{ rule: "J7", where, why: "performance.json has no rows array" }];
  for (const m of Object.keys(MODEL_NAME)) {
    if (!(rateOf(json, m) > 0)) out.push({ rule: "J7", where, why: `performance.json states no play rate for ${m}` });
  }
  for (const r of json.rows) {
    for (const [m, c] of Object.entries(r.cells ?? {})) {
      if (!c || c.fps === null || c.fps === undefined) continue;
      const x = c.fps / rateOf(json, m);
      if (typeof c.x_realtime === "number" && Math.abs(c.x_realtime - x) > 0.006) {
        out.push({ rule: "J8", where, why: `${r.id ?? r.label} / ${m}: x_realtime ${c.x_realtime} is not ${c.fps} ÷ ${rateOf(json, m)}` });
      }
      if (typeof c.realtime === "boolean" && c.realtime !== x >= 1) {
        out.push({ rule: "J8", where, why: `${r.id ?? r.label} / ${m}: realtime is ${c.realtime} at ${c.fps} fps against a play rate of ${rateOf(json, m)}` });
      }
    }
  }
  return out;
}

/** The re-measure clock, on every published cell's own day. */
export function gradeClock(json, days, today, where = JSON_PATH) {
  const out = [];
  for (const r of json.rows ?? []) {
    if (r.published === false) continue;
    for (const [m, c] of Object.entries(r.cells ?? {})) {
      if (!c || c.fps === null || c.fps === undefined) continue;
      const age = ageDays(c.measured_on, today);
      if (age === null) out.push({ rule: "A1", where, why: `${r.label} / ${MODEL_NAME[m] ?? m}: no readable measured_on ("${c.measured_on}")` });
      else if (age > days) {
        out.push({ rule: "A2", where, why: `${r.label} / ${MODEL_NAME[m] ?? m} was measured ${c.measured_on}, ${age} days ago — past the ${days}-day re-measure clock. Re-measure it in bithuman-models, then --regen.` });
      }
    }
  }
  return out;
}

/* ------------------------------------------------ blocks <-> pin (rule B*) */

export function gradeBlocks(corpus, jsonText, pin) {
  const [blocks, out] = allBlocks(corpus);
  const pinned = new Map(pin.blocks.map((b) => [blockId(b), b]));
  const found = new Map(blocks.map((b) => [blockId(b), b]));
  for (const [id, p] of pinned) {
    const b = found.get(id);
    if (!b) {
      out.push({ rule: "B2", where: p.file, why: `the generated block ${id} is gone (a rebase that dropped it, or a page that moved without --write)` });
      continue;
    }
    if (sha256(b.body) !== p.sha256) {
      out.push({ rule: "B3", where: p.file, why: `${id} (line ${b.line}) has been edited away from what the emitter wrote.${describeTableChange(p, b, pin)}` });
    }
  }
  for (const [id, b] of found) {
    if (!pinned.has(id)) {
      out.push({ rule: "B4", where: b.file, why: `${id} (line ${b.line}) is a generated block the pin does not hold — run --regen, which emits into it and pins it` });
    }
  }
  if (jsonText === null) out.push({ rule: "B5", where: JSON_PATH, why: `${JSON_PATH} is missing` });
  else if (sha256(jsonText) !== pin.json.sha256) {
    out.push({ rule: "B5", where: JSON_PATH, why: `${JSON_PATH} is not the file the emitter wrote (pinned ${pin.json.sha256.slice(0, 16)}…, now ${sha256(jsonText).slice(0, 16)}…)` });
  }
  return out;
}

/** For the speed table, name the rows that changed, so a reader need not diff
 *  two long strings by eye. */
function describeTableChange(p, b, pin) {
  if (!(p.marker === "TABLE" && p.key === PAGE_TABLE_KEY && pin.table)) return "";
  const t = parseTable(b.body);
  if (typeof t === "string") return `\n    ${t}`;
  const notes = [];
  for (const r of pin.table.rows) {
    const got = t.rows.get(r.label);
    if (got === undefined) notes.push(`row "${r.label}" deleted:\n      pinned: ${r.line}`);
    else if (got !== r.line) notes.push(`row "${r.label}":\n      pinned: ${r.line}\n      page:   ${got}`);
  }
  for (const [label, line] of t.rows) if (!pin.table.rows.some((r) => r.label === label)) notes.push(`row "${label}" added:\n      page:   ${line}`);
  return notes.length ? `\n    ${notes.join("\n    ")}` : "";
}

/** The pin itself: its format, the ref it was taken at, and where the page is. */
export function gradePinMeta(pin, page) {
  const out = [];
  if (pin.format !== 2) out.push({ rule: "B9", where: PIN, why: `the pin is format ${pin.format ?? 1}; this gate reads format 2 — run --regen` });
  if (pin.record_ref !== RECORD_REF) {
    out.push({ rule: "B8", where: PIN, why: `the pin was taken at ${pin.record_ref ?? "no ref"}, not ${RECORD_REF} — a PREVIEW emit. Re-run --regen once that branch has merged.` });
  }
  if (!page.rel) out.push({ rule: "B6", where: "src/content/docs", why: page.why });
  else if (page.rel !== pin.page) out.push({ rule: "B7", where: page.rel, why: `the speed table now lives in ${page.rel}; the pin was taken with it in ${pin.page}. A moved page is re-pinned with --write.` });
  return out;
}

/* --------------------------------------------- json <-> record (rule R*) */

export function gradeJsonAgainstRecord(json, pin, record, recordBytes) {
  const out = [];
  if (recordBytes !== undefined && sha256(recordBytes) !== pin.record_sha256) {
    out.push({
      rule: "R0",
      where: PIN,
      why:
        `the record's bytes have moved since this pin was taken (pinned ${pin.record_sha256.slice(0, 16)}…, record is ${sha256(recordBytes).slice(0, 16)}…). ` +
        "Expected the moment a row is re-measured: run --regen.",
    });
  }
  if (record.stale_after_days !== pin.stale_after_days) {
    out.push({ rule: "R1", where: PIN, why: `the record's re-measure clock is ${record.stale_after_days} days and the pin holds ${pin.stale_after_days}` });
  }
  // A plane may publish under a public id (the record row's docs_public_id), so the
  // record is keyed the way performance.json names it.
  const by = new Map(record.rows.map((r) => [`${r.model}/${r.docs_public_id || r.plane}`, r]));
  const inJson = new Set();
  for (const row of json.rows ?? []) {
    for (const [model, c] of Object.entries(row.cells ?? {})) {
      if (!c || c.fps === null || c.fps === undefined) continue;
      const key = `${model}/${row.id}`;
      inJson.add(key);
      const r = by.get(key);
      if (!r) {
        out.push({ rule: "R2", where: JSON_PATH, why: `performance.json holds ${key} (the "${row.label}" row) and the record has no such row` });
        continue;
      }
      // ★A HELD-SESSION ROW PUBLISHES ITS HELD MEDIAN (record: row.held.display_fps); the ledger's
      //  docs_fps there is the worst window the floor gates on (coordinator, 2026-09-23).
      const want = row.sustained && r.held && r.held.display_fps !== undefined ? r.held.display_fps : r.docs_fps;
      if (`${want}` !== `${c.fps}`) out.push({ rule: "R3", where: JSON_PATH, why: `${key}: the record publishes ${want} fps and performance.json says ${c.fps}` });
      if ((r.docs_measured_on ?? null) !== (c.measured_on ?? null)) {
        out.push({ rule: "R5", where: JSON_PATH, why: `${key}: the record measured on ${r.docs_measured_on ?? "no date"} and performance.json says ${c.measured_on ?? "none"}` });
      }
    }
  }
  for (const [key, r] of by) {
    if (!inJson.has(key) && r.docs_fps !== null && r.docs_fps !== undefined) {
      out.push({ rule: "R6", where: JSON_PATH, why: `the record publishes ${key} at ${r.docs_fps} fps and performance.json has no cell for it` });
    }
  }
  return out;
}

/* ------------------------------------------------------ the served site */

/** The speed table as the site hands it to a browser: label -> cells as text.
 *  `rows.compact` says which layout was served: the six Markdown columns, or the
 *  one-cell-per-model layout src/markdown/rehype-perf-tables.mjs builds (a table
 *  with class "perf-table", each model cell reading "98 fps 3.9×"). */
export function tableFromHtml(html) {
  const rows = new Map();
  rows.compact = false;
  for (const t of html.matchAll(/<table([^>]*)>[\s\S]*?<\/table>/g)) {
    const trs = [...t[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(([, tr]) =>
      [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(([, c]) => htmlText(c)),
    );
    // ★THE SPEED TABLE, NOT EVERY "Runs on" TABLE. The memory table below it opens
    //  with the same column, and reading both merged its rows over the speed rows
    //  (measured on the first build of this page, 2026-09-23). The compact speed
    //  table is marked by its class; the memory table never carries it.
    const compact = /class="[^"]*\bperf-table\b/.test(t[1]);
    if (!trs.length || trs[0][0] !== "Runs on" || !(compact || trs[0].some((h) => / fps$/.test(h)))) continue;
    for (const cells of trs.slice(1)) if (cells[0]) rows.set(cells[0], cells);
    rows.compact = compact;
    break;
  }
  return rows;
}

/** A pinned six-column Markdown row as the compact layout shows it:
 *  [label, hardware, "98 fps 3.9×", "340 fps 17.0×"]. A dash stays a dash. */
export function compactCells(line) {
  const c = cellsOf(line).map(mdText);
  const out = [c[0], c[1]];
  for (let i = 2; i + 1 < c.length; i += 2) {
    if (c[i] === "—") {
      out.push("—");
      continue;
    }
    const m = /^(\d+(?:\.\d+)?)×/.exec(c[i + 1]);
    out.push(m ? `${c[i]} fps ${m[1]}×` : `${c[i]} fps`);
  }
  return out;
}

const htmlText = (c) =>
  c
    // rehype-table-labels puts the column name inside each cell for narrow
    // screens; it is markup, not content.
    .replace(/<span[^>]*class="[^"]*(?:col-label|table-label)[^"]*"[^>]*>[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, " ")
    .trim();

/** A markdown cell as it reads once rendered: emphasis and code marks gone. */
const mdText = (c) => c.replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim();

export function gradeServed(html, jsonText, pin, origin) {
  const where = `${origin}${pin.served_route}`;
  const out = [];
  const found = tableFromHtml(html ?? "");
  if (!found.size) out.push({ rule: "S0", where, why: "no speed table (a table headed \"Runs on\") in the served HTML" });
  else {
    for (const r of pin.table.rows) {
      const got = found.get(r.label);
      const want = found.compact ? compactCells(r.line) : cellsOf(r.line).map(mdText);
      if (got === undefined) out.push({ rule: "S1", where, why: `the served table has no "${r.label}" row` });
      else if (got.join(" | ") !== want.join(" | ")) {
        out.push({ rule: "S2", where, why: `the served "${r.label}" row is not the pinned one:\n      pinned: ${want.join(" | ")}\n      served: ${got.join(" | ")}` });
      }
    }
    for (const label of found.keys()) if (!pin.table.rows.some((r) => r.label === label)) out.push({ rule: "S3", where, why: `the served table carries a "${label}" row the pin does not` });
  }
  if (jsonText === null) out.push({ rule: "S4", where: `${origin}/performance.json`, why: "the site does not serve /performance.json" });
  else if (sha256(jsonText) !== pin.json.sha256) {
    out.push({ rule: "S4", where: `${origin}/performance.json`, why: `the served performance.json is not the pinned one (${sha256(jsonText).slice(0, 16)}… vs ${pin.json.sha256.slice(0, 16)}…)` });
  }
  return out;
}

/* ------------------------------------------------------ building the pin */

/** The pin, from a corpus that the caller has ALREADY verified is the emitter's
 *  own output. Throws rather than pin a page whose table disagrees with its JSON. */
export function buildPin(corpus, jsonText, recordBytes, emitterBytes, today, ref = RECORD_REF) {
  const page = findPage(corpus);
  if (!page.rel) throw new Error(`REFUSING to pin: ${page.why}`);
  const [blocks, faults] = allBlocks(corpus);
  if (faults.length) throw new Error(`REFUSING to pin:\n  ${faults.map((f) => `[${f.rule}] ${f.where}: ${f.why}`).join("\n  ")}`);
  const json = JSON.parse(jsonText);
  const record = JSON.parse(recordBytes);
  const disagree = [...gradeJsonSelf(json), ...gradeTableAgainstJson(page.text, json, page.rel), ...gradeKeyedTables(corpus, json), ...gradeJsonAgainstRecord(json, { record_sha256: sha256(recordBytes), stale_after_days: record.stale_after_days }, record, recordBytes)];
  if (disagree.length) {
    throw new Error(`REFUSING to pin — the page, performance.json and the record disagree:\n  ${disagree.map((f) => `[${f.rule}] ${f.why}`).join("\n  ")}`);
  }
  const t = parseTable(blocks.find((b) => b.file === page.rel && b.marker === "TABLE" && b.key === PAGE_TABLE_KEY).body);
  const byLabel = new Map(json.rows.map((r) => [r.label, r]));
  return {
    $comment:
      "Generated by scripts/check-performance-floors.mjs --write/--regen. Every sha256 below is of text that " +
      "bithuman-models' emitter (origin/main) reproduced byte for byte from the record named here. Do not hand-edit: " +
      "run --regen --models <bithuman-models>.",
    format: 2,
    record: RECORD_PATH,
    emitter: EMITTER_PATH,
    source_repo: "bithuman-product/bithuman-models",
    record_ref: ref,
    record_sha256: sha256(recordBytes),
    emitter_sha256: emitterBytes === null ? null : sha256(emitterBytes),
    verified_on: today,
    stale_after_days: record.stale_after_days,
    page: page.rel,
    served_route: routeOf(page.rel),
    json: { path: JSON_PATH, sha256: sha256(jsonText) },
    blocks: blocks.map((b) => ({ file: b.file, marker: b.marker, key: b.key, index: b.index, sha256: sha256(b.body) })),
    table: {
      key: PAGE_TABLE_KEY,
      header: t.header,
      rows: [...t.rows].map(([label, line]) => ({ label, id: byLabel.get(label)?.id ?? null, line })),
    },
  };
}

/* ------------------------------------------- the record and the emitter */

/** The record and the emitter at origin/main, or why not. Never a working tree. */
export function findSources(opts, env, fs) {
  const tried = [];
  const ref = opts.ref ?? RECORD_REF;
  const doors = [];
  if (opts.models) doors.push([`--models ${opts.models}`, opts.models]);
  if (env.BITHUMAN_MODELS) doors.push(["$BITHUMAN_MODELS", env.BITHUMAN_MODELS]);
  doors.push(["a sibling checkout", join(ROOT, "..", "bithuman-models")]);
  if (opts.record) {
    // a literal blob (a fixture, a CI artifact): no ref, and no emitter
    if (fs.exists(opts.record)) return { record: fs.read(opts.record), emitter: null, dir: null, from: opts.record, ref: null, tried };
    tried.push(`--record ${opts.record}: not present`);
  }
  for (const [why, dir] of doors) {
    const rec = fs.gitShow(dir, ref, RECORD_PATH);
    if (rec.bytes === null) {
      tried.push(`${why}: ${dir} — ${rec.why}`);
      continue;
    }
    const em = fs.gitShow(dir, ref, EMITTER_PATH);
    return { record: rec.bytes, emitter: em.bytes, dir, from: `${dir} at ${ref}`, ref, tried };
  }
  return { record: null, emitter: null, dir: null, from: null, ref: null, tried };
}

const realFs = {
  exists: (p) => existsSync(p),
  read: (p) => readFileSync(p, "utf8"),
  gitShow: (dir, ref, path) => {
    // ★A DIRECTORY WITHOUT A .git IS NOT A CHECKOUT: `git -C` searches upward and
    //  would read another repository's record as this one's.
    if (!existsSync(join(dir, ".git"))) return { bytes: null, why: `no .git in ${dir} — not a bithuman-models checkout` };
    try {
      return {
        bytes: execFileSync("git", ["-C", dir, "show", `${ref}:${path}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }),
        why: null,
      };
    } catch (e) {
      return { bytes: null, why: `git show ${ref}:${path} failed — ${String(e.stderr || e.message).trim().split("\n")[0]}` };
    }
  },
};

/** Run origin/main's emitter over copies of every block-carrying markdown file,
 *  in a scratch tree. Returns {files: {rel: text}, json, log}. The repository is
 *  not touched; the caller decides whether to write or to compare. */
export function emitFresh(corpus, src) {
  const scratch = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "perf-emit-"));
  try {
    const tool = join(scratch, EMITTER_PATH);
    const rec = join(scratch, RECORD_PATH);
    // ★AND proof/evidence (2026-09-23): a held-session row's paced record (row.held) is graded
    //  against the proof record it cites, and without it the emitter refuses the whole page.
    // ★THE WHOLE perf/ TREE, NOT TWO FILES. The emitter grades each memory cell
    //  against its evidence file under perf/evidence/, and with only the record
    //  beside it every memory row is a structural fault (measured 2026-09-23:
    //  14 of them, rc=1). Tool and record come from ONE ref, in one archive.
    const tar = spawnSync("sh", ["-c", `git -C "$0" archive "$1" models/essence-2/perf models/essence-2/tools models/essence-2/proof/evidence | tar -x -C "$2"`, src.dir, src.ref, scratch], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    if (tar.status !== 0 || !existsSync(tool) || !existsSync(rec)) throw new Error(`could not extract ${src.ref}'s emitter and record from ${src.dir}: ${tar.stderr}`);
    if (readFileSync(rec, "utf8") !== src.record) throw new Error(`the archived record is not the one read at ${src.ref} — the checkout moved mid-run; run again`);
    const page = findPage(corpus);
    if (!page.rel) throw new Error(page.why);
    const out = { files: {}, json: null, log: [] };
    for (const rel of Object.keys(corpus).sort()) {
      if (!/\.mdx?$/.test(rel)) {
        if (findBlocks(corpus[rel])[0].length) throw new Error(`${rel} carries FLOORS markers, and the emitter writes markdown only — move the block into a partial and import it`);
        continue;
      }
      const copy = join(scratch, "site", rel);
      mkdirSync(dirname(copy), { recursive: true });
      writeFileSync(copy, corpus[rel]);
      const args = [tool, "--floors", rec, "--allow-no-measurement", "--emit-docs", copy];
      const jsonOut = join(scratch, "performance.json");
      if (rel === page.rel) args.push("--emit-json", jsonOut);
      const r = spawnSync("python3", args, { encoding: "utf8", env: { ...process.env, TMPDIR: scratch }, maxBuffer: 64 * 1024 * 1024 });
      // ★rc 5 is the emitter's "UNRUN-ALLOWED": nothing was MEASURED in this run,
      //  which is exactly right for an emit, and the page was written. Anything
      //  else is a refusal (a stale row, a retired marker, a leak) and stops here.
      if (r.status !== 0 && r.status !== 5) {
        throw new Error(`the emitter refused ${rel} (rc=${r.status}):\n${(r.stdout + r.stderr).split("\n").filter((l) => /refus|REFUS|error|Error|fault|RED/.test(l)).slice(-15).join("\n")}`);
      }
      out.files[rel] = readFileSync(copy, "utf8");
      out.log.push(`${rel}: ${(r.stdout.match(/^(rewrote|wrote) .*$/gm) ?? ["(no block written)"]).join("; ")}`);
      if (rel === page.rel) out.json = existsSync(jsonOut) ? readFileSync(jsonOut, "utf8") : null;
    }
    if (out.json === null) throw new Error("the emitter wrote no performance.json (does origin/main's emitter support --emit-json?)");
    return out;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/* ---------------------------------------------------------------- verdict */

export function verdict(drift, couldNotLook) {
  if (drift.length) return 1;
  return couldNotLook ? 2 : 0;
}

function parseArgs(argv) {
  const opts = { today: isoToday() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--selftest" || a === "--self-test") opts.selftest = true;
    else if (a === "--write") opts.write = true;
    else if (a === "--regen") opts.regen = true;
    else if (a === "--models") opts.models = argv[++i];
    else if (a === "--record") opts.record = argv[++i];
    // ★FOR A PREVIEW ONLY: emit from another ref of bithuman-models (a PR branch
    //  before it merges). The pin records the ref it was taken at; a pin whose
    //  record_ref is not origin/main is not the published state.
    else if (a === "--ref") opts.ref = argv[++i];
    else if (a === "--served") opts.served = (argv[++i] || "https://docs.bithuman.ai").replace(/\/$/, "");
    else if (a === "--today") opts.today = argv[++i];
    else if (a === "--help" || a === "-h") opts.help = true;
    else {
      console.error(`unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return opts;
}

const HELP = `usage:
  check-performance-floors.mjs [--served <origin>] [--models <dir> | --record <file>] [--today <ISO>]
  check-performance-floors.mjs --regen --models <dir>     emit from origin/main, then pin
  check-performance-floors.mjs --write --models <dir>     pin, only if a fresh emit reproduces the files
  check-performance-floors.mjs --selftest

exit 0 MATCHED · 1 DRIFTED · 2 COULD NOT LOOK (never a pass)`;

function report(title, findings) {
  if (!findings.length) return;
  console.error(`\n${title}`);
  findings.forEach((f, i) => {
    console.error(`  ${i + 1}. [${f.rule}] ${f.where}`);
    console.error(`     ${f.why}`);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return void console.log(HELP);
  if (opts.selftest) return void (await selftest());

  const corpus = loadCorpus();
  const jsonPath = join(ROOT, JSON_PATH);
  const pinPath = join(ROOT, PIN);
  const src = findSources(opts, process.env, realFs);

  if (opts.regen || opts.write) {
    if (src.ref && src.ref !== RECORD_REF) console.error(`★PREVIEW: emitting from ${src.ref}, not ${RECORD_REF}. Do not land a pin taken this way.`);
    if (!src.record || !src.emitter || !src.dir) {
      console.error("REFUSING: --regen and --write need bithuman-models' record AND emitter at origin/main. Doors tried:");
      for (const t of src.tried) console.error(`  ${t}`);
      process.exit(2);
    }
    let fresh;
    try {
      fresh = emitFresh(corpus, src);
    } catch (e) {
      console.error(`REFUSING: ${e.message}`);
      process.exit(1);
    }
    const onDisk = existsSync(jsonPath) ? readFileSync(jsonPath, "utf8") : null;
    if (opts.regen) {
      for (const [rel, text] of Object.entries(fresh.files)) if (text !== corpus[rel]) writeFileSync(join(ROOT, rel), text);
      writeFileSync(jsonPath, fresh.json);
      fresh.log.forEach((l) => console.log(`  emitted ${l}`));
      console.log(`  wrote ${JSON_PATH}`);
    } else {
      const differ = Object.entries(fresh.files).filter(([rel, text]) => text !== corpus[rel]).map(([rel]) => rel);
      if (fresh.json !== onDisk) differ.push(JSON_PATH);
      if (differ.length) {
        console.error("REFUSING to pin: a fresh emit from ${src.ref} does not reproduce these files byte for byte —");
        differ.forEach((d) => console.error(`  ${d}`));
        console.error("That is what a hand edit (or an emit from another ref) looks like. Run --regen instead.");
        process.exit(1);
      }
    }
    const now = loadCorpus();
    const pin = buildPin(now, readFileSync(jsonPath, "utf8"), src.record, src.emitter, opts.today, src.ref);
    writeFileSync(pinPath, `${JSON.stringify(pin, null, 2)}\n`);
    console.log(`wrote ${PIN}: ${pin.blocks.length} generated blocks, ${pin.table.rows.length} table rows, record ${pin.record_sha256.slice(0, 16)}… from ${src.from}`);
    return;
  }

  if (!existsSync(pinPath)) {
    console.error(`CANNOT LOOK: ${PIN} is not present — run --regen against a bithuman-models checkout`);
    process.exit(2);
  }
  const pin = JSON.parse(readFileSync(pinPath, "utf8"));
  const jsonText = existsSync(jsonPath) ? readFileSync(jsonPath, "utf8") : null;
  const page = findPage(corpus);
  const drift = [];
  drift.push(...gradePinMeta(pin, page));
  drift.push(...gradeBlocks(corpus, jsonText, pin));
  let json = null;
  if (jsonText !== null) {
    try {
      json = JSON.parse(jsonText);
    } catch (e) {
      drift.push({ rule: "J7", where: JSON_PATH, why: `not JSON: ${e.message}` });
    }
  }
  if (json) {
    drift.push(...gradeJsonSelf(json));
    if (page.rel) drift.push(...gradeTableAgainstJson(page.text, json, page.rel));
    drift.push(...gradeKeyedTables(corpus, json));
    drift.push(...gradeClock(json, pin.stale_after_days, opts.today));
  }

  let recordLine;
  if (src.record && json) {
    const f = gradeJsonAgainstRecord(json, pin, JSON.parse(src.record), src.record);
    if (src.emitter && pin.emitter_sha256 && sha256(src.emitter) !== pin.emitter_sha256) {
      f.push({ rule: "R7", where: PIN, why: `origin/main's emitter has changed since this pin was taken — its output may have too. Run --regen.` });
    }
    drift.push(...f);
    recordLine = f.length ? `DRIFTED — ${f.length} finding(s) against ${src.from}` : `MATCHED — performance.json against ${src.from}`;
  } else recordLine = "COULD NOT LOOK — the record was not reachable from this run";

  let servedLine = "not asked (pass --served <origin>)";
  let servedCouldNotLook = false;
  if (opts.served) {
    const get = async (path) => {
      try {
        const r = await fetch(`${opts.served}${path}`, { redirect: "follow", headers: { "cache-control": "no-cache" } });
        return r.status === 200 ? { text: await r.text() } : { why: `${opts.served}${path} answered ${r.status}` };
      } catch (e) {
        return { why: `${opts.served}${path}: ${e.message}` };
      }
    };
    const html = await get(pin.served_route);
    const sj = await get("/performance.json");
    if (html.text === undefined && sj.text === undefined) {
      servedCouldNotLook = true;
      servedLine = `COULD NOT LOOK — ${html.why}; ${sj.why}`;
    } else {
      const f = gradeServed(html.text ?? null, sj.text ?? null, pin, opts.served);
      drift.push(...f);
      servedLine = f.length ? `DRIFTED — ${f.length} finding(s)` : `MATCHED — ${pin.table.rows.length} rows and performance.json as served by ${opts.served}`;
    }
  }

  const count = (p) => drift.filter((f) => p.test(f.rule)).length;
  console.log(`check-performance-floors — ${pin.page} + ${JSON_PATH} against ${PIN} (today ${opts.today})`);
  console.log(`  blocks <-> pin     ${count(/^B/) ? `DRIFTED — ${count(/^B/)} finding(s)` : `MATCHED — ${pin.blocks.length} generated blocks and performance.json`}`);
  console.log(`  table  <-> json    ${count(/^[JK]/) ? `DRIFTED — ${count(/^[JK]/)} finding(s)` : `MATCHED — ${pin.table.rows.length} rows, and every per-platform snippet`}`);
  console.log(`  json   <-> clock   ${count(/^A/) ? `DRIFTED — ${count(/^A/)} cell(s) past the ${pin.stale_after_days}-day clock` : `MATCHED — every published cell within ${pin.stale_after_days} days`}`);
  console.log(`  json   <-> record  ${recordLine}`);
  console.log(`  served <-> pin     ${servedLine}`);
  if (!src.record) {
    console.log("  doors tried for the record:");
    for (const t of src.tried) console.log(`    ${t}`);
    console.log("  ★COULD NOT LOOK is not a pass: a number re-measured in bithuman-models since the pin");
    console.log("   was taken would not be visible here.");
  }
  report("DRIFTED — what is published is not what the emitter wrote from the record:", drift);
  if (drift.length) {
    console.error("\n  how to fix: regenerate FROM the record, never the other way round —");
    console.error("    node scripts/check-performance-floors.mjs --regen --models <bithuman-models>");
    console.error("  ★Do not edit a generated block or performance.json by hand, and do not edit FLOORS.json to agree with a page.");
  }
  const rc = verdict(drift, !src.record || servedCouldNotLook);
  console.log(`\nVERDICT: ${["MATCHED", "DRIFTED", "COULD NOT LOOK"][rc]} (rc=${rc})`);
  process.exit(rc);
}

/* ---------------------------------------------------------------- selftest */

// ★A GATE WHOSE CONTROLS DO NOT FIRE HAS VERIFIED NOTHING. The arms run on a
// FIXTURE site (so they hold whatever the real page says) and then on the real
// corpus as controls. Every defect arm is an edit someone could make; every good
// arm is a change that must stay silent, because a gate that fires on correct
// work gets turned off.

const FIX_TODAY = "2026-09-23";
const FIX_JSON = {
  schema: 1,
  generated: FIX_TODAY,
  models: { "essence-2": { fps: 25, width: 1920, height: 1080 }, "expression-2": { fps: 20, width: 416, height: 720 } },
  rows: [
    { id: "cloud-gpu", label: "Cloud API · GPU", hardware: "NVIDIA RTX 4090", published: true, cells: {
      "essence-2": { fps: 103, x_realtime: 4.12, realtime: true, measured_on: "2026-09-22" },
      "expression-2": { fps: 357, x_realtime: 17.85, realtime: true, measured_on: "2026-09-23" } } },
    { id: "cloud-cpu", label: "Cloud API · CPU", hardware: "x86 server CPU, 8 vCPU", published: true, cells: {
      "essence-2": { fps: 22, x_realtime: 0.88, realtime: false, measured_on: "2026-09-23" },
      "expression-2": { fps: 27, x_realtime: 1.35, realtime: true, measured_on: "2026-09-23" } } },
    // ★THE HALF-MEASURED ROW: one model published, the other not yet. It must pin
    //  and grade like any other, with its empty cells as "—".
    { id: "web", label: "Web browser (WebGPU)", hardware: "Chrome on Apple M4", published: true, cells: {
      "essence-2": { fps: 29, x_realtime: 1.16, realtime: true, measured_on: "2026-09-22" },
      "expression-2": null } },
    // a live-session measurement that is recorded but not a table row
    { id: "apple-serve-launch", label: "Cloud live session · Apple silicon", hardware: "Apple M4 Max", published: false, cells: {
      "essence-2": { fps: 136, x_realtime: 5.44, realtime: true, measured_on: "2026-09-23" } } },
  ],
};
const FIX_TABLE =
  "| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |\n" +
  "|---|---|---|---|---|---|\n" +
  "| Cloud API · GPU | NVIDIA RTX 4090 | 103 | **4.1×** real time | 357 | **17.8×** real time |\n" +
  "| Cloud API · CPU | x86 server CPU, 8 vCPU | 22 | 0.8× below real time | 27 | **1.3×** real time |\n" +
  "| Web browser (WebGPU) | Chrome on Apple M4 | 29 | **1.1×** real time | — | — |\n";
const FIX_PAGE =
  "---\ntitle: Performance\n---\n\nLede.\n\n## Frame rate\n\n<!-- FLOORS:TABLE all -->\n" + FIX_TABLE + "<!-- /FLOORS:TABLE -->\n\n" +
  "<!-- FLOORS:RELEASES -->\nMeasured on current releases: CLI 2.7 · cloud API (September 2026).\n<!-- /FLOORS:RELEASES -->\n\n" +
  "## Memory\n\n<!-- FLOORS:MEMORY -->\n| Runs on | Hardware | Essence 2 peak RAM | Expression 2 peak RAM |\n|---|---|---|---|\n| macOS · CLI | Apple M4 | 1.6 GB | 0.9 GB |\n<!-- /FLOORS:MEMORY -->\n\n" +
  "## How we measure\n\n<!-- FLOORS:METHOD -->\n**How we measure.** One paragraph.\n<!-- /FLOORS:METHOD -->\n";
const FIX_PARTIAL = "<!-- FLOORS:HEADLINE -->\n| | Cloud API |\n|---|---|\n| **Essence 2** | **103 fps** · 4.1× |\n<!-- /FLOORS:HEADLINE -->\n";
const FIX_RECORD = {
  stale_after_days: 30,
  rows: [
    { model: "essence-2", plane: "cloud-gpu", docs_fps: 103, docs_measured_on: "2026-09-22" },
    { model: "expression-2", plane: "cloud-gpu", docs_fps: 357, docs_measured_on: "2026-09-23" },
    { model: "essence-2", plane: "cpu-internal", docs_public_id: "cloud-cpu", docs_fps: 22, docs_measured_on: "2026-09-23" },
    { model: "expression-2", plane: "cpu-internal", docs_public_id: "cloud-cpu", docs_fps: 27, docs_measured_on: "2026-09-23" },
    { model: "essence-2", plane: "web", docs_fps: 29, docs_measured_on: "2026-09-22" },
    { model: "expression-2", plane: "web", docs_fps: null, docs_measured_on: null },
    { model: "essence-2", plane: "apple-serve-launch", docs_fps: 136, docs_measured_on: "2026-09-23" },
  ],
};

async function selftest() {
  let bad = 0;
  const arm = (name, ok) => {
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name}`);
  };
  const P = "src/content/docs/sdk/performance.md";
  const H = "src/partials/performance-headline.md";
  const jsonText = `${JSON.stringify(FIX_JSON, null, 1)}\n`;
  const recText = JSON.stringify(FIX_RECORD);
  const W = "src/content/docs/sdk/web.md";
  const FIX_SNIPPET =
    "## Performance\n\n<!-- FLOORS:TABLE web -->\n" + FIX_TABLE.split("\n").filter((l, i) => i < 2 || l.startsWith("| Web browser")).join("\n") + "\n<!-- /FLOORS:TABLE -->\n";
  const corpus = { [P]: FIX_PAGE, [H]: FIX_PARTIAL, [W]: FIX_SNIPPET };
  const pin = buildPin(corpus, jsonText, recText, "emitter-bytes", FIX_TODAY);
  /** every always-on rule, as the default run grades them */
  const grade = (c = corpus, j = jsonText, today = FIX_TODAY) => {
    const page = findPage(c);
    const json = JSON.parse(j);
    return [
      ...gradePinMeta(pin, page),
      ...gradeBlocks(c, j, pin),
      ...gradeJsonSelf(json),
      ...(page.rel ? gradeTableAgainstJson(page.text, json, page.rel) : []),
      ...gradeKeyedTables(c, json),
      ...gradeClock(json, pin.stale_after_days, today),
    ];
  };
  const edit = (from, to, file = P) => ({ ...corpus, [file]: corpus[file].replace(from, to) });
  const has = (f, rule, re = /./) => f.some((x) => x.rule === rule && re.test(x.why));

  console.log("DEFECT ARMS — each must FIRE");
  {
    const f = grade(edit("| 103 | **4.1×** real time |", "| 999 | **4.1×** real time |"));
    arm("mutation: Cloud API · GPU / Essence 2 retyped 103 -> 999 reddens (block and JSON both)", has(f, "B3") && has(f, "J3", /999/));
    arm("mutation: the finding names the row and shows pinned vs page", has(f, "B3", /Cloud API · GPU[\s\S]*pinned:[\s\S]*page:/));
  }
  arm("a multiple of real time retyped reddens", has(grade(edit("**17.8×** real time", "**17.9×** real time")), "J4"));
  arm("a below-real-time cell relabelled as real time reddens", has(grade(edit("0.8× below real time", "**0.8×** real time")), "J4"));
  arm("a half-measured row's empty cell given a number reddens", has(grade(edit("| 29 | **1.1×** real time | — | — |", "| 29 | **1.1×** real time | 31 | **1.5×** real time |")), "J3"));
  arm("a whole row deleted reddens", has(grade(edit("| Cloud API · CPU | x86 server CPU, 8 vCPU | 22 | 0.8× below real time | 27 | **1.3×** real time |\n", "")), "J1"));
  arm("a row the JSON does not publish reddens", has(grade(edit("| Web browser", "| Toaster | A toaster | 9 | **0.3×** real time | 9 | **0.4×** real time |\n| Web browser")), "J5"));
  arm("a hardware string retyped reddens", has(grade(edit("| NVIDIA RTX 4090 |", "| NVIDIA RTX 5090 |")), "J2"));
  arm("performance.json hand-edited reddens", has(grade(corpus, jsonText.replace('"fps": 103', '"fps": 104')), "B5"));
  arm("page AND performance.json edited to agree still reddens (the pin holds both)",
    (() => {
      const c = edit("| 103 | **4.1×** real time |", "| 104 | **4.1×** real time |");
      return has(grade(c, jsonText.replace('"fps": 103', '"fps": 104')), "B3") && has(grade(c, jsonText.replace('"fps": 103', '"fps": 104')), "B5");
    })());
  arm("a headline partial edited by hand reddens", has(grade(edit("**103 fps**", "**110 fps**", H)), "B3", /HEADLINE/));
  arm("a generated block dropped by a rebase reddens", has(grade(edit(/<!-- FLOORS:METHOD -->[\s\S]*<!-- \/FLOORS:METHOD -->\n/, "")), "B2"));
  arm("a generated block nobody pinned reddens", has(grade({ ...corpus, "src/content/docs/sdk/cli.md": `x\n${FIX_PARTIAL}` }), "B4"));
  arm("a per-platform snippet's cell retyped reddens (block and JSON both)", (() => {
    const f = grade(edit("| 29 | **1.1×** real time |", "| 39 | **1.5×** real time |", W));
    return has(f, "B3", /TABLE web/) && has(f, "K2", /Web browser/);
  })());
  arm("a per-platform snippet carrying a row the JSON does not publish reddens",
    has(grade(edit("<!-- /FLOORS:TABLE -->", "| Toaster | A toaster | 9 | **0.3×** real time | — | — |\n<!-- /FLOORS:TABLE -->", W)), "K1"));
  arm("PERF-CURRENCY coming back reddens", has(grade(edit("## Memory", "<!-- PERF-CURRENCY -->\n| Row | Measured |\n<!-- /PERF-CURRENCY -->\n\n## Memory")), "B1", /PERF-CURRENCY/));
  arm("FLOORS:NOTES coming back reddens", has(grade(edit("## Memory", "<!-- FLOORS:NOTES -->\nlog\n<!-- /FLOORS:NOTES -->\n\n## Memory")), "B1", /FLOORS:NOTES/));
  arm("a pin taken at a PREVIEW ref (a branch, not origin/main) reddens", has(gradePinMeta({ ...pin, record_ref: "origin/lane/x" }, findPage(corpus)), "B8"));
  arm("a page that moved without a re-pin reddens", has(grade({ [P.replace("sdk/", "")]: FIX_PAGE, [H]: FIX_PARTIAL, [W]: FIX_SNIPPET }), "B7"));
  arm("an unclosed marker reddens", has(grade(edit("<!-- /FLOORS:RELEASES -->", "")), "B0"));
  arm("the speed table on two pages reddens", has(grade({ ...corpus, "src/content/docs/performance.md": FIX_PAGE }), "B6"));
  arm("the speed table gone reddens", has(grade(edit("<!-- FLOORS:TABLE all -->", "<!-- FLOORS:TABLE cli -->")), "B6"));
  arm("JSON whose realtime flag contradicts its fps reddens", has(grade(corpus, jsonText.replace('"realtime": false', '"realtime": true')), "J8"));
  {
    // THE CLOCK ARM. Nothing changes but the calendar.
    const f = grade(corpus, jsonText, "2026-10-23");
    arm("a cell past the 30-day clock reddens on 2026-10-23 with every file untouched", has(f, "A2", /Cloud API · GPU \/ Essence 2/) && !has(f, "A2", /Expression 2 was measured 2026-09-23/));
  }
  {
    const r = (patch) => ({ ...FIX_RECORD, rows: FIX_RECORD.rows.map((x) => (x.plane === "cloud-gpu" && x.model === "essence-2" ? { ...x, ...patch } : x)) });
    arm("the record moving a number away from the JSON reddens", has(gradeJsonAgainstRecord(FIX_JSON, pin, r({ docs_fps: 110 })), "R3"));
    arm("the record moving a date away from the JSON reddens", has(gradeJsonAgainstRecord(FIX_JSON, pin, r({ docs_measured_on: "2026-09-30" })), "R5"));
    arm("a JSON cell the record does not hold reddens", has(gradeJsonAgainstRecord(FIX_JSON, pin, { ...FIX_RECORD, rows: FIX_RECORD.rows.slice(1) }), "R2"));
    arm("a published record cell with no JSON cell reddens", has(gradeJsonAgainstRecord(FIX_JSON, pin, { ...FIX_RECORD, rows: [...FIX_RECORD.rows, { model: "essence-2", plane: "forgotten", docs_fps: 11 }] }), "R6"));
    arm("the record's bytes moving since the pin reddens", has(gradeJsonAgainstRecord(FIX_JSON, pin, FIX_RECORD, `${recText} `), "R0"));
    arm("the record changing its clock reddens", has(gradeJsonAgainstRecord(FIX_JSON, pin, { ...FIX_RECORD, stale_after_days: 7 }), "R1"));
  }
  {
    // THE SERVED ARMS. The site can serve an older build than the repository holds.
    const html = (rows) =>
      `<table><thead><tr>${cellsOf(FIX_TABLE.split("\n")[0]).map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
      rows.map((l) => `<tr>${cellsOf(l).map((c) => `<td><span class="col-label">x</span>${c.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</td>`).join("")}</tr>`).join("") +
      "</tbody></table>";
    const MEM = '<table><tr><th>Runs on</th><th>Hardware</th><th>Essence 2 peak RAM</th><th>Expression 2 peak RAM</th></tr><tr><td>Cloud API · GPU</td><td>x</td><td>1.6 GB</td><td>0.9 GB</td></tr></table>';
    const good = html(pin.table.rows.map((r) => r.line)) + MEM;
    const stale = html(pin.table.rows.map((r, i) => (i ? r.line : r.line.replace("| 103 |", "| 99 |")))) + MEM;
    arm("a served table one build behind reddens", has(gradeServed(stale, jsonText, pin, "https://x"), "S2"));
    arm("a served page with no speed table reddens", has(gradeServed("<p>nothing</p>", jsonText, pin, "https://x"), "S0"));
    arm("a served performance.json one build behind reddens", has(gradeServed(good, jsonText.replace("103", "99"), pin, "https://x"), "S4"));
    arm("the served arm is not vacuous — the matching fixture (with the memory table after it) is silent", gradeServed(good, jsonText, pin, "https://x").length === 0);
    // THE COMPACT LAYOUT (rehype-perf-tables.mjs): one cell per model, "98 fps" then a "3.9×" chip.
    const chtml = (rows) =>
      `<table class="perf-table"><thead><tr><th>Runs on</th><th>Hardware</th><th class="perf-model">Essence 2</th><th class="perf-model">Expression 2</th></tr></thead><tbody>` +
      rows.map((l) => `<tr>${compactCells(l).map((c, i) => {
        const m = i > 1 && /^(\S+) fps (\S+)$/.exec(c);
        return `<td data-label="x"><span class="td-v">${m ? `<span class="perf-fps">${m[1]} fps</span> <span class="perf-x is-rt">${m[2]}</span>` : c}</span></td>`;
      }).join("")}</tr>`).join("") + "</tbody></table>";
    const cgood = MEM + chtml(pin.table.rows.map((r) => r.line));
    arm("the compact layout as built is read and matches the pin (memory table before it ignored)", gradeServed(cgood, jsonText, pin, "https://x").length === 0);
    arm("a compact cell one build behind reddens", has(gradeServed(chtml(pin.table.rows.map((r, i) => (i ? r.line : r.line.replace("| 103 |", "| 99 |")))), jsonText, pin, "https://x"), "S2"));
    arm("a compact chip whose multiple changed reddens", has(gradeServed(chtml(pin.table.rows.map((r) => r.line)).replace(">4.1×<", ">4.2×<"), jsonText, pin, "https://x"), "S2"));
  }
  {
    let refused = false;
    try {
      buildPin(edit("| 103 |", "| 999 |"), jsonText, recText, null, FIX_TODAY);
    } catch (e) {
      refused = /REFUSING to pin/.test(e.message);
    }
    arm("the pin builder refuses a page that disagrees with its JSON", refused);
    let refused2 = false;
    try {
      buildPin(corpus, jsonText.replace('"fps": 103', '"fps": 104'), recText, null, FIX_TODAY);
    } catch (e) {
      refused2 = /REFUSING to pin/.test(e.message) && /R3/.test(e.message);
    }
    arm("the pin builder refuses a JSON that disagrees with the record", refused2);
  }
  {
    const blind = { exists: () => false, read: () => "", gitShow: () => ({ bytes: null, why: "no such repository" }) };
    const s = findSources({ models: "/nowhere" }, {}, blind);
    arm("no record reachable is COULD NOT LOOK, not MATCHED", s.record === null && verdict([], true) === 2);
    arm("COULD NOT LOOK names every door it tried", s.tried.length >= 2 && s.tried.every((t) => /no such repository/.test(t)));
    arm("COULD NOT LOOK is distinct from DRIFTED", verdict([{ rule: "B3" }], true) === 1 && verdict([], false) === 0);
    const dirty = { exists: () => true, read: () => "THE WORKING TREE", gitShow: () => ({ bytes: null, why: "git show origin/main:… failed — fatal: invalid object name" }) };
    const r = findSources({ models: "/a/dirty/checkout" }, {}, dirty);
    arm("a checkout whose origin/main cannot be read is refused, not read from its working tree", r.record === null && r.tried.some((t) => /invalid object name/.test(t)));
    const good = { exists: () => true, read: () => "", gitShow: (_d, _r, p) => ({ bytes: p === RECORD_PATH ? '{"rows":[]}' : "emitter", why: null }) };
    const o = findSources({ models: "/a/good/checkout" }, {}, good);
    arm("a record that was read names its ref, and comes with origin/main's emitter", o.ref === "origin/main" && /origin\/main/.test(o.from) && o.emitter === "emitter");
  }

  console.log("\nGOOD ARMS — each must stay SILENT");
  arm("the fixture site as pinned", grade().length === 0);
  arm("prose edited outside the markers", grade(edit("Lede.", "A new lede about setup, 25 fps and 20 fps.")).length === 0);
  arm("a six-column table elsewhere on the page is prose", grade(edit("## Memory", `${FIX_TABLE.replace("| 103 |", "| 1 |")}\n## Memory`)).length === 0);
  arm("the half-measured row pins and grades like any other", pin.table.rows.some((r) => r.label === "Web browser (WebGPU)") && grade().length === 0);
  {
    const withHeld = { ...FIX_JSON, rows: [...FIX_JSON.rows, { id: "android-s25plus-sustained", label: "Android · held 10 min", hardware: "Samsung Galaxy S25+", published: true, sustained: true, cells: {
      "essence-2": { fps: 24, x_realtime: 0.96, realtime: false, measured_on: "2026-09-23" }, "expression-2": null } }] };
    arm("a sustained JSON row is not demanded in the speed table (it has its own block)", gradeTableAgainstJson(FIX_PAGE, withHeld, "fixture").length === 0);
    arm("...and the same row NOT marked sustained is demanded there (the control)",
      has(gradeTableAgainstJson(FIX_PAGE, { ...withHeld, rows: withHeld.rows.map((r) => ({ ...r, sustained: undefined })) }, "fixture"), "J1"));
  }
  arm("a published:false JSON row is not demanded on the page", !pin.table.rows.some((r) => r.label.startsWith("Cloud live session")) && grade().length === 0);
  arm("the JSON against a record that agrees with it", gradeJsonAgainstRecord(FIX_JSON, pin, FIX_RECORD, recText).length === 0);
  arm("a cell measured exactly 30 days ago is still within the clock", grade(corpus, jsonText, "2026-10-22").length === 0);
  arm("truncation, not rounding: 357/20 is 17.8 and 22/25 is 0.8", truncTenths(357, 20) === "17.8" && truncTenths(22, 25) === "0.8" && truncTenths(24.99, 25) === "0.9");
  arm("the route follows the page when it moves", routeOf(P) === "/sdk/performance" && routeOf("src/content/docs/performance.md") === "/performance");

  console.log("\nCORPUS CONTROLS — the real site");
  {
    const real = loadCorpus();
    const page = findPage(real);
    const realPin = existsSync(join(ROOT, PIN)) ? JSON.parse(readFileSync(join(ROOT, PIN), "utf8")) : null;
    const realJson = existsSync(join(ROOT, JSON_PATH)) ? readFileSync(join(ROOT, JSON_PATH), "utf8") : null;
    arm("the real site carries exactly one speed table", Boolean(page.rel));
    arm("the real pin is format 2 and names that page", realPin?.format === 2 && realPin.page === page.rel);
    arm("the real performance.json exists and its table agrees with it",
      realJson !== null && page.rel !== null && gradeTableAgainstJson(page.text, JSON.parse(realJson), page.rel).length === 0);
    arm("the real site carries no retired marker", allBlocks(real)[1].filter((f) => f.rule === "B1").length === 0);
    arm("every published real cell has a date the clock can read",
      realJson !== null && gradeClock(JSON.parse(realJson), 100000, isoToday()).length === 0);
  }

  console.log(bad ? `\nFAILED — ${bad} arm(s)` : "\nPASSED — every defect arm fired and every good arm stayed silent");
  process.exit(bad ? 1 : 0);
}

main();
