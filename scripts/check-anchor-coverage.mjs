#!/usr/bin/env node
// Docs v2 (SPEC §4, §8): EVERY OLD ANCHOR KEEPS A HOME. scripts/anchors-snapshot.json
// lists the reader-facing ids of every page as the docs stood before v2 (headings,
// numbered steps, quickstart panels; never generated widget ids). For each
// "/page#id" of the snapshot, the build must serve one of:
//   * the page, still carrying the id;
//   * a row of scripts/anchors-moved.json whose new home is built and carries the id
//     (and, when the old page is still built, the same row in its `moved:` frontmatter,
//     so the stub line and the jump are there);
//   * a vercel.json redirect of the page, whose destination carries the id (or the
//     destination's own fragment, which check-redirects grades).
// It also grades every redirect destination fragment, and that each page's `moved:`
// rows equal the anchors-moved.json rows for that page.
//
//   node scripts/check-anchor-coverage.mjs                 grade dist/ (fails on a fault)
//   node scripts/check-anchor-coverage.mjs --report        print faults, exit 0 (docs v2 W2a:
//                                                          report-only until the moves land)
//   node scripts/check-anchor-coverage.mjs --suggest       also print candidate anchors-moved rows
//   node scripts/check-anchor-coverage.mjs --snapshot DIR  (re)write the snapshot from a build
//   node scripts/check-anchor-coverage.mjs --selftest
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { routeOf } from "./content-routes.mjs";

const ROOT = join(import.meta.dirname, "..");
const SNAP = join(ROOT, "scripts/anchors-snapshot.json");
const MOVED = join(ROOT, "scripts/anchors-moved.json");
const CONTENT = join(ROOT, "src/content/docs");

// Reader-facing ids: headings, recipe steps, quickstart panels. Widget ids (tabs,
// buttons, diagrams, the demo) are generated per build and never linked.
const KEEP = /^<(h[2-6]|li|article)\b/;
const SKIP_ID = /^(mdt-|ct-|dg-|demo$)/;

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : n === "index.html" ? [p] : []; });
const routeOfHtml = (dist, f) => { const r = "/" + relative(dist, f).replace(/(^|\/)index\.html$/, ""); return r === "/" ? "/" : r.replace(/\/$/, ""); };

