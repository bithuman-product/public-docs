import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { twin, SITE } from "../lib/markdown-twin";
import { hubMeta } from "../config/hubs";
import { GROUP_ORDER, type SectionId } from "../config/nav";
import { PLATFORMS, PLATFORM_PAGES } from "../data/platforms";
import { HERO, START_BUILDING, DEPLOYMENTS, MODELS, MODELS_NOTE, GUIDES } from "../data/home";
import { PERF_BAND } from "../data/perf-band";
import { perfCell, perfRow, PERF_MODELS } from "../lib/perf";
import versions from "../data/versions.json";
import specText from "../openapi/bithuman.yaml?raw";
import headline from "../partials/performance-headline.md?raw";

// /<page>.md — every docs page as clean markdown, for AI agents and for the
// "Copy page" button. Content pages serve their own source; the section hubs
// (/start, /platforms, /build, /resources) serve a generated list of their pages.

export const prerender = true;

/** A content entry's route: its path under src/content/docs, without a trailing /index. */
const route = (id: string) => id.replace(/\/index$/, "");

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
    for (const d of items) out += `- [${d.data.title}](${SITE}/${route(d.id)}.md): ${d.data.description}\n`;
  }
  return out;
}

// The generated performance headline (the same table the HTML landing and /start
// show), with absolute links, so the .md twins carry it too.
function perfSection(): string {
  const table = (headline as string).replace(/<!--[\s\S]*?-->/g, "").trim();
  return table ? `\n## How fast it runs\n\n${table.replace(/\]\(\//g, `](${SITE}/`)}\n\nEvery platform: ${SITE}/performance.md\n` : "";
}

function pathTable(): string {
  let out = "| You want to… | Use | Needs | First command | Docs |\n|---|---|---|---|---|\n";
  for (const p of PLATFORMS) out += `| ${p.want} | ${p.use} | ${p.needs} | ${p.id === "offline" ? "— ([contact sales](https://www.bithuman.ai/sales))" : "`" + p.first.replace(/\|/g, "\\|") + "`"} | ${SITE}${p.docs.split("#")[0]}.md${p.docs.includes("#") ? "#" + p.docs.split("#")[1] : ""} |\n`;
  for (const p of PLATFORMS.filter((x) => x.note)) out += `\n${p.use}: ${p.note}\n`;
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
  const pages = docs.map((entry: any) => ({ params: { slug: route(entry.id) }, props: { entry } }));
  const hubs = ["start", "platforms", "build", "resources", "index", "api/reference"].map((h) => ({ params: { slug: h }, props: { hub: h } }));
  return [...pages, ...hubs];
}

