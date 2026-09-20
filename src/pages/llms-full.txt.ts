import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { inSidebarOrder } from "../lib/sidebar-order";

// /llms-full.txt — every page's full Markdown in one file, in sidebar order,
// for AI agents that ingest everything in a single fetch. Site-relative links
// become absolute so a reader of this file can follow them; fenced code is
// left byte-for-byte. The index lives at /llms.txt.

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

  for (const d of docs) {
    out += `\n\n---\n\n# ${d.data.title}\n\nURL: ${SITE}/${d.id}\n\n`;
    if (d.data.description) out += `${d.data.description}\n\n`;
    out += `${absolutize(d.body ?? "")}\n`;
  }

  return new Response(out, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
