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
    `> Private, on-device, real-time lip-synced AI avatar platform. Push ` +
    `16-bit PCM audio in, drain 25 FPS lip-synced video frames out — fully ` +
    `on-device (macOS/Linux/iOS, CPU incl. Raspberry Pi, NVIDIA GPU, or ` +
    `Apple Silicon) or via a cloud REST API. Private by design: audio, ` +
    `video, and prompts never leave your hardware; the only network call is ` +
    `a ~1-request-per-minute billing heartbeat, so it self-hosts on-prem or ` +
    `runs fully air-gapped, at low per-minute cost. Models (second ` +
    `generation, launching July 10, 2026): \`expression-2\` (audio-driven real-time ` +
    `avatar video from a single photo — best for cartoon/animal/creature/robot ` +
    `characters; gpu/ane/cpu chain), \`essence-2\` (photorealistic humans; ` +
    `gpu/ane/cpu chain incl. on-device — the former essence-2-light name is ` +
    `retired), \`essence-2-quality\` (highest-fidelity GPU reference tier), ` +
    `plus \`essence-1\` / \`expression-1\`. This file concatenates ` +
    `the entire docs site for ingestion. Curated index: ${SITE}/llms.txt · OpenAPI: ${SITE}/api/openapi.yaml\n`;

  for (const d of docs) {
    out += `\n\n---\n\n# ${d.data.title}\n\nURL: ${SITE}/${d.id}\n\n${d.body ?? ""}\n`;
  }

  return new Response(out, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
