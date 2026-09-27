// Generated blocks a markdown page places with a fenced block:
//
//   ```perf                  the × real time rows for these performance.json ids
//   iphone-15 iphone-15-sustained
//   ```
//   ```why-on-device         the three-line "why on the device" box (ios, macos, android, web)
//   ```model-matrix          the model × place matrix; "model: essence-2" or "place: offline" for a slice
//   ```model-cards           the current models as portrait cards (models.ts, demo.ts)
//   ```deploy-matrix         the five deployment modes side by side
//   ```dataflow              where one mode renders, where the conversation runs, what reaches bitHuman
//   ```price                 one mode's rate, from pricing.json
//   ```session-caps          concurrent cloud sessions per plan, from plans.json
//   ```partial               a shared passage from src/partials/<name>.md (the Swift
//                            install and credential text iOS and macOS both carry)
//
// Everything is drawn at build time from public/performance.json,
// src/data/pricing.json, src/data/plans.json and src/data/{models,deployments,
// dataflows}.ts: a page never types a number. The page gets styled chips
// (src/markdown/remark-doc-blocks.mjs); the .md twins and llms files get plain
// markdown (expandBlocks, called by src/lib/markdown-twin.ts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { perfRow, perfCell, rowName, noGpu, PERF_MODELS } from "./perf.ts";
import { PERF_GROUPS } from "../data/perf-groups.ts";
import { MODELS, PLACES, MATRIX, type ModelId, type PlaceId } from "../data/models.ts";
import { DEPLOYMENTS } from "../data/deployments.ts";
import { DATAFLOWS, type ModeId } from "../data/dataflows.ts";
import { DEMOS } from "../data/demo.ts";

export type Mode = "page" | "twin";
export const BLOCK_LANGS = new Set(["perf", "why-on-device", "model-matrix", "model-cards", "deploy-matrix", "dataflow", "price", "session-caps", "partial"]);

const readJson = (rel: string) => JSON.parse(readFileSync(join(process.cwd(), rel), "utf8"));
let pricingCache: any, plansCache: any;
const pricing = () => (pricingCache ??= readJson("src/data/pricing.json"));
const plans = () => (plansCache ??= readJson("src/data/plans.json"));

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** `code` in data strings → <code> in HTML. */
const inlineHtml = (s: string) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const cellMd = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const table = (head: string[], rows: string[][]) =>
  `| ${head.map(cellMd).join(" | ")} |\n|${head.map(() => "---").join("|")}|\n` + rows.map((r) => `| ${r.map(cellMd).join(" | ")} |`).join("\n") + "\n";

// ---------------------------------------------------------------- rates
/** Credits per minute for the current-generation models in one pricing table. */
export function rateFor(table: "hosted" | "self_hosted"): number {
  const by = pricing().realtime[table].by_model;
  const r2 = by["essence-2"]?.rate, x2 = by["expression-2"]?.rate;
  if (typeof r2 !== "number" || r2 !== x2) throw new Error(`pricing.json: ${table} rates for essence-2 and expression-2 differ or are missing`);
  return r2;
}
export const chatRate = (): number => pricing().realtime.hosted.chat_line.rate;
const usd = (credits: number) => `$${(credits / plans().topup.credits_per_usd).toFixed(2)}`;
const perMinute = (n: number) => `${n} credit${n === 1 ? "" : "s"} per minute`;

// ---------------------------------------------------------------- the × real time chip
/** A multiple with its detail (hardware, release, date) one click away; 0 JS. */
export function xrtHtml(id: string, model: "essence-2" | "expression-2"): string {
  const c = perfCell(id, model);
  if (!c) return `<span class="xrt-none">—<span class="sr"> not measured</span></span>`;
  return `<details class="xrt${c.realtime ? "" : " xrt-below"}"><summary><span class="xrt-x">${esc(c.x)}</span><span class="xrt-u"> real time</span></summary><span class="xrt-pop">${esc(c.detail)}</span></details>`;
}

