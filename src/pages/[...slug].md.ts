import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { twin, SITE } from "../lib/markdown-twin";
import { hubMeta } from "../config/hubs";
import { GROUP_ORDER, contactSalesUrl, type SectionId } from "../config/nav";
import { PLATFORMS, PLATFORM_PAGES, QUICKSTART, firstFrame } from "../data/platforms";
import { PLATFORM_GROUPS, PLATFORM_REFERENCE } from "../data/platforms-hub";
import { RENDERS_LABEL } from "../data/labels";
import { LANDING, START_BUILDING, DEPLOYMENTS, MODELS, MODELS_NOTE, GUIDES } from "../data/home";
import { headlineData } from "../lib/perf-headline";
import versions from "../data/versions.json";
import { apiSpec } from "../lib/openapi";
import { apiPages, twinPills } from "../lib/endpoint-block";
import { explorerClaim } from "../lib/doc-blocks";
import headline from "../partials/performance-headline.md?raw";

// /<page>.md — every docs page as clean markdown, for AI agents and for the
// "Copy page" button. Content pages serve their own source; the section hubs
// (/start, /platforms, /build, /resources) serve a generated list of their pages.

export const prerender = true;

/** A content entry's route: its path under src/content/docs, without a trailing /index. */
const route = (id: string) => id.replace(/\/index$/, "");

const md = (s: string) =>
  new Response(s, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });

async function hubBody(section: SectionId, only?: string[], level = "##"): Promise<string> {
  // Every page of the section, children (`parent:`) included, so an agent reaches each from a hub twin.
  const docs = (await getCollection("docs", (e: any) => !e.data.draft && e.data.section === section))
    .sort((a: any, b: any) => (a.data.order ?? 100) - (b.data.order ?? 100));
  let out = "";
  for (const g of GROUP_ORDER[section].filter((x) => !only || only.includes(x))) {
    const items = docs.filter((d: any) => d.data.group === g);
    if (!items.length) continue;
    out += `\n${level} ${g}\n\n`;
    for (const d of items) out += `- [${d.data.title}](${SITE}/${route(d.id)}.md): ${d.data.description}\n`;
  }
  return out;
}

// The generated performance headline (the same table the HTML landing and /start
// show), with absolute links, so the .md twins carry it too.
function perfSection(): string {
  const table = (headline as string).replace(/<!--[\s\S]*?-->/g, "").trim();
  return table ? `\n### How fast it runs\n\n${table.replace(/\]\(\//g, `](${SITE}/`)}\n\nEvery platform: ${SITE}/performance.md\n` : "";
}

function pathTable(): string {
  let out = "| You want to… | Use | Needs | First command | Docs |\n|---|---|---|---|---|\n";
  for (const p of PLATFORMS) out += `| ${p.want} | ${p.use} | ${p.needs} | ${p.id === "offline" ? `— ([contact sales](${contactSalesUrl("offline")}))` : "`" + p.first.replace(/\|/g, "\\|") + "`"} | ${SITE}${p.docs.split("#")[0]}.md${p.docs.includes("#") ? "#" + p.docs.split("#")[1] : ""} |\n`;
  for (const p of PLATFORMS.filter((x) => x.note)) out += `\n${p.use}: ${p.note}\n`;
  return out;
}

// /api/reference's twin lists every operation (method, path, summary) with a
// link to the section of its resource page that documents it (scripts/api-pages.json,
// docs v2 W5), from the same parsed spec the page renders, and points at the full contract.
function endpointTable(): string {
  const pages = apiPages();
  let n = 0, out = "";
  for (const t of apiSpec().tags) {
    const rows = t.operations.map((op) =>
      `| ${op.method} | \`${op.path}\` | [${op.summary.replace(/\|/g, "\\|")}](${SITE}${pages[op.id].page}#${pages[op.id].slug}) |`);
    n += rows.length;
    // one H2 per resource, as the page has (docs v2 W7: a hub twin's headings match its page)
    out += `\n## ${t.name}\n\n| Method | Path | What it does |\n|---|---|---|\n${rows.join("\n")}\n`;
  }
  if (n < 10) throw new Error(`api/reference.md: read only ${n} operations from the spec`);
  return out;
}

