#!/usr/bin/env node
// THE REALTIME PRICE TABLE IS THE API'S (coordinator ruling 2026-09-26, after platform #879/#880).
//
// /guides/pricing's "Serving" table used to be typed by hand. GET /v1/pricing now
// publishes the realtime rates (`data.realtime`), each with the rounding rule and
// the basis in force, so the page is generated from it:
//
//   src/data/pricing.json        a snapshot of GET /v1/pricing `data.realtime`, written
//                                only by this script (--fetch)
//   <!-- PRICING:REALTIME -->    the block on guides/pricing.md, rendered from the snapshot;
//                                `basis` and `rounding` are printed VERBATIM, so when the
//                                rule changes server-side the next --fetch --write changes
//                                the page, with no hand text to forget
//
//   node scripts/sync-pricing.mjs                 check (CI, offline): the block == render(snapshot)
//   node scripts/sync-pricing.mjs --write         rewrite the block from the snapshot
//   node scripts/sync-pricing.mjs --fetch [--write]
//                                                 refresh the snapshot from the live API first. Needs
//                                                 an API secret: BITHUMAN_API_SECRET, or a header file
//                                                 via --header-file (`api-secret: …`). Use a FREE
//                                                 account's secret: an Enterprise account sees rates
//                                                 other customers do not.
//   node scripts/sync-pricing.mjs --live          check the snapshot against the live API (exit 2 if
//                                                 it cannot look)
//
// Rates this API does not publish are not in the block: an Enterprise-only model
// is named only in the enterprise sentence, and the legacy Expression 1 container's
// self-hosted rate is stated in the legacy note beside the table.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SNAP = join(ROOT, "src/data/pricing.json");
const PAGE = join(ROOT, "src/content/docs/guides/pricing.md");
const OPEN = "<!-- PRICING:REALTIME -->", CLOSE = "<!-- /PRICING:REALTIME -->";
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

// Rows in the order the page has always shown them; the label and concept link are the page's.
const MODELS = [
  ["essence-2", "[Essence 2](/concepts/essence-2)"],
  ["expression-2", "[Expression 2](/concepts/expression-2)"],
  ["essence-1", "[Essence 1](/concepts/essence-1)"],
  ["expression-1", "[Expression 1](/concepts/expression-1)"],
];

const per = (r) => `${r} credit${r === 1 ? "" : "s"}/min`;

export function render(rt) {
  if (!rt || rt.unit !== "credits_per_minute") throw new Error(`realtime.unit is ${rt && rt.unit}, not credits_per_minute`);
  const hosted = rt.hosted?.by_model ?? {}, self = rt.self_hosted?.by_model ?? {};
  const known = new Set(MODELS.map(([m]) => m));
  for (const m of [...Object.keys(hosted), ...Object.keys(self)]) {
    if (!known.has(m)) throw new Error(`/v1/pricing publishes a realtime rate for "${m}", which this table has no row for — add it to MODELS (or ask whether it is public)`);
  }
  let out = "| Model | Cloud | Self-hosted and on-device |\n|---|---|---|\n";
  const bases = new Map();
  const note = (e) => { if (!e) return; const k = `${e.rounding}\u0000${e.basis}`; bases.set(k, e); };
  for (const [m, label] of MODELS) {
    const h = hosted[m], s = self[m];
    if (!h && !s) continue;
    note(h); note(s);
    out += `| ${label} (\`${m}\`) | ${h ? per(h.rate) : "—"} | ${s ? per(s.rate) : "—"} |\n`;
  }
  const chat = rt.hosted?.chat_line, camera = rt.hosted?.camera_chat_line;
  if (chat || camera) {
    note(chat); note(camera);
    out += `\nManaged conversational agents bill on top of avatar serving:\n\n| Surface | Rate |\n|---|---|\n`;
    if (chat) out += `| Managed agent — voice chat | ${per(chat.rate)} |\n`;
    if (camera) out += `| Managed agent — camera on (vision chat; replaces the chat rate) | ${per(camera.rate)} |\n`;
  }
  out += "\n";
  // The guide states the BASIS verbatim; the `rounding` enum is an API field value and
  // stays on the API reference page, not in customer prose (owner docs rule).
  for (const e of bases.values()) out += `How talking time is billed: ${e.basis}.\n`;
  return out;
}

async function fetchLive() {
  let header = arg("--header-file") ? readFileSync(arg("--header-file"), "utf8").trim() : null;
  if (!header && process.env.BITHUMAN_API_SECRET) header = `api-secret: ${process.env.BITHUMAN_API_SECRET}`;
  if (!header) return { why: "no API secret (BITHUMAN_API_SECRET or --header-file)" };
  const [k, ...v] = header.split(":");
  try {
    const r = await fetch("https://api.bithuman.ai/v1/pricing", { headers: { [k.trim()]: v.join(":").trim() } });
    const j = await r.json();
    if (!r.ok || !j?.data?.realtime) return { why: `GET /v1/pricing ${r.status}: no data.realtime` };
    return { realtime: j.data.realtime };
  } catch (e) { return { why: `GET /v1/pricing failed: ${e.message}` }; }
}

const page = readFileSync(PAGE, "utf8");
const a = page.indexOf(OPEN), b = page.indexOf(CLOSE);
if (a < 0 || b < a) { console.error(`::error::${PAGE} has no ${OPEN} … ${CLOSE} block`); process.exit(1); }

let snap = existsSync(SNAP) ? JSON.parse(readFileSync(SNAP, "utf8")) : null;
if (has("--fetch") || has("--live")) {
  const live = await fetchLive();
  if (!live.realtime) { console.error(`COULD NOT LOOK: ${live.why}`); process.exit(2); }
  if (has("--live")) {
    const same = JSON.stringify(live.realtime) === JSON.stringify(snap?.realtime);
    console.log(same ? "LIVE MATCHES the snapshot" : "::error::GET /v1/pricing data.realtime differs from src/data/pricing.json — run --fetch --write");
    process.exit(same ? 0 : 1);
  }
  snap = { source: "GET https://api.bithuman.ai/v1/pricing data.realtime", fetched_on: new Date().toISOString().slice(0, 10), realtime: live.realtime };
  writeFileSync(SNAP, JSON.stringify(snap, null, 2) + "\n");
  console.log(`wrote ${SNAP}`);
}
if (!snap) { console.error(`::error::no ${SNAP}; run --fetch`); process.exit(1); }

const want = `${OPEN}\n${render(snap.realtime)}${CLOSE}`;
const have = page.slice(a, b + CLOSE.length);
if (has("--write")) {
  if (have !== want) writeFileSync(PAGE, page.slice(0, a) + want + page.slice(b + CLOSE.length));
  console.log(have === want ? "block already current" : `rewrote the ${OPEN} block in guides/pricing.md`);
  process.exit(0);
}
if (have !== want) {
  console.error(`::error::guides/pricing.md's ${OPEN} block is not what src/data/pricing.json renders (hand edit, or a snapshot without --write). Run: node scripts/sync-pricing.mjs --write`);
  process.exit(1);
}
console.log(`pricing: the realtime block is the render of the /v1/pricing snapshot (${snap.fetched_on})`);
