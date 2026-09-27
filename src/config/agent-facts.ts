// The facts an AI agent needs before its first call, as one short list. /llms.txt
// and /llms-full.txt both open with it. Each fact links the page that owns it;
// no price is repeated here (pricing lives on /pricing).
import versions from "../data/versions.json";
import { OFFLINE_LICENSE_COPY } from "../data/offline";

const V = versions.versions;

export function agentFacts(site: string): string {
  return (
    `## Key facts\n\n` +
    `- Credential: one API secret for every surface. Env \`BITHUMAN_API_SECRET\`, except in a LiveKit worker: there name it \`BITHUMAN_MASTER_SECRET\` and pass a minted token (${site}/platforms/livekit.md). REST header \`api-secret\` (not \`Authorization\`). Get one: https://www.bithuman.ai/developer/api-keys · ${site}/start/api-secret.md\n` +
    `- Billing: credits pay for active session time, talking or idle, by the exact second; the Video API bills whole minutes of output (minimum 1). Prices: ${site}/pricing.md\n` +
    `- Creating an agent: always send \`model\` ("essence-2" or "expression-2"); poll until \`status\` is \`ready\` or \`failed\`. ${site}/api/agents.md\n` +
    `- Model names: Essence 2, Expression 2 in prose; \`essence-2\`, \`expression-2\` in code. Essence 1 and Expression 1 are the first generation.\n` +
    `- Where each runs: on devices (Apple, Android) Essence 2 and Expression 2 only; Essence 1 also on the CLI, Python and the web; Expression 1 in the cloud only. ${site}/models.md\n` +
    `- Essence 2 Max is available on the Enterprise plan only. Contact sales to enable it: https://www.bithuman.ai/sales\n` +
    `- Sample avatars (no account): Essence 2 \`sofia-ramirez\` (A52DHS2219), Expression 2 \`wise-pup\` (A23WJF0199). Full list: https://api.bithuman.ai/v1/models/showcase\n` +
    `- Sample audio: ${site}/samples/speech.wav (15 s, 24 kHz mono)\n` +
    `- Current versions: CLI ${V.cli} · bithuman (Python) ${V.python} · Swift package ${V.swift} · essence2-android ${V.essence2_android} · expression2-android ${V.expression2_android} · livekit-plugins-bithuman ${V.livekit_plugin}. ${site}/versions.json\n` +
    `- Python installs into a virtual environment (\`python3 -m venv .venv\`); a system Python on Debian/Ubuntu refuses \`pip install\`.\n` +
    `- Fully offline: ${OFFLINE_LICENSE_COPY} Models: Essence 1, Essence 2, Expression 2. Not the same as file rendering (\`bithuman render\`), which signs in online. ${site}/pricing.md#offline-licensing\n\n`
  );
}