/** route → Set of every id in the page (for "is it still there") */
export function allIds(dist) {
  const m = new Map();
  for (const f of walk(dist)) m.set(routeOfHtml(dist, f), new Set([...readFileSync(f, "utf8").matchAll(/\sid="([^"]+)"/g)].map((x) => x[1])));
  return m;
}

/** route → sorted reader-facing ids inside <main> (the snapshot) */
export function snapshot(dist) {
  const out = {};
  for (const f of walk(dist).sort()) {
    const h = readFileSync(f, "utf8");
    const main = (/<main[\s\S]*?<\/main>/.exec(h) || [""])[0];
    const ids = [...main.matchAll(/<(\w+)\b[^>]*\sid="([^"]+)"/g)]
      .filter((x) => KEEP.test(x[0]) && !SKIP_ID.test(x[2])).map((x) => x[2]);
    if (ids.length) out[routeOfHtml(dist, f)] = [...new Set(ids)].sort();
  }
  return out;
}

const norm = (u) => (u.length > 1 ? u.replace(/\/$/, "") : u);

/** faults for a snapshot against a build */
export function grade({ snap, ids, moved, redirects, frontmatterMoved }) {
  const faults = [];
  const bySource = new Map(redirects.map((r) => [norm(r.source), r.destination]));
  const has = (route, id) => ids.get(norm(route))?.has(id);
  const land = (to) => { const [p, f] = to.split("#"); return /^https?:\/\//.test(to) ? true : f ? has(p, f) : ids.has(norm(p)); };
  let checked = 0;
  for (const [route, list] of Object.entries(snap)) {
    for (const id of list) {
      checked++;
      const key = `${route}#${id}`;
      if (moved[key] !== undefined) {
        if (!land(moved[key])) faults.push(`${key} -> ${moved[key]} (anchors-moved.json): the build serves no such page and id`);
        else if (ids.has(route) && frontmatterMoved.get(route)?.[id] !== moved[key]) faults.push(`${key}: moved in anchors-moved.json, but ${route} is still built and its \`moved:\` frontmatter has no matching row (no stub, no jump)`);
        continue;
      }
      if (has(route, id)) continue;
      const d = bySource.get(route);
      if (d !== undefined) {
        const target = d.includes("#") ? d : `${d}#${id}`;
        if (land(target)) continue;
        faults.push(`${key}: the page redirects to ${d}, which has no #${id}; add an anchors-moved.json row`);
        continue;
      }
      faults.push(`${key}: no home (the page lost the id and no anchors-moved.json row or redirect carries it)`);
    }
  }
  for (const r of redirects) {
    if (!r.destination.includes("#") || /^https?:\/\//.test(r.destination)) continue;
    if (!land(r.destination)) faults.push(`redirect ${r.source} -> ${r.destination}: the destination has no such id`);
  }
  for (const [route, rows] of frontmatterMoved) {
    for (const [id, to] of Object.entries(rows)) {
      if (moved[`${route}#${id}`] !== to) faults.push(`${route} moved: ${id} -> ${to} is not a row of anchors-moved.json`);
    }
  }
  return { faults, checked };
}

/** the `moved:` frontmatter of every content page, by route */
function frontmatterMoves() {
  const m = new Map();
  const walkMd = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walkMd(p) : n.endsWith(".md") ? [p] : []; });
  for (const f of walkMd(CONTENT)) {
    const md = readFileSync(f, "utf8");
    const fm = (/^---\n([\s\S]*?)\n---/.exec(md) || [])[1] || "";
    const blk = /^moved:\s*\n((?:[ \t]+.+\n?)+)/m.exec(fm + "\n");
    const inline = /^moved:\s*(\{.*\})\s*$/m.exec(fm);
    if (!blk && !inline) continue;
    const rows = {};
    if (inline) Object.assign(rows, JSON.parse(inline[1]));
    else for (const l of blk[1].split("\n")) { const x = /^\s+"?([a-z0-9-]+)"?:\s*"?([^"\s]+)"?/.exec(l); if (x) rows[x[1]] = x[2]; }
    m.set(routeOf(CONTENT, f, md), rows);
  }
  // the Astro pages (landing, Platforms hub) keep theirs in src/data/hub-moved.json
  const hub = join(ROOT, "src/data/hub-moved.json");
  if (existsSync(hub)) for (const [route, rows] of Object.entries(JSON.parse(readFileSync(hub, "utf8")))) if (route.startsWith("/")) m.set(route, rows);
  return m;
}

function selftest() {
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); return cond ? 0 : 1; };
  const tmp = mkdtempSync(join(tmpdir(), "anchor-cov-"));
  mkdirSync(join(tmp, "a"), { recursive: true });
  writeFileSync(join(tmp, "a/index.html"), '<main><h2 id="one">1</h2><div id="mdt-1-0"></div><li id="step-1">x</li></main>');
  const snap0 = snapshot(tmp);
  let bad = 0;
  bad += ok("the snapshot keeps headings and steps, drops widget ids", JSON.stringify(snap0) === '{"/a":["one","step-1"]}');
  const base = { ids: new Map([["/a", new Set(["one", "step-1"])], ["/b", new Set(["two"])]]), moved: {}, redirects: [], frontmatterMoved: new Map() };
  bad += ok("an id still on its page passes", grade({ ...base, snap: { "/a": ["one"] } }).faults.length === 0);
  bad += ok("a lost id fires", grade({ ...base, snap: { "/a": ["gone"] } }).faults.some((f) => f.includes("no home")));
  bad += ok("a moved row to a built id passes (old page gone)", grade({ ...base, snap: { "/c": ["two"] }, moved: { "/c#two": "/b#two" } }).faults.length === 0);
  bad += ok("a moved row to a missing id fires", grade({ ...base, snap: { "/c": ["x"] }, moved: { "/c#x": "/b#x" } }).faults.length === 1);
  bad += ok("a moved row off a kept page needs its frontmatter row", grade({ ...base, snap: { "/a": ["x"] }, moved: { "/a#x": "/b#two" } }).faults.some((f) => f.includes("frontmatter")));
  bad += ok("…and passes with it", grade({ ...base, snap: { "/a": ["x"] }, moved: { "/a#x": "/b#two" }, frontmatterMoved: new Map([["/a", { x: "/b#two" }]]) }).faults.length === 0);
  bad += ok("a redirected page carries its ids", grade({ ...base, snap: { "/c": ["two"] }, redirects: [{ source: "/c", destination: "/b" }] }).faults.length === 0);
  bad += ok("a redirected page that drops an id fires", grade({ ...base, snap: { "/c": ["nine"] }, redirects: [{ source: "/c", destination: "/b" }] }).faults.length === 1);
  bad += ok("a redirect fragment that is not built fires", grade({ ...base, snap: {}, redirects: [{ source: "/z", destination: "/b#nine" }] }).faults.length === 1);
  bad += ok("a frontmatter row missing from the map fires", grade({ ...base, snap: {}, frontmatterMoved: new Map([["/a", { q: "/b#two" }]]) }).faults.length === 1);
  rmSync(tmp, { recursive: true, force: true });
  console.log(bad ? "selftest RED" : "selftest GREEN (every arm fired)");
  return bad ? 1 : 0;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) return selftest();
  const si = argv.indexOf("--snapshot");
  if (si >= 0) {
    const dir = argv[si + 1] || join(ROOT, "dist");
    const snap = snapshot(dir);
    const n = Object.values(snap).reduce((a, v) => a + v.length, 0);
    writeFileSync(SNAP, JSON.stringify({ $comment: "Reader-facing ids of every page before docs v2 (SPEC §4). Written once by `node scripts/check-anchor-coverage.mjs --snapshot <dist>` from the pre-v2 build; never regenerated to make a fault go away.", pages: snap }, null, 1) + "\n");
    console.log(`snapshot: ${Object.keys(snap).length} pages, ${n} ids -> ${relative(ROOT, SNAP)}`);
    return 0;
  }
  const DIST = join(ROOT, "dist");
  if (!existsSync(join(DIST, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); return 2; }
  const snap = JSON.parse(readFileSync(SNAP, "utf8")).pages;
  const moved = JSON.parse(readFileSync(MOVED, "utf8")).moved ?? {};
  const { redirects } = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  const ids = allIds(DIST);
  const { faults, checked } = grade({ snap, ids, moved, redirects, frontmatterMoved: frontmatterMoves() });
  const report = argv.includes("--report");
  if (checked < 800) { console.log(`::error::the snapshot holds only ${checked} ids — it stopped seeing anchors`); return 2; }
  for (const f of faults) console.log(`${report ? "::warning::" : "::error::"}${f}`);
  if (argv.includes("--suggest")) {
    for (const f of faults) {
      const k = /^(\/[^#\s]*#[^\s:]+)/.exec(f)?.[1];
      if (!k) continue;
      const id = k.split("#")[1];
      const where = [...ids].filter(([, s]) => s.has(id)).map(([r]) => r);
      if (where.length) console.log(`  suggest: "${k}": "${where[0]}#${id}"${where.length > 1 ? `  (also ${where.slice(1, 4).join(", ")})` : ""}`);
    }
  }
  const pct = checked ? (100 * (checked - faults.filter((f) => !f.startsWith("redirect ") && !f.includes(" moved: ")).length) / checked).toFixed(1) : "0";
  console.log(`anchor coverage: ${checked} snapshot ids, ${pct}% with a home; ${Object.keys(moved).length} anchors-moved rows; ${faults.length} fault(s)${report ? " (report-only)" : ""}`);
  return faults.length && !report ? 1 : 0;
}
process.exit(main());
