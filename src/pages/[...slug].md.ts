import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { twin, SITE } from "../lib/markdown-twin";
import { hubMeta } from "../config/hubs";
import { GROUP_ORDER, type SectionId } from "../config/nav";
import { PLATFORMS } from "../data/platforms";
import versions from "../data/versions.json";
import specText from "../openapi/bithuman.yaml?raw";

// /<page>.md — every docs page as clean markdown, for AI agents and for the
// "Copy page" button. Content pages serve their own source; the section hubs
// (/start, /sdk, /guides, /resources) serve a generated list of their pages.

export const prerender = true;

const md = (s: string) =>
  new Response(s, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });

async function hubBody(section: SectionId): Promise<string> {
  const docs = (await getCollection("docs", (e: any) => !e.data.draft && e.data.section === section))
    .sort((a: any, b: any) => (a.data.order ?? 100) - (b.data.order ?? 100));
  let out = "";
  for (const g of GROUP_ORDER[section]) {
    const items = docs.filter((d: any) => d.data.group === g);
    if (!items.length) continue;
    out += `\n## ${g}\n\n`;
    for (const d of items) out += `- [${d.data.label ?? d.data.title}](${SITE}/${d.id}.md): ${d.data.description}\n`;
  }
  return out;
}

function pathTable(): string {
  let out = "| You want to… | Use | Needs | First command | Docs |\n|---|---|---|---|---|\n";
  for (const p of PLATFORMS) out += `| ${p.want} | ${p.use} | ${p.needs} | \`${p.first.replace(/\|/g, "\\|")}\` | ${SITE}${p.docs.split("#")[0]}.md |\n`;
  return out;
}

// /api/reference is a Scalar page (client-rendered), so it has no source body to
// serve. Its twin lists every operation from the spec itself (method, path,
// summary), so an agent can find an endpoint without running JavaScript, and
// points at the full contract. Parsed line by line: the spec's layout is fixed
// (paths at 2 spaces, methods at 4, summary at 6).
function endpointTable(): string {
  const rows: string[] = [];
  let inPaths = false, path = "", method = "";
  for (const line of (specText as string).split("\n")) {
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths && /^\S/.test(line)) break;
    if (!inPaths) continue;
    let m = /^  (\/\S*):\s*$/.exec(line);
    if (m) { path = m[1]; method = ""; continue; }
    m = /^    (get|post|put|patch|delete):\s*$/.exec(line);
    if (m) { method = m[1].toUpperCase(); continue; }
    m = /^      summary:\s*(.+?)\s*$/.exec(line);
    if (m && path && method) {
      rows.push(`| ${method} | \`${path}\` | ${m[1].replace(/^["']|["']$/g, "").replace(/\|/g, "\\|")} |`);
      method = "";
    }
  }
  if (rows.length < 10) throw new Error(`api/reference.md: read only ${rows.length} operations from the spec; the parser went blind`);
  return `| Method | Path | What it does |\n|---|---|---|\n${rows.join("\n")}\n`;
}

export async function getStaticPaths() {
  const docs = await getCollection("docs", (e: any) => !e.data.draft);
  const pages = docs.map((entry: any) => ({ params: { slug: entry.id }, props: { entry } }));
  const hubs = ["start", "sdk", "guides", "resources", "index", "api/reference"].map((h) => ({ params: { slug: h }, props: { hub: h } }));
  return [...pages, ...hubs];
}

export const GET: APIRoute = async ({ props }) => {
  const { entry, hub } = props as any;
  if (entry) {
    // A section's home page (type: hub) also lists every page in its section.
    const list = entry.data.type === "hub" ? `\n\n## Pages in this section\n${await hubBody(entry.data.section)}` : "";
    return md(twin(entry.data.title, `/${entry.id}`, entry.data.description, (entry.body ?? "") + list));
  }
  const V = versions.versions;
  if (hub === "index") {
    return md(twin("bitHuman docs", "/", hubMeta("").description,
      `## Choose your path\n\n${pathTable()}\n## Sections\n\n- [Get started](${SITE}/start.md)\n- [API](${SITE}/api.md)\n- [SDKs](${SITE}/sdk.md)\n- [Guides](${SITE}/guides.md)\n- [Examples](${SITE}/examples.md)\n- [Performance](${SITE}/performance.md)\n- [Resources](${SITE}/resources.md)\n- [Legal: EU AI Act](${SITE}/legal/eu-ai-act.md) · [Android FFmpeg / LGPL](${SITE}/legal/android-ffmpeg-lgpl.md)\n`));
  }
  if (hub === "start") {
    let body = `## Choose your path\n\n${pathTable()}\n## Run it\n`;
    for (const p of PLATFORMS.filter((x) => x.card)) body += `\n### ${p.want} (${p.use})\n\n\`\`\`${p.card!.lang}\n${p.card!.code}\n\`\`\`\n\nExpected: ${p.card!.expect}\n`;
    body += await hubBody("start");
    return md(twin("Get started", "/start", hubMeta("start").description, body));
  }
  if (hub === "api/reference") {
    const body = `The complete contract is the OpenAPI 3 spec: ${SITE}/api/openapi.yaml. Authenticate with the \`api-secret\` header ([Authentication](${SITE}/api/authentication.md)). Each endpoint group also has a page: [API](${SITE}/api.md).\n\n## Endpoints\n\n${endpointTable()}`;
    return md(twin("REST API reference", "/api/reference", hubMeta("api/reference").description, body));
  }
  if (hub === "sdk") {
    const body = `Current versions: CLI ${V.cli} · bithuman (Python) ${V.python} · Swift package ${V.swift} · essence2-android ${V.essence2_android} · expression2-android ${V.expression2_android} · livekit-plugins-bithuman ${V.livekit_plugin}. Machine-readable: ${SITE}/versions.json\n` + (await hubBody("sdk"));
    return md(twin("SDKs", "/sdk", hubMeta("sdk").description, body));
  }
  return md(twin(hub === "guides" ? "Guides" : "Resources", `/${hub}`, hubMeta(hub).description, await hubBody(hub)));
};
