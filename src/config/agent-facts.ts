// The facts an AI agent needs before its first call, as one short list. /llms.txt
// and /llms-full.txt both open with it. Each fact links the page that owns it;
// no price is repeated here (pricing lives on /guides/pricing).
import versions from "../data/versions.json";

const V = versions.versions;

export function agentFacts(site: string): string {
  return (
    `## Key facts\n\n` +
    `- Credential: one API secret for every surface. Env \`BITHUMAN_API_SECRET\`; REST header \`api-secret\` (not \`Authorization\`). Get one: https://www.bithuman.ai/developer/api-keys · ${site}/start/api-secret.md\n` +
    `- Billing: credits pay for talking time; idle time is free. Prices: ${site}/guides/pricing.md\n` +
    `- Creating an agent: always send \`model\` ("essence-2" or "expression-2"); poll until \`status\` is \`ready\` or \`failed\`. ${site}/api/agents.md\n` +
    `- Model names: Essence 2, Expression 2 in prose; \`essence-2\`, \`expression-2\` in code. Essence 1 and Expression 1 are the first generation.\n` +
    `- Where each runs: on devices (Apple, Android) Essence 2 and Expression 2 only; Essence 1 also on the CLI, Python and the web; Expression 1 in the cloud only. ${site}/concepts/models.md\n` +
    `- Essence 2 Max is available on the Enterprise plan only. Contact sales to enable it: https://www.bithuman.ai/sales\n` +
    `- Sample avatars (no account): Essence 2 \`sofia-ramirez\` (A52DHS2219), Expression 2 \`wise-pup\` (A23WJF0199). Full list: https://api.bithuman.ai/v1/models/showcase\n` +
    `- Sample audio: ${site}/samples/speech.wav (15 s, 24 kHz mono)\n` +
    `- Current versions: CLI ${V.cli} · bithuman (Python) ${V.python} · Swift package ${V.swift} · essence2-android ${V.essence2_android} · expression2-android ${V.expression2_android} · livekit-plugins-bithuman ${V.livekit_plugin}. ${site}/versions.json\n` +
    `- Python installs into a virtual environment (\`python3 -m venv .venv\`); a system Python on Debian/Ubuntu refuses \`pip install\`.\n` +
    `- Offline: Business and Enterprise plans can run realtime avatars fully offline (kiosks, trade shows, ATMs, embedded screens), from 100,000 credits; contact sales. ${site}/guides/pricing.md\n\n`
  );
}
