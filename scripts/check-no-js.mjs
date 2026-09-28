#!/usr/bin/env node
// The interactive pages read completely with JavaScript off (docs spec §4.1):
// every widget renders its full static result at build, and a script only
// switches what is shown. This gate reads the built HTML (no browser, no
// script runs) and requires the content a reader needs to be in it:
//
//   /performance    the explorer draws every published performance.json row,
//                   for each model, with the multiple formatMultiple() prints
//                   (the same rule the generated tables use)
//   /pricing        the calculator's worked examples and its default result
//   /start          the quickstart picker: every platform's panel, heading,
//                   steps and "Next" link
//   /models         the full model × place matrix, one row per place
//   /deploy         all four deployment modes
//   /api/reference  every operation in the OpenAPI spec, each with an anchor,
//                   and curl, Python and Node samples where the spec's curl
//                   converts; no third-party script
//   /api/*          the request examples carry curl, Python and Node tabs, each
//                   panel labelled for a reader with no script
//   /examples       every example is a card with its poster and provenance
//   /deploy/privacy the data-flow explorer draws every mode, every data kind
//   /build/*        a recipe's steps are all in the page, numbered, each with
//                   its "Expected" check
//
//   node scripts/check-no-js.mjs            # dist/ after npm run build
//   node scripts/check-no-js.mjs --selftest # every rule fires on a fixture
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { formatMultiple } from "../src/lib/format-multiple.ts";
import { PLACES } from "../src/data/models.ts";
import { DEPLOYMENTS } from "../src/data/deployments.ts";
import { EXAMPLES, provenanceLine } from "../src/data/examples.ts";
import { FLOW_MODES, DATA_KINDS } from "../src/data/dataflows.ts";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const MODELS = ["essence-2", "expression-2"];

const text = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
/** The HTML of the element that opens at `start` (a naive balanced-tag walk for one tag name). */
function element(html, start, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  return html.slice(start);
}

export function gradePerformance(html, rows) {
  const f = [];
  const at = html.indexOf("data-perf-explorer");
  if (at < 0) return ["/performance: no performance explorer"];
  const ex = element(html, html.lastIndexOf("<section", at), "section");
  for (const m of MODELS) {
    const p = ex.indexOf(`data-model-panel="${m}"`);
    if (p < 0) { f.push(`/performance: the explorer has no ${m} panel`); continue; }
    const panel = element(ex, ex.lastIndexOf("<div", p), "div");
    for (const r of rows.filter((x) => x.published)) {
      const i = panel.indexOf(`data-row="${r.id}"`);
      if (i < 0) { f.push(`/performance: the ${m} panel leaves out the published row ${r.id}`); continue; }
      const c = r.cells[m];
      if (!c) continue;
      const tr = element(panel, panel.lastIndexOf("<tr", i), "tr");
      const want = formatMultiple(c.x_realtime);
      if (!text(tr).includes(want)) f.push(`/performance: ${m} ${r.id} does not print ${want}`);
    }
  }
  return f;
}

export function gradePricing(html) {
  const f = [];
  if (!/class="cc-examples"/.test(html)) f.push("/pricing: no worked examples for the calculator");
  const ex = html.indexOf('class="cc-examples"');
  if (ex >= 0 && (element(html, html.lastIndexOf("<div", ex), "div").match(/<tr>/g) ?? []).length < 4) f.push("/pricing: the worked examples do not cover every mode");
  if (!/data-credits(="")?>[\d,]+</.test(html)) f.push("/pricing: the calculator has no default result");
  if (!/active session time, talking or idle/.test(text(html))) f.push("/pricing: the calculator does not state the billing rule");
  return f;
}

/** Every platform the picker offers has its panel in the HTML: a heading, its
 *  steps (or, for offline, the note), and a Next link. */
