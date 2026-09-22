#!/usr/bin/env node
// THE PERFORMANCE TABLE IS A MEASUREMENT, AND THIS REPOSITORY IS WHERE IT CAN
// BE EDITED BY HAND.
//
// WHY THIS EXISTS
// ---------------
// /sdk/performance is GENERATED. Its table lives between
// `<!-- FLOORS:TABLE all -->` markers and is written by the one tool that owns
// the numbers:
//
//     python3 models/essence-2/tools/check_perf_floors.py \
//       --emit-docs <public-docs>/src/content/docs/sdk/performance.md
//
// That tool lives in `bithuman-product/bithuman-models` beside
// `models/essence-2/perf/FLOORS.json`, the record it emits from, and its own
// workflow re-reads the LIVE page on a daily schedule and reddens when the two
// disagree. So the page is guarded — from the other repository, after it has
// merged.
//
// ★THE HOLE THAT LEAVES, AND THE ONLY THING THIS FILE IS FOR. The page is in
// THIS repository. A pull request here can retype a cell, delete a row, or
// merge a rebase that drops the regenerated table, and nothing in this
// repository looks: there is no gate here that has ever read the performance
// table. The other repository's schedule finds it the next morning, on a branch
// that cannot fix it, and in the meantime docs.bithuman.ai serves a number
// nobody measured. Every gate in `scripts/` exists because a claim went stale
// with nothing watching; this is the same failure with the measurement that is
// hardest to re-derive by eye.
//
// ★AND THIS IS NOT A SECOND EMITTER. It generates no cell, computes no fps and
// holds no opinion about what a plane should measure. It grades the page
// against `scripts/performance-floors.json` — a PIN of the exact rows the
// emitter produced, the fields they came from, and the sha256 of the record
// bytes they were verified against. `--write` refreshes that pin, and REFUSES
// to do it from the page alone: a pin taken from a hand-edited page would
// launder the edit into a record, which is the one way to make this file lie.
//
// WHY THE RECORD IS PINNED RATHER THAN FETCHED
// --------------------------------------------
// `bithuman-models` is PRIVATE (measured 2026-09-21: api.github.com and
// raw.githubusercontent both answer 404 anonymously) and this repository holds
// no secret — `grep -rn 'secrets\.' .github/workflows/` returns nothing. A gate
// whose only source is unreachable would print CANNOT LOOK on every run and be
// disabled inside a week: "a permanently inert check that reads as configured",
// which check-served-is-current.mjs already names as the trap it was designed
// around. So the two questions are separated, and each gets its own answer:
//
//   page  <-> pin      always runnable, no network, no credential. This is the
//                      hand-edit question, and it is the one this repository
//                      can actually answer and actually fix.
//   pin   <-> record   needs the record. Runnable on a devbox with a
//                      `bithuman-models` checkout, and in CI only if a token is
//                      ever configured. When it cannot run, it says COULD NOT
//                      LOOK — never "matched", and never silently nothing.
//
// THE CURRENCY BLOCK
// ------------------
// Each cell already names the day its own series ran. What it did not say is
// whether that day is still recent. The record keeps a re-measure clock
// (`stale_after_days`, 30) and nothing published it, so a cell measured in
// July looked exactly like one measured this morning — the same defect the
// record's own `docs_measured_on` key was added to fix, one layer out.
//
// So the page carries a per-row currency table between
// `<!-- PERF-CURRENCY -->` markers, and this gate regenerates and grades it.
// ★IT STATES A VERDICT, NOT AN AGE. "9 days old" would be wrong tomorrow and
// would redden this gate every single night for a page nobody touched. "within
// the 30-day clock: yes" changes once, on the day a row crosses — which is
// exactly the morning someone should be told. The scheduled run is what makes
// that a live fact rather than a sentence from the day it was typed.
//
// WHAT IT DELIBERATELY DOES NOT GRADE
//   * whether a number is GOOD. Floors, targets and the no-regression ratchet
//     are the record's subject and are enforced where the measuring happens.
//   * the emitted note paragraphs below the table. `--docs-check` grades those
//     against the record; restating them here would be the second
//     implementation this file exists to avoid.
//
// EXIT 0 MATCHED · 1 DRIFTED · 2 COULD NOT LOOK (a failure you can see, never
// a pass).
//
// USAGE
//   node scripts/check-performance-floors.mjs
//   node scripts/check-performance-floors.mjs --served https://docs.bithuman.ai
//   node scripts/check-performance-floors.mjs --models ../bithuman-models
//   node scripts/check-performance-floors.mjs --write --models ../bithuman-models
//   node scripts/check-performance-floors.mjs --selftest

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PAGE = "src/content/docs/sdk/performance.md";
const PIN = "scripts/performance-floors.json";
const RECORD_PATH = "models/essence-2/perf/FLOORS.json";
const SERVED_ROUTE = "/sdk/performance";

// ★THE RECORD IS READ FROM `origin/main`, NOT FROM A WORKING TREE.
// Measured 2026-09-21 on this box: the sibling `bithuman-models` checkout sat
// on a feature branch with `models/essence-2/perf/FLOORS.json` MODIFIED, and a
// working-tree read graded this page against 52 findings that were pure
// checkout state — cells the record moved past days ago, `apple-serve` and
// `modal-cpu` rows that did not exist on that branch at all. Every one of them
// was noise, and a gate that cries wolf 52 times is a gate somebody adds
// `|| true` to. What the page publishes is what `main` holds, so `main` is
// what it is graded against, and the run SAYS which ref it read.
const RECORD_REF = "origin/main";

// The page keys its generated table; the record's emitter accepts `all` (every
// platform row with the Python rows marked) or the split `platform` + `python`
// pair. This repository publishes the merged shape.
const TABLE_OPEN = /<!--\s*FLOORS:TABLE\s+([A-Za-z0-9_-]+)\s*-->/g;
const TABLE_CLOSE = /<!--\s*\/FLOORS:TABLE\s*-->/g;
const CURRENCY_OPEN = "<!-- PERF-CURRENCY -->";
const CURRENCY_CLOSE = "<!-- /PERF-CURRENCY -->";

// ★THE CONTRACT RATE IS A PRODUCT CONSTANT, NOT A MEASUREMENT, and it is stated
// here only so a pinned cell can be REFUSED when it carries neither. It is the
// same pair the record's own tool holds in `MODEL_REALTIME_FPS` and the same
// pair STYLE.md calls a product constant: Expression 2 plays at 20 fps,
// Essence 2 at 25. Nothing here derives an fps from it.
const CONTRACT_FPS = { "expression-2": 20, "essence-2": 25 };
const MODEL_COLUMN = { "expression-2": 2, "essence-2": 3 };
const MODEL_NAME = { "expression-2": "Expression 2", "essence-2": "Essence 2" };