function perfBlock(ids: string[], mode: Mode): string {
  if (!ids.length) throw new Error("```perf needs at least one performance.json row id");
  const group = PERF_GROUPS.find((g) => g.rows.includes(ids[0]));
  const more = `/performance${group ? `#${group.anchor}` : ""}`;
  const rows = ids.map((id) => {
    const r = perfRow(id);
    const tags = [r.sustained ? "held 10 min" : "", noGpu(id) ? "CPU only (no GPU)" : ""].filter(Boolean);
    if (mode === "twin") {
      const cells = PERF_MODELS.map((m) => { const c = perfCell(id, m.id); return c ? `${c.x} real time` : "—"; });
      const measured = PERF_MODELS.map((m) => r.cells[m.id]).filter((c): c is NonNullable<typeof c> => !!c);
      const releases = [...new Set(measured.map((c) => c.release))].join(" and ");
      const dates = [...new Set(measured.map((c) => c.measured_on))].join(", ");
      return [`${rowName(id)}${tags.length ? ` (${tags.join(", ")})` : ""}`, r.hardware, ...cells, `${releases}, ${dates}`];
    }
    const name = `**${r.hardware}** <span class="perf-sub">${esc(rowName(id))}</span>` +
      tags.map((t) => ` <span class="chip chip-tag">${esc(t)}</span>`).join("");
    return [name, ...PERF_MODELS.map((m) => xrtHtml(id, m.id))];
  });
  const head = mode === "twin" ? ["Configuration", "Hardware", ...PERF_MODELS.map((m) => m.name), "Measured"] : ["Configuration", ...PERF_MODELS.map((m) => m.name)];
  const note = mode === "page"
    ? `Times real time: seconds of avatar video rendered per second. At 1.0× or more, an avatar holds a live conversation. Select a figure for its release and date. [All configurations and how we measure](${more}).`
    : `× real time: seconds of video rendered per second; 1.0× or more holds a live conversation ([method](${more})).`;
  return `${table(head, rows)}\n${note}\n`;
}

// ---------------------------------------------------------------- why on the device
const WHY: Record<string, () => { title: string; text: string }[]> = {
  device: () => [
    { title: "What reaches bitHuman", text: "When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text." },
    { title: "What it costs", text: `${perMinute(rateFor("self_hosted"))} of active session time on the device, against ${rateFor("hosted")} for a bitHuman cloud avatar: about ${usd(rateFor("self_hosted"))} and ${usd(rateFor("hosted"))} a minute at the top-up rate ([pricing](/pricing)).` },
    { title: "When the network drops", text: "A session checks your credential when it starts and keeps rendering through a network drop of up to 5 minutes." },
  ],
  web: () => [
    { title: "Where it renders", text: "With `render=local` the avatar renders in the visitor's tab with WebGPU. Without a usable GPU it renders in the bitHuman cloud, so every visitor gets lip-sync." },
    { title: "What reaches bitHuman", text: "With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`)." },
    { title: "One download", text: "The avatar's web bundle downloads to the browser once (50–200 MB), then comes from the cache." },
  ],
};
const WHY_FOR: Record<string, string> = { ios: "device", macos: "device", android: "device", flutter: "device", web: "web" };

function whyBlock(platform: string, mode: Mode): string {
  const key = WHY_FOR[platform];
  if (!key) throw new Error(`\`\`\`why-on-device: unknown platform "${platform}" (${Object.keys(WHY_FOR).join(", ")})`);
  const lines = WHY[key]();
  if (mode === "twin") return `Why render on the device:\n\n${lines.map((l) => `- ${l.title}: ${l.text}`).join("\n")}\n`;
  const link = (s: string) => s.replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  return `<aside class="why" aria-label="Why render on the device"><p class="why-title">Why render on the device</p><ul>` +
    lines.map((l) => `<li><strong>${esc(l.title)}</strong><span>${link(inlineHtml(l.text))}</span></li>`).join("") + `</ul></aside>`;
}

