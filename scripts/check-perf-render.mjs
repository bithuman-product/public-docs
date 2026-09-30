#!/usr/bin/env node
// Speed on this site is drawn from public/performance.json, as × real time,
// never typed (docs spec §5.2 "Numbers"). This gate holds the two halves a
// build alone cannot:
//
//   1. Every row id the site draws exists in performance.json and is published:
//      the home band (src/data/perf-band.ts), the groups and the no-GPU list
//      (src/data/perf-groups.ts), and every ```perf block in the docs. A row the
//      emitter renames or withdraws turns this red before a page draws "—".
//   2. No frame rate on a card, a hub, a lede or the home page data: readers
//      compare the multiple, and the playback rate belongs on the model pages.
//
// It also reports whether the band's sentence ("measured faster than real time
// on every configuration we publish") still holds; the component words itself
// down on its own when it does not, so that is a notice, not a failure.
//
//   node scripts/check-perf-render.mjs            # the site
//   node scripts/check-perf-render.mjs --selftest # every rule fires on a fixture
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");
const DOCS = join(ROOT, "src/content/docs");

/** A frame rate in words or figures. */
export const FPS = /\b\d+(?:\.\d+)?\s?(?:fps|FPS)\b|\bfps\b|\bframes (?:per|a) second\b/;

/** ```perf fences in a markdown text → their row ids. */
export function perfFenceIds(md) {
  const ids = [];
  for (const m of md.matchAll(/^```perf[ \t]*\n([\s\S]*?)^```[ \t]*$/gm)) ids.push(...m[1].split(/\s+/).filter(Boolean));
  return ids;
}

/** The frontmatter description (the lede), or "". */
export function lede(md) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? "";
  return /^description:\s*"?(.*?)"?\s*$/m.exec(fm)?.[1] ?? "";
}

/** Faults for one set of ids against the published rows. */
export function gradeIds(ids, rows, where, hidden = []) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const faults = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) faults.push(`${where}: "${id}" is not a row of performance.json`);
    else if (!r.published) faults.push(`${where}: "${id}" is not published in performance.json`);
    else if (hidden.includes(id)) faults.push(`${where}: "${id}" is hidden (src/data/perf-groups.ts HIDDEN_ROWS)`);
  }
  return faults;
}

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) bad++; };
  const rows = [{ id: "a", published: true }, { id: "b", published: false }];
  ok("a published id passes", gradeIds(["a"], rows, "x").length === 0);
  ok("an unknown id fires", gradeIds(["zz"], rows, "x").length === 1);
  ok("an unpublished id fires", gradeIds(["b"], rows, "x").length === 1);
  ok("a hidden id fires", gradeIds(["a"], rows, "x", ["a"]).length === 1);
  ok("a ```perf fence is read", perfFenceIds("x\n```perf\niphone-15 web\n```\n").join(",") === "iphone-15,web");
  ok("a lede with fps fires", FPS.test(lede('---\ndescription: "Renders at 25 fps on a phone."\n---\n')));
  ok("a lede in frames per second fires", FPS.test("plays 20 frames per second"));
  ok("a lede with × real time is quiet", !FPS.test(lede('---\ndescription: "2.1× real time on an iPhone."\n---\n')));
  ok("the word fpsx is not fps", !FPS.test("fpsx"));
  console.log(bad ? "selftest RED" : "selftest GREEN (every rule fired, the controls stayed quiet)");
  return bad ? 1 : 0;
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const perf = JSON.parse(readFileSync(join(ROOT, "public/performance.json"), "utf8"));
  const rows = perf.rows;
  const faults = [];

  const { PERF_BAND } = await import(pathToFileURL(join(ROOT, "src/data/perf-band.ts")).href);
  const { PERF_GROUPS, NO_GPU, HIDDEN_ROWS } = await import(pathToFileURL(join(ROOT, "src/data/perf-groups.ts")).href);
  const bandIds = PERF_BAND.flatMap((f) => [f.row, ...(f.held ? [f.held] : [])]);
  faults.push(...gradeIds(bandIds, rows, "src/data/perf-band.ts", HIDDEN_ROWS));
  faults.push(...gradeIds(PERF_GROUPS.flatMap((g) => g.rows), rows, "src/data/perf-groups.ts PERF_GROUPS", HIDDEN_ROWS));
  faults.push(...gradeIds(NO_GPU, rows, "src/data/perf-groups.ts NO_GPU", HIDDEN_ROWS));
  if (PERF_BAND.some((f) => f.href.includes("#"))) faults.push("src/data/perf-band.ts: a band frame links to an anchor; link the page");

  let fences = 0, ledes = 0;
  for (const f of walk(DOCS).filter((p) => p.endsWith(".md"))) {
    const rel = relative(ROOT, f);
    const md = readFileSync(f, "utf8");
    const ids = perfFenceIds(md);
    fences += ids.length ? 1 : 0;
    faults.push(...gradeIds(ids, rows, rel, HIDDEN_ROWS));
    if (/(^|\/)changelog(\/|\.md$)/.test(rel)) continue;
    ledes++;
    if (FPS.test(lede(md))) faults.push(`${rel}: the lede (description) states a frame rate; say × real time, or leave speed to /performance`);
    if (/^type:\s*"?hub"?\s*$/m.test(md) && FPS.test(md.replace(/^```[\s\S]*?^```$/gm, ""))) faults.push(`${rel}: a hub page states a frame rate`);
  }
  // Cards: the home data, the platform cards and the hub pages that draw them.
  const CARD_SOURCES = ["src/data/home.ts", "src/data/platforms.ts", "src/data/deployments.ts", "src/data/models.ts", "src/data/perf-band.ts", "src/config/hubs.ts",
    "src/pages/index.astro", "src/pages/platforms/index.astro", "src/pages/build/index.astro", "src/pages/resources/index.astro"];
  for (const rel of CARD_SOURCES) {
    const text = readFileSync(join(ROOT, rel), "utf8").split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    if (FPS.test(text)) faults.push(`${rel}: a card or hub carries a frame rate ("${FPS.exec(text)[0]}")`);
  }

  const slow = rows.filter((r) => r.published).flatMap((r) => Object.entries(r.cells).filter(([, c]) => c && c.x_realtime < 1).map(([m]) => `${r.id} ${m}`));
  if (slow.length) console.log(`  notice: below real time: ${slow.join(", ")} — the Runs everywhere band drops "faster than real time" from its sentence`);

  for (const f of faults) console.log(`::error::${f}`);
  console.log(faults.length
    ? `perf-render: ${faults.length} fault(s)`
    : `perf-render ok: ${bandIds.length} band ids, ${PERF_GROUPS.length} groups, ${NO_GPU.length} no-GPU rows and ${fences} page(s) with \`\`\`perf blocks all name published rows; ${ledes} ledes and ${CARD_SOURCES.length} card sources carry no frame rate`);
  return faults.length ? 1 : 0;
}

process.exit(await main());