/** The published figure opens its cell: the emitter writes the number first,
 *  then the frame, the multiple and the subject. Anchoring there is not a
 *  nicety — measured 2026-09-21, a loose match read the `v18` in
 *  "essence-2-cpu-worker v18" and the `6` inside "a1b6f7fa8" as published
 *  figures, and two rows resolved to two planes each. A number that can be
 *  found anywhere in a cell is not a number, it is a substring. */
export const opensWith = (text, fps) => new RegExp(`^${String(fps).replace(".", "\\.")}(\\s|$)`).test(String(text).trim());

/* ------------------------------------------------------------------ dates */

/** Whole days between two ISO dates, or null when either is unreadable. */
export function ageDays(measured, today) {
  const a = Date.parse(`${measured}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / 86400000);
}

const isoToday = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------- reading the page */

/** (slots, faults) — the span BETWEEN each keyed table's markers.
 *
 *  ★A MALFORMED MARKER IS A FAULT, NEVER A GUESS. The record's emitter makes
 *  the same refusal for the same reason: a page whose markers no longer pair up
 *  is a page the emitter will not write into, so grading it against the pin
 *  would grade text the emitter has stopped maintaining. */
export function tableSlots(page) {
  const opens = [...page.matchAll(TABLE_OPEN)];
  const closes = [...page.matchAll(TABLE_CLOSE)];
  if (!opens.length && !closes.length) {
    return [{}, ["the page carries no <!-- FLOORS:TABLE k --> marker: the generated table is gone"]];
  }
  const faults = [];
  const slots = {};
  if (opens.length !== closes.length) {
    faults.push(
      `the page carries ${opens.length} table marker(s) and ${closes.length} closing marker(s): ` +
        "every <!-- FLOORS:TABLE k --> must be paired with <!-- /FLOORS:TABLE -->",
    );
  }
  for (let i = 0; i < opens.length; i++) {
    const k = opens[i][1];
    const nextOpen = i + 1 < opens.length ? opens[i + 1].index : page.length;
    const close = closes.find((c) => c.index >= opens[i].index + opens[i][0].length && c.index < nextOpen);
    if (!close) {
      faults.push(`the page's <!-- FLOORS:TABLE ${k} --> marker is not closed before the next one`);
      continue;
    }
    if (k in slots) {
      faults.push(`the page carries more than one <!-- FLOORS:TABLE ${k} --> marker; each table is keyed once`);
      continue;
    }
    slots[k] = page.slice(opens[i].index + opens[i][0].length, close.index);
  }
  return [faults.length ? {} : slots, faults];
}

/** Every generated row in a table span, keyed by its first column.
 *  The header and the alignment rule are skipped; everything else is a row. */
export function tableRows(span) {
  const out = new Map();
  for (const raw of span.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|") || line.includes("---") || /^\|\s*Platform\s*\|/.test(line)) continue;
    out.set(line.split("|")[1].trim(), line);
  }
  return out;
}

/** The cells of a generated row, by column index. */
const cellsOf = (line) => line.split("|").slice(1, -1).map((c) => c.trim());

/* ------------------------------------------------- page <-> pin (rule P*) */

/** What CHANGED between two versions of one row, in words a fixer can act on.
 *  A whole-line diff names the row; this names the cell and the field, because
 *  "this row is different" sends a reader to compare two long strings by eye. */
export function describeRowChange(pinned, found) {
  const a = cellsOf(pinned.line);
  const b = cellsOf(found);
  const notes = [];
  for (const [model, col] of Object.entries(MODEL_COLUMN)) {
    if (a[col] === b[col]) continue;
    const cell = pinned.cells[model];
    const was = [];
    if (cell && cell.docs_fps !== null && !opensWith(b[col] ?? "", cell.docs_fps)) {
      was.push(`the ${MODEL_NAME[model]} number is no longer ${cell.docs_fps}`);
    }
    if (cell && cell.frame && !(b[col] ?? "").includes(cell.frame)) {
      was.push(`the frame is no longer ${cell.frame}`);
    }
    if (cell && cell.contract_fps && !(b[col] ?? "").includes(`at ${cell.contract_fps} fps`)) {
      was.push(`the contract rate is no longer "at ${cell.contract_fps} fps"`);
    }
    if (cell && cell.docs_measured_on && !(b[col] ?? "").includes(`(${cell.docs_measured_on})`)) {
      was.push(`the measurement date is no longer ${cell.docs_measured_on}`);
    }
    notes.push(
      `${MODEL_NAME[model]}: ${was.length ? was.join("; ") : "the cell text changed"}\n` +
        `      pinned: ${a[col]}\n      page:   ${b[col]}`,
    );
  }
  return notes.length ? notes.join("\n    ") : `the row changed outside both model cells\n      pinned: ${pinned.line}\n      page:   ${found}`;
}

/** Findings for the generated table. Empty means the page is the emitter's
 *  output, cell for cell. */
export function gradePage(page, pin, where = PAGE) {
  const [slots, faults] = tableSlots(page);
  const out = faults.map((why) => ({ rule: "P0", where, why }));
  if (faults.length) return out;
  const span = slots[pin.table_key];
  if (span === undefined) {
    out.push({
      rule: "P0",
      where,
      why:
        `the page carries no table keyed ${JSON.stringify(pin.table_key)} (it has: ` +
        `${Object.keys(slots).map((k) => JSON.stringify(k)).join(", ") || "none"}). ` +
        "The pin records the shape the record's emitter was asked for; a page in another shape " +
        "is not the one that was verified.",
    });
    return out;
  }
  const found = tableRows(span);
  for (const row of pin.rows) {
    const got = found.get(row.label);
    if (got === undefined) {
      out.push({
        rule: "P1",
        where,
        why: `the generated table no longer carries the ${row.label} row:\n    ${row.line}`,
      });
      continue;
    }
    if (got !== row.line) {
      out.push({ rule: "P2", where, why: `the ${row.label} row has been edited away from the record.\n    ${describeRowChange(row, got)}` });
    }
  }
  const pinned = new Set(pin.rows.map((r) => r.label));
  for (const [label, line] of found) {
    if (!pinned.has(label)) {
      out.push({
        rule: "P3",
        where,
        why: `the generated table carries a row the record does not generate:\n    ${line}`,
      });
    }
  }
  return out;
}

/* ------------------------------------------------ the currency block (C*) */

/** The row's measured dates, collapsed when both cells agree. */
function measuredShown(row) {
  const dated = Object.entries(MODEL_COLUMN)
    .map(([model]) => [model, row.cells[model]?.docs_measured_on ?? null])
    .filter(([, d]) => d !== null);
  if (!dated.length) return "not published";
  const unique = [...new Set(dated.map(([, d]) => d))];
  if (unique.length === 1 && dated.length === Object.keys(MODEL_COLUMN).length) return unique[0];
  return dated.map(([model, d]) => `${MODEL_NAME[model]} ${d}`).join(" · ");
}

