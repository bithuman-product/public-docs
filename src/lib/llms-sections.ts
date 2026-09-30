import { getCollection } from "astro:content";
import { inSidebarOrder } from "./sidebar-order";
import { agentFacts, agentInstructions } from "../config/agent-facts";
import { twin, SITE } from "./markdown-twin";
import { PLATFORMS } from "../data/platforms";
import { contactSalesUrl } from "../config/nav";

// The agent text, split by section. /llms-full.txt and every /llms/<section>.txt
// are built from these definitions, so a page is inlined in exactly one section
// and the one-file text and the section files cannot disagree.
//
//   /llms/start.txt      the quickstart, the API secret, performance, FAQ, glossary
//   /llms/platforms.txt  the code-and-terminal and agent platform pages (Python, CLI, Windows, LiveKit, REST)
//   /llms/apps.txt       the app platform pages (iOS & iPadOS, macOS, Android, Flutter, Web)
//   /llms/deploy.txt     where it runs: the four deployment modes, CPU only, privacy, pricing
//   /llms/models.txt     Essence 2, Expression 2, the first generation, how it works
//   /llms/build.txt      the recipes and guides: avatars, personas, voices, gestures, MCP, troubleshooting
//   /llms/api.txt        the REST API
//   /llms-full.txt       start + platforms + api in one fetch; apps, deploy, models and build are linked
//
// ★WHY APPS HAS ITS OWN FILE (2026-09-28): /llms/platforms.txt had reached 98,211 of its
// 98,304-byte cap and /llms-full.txt 191,288 of 194,560, so a new platform page (Windows)
// fit nowhere. The app pages (group "Apps" in PLATFORM_PAGES) moved to /llms/apps.txt,
// linked from /llms-full.txt like deploy, models and build. No page left the agent layer.
//
// A page's section is its `llms:` frontmatter field, never its nav `section` or
// `type`, so a navigation change cannot move a page in or out of the agent layer.
// scripts/check-llms.mjs requires the field on every page, caps each file and
// fails when a page is in no section (and not linked-only) or in two.

// Account administration, less-used endpoints, the CLI's local conversation
// brain and the method page are linked with their .md twins rather than
// inlined, to keep each file one fetch for an agent. Each still names its
// section in `llms:`; this set only decides inlined or linked within it.
export const LINKED_ONLY = new Set([
  "api/api-keys", "api/organizations", "api/runtime-sessions", "api/billing",
  "api/dynamics", "api/files", "api/knowledge", "api/providers", "api/webhooks",
  "platforms/cli/local-brain",
  "performance/method", "resources/faq", "resources/glossary",
]);

export interface LlmsSection {
  id: "start" | "platforms" | "apps" | "deploy" | "models" | "build" | "api";
  title: string;
  /** One line on what the file holds, shown in every index. */
  summary: string;
  /** Inlined in /llms-full.txt as well as its own file. */
  inFull: boolean;
  /** Reads the page's `llms:` field and nothing else. */
  has: (d: any) => boolean;
}


export const LLMS_SECTIONS: LlmsSection[] = [
  {
    id: "start", title: "Get started", inFull: true,
    summary: "choose your path, your API secret, performance, FAQ, glossary",
    has: (d) => d.data.llms === "start",
  },
  {
    id: "platforms", title: "Platforms", inFull: true,
    summary: "Python, CLI, Windows, LiveKit, REST",
    has: (d) => d.data.llms === "platforms",
  },
  {
    id: "apps", title: "App platforms", inFull: false,
    summary: "iOS & iPadOS, macOS, Android, Flutter, Web",
    has: (d) => d.data.llms === "apps",
  },
  {
    id: "deploy", title: "Deploy", inFull: false,
    summary: "bitHuman cloud, your servers, on the device, fully offline; CPU only; privacy; pricing",
    has: (d) => d.data.llms === "deploy",
  },
  {
    id: "models", title: "Models", inFull: false,
    summary: "Essence 2, Expression 2, Essence 2 Max, the first generation, how it works",
    has: (d) => d.data.llms === "models",
  },
  {
    id: "build", title: "Build", inFull: false,
    summary: "voice agent, companion app, kiosk, talking video, avatars, personas, voices, gestures, MCP, troubleshooting",
    has: (d) => d.data.llms === "build",
  },
  {
    id: "api", title: "REST API", inFull: true,
    summary: "agents, realtime, video, voice, embedding, errors, rate limits",
    has: (d) => d.data.llms === "api",
  },
];

