import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

// /llms-full.txt — the entire documentation corpus concatenated into one
// plain-text file, ordered by pillar. For AI agents that want to ingest
// everything in a single fetch. Curated index lives at /llms.txt.

export const prerender = true;

const SITE = "https://docs.bithuman.ai";
const ORDER = ["api", "sdk", "concepts", "guides", "examples", "resources"];

export const GET: APIRoute = async () => {
  const docs = await getCollection("docs", (e: any) => !e.data.draft);
  docs.sort(
    (a: any, b: any) =>
      ORDER.indexOf(a.data.section) - ORDER.indexOf(b.data.section) ||
      (a.data.order ?? 100) - (b.data.order ?? 100),
  );

  let out = `# bitHuman — full documentation\n\n`;
  out +=
    `> Real-time, lip-synced AI avatar platform. Push 16-bit PCM audio in, ` +
    `drain 25 FPS lip-synced video frames out — on-device (macOS/Linux/iOS) ` +
    `or via a cloud REST API. This file concatenates the entire docs ` +
    `site for ingestion. Curated index: ${SITE}/llms.txt · OpenAPI: ${SITE}/api/openapi.yaml\n`;

  for (const d of docs) {
    out += `\n\n---\n\n# ${d.data.title}\n\nURL: ${SITE}/${d.id}\n\n${d.body ?? ""}\n`;
  }

  return new Response(out, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