export function gradeStart(html) {
  const f = [];
  const sw = html.indexOf("data-switcher");
  if (sw < 0) return ["/start: no quickstart picker"];
  const keys = [...element(html, html.lastIndexOf("<div", sw), "div").matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
  if (keys.length < 8) f.push(`/start: the picker offers only ${keys.length} platforms`);
  for (const id of keys) {
    const i = html.indexOf(`id="qp-${id}"`);
    if (i < 0) { f.push(`/start: no quickstart panel for ${id}`); continue; }
    const panel = element(html, html.lastIndexOf("<article", i), "article");
    if (!panel.includes(`id="qp-${id}-h"`)) f.push(`/start: the ${id} panel has no heading`);
    if (!/class="qp-steps"[\s\S]*?<li\b/.test(panel) && !/class="qp-note"/.test(panel)) f.push(`/start: the ${id} panel has no steps`);
    if (!/class="qp-btn[^"]*"[^>]*href="\/(platforms|deploy)\//.test(panel) && !/href="\/(platforms|deploy)\/[^"]*"[^>]*>Next/.test(panel)) f.push(`/start: the ${id} panel has no Next link`);
  }
  return f;
}

export function gradeModels(html, places) {
  const i = html.indexOf('class="doc-block doc-block-model-matrix"');
  if (i < 0) return ["/models: no model × place matrix"];
  const block = element(html, html.lastIndexOf("<div", i), "div");
  const f = [];
  const t = text(block);
  for (const p of places) if (!t.includes(p.name)) f.push(`/models: the matrix has no row for ${p.name}`);
  return f;
}

export function gradeDeploy(html, modes) {
  const f = [];
  for (const d of modes) if (!html.includes(`data-mx-item="${d.id}"`)) f.push(`/deploy: no card for ${d.name}`);
  return f;
}

export function gradeGallery(html, examples, prov = () => "") {
  const f = [];
  const t = text(html);
  for (const e of examples) {
    if (!html.includes(`href="${e.href}"`)) f.push(`/examples: no card for ${e.title}`);
    if (!html.includes(`/examples/${e.capture}/poster.webp`)) f.push(`/examples: ${e.title} has no poster`);
    const line = prov(e.capture);
    if (line && !t.includes(line)) f.push(`/examples: ${e.title} does not say where it was captured`);
  }
  return f;
}

export function gradeDataflow(html, modes, kinds) {
  const f = [];
  for (const m of modes) {
    const i = html.indexOf(`data-dfx-panel="${m.id}"`);
    if (i < 0) { f.push(`/deploy/privacy: no panel for ${m.name}`); continue; }
    const panel = element(html, html.lastIndexOf("<div", i), "div");
    for (const k of kinds) if (!text(panel).includes(k.name)) f.push(`/deploy/privacy: ${m.name} says nothing about ${k.name}`);
  }
  return f;
}

export function gradeRecipe(route, html) {
  const f = [];
  const steps = [...html.matchAll(/<li class="walk-step" id="step-(\d+)"/g)].map((m) => Number(m[1]));
  if (steps.length < 2) f.push(`${route}: the steps are not in the page`);
  steps.forEach((n, i) => { if (n !== i + 1) f.push(`${route}: step ${i + 1} is numbered ${n}`); });
  const checks = (html.match(/<details class="expected" open>/g) ?? []).length;
  if (checks < steps.length) f.push(`${route}: ${steps.length} steps but ${checks} "Expected" checks`);
  return f;
}

export function gradeReference(html, spec) {
  const f = [];
  if (/<script\b[^>]*\bsrc=["']https?:\/\//i.test(html)) f.push("/api/reference: loads a third-party script");
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const m of ["get", "post", "put", "patch", "delete"]) {
      const op = item[m];
      if (!op) continue;
      const i = html.indexOf(`id="${op.operationId}"`);
      if (i < 0) { f.push(`/api/reference: ${m.toUpperCase()} ${path} (${op.operationId}) is not on the page`); continue; }
      const sec = element(html, html.lastIndexOf("<section", i), "section");
      if (!text(sec).includes(path)) f.push(`/api/reference: ${op.operationId} does not name its path`);
      const curl = (op["x-codeSamples"] ?? []).find((c) => /curl/i.test(c.label ?? "") && !/\|/.test(c.source));
      if (curl && !(sec.includes('data-tab="Python"') && sec.includes('data-tab="Node"'))) f.push(`/api/reference: ${op.operationId} has curl but no Python and Node samples`);
    }
  }
  return f;
}

export function gradeApiPage(page, html) {
  const f = [];
  const groups = html.split("data-md-tabs").slice(1);
  for (const g of groups) {
    const bar = g.slice(0, g.indexOf("</div>"));
    if (!/data-tab="curl"/.test(bar)) continue;
    if (!/data-tab="Node"/.test(bar)) f.push(`${page}: a curl example has no Node tab`);
    if (!/data-tab="Python"/.test(bar)) f.push(`${page}: a curl example has no Python tab`);
  }
  const panels = (html.match(/class="mdt-panel/g) ?? []).length;
  const labels = (html.match(/class="mdt-label"/g) ?? []).length;
  if (panels !== labels) f.push(`${page}: ${panels - labels} tab panel(s) have no label for a reader without JavaScript`);
  return f;
}

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) bad++; };
  const rows = [{ id: "a", published: true, cells: { "essence-2": { x_realtime: 2.16 }, "expression-2": { x_realtime: 17 } } }, { id: "b", published: false, cells: {} }];
  const panel = (m, rowsHtml) => `<div class="pe-panel" data-model-panel="${m}">${rowsHtml}</div>`;
  const good = `<section class="pe" data-perf-explorer>${panel("essence-2", '<tr data-row="a"><td>2.1×</td></tr>')}${panel("expression-2", '<tr data-row="a"><td>17.0×</td></tr>')}</section>`;
  ok("a complete explorer passes", gradePerformance(good, rows).length === 0);
  ok("a missing row fires", gradePerformance(good.replace('<tr data-row="a"><td>17.0×</td></tr>', ""), rows).some((x) => x.includes("leaves out")));
  ok("a rounded-up multiple fires", gradePerformance(good.replace("2.1×", "2.2×"), rows).some((x) => x.includes("does not print")));
  ok("no explorer fires", gradePerformance("<p>tables</p>", rows).length === 1);
  ok("a calculator without worked examples fires", gradePricing('<span data-credits>3,600</span> active session time, talking or idle').some((x) => x.includes("worked examples")));
  const start = '<div class="psw" data-switcher><button data-key="web"></button></div><article id="qp-web"><h3 id="qp-web-h">Web</h3><ol class="qp-steps"><li>Paste</li></ol><a class="qp-btn" href="/platforms/web#first-frame">Next</a></article>';
  const eight = start.replace('<button data-key="web"></button>', '<button data-key="web"></button>'.repeat(8));
  ok("a complete picker passes", gradeStart(eight).length === 0);
  ok("a panel without steps fires", gradeStart(eight.replace("<li>Paste</li>", "")).some((x) => x.includes("no steps")));
  ok("a missing panel fires", gradeStart(eight.replace('id="qp-web"', 'id="qp-x"')).some((x) => x.includes("no quickstart panel")));
  ok("a missing Next fires", gradeStart(eight.replace('href="/platforms/web#first-frame"', 'href="#"')).some((x) => x.includes("no Next")));
  const spec = { paths: { "/v1/x": { post: { operationId: "doX", "x-codeSamples": [{ label: "cURL", source: "curl -X POST https://a.b/v1/x" }] } } } };
  const ref = '<section class="ar-op"><h3 id="doX">POST /v1/x</h3><button data-tab="curl"></button><button data-tab="Python"></button><button data-tab="Node"></button></section>';
  ok("a complete reference passes", gradeReference(ref, spec).length === 0);
  ok("a missing operation fires", gradeReference("<p></p>", spec).some((x) => x.includes("is not on the page")));
  ok("curl without Node fires", gradeReference(ref.replace('data-tab="Node"', 'data-tab="Go"'), spec).some((x) => x.includes("no Python and Node")));
  ok("a third-party script fires", gradeReference(ref + '<script src="https://cdn.example/x.js"></script>', spec).some((x) => x.includes("third-party")));
  const api = '<div class="md-tabs" data-md-tabs><div class="mdt-bar"><button data-tab="curl"></button><button data-tab="Python"></button><button data-tab="Node"></button></div><div class="mdt-panel"><p class="mdt-label">curl</p></div></div>';
  ok("an API page with three labelled tabs passes", gradeApiPage("x", api).length === 0);
  ok("an API page without Node fires", gradeApiPage("x", api.replace('data-tab="Node"', "")).some((x) => x.includes("Node")));
  ok("an unlabelled panel fires", gradeApiPage("x", api.replace('<p class="mdt-label">curl</p>', "")).some((x) => x.includes("no label")));
  ok("a matrix missing a place fires", gradeModels('<style>.doc-block-model-matrix{}</style><div class="doc-block doc-block-model-matrix"><td>Mac</td></div>', [{ name: "Mac" }, { name: "Android" }]).length === 1);
  ok("a missing deploy card fires", gradeDeploy('<li data-mx-item="cloud">', [{ id: "cloud", name: "c" }, { id: "cpu", name: "CPU" }]).length === 1);
  const ex = [{ title: "A", href: "/a", capture: "c1" }];
  ok("a gallery card without its poster fires", gradeGallery('<a href="/a">A</a>', ex).some((x) => x.includes("poster")));
  ok("a complete gallery passes", gradeGallery('<a href="/a">A</a><img src="/examples/c1/poster.webp"><span>Captured on X</span>', ex, () => "Captured on X").length === 0);
  const dfx = '<div class="dfx-panel" data-dfx-panel="cloud"><span>Portrait</span></div>';
  ok("a data-flow panel missing a kind fires", gradeDataflow(dfx, [{ id: "cloud", name: "Cloud" }], [{ name: "Portrait" }, { name: "Live audio" }]).length === 1);
  ok("a missing data-flow mode fires", gradeDataflow(dfx, [{ id: "cpu", name: "CPU" }], [{ name: "Portrait" }]).length === 1);
  const walk = (n, e) => Array.from({ length: n }, (_, i) => `<li class="walk-step" id="step-${i + 1}">`).join("") + '<details class="expected" open>'.repeat(e);
  ok("a recipe with a check per step passes", gradeRecipe("/r", walk(3, 3)).length === 0);
  ok("a step without its check fires", gradeRecipe("/r", walk(3, 2)).some((x) => x.includes("Expected")));
  console.log(bad ? "selftest RED" : "selftest GREEN (every rule fired)");
  return bad ? 1 : 0;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  if (!existsSync(join(DIST, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); return 2; }
  const page = (p) => readFileSync(join(DIST, p, "index.html"), "utf8");
  const rows = JSON.parse(readFileSync(join(ROOT, "public/performance.json"), "utf8")).rows;
  const spec = yaml.load(readFileSync(join(ROOT, "src/openapi/bithuman.yaml"), "utf8"));
  const faults = [
    ...gradePerformance(page("performance"), rows),
    ...gradePricing(page("pricing")),
    ...gradeStart(page("start")),
    ...gradeModels(page("models"), PLACES),
    ...gradeDeploy(page("deploy"), DEPLOYMENTS),
    ...gradeReference(page("api/reference"), spec),
    ...gradeGallery(page("examples"), EXAMPLES, provenanceLine),
    ...gradeDataflow(page("deploy/privacy"), FLOW_MODES, DATA_KINDS),
  ];
  for (const d of readdirSync(join(DIST, "build"), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const html = page(`build/${d.name}`);
    if (html.includes('class="walk"')) faults.push(...gradeRecipe(`/build/${d.name}`, html));
  }
  let withNode = 0;
  for (const d of readdirSync(join(DIST, "api"), { withFileTypes: true })) {
    if (!d.isDirectory() || d.name === "reference") continue;
    const html = page(`api/${d.name}`);
    if (html.includes('data-tab="Node"')) withNode++;
    faults.push(...gradeApiPage(`/api/${d.name}`, html));
  }
  if (withNode < 10) faults.push(`only ${withNode} /api/* pages carry Node samples; the curl → Python → Node tabs went missing`);
  for (const f of faults) console.log(`::error::${f}`);
  const ops = Object.values(spec.paths).reduce((a, it) => a + ["get", "post", "put", "patch", "delete"].filter((m) => it[m]).length, 0);
  console.log(`${faults.length ? "FAIL" : "OK"}: with JavaScript off, /performance draws ${rows.filter((r) => r.published).length} published rows per model, /start every picker platform, /api/reference ${ops} operations, ${withNode} /api pages carry curl, Python and Node`);
  return faults.length ? 1 : 0;
}
process.exit(main());
