// The search acceptance table (docs spec §2.5): each query and the page that
// must be its first result. Site search (scripts/check-search.mjs, Pagefind)
// and the docs MCP server's search (src/lib/docs-mcp.test.mjs) are both held
// to it. Cumulative: a wave adds its rows.

/** query -> the page that must be the first result (and the wave that added it). */
export const QUERIES = [
  { q: "quickstart", top: "/start", wave: "W1" },
  { q: "Swift", top: "/platforms/ios", wave: "W1" },
  { q: "pricing", top: "/pricing", wave: "W1" },
  { q: "self-host", top: "/deploy/self-hosted", wave: "W1" },
  { q: "iOS", top: "/platforms/ios", wave: "W2" },
  { q: "macOS", top: "/platforms/macos", wave: "W2" },
  { q: "Flutter", top: "/platforms/flutter", wave: "W2" },
  { q: "offline", top: "/deploy/offline", wave: "W2" },
  { q: "CPU", top: "/deploy/cpu", wave: "W2" },
  { q: "no GPU", top: "/deploy/cpu", wave: "W2" },
  { q: "WebGPU", top: "/platforms/web/webgpu", wave: "W3" },
  { q: "kiosk", top: "/build/kiosk", wave: "W4" },
  { q: "companion", top: "/build/companion-app", wave: "W4" },
  { q: "barge-in", top: "/build/barge-in", wave: "W4" },
  { q: "estimate", top: "/pricing/estimate", wave: "W4" },
  { q: "retention", top: "/deploy/privacy/retention", wave: "W4" },
  { q: "getShowcaseManifest", top: "/api/agents", wave: "W5" },
  { q: "downloadAgentModel", top: "/api/agents", wave: "W5" },
  { q: "listWebhookDeliveries", top: "/api/webhooks", wave: "W5" },
  { q: "synthesizeSpeech", top: "/api/text-to-speech", wave: "W5" },
  { q: "cloud avatar", top: "/platforms/livekit/cloud-avatar", wave: "W5" },
  { q: "glossary", top: "/resources/glossary", wave: "W5" },
  { q: "FAQ", top: "/resources/faq", wave: "W5" },
  { q: "llms.txt", top: "/resources/agents", wave: "W5" },
  { q: "troubleshooting", top: "/resources/troubleshooting", wave: "W5" },
  { q: "ready-made avatars", top: "/examples/avatars", wave: "W6" },
  { q: "pin a tier", top: "/performance/method", wave: "W6" },
  { q: "ATM", top: "/deploy/use-cases/banking-and-atms", wave: "W6" },
  { q: "healthcare", top: "/deploy/use-cases/healthcare", wave: "W6" },
  { q: "trade show", top: "/deploy/use-cases/events-and-trade-shows", wave: "W6" },
  { q: "widget", top: "/build/website-widget", wave: "W6" },
];
