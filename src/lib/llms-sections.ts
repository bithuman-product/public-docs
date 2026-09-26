import { getCollection } from "astro:content";
import { inSidebarOrder } from "./sidebar-order";
import { agentFacts } from "../config/agent-facts";
import { twin, SITE } from "./markdown-twin";
import { PLATFORMS } from "../data/platforms";

// The agent text, split by section. /llms-full.txt and every /llms/<section>.txt
// are built from these definitions, so a page is inlined in exactly one section
// and the one-file text and the section files cannot disagree.
//
//   /llms/start.txt   choose your path, the API secret, the performance overview
//   /llms/api.txt     the REST API
//   /llms/sdk.txt     every platform page (CLI, Python, Apple, Android, Web, LiveKit, MCP)
//   /llms/guides.txt  models, pricing, self-hosting, avatars and the other guides
//   /llms-full.txt    start + api + sdk in one fetch; guides are linked
//
// scripts/check-llms.mjs caps each file and fails when a page is in no section
// (and not linked-only) or in two, so no page can drop out of the agent layer.

// Account administration, less-used endpoints, first-generation concepts and the
// per-platform performance sub-pages are linked with their .md twins rather than
// inlined, to keep each file one fetch for an agent.
export const LINKED_ONLY = new Set([
  "api/api-keys", "api/organizations", "api/runtime-sessions", "api/billing",
  "api/dynamics", "api/files", "api/knowledge", "api/providers", "api/webhooks",
  "concepts/essence-1", "concepts/expression-1", "concepts/avatars-imx",
  "guides/local-voice-avatar",
  // The performance overview carries every row; these sub-pages repeat them per platform.
  "performance/cloud", "performance/desktop", "performance/mobile", "performance/web",
  "performance/method",
]);

export interface LlmsSection {
  id: "start" | "api" | "sdk" | "guides";
  title: string;
  /** One line on what the file holds, shown in every index. */
  summary: string;
  /** Inlined in /llms-full.txt as well as its own file. */
  inFull: boolean;
  has: (d: any) => boolean;
}

export const LLMS_SECTIONS: LlmsSection[] = [
  {
    id: "start", title: "Get started", inFull: true,
    summary: "choose your path, your API secret, performance",
    has: (d) => d.data.section === "start" || d.data.section === "performance",
  },
  {
    id: "api", title: "REST API", inFull: true,
    summary: "agents, realtime, video, voice, embedding, errors, rate limits",
    has: (d) => d.data.section === "api",
  },
  {
    id: "sdk", title: "Platforms", inFull: true,
    summary: "CLI, Python, Apple, Android, Web, LiveKit, MCP",
    has: (d) => d.data.section === "sdk" && (d.data.type === "platform" || d.data.type === "guide"),
  },
  {
    id: "guides", title: "Guides", inFull: false,
    summary: "models, pricing, self-hosting, building avatars, personas, voices",
    has: (d) => d.data.section === "guides",
  },
];

export const sectionUrl = (id: string) => `${SITE}/llms/${id}.txt`;

/** What /llms-full.txt inlines, in words (the sections marked inFull). */
export const FULL_SCOPE = "getting started, the REST API and every platform page";

/** The pages a section inlines, in sidebar order. */
export async function sectionDocs(s: LlmsSection): Promise<any[]> {
  const docs = await getCollection("docs", (e: any) => !e.data.draft && !LINKED_ONLY.has(e.id));
  return inSidebarOrder(docs.filter(s.has));
}

/** The linked-only pages that belong to a section (read their .md twins). */
export async function sectionLinked(s: LlmsSection): Promise<any[]> {
  const docs = await getCollection("docs", (e: any) => !e.data.draft && LINKED_ONLY.has(e.id));
  return inSidebarOrder(docs.filter(s.has));
}

