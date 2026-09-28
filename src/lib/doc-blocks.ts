// Generated blocks a markdown page places with a fenced block:
//
//   ```perf                  the × real time rows for these performance.json ids
//   iphone-15 iphone-15-sustained
//   ```
//   ```why-on-device         the three-line "why on the device" box (ios, macos, android, web)
//   ```model-matrix          the model × place matrix; "model: essence-2" or "place: offline" for a slice
//   ```model-cards           the current models as portrait cards (models.ts, demo.ts)
//   ```deploy-matrix         the four deployment modes side by side, and the CPU-only note
//   ```dataflow              where one mode renders, where the conversation runs, what reaches bitHuman
//   ```price                 one mode's rate, from pricing.json
//   ```session-caps          concurrent cloud sessions per plan, from plans.json
//   ```perf-explorer         every published performance row as bars, with a model
//                            switch and the held-for-10-minutes rows (/performance)
//   ```credit-calculator     credits and dollars a month for a usage pattern (/pricing)
//   ```app-budget            what an avatar costs inside an app, per mode (/pricing);
//                            `example` for the one-user worked example alone
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
import { perfRow, perfCell, rowName, noGpu, perfData, PERF_MODELS, type PerfRowData } from "./perf.ts";
import { formatMultiple } from "./format-multiple.ts";
import { calculate, planLine, fmtInt, fmtUsd, type CalcData, type CalcMode } from "./calculator.ts";
import { PERF_GROUPS } from "../data/perf-groups.ts";
import { MODELS, PLACES, MATRIX, type ModelId, type PlaceId } from "../data/models.ts";
import { DEPLOYMENTS, CPU_ONLY, deploymentById } from "../data/deployments.ts";
import { DATAFLOWS, DEVICE_METERING_ONLY, type ModeId } from "../data/dataflows.ts";
import { DEMOS } from "../data/demo.ts";
import { figureBlock, galleryBlock, githubBlock } from "./showcase.ts";
import { diagramHtml, diagramText } from "./diagrams.ts";
import { dataflowExplorer } from "./dataflow-explorer.ts";
import { resolvedHighlights, shortDate } from "./highlights.ts";
import { TAGS, parseChangelog } from "./changelog.ts";

export type Mode = "page" | "twin";
export const BLOCK_LANGS = new Set(["perf", "why-on-device", "model-matrix", "model-cards", "deploy-matrix", "dataflow", "price", "session-caps", "partial", "perf-explorer", "credit-calculator", "app-budget",
  "figure", "example-gallery", "github-examples", "diagram", "dataflow-explorer", "expected", "highlights", "changelog-filter"]);
/** Blocks drawn as HTML on the page (the rest become markdown). */
export const HTML_BLOCKS = new Set(["why-on-device", "model-cards", "deploy-matrix", "perf-explorer", "credit-calculator",
  "figure", "example-gallery", "github-examples", "diagram", "dataflow-explorer", "highlights", "changelog-filter"]);
/** Blocks whose body is markdown the page draws inside a wrapper (the twin
 *  keeps the markdown under a label). Written with four backticks when the
 *  body holds a fence of its own. */