/** "yes", or the named cells that are past the clock.
 *
 *  ★NO DAY COUNT. See the header: an age in the page is wrong the next morning
 *  and would redden the nightly run forever. This verdict moves once, on the
 *  day a row crosses, which is the day it is worth saying. */
function currencyShown(row, clock, today) {
  const past = [];
  let dated = 0;
  for (const model of Object.keys(MODEL_COLUMN)) {
    const on = row.cells[model]?.docs_measured_on;
    if (!on) continue;
    dated++;
    const age = ageDays(on, today);
    if (age === null || age > clock) past.push(MODEL_NAME[model]);
  }
  if (!dated) return "no current source — the cell says so";
  if (!past.length) return "yes";
  if (past.length === dated) return `**no** — past the clock, due a re-measure`;
  return `**no** for ${past.join(" and ")} — past the clock, due a re-measure`;
}

/** The whole currency table, between (not including) its markers. */
export function currencyBlock(pin, today) {
  const clock = pin.stale_after_days;
  const lines = [`| Row | Measured | Within the ${clock}-day clock |`, "|---|---|---|"];
  for (const row of pin.rows) {
    lines.push(`| ${row.label} | ${measuredShown(row)} | ${currencyShown(row, clock, today)} |`);
  }
  return lines.join("\n");
}

export function gradeCurrency(page, pin, today, where = PAGE) {
  const a = page.indexOf(CURRENCY_OPEN);
  const b = page.indexOf(CURRENCY_CLOSE);
  if (a === -1 || b === -1 || b < a) {
    return [{
      rule: "C0",
      where,
      why:
        `the page carries no paired ${CURRENCY_OPEN} … ${CURRENCY_CLOSE} block. ` +
        "Without it a reader cannot tell a cell measured this morning from one measured in July, " +
        "which is the whole reason the record keeps a re-measure clock.",
    }];
  }
  const have = page.slice(a + CURRENCY_OPEN.length, b).trim();
  const want = currencyBlock(pin, today);
  if (have === want) return [];
  const haveRows = tableRows(have);
  const wantRows = tableRows(want);
  const out = [];
  for (const [label, line] of wantRows) {
    const got = haveRows.get(label);
    if (got === undefined) out.push({ rule: "C1", where, why: `the currency table is missing the ${label} row:\n    ${line}` });
    else if (got !== line) {
      out.push({
        rule: "C2",
        where,
        why: `the ${label} row's currency is out of date as of ${today}:\n    says: ${got}\n    is:   ${line}`,
      });
    }
  }
  for (const [label, line] of haveRows) {
    if (!wantRows.has(label)) out.push({ rule: "C3", where, why: `the currency table carries a row the table does not:\n    ${line}` });
  }
  if (!out.length) {
    out.push({ rule: "C4", where, why: `the currency block differs from the generated one outside its rows:\n--- page\n${have}\n--- generated\n${want}` });
  }
  return out;
}

/* --------------------------------------------- pin <-> record (rule R*) */

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** Index a FLOORS record by `<model>/<plane>`. */
const recordRows = (record) => new Map(record.rows.map((r) => [`${r.model}/${r.plane}`, r]));

/** Findings for the pin itself: is it still what the record says?
 *
 *  This is the half that needs the private record. It is never inferred and
 *  never skipped quietly — the caller reports COULD NOT LOOK when it has no
 *  record to hand this. */
export function gradePinAgainstRecord(pin, record, recordBytes) {
  const out = [];
  if (recordBytes !== undefined && sha256(recordBytes) !== pin.record_sha256) {
    out.push({
      rule: "R0",
      where: PIN,
      why:
        `the record's bytes have moved since this pin was taken (pinned ${pin.record_sha256.slice(0, 16)}…, ` +
        `record is ${sha256(recordBytes).slice(0, 16)}…). That is expected the moment a plane is re-measured; ` +
        "it means the page and this pin both have to be regenerated, in that order.",
    });
  }
  if (record.stale_after_days !== pin.stale_after_days) {
    out.push({
      rule: "R1",
      where: PIN,
      why: `the record's re-measure clock is ${record.stale_after_days} days and the pin publishes ${pin.stale_after_days}`,
    });
  }
  const by = recordRows(record);
  for (const row of pin.rows) {
    for (const [model, cell] of Object.entries(row.cells)) {
      const key = `${model}/${row.plane}`;
      const r = by.get(key);
      if (!r) {
        out.push({ rule: "R2", where: PIN, why: `the pin holds ${key} (the ${row.label} row) and the record has no such row` });
        continue;
      }
      if (`${r.docs_fps}` !== `${cell.docs_fps}`) {
        out.push({ rule: "R3", where: PIN, why: `${key}: the record publishes ${r.docs_fps} fps and the page states ${cell.docs_fps}` });
      }
      const frame = r.frame ? `${r.frame.width}x${r.frame.height}` : null;
      if (frame !== cell.frame) {
        out.push({ rule: "R4", where: PIN, why: `${key}: the record's frame is ${frame ?? "unstated"} and the page states ${cell.frame ?? "none"}` });
      }
      if ((r.docs_measured_on ?? null) !== cell.docs_measured_on) {
        out.push({
          rule: "R5",
          where: PIN,
          why: `${key}: the record measured on ${r.docs_measured_on ?? "no date"} and the page states ${cell.docs_measured_on ?? "none"}`,
        });
      }
    }
  }
  // A plane the record publishes and the page does not carry at all. The page's
  // shape is the docs owner's call, so this is reported once, by plane, rather
  // than demanding a row: a reader who cannot see a hosted rung cannot know it
  // served their render.
  const onPage = new Set(pin.rows.flatMap((r) => Object.keys(r.cells).map((m) => `${m}/${r.plane}`)));
  for (const [key, r] of by) {
    if (!onPage.has(key) && r.docs_fps !== null && r.docs_fps !== undefined) {
      out.push({ rule: "R6", where: PAGE, why: `the record publishes ${key} at ${r.docs_fps} fps and the page has no cell for it` });
    }
  }
  return out;
}

/* ------------------------------------------------------ building the pin */

/** Resolve each page row to the record plane its two cells actually came from.
 *
 *  ★DERIVED, NOT COPIED. The emitter's plane order and row labels live in
 *  `check_perf_floors.py`; restating them here would be a second list to keep
 *  up to date, and the day the two disagreed this gate would grade the wrong
 *  plane's numbers against the right plane's row — silently, because both lists
 *  would look fine on their own. So a row is matched by EVIDENCE: the plane
 *  whose published fps, frame and date all appear in the cell. Both columns
 *  must resolve to the same plane, and an ambiguous row is REFUSED, never
 *  guessed.
 *
 *  ★AND THE ARTIFACT IS THE FOURTH PIECE OF EVIDENCE, because fps+frame+date is
 *  NOT a key. Measured 2026-09-22: expression-2 published 43 fps on a 416x720
 *  frame measured 2026-09-22 on BOTH linux-cpu (cli-v2.6.26) and android-s25plus
 *  (expression2-android 0.4.8). Two planes, one number, one day — and the pin
 *  builder refused the whole page, so the trunk could not be re-pinned at all.
 *  The cell already NAMES the artifact it was measured on, and that is exactly
 *  what tells the two apart, so it is used to narrow a tie.
 *
 *  ★IT NARROWS, IT NEVER WIDENS. The version is only consulted when the first
 *  three leave more than one candidate, so no row that resolves today changes
 *  its answer; and if the artifact does not separate them either, the row is
 *  still REFUSED. Guessing between two planes is the failure this whole function
 *  exists to prevent. The version is read from the cell's TRAILING artifact
 *  segment — the "<artifact> (<date>)" the emitter always writes last — so a
 *  digit sequence occurring earlier in the cell (a frame, a rate, a multiple of
 *  real time) can never be mistaken for a version. */
