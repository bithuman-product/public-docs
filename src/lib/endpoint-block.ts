// Docs v2 W5 (SPEC §5 endpoint): one operation drawn from src/openapi/bithuman.yaml,
// for an operation that has no hand-written section on its resource page. A page
// places it with a fence (```endpoint + the operationId); scripts/api-pages.json
// names the page and the H2 slug (the summary, slugged). The page gets the
// summary as an H2, the spec's description, a parameter table, the curl request
// (src/markdown/remark-api-samples.mjs adds Python and Node from it) and the
// first example response; the METHOD pill, path and operationId anchor come from
// src/markdown/rehype-endpoints.mjs like every other operation. The .md twin keeps
// it short (SPEC §7: api.txt must not grow): the H2, the method and path with the
// first sentence of the description, and the curl command.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apiSpec, type Operation } from "./openapi.ts";

type Mode = "page" | "twin";
interface PageRow { page: string; slug: string; generated?: boolean }

let map: Record<string, PageRow> | null = null;
export function apiPages(): Record<string, PageRow> {
  if (!map) map = JSON.parse(readFileSync(join(process.cwd(), "scripts/api-pages.json"), "utf8")).operations;
  return map!;
}

export function operation(id: string): Operation {
  for (const t of apiSpec().tags) for (const op of t.operations) if (op.id === id) return op;
  throw new Error(`\`\`\`endpoint: no operation "${id}" in src/openapi/bithuman.yaml`);
}

/** The spec's in-page links (#tag/…/operation/<id>, #operation/<id>) → the operation's page and slug. */
function relink(md: string): string {
  const to = (id: string) => { const r = apiPages()[id]; return r ? `${r.page}#${r.slug}` : "/api/reference"; };
  return md
    .replace(/\]\(#tag\/[^/)]+\/operation\/([A-Za-z0-9_]+)\)/g, (_, id: string) => `](${to(id)})`)
    .replace(/\]\(#operation\/([A-Za-z0-9_]+)\)/g, (_, id: string) => `](${to(id)})`)
    .replace(/\]\(#tag\/[^)]+\)/g, "](/api/reference)")
    .replace(/\]\(https:\/\/docs\.bithuman\.ai(\/[^)]*)\)/g, "]($1)");
}

const cell = (s: string) => s.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();
/** A command with a pipe keeps curl alone (no Python or Node), so the request is drawn without its pipe. */
const request = (op: Operation) => {
  const curl = op.samples.find((s) => s.label === "curl")?.code ?? "";
  return curl.split("\n").map((l) => l.replace(/\s*\|\s*jq\b.*$/, "")).join("\n").trim();
};
const firstSentence = (md: string) => (relink(md).replace(/\s*\n\s*/g, " ").match(/^.*?[.:](?=\s|$)/)?.[0] ?? "").trim();

export function endpointBlock(arg: string, mode: Mode): string {
  const id = arg.trim();
  const row = apiPages()[id];
  if (!row) throw new Error(`\`\`\`endpoint: ${id} is not in scripts/api-pages.json`);
  if (!row.generated) throw new Error(`\`\`\`endpoint: ${id} has a hand-written section (${row.page}#${row.slug}); mark it generated in scripts/api-pages.json or remove the fence`);
  const op = operation(id);
  const curl = request(op);
  if (!curl) throw new Error(`\`\`\`endpoint: ${id} has no curl sample in the spec`);
  if (mode === "twin") {
    const lead = firstSentence(op.description);
    return `## ${op.summary}\n\n\`${op.method} ${op.path}\`${lead ? `: ${lead}` : ""}\n\n\`\`\`bash\n${curl}\n\`\`\`\n`;
  }
  let out = `## ${op.summary}\n\n`;
  if (op.description) out += `${relink(op.description).trim()}\n\n`;
  const params = op.params.filter((p) => p.where !== "header" || !/^(api-secret|authorization)$/i.test(p.name));
  const rows = [
    ...params.map((p) => `| \`${p.name}\` | ${p.where ?? ""} | ${cell(p.type)} | ${p.required ? "yes" : "no"} | ${cell(relink(p.description))} |`),
    ...op.body.map((f) => `| \`${f.name}\` | body | ${cell(f.type)} | ${f.required ? "yes" : "no"} | ${cell(relink(f.description))} |`),
  ];
  if (rows.length) out += `| Parameter | In | Type | Required | Description |\n|---|---|---|---|---|\n${rows.join("\n")}\n\n`;
  out += `\`\`\`bash tab="curl"\n${curl}\n\`\`\`\n\n`;
  const ex = op.responses.find((r) => r.example);
  if (ex) out += `\`\`\`json\n${ex.example}\n\`\`\`\n`;
  return out;
}

/**
 * The .md twin's counterpart of the HTML METHOD pill (rehype-endpoints): under each
 * H2 of `route` that scripts/api-pages.json maps to an operation, a line with the
 * method and path, unless the section already starts with it or is an ```endpoint
 * fence (whose twin carries it). Headings are slugged in document order as Astro does.
 */
export async function twinPills(route: string, body: string): Promise<string> {
  const rows = Object.entries(apiPages()).filter(([, r]) => r.page === route && !r.generated);
  if (!rows.length) return body;
  const bySlug = new Map(rows.map(([id, r]) => [r.slug, operation(id)]));
  const { default: Slugger } = await import("github-slugger");
  const slugger = new Slugger();
  const lines = body.split("\n");
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) fence = !fence;
    const h = !fence && lines[i].match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (!h) continue;
    const slug = slugger.slug(h[2].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, ""));
    const op = h[1] === "##" ? bySlug.get(slug) : undefined;
    if (!op) continue;
    const pill = `\`${op.method.toUpperCase()} ${op.path}\``;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (lines[j]?.startsWith(pill) || /^```endpoint/.test(lines[j] ?? "")) continue;
    lines.splice(i + 1, 0, "", pill);
  }
  return lines.join("\n");
}