export const sectionUrl = (id: string) => `${SITE}/llms/${id}.txt`;

/** What /llms-full.txt inlines, in words (the sections marked inFull). */
export const FULL_SCOPE = "getting started, the code, terminal and agent platform pages (Python, CLI, Windows, LiveKit, REST) and the REST API; the app platform pages are in /llms/apps.txt";

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
  let out = `# Quickstart\n\nURL: ${SITE}/start\n\n## Choose your platform\n\n`;
  out += "| You want to… | Use | Needs | First command |\n|---|---|---|---|\n";
  for (const p of PLATFORMS) out += `| ${p.want} | ${p.use} | ${p.needs} | ${p.id === "offline" ? `— ([contact sales](${contactSalesUrl("offline")}))` : "`" + p.first.replace(/\|/g, "\\|") + "`"} |\n`;
  for (const p of PLATFORMS.filter((x) => x.note)) out += `\n${p.use}: ${p.note}\n`;
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
  out += `- Examples: ${SITE}/examples.md · changelog: ${SITE}/changelog.md · API references: ${SITE}/platforms/cli/reference.md, ${SITE}/platforms/python/reference.md, ${SITE}/platforms/swift/reference.md, ${SITE}/platforms/android/reference.md\n`;
  // The legacy names sit with the glossary: named in start.txt and the full file only.
  if (sections.some((x) => x.id === "start")) out += `- Renamed and retired names: ${SITE}/resources/renamed.md\n`;
  return out;
}

const INTRO = `Real-time talking avatars from one portrait. Index: ${SITE}/llms.txt · every page is also served as markdown at <url>.md · OpenAPI: ${SITE}/api/openapi.yaml`;

/** The section files an index lists: one line each. */
export function sectionIndex(): string {
  return LLMS_SECTIONS.map((s) => `- ${s.title} (${s.summary}): ${sectionUrl(s.id)}`).join("\n") + "\n";
}

/** /llms/<id>.txt — one section, standalone: the key facts, its contents, its pages. */
export async function sectionFile(s: LlmsSection): Promise<string> {
  let out = `# bitHuman — ${s.title} (${s.summary})\n\n> ${INTRO} · other sections: ${
    LLMS_SECTIONS.filter((o) => o.id !== s.id).map((o) => sectionUrl(o.id)).join(" · ")}\n\n`;
  // The rules, then a pointer: where it runs and the key facts are in /llms.txt,
  // which keeps each section file one fetch (they are capped).
  out += agentInstructions(SITE) + `Where each model runs, the key facts and one command per path: ${SITE}/llms.txt\n\n`;
  out += `## Contents\n\n`;
  if (s.id === "start") out += `- Quickstart — ${SITE}/start\n`;
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
    if (s.id === "start") out += `- Quickstart — ${SITE}/start\n`;
    for (const d of await sectionDocs(s)) out += `- ${d.data.title} — ${SITE}/${d.id}\n`;
  }
  out += `\nIn ${out_.map((s) => sectionUrl(s.id)).join(", ")} (or read the .md twin):\n`;
  for (const s of out_) for (const d of await sectionDocs(s)) out += `- ${d.data.title} — ${SITE}/${d.id}.md\n`;
  out += `\nLinked, not inlined (read the .md twin):\n${await linkedLines(LLMS_SECTIONS)}`;
  for (const s of inFull) out += await sectionBody(s);
  return out;
}
