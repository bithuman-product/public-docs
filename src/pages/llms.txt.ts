import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

// /llms.txt — the llmstxt.org curated index for LLMs / AI agents. A tight
// orientation blurb + the machine-readable entry points + every doc page
// grouped by pillar. Auto-generated from the `docs` content collection so it
// never drifts. Companion: /llms-full.txt (the whole corpus in one file).

export const prerender = true;

const SITE = "https://docs.bithuman.ai";

const SECTIONS: [string, string][] = [
  ["api", "API (cloud REST)"],
  ["cli", "CLI"],
  ["sdk", "SDKs"],
  ["concepts", "Concepts"],
  ["guides", "Guides"],
  ["examples", "Examples"],
  ["resources", "Resources"],
];

export const GET: APIRoute = async () => {
  const docs = await getCollection("docs", (e: any) => !e.data.draft);

  let out = `# bitHuman\n\n`;
  out +=
    `> bitHuman is a real-time, lip-synced AI avatar platform. One engine ` +
    `(\`libessence\`) turns audio into a talking avatar at 25 FPS — fully ` +
    `on-device (macOS/Linux/iOS/Android, CPU or GPU) or via a cloud REST API. ` +
    `The contract is the same everywhere: push 16-bit PCM audio in, drain ` +
    `lip-synced video frames out. Avatars are portable \`.imx\` files keyed by ` +
    `a short agent code (e.g. \`A78WKV4515\`).\n\n`;

  out += `## Start here (fastest paths)\n\n`;
  out +=
    `- **Embed a hosted agent** — no API key: an \`<iframe>\` to ` +
    `\`https://bithuman.ai/embed/<agent_code>\` is live and talking. See [API quickstart](${SITE}/api/quickstart).\n`;
  out +=
    `- **Cloud REST API** — authenticate with the \`api-secret\` header against ` +
    `\`https://api.bithuman.ai\`. Cheapest check: \`POST /v1/validate\`. Text-to-speech, agents, embedding, dynamics.\n`;
  out +=
    `- **On-device Python SDK** — \`pip install bithuman\` (macOS arm64 + Linux x86_64/aarch64), then \`AsyncBithuman.create(model_path=…)\` → \`push_audio\` / \`flush\` / \`run\`.\n`;
  out +=
    `- **CLI** — \`brew install bithuman-product/bithuman/bithuman-cli\` (macOS) or the universal installer (Linux); \`bithuman run <model.imx>\` serves a live browser avatar.\n\n`;

  out +=
    `- **MCP server (for AI agents)** — drive bitHuman from any Model Context ` +
    `Protocol client (Claude Desktop/Code, Cursor): 21 tools wrapping the REST ` +
    `API. See [MCP server](${SITE}/guides/mcp-server).\n\n`;

  out += `## Machine-readable\n\n`;
  out += `- [OpenAPI spec](${SITE}/api/openapi.yaml): the full REST contract (YAML).\n`;
  out += `- [Interactive API console](${SITE}/api/reference): try every endpoint live.\n`;
  out += `- [llms-full.txt](${SITE}/llms-full.txt): the entire documentation as one file, for ingestion.\n\n`;

  for (const [sec, label] of SECTIONS) {
    const items = docs
      .filter((d: any) => d.data.section === sec)
      .sort((a: any, b: any) => (a.data.order ?? 100) - (b.data.order ?? 100));
    if (!items.length) continue;
    out += `## ${label}\n\n`;
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