export const WRAP_BLOCKS: Record<string, [string, string]> = {
  expected: [`<details class="expected" open><summary>Expected</summary><div class="expected-body">`, `</div></details>`],
};
/** Blocks that bring a script or styles to the page (DocLayout loads them only there). */
export const WIDGET_BLOCKS: Record<string, string> = { "perf-explorer": "perf-explorer", "credit-calculator": "calculator", "model-matrix": "matrix-filter", "deploy-matrix": "matrix-filter",
  figure: "figure", "example-gallery": "gallery", diagram: "diagram", "dataflow-explorer": "dataflow",
  highlights: "changelog", "changelog-filter": "changelog" };

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
    { title: "What reaches bitHuman", text: DEVICE_METERING_ONLY },
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
  const foot = `\nFully offline is for Business and Enterprise clients, bought in the console or through sales ([Fully offline](/deploy/offline)).\n`;
  if (mode === "twin") {
    const rows = PLACES.map((p) => [placeLink(p), ...MODELS.map((m) => yes(MATRIX[m.id][p.id].ok))]);
    return table(["Where", ...MODELS.map((m) => m.name)], rows) + foot;
  }
  // On the page each cell also says how (the product or command), and a filter
  // above the table (shown only with JavaScript) narrows it to one place.
  const cell = (c: { ok: boolean; how?: string }) =>
    c.ok ? `Yes${c.how ? `<br><span class="mm-how">${inlineHtml(c.how)}</span>` : ""}`
      : c.how ? `Not yet<br><span class="mm-how">${inlineHtml(c.how)}</span>` : "—";
  const rows = PLACES.map((p) => [placeLink(p), ...MODELS.map((m) => cell(MATRIX[m.id][p.id]))]);
  const filter = `<div class="mx-filter" role="radiogroup" aria-label="Show one place" data-mx-filter="model-matrix">` +
    [`<button type="button" role="radio" aria-checked="true" tabindex="0" data-mx="">All places</button>`, ...PLACES.map((p) => `<button type="button" role="radio" aria-checked="false" tabindex="-1" data-mx="${p.id}">${esc(p.name)}</button>`)].join("") + `</div>\n\n`;
  return filter + table(["Where", ...MODELS.map((m) => m.name)], rows) + foot;
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
  if (d.rate === "sales") return `from ${plans().offline.min_credits.toLocaleString("en-US")} credits; bought in the console or through sales`;
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
  // CPU only (no GPU) is Your servers on a PC with no GPU: a note under the modes, not a fifth one.
  const foot = `${CPU_ONLY.line.replace(/\.$/, "")}: [${CPU_ONLY.name}](${CPU_ONLY.href}). Every mode bills active session time, talking or idle, to the second ([pricing](/pricing)).`;
  if (mode === "twin") {
    const head = ["Compare", ...DEPLOYMENTS.map((d) => `[${d.name}](${d.href})`)];
    const body = [...rows.map(([k, v]) => [`**${k}**`, ...v]), ["**Plan**", ...DEPLOYMENTS.map((d) => PLAN_LABEL[d.plan])]];
    return table(head, body) + `\n${foot}\n`;
  }
  // On the page, one card per mode: four columns of prose do not fit a reading column.
  const card = (d: (typeof DEPLOYMENTS)[number], i: number) =>
    `<li class="dm-card" data-mx-item="${d.id}"><div class="dm-head"><a href="${d.href}">${esc(d.name)}</a><span class="chip chip-plan">${esc(PLAN_LABEL[d.plan])}</span></div>` +
    `<dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${inlineHtml(v[i])}</dd></div>`).join("")}</dl></li>`;
  const link = (s: string) => s.replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  const filter = `<div class="mx-filter" role="radiogroup" aria-label="Show one mode" data-mx-filter="deploy-matrix">` +
    [`<button type="button" role="radio" aria-checked="true" tabindex="0" data-mx="">All four</button>`, ...DEPLOYMENTS.map((d) => `<button type="button" role="radio" aria-checked="false" tabindex="-1" data-mx="${d.id}">${esc(d.name)}</button>`)].join("") + `</div>`;
  return `<div class="doc-block-deploy-matrix" data-mx-root>${filter}<ul class="deploy-cards" role="list">${DEPLOYMENTS.map(card).join("")}</ul><p class="dm-foot">${link(esc(foot))}</p></div>`;
}

function dataflow(id: string): string {
  const d = deploymentById(id);
  if (!d) throw new Error(`\`\`\`dataflow: unknown mode "${id}" (${[...DEPLOYMENTS, CPU_ONLY].map((x) => x.id).join(", ")})`);
  const f = DATAFLOWS[d.id];
  return table(["Question", d.name], [
    ["Where the avatar renders", f.renders],
    ["Where the conversation runs", f.conversation],
    ["What reaches bitHuman", f.reaches],
    ["Network", f.network],
  ]);
}

function price(id: string): string {
  const d = deploymentById(id);
  if (!d) throw new Error(`\`\`\`price: unknown mode "${id}"`);
  if (d.rate === "sales") {
    return `From ${plans().offline.min_credits.toLocaleString("en-US")} credits, credit-based and metered on the machine. Business & Enterprise; bought in the console or through sales.\n`;
  }
  const n = rateFor(d.rate);
  const chat = d.rate === "hosted" ? ` A managed agent's voice chat bills ${perMinute(chatRate())}, all-inclusive: the avatar is part of it.` : "";
  return `${perMinute(n)} of active session time for Essence 2 and Expression 2, about ${usd(n)} a minute at the top-up rate of $1 = ${plans().topup.credits_per_usd} credits.${chat} ` +
    `Real-time usage bills active session time, talking or idle, to the second. Every rate: [Pricing and credits](/pricing).\n`;
}