// ---------------------------------------------------------------- models × places
const yes = (ok: boolean) => (ok ? "Yes" : "—");
function modelMatrix(arg: string, mode: Mode): string {
  const [k, v] = arg.split(":").map((s) => s.trim());
  const placeLink = (p: (typeof PLACES)[number]) => `[${p.name}](${p.href})`;
  const modelLink = (m: (typeof MODELS)[number]) => `[${m.name}](${m.href})`;
  if (k === "model") {
    const m = MODELS.find((x) => x.id === v);
    if (!m) throw new Error(`\`\`\`model-matrix: unknown model "${v}"`);
    const cells = MATRIX[m.id as ModelId];
    return table(["Where", m.name, "How"], PLACES.map((p) => [placeLink(p), yes(cells[p.id].ok), cells[p.id].how ?? ""]));
  }
  if (k === "place") {
    const ps = v.split(/\s+/).map((id) => {
      const p = PLACES.find((x) => x.id === id);
      if (!p) throw new Error(`\`\`\`model-matrix: unknown place "${id}"`);
      return p;
    });
    if (ps.length === 1) {
      const p = ps[0];
      return table(["Model", p.name, "How"], MODELS.map((m) => [modelLink(m), yes(MATRIX[m.id][p.id].ok), MATRIX[m.id][p.id].how ?? ""]));
    }
    return table(["Model", ...ps.map(placeLink)], MODELS.map((m) => [modelLink(m), ...ps.map((p) => yes(MATRIX[m.id][p.id].ok))]));
  }
  if (arg) throw new Error(`\`\`\`model-matrix: "${arg}" is not "model: <id>" or "place: <id>"`);
  const rows = PLACES.map((p) => [placeLink(p), ...MODELS.map((m) => yes(MATRIX[m.id][p.id].ok))]);
  return table(["Where", ...MODELS.map((m) => m.name)], rows) +
    `\nFully offline is for Business and Enterprise clients, arranged through sales ([Fully offline](/deploy/offline)).\n`;
}

/** The current generation as cards: what each renders, where, and its sample
 *  avatar (the live demo above them shows the portraits). */
function modelCards(mode: Mode): string {
  const current = MODELS.filter((m) => m.generation === "current");
  const chips = ["Renders on the device", "bitHuman cloud"];
  if (mode === "twin") return current.map((m) => `- [${m.name}](${m.href}): ${m.renders} (${chips.join(", ")})`).join("\n") + "\n";
  const card = (m: (typeof MODELS)[number]) => {
    const demo = (DEMOS as Record<string, (typeof DEMOS)["essence-2"]>)[m.id];
    return `<li><a class="card card-link" href="${m.href}"><span class="card-body"><span class="card-title"><strong>${esc(m.name)}</strong></span>` +
      `<span class="card-line">${esc(m.renders[0].toUpperCase() + m.renders.slice(1))}.${demo ? ` Sample avatar: <code>${esc(demo.slug)}</code>.` : ""}</span>` +
      `<span class="card-chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</span></span></a></li>`;
  };
  return `<ul class="card-grid model-cards" role="list">${current.map(card).join("")}</ul>`;
}

// ---------------------------------------------------------------- deployment modes
function priceText(id: ModeId): string {
  const d = DEPLOYMENTS.find((x) => x.id === id)!;
  if (d.rate === "sales") return `from ${plans().offline.min_credits.toLocaleString("en-US")} credits; arranged through sales`;
  const n = rateFor(d.rate);
  return `${perMinute(n)} (Essence 2, Expression 2)`;
}
const PLAN_LABEL = { creator: "Creator plan or higher", "business-enterprise": "Business & Enterprise" } as const;

