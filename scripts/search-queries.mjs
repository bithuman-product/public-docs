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
  { q: "WebGPU", top: "/platforms/web", wave: "W2" },
  { q: "kiosk", top: "/build/kiosk", wave: "W4" },
  { q: "companion", top: "/build/companion-app", wave: "W4" },
  { q: "barge-in", top: "/build/voice-agent", wave: "W4" },
  { q: "getShowcaseManifest", top: "/api/reference", wave: "W3" },
  { q: "downloadAgentModel", top: "/api/reference", wave: "W3" },
  { q: "glossary", top: "/resources/glossary", wave: "W5" },
  { q: "FAQ", top: "/resources/faq", wave: "W5" },
  { q: "llms.txt", top: "/resources/agents", wave: "W5" },
  { q: "troubleshooting", top: "/resources/troubleshooting", wave: "W5" },
];
