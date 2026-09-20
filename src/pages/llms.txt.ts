import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { sitemapEntries } from "../lib/sitemap";
import { SECTIONS } from "../config/nav.ts";
import { SECTION_ORDER, inSidebarOrder } from "../lib/sidebar-order";

// /llms.txt — the llmstxt.org index for LLMs / AI agents: a short orientation,
// the machine-readable entry points, then every page in sidebar order, each
// line written from that page's own frontmatter (title + description). No
// fact appears here that a page does not own — this file used to state a tool
// count, a wheel extra and a frame rate the pages contradicted, and an agent
// reads only this file. Companion: /llms-full.txt (the whole corpus).

export const prerender = true;

const SITE = "https://docs.bithuman.ai";

export const GET: APIRoute = async () => {
  const docs = inSidebarOrder(await getCollection("docs", (e: any) => !e.data.draft));

  let out = `# bitHuman\n\n`;
  out +=
    `> bitHuman turns audio into a real-time, lip-synced talking avatar. Two ` +
    `second-generation models — Essence 2 (photoreal, from one portrait) and ` +
    `Expression 2 (stylized characters and creatures) — plus the maintained ` +
    `first generation, Essence 1 and Expression 1. Run them over the cloud REST ` +
    `API, on your own hardware with the CLI, the Python package, the Android ` +
    `and Apple SDKs, or in a browser tab through the hosted viewer. The contract ` +
    `is the same everywhere: push 16-bit PCM audio in, drain lip-synced video ` +
    `frames out. An avatar is one downloadable model file (\`.imx\`, or ` +
    `\`.avatar\` for Expression 2) keyed by a short agent code such as ` +
    `\`A78WKV4515\`. Which model runs where, and what each costs, is on the ` +
    `pages below — this file only points at them.\n\n`;

  out += `## Start here\n\n`;
  out += `- **Embed a hosted agent** — an \`<iframe>\` and no API key: [API quickstart](${SITE}/api/quickstart).\n`;
  out += `- **Cloud REST API** — the \`api-secret\` header against \`https://api.bithuman.ai\`: [API overview](${SITE}/api/overview).\n`;
  out += `- **Python** — \`pip install bithuman\`, then open an avatar and take frames: [Python SDK](${SITE}/sdk/python).\n`;
  out += `- **CLI** — one binary for macOS Apple Silicon and Linux x86_64; a live avatar in the browser or an MP4 render: [CLI](${SITE}/sdk/cli) and the [CLI reference](${SITE}/sdk/cli/reference).\n`;
  out += `- **Android and Apple** — [Android SDK](${SITE}/sdk/android), [iOS & iPadOS SDK](${SITE}/sdk/ios).\n`;
  out += `- **MCP server (for AI agents)** — the CLI's \`bithuman mcp\` exposes the platform as Model Context Protocol tools: [MCP server](${SITE}/guides/mcp-server).\n\n`;

  out += `## Machine-readable\n\n`;
  out += `- [OpenAPI spec](${SITE}/api/openapi.yaml): the REST contract (YAML). Endpoint groups documented only in the pages, not the spec: [API keys](${SITE}/api/api-keys), [knowledge](${SITE}/api/knowledge), [organizations](${SITE}/api/organizations), [providers](${SITE}/api/providers), [runtime sessions](${SITE}/api/runtime-sessions).\n`;
  out += `- [Interactive API console](${SITE}/api/reference): every endpoint in the spec, with try-it-out.\n`;
  out += `- [llms-full.txt](${SITE}/llms-full.txt): the entire documentation as one file, for ingestion.\n`;
  out += `- [Sitemap](${SITE}/sitemap.xml): every URL with its last-modified date.\n\n`;

  out += `## Site sections\n\n`;
  const staticLocs = (await sitemapEntries()).filter((e) => !docs.some((d: any) => `${SITE}/${d.id}` === e.loc));
  for (const e of staticLocs) out += `- ${e.loc}\n`;
  out += `\n`;

  for (const sec of SECTION_ORDER) {
    const items = docs.filter((d: any) => d.data.section === sec);
    if (!items.length) continue;
    out += `## ${SECTIONS[sec].label}\n\n`;
    for (const d of items) {
      const desc = d.data.description ? `: ${d.data.description}` : "";
      out += `- [${d.data.title}](${SITE}/${d.id})${desc}\n`;
    }
    out += `\n`;
  }

  return new Response(out, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
