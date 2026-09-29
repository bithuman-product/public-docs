// What an AI agent needs before its first call. /llms.txt and /llms-full.txt
// open with all three blocks; every /llms/<section>.txt opens with the
// instructions and points at /llms.txt, so an agent that fetched only one file
// still reads the rules. Each fact links the
// page that owns it; no price is repeated here (prices live on /pricing and
// GET /v1/pricing, which needs the api-secret header; agents are sent to /pricing.md,
// which is generated from it), and speed is drawn from
// performance.json, never typed.
import versions from "../data/versions.json";
import { OFFLINE_LICENSE_COPY } from "../data/offline";
import { perfCell, perfRow } from "../lib/perf";
import { API_SECRET_URL, contactSalesUrl } from "./nav";

const V = versions.versions;

/** The rules an agent follows, in the order it needs them. */
export function agentInstructions(site: string): string {
  return (
    `## Instructions for AI agents\n\n` +
    `- Always send \`model\` ("essence-2" or "expression-2") when creating an agent; poll until \`status\` is \`ready\` or \`failed\`.\n` +
    `- API and SDK use requires the Creator plan or higher. Never tell a user they can build on a free plan.\n` +
    `- In a LiveKit worker, name the secret \`BITHUMAN_MASTER_SECRET\` and pass a minted token (${site}/platforms/livekit.md).\n` +
    `- Say where the avatar renders (device, browser, server, cloud) and the conversation runs (your stack, the CLI's local conversation brain, bitHuman's servers).\n` +
    `- Quote prices only from ${site}/pricing.md and speed only from ${site}/performance.json (× real time, with the device).\n` +
    `- Never claim offline on phones, browsers or Swift apps, or a conversation brain on phones; for compliance, describe the architecture.\n\n`
  );
}

/** "{E2}× / {X2}× real time, {hardware}" for one performance row. */
function xrt(id: string): string {
  const e = perfCell(id, "essence-2");
  const x = perfCell(id, "expression-2");
  const parts = [e && `Essence 2 ${e.x}`, x && `Expression 2 ${x.x}`].filter(Boolean).join(", ");
  return `${parts} real time on ${perfRow(id).hardware}`;
}

/** Where each model renders and where the conversation runs. */
export function agentWhere(site: string): string {
  return (
    `## Where it runs\n\n` +
    `- On the device: Essence 2 and Expression 2 render on iPhone, iPad and Mac (Swift package), Android arm64 (Android SDK), macOS and Linux (CLI, Python). Android, and Essence 2 on iPhone and iPad, need a physical device. The SDKs only render your voice stack's 16 kHz mono speech (resample OpenAI Realtime's 24 kHz): ${site}/build/companion-app.md\n` +
    `- No GPU: both models run live on a standard Linux PC (${xrt("linux-cpu")}). ${site}/deploy/cpu.md\n` +
    `- In the browser: WebGPU renders the avatar in the tab, falling back to cloud rendering; the conversation runs on bitHuman's servers.\n` +
    `- Your servers: the CLI, the Python SDK and the LiveKit plugin on your machines; audio and video stay there.\n` +
    `- Fully offline: ${OFFLINE_LICENSE_COPY} Essence 1 on Linux and Apple silicon Macs, Essence 2 and Expression 2 on Linux x86_64 (Python 2.11.17+, CLI 2.8.4+). ${site}/deploy/offline.md\n` +
    `- bitHuman cloud: REST API, web embed, LiveKit; renders in the US.\n\n`
  );
}

/** The facts behind the rules: credential, billing, samples, versions. */
export function agentKeyFacts(site: string): string {
  return (
    `## Key facts\n\n` +
    `- Credential: one API secret for every surface, from the environment as \`BITHUMAN_API_SECRET\`. REST header \`api-secret\` (not \`Authorization\`). Apps fetch it from your backend; never compile it in. Get one: ${API_SECRET_URL} · ${site}/start/api-secret.md\n` +
    `- Billing: credits pay for active session time, talking or idle, by the exact second; the Video API bills whole minutes of output (minimum 1). ${site}/pricing.md\n` +
    `- Model names: Essence 2, Expression 2 in prose; \`essence-2\`, \`expression-2\` in code. Essence 1 and Expression 1 are the first generation. Essence 2 Max is available on the Enterprise plan only. Contact sales: ${contactSalesUrl("models")} · ${site}/models.md\n` +
    `- Sample avatars (no account): Essence 2 \`sofia-ramirez\` (A52DHS2219), Expression 2 \`wise-pup\` (A23WJF0199). Sample audio: ${site}/samples/speech.wav (15 s, 24 kHz mono)\n` +
    `- Current versions: CLI ${V.cli} · bithuman (Python) ${V.python} · Swift package ${V.swift} · essence2-android ${V.essence2_android} · expression2-android ${V.expression2_android} · livekit-plugins-bithuman ${V.livekit_plugin}. ${site}/versions.json\n` +
    `- Python: use a venv (\`python3 -m venv .venv\`); Debian/Ubuntu's system Python refuses \`pip install\`.\n\n`
  );
}

/** All three blocks: what every agent file opens with. */
export function agentFacts(site: string): string {
  return agentInstructions(site) + agentWhere(site) + agentKeyFacts(site);
}