export function resolvePlanes(rows, record) {
  const out = [];
  const errs = [];
  for (const [label, line] of rows) {
    const cells = cellsOf(line);
    const per = {};
    for (const [model, col] of Object.entries(MODEL_COLUMN)) {
      const text = cells[col] ?? "";
      const hits = record.rows.filter((r) => {
        if (r.model !== model || r.docs_fps === null || r.docs_fps === undefined) return false;
        const num = opensWith(text, r.docs_fps);
        const frame = r.frame ? text.includes(`${r.frame.width}x${r.frame.height}`) : true;
        const when = r.docs_measured_on ? text.includes(`(${r.docs_measured_on})`) : true;
        return num && frame && when;
      });
      // ★The tie-break, and only ever a tie-break. `tail` is the cell's last
      // " · " segment, which the emitter writes as "<artifact shown> (<date>)".
      const sep = text.lastIndexOf(" \u00b7 ");
      const tail = sep === -1 ? text : text.slice(sep + 3);
      const narrowed =
        hits.length > 1
          ? hits.filter((r) => {
              const v = r.measured_artifact?.version;
              return v ? tail.includes(v) : false;
            })
          : hits;
      const found = narrowed.length === 1 ? narrowed : hits;
      if (found.length !== 1) {
        errs.push(`${label} / ${MODEL_NAME[model]}: ${found.length === 0 ? "no record row" : `${found.length} record rows`} match this cell — ${JSON.stringify(text)}`);
        continue;
      }
      per[model] = found[0];
    }
    const planes = [...new Set(Object.values(per).map((r) => r.plane))];
    if (planes.length !== 1) {
      if (Object.keys(per).length === Object.keys(MODEL_COLUMN).length) {
        errs.push(`${label}: the two cells resolve to different planes (${planes.join(", ")})`);
      }
      continue;
    }
    out.push({
      label,
      plane: planes[0],
      line,
      cells: Object.fromEntries(
        Object.entries(per).map(([model, r]) => [
          model,
          {
            docs_fps: r.docs_fps,
            frame: r.frame ? `${r.frame.width}x${r.frame.height}` : null,
            contract_fps: CONTRACT_FPS[model],
            docs_measured_on: r.docs_measured_on ?? null,
          },
        ]),
      ),
    });
  }
  return [out, errs];
}

/** The pin, rebuilt from a page that the record VERIFIES. Throws rather than
 *  writing a pin it could not stand behind. */
export function buildPin(page, record, recordBytes, today, previous, ref = RECORD_REF) {
  const [slots, faults] = tableSlots(page);
  if (faults.length) throw new Error(`REFUSING to pin a page with malformed table markers:\n  ${faults.join("\n  ")}`);
  const keys = Object.keys(slots);
  const key = previous && keys.includes(previous.table_key) ? previous.table_key : keys[0];
  if (!key) throw new Error("REFUSING to pin: the page carries no generated table");
  const [rows, errs] = resolvePlanes(tableRows(slots[key]), record);
  if (errs.length) {
    throw new Error(
      "REFUSING to pin a cell the record does not hold — this is what a hand-edited number looks like:\n  " +
        errs.join("\n  ") +
        "\n  Regenerate the page from the record first:\n" +
        "    python3 models/essence-2/tools/check_perf_floors.py --emit-docs " +
        PAGE,
    );
  }
  for (const row of rows) {
    for (const [model, cell] of Object.entries(row.cells)) {
      const col = cellsOf(row.line)[MODEL_COLUMN[model]] ?? "";
      if (cell.frame && !col.includes(`at ${cell.contract_fps} fps`)) {
        throw new Error(
          `REFUSING to pin ${row.label} / ${MODEL_NAME[model]}: the cell states a frame but not the contract rate ` +
            `"at ${cell.contract_fps} fps". A rate beside a frame is what stops the two models' numbers being read against each other.`,
        );
      }
    }
  }
  return {
    $comment:
      "Generated by scripts/check-performance-floors.mjs --write. The rows are the exact lines " +
      "models/essence-2/tools/check_perf_floors.py --emit-docs wrote into " + PAGE + ", and the fields " +
      "beside each one are what they were verified against in that run's FLOORS.json. Do not hand-edit: " +
      "regenerate the page from the record, then re-run --write against the same record.",
    record: RECORD_PATH,
    source_repo: "bithuman-product/bithuman-models",
    record_ref: ref,
    record_sha256: sha256(recordBytes),
    verified_on: today,
    stale_after_days: record.stale_after_days,
    page: PAGE,
    table_key: key,
    rows,
  };
}

/* -------------------------------------------------------- finding the record */

/** Every door this gate knows, tried in order, with what it found at each.
 *  ★The REASONS are returned even on success, because "I could not look" has to
 *  name the door it could not open — a bare CANNOT LOOK is the same silence the
 *  verdict exists to break. */
export function findRecord(opts, env, fs) {
  const tried = [];
  const doors = [];
  if (opts.models) doors.push([`--models ${opts.models}`, opts.models, true]);
  if (env.BITHUMAN_MODELS) doors.push(["$BITHUMAN_MODELS", env.BITHUMAN_MODELS, true]);
  doors.push(["a sibling checkout", join(ROOT, "..", "bithuman-models"), true]);
  // ★A LITERAL FILE IS NEVER SECOND-GUESSED. `--record` is how a fixture, a
  //  downloaded blob or a CI artifact is handed in; there is no ref to resolve.
  if (opts.record) doors.unshift([`--record ${opts.record}`, opts.record, false]);
  for (const [why, where, isRepo] of doors) {
    if (isRepo) {
      const git = fs.gitShow(where, RECORD_REF, RECORD_PATH);
      if (git.bytes !== null) return { bytes: git.bytes, from: `${where} at ${RECORD_REF}`, ref: RECORD_REF, tried };
      tried.push(`${why}: ${where} — ${git.why}`);
      // ★NO SILENT FALLBACK TO THE WORKING TREE. A checkout whose `origin/main`
      //  cannot be read is a checkout this gate cannot trust, and reading the
      //  branch someone happens to be on instead is how the 52-finding run
      //  happened. Fetch the repository, or hand the blob in with --record.
      continue;
    }
    if (!fs.exists(where)) {
      tried.push(`${why}: ${where} — not present`);
      continue;
    }
    try {
      return { bytes: fs.read(where), from: where, ref: null, tried };
    } catch (e) {
      tried.push(`${why}: ${where} — ${e.message}`);
    }
  }
  return { bytes: null, from: null, ref: null, tried };
}

