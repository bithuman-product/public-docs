// The generated FLOORS blocks, found the same way by every gate that has to know
// where they are.
//
// bithuman-models' emitter (models/essence-2/tools/check_perf_floors.py
// --emit-docs) writes every measured number this site publishes, and it writes
// them ONLY between paired markers:
//
//     <!-- FLOORS:TABLE all -->      …      <!-- /FLOORS:TABLE -->
//     <!-- FLOORS:HEADLINE -->       …      <!-- /FLOORS:HEADLINE -->
//     <!-- FLOORS:MEMORY -->, <!-- FLOORS:RELEASES -->, <!-- FLOORS:METHOD -->, …
//
// Two gates need that span. check-performance-floors.mjs pins what is inside it,
// and check-perf-literals.mjs exempts it: a number inside the markers is the
// emitter's, and a number outside them was typed by hand. Both read the span from
// here, so the two can never disagree about where "generated" ends.
//
// ★A MALFORMED PAIR IS A FAULT, NEVER A GUESS. An opening marker with no close
// would otherwise exempt the rest of the file from the literal gate, which is the
// cheapest possible way to smuggle a number past it.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const OPEN = /<!--\s*FLOORS:([A-Z][A-Z0-9_]*)(?:\s+([A-Za-z0-9_-]+))?\s*-->/g;
const closeRe = (marker) => new RegExp(`<!--\\s*\\/FLOORS:${marker}\\s*-->`, "g");

/** Markers the emitter no longer writes and this site no longer publishes.
 *  PERF-CURRENCY was a per-row "within the 30-day clock" table (staleness is now
 *  the emitter's refusal plus this site's scheduled run); FLOORS:NOTES was ~900
 *  words of investigation log under the table. REDESIGN §3.1: removed for good. */
export const RETIRED_MARKERS = [
  { re: /<!--\s*\/?PERF-CURRENCY\s*-->/, name: "PERF-CURRENCY" },
  { re: /<!--\s*\/?FLOORS:NOTES\s*-->/, name: "FLOORS:NOTES" },
];

/** (blocks, faults) for one text. Each block: {marker, key, open, start, end, close, body}
 *  where `start`..`end` is the body between the two markers and `open`..`close`
 *  spans the markers themselves. */
export function findBlocks(text) {
  const blocks = [];
  const faults = [];
  let m;
  OPEN.lastIndex = 0;
  let cursor = 0;
  while ((m = OPEN.exec(text)) !== null) {
    if (m.index < cursor) continue;
    const [whole, marker, key = null] = m;
    const re = closeRe(marker);
    re.lastIndex = m.index + whole.length;
    const c = re.exec(text);
    const nextOpen = (() => {
      const o = new RegExp(OPEN.source, "g");
      o.lastIndex = m.index + whole.length;
      const n = o.exec(text);
      return n ? n.index : text.length;
    })();
    if (!c || c.index > nextOpen) {
      faults.push(`${whole} at line ${lineOf(text, m.index)} is not closed by <!-- /FLOORS:${marker} --> before the next generated block`);
      continue;
    }
    blocks.push({
      marker,
      key,
      open: m.index,
      start: m.index + whole.length,
      end: c.index,
      close: c.index + c[0].length,
      body: text.slice(m.index + whole.length, c.index),
      line: lineOf(text, m.index),
    });
    cursor = c.index + c[0].length;
    OPEN.lastIndex = cursor;
  }
  // a closing marker with no opener is the other half of the same fault
  const closes = [...text.matchAll(/<!--\s*\/FLOORS:([A-Z][A-Z0-9_]*)\s*-->/g)];
  for (const c of closes) {
    if (!blocks.some((b) => b.end === c.index)) {
      faults.push(`${c[0]} at line ${lineOf(text, c.index)} closes no open generated block`);
    }
  }
  return [blocks, faults];
}

/** The text with every generated span (markers included) blanked to spaces,
 *  newlines kept, so line numbers in what remains are the file's own. */
export function withoutBlocks(text, blocks) {
  let out = "";
  let at = 0;
  for (const b of blocks) {
    out += text.slice(at, b.open);
    out += text.slice(b.open, b.close).replace(/[^\n]/g, " ");
    at = b.close;
  }
  return out + text.slice(at);
}

export function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** Every file under `roots` (relative to `root`) whose extension is in `exts`. */
export function walk(root, roots, exts = /\.(md|mdx|astro|ts|mjs|js|json)$/) {
  const out = [];
  const go = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    if (statSync(abs).isDirectory()) {
      for (const name of readdirSync(abs).sort()) go(join(rel, name));
    } else if (exts.test(rel)) {
      out.push(rel);
    }
  };
  for (const r of roots) go(r);
  return out;
}

/** Every file under `roots` that carries at least one generated block. */
export function filesWithBlocks(root, roots) {
  return walk(root, roots, /\.(md|mdx|astro)$/).filter((rel) => /<!--\s*FLOORS:/.test(readFileSync(join(root, rel), "utf8")));
}
