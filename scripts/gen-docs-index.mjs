#!/usr/bin/env node
// After `astro build`: the docs MCP server's index (dist/docs-mcp-index.json).
// One entry per markdown twin (every page and hub the site serves as /<page>.md):
// its id (the page path), URL, title, section, description, headings and the
// twin's markdown, so `search` ranks and `fetch` returns exactly what /<page>.md
// serves. The section and search weight are read off the page's HTML (the same
// data-pagefind-* attributes site search uses); the instructions an agent gets
// on connect are the "Instructions for AI agents" block of dist/llms.txt.
//
//   node scripts/gen-docs-index.mjs [--dist dist]
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const DIST = join(ROOT, args.includes("--dist") ? args[args.indexOf("--dist") + 1] : "dist");
const SITE = "https://docs.bithuman.ai";
const SECTION_BY_PREFIX = {
  "": "Get started", start: "Get started", platforms: "Platforms", deploy: "Deploy", pricing: "Deploy", models: "Models",
  build: "Build", examples: "Build", api: "API", performance: "Performance",
};

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const docs = [];
for (const f of walk(DIST).sort()) {
  const rel = "/" + relative(DIST, f).replace(/\\/g, "/").replace(/\.md$/, "");
  if (rel.startsWith("/skills/")) continue;
  const md = readFileSync(f, "utf8");
  const head = /^# (.+)\n\nURL: (\S+)\n/.exec(md);
  if (!head) continue;
  const id = rel === "/index" ? "/" : rel;
  const htmlPath = id === "/" ? join(DIST, "index.html") : join(DIST, id, "index.html");
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
  const section = decode(/data-pagefind-filter="section:([^"]+)"/.exec(html)?.[1] ?? "") ||
    SECTION_BY_PREFIX[id.split("/")[1] ?? ""] || "Resources";
  const weight = Number(/data-pagefind-weight="([\d.]+)"/.exec(html)?.[1] ?? 1);
  const searchTitle = decode(/data-pagefind-meta="title:([^"]+)"/.exec(html)?.[1] ?? "");
  const description = /\n\n> (.+)\n/.exec(md)?.[1] ?? "";
  const headings = [...md.replace(/^```[\s\S]*?^```/gm, "").matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1].trim());
  docs.push({ id, url: head[2], title: head[1], ...(searchTitle && searchTitle !== head[1] ? { searchTitle } : {}), section, ...(weight !== 1 ? { weight } : {}), description, headings, markdown: md });
}
if (docs.length < 60) { console.error(`gen-docs-index: only ${docs.length} markdown twins in ${DIST}; run astro build first`); process.exit(1); }

const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
const block = /## Instructions for AI agents\n\n([\s\S]*?)\n\n## /.exec(llms)?.[1];
if (!block) { console.error("gen-docs-index: dist/llms.txt has no 'Instructions for AI agents' block"); process.exit(1); }
const instructions =
  `bitHuman documentation (${SITE}). Use \`search\` to find pages and \`fetch\` to read one as markdown; ` +
  `the index is ${SITE}/llms.txt.\n\n${block}`;

const out = { generated: new Date().toISOString(), site: SITE, instructions, docs };
writeFileSync(join(DIST, "docs-mcp-index.json"), JSON.stringify(out));
console.log(`gen-docs-index: ${docs.length} pages, ${(Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0)} KB → dist/docs-mcp-index.json`);
