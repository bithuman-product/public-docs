import type { APIRoute } from "astro";
import { agentFacts } from "../config/agent-facts";
import { PLATFORMS } from "../data/platforms";
import headline from "../partials/performance-headline.md?raw";
import { existsSync } from "node:fs";
import { getCollection } from "astro:content";
import { inSidebarOrder } from "../lib/sidebar-order";

// /llms.txt — the short index for AI agents (llmstxt.org): what bitHuman is,
// the key facts, one command per path, the performance headline, and where the
// markdown lives. Generated from versions.json, platforms.ts and the
// performance emitter's headline; scripts/check-llms.mjs caps it at 60 lines
// and 6 KB and checks every URL in it.

export const prerender = true;
const SITE = "https://docs.bithuman.ai";

export const GET: APIRoute = async () => {
  let out = `# bitHuman\n\n`;
  out +=
    `> Realtime talking avatars from one portrait. Essence 2 renders a photoreal person (up to 1920x1080, 25 fps); ` +
    `Expression 2 renders any character (416x720, 20 fps). Run them from the cloud API, a web embed, the CLI, Python, ` +
    `Apple and Android apps, LiveKit agents, or an MCP client.\n\n`;
  out += agentFacts(SITE);

  out += `## Start: one command per path\n\n`;
  for (const p of PLATFORMS) {
    if (p.id === "offline") continue;
    out += `- ${p.use}: \`${p.first}\` · ${SITE}${p.docs.split("#")[0]}.md\n`;
  }
  out += `\n`;

  const table = headline.replace(/<!--[\s\S]*?-->/g, "").trim();
  out += `## Performance\n\n`;
  if (table) out += `${table.replace(/\]\(\//g, `](${SITE}/`)}\n\n`;
  out += `Every platform: ${SITE}/performance.md${existsSync("public/performance.json") ? ` · data: ${SITE}/performance.json` : ""}\n`;
  // The performance sub-pages, from the collection, in sidebar order.
  const perf = inSidebarOrder(await getCollection("docs", (e: any) => !e.data.draft && e.data.section === "performance"))
    .filter((d: any) => d.id !== "performance");
  if (perf.length) out += `By platform: ${perf.map((d: any) => `${d.data.label ?? d.data.title} ${SITE}/${d.id}.md`).join(" · ")}\n`;
  out += `\n`;

  out += `## Docs (markdown)\n\n`;
  out += `- Get started: ${SITE}/start.md\n`;
  out += `- API (endpoint index): ${SITE}/api.md · OpenAPI: ${SITE}/api/openapi.yaml\n`;
  out += `- SDKs: ${SITE}/sdk.md\n`;
  out += `- Guides: ${SITE}/guides.md\n`;
  out += `- Examples: ${SITE}/examples.md\n`;
  out += `- For AI agents (files, MCP, rules): ${SITE}/resources/agents.md\n`;
  out += `- Changelog: ${SITE}/changelog.md\n`;
  out += `- Everything in one file: ${SITE}/llms-full.txt\n`;

  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