/** S31: concurrent bitHuman cloud sessions per plan, from plans.json. */
function sessionCaps(): string {
  const ps = plans().plans as { name: string; cloud_concurrent_sessions: number }[];
  return `bitHuman cloud sessions are limited per plan: ${ps.map((p) => `${p.name} ${p.cloud_concurrent_sessions}`).join(", ")} concurrent sessions. ` +
    `On-device and self-hosted sessions are limited by credits ([plans](/pricing#plans)).\n`;
}

// ---------------------------------------------------------------- performance explorer
/** Every published row, in its reader group (on-device first). A row the
 *  groups do not name yet is still drawn, under "More configurations", so the
 *  explorer never leaves a published measurement out. */
export function explorerGroups(): { id: string; title: string; anchor: string; rows: PerfRowData[] }[] {
  const published = perfData().rows.filter((r) => r.published);
  const named = new Set(PERF_GROUPS.flatMap((g) => g.rows));
  const groups = PERF_GROUPS.map((g) => ({ id: g.id, title: g.title, anchor: g.anchor, rows: g.rows.map((id) => published.find((r) => r.id === id)).filter((r): r is PerfRowData => !!r) }));
  const rest = published.filter((r) => !named.has(r.id));
  if (rest.length) groups.push({ id: "more", title: "More configurations", anchor: "", rows: rest });
  return groups.filter((g) => g.rows.length);
}

/** The explorer's claim, worded down when any published cell is under 1.0×. */
export function explorerClaim(): string {
  const cells = perfData().rows.filter((r) => r.published).flatMap((r) => PERF_MODELS.map((m) => r.cells[m.id]).filter((c): c is NonNullable<typeof c> => !!c));
  const under = cells.filter((c) => c.x_realtime < 1).length;
  return under ? `${cells.length - under} of ${cells.length} published measurements render faster than real time.` : "Every configuration we publish renders faster than real time.";
}

const AXIS = 10; // the bars run 0–10×; a longer value is capped with its number shown

function explorerRow(r: PerfRowData, model: (typeof PERF_MODELS)[number]): string {
  const c = r.cells[model.id];
  const cpu = noGpu(r.id);
  const tags = [r.sustained ? `<span class="chip chip-tag">held 10 min</span>` : "", cpu ? `<span class="chip chip-tag pe-cpu">CPU only (no GPU)</span>` : ""].join("");
  const head = `<th scope="row"><span class="pe-hw">${esc(r.hardware)}</span><span class="pe-sub">${esc(rowName(r.id))}</span>${tags}</th>`;
  if (!c) return `<tr class="pe-row${r.sustained ? " pe-held" : ""}" data-row="${esc(r.id)}">${head}<td><span class="xrt-none">—<span class="sr"> not measured</span></span></td></tr>`;
  const x = formatMultiple(c.x_realtime);
  const capped = c.x_realtime > AXIS;
  const v = Math.min(c.x_realtime, AXIS) / AXIS;
  const clip = c.clip?.seconds ? ` · ${Math.floor(c.clip.seconds * 10) / 10} s speech clip` : "";
  const detail = `${r.hardware}${cpu ? ", CPU only (no GPU)" : ""} · ${c.release}${r.sustained ? " · held 10 min" : ""} · measured ${c.measured_on}${clip} · ${c.fps} frames rendered per second`;
  return `<tr class="pe-row${r.sustained ? " pe-held" : ""}${cpu ? " pe-nogpu" : ""}" data-row="${esc(r.id)}">${head}` +
    `<td><span class="pe-bar${capped ? " pe-cap" : ""}${c.x_realtime < 1 ? " pe-below" : ""}" style="--v:${v.toFixed(3)}"><span class="pe-fill"></span><span class="pe-x">${esc(x)}<span class="sr"> real time</span></span></span>` +
    `<details class="pe-d"><summary>Details<span class="sr"> for ${esc(r.hardware)}, ${esc(rowName(r.id))}</span></summary><span>${esc(detail)}</span></details></td></tr>`;
}