/** /start's picker as markdown: each platform's steps, what you get and where next. */
function quickstartMd(): string {
  let out = "";
  for (const q of QUICKSTART) {
    out += `\n### ${q.label}: ${q.title}\n\n`;
    out += [q.time ? `Time: ${q.time}` : "", `Needs: ${q.needs.join(", ")}`, `Models: ${q.models.join(", ")}`].filter(Boolean).join(" · ") + "\n";
    q.steps.forEach((st, i) => {
      out += `\n${i + 1}. ${st.title}\n`;
      if (st.code) out += `\n\`\`\`${st.code.lang}\n${st.code.code}\n\`\`\`\n`;
      if (st.text) out += `\n${st.text}\n`;
    });
    if (q.note) out += `\n${q.note}\n`;
    const [path, hash] = firstFrame(q.next.href).split("#");
    out += `\nExpected: ${q.expect.text}\n\nNext: [${q.next.label}](${SITE}${path}.md${hash ? `#${hash}` : ""})\n`;
  }
  return out;
}

// Docs v2 (SPEC §7, W3): a platform's quickstart twin ends with "Continue", which
// inlines its app and troubleshooting pages (named in its `next:`), so one fetch
// still covers the whole platform. The only twin that is more than its page body;
// the llms files inline each page once and never carry this block.
async function continueBlock(entry: any): Promise<string> {
  if (entry.data.type !== "platform") return "";
  const next: string[] = entry.data.next ?? [];
  const docs = await getCollection("docs", (e: any) => !e.data.draft && next.includes(`/${route(e.id)}`)
    && (e.data.type === "platform-app" || e.data.type === "troubleshooting"));
  if (!docs.length) return "";
  docs.sort((a: any, b: any) => next.indexOf(`/${route(a.id)}`) - next.indexOf(`/${route(b.id)}`));
  return `\n## Continue\n\nThe rest of this platform, inlined so one fetch covers it: ${docs.map((d: any) => `[${d.data.title}](${SITE}/${route(d.id)}.md)`).join(" · ")}.\n` +
    docs.map((d: any) => `\n---\n\n${twin(d.data.title, `/${route(d.id)}`, d.data.description, d.body ?? "")}`).join("");
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
    // A hub whose pages sit under it (`parent:`, /examples) lists those instead.
    const kids = entry.data.type === "hub"
      ? (await getCollection("docs", (e: any) => !e.data.draft && e.data.parent === `/${route(entry.id)}`)).sort((a: any, b: any) => (a.data.order ?? 100) - (b.data.order ?? 100))
      : [];
    const list = entry.data.type !== "hub" ? "" : kids.length
      ? `\n\n**Pages in this section**\n\n${kids.map((d: any) => `- [${d.data.title}](${SITE}/${route(d.id)}.md): ${d.data.description}`).join("\n")}\n`
      : `\n\n**Pages in this section**\n${await hubBody(entry.data.section, undefined, "###")}`;
    return md(twin(entry.data.title, `/${route(entry.id)}`, entry.data.description, await twinPills(`/${route(entry.id)}`, entry.body ?? "") + list) + await continueBlock(entry));
  }
  const V = versions.versions;
  if (hub === "index") {
    const mdUrl = (href: string) => { const [path, hash] = href.split("#"); return `${SITE}${path}.md${hash ? `#${hash}` : ""}`; };
    const cards = (xs: { title: string; line: string; href: string; badge?: string; note?: string }[]) =>
      xs.map((c) => `- [${c.title}](${mdUrl(c.href)})${c.badge ? ` (${c.badge})` : ""}: ${c.line}${c.note ? ` ${c.note}` : ""}`).join("\n");
    const speed = (title: string) => {
      const row = (headlineData() ?? []).find((r) => r.model === title);
      return row ? ` ${row.cells.map((c) => `${c.platform} ${c.multiple}`).join(" · ")} real time.` : "";
    };
    return md(twin("bitHuman docs", "/", hubMeta("").description,
      `${LANDING.line}\n\nQuickstart: ${SITE}/start.md · Get your API secret: https://www.bithuman.ai/developer/api-keys\n\n` +
      `## Platforms\n\n${cards(START_BUILDING)}\n\n` +
      `## Models\n\n${MODELS.map((m) => `- [${m.title}](${mdUrl(m.href)}): ${m.line}${speed(m.title)}`).join("\n")}\n\n${MODELS_NOTE} ${SITE}/models.md\n\n` +
      `## Where it runs\n\n${cards(DEPLOYMENTS)}\n\n` +
      `## Start building\n\n${GUIDES.map((g) => `- [${g.title}](${mdUrl(g.href)}): ${g.line}`).join("\n")}\n\n` +
      `All sections:\n\n- Overview: [Quickstart](${SITE}/start.md) · [Pricing](${SITE}/pricing.md) ([estimate](${SITE}/pricing/estimate.md)) · [Resources](${SITE}/resources.md) · [Changelog](${SITE}/changelog.md)\n- [Platforms](${SITE}/platforms.md)\n- [Models](${SITE}/models.md)\n- [Guides](${SITE}/build.md)\n- [Deploy](${SITE}/deploy.md)\n- [Performance](${SITE}/performance.md)\n- [API reference](${SITE}/api.md)\n- [Legal: EU AI Act](${SITE}/legal/eu-ai-act.md) · [Android FFmpeg / LGPL](${SITE}/legal/android-ffmpeg-lgpl.md)\n`));
  }
  if (hub === "start") {
    // The page's three steps, as its headings (docs v2 W7: a hub twin's headings match its page).
    let body = `## Talk to an avatar\n\nPick a model and start a live conversation on [the quickstart page](${SITE}/start): no install and no account.\n\n` +
      `## Get your API secret\n\nEverything except the web embed uses an API secret. Create one in the bitHuman app (https://www.bithuman.ai/developer/api-keys), then export it:\n\n\`\`\`bash\nexport BITHUMAN_API_SECRET="<your API secret>"\n\`\`\`\n\nHow the API secret works: ${SITE}/start/api-secret.md\n\n` +
      `## Pick your platform\n\n${pathTable()}\nEach block runs as pasted after \`export BITHUMAN_API_SECRET=…\`.\n${quickstartMd()}`;
    body += perfSection();
    body += `\n${explorerClaim()} Every configuration: ${SITE}/performance.md\n`;
    body += await hubBody("overview", ["Get started"], "###");
    return md(twin("Quickstart", "/start", hubMeta("start").description, body));
  }
  if (hub === "api/reference") {
    const body = `The OpenAPI 3 spec (${SITE}/api/openapi.yaml) covers the /v1 endpoints. The account endpoints under /v2 and knowledge have their own pages: [Organizations](${SITE}/api/organizations.md) · [Providers](${SITE}/api/providers.md) · [Runtime sessions](${SITE}/api/runtime-sessions.md) · [API secrets](${SITE}/api/api-keys.md) · [Knowledge](${SITE}/api/knowledge.md). Authenticate with the \`api-secret\` header ([Authentication](${SITE}/api/authentication.md)).\n${endpointTable()}`;
    return md(twin("API reference", "/api/reference", hubMeta("api/reference").description, body));
  }
  if (hub === "platforms") {
    const link = (href: string) => `${SITE}${href.split("#")[0]}.md${href.includes("#") ? "#" + href.split("#")[1] : ""}`;
    // The page's groups and its support matrix, as its headings (docs v2 W7).
    const groups = PLATFORM_GROUPS.map((g) => `## ${g.name}\n\n${g.line}\n\n` +
      PLATFORM_PAGES.filter((p) => p.group === g.name).map((p) => `- [${p.title}](${link(p.href)}): ${p.line}`).join("\n") + "\n").join("\n");
    const matrix = `## Support matrix\n\n| Platform | Where it renders | First result | Reference |\n|---|---|---|---|\n` +
      PLATFORM_PAGES.map((p) => `| [${p.title}](${link(p.href)}) | ${p.renders.map((r) => RENDERS_LABEL[r]).join(" · ")} | ${p.time ?? "—"} | ${PLATFORM_REFERENCE[p.id] ? `[${PLATFORM_REFERENCE[p.id].title}](${link(PLATFORM_REFERENCE[p.id].href)})` : "—"} |`).join("\n") + "\n";
    const body = `Current versions: CLI ${V.cli} · bithuman (Python) ${V.python} · Swift package ${V.swift} · essence2-android ${V.essence2_android} · expression2-android ${V.expression2_android} · livekit-plugins-bithuman ${V.livekit_plugin} · Flutter plugin ${V.flutter_plugin}. Machine-readable: ${SITE}/versions.json\n\n${groups}\n${matrix}\n**Every page**\n` + (await hubBody("platforms", undefined, "###"));
    return md(twin("Platforms", "/platforms", hubMeta("platforms").description, body));
  }
  if (hub === "resources") return md(twin("Resources", "/resources", hubMeta(hub).description, await hubBody("overview", ["Help", "Resources"])));
  return md(twin("Guides", "/build", hubMeta(hub).description, await hubBody("build")));
};
