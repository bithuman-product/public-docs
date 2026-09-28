// The canonical diagrams (docs spec §7 W4): inline SVG drawn at build time on
// the site's tokens, so they follow light and dark with no image request.
// Every diagram has a title and a text description: the figure's caption, the
// screen reader's name for the drawing, and what the .md twin and llms files
// carry instead of the drawing. What leaves your hardware for bitHuman is
// always drawn in --flow-egress.
//
//   ```diagram
//   topology device        (cloud | servers | device | cpu | offline | web-local)
//   ```
//   engine · creation · lifecycle · livekit · livekit-local
//
// Layouts are 360 units wide and stack top to bottom, so a phone shows them at
// full size and a desktop at most 480 px wide. Every sentence states a
// PLAN_v2 SAFE claim (the S rows listed per diagram), nothing more.

import { OFFLINE_LICENSE_COPY } from "../data/offline.ts";

type Tone = "plain" | "accent" | "muted";
interface Box { title: string; sub?: string; tone?: Tone }
interface Placed extends Box { x: number; y: number; w: number; h: number }
interface Group { label: string; bh?: boolean; rows: (Box | [Box, Box])[] }
/** An arrow between two groups; `out` = leaves your hardware for bitHuman (--flow-egress). */
interface Link { label?: string; kind?: "data" | "out" | "in"; x: number; both?: boolean }
interface Note { text: string; badge?: boolean }
export interface Diagram { title: string; desc: string; claims: string[]; groups: Group[]; links?: Link[][]; notes?: Note[]; rail?: boolean }

const W = 360, PAD = 10, ZPAD = 14, ZHEAD = 26, GAP = 8, LINK = 62, LINE = 15;
const SUB_PX = 11.5;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Greedy wrap by an average glyph width (Roboto at the sizes used here). */
function wrap(text: string, width: number, px: number): string[] {
  const max = Math.max(8, Math.floor(width / (px * 0.53)));
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && (line + " " + word).length > max) { out.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}
const boxH = (b: Box, w: number) => 32 + (b.sub ? wrap(b.sub, w - 24, SUB_PX).length * LINE : 0);

function boxSvg(b: Placed): string {
  const lines = b.sub ? wrap(b.sub, b.w - 24, SUB_PX) : [];
  return `<g class="dg-n dg-${b.tone ?? "plain"}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="9"/>` +
    `<text class="dg-t" x="${b.x + 12}" y="${b.y + 21}">${esc(b.title)}</text>` +
    lines.map((l, i) => `<text class="dg-s" x="${b.x + 12}" y="${b.y + 21 + LINE * (i + 1)}">${esc(l)}</text>`).join("") + `</g>`;
}

function arrowHead([x2, y2]: [number, number], [x1, y1]: [number, number]): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const bx = x2 - ux * 8, by = y2 - uy * 8;
  const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
  return `<polygon points="${p(x2, y2)} ${p(bx - uy * 4.5, by + ux * 4.5)} ${p(bx + uy * 4.5, by - ux * 4.5)}"/>`;
}

