import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { inSidebarOrder } from "../lib/sidebar-order";
import { agentFacts } from "../config/agent-facts";
import { twin, SITE } from "../lib/markdown-twin";
import { PLATFORMS } from "../data/platforms";

// /llms-full.txt — the documentation an agent needs in one fetch: getting
// started, the API, every platform page, the guides and the performance
// tables. Examples, the changelog, legal pages and the generated API
// references are linked, not inlined (each has its own .md twin). A table of
// contents comes first. scripts/check-llms.mjs caps the file (CI: --full-max-kb).

export const prerender = true;

// Account administration, less-used endpoints and first-generation concepts are
// linked from the contents with their .md twins rather than inlined, to keep
// the file one fetch for an agent.
const LINKED_ONLY = new Set([
  "api/api-keys", "api/organizations", "api/runtime-sessions", "api/billing",
  "api/dynamics", "api/files", "api/knowledge", "api/providers", "api/webhooks",
  "concepts/essence-1", "concepts/expression-1", "concepts/avatars-imx",
]);

const included = (d: any) => {
  if (LINKED_ONLY.has(d.id)) return false;
  const { section, type } = d.data;
  if (section === "start" || section === "api" || section === "performance") return true;
  if (section === "sdk") return type === "platform" || type === "guide";
  if (section === "guides") return true;
  return false;
};

export const GET: APIRoute = async () => {
  const docs = inSidebarOrder(await getCollection("docs", (e: any) => !e.data.draft)).filter(included);

  let out = `# bitHuman — documentation for agents\n\n`;
  out += `> Realtime talking avatars from one portrait. Index: ${SITE}/llms.txt · every page is also served as markdown at <url>.md · OpenAPI: ${SITE}/api/openapi.yaml\n\n`;
  out += agentFacts(SITE);

  out += `## Contents\n\n`;
  out += `- Choose your path — ${SITE}/start\n`;
  for (const d of docs) out += `- ${d.data.title} — ${SITE}/${d.id}\n`;
  const linked = inSidebarOrder(await getCollection("docs", (e: any) => !e.data.draft && LINKED_ONLY.has(e.id)));
  out += `\nLinked, not inlined (read the .md twin):\n`;
  for (const d of linked) out += `- ${d.data.title} — ${SITE}/${d.id}.md\n`;
  out += `- Examples: ${SITE}/examples.md · changelog: ${SITE}/changelog.md · API references: ${SITE}/sdk/cli/reference.md, ${SITE}/sdk/python-api.md, ${SITE}/sdk/apple-api.md, ${SITE}/sdk/android-api.md\n`;

  out += `\n---\n\n# Choose your path\n\nURL: ${SITE}/start\n\n`;
  out += "| You want to… | Use | Needs | First command |\n|---|---|---|---|\n";
  for (const p of PLATFORMS) out += `| ${p.want} | ${p.use} | ${p.needs} | \`${p.first.replace(/\|/g, "\\|")}\` |\n`;

  for (const d of docs) out += `\n---\n\n${twin(d.data.title, `/${d.id}`, d.data.description, d.body ?? "")}`;

  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