function choosePath(): string {
  // The same content as /start.md: the path table, then each runnable card.
  let out = `# Get started\n\nURL: ${SITE}/start\n\n## Choose your path\n\n`;
  out += "| You want to… | Use | Needs | First command |\n|---|---|---|---|\n";
  for (const p of PLATFORMS) out += `| ${p.want} | ${p.use} | ${p.needs} | ${p.id === "offline" ? "— ([contact sales](https://www.bithuman.ai/sales))" : "`" + p.first.replace(/\|/g, "\\|") + "`"} |\n`;
  out += `\n## Run it\n`;
  for (const p of PLATFORMS.filter((x) => x.card)) out += `\n### ${p.want}: ${p.use}\n\n\`\`\`${p.card!.lang}\n${p.card!.code}\n\`\`\`\n\nExpected: ${p.card!.expect}\n`;
  return out;
}

/** A section's pages as markdown, each after a `---` rule. */
export async function sectionBody(s: LlmsSection): Promise<string> {
  let out = "";
  if (s.id === "start") out += `\n---\n\n${choosePath()}`;
  for (const d of await sectionDocs(s)) out += `\n---\n\n${twin(d.data.title, `/${d.id}`, d.data.description, d.body ?? "")}`;
  return out;
}

/** Where the rest of the documentation is, for the foot of a contents list. */
async function linkedLines(sections: LlmsSection[]): Promise<string> {
  let out = "";
  for (const s of sections) for (const d of await sectionLinked(s)) out += `- ${d.data.title} — ${SITE}/${d.id}.md\n`;
  out += `- Examples: ${SITE}/examples.md · changelog: ${SITE}/changelog.md · API references: ${SITE}/sdk/cli/reference.md, ${SITE}/sdk/python-api.md, ${SITE}/sdk/apple-api.md, ${SITE}/sdk/android-api.md\n`;
  return out;
}

const INTRO = `Realtime talking avatars from one portrait. Index: ${SITE}/llms.txt · every page is also served as markdown at <url>.md · OpenAPI: ${SITE}/api/openapi.yaml`;

/** The section files an index lists: one line each. */
export function sectionIndex(): string {
  return LLMS_SECTIONS.map((s) => `- ${s.title} (${s.summary}): ${sectionUrl(s.id)}`).join("\n") + "\n";
}

/** /llms/<id>.txt — one section, standalone: the key facts, its contents, its pages. */
export async function sectionFile(s: LlmsSection): Promise<string> {
  let out = `# bitHuman — ${s.title} (${s.summary})\n\n> ${INTRO} · other sections: ${
    LLMS_SECTIONS.filter((o) => o.id !== s.id).map((o) => sectionUrl(o.id)).join(" · ")}\n\n`;
  out += agentFacts(SITE);
  out += `## Contents\n\n`;
  if (s.id === "start") out += `- Choose your path — ${SITE}/start\n`;
  for (const d of await sectionDocs(s)) out += `- ${d.data.title} — ${SITE}/${d.id}\n`;
  const linked = await linkedLines([s]);
  out += `\nLinked, not inlined (read the .md twin):\n${linked}`;
  return out + (await sectionBody(s));
}

/** /llms-full.txt — the sections marked inFull in one fetch; the rest are linked. */
export async function fullFile(): Promise<string> {
  const inFull = LLMS_SECTIONS.filter((s) => s.inFull);
  const out_ = LLMS_SECTIONS.filter((s) => !s.inFull);
  let out = `# bitHuman — documentation for agents\n\n> ${INTRO}\n\n`;
  out += agentFacts(SITE);
  out += `## Contents\n\n`;
  out += `This file inlines ${FULL_SCOPE}. The same text by section, and the sections not inlined here:\n\n${sectionIndex()}\n`;
  for (const s of inFull) {
    if (s.id === "start") out += `- Choose your path — ${SITE}/start\n`;
    for (const d of await sectionDocs(s)) out += `- ${d.data.title} — ${SITE}/${d.id}\n`;
  }
  out += `\nIn ${out_.map((s) => sectionUrl(s.id)).join(", ")} (or read the .md twin):\n`;
  for (const s of out_) for (const d of await sectionDocs(s)) out += `- ${d.data.title} — ${SITE}/${d.id}.md\n`;
  out += `\nLinked, not inlined (read the .md twin):\n${await linkedLines(LLMS_SECTIONS)}`;
  for (const s of inFull) out += await sectionBody(s);
  return out;
}