function perfExplorer(mode: Mode): string {
  const groups = explorerGroups();
  const claim = explorerClaim();
  if (mode === "twin") return `${claim} The tables below list every published configuration.\n`;
  const models = PERF_MODELS.map((m, i) => `<button type="button" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-model="${m.id}">${esc(m.name)}</button>`).join("");
  const panel = (m: (typeof PERF_MODELS)[number]) =>
    `<div class="pe-panel" data-model-panel="${m.id}"><p class="pe-mh">${esc(m.name)}</p>` +
    groups.map((g) => `<table class="pe-table"><caption>${esc(g.title)}</caption>` +
      `<thead class="sr"><tr><th scope="col">Configuration</th><th scope="col">${esc(m.name)}, × real time</th></tr></thead><tbody>` +
      g.rows.map((r) => explorerRow(r, m)).join("") + `</tbody></table>`).join("") + `</div>`;
  const count = groups.reduce((a, g) => a + g.rows.length, 0);
  return `<section class="pe" data-perf-explorer data-model="${PERF_MODELS[0].id}" aria-label="Performance explorer" data-pagefind-ignore>` +
    `<div class="pe-top"><p class="pe-claim">${esc(claim)}</p>` +
    `<div class="pe-controls"><div class="seg" role="radiogroup" aria-label="Model">${models}</div>` +
    `<label class="pe-toggle"><input type="checkbox" data-held> Held for 10 minutes</label></div></div>` +
    `<ul class="pe-legend" role="list"><li><span class="pe-key-line" aria-hidden="true"></span>1.0×: holds a live conversation</li><li><span class="pe-key-cpu" aria-hidden="true"></span>CPU only (no GPU)</li><li class="pe-leg-held"><span class="pe-key-held" aria-hidden="true"></span>held for 10 minutes</li><li>Bars run to 10×; a longer bar shows its number</li></ul>` +
    PERF_MODELS.map(panel).join("") +
    `<p class="pe-foot" aria-live="polite" data-pe-status>${count} published configurations, each measured on the named hardware and release. Select Details for the release, date and clip.</p></section>`;
}

// ---------------------------------------------------------------- credit calculator
export function calcData(): CalcData {
  const ps = plans().plans as CalcData["plans"];
  return {
    rates: { device: rateFor("self_hosted"), cloud: rateFor("hosted"), chat: chatRate() },
    credits_per_usd: plans().topup.credits_per_usd,
    plans: ps.map(({ id, name, monthly_usd, credits_per_month, cloud_concurrent_sessions }) => ({ id, name, monthly_usd, credits_per_month, cloud_concurrent_sessions })),
  };
}
const CALC_MODES: { id: CalcMode; name: string; line: (d: CalcData) => string }[] = [
  { id: "device", name: "On the device or your servers", line: (d) => `${perMinute(d.rates.device)}` },
  { id: "cloud", name: "bitHuman cloud avatar", line: (d) => `${perMinute(d.rates.cloud)}` },
  { id: "chat", name: "Managed voice chat, all-inclusive", line: (d) => `${perMinute(d.rates.chat)}` },
];
const CALC_DEFAULT = { mode: "device" as CalcMode, minutes: 60, days: 30, sessions: 1 };

