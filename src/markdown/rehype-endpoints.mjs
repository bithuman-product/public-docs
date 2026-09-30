// Docs v2 W5 (SPEC §5 endpoint): on an API resource page, every H2 that
// scripts/api-pages.json names as an operation's home becomes an endpoint
// section: under the heading, the METHOD pill, the path in mono and the
// operationId (an anchor, so /api/<page>#<operationId> lands here too; the H2
// keeps its human slug, which inbound links use). The section's code (the
// curl / Python / Node tab group and the JSON responses, with an "Example" or
// "Response" heading right above them) goes in a right column that stays in
// view at 1280 px and wider; below that the section reads top to bottom.
// Nothing here is in the .md twin (the prose names each path).
//
// Runs last among the site's rehype plugins, before Astro's heading ids and
// rehype-raw: the tab groups are still raw HTML runs here (remark-code-tabs),
// and the H2 slugs are computed the way Astro computes them (github-slugger over
// every heading in order).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Slugger from "github-slugger";
import { apiSpec } from "../lib/openapi.ts";

let byPage = null;
function pages() {
  if (byPage) return byPage;
  const ops = JSON.parse(readFileSync(join(process.cwd(), "scripts/api-pages.json"), "utf8")).operations;
  const spec = new Map(apiSpec().tags.flatMap((t) => t.operations.map((o) => [o.id, o])));
  byPage = new Map();
  for (const [id, row] of Object.entries(ops)) {
    const op = spec.get(id);
    if (!op) throw new Error(`scripts/api-pages.json: ${id} is not an operation of src/openapi/bithuman.yaml`);
    if (!byPage.has(row.page)) byPage.set(row.page, new Map());
    byPage.get(row.page).set(row.slug, { id, method: op.method, path: op.path });
  }
  return byPage;
}

/** The pages that carry endpoint sections (DocLayout widens them). */
export const endpointRoutes = () => new Set(pages().keys());

const text = (n) => (n.type === "text" ? n.value : (n.children ?? []).map(text).join(""));
const el = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });
const t = (value) => ({ type: "text", value });
const isEl = (n, tag) => n?.type === "element" && (!tag || n.tagName === tag);
const heading = (n) => isEl(n) && /^h[1-6]$/.test(n.tagName);
const routeOf = (file) => {
  const m = /[\\/]src[\\/]content[\\/]docs[\\/](.+)\.mdx?$/.exec(String(file?.path ?? file?.history?.[0] ?? ""));
  return m ? "/" + m[1].replace(/\/index$/, "") : null;
};

/** Split a section body into [doc, code] runs: a raw md-tabs run, any code <pre>
 *  (a JSON response, a helper such as a polling loop), and an "Example"/"Response"
 *  H3 directly above one of them go to the code column. */
function partition(body) {
  const units = [];
  for (let i = 0; i < body.length; i++) {
    const n = body[i];
    if (n.type === "raw" && /^<div class="md-tabs"/.test(n.value)) {
      let depth = 0, j = i + 1;
      for (; j < body.length; j++) {
        const v = body[j].type === "raw" ? body[j].value : "";
        if (/^<div class="mdt-panel/.test(v)) depth++;
        else if (v.trim() === "</div>") { if (depth === 0) break; depth--; }
      }
      units.push({ code: true, nodes: body.slice(i, j + 1) });
      i = j;
      continue;
    }
    const pre = isEl(n, "pre") && Boolean(n.properties?.dataLanguage);
    units.push({ code: pre, nodes: [n] });
  }
  // a label heading travels with the code it introduces (whitespace text between is skipped)
  for (let k = 0; k < units.length; k++) {
    const h = units[k].nodes[0];
    if (!(isEl(h, "h3") && /^(Example|Response)$/.test(text(h).trim()))) continue;
    let m = k + 1;
    while (m < units.length && units[m].nodes.every((x) => x.type === "text" && !x.value.trim())) m++;
    if (units[m]?.code) units[k].code = true;
  }
  // an H3 whose whole subsection is code (e.g. "Text input" over a curl block) labels
  // that code, so it moves too; otherwise it would sit empty in the text column
  for (let k = 0; k < units.length; k++) {
    if (units[k].code || !isEl(units[k].nodes[0], "h3")) continue;
    let m = k + 1, hasCode = false, onlyCode = true;
    for (; m < units.length && !heading(units[m].nodes[0]); m++) {
      if (units[m].code) hasCode = true;
      else if (!units[m].nodes.every((x) => x.type === "text" && !x.value.trim())) { onlyCode = false; break; }
    }
    if (hasCode && onlyCode) units[k].code = true;
  }
  const doc = [], code = [];
  for (const u of units) (u.code ? code : doc).push(...u.nodes);
  return [doc, code];
}

export default function rehypeEndpoints() {
  return (tree, file) => {
    const route = routeOf(file);
    const ops = route && pages().get(route);
    if (!ops) return;
    const slugger = new Slugger();
    const kids = tree.children;
    const out = [];
    let i = 0;
    const seen = new Set();
    const slugs = new Map();
    // heading slugs in document order (nested headings too, as Astro counts them)
    const visit = (n) => { if (heading(n)) slugs.set(n, n.properties?.id ?? slugger.slug(text(n))); (n.children ?? []).forEach(visit); };
    visit(tree);
    while (i < kids.length) {
      const n = kids[i];
      const op = isEl(n, "h2") ? ops.get(slugs.get(n)) : undefined;
      if (!op) { out.push(n); i++; continue; }
      let j = i + 1;
      while (j < kids.length && !isEl(kids[j], "h2")) j++;
      const [doc, code] = partition(kids.slice(i + 1, j));
      seen.add(op.id);
      const line = el("p", { className: ["ep-line"] }, [
        el("span", { className: ["ep-m", `ep-m-${op.method.toLowerCase()}`] }, [t(op.method)]),
        t(" "),
        el("code", { className: ["ep-path"] }, [t(op.path)]),
        t(" "),
        el("a", { className: ["ep-id"], id: op.id, href: `#${op.id}`, title: "Operation ID" }, [t(op.id)]),
      ]);
      const body = code.length
        ? el("div", { className: ["ep-body"] }, [el("div", { className: ["ep-doc"] }, doc), el("div", { className: ["ep-code"] }, code)])
        : el("div", { className: ["ep-body", "ep-body-1"] }, [el("div", { className: ["ep-doc"] }, doc)]);
      out.push(el("section", { className: ["ep"], dataOperation: op.id }, [n, line, body]));
      i = j;
    }
    const missing = [...ops.values()].filter((o) => !seen.has(o.id));
    if (missing.length) throw new Error(`${route}: scripts/api-pages.json places ${missing.map((o) => `${o.id} (#${[...ops].find(([, v]) => v === o)[0]})`).join(", ")} here, but the page has no such H2`);
    tree.children = out;
  };
}
