import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { HUBS, START_CLI, START_EMBED } from "../config/hubs";
import { agentFacts } from "../config/agent-facts";
import { SECTIONS } from "../config/nav.ts";
import { SECTION_ORDER, inSidebarOrder } from "../lib/sidebar-order";

// /llms.txt — the llmstxt.org index for LLMs / AI agents: a short orientation,
// the corrections an agent needs before its first call, one runnable block per
// surface, the machine-readable entry points, then every page in sidebar order,
// each line written from that page's own frontmatter (title + description), and
// the hub pages from src/config/hubs.ts, the one record their own <meta
// description> is rendered from. No fact appears here that a page does not
// own — this file used to state a tool count, a wheel extra and a frame rate
// the pages contradicted, and an agent reads only this file. The two samples
// are imported, not retyped, so they are byte-identical to the ones /start
// renders. Companion: /llms-full.txt (the whole corpus).
//
// ★ORDER MATTERS FOR THE GATE: scripts/check-discoverability.mjs reads the page
// list from "## Site sections" onward and requires every docs.bithuman.ai bullet
// after that point to be a content page or a built route. Hand-written links
// (Start here, Machine-readable, the facts block) must stay ABOVE that heading.

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

  out += agentFacts(SITE);

  out += `## Start here\n\n`;
  out += `- **Embed a hosted agent** — an \`<iframe>\` and no API key: [API quickstart](${SITE}/api/quickstart).\n`;
  out += `- **Browser, nothing installed** — any showcase avatar from one URL or one iframe: [Web](${SITE}/sdk/web).\n`;
  out += `- **Cloud REST API** — the \`api-secret\` header against \`https://api.bithuman.ai\`: [API overview](${SITE}/api/overview).\n`;
  out += `- **Python** — a venv, \`pip install bithuman\`, then open an avatar and take frames: [Python SDK](${SITE}/sdk/python).\n`;
  out += `- **CLI** — one binary for macOS Apple Silicon and Linux x86_64; a live avatar in the browser or an MP4 render: [CLI](${SITE}/sdk/cli) and the [CLI reference](${SITE}/sdk/cli/reference).\n`;
  out += `- **Android and Apple** — [Android SDK](${SITE}/sdk/android), [Apple SDK — iOS, iPadOS and macOS](${SITE}/sdk/ios).\n`;
  out += `- **LiveKit** — a Python voice agent with a face, or a native app reaching a server-hosted avatar over WebRTC: [LiveKit integration](${SITE}/sdk/livekit).\n`;
  out += `- **MCP server (for AI agents)** — the CLI's \`bithuman mcp\` exposes the platform as Model Context Protocol tools: [MCP server](${SITE}/guides/mcp-server).\n\n`;

  out += `## Copy and run\n\n`;
  out += `The two samples [/start](${SITE}/start) prints, byte for byte.\n\n`;
  out += `Embed a hosted agent — paste into any page; no API key, no install, no account:\n\n`;
  out += `\`\`\`html\n${START_EMBED}\n\`\`\`\n\n`;
  out += `Run one on your own machine with the CLI (macOS Apple Silicon or Linux x86_64):\n\n`;
  out += `\`\`\`bash\n${START_CLI}\n\`\`\`\n\n`;
  out +=
    `Step 2 is not optional: \`list\`, \`pull\` and \`open\` are anonymous, but ` +
    `\`run\` and \`render\` stop before the first frame with exit 77 until you sign ` +
    `in or export \`BITHUMAN_API_SECRET\`.\n\n`;

  out += `## Machine-readable\n\n`;
  out += `- [OpenAPI spec](${SITE}/api/openapi.yaml): the REST contract (YAML). Endpoint groups documented only in the pages, not the spec: [API keys](${SITE}/api/api-keys), [knowledge](${SITE}/api/knowledge), [organizations](${SITE}/api/organizations), [providers](${SITE}/api/providers), [runtime sessions](${SITE}/api/runtime-sessions).\n`;
  out += `- [Interactive API console](${SITE}/api/reference): every endpoint in the spec, with try-it-out.\n`;
  out += `- [Showcase manifest](https://api.bithuman.ai/v1/models/showcase): the avatars anyone can pull, as JSON — slug, \`agent_code\`, model, size and download URL. Served with no credential; this is the list to resolve a slug against.\n`;
  out += `- [llms-full.txt](${SITE}/llms-full.txt): the entire documentation as one file, for ingestion.\n`;
  out += `- [Sitemap](${SITE}/sitemap.xml): every URL with its last-modified date.\n\n`;

  out += `## Site sections\n\n`;
  for (const h of HUBS) out += `- [${h.name}](${SITE}/${h.route}): ${h.description}\n`;
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
