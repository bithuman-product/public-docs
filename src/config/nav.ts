// Section (pillar) metadata for the docs sidebar + breadcrumbs.
// Each migrated Markdown page declares `section` in its frontmatter; the
// DocLayout groups same-section pages by their `group` field, ordered by `order`.

export type SectionId =
  | "api"
  | "sdk"
  | "concepts"
  | "guides"
  | "examples"
  | "resources"
  | "legal";

export const SECTIONS: Record<SectionId, { label: string; home: string }> = {
  api: { label: "API Platform", home: "/api" },
  // The SDK pillar now covers every way to build with bitHuman on your own
  // hardware — the language bindings and the command-line tool — as one section.
  sdk: { label: "SDK", home: "/sdk" },
  concepts: { label: "Concepts", home: "/concepts" },
  guides: { label: "Guides", home: "/guides" },
  examples: { label: "Examples", home: "/examples" },
  resources: { label: "Resources", home: "/resources" },
  // Single-page pillar today; the home points at the page itself until a
  // second legal page justifies a hub.
  legal: { label: "Legal", home: "/legal/eu-ai-act" },
};

// Optional explicit group ordering per section (groups not listed fall to the
// end, ordered by the lowest page `order` within them).
export const GROUP_ORDER: Partial<Record<SectionId, string[]>> = {
  // Verb-based groups that follow the build flow, so the longest sidebar stays scannable.
  api: ["Get started", "Build", "Deliver", "Account & teams", "Operate & reference"],
  // ★2026-09-10: one group per PLATFORM, in the order of the table on /sdk, then
  // everything that is not a happy path. The old five groups ("Get started",
  // "Mobile — iOS & Android", "Languages", "Command line", "Real-time") split one
  // question — "which SDK do I want?" — across four headings and 16 pages.
  sdk: ["Platforms", "Reference"],
  // Lead with the defining product choice (Essence vs Expression) before the internals.
  concepts: ["Models", "Core", "Architecture"],
  guides: ["Build", "Deploy", "Integrate", "Pricing"],
  resources: ["Resources"],
  legal: ["Legal"],
};