export const GET: APIRoute = async ({ props }) => {
  const { entry, hub } = props as any;
  if (entry) {
    // A section's home page (type: hub) also lists every page in its section.
    const list = entry.data.type === "hub" ? `\n\n## Pages in this section\n${await hubBody(entry.data.section)}` : "";
    return md(twin(entry.data.title, `/${route(entry.id)}`, entry.data.description, (entry.body ?? "") + list));
  }
  const V = versions.versions;
  if (hub === "index") {
    const mdUrl = (href: string) => { const [path, hash] = href.split("#"); return `${SITE}${path}.md${hash ? `#${hash}` : ""}`; };
    const cards = (xs: { title: string; line: string; href: string; badge?: string; note?: string }[]) =>
      xs.map((c) => `- [${c.title}](${mdUrl(c.href)})${c.badge ? ` (${c.badge})` : ""}: ${c.line}${c.note ? ` ${c.note}` : ""}`).join("\n");
    return md(twin("bitHuman docs", "/", hubMeta("").description,
      `# ${HERO.title}\n\n${HERO.line}\n\nQuickstart: ${SITE}/start.md · API reference: ${SITE}/api/reference.md\n\n` +
      `## Start building\n\n${cards(START_BUILDING)}\n\nOne command per path: ${SITE}/start.md#choose-your-platform\n\n` +
      `## Where it runs\n\n${cards(DEPLOYMENTS)}\n\n` +
      `## Runs everywhere\n\nMeasured times real time (seconds of avatar video rendered per second; 1.0× or more holds a live conversation). Every configuration and the method: ${SITE}/performance.md\n\n` +
      PERF_BAND.map((f) => {
        const x = (id: string) => PERF_MODELS.map((m) => `${m.name} ${perfCell(id, m.id)?.x ?? "—"}`).join(", ");
        return `- [${f.title}](${mdUrl(f.href)}) (${perfRow(f.row).hardware}, ${f.where}): ${x(f.row)}${f.held ? `; held 10 min: ${x(f.held)}` : ""}`;
      }).join("\n") + "\n\n" +
      `## Models\n\n${MODELS.map((m) => `- [${m.title}](${mdUrl(m.href)}): ${m.line}`).join("\n")}\n\n${MODELS_NOTE} ${SITE}/models.md\n\n` +
      `## Build\n\n${GUIDES.map((g) => `- [${g.title}](${mdUrl(g.href)}): ${g.line}`).join("\n")}\n\n` +
      `## Sections\n\n- [Get started](${SITE}/start.md)\n- [Platforms](${SITE}/platforms.md)\n- [Deploy](${SITE}/deploy.md)\n- [Models](${SITE}/models.md)\n- [Build](${SITE}/build.md)\n- [API](${SITE}/api.md)\n- [Performance](${SITE}/performance.md)\n- [Resources](${SITE}/resources.md)\n- [Legal: EU AI Act](${SITE}/legal/eu-ai-act.md) · [Android FFmpeg / LGPL](${SITE}/legal/android-ffmpeg-lgpl.md)\n`));
  }
  if (hub === "start") {
    let body = `## Choose your platform\n\n${pathTable()}\n## Run it\n`;
    for (const p of PLATFORMS.filter((x) => x.card)) body += `\n### ${p.want}: ${p.use}\n\n\`\`\`${p.card!.lang}\n${p.card!.code}\n\`\`\`\n\nExpected: ${p.card!.expect}\n`;
    body += perfSection();
    body += await hubBody("start");
    return md(twin("Quickstart", "/start", hubMeta("start").description, body));
  }
  if (hub === "api/reference") {
    const body = `The OpenAPI 3 spec (${SITE}/api/openapi.yaml) covers the /v1 endpoints. The account endpoints under /v2 and knowledge have their own pages: [Organizations](${SITE}/api/organizations.md) · [Providers](${SITE}/api/providers.md) · [Runtime sessions](${SITE}/api/runtime-sessions.md) · [API secrets](${SITE}/api/api-keys.md) · [Knowledge](${SITE}/api/knowledge.md). Authenticate with the \`api-secret\` header ([Authentication](${SITE}/api/authentication.md)).\n\n## Endpoints\n\n${endpointTable()}`;
    return md(twin("API reference", "/api/reference", hubMeta("api/reference").description, body));
  }
  if (hub === "platforms") {
    const cards = PLATFORM_PAGES.map((p) => `- [${p.title}](${SITE}${p.href.split("#")[0]}.md${p.href.includes("#") ? "#" + p.href.split("#")[1] : ""}): ${p.line}`).join("\n");
    const body = `Current versions: CLI ${V.cli} · bithuman (Python) ${V.python} · Swift package ${V.swift} · essence2-android ${V.essence2_android} · expression2-android ${V.expression2_android} · livekit-plugins-bithuman ${V.livekit_plugin} · Flutter plugin ${V.flutter_plugin}. Machine-readable: ${SITE}/versions.json\n\n## Every platform\n\n${cards}\n` + (await hubBody("platforms"));
    return md(twin("Platforms", "/platforms", hubMeta("platforms").description, body));
  }
  return md(twin(hub === "build" ? "Build" : "Resources", `/${hub}`, hubMeta(hub).description, await hubBody(hub)));
};
