// "What leaves your hardware" on /deploy/privacy (the ```dataflow-explorer
// block): pick a mode and see where each kind of data goes, each cell with
// the S row it states in src/data/dataflows.ts (the page shows the sentence,
// not the code). Drawn at build time from src/data/dataflows.ts; with
// JavaScript off every mode shows, one list under another. The twin gets one
// table.
import { CROSSINGS, DATA_KINDS, FLOW_MODES, type Direction } from "../data/dataflows.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const DIRECTION_LABEL: Record<Direction, string> = {
  out: "Reaches bitHuman",
  stays: "Stays on your hardware",
  yours: "Your choice of services",
  in: "Comes from bitHuman",
  bh: "At bitHuman",
};

export function dataflowExplorer(mode: "page" | "twin"): string {
  if (mode === "twin") {
    const head = `| Data | ${FLOW_MODES.map((m) => m.name).join(" | ")} |\n|---|${FLOW_MODES.map(() => "---").join("|")}|\n`;
    const rows = DATA_KINDS.map((k) => `| ${k.name} | ${FLOW_MODES.map((m) => { const c = CROSSINGS[m.id][k.id]; return `${DIRECTION_LABEL[c.dir]}: ${c.text}`; }).join(" | ")} |`);
    return head + rows.join("\n") + "\n";
  }
  const chips = FLOW_MODES.map((m, i) =>
    `<button type="button" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-dfx="${m.id}">${esc(m.name)}</button>`).join("");
  const panel = (m: (typeof FLOW_MODES)[number], i: number) => {
    return `<div class="dfx-panel${i === 0 ? " on" : ""}" data-dfx-panel="${m.id}">` +
      `<p class="dfx-mh">${esc(m.name)}</p>` +
      `<ul class="dfx-list" role="list">` + DATA_KINDS.map((k) => {
        const c = CROSSINGS[m.id][k.id];
        return `<li class="dfx-row dfx-${c.dir}"><span class="dfx-kind">${esc(k.name)}</span>` +
          `<span class="dfx-dir"><span class="dfx-dot" aria-hidden="true"></span>${DIRECTION_LABEL[c.dir]}</span>` +
          `<span class="dfx-text">${esc(c.text)}</span></li>`;
      }).join("") + `</ul></div>`;
  };
  return `<div class="dfx" data-dfx-root role="group" aria-label="What leaves your hardware, by mode" data-pagefind-ignore>` +
    `<div class="seg dfx-modes" role="radiogroup" aria-label="Where the avatar renders">${chips}</div>` +
    `<ul class="dfx-legend" role="list">${(["out", "stays", "yours", "in", "bh"] as Direction[]).map((d) => `<li class="dfx-${d}"><span class="dfx-dot" aria-hidden="true"></span>${DIRECTION_LABEL[d]}</li>`).join("")}</ul>` +
    FLOW_MODES.map(panel).join("") +
    `<p class="dfx-foot" aria-live="polite" data-dfx-status>Usage reports never contain audio, video, images or conversation text.</p></div>`;
}
