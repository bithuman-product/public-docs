// The built site's JSON-LD, as the text a search engine or an AI agent reads
// from it. Every page's <head> carries a <script type="application/ld+json">:
// the site-wide Organization and SoftwareApplication (src/config/site-jsonld.ts,
// placed by src/layouts/Base.astro) plus the nodes the page adds. The values
// are generated from the data files, so the source holds no claim to grade:
// the gates grade the rendered graph through this module, and a gate that
// strips a page's <script> elements keeps this text (withJsonLdText).
//
// Pure Node, no deps.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const BLOCK = /<script\b[^>]*\btype=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;

/** The graph's nodes: a block's @graph members, or the block itself. */
const nodesOf = (block) => (Array.isArray(block?.["@graph"]) ? block["@graph"] : [block]);

/** Every JSON-LD node in an HTML text. Throws on a block that does not parse:
 *  structured data a crawler cannot read is a fault, not a pass. */
export function jsonLdNodes(html) {
  const out = [];
  for (const m of html.matchAll(BLOCK)) {
    let block;
    try { block = JSON.parse(m[1]); } catch (e) { throw new Error(`a JSON-LD block does not parse: ${e.message}`); }
    out.push(...nodesOf(block));
  }
  return out;
}

/** Every string value in a node, in document order (keys are structure, not text). */
export function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** A node as text: its string values, one per line. */
export const nodeText = (node) => strings(node).join("\n");

/** The HTML with each JSON-LD block replaced by its text, for a gate that strips
 *  <script> elements before it reads a page. A block that does not parse is
 *  kept as written, so its bytes are still graded. */
export function withJsonLdText(html) {
  return html.replace(BLOCK, (_, body) => {
    try { return `\n${nodesOf(JSON.parse(body)).map(nodeText).join("\n")}\n`; } catch { return `\n${body}\n`; }
  });
}

/** The distinct JSON-LD nodes of every built page under `dist`, each with the
 *  first page that carries it: the site-wide nodes are on every page and are
 *  graded once. `skip(rel)` leaves a page out (rel is relative to `root`). */
export function builtJsonLd(dist, { root = join(dist, ".."), skip = () => false } = {}) {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const seen = new Map();
  const faults = [];
  let pages = 0;
  if (!existsSync(dist)) return { nodes: [], pages, faults };
  for (const f of walk(dist).filter((p) => p.endsWith(".html") && !/\/(_astro|pagefind)\//.test(p))) {
    const rel = relative(root, f);
    if (skip(rel)) continue;
    pages++;
    let nodes;
    try { nodes = jsonLdNodes(readFileSync(f, "utf8")); } catch (e) { faults.push(`${rel}: ${e.message}`); continue; }
    for (const node of nodes) {
      const key = JSON.stringify(node);
      if (!seen.has(key)) seen.set(key, { page: rel, type: String(node?.["@type"] ?? "node"), text: nodeText(node), node });
    }
  }
  return { nodes: [...seen.values()], pages, faults };
}
