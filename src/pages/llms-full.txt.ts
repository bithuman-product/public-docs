import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SECTION_ORDER, inSidebarOrder } from "../lib/sidebar-order";
import { HUBS, START_CLI, START_EMBED } from "../config/hubs";
import { agentFacts } from "../config/agent-facts";

// /llms-full.txt — every page in one file, in sidebar order, for AI agents
// that ingest everything in a single fetch: the hub pages first (home, /start
// with the two samples it prints, then each section's hub ahead of that
// section's pages), then every content page's full Markdown. Site-relative
// links become absolute so a reader of this file can follow them; fenced code
// is left byte-for-byte. The index lives at /llms.txt.
//
// The "what to get right first" block opens this file too (src/config/agent-facts.ts):
// an agent that ingests the corpus in one fetch never opens /llms.txt, so the
// corrections it needs before its first call have to be in both.

export const prerender = true;

const SITE = "https://docs.bithuman.ai";

/** `](/path)` → `](https://docs.bithuman.ai/path)` outside fenced code. */
function absolutize(md: string): string {
  return md
    .split(/(^```[\s\S]*?^```[ \t]*$)/m)
    .map((part, i) => (i % 2 ? part : part.replace(/\]\(\/(?!\/)/g, `](${SITE}/`)))
    .join("");
}

export const GET: APIRoute = async () => {
  const docs = inSidebarOrder(await getCollection("docs", (e: any) => !e.data.draft));

  let out = `# bitHuman — full documentation\n\n`;
  out +=
    `> Every page of ${SITE}, in the order the site's sidebar shows them. ` +
    `Each section starts with the page title and its URL. ` +
    `Index: ${SITE}/llms.txt · OpenAPI: ${SITE}/api/openapi.yaml\n`;
  out += `\n${agentFacts(SITE)}`;

  const hub = (route: string, body = "") => {
    const h = HUBS.find((x) => x.route === route);
    if (!h) return;
    out += `\n\n---\n\n# ${h.name}\n\nURL: ${SITE}/${h.route}\n\n${h.description}\n`;
    if (body) out += `\n${body}\n`;
  };
  const listing = (items: any[]) =>
    items.map((d) => `- [${d.data.title}](${SITE}/${d.id})${d.data.description ? `: ${d.data.description}` : ""}`).join("\n");

  hub("");
  hub(
    "start",
    `See a live agent with no setup, then choose how you run your own — the cloud REST API, ` +
      `or the SDKs and CLI on your own hardware.\n\n` +
      `Embed an agent — paste into any page, no API key, no install:\n\n\`\`\`html\n${START_EMBED}\n\`\`\`\n\n` +
      `Run locally with the CLI — four lines to a talking avatar in your browser ` +
      `(step 2, \`bithuman login\`, is required: without a credential \`run\` and \`render\` ` +
      `stop before the first frame, exit 77; only a showcase \`pull\` is anonymous):\n\n\`\`\`bash\n${START_CLI}\n\`\`\``,
  );
  hub("showcase");

  for (const sec of SECTION_ORDER) {
    const items = docs.filter((d: any) => d.data.section === sec);
    const h = HUBS.find((x) => x.section === sec);
    if (h) hub(h.route, `Pages in this section:\n\n${listing(items)}`);
    if (sec === "api") hub("api/reference", `The OpenAPI document it renders: ${SITE}/api/openapi.yaml`);
    for (const d of items) {
      out += `\n\n---\n\n# ${d.data.title}\n\nURL: ${SITE}/${d.id}\n\n`;
      if (d.data.description) out += `${d.data.description}\n\n`;
      out += `${absolutize(d.body ?? "")}\n`;
    }
  }

  return new Response(out, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
