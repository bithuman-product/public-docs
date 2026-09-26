import type { APIRoute } from "astro";
import { agentFacts } from "../config/agent-facts";
import { PLATFORMS } from "../data/platforms";
import headline from "../partials/performance-headline.md?raw";
import { existsSync } from "node:fs";
import { getCollection } from "astro:content";
import { inSidebarOrder } from "../lib/sidebar-order";
import { LLMS_SECTIONS, FULL_SCOPE, sectionUrl } from "../lib/llms-sections";

// /llms.txt — the short index for AI agents (llmstxt.org): what bitHuman is,
// the key facts, one command per path, the performance headline, and where the
// markdown lives (the one-fetch file and the per-section files). Generated from versions.json, platforms.ts and the
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
  // The performance sub-pages, from the collection, in sidebar order, on the same line.
  const perf = inSidebarOrder(await getCollection("docs", (e: any) => !e.data.draft && e.data.section === "performance"))
    .filter((d: any) => d.id !== "performance");
  out += `Every platform: ${SITE}/performance.md${existsSync("public/performance.json") ? ` · data: ${SITE}/performance.json` : ""}`;
  if (perf.length) out += ` · by platform: ${perf.map((d: any) => `${d.data.label ?? d.data.title} ${SITE}/${d.id}.md`).join(" · ")}`;
  out += `\n\n`;

  out += `## Docs (markdown)\n\n`;
  out += `- Hubs: ${["start", "api", "sdk", "guides", "examples", "changelog"].map((h) => `${SITE}/${h}.md`).join(" · ")}\n`;
  out += `- For AI agents (files, MCP, rules): ${SITE}/resources/agents.md · OpenAPI: ${SITE}/api/openapi.yaml\n`;
  const rest = LLMS_SECTIONS.filter((s) => !s.inFull);
  out += `- Full text in one fetch (${FULL_SCOPE}): ${SITE}/llms-full.txt\n`;
  out += `- By section: ${LLMS_SECTIONS.map((s) => sectionUrl(s.id)).join(" · ")} (${rest.map((s) => `${s.id}: ${s.summary}`).join("; ")})\n`;

  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