/** Lays the groups out top to bottom and draws them with the links between. */
function draw(d: Diagram): { svg: string; h: number } {
  let y = PAD;
  let svg = "";
  const bounds: { top: number; bottom: number }[] = [];
  d.groups.forEach((g, gi) => {
    const zx = PAD, zw = W - 2 * PAD, inner = zw - 2 * ZPAD;
    let cy = y + ZHEAD;
    const placed: Placed[] = [];
    for (const row of g.rows) {
      if (Array.isArray(row)) {
        const w = (inner - GAP) / 2;
        const h = Math.max(boxH(row[0], w), boxH(row[1], w));
        placed.push({ ...row[0], x: zx + ZPAD, y: cy, w, h }, { ...row[1], x: zx + ZPAD + w + GAP, y: cy, w, h });
        cy += h + GAP;
      } else {
        const h = boxH(row, inner);
        placed.push({ ...row, x: zx + ZPAD, y: cy, w: inner, h });
        cy += h + GAP;
      }
    }
    const zh = cy - GAP + ZPAD - y;
    svg += `<g class="dg-z${g.bh ? " dg-bh" : ""}"><rect x="${zx}" y="${y}" width="${zw}" height="${zh}" rx="14"/>` +
      `<text x="${zx + 14}" y="${y + 18}">${esc(g.label.toUpperCase())}</text></g>` + placed.map(boxSvg).join("");
    bounds.push({ top: y, bottom: y + zh });
    y += zh + (gi < d.groups.length - 1 ? LINK : 0);
  });
  // the links between group i and group i + 1
  // One arrow sits where its definition puts it, its label to one side. Two
  // arrows (one each way) sit near the zone's edges with their labels between
  // them, each in its own half, so the labels never overlap.
  (d.links ?? []).forEach((links, i) => {
    const a = bounds[i].bottom, b = bounds[i + 1]?.top;
    if (b === undefined) return;
    const pair = links.length === 2;
    const xs = pair ? [72, W - 72] : links.map((l) => l.x);
    links.forEach((l, k) => {
      const x = xs[k];
      const down = l.kind !== "in";
      const [y1, y2] = down ? [a + 2, b - 2] : [b - 2, a + 2];
      const p1: [number, number] = [x, y1], p2: [number, number] = [x, y2];
      const right = pair ? k === 0 : x < W / 2;
      const room = pair ? (xs[1] - xs[0]) / 2 - 16 : right ? W - x - 30 : x - 30;
      const lines = l.label ? wrap(l.label, room, 11) : [];
      const ly = (a + b) / 2 - ((lines.length - 1) * 13) / 2 + 4;
      svg += `<g class="dg-e dg-${l.kind ?? "data"}"><path d="M${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]}"/>${arrowHead(p2, p1)}${l.both ? arrowHead(p1, p2) : ""}` +
        lines.map((t, j) => `<text x="${right ? x + 10 : x - 10}" y="${ly + j * 13}" text-anchor="${right ? "start" : "end"}">${esc(t)}</text>`).join("") + `</g>`;
    });
  });
  y += PAD;
  if (d.rail) {
    // the billed rail beside the lifecycle's events: start to end
    const top = bounds[0].top + ZHEAD + 16, bottom = bounds[0].bottom - ZPAD - 16;
    svg = svg.replace(/(<g class="dg-n)/, `<g class="dg-rail"><line x1="${W - PAD - 6}" y1="${top}" x2="${W - PAD - 6}" y2="${bottom}"/></g>$1`);
  }
  for (const n of d.notes ?? []) {
    if (n.badge) {
      const w = Math.min(W - 2 * PAD, n.text.length * 6.6 + 28);
      svg += `<g class="dg-badge"><rect x="${(W - w) / 2}" y="${y}" width="${w}" height="24" rx="12"/><text x="${W / 2}" y="${y + 16}" text-anchor="middle">${esc(n.text)}</text></g>`;
      y += 34;
    } else {
      const lines = wrap(n.text, W - 2 * PAD, SUB_PX);
      svg += lines.map((t, k) => `<text class="dg-note" x="${W / 2}" y="${y + 12 + k * LINE}" text-anchor="middle">${esc(t)}</text>`).join("");
      y += lines.length * LINE + 10;
    }
  }
  return { svg, h: Math.ceil(y) };
}

// ---------------------------------------------------------------- the diagrams

const SERVERS_DESC_TAIL = "The conversation runs where you choose: the CLI's local conversation brain, your own services, or bitHuman's. bitHuman receives a credential check, the avatar download and usage reports with no audio, video, images or conversation text.";

function serversLike(zone: string, renders: string, stays: string): Pick<Diagram, "groups" | "links"> {
  return {
    groups: [
      { label: zone, rows: [
        { title: "Your app", sub: "the CLI, the Python SDK or the LiveKit plugin" },
        { title: renders, sub: stays, tone: "accent" },
        { title: "The conversation", sub: "the local brain, your own services, or bitHuman's", tone: "muted" },
      ] },
      { label: "bitHuman", bh: true, rows: [{ title: "Credential check and usage", tone: "muted" }] },
    ],
    links: [[{ x: 110, kind: "out", label: "usage: no audio, video or text" }, { x: 250, kind: "in", label: "the avatar, once" }]],
  };
}

export const DIAGRAMS: Record<string, () => Diagram> = {
  engine: () => ({
    title: "The engine: speech in, frames out",
    desc: "Your app pushes 16 kHz mono speech into the bitHuman engine and pulls lip-synced frames out. The same engine and the same avatar file sit inside the Swift package, the Android SDK, the Python SDK, the CLI and the browser.",
    claims: ["S1", "S24"],
    groups: [
      { label: "Speech in", rows: [{ title: "16 kHz mono audio", sub: "a microphone, text to speech or a WebRTC track" }] },
      { label: "Inside every SDK", rows: [{ title: "The bitHuman engine", sub: "renders the avatar from one model file, on the device or your server", tone: "accent" }] },
      { label: "Frames out", rows: [{ title: "Lip-synced video", sub: "at the model's own rate, drawn by your app" }] },
    ],
    links: [[{ x: 180, label: "push audio" }], [{ x: 180, label: "pull frames" }]],
    notes: [{ text: "Swift · Kotlin · Python · CLI · Web" }],
  }),

  creation: () => ({
    title: "Creating an avatar",
    desc: "You upload one portrait. Avatar creation happens in the bitHuman cloud and takes about 2 to 2.5 hours. The finished avatar model then runs on your devices (iPhone, iPad, Mac, Android, a Linux PC or a WebGPU browser) or in the bitHuman cloud.",
    claims: ["S21", "S28", "S1"],
    groups: [
      { label: "Your side", rows: [{ title: "A portrait", sub: "one photo of a person or a character" }] },
      { label: "bitHuman cloud", bh: true, rows: [{ title: "The avatar is created", sub: "about 2–2.5 hours", tone: "accent" }] },
      { label: "Where it runs", rows: [{ title: "One avatar model file", sub: "iPhone, iPad, Mac, Android, a Linux PC, a WebGPU browser, or the bitHuman cloud" }] },
    ],
    links: [[{ x: 110, kind: "out", label: "upload once" }], [{ x: 110, label: "download once" }]],
  }),

  lifecycle: () => ({
    title: "A session and what it bills",
    desc: "A realtime session bills active session time, talking or idle, to the second, from the moment it starts until it ends. Online self-hosted and on-device sessions check your credential when they start and keep rendering through a network drop of up to 5 minutes.",
    claims: ["S20", "S10"],
    rail: true,
    groups: [
      { label: "One session", rows: [
        { title: "It starts", sub: "a self-hosted or on-device session checks your credential" },
        [{ title: "Talking", tone: "accent" }, { title: "Idle, listening", tone: "accent" }],
        { title: "The network drops", sub: "rendering continues for up to 5 minutes", tone: "muted" },
        { title: "It ends", sub: "billing stops" },
      ] },
    ],
    notes: [{ text: "Billed: active session time, talking or idle, to the second." }],
  }),

  livekit: () => ({
    title: "LiveKit: the secret stays on your server",
    desc: "Your LiveKit agent worker holds the API secret as BITHUMAN_MASTER_SECRET and mints a one-hour runtime token for each session. The bitHuman cloud avatar joins your room with that token and publishes its video and voice. Your app joins the room with a room token from your server and never holds a bitHuman secret.",
    claims: ["S17"],
    groups: [
      { label: "Your server", rows: [{ title: "Your agent worker", sub: "BITHUMAN_MASTER_SECRET stays in this process" }] },
      { label: "bitHuman cloud", bh: true, rows: [{ title: "The cloud avatar", sub: "starts with a one-hour token for this agent and room", tone: "accent" }] },
      { label: "Your LiveKit room", rows: [{ title: "Your app", sub: "joins with a room token from your server, never a bitHuman secret" }] },
    ],
    links: [[{ x: 110, kind: "out", label: "mint a token" }], [{ x: 110, label: "video and voice" }]],
  }),

  "livekit-local": () => ({
    title: "A voice agent on your machine",
    desc: "Your browser, a local livekit-server and the agent all run on your machine; the agent renders the avatar from the reply's voice, and the API secret stays in its process. The agent sends your speech to OpenAI Realtime with your key, and sends bitHuman a credential check and usage reports with no audio, video, images or conversation text.",
    claims: ["S4", "S5", "S7"],
    groups: [
      { label: "Your machine", rows: [
        { title: "Your browser", sub: "localhost: your microphone, the avatar's video" },
        { title: "livekit-server", sub: "the room, on this machine" },
        { title: "The agent", sub: "renders the avatar; the API secret stays here", tone: "accent" },
      ] },
      { label: "Outside", rows: [[{ title: "OpenAI Realtime", sub: "hears you and replies, with your key" }, { title: "bitHuman", sub: "credential check and usage reports", tone: "muted" }]] },
    ],
    links: [[{ x: 100, kind: "out", label: "speech" }, { x: 260, kind: "out", label: "usage" }]],
  }),

  "topology-cloud": () => ({
    title: "bitHuman cloud",
    desc: "In the bitHuman cloud the avatar renders on bitHuman's servers, in the US, and the conversation runs on bitHuman's voice service or with the provider keys you connect. The browser or app sends the microphone and shows the video. Your API secret stays on your server; browsers get scoped embed tokens.",
    claims: ["S14", "S15", "S17", "S25"],
    groups: [
      { label: "Your app or site", rows: [{ title: "A browser or app", sub: "sends the microphone, shows the avatar" }] },
      { label: "bitHuman cloud · US", bh: true, rows: [
        { title: "The avatar renders", tone: "accent" },
        { title: "The conversation runs", sub: "bitHuman's voice service, or the provider keys you connect" },
      ] },
    ],
    links: [[{ x: 110, kind: "out", label: "microphone audio" }, { x: 250, kind: "in", label: "video and voice" }]],
    notes: [{ text: "Your API secret stays on your server; browsers get scoped embed tokens." }],
  }),

  "topology-servers": () => ({
    title: "Your servers (self-hosted)",
    desc: `Self-hosted, the avatar renders on your own Mac or Linux machine and its audio and video stay there. ${SERVERS_DESC_TAIL}`,
    claims: ["S4", "S5", "S6", "S7", "S10"],
    ...serversLike("Your Mac or Linux machine", "The avatar renders here", "its audio and video stay on this machine"),
  }),

  "topology-cpu": () => ({
    title: "CPU only (no GPU)",
    desc: `On a standard Linux PC with no GPU, both models render live on the CPU, and the avatar's audio and video stay on the PC. ${SERVERS_DESC_TAIL}`,
    claims: ["S3", "S4", "S5", "S6", "S10"],
    ...serversLike("A Linux PC · CPU only, no GPU", "The avatar renders on the CPU", "its audio and video stay on this PC"),
  }),

  "topology-device": () => ({
    title: "On the device",
    desc: "On the device, your app renders the avatar on the iPhone, iPad, Mac or Android phone and brings its own voice and language services. The avatar model downloads once. When you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text.",
    claims: ["S1", "S8", "S10", "S24", "S30"],
    groups: [
      { label: "iPhone, iPad, Mac or Android", rows: [
        { title: "Your app", sub: "your own voice and language services" },
        { title: "The avatar renders on the device", tone: "accent" },
      ] },
      { label: "bitHuman", bh: true, rows: [{ title: "Usage metering", tone: "muted" }] },
    ],
    links: [[{ x: 110, kind: "out", label: "usage only: no audio, video or text" }, { x: 250, kind: "in", label: "the avatar, once" }]],
  }),

  "topology-offline": () => ({
    title: "Fully offline",
    desc: `${OFFLINE_LICENSE_COPY} The avatar renders on the machine and usage is metered there, with no required reconnection. Models: Essence 1, Essence 2 and Expression 2.`,
    claims: ["S11", "S12"],
    groups: [
      { label: "A Linux PC or terminal", rows: [
        { title: "The avatar renders on the machine", tone: "accent" },
        { title: "Usage is metered on the machine", sub: "no required reconnection" },
        { title: "Essence 1 · Essence 2 · Expression 2", tone: "muted" },
      ] },
    ],
    notes: [{ text: "Business & Enterprise · arranged through sales", badge: true }],
  }),

  "topology-web-local": () => ({
    title: "The web embed with render=local",
    desc: "With render=local the avatar renders in the visitor's browser tab with WebGPU. The conversation runs on bitHuman's servers, even when the avatar renders in the tab: the microphone audio goes to bitHuman and the voice reply comes back.",
    claims: ["S1", "S29"],
    groups: [
      { label: "The visitor's browser tab", rows: [{ title: "The avatar renders in the tab", sub: "WebGPU", tone: "accent" }] },
      { label: "bitHuman's servers", bh: true, rows: [{ title: "The conversation runs here", sub: "speech recognition, language model, voice" }] },
    ],
    links: [[{ x: 110, kind: "out", label: "microphone audio" }, { x: 250, kind: "in", label: "the voice reply" }]],
  }),
};

/** Block argument ("topology device", "engine") → the DIAGRAMS key. */
export const diagramKey = (arg: string) => arg.trim().replace(/^topology\s+/, "topology-").replace(/\s+/g, "-");

function get(name: string): Diagram {
  const make = DIAGRAMS[diagramKey(name)];
  if (!make) throw new Error(`\`\`\`diagram: unknown diagram "${name}" (${Object.keys(DIAGRAMS).join(", ")})`);
  return make();
}

/** The diagram's SVG and caption, for the page. */
export function diagramHtml(name: string): string {
  const d = get(name);
  const id = `dg-${diagramKey(name)}`;
  const { svg, h } = draw(d);
  return `<figure class="dg">` +
    `<svg viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-labelledby="${id}" focusable="false">${svg}</svg>` +
    `<figcaption id="${id}"><strong>${esc(d.title)}.</strong> ${esc(d.desc)}</figcaption></figure>`;
}

/** The diagram as text, for the .md twin and the llms files. */
export function diagramText(name: string): string {
  const d = get(name);
  return `*Diagram: ${d.title}.* ${d.desc}\n`;
}