function deployMatrix(mode: Mode): string {
  const f = (k: keyof (typeof DATAFLOWS)["cloud"]) => DEPLOYMENTS.map((d) => String(DATAFLOWS[d.id][k]));
  const rows: [string, string[]][] = [
    ["The avatar renders", f("renders")],
    ["The conversation runs", f("conversation")],
    ["What reaches bitHuman", f("reaches")],
    ["Network", f("network")],
    ["Price", DEPLOYMENTS.map((d) => priceText(d.id))],
    ["Products", DEPLOYMENTS.map((d) => d.surfaces)],
    ["Models", DEPLOYMENTS.map((d) => d.models)],
  ];
  const foot = `Every mode bills active session time, talking or idle, to the second ([pricing](/pricing)).`;
  if (mode === "twin") {
    const head = ["Compare", ...DEPLOYMENTS.map((d) => `[${d.name}](${d.href})`)];
    const body = [...rows.map(([k, v]) => [`**${k}**`, ...v]), ["**Plan**", ...DEPLOYMENTS.map((d) => PLAN_LABEL[d.plan])]];
    return table(head, body) + `\n${foot}\n`;
  }
  // On the page, one card per mode: five columns of prose do not fit a reading column.
  const card = (d: (typeof DEPLOYMENTS)[number], i: number) =>
    `<li class="dm-card${d.id === "offline" ? " dm-wide" : ""}"><div class="dm-head"><a href="${d.href}">${esc(d.name)}</a><span class="chip chip-plan">${esc(PLAN_LABEL[d.plan])}</span></div>` +
    `<dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${inlineHtml(v[i])}</dd></div>`).join("")}</dl></li>`;
  const link = (s: string) => s.replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  return `<ul class="deploy-cards" role="list">${DEPLOYMENTS.map(card).join("")}</ul><p class="dm-foot">${link(esc(foot))}</p>`;
}

function dataflow(id: string): string {
  const d = DEPLOYMENTS.find((x) => x.id === id);
  if (!d) throw new Error(`\`\`\`dataflow: unknown mode "${id}" (${DEPLOYMENTS.map((x) => x.id).join(", ")})`);
  const f = DATAFLOWS[d.id];
  return table(["Question", d.name], [
    ["Where the avatar renders", f.renders],
    ["Where the conversation runs", f.conversation],
    ["What reaches bitHuman", f.reaches],
    ["Network", f.network],
  ]);
}

function price(id: string): string {
  const d = DEPLOYMENTS.find((x) => x.id === id);
  if (!d) throw new Error(`\`\`\`price: unknown mode "${id}"`);
  if (d.rate === "sales") {
    return `From ${plans().offline.min_credits.toLocaleString("en-US")} credits, credit-based and metered on the machine. Business & Enterprise; arranged through sales.\n`;
  }
  const n = rateFor(d.rate);
  const chat = d.rate === "hosted" ? ` A managed agent's voice chat bills ${perMinute(chatRate())}, all-inclusive: the avatar is part of it.` : "";
  return `${perMinute(n)} of active session time for Essence 2 and Expression 2, about ${usd(n)} a minute at the top-up rate of $1 = ${plans().topup.credits_per_usd} credits.${chat} ` +
    `Realtime usage bills active session time, talking or idle, to the second. Every rate: [Pricing and credits](/pricing).\n`;
}

/** S31: concurrent bitHuman cloud sessions per plan, from plans.json. */
function sessionCaps(): string {
  const ps = plans().plans as { name: string; cloud_concurrent_sessions: number }[];
  return `bitHuman cloud sessions are limited per plan: ${ps.map((p) => `${p.name} ${p.cloud_concurrent_sessions}`).join(", ")} concurrent sessions. ` +
    `On-device and self-hosted sessions are limited by credits ([plans](/pricing#plans)).\n`;
}

// ---------------------------------------------------------------- entry points
/** The markdown for one block. `page` output may carry inline HTML chips. */
export function blockMarkdown(lang: string, body: string, mode: Mode): string {
  const arg = body.trim();
  switch (lang) {
    case "perf": return perfBlock(arg.split(/\s+/).filter(Boolean), mode);
    case "why-on-device": return whyBlock(arg, mode);
    case "model-matrix": return modelMatrix(arg, mode);
    case "model-cards": return modelCards(mode);
    case "deploy-matrix": return deployMatrix(mode);
    case "dataflow": return dataflow(arg);
    case "price": return price(arg);
    case "session-caps": return sessionCaps();
    case "partial": {
      if (!/^[a-z0-9-]+$/.test(arg)) throw new Error(`\`\`\`partial: "${arg}" is not a partial name`);
      return readFileSync(join(process.cwd(), "src/partials", `${arg}.md`), "utf8").replace(/<!--[\s\S]*?-->\n?/g, "");
    }
  }
  throw new Error(`unknown block \`\`\`${lang}`);
}

/** The .md twin form: every block fence replaced by its plain markdown. */
export function expandBlocks(md: string): string {
  return md.replace(/^```([a-z-]+)[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (all, lang: string, body: string) =>
    BLOCK_LANGS.has(lang) ? blockMarkdown(lang, body, "twin").trimEnd() : all);
}