/* ---------------------------------------------------------------- verdict */

export function verdict(drift, couldNotLook) {
  if (drift.length) return 1;
  return couldNotLook ? 2 : 0;
}

/* ------------------------------------------------------------- the served page */

/** The generated table as the SITE hands it to a browser.
 *
 *  ★A SOURCE FILE IS NOT A PUBLISHED CLAIM. `check-served-vocabulary.mjs` and
 *  `check-served-comments.mjs` already grade the bytes docs.bithuman.ai serves
 *  for the same reason: between a merged page and a deployed one there is a
 *  window, and the number a customer reads during it is the old one. */
export function tableFromHtml(html) {
  const rows = new Map();
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(([, c]) =>
      c
        // the site's rehype-table-labels plugin puts the column name inside each
        // cell for narrow screens; it is markup, not content.
        .replace(/<span[^>]*class="[^"]*(?:col-label|table-label)[^"]*"[^>]*>[\s\S]*?<\/span>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    if (cells.length !== 4 || !cells[0] || /^platform$/i.test(cells[0])) continue;
    rows.set(cells[0], `| ${cells.join(" | ")} |`);
  }
  return rows;
}

/** Findings for the served table. Markdown emphasis in a cell would survive as
 *  markup, so this compares the four cells rather than the raw line. */
export function gradeServed(html, pin, origin) {
  const where = `${origin}${SERVED_ROUTE}`;
  const found = tableFromHtml(html);
  if (!found.size) return [{ rule: "S0", where, why: "no performance table in the served HTML — the page did not render, or its shape changed" }];
  const out = [];
  for (const row of pin.rows) {
    const got = found.get(row.label);
    if (got === undefined) out.push({ rule: "S1", where, why: `the served table has no ${row.label} row` });
    else if (got !== row.line) {
      out.push({ rule: "S2", where, why: `the served ${row.label} row is not the pinned one.\n    ${describeRowChange(row, got)}` });
    }
  }
  const pinned = new Set(pin.rows.map((r) => r.label));
  for (const [label, line] of found) {
    if (!pinned.has(label)) out.push({ rule: "S3", where, why: `the served table carries a row the record does not generate:\n    ${line}` });
  }
  return out;
}

/* ------------------------------------------------------------------- main */

const realFs = {
  exists: (p) => existsSync(p),
  read: (p) => readFileSync(p, "utf8"),
  /** The blob at <ref>:<path> in a git working copy, or why not.
   *  Never the working tree — see RECORD_REF. */
  gitShow: (dir, ref, path) => {
    // ★A DIRECTORY WITHOUT A .git IS NOT A CHECKOUT. `git -C` searches UPWARD for
    //  one, so a bare path would silently resolve `origin/main` in whatever
    //  repository happens to be above it — another repository's record, read as
    //  this one's, with a perfectly normal-looking green.
    if (!existsSync(join(dir, ".git"))) return { bytes: null, why: `no .git in ${dir} — not a bithuman-models checkout` };
    try {
      return {
        bytes: execFileSync("git", ["-C", dir, "show", `${ref}:${path}`], {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        }),
        why: null,
      };
    } catch (e) {
      const said = String(e.stderr || e.message).trim().split("\n")[0];
      return { bytes: null, why: `git show ${ref}:${path} failed — ${said}` };
    }
  },
};

function parseArgs(argv) {
  const opts = { today: isoToday() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--selftest" || a === "--self-test") opts.selftest = true;
    else if (a === "--write") opts.write = true;
    else if (a === "--models") opts.models = argv[++i];
    else if (a === "--record") opts.record = argv[++i];
    else if (a === "--served") opts.served = (argv[++i] || "https://docs.bithuman.ai").replace(/\/$/, "");
    else if (a === "--today") opts.today = argv[++i];
    else if (a === "--page") opts.page = argv[++i];
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
  check-performance-floors.mjs --write --models <dir>
  check-performance-floors.mjs --selftest

  page  <-> pin     always graded: has a cell been edited away from the record?
  page  <-> clock   always graded: does the currency block still hold today?
  pin   <-> record  graded only when the record is reachable; COULD NOT LOOK otherwise.
  served<-> pin     graded with --served: what docs.bithuman.ai actually hands a browser.

exit 0 MATCHED · 1 DRIFTED · 2 COULD NOT LOOK (never a pass)`;

function report(title, findings) {
  if (!findings.length) return;
  console.error(`\n${title}`);
  for (const f of findings) {
    console.error(`  [${f.rule}] ${f.where}`);
    console.error(`    ${f.why}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return void console.log(HELP);
  if (opts.selftest) return void (await selftest());

  const pagePath = opts.page ? opts.page : join(ROOT, PAGE);
  const pinPath = join(ROOT, PIN);
  if (!existsSync(pagePath)) {
    console.error(`CANNOT LOOK: ${pagePath} is not present`);
    process.exit(2);
  }
  const page = readFileSync(pagePath, "utf8");

  const rec = findRecord(opts, process.env, realFs);

  if (opts.write) {
    if (!rec.bytes) {
      console.error("REFUSING to --write without the record. A pin taken from the page alone would");
      console.error("launder a hand-edited number into a record of a measurement. Doors tried:");
      for (const t of rec.tried) console.error(`  ${t}`);
      process.exit(2);
    }
    const record = JSON.parse(rec.bytes);
    const previous = existsSync(pinPath) ? JSON.parse(readFileSync(pinPath, "utf8")) : null;
    const pin = buildPin(page, record, rec.bytes, opts.today, previous, rec.ref);
    writeFileSync(pinPath, `${JSON.stringify(pin, null, 2)}\n`);
    const block = currencyBlock(pin, opts.today);
    const a = page.indexOf(CURRENCY_OPEN);
    const b = page.indexOf(CURRENCY_CLOSE);
    if (a === -1 || b === -1 || b < a) {
      console.error(`the page carries no paired ${CURRENCY_OPEN} … ${CURRENCY_CLOSE} block — add it, then re-run --write`);
      process.exit(2);
    }
    writeFileSync(pagePath, `${page.slice(0, a + CURRENCY_OPEN.length)}\n${block}\n${page.slice(b)}`);
    console.log(`wrote ${PIN} (${pin.rows.length} rows, record ${pin.record_sha256.slice(0, 16)}…) from ${rec.from}`);
    console.log(`wrote the currency block into ${PAGE} as of ${opts.today}`);
    return;
  }

  if (!existsSync(pinPath)) {
    console.error(`CANNOT LOOK: ${PIN} is not present — run --write against a bithuman-models checkout`);
    process.exit(2);
  }
  const pin = JSON.parse(readFileSync(pinPath, "utf8"));

  const drift = [...gradePage(page, pin), ...gradeCurrency(page, pin, opts.today)];
  let recordLine;
  if (rec.bytes) {
    const findings = gradePinAgainstRecord(pin, JSON.parse(rec.bytes), rec.bytes);
    drift.push(...findings);
    recordLine = findings.length
      ? `DRIFTED — ${findings.length} finding(s) against ${rec.from}`
      : `MATCHED — ${pin.rows.length} rows against ${rec.from}`;
  } else {
    recordLine = "COULD NOT LOOK — the record was not reachable from this run";
  }

  let servedLine = "not asked (pass --served <origin>)";
  let servedCouldNotLook = false;
  if (opts.served) {
    let html = null;
    try {
      const r = await fetch(`${opts.served}${SERVED_ROUTE}`, { redirect: "follow" });
      if (r.status === 200) html = await r.text();
      else servedLine = `COULD NOT LOOK — ${opts.served}${SERVED_ROUTE} answered ${r.status}`;
    } catch (e) {
      servedLine = `COULD NOT LOOK — ${opts.served}${SERVED_ROUTE}: ${e.message}`;
    }
    if (html === null) servedCouldNotLook = true;
    else {
      const findings = gradeServed(html, pin, opts.served);
      drift.push(...findings);
      servedLine = findings.length ? `DRIFTED — ${findings.length} finding(s)` : `MATCHED — ${pin.rows.length} rows as served by ${opts.served}`;
    }
  }

  const pageFindings = drift.filter((f) => f.rule.startsWith("P"));
  const currencyFindings = drift.filter((f) => f.rule.startsWith("C"));
  console.log(`check-performance-floors — ${PAGE} against ${PIN} (today ${opts.today})`);
  console.log(`  page  <-> pin     ${pageFindings.length ? `DRIFTED — ${pageFindings.length} finding(s)` : `MATCHED — ${pin.rows.length} rows, ${pin.rows.reduce((n, r) => n + Object.keys(r.cells).length, 0)} cells`}`);
  console.log(`  page  <-> clock   ${currencyFindings.length ? `DRIFTED — ${currencyFindings.length} finding(s)` : `MATCHED — ${pin.stale_after_days}-day clock, ${pastClock(pin, opts.today)} row(s) past it`}`);
  console.log(`  pin   <-> record  ${recordLine}`);
  console.log(`  served<-> pin     ${servedLine}`);
  if (!rec.bytes) {
    console.log("  doors tried for the record:");
    for (const t of rec.tried) console.log(`    ${t}`);
    console.log("  ★COULD NOT LOOK is not a pass. It means the pin was not re-read against the");
    console.log("   record on this run: a number changed in bithuman-models since the pin was");
    console.log("   taken would not be visible here.");
  }

  report("DRIFTED — the published table is not what the record measured:", drift);
  if (drift.length) {
    console.error("\n  how to fix: regenerate the page FROM the record, never the other way round —");
    console.error("    python3 models/essence-2/tools/check_perf_floors.py --emit-docs " + PAGE);
    console.error("    node scripts/check-performance-floors.mjs --write --models <bithuman-models>");
    console.error("  ★Do not edit a cell by hand and do not edit FLOORS.json to agree with a page.");
  }
  const rc = verdict(drift, !rec.bytes || servedCouldNotLook);
  console.log(`\nVERDICT: ${["MATCHED", "DRIFTED", "COULD NOT LOOK"][rc]} (rc=${rc})`);
  process.exit(rc);
}

function pastClock(pin, today) {
  let n = 0;
  for (const row of pin.rows) {
    if (currencyShown(row, pin.stale_after_days, today) !== "yes") n++;
  }
  return n;
}

/* ---------------------------------------------------------------- selftest */

// ★A GATE WHOSE CONTROLS DO NOT FIRE HAS VERIFIED NOTHING. Every defect arm
// below is a real edit someone could make to this page — a retyped number, a
// changed date, a dropped row, a rebase that lost the markers — and each one
// must redden. Every good arm is a change that must stay silent, because a gate
// that fires on correct work gets turned off.
async function selftest() {
  const pin = JSON.parse(readFileSync(join(ROOT, PIN), "utf8"));
  const page = readFileSync(join(ROOT, PAGE), "utf8");
  const TODAY = pin.verified_on;
  let bad = 0;
  const arm = (name, ok) => {
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${name}`);
  };

  const grade = (p, today = TODAY) => [...gradePage(p, pin), ...gradeCurrency(p, pin, today)];
  const slowCell = () => pin.rows.find((r) =>
    Object.keys(r.cells).some((m) => cellsOf(r.line)[MODEL_COLUMN[m]].includes("not yet real time")));
  const first = pin.rows[0];
  const swapFps = (p, row, model, to) => {
    const cells = cellsOf(row.line);
    const col = MODEL_COLUMN[model];
    const edited = cells.slice();
    edited[col] = edited[col].replace(String(row.cells[model].docs_fps), String(to));
    return p.replace(row.line, `| ${edited.join(" | ")} |`);
  };

  console.log("DEFECT ARMS — each must FIRE");
  {
    // THE MUTATION ARM the whole file turns on: a known-green page, one cell
    // retyped, nothing else. This is the 2026-09-14 failure in miniature —
    // a page stating a number the record had already moved past.
    const mutated = swapFps(page, first, "essence-2", 999);
    const f = grade(mutated);
    arm(`mutation: ${first.label} / Essence 2 retyped ${first.cells["essence-2"].docs_fps} -> 999 reddens`,
      f.some((x) => x.rule === "P2"));
    arm("mutation: the finding names the cell and the field, not just the row",
      f.some((x) => x.rule === "P2" && x.why.includes("Essence 2") && x.why.includes("number is no longer")));
  }
  arm("a date retyped in a cell reddens", grade(page.replace(`(${first.cells["essence-2"].docs_measured_on})`, "(2026-01-01)")).some((x) => x.rule === "P2"));
  arm("a frame retyped in a cell reddens", grade(page.replace(first.cells["essence-2"].frame, "640x480")).some((x) => x.rule === "P2"));
  arm("the contract rate removed from a cell reddens", grade(page.replace(` at ${first.cells["essence-2"].contract_fps} fps`, "")).some((x) => x.rule === "P2"));
  arm("a whole row deleted reddens", grade(page.replace(`${first.line}\n`, "")).some((x) => x.rule === "P1"));
  arm("a row the record does not generate reddens",
    grade(page.replace(first.line, `${first.line}\n| Toaster | A toaster | 900 | 900 |`)).some((x) => x.rule === "P3"));
  {
    // ★A CELL UNDER ITS MODEL'S PLAY RATE READS "N — not yet real time", and it
    //  is a published measurement like any other. The Cloud CPU and Cloud Apple
    //  silicon rows are made entirely of them and are the rows a reader is most
    //  likely to be surprised by, so a gate that quietly treated them as a
    //  status would be blind exactly where it is most needed.
    const slow = slowCell();
    const model = slow && Object.keys(MODEL_COLUMN).find((m) => cellsOf(slow.line)[MODEL_COLUMN[m]].includes("not yet real time"));
    arm("retyping a 'not yet real time' cell reddens", Boolean(slow) && grade(swapFps(page, slow, model, 4242)).some((x) => x.rule === "P2"));
  }
  arm("the table markers dropped by a rebase reddens", grade(page.replace("<!-- /FLOORS:TABLE -->", "")).some((x) => x.rule === "P0"));
  arm("a table keyed something the pin did not verify reddens",
    grade(page.replace("<!-- FLOORS:TABLE all -->", "<!-- FLOORS:TABLE platform -->")).some((x) => x.rule === "P0"));
  arm("the currency block deleted reddens", grade(page.replace(CURRENCY_OPEN, "")).some((x) => x.rule === "C0"));
  arm("a currency row edited to claim a date the cell does not carry reddens",
    grade(page.replace(`| ${first.label} | ${measuredShown(first)} |`, `| ${first.label} | 2020-01-01 |`)).some((x) => x.rule === "C2"));
  {
    // THE CLOCK ARM. Nothing on the page changes; the calendar does. A page
    // that was correct when it merged says "yes" about a row that has since
    // aged out, and the nightly run is what turns that into a red.
    const late = ageDays(first.cells["essence-2"].docs_measured_on, TODAY);
    const future = new Date(Date.parse(`${TODAY}T00:00:00Z`) + (pin.stale_after_days - late + 1) * 86400000)
      .toISOString()
      .slice(0, 10);
    const f = grade(page, future);
    arm(`a row past the ${pin.stale_after_days}-day clock reddens on ${future} with the page untouched`,
      f.some((x) => x.rule === "C2" && /past the clock/.test(x.why)));
  }
  {
    const f = gradePinAgainstRecord(pin, { stale_after_days: pin.stale_after_days, rows: recordFixture(pin, { fps: 1 }) }, undefined);
    arm("the record moving a number away from the pin reddens", f.some((x) => x.rule === "R3"));
  }
  {
    const f = gradePinAgainstRecord(pin, { stale_after_days: pin.stale_after_days, rows: recordFixture(pin, { date: "2020-02-02" }) }, undefined);
    arm("the record moving a date away from the pin reddens", f.some((x) => x.rule === "R5"));
  }
  {
    const f = gradePinAgainstRecord(pin, { stale_after_days: pin.stale_after_days, rows: recordFixture(pin, { drop: true }) }, undefined);
    arm("a pinned plane the record no longer holds reddens", f.some((x) => x.rule === "R2"));
  }
  {
    const f = gradePinAgainstRecord(pin, { stale_after_days: 7, rows: recordFixture(pin, {}) }, undefined);
    arm("the record changing its re-measure clock reddens", f.some((x) => x.rule === "R1"));
  }
  {
    const rows = recordFixture(pin, {});
    rows.push({ model: "essence-2", plane: "a-plane-the-page-forgot", docs_fps: 11, frame: { width: 1, height: 1 }, docs_measured_on: TODAY });
    const f = gradePinAgainstRecord(pin, { stale_after_days: pin.stale_after_days, rows }, undefined);
    arm("a published plane with no cell on the page reddens", f.some((x) => x.rule === "R6"));
  }
  {
    const bytes = JSON.stringify({ rows: [] });
    const f = gradePinAgainstRecord(pin, { stale_after_days: pin.stale_after_days, rows: recordFixture(pin, {}) }, bytes);
    arm("the record's bytes moving since the pin was taken reddens", f.some((x) => x.rule === "R0"));
  }
  {
    // THE SERVED ARM. The site can serve an older build than the repository
    // holds, and that is the number a customer reads.
    const html = htmlFixture(pin.rows.map((r) => r.line));
    const stale = htmlFixture(pin.rows.map((r, i) => (i ? r.line : swapFps(r.line, r, "essence-2", 7))));
    arm("a served table one build behind reddens", gradeServed(stale, pin, "https://x").some((x) => x.rule === "S2"));
    arm("a served page with no table reddens", gradeServed("<p>nothing</p>", pin, "https://x").some((x) => x.rule === "S0"));
    arm("the served arm is not vacuous — the matching fixture is silent", gradeServed(html, pin, "https://x").length === 0);
  }
  {
    // --write must refuse a page whose cell the record does not hold.
    let refused = false;
    try {
      buildPin(swapFps(page, first, "essence-2", 999), { stale_after_days: pin.stale_after_days, rows: recordFixture(pin, {}) }, "{}", TODAY, pin);
    } catch (e) {
      refused = /REFUSING to pin/.test(e.message);
    }
    arm("--write refuses to pin a hand-edited cell", refused);
  }
  {
    // COULD NOT LOOK is its own outcome, and it is not a pass.
    const blind = { exists: () => false, read: () => "", gitShow: () => ({ bytes: null, why: "no such repository" }) };
    const rec = findRecord({ models: "/nowhere" }, {}, blind);
    arm("no record reachable is COULD NOT LOOK, not MATCHED", rec.bytes === null && verdict([], true) === 2);
    arm("COULD NOT LOOK names every door it tried", rec.tried.length >= 2 && rec.tried.every((t) => /no such repository|not present/.test(t)));
    arm("COULD NOT LOOK is distinct from DRIFTED", verdict([{ rule: "P1" }], true) === 1 && verdict([], false) === 0);

    // ★NO SILENT FALLBACK. A checkout whose origin/main cannot be read must be
    //  refused outright, not read from whatever branch is checked out — that is
    //  the 52-finding run this gate was corrected for on 2026-09-21.
    const dirty = {
      exists: () => true,
      read: () => "THE WORKING TREE, WHICH MUST NEVER BE READ",
      gitShow: () => ({ bytes: null, why: "git show origin/main:… failed — fatal: invalid object name" }),
    };
    const refused = findRecord({ models: "/a/dirty/checkout" }, {}, dirty);
    arm("a checkout whose origin/main cannot be read is refused, not read from its working tree",
      refused.bytes === null && refused.tried.some((t) => /invalid object name/.test(t)));

    // and the door that DOES open names the ref it read, so a green says what
    // it was green against.
    const good = { exists: () => true, read: () => "", gitShow: () => ({ bytes: '{"rows":[]}', why: null }) };
    const open = findRecord({ models: "/a/good/checkout" }, {}, good);
    arm("a record that was read names its ref", open.ref === "origin/main" && /origin\/main/.test(open.from));

    // --record is a literal blob and is never resolved through git.
    const literal = { exists: (p) => p === "/tmp/floors.json", read: () => '{"rows":[]}', gitShow: () => { throw new Error("git must not be consulted for --record"); } };
    const blob = findRecord({ record: "/tmp/floors.json" }, {}, literal);
    arm("--record is read as a literal file, with no ref to resolve", blob.bytes === '{"rows":[]}' && blob.ref === null);
  }

  {
    // ★THE ARTIFACT TIE-BREAK, BOTH DIRECTIONS. Two planes of one model publishing
    //  the same fps on the same frame on the same day is not hypothetical — it is
    //  expression-2 on 2026-09-22 (linux-cpu cli-v2.6.26, android-s25plus
    //  expression2-android 0.4.8), and before this tie-break the pin builder
    //  refused the whole page for it. The arm that matters is the SECOND one: the
    //  tie-break must not become a guess.
    const twin = (v1, v2) => ({
      rows: [
        { model: "expression-2", plane: "linux-cpu", docs_fps: 43, docs_measured_on: "2026-09-22",
          frame: { width: 416, height: 720 }, measured_artifact: { version: v1 } },
        { model: "expression-2", plane: "android-s25plus", docs_fps: 43, docs_measured_on: "2026-09-22",
          frame: { width: 416, height: 720 }, measured_artifact: { version: v2 } },
        { model: "essence-2", plane: "linux-cpu", docs_fps: 36, docs_measured_on: "2026-09-22",
          frame: { width: 1920, height: 1080 }, measured_artifact: { version: "cli-v2.6.26" } },
      ],
    });
    const rowFor = (art) => new Map([["Linux",
      `| Linux | Intel Core i7-13700F | 43 \u00b7 e2e-steady-state \u00b7 416x720 at 20 fps \u00b7 2.15x real time \u00b7 ${art} (2026-09-22) ` +
      `| 36 \u00b7 e2e-steady-state \u00b7 1920x1080 at 25 fps \u00b7 1.44x real time \u00b7 cli-v2.6.26 (2026-09-22) |`]]);

    const [okRows, okErrs] = resolvePlanes(rowFor("cli-v2.6.26"), twin("cli-v2.6.26", "expression2-android 0.4.8"));
    arm("two planes with the same fps, frame and date resolve by the artifact the cell names",
      okErrs.length === 0 && okRows.length === 1 && okRows[0].plane === "linux-cpu");

    const [, ambErrs] = resolvePlanes(rowFor("cli-v2.6.26"), twin("cli-v2.6.26", "cli-v2.6.26"));
    arm("...and when the artifact does NOT separate them either, the row is still REFUSED, never guessed",
      ambErrs.some((e) => e.includes("2 record rows")));
  }

  console.log("\nGOOD ARMS — each must stay SILENT");
  arm("the page as published, against its own pin", grade(page).length === 0);
  arm("prose edited outside the markers", grade(`${page}\n\nA new paragraph about setup.\n`).length === 0);
  // ★ONLY THE SPAN BETWEEN THE MARKERS IS GRADED. A four-column table anywhere
  //  else on the page — an example, a fenced block, another section — is prose,
  //  and a gate that reddened for it would be fixed by deleting the example.
  arm("a four-column table elsewhere on the page is not the generated one",
    grade(`${page}\n\n| Platform | Reference hardware | Expression 2 | Essence 2 |\n|---|---|---|---|\n| Toaster | A toaster | 900 | 900 |\n`).length === 0);
  arm("the pin against a record that still agrees with it",
    gradePinAgainstRecord(pin, { stale_after_days: pin.stale_after_days, rows: recordFixture(pin, {}) }, undefined).length === 0);
  arm("a cell reading 'not yet real time' is pinned and graded like any other", Boolean(slowCell()) && grade(page).length === 0);
  arm("a row measured today is within the clock", currencyShown(first, pin.stale_after_days, first.cells["essence-2"].docs_measured_on) === "yes");
  arm("a row measured exactly on the clock is still within it",
    currencyShown(first, pin.stale_after_days, shift(first.cells["essence-2"].docs_measured_on, pin.stale_after_days)) === "yes");
  {
    // ★A LANE WITH NO CURRENT SOURCE SAYS SO. The bar this page is held to is
    //  that a row never carries a stale figure in place of an honest gap, so
    //  the currency column has to have a word for "the record publishes nothing
    //  here" that is not "yes". Every cell on the page has a source today; this
    //  arm keeps the path alive so it is correct the first day one does not.
    const orphan = { label: "Some Future Lane", plane: "not-measured", line: "| Some Future Lane | — | not measured yet | not measured yet |", cells: {} };
    const block = currencyBlock({ ...pin, rows: [orphan] }, TODAY);
    arm("a row with no record entry reads as having no source, never as current",
      block.includes("not published") && block.includes("no current source") && !/\|\s*yes\s*\|/.test(block));
  }
  arm("a row one day past the clock is not",
    currencyShown(first, pin.stale_after_days, shift(first.cells["essence-2"].docs_measured_on, pin.stale_after_days + 1)) !== "yes");

  console.log("\nCORPUS CONTROLS — the arms above must be grading something");
  arm("the pin holds every row the page's table carries", (() => {
    const [slots] = tableSlots(page);
    return tableRows(slots[pin.table_key]).size === pin.rows.length && pin.rows.length > 0;
  })());
  arm("every pinned cell carries a frame, a contract rate and a date",
    pin.rows.every((r) => Object.values(r.cells).every((c) => c.frame && c.contract_fps && c.docs_measured_on)));
  arm("both contract rates are on the page, and they differ",
    new Set(pin.rows.flatMap((r) => Object.values(r.cells).map((c) => c.contract_fps))).size === 2);

  console.log(bad ? `\nFAILED — ${bad} arm(s)` : `\nPASSED — 0 failure(s); every defect arm fired and every good arm stayed silent`);
  process.exit(bad ? 1 : 0);
}

/** A record shaped like the real one, derived from the pin, with one field
 *  broken on request. Keeps the R-arms honest without a 780 KB fixture. */
function recordFixture(pin, { fps, date, drop } = {}) {
  const rows = [];
  for (const r of pin.rows) {
    for (const [model, c] of Object.entries(r.cells)) {
      if (drop && rows.length === 0) continue;
      const [w, h] = (c.frame ?? "0x0").split("x").map(Number);
      rows.push({
        model,
        plane: r.plane,
        docs_fps: fps && rows.length === 0 ? c.docs_fps + fps : c.docs_fps,
        frame: { width: w, height: h },
        docs_measured_on: date && rows.length === 0 ? date : c.docs_measured_on,
      });
    }
  }
  return rows;
}

const htmlFixture = (lines) =>
  "<table><thead><tr><th>Platform</th><th>Reference hardware</th><th>Expression 2</th><th>Essence 2</th></tr></thead><tbody>" +
  lines
    .map((l) => `<tr>${cellsOf(l).map((c) => `<td>${c.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`).join("")}</tr>`)
    .join("") +
  "</tbody></table>";

const shift = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

main();
