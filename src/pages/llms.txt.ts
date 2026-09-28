import type { APIRoute } from "astro";
import { agentInstructions, agentWhere, agentKeyFacts } from "../config/agent-facts";
import { PLATFORMS } from "../data/platforms";
import { PERF_BAND } from "../data/perf-band";
import { perfCell, perfRow, noGpu } from "../lib/perf";
import { LLMS_SECTIONS, sectionUrl } from "../lib/llms-sections";
import { SKILL_PATH, MCP_PATH } from "../lib/agent-layer";

// /llms.txt — the short index for AI agents (llmstxt.org): what bitHuman is,
// the rules an agent follows, where each model runs, the key facts, one command
// per path, speed as × real time (from performance.json), and where the
// markdown lives. Nothing is typed twice: versions.json, platforms.ts,
// performance.json and the offline copy feed it. scripts/check-llms.mjs caps it
// at 60 lines and 6 KB, checks every URL, and asserts the opener (no fps in the
// first 1,000 characters, the instructions heading, the approved offline copy).

export const prerender = true;
const SITE = "https://docs.bithuman.ai";

export const GET: APIRoute = async () => {
  let out = `# bitHuman\n\n`;
  out +=
    `> Realtime talking avatars from one portrait. Essence 2 renders a photoreal person; Expression 2 renders any character. ` +
    `They render on the device (iPhone, iPad, Mac, Android arm64, a Linux PC with no GPU, a WebGPU browser) or in the bitHuman cloud. ` +
    `Every published configuration is measured faster than real time: ${SITE}/performance\n\n`;
  out += agentInstructions(SITE) + agentWhere(SITE) + agentKeyFacts(SITE);

  out += `## Start: one command per path\n\n`;
  for (const p of PLATFORMS) {
    if (p.id === "offline" || p.id === "web") continue;
    out += `- ${p.use}: \`${p.first}\` · ${SITE}${p.docs.split("#")[0]}.md\n`;
  }
  out += `- Web embed: an iframe of https://www.bithuman.ai/embed/<agent code> with allow="microphone *", or a widget; no npm package · ${SITE}/platforms/web.md\n\n`;

  // Speed as times real time, on-device first, from the same rows as the home band.
  const where = (f: (typeof PERF_BAND)[number]) =>
    `${perfRow(f.row).hardware}${f.device === "browser" ? " (WebGPU)" : noGpu(f.row) ? " (no GPU)" : f.device === "cloud" ? " (bitHuman cloud)" : ""}`;
  out += `## Speed (× real time; 1.0× or more holds a live conversation)\n\n| Where | Essence 2 | Expression 2 |\n|---|---|---|\n`;
  for (const f of PERF_BAND) {
    const cell = (m: "essence-2" | "expression-2") => perfCell(f.row, m)?.x ?? "—";
    out += `| ${where(f)} | ${cell("essence-2")} | ${cell("expression-2")} |\n`;
  }
  out += `\n## Docs (markdown)\n\n`;
  out += `- Any page as markdown: add \`.md\` to its URL or send \`Accept: text/markdown\`. Speed: ${SITE}/performance/method.md\n`;
  out += `- By section: ${LLMS_SECTIONS.map((s) => sectionUrl(s.id)).join(" · ")} · start, platforms and api in one fetch: ${SITE}/llms-full.txt\n`;
  out += `- Docs MCP server: ${SITE}${MCP_PATH} · agent skill: ${SITE}${SKILL_PATH} · ${SITE}/resources/agents.md\n`;
  out += `- OpenAPI: ${SITE}/api/openapi.yaml · changelog: ${SITE}/changelog.md\n`;

  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