function creditCalculator(mode: Mode): string {
  const d = calcData();
  const examples = CALC_MODES.map((m) => {
    const r = calculate(d, { ...CALC_DEFAULT, mode: m.id });
    return [m.name, m.line(d), fmtInt(r.credits), fmtUsd(r.usd), r.plan ? r.plan.name : "Custom"];
  });
  const head = ["Mode", "Rate", "Credits a month", "At the top-up rate", "Smallest plan that covers it"];
  if (mode === "twin") return `One avatar session running ${CALC_DEFAULT.minutes} minutes a day for ${CALC_DEFAULT.days} days, billed as active session time, talking or idle:\n\n${table(head, examples)}`;
  const r0 = calculate(d, CALC_DEFAULT);
  const radios = CALC_MODES.map((m) => `<label class="cc-mode"><input type="radio" name="cc-mode" value="${m.id}"${m.id === CALC_DEFAULT.mode ? " checked" : ""}><span><strong>${esc(m.name)}</strong><span>${esc(m.line(d))}</span></span></label>`).join("");
  const num = (id: string, label: string, v: number, max: number, unit: string) =>
    `<label class="cc-num"><span>${label}</span><span class="cc-in"><input type="number" inputmode="numeric" name="${id}" min="0" max="${max}" step="1" value="${v}"><span class="cc-unit">${unit}</span></span></label>`;
  return `<form class="cc" data-calculator aria-label="Credit calculator" data-pagefind-ignore>` +
    `<script type="application/json" data-calc>${JSON.stringify(d).replace(/</g, "\\u003c")}</script>` +
    `<fieldset class="cc-modes"><legend>Where the avatar renders</legend>${radios}</fieldset>` +
    `<div class="cc-nums">${num("minutes", "Minutes a day", CALC_DEFAULT.minutes, 1440, "min")}${num("days", "Days a month", CALC_DEFAULT.days, 31, "days")}${num("sessions", "Sessions at once", CALC_DEFAULT.sessions, 10000, "at once")}</div>` +
    `<output class="cc-out" aria-live="polite" data-out><span class="cc-big"><span data-credits>${fmtInt(r0.credits)}</span> credits a month</span>` +
    `<span class="cc-usd">About <span data-usd>${fmtUsd(r0.usd)}</span> at the top-up rate of $1 = ${d.credits_per_usd} credits</span>` +
    `<span class="cc-plan" data-plan>${esc(planLine(r0, CALC_DEFAULT.mode))}</span></output>` +
    `<p class="cc-note">Every mode bills active session time, talking or idle, to the second. <a href="/deploy/offline">Fully offline</a> is bought in the console or through sales.</p></form>` +
    `<div class="cc-examples"><p class="cc-ex-title">${CALC_DEFAULT.minutes} minutes a day, ${CALC_DEFAULT.days} days, one session at a time</p>` +
    `<table><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${examples.map((row) => `<tr>${row.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}

// ---------------------------------------------------------------- budget an app
/** The one-user worked example: sessions adding up to APP_MINUTES a day on the device. */
const APP_MINUTES = 20;
function appExample(d: CalcData): string {
  const r = calculate(d, { mode: "device", minutes: APP_MINUTES, days: 30, sessions: 1 });
  return `One user whose sessions add up to ${APP_MINUTES} minutes a day on the device uses about ${fmtInt(r.credits)} credits a month (${fmtUsd(r.usd)} at the top-up rate).`;
}

/** What an avatar costs inside an app, per mode, from pricing.json and plans.json. */
function appBudget(arg: string): string {
  const d = calcData();
  if (arg === "example") return `${appExample(d)}\n`;
  if (arg) throw new Error(`\`\`\`app-budget: "${arg}" is not empty or "example"`);
  const modes = [
    { name: "On the device or your servers", rate: d.rates.device, stack: "your own services", caps: "limited by credits" },
    { name: "bitHuman cloud avatar", rate: d.rates.cloud, stack: "your own services", caps: "[per plan](/pricing#plans)" },
    { name: "Managed voice chat, all-inclusive", rate: d.rates.chat, stack: "included", caps: "[per plan](/pricing#plans)" },
  ];
  const creator = d.plans.find((p) => p.id === "creator");
  const business = d.plans.find((p) => p.id === "business");
  if (!creator || !business) throw new Error("plans.json: the Creator and Business plans are required for ```app-budget");
  const perCredit = business.monthly_usd / business.credits_per_month;
  const rows = [
    ["Credits per minute of active session time", ...modes.map((m) => String(m.rate))],
    [`At the top-up rate ($1 = ${d.credits_per_usd} credits)`, ...modes.map((m) => `about $${(m.rate / d.credits_per_usd).toFixed(2)} a minute`)],
    [`At the ${business.name} plan's credit price`, ...modes.map((m) => `about $${(m.rate * perCredit).toFixed(3)} a minute`)],
    [`Minutes in a ${creator.name} month (${fmtInt(creator.credits_per_month)} credits)`, ...modes.map((m) => fmtInt(Math.floor(creator.credits_per_month / m.rate)))],
    ["Speech, language model and voice", ...modes.map((m) => m.stack)],
    ["Sessions at once", ...modes.map((m) => m.caps)],
  ];
  return table(["Mode", ...modes.map((m) => m.name)], rows) +
    `\n- **Idle is billed.** A session bills for as long as it runs, talking or idle. End it when the user leaves, and show a still frame when nobody is talking.\n` +
    `- **Worked example.** ${appExample(d)}\n`;
}

// ---------------------------------------------------------------- changelog
/** The month's highlights: cards that jump to each release (page), or a list (twin). */
function highlightsBlock(mode: Mode): string {
  const hs = resolvedHighlights();
  if (mode === "twin") {
    return hs.map((h) => `- **${h.title}** (${h.entry.heading}, ${h.tagLabel}): ${h.line} [Release notes](/changelog#${h.entry.anchor}) · [Docs](${h.href})`).join("\n") + "\n";
  }
  return `<ul class="card-grid hl-grid" role="list">` + hs.map((h) =>
    `<li data-tag="${h.entry.tag}"><a class="card card-link hl-card" href="#${h.entry.anchor}"><span class="card-body">` +
    `<span class="hl-meta"><span class="chip cl-chip" data-tag="${h.entry.tag}">${esc(h.tagLabel)}</span>${h.entry.date ? `<time datetime="${h.entry.date}">${shortDate(h.entry.date)}</time>` : ""}</span>` +
    `<span class="card-title"><strong>${inlineHtml(h.title)}</strong></span><span class="card-line">${inlineHtml(h.line)}</span>` +
    `</span></a></li>`).join("") + `</ul>`;
}

/** The platform filter over the releases below it (hidden until its script runs; the twin has none). */
function changelogFilter(mode: Mode): string {
  if (mode === "twin") return "";
  const used = new Set(parseChangelog(readFileSync(join(process.cwd(), "src/content/docs/changelog.md"), "utf8")).map((e) => e.tag));
  const tags = TAGS.filter((t) => used.has(t.id));
  return `<div class="cl-filter" role="group" aria-label="Show releases for" data-pagefind-ignore hidden>` +
    `<button type="button" class="cl-f" data-tag="" aria-pressed="true">All</button>` +
    tags.map((t) => `<button type="button" class="cl-f" data-tag="${t.id}" aria-pressed="false">${esc(t.label)}</button>`).join("") +
    `</div><p class="cl-count" aria-live="polite" hidden></p>`;
}

// ---------------------------------------------------------------- entry points
/** The markdown for one block. `page` output may carry inline HTML chips. */
export function blockMarkdown(lang: string, body: string, mode: Mode): string {
  const arg = body.trim();
  if (lang === "expected" && !arg) throw new Error("```expected needs a body: what the reader should see");
  switch (lang) {
    case "perf": return perfBlock(arg.split(/\s+/).filter(Boolean), mode);
    case "why-on-device": return whyBlock(arg, mode);
    case "model-matrix": return modelMatrix(arg, mode);
    case "model-cards": return modelCards(mode);
    case "deploy-matrix": return deployMatrix(mode);
    case "dataflow": return dataflow(arg);
    case "price": return price(arg);
    case "session-caps": return sessionCaps();
    case "perf-explorer": return perfExplorer(mode);
    case "credit-calculator": return creditCalculator(mode);
    case "app-budget": return appBudget(arg);
    case "figure": return figureBlock(arg, mode);
    case "example-gallery": return galleryBlock(mode);
    case "github-examples": return githubBlock(mode);
    case "diagram": return mode === "page" ? diagramHtml(arg) : diagramText(arg);
    case "dataflow-explorer": return dataflowExplorer(mode);
    case "expected": return mode === "page" ? body : `Expected:\n\n${body.trim()}\n`;
    case "highlights": return highlightsBlock(mode);
    case "changelog-filter": return changelogFilter(mode);
    case "partial": {
      if (!/^[a-z0-9-]+$/.test(arg)) throw new Error(`\`\`\`partial: "${arg}" is not a partial name`);
      return readFileSync(join(process.cwd(), "src/partials", `${arg}.md`), "utf8").replace(/<!--[\s\S]*?-->\n?/g, "");
    }
  }
  throw new Error(`unknown block \`\`\`${lang}`);
}

/** The widget scripts a markdown page needs, from the blocks it places: the
 *  explorer, the calculator, and the filter of a full matrix (a one-model or
 *  one-place slice has none). */
export function widgetsIn(md: string): Set<string> {
  const out = new Set<string>();
  for (const m of md.matchAll(/^(`{3,})([a-z-]+)[ \t]*\n([\s\S]*?)^\1[ \t]*$/gm)) {
    const w = WIDGET_BLOCKS[m[2]];
    if (w && !(m[2] === "model-matrix" && m[3].trim())) out.add(w);
  }
  // the gallery's cards are figures (the same frames and loops)
  if (out.has("gallery")) out.add("figure");
  // a recipe's "## Steps" becomes a walkthrough (src/markdown/rehype-walkthrough.mjs)
  if (/^## Steps[ \t]*$/m.test(md)) out.add("walkthrough");
  return out;
}

/** The .md twin form: every block fence replaced by its plain markdown. */
export function expandBlocks(md: string): string {
  return md.replace(/^(`{3,})([a-z-]+)[ \t]*\n([\s\S]*?)^\1[ \t]*$/gm, (all, _f: string, lang: string, body: string) =>
    BLOCK_LANGS.has(lang) ? blockMarkdown(lang, body, "twin").trimEnd() : all);
}
