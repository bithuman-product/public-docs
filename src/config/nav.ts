// Section (pillar) metadata for the docs sidebar + breadcrumbs.
// Each migrated Markdown page declares `section` in its frontmatter; the
// DocLayout groups same-section pages by their `group` field, ordered by `order`.

export type SectionId =
  | "api"
  | "sdk"
  | "concepts"
  | "guides"
  | "examples"
  | "resources";

export const SECTIONS: Record<SectionId, { label: string; home: string }> = {
  api: { label: "API Platform", home: "/api" },
  // The SDK pillar now covers every way to build with bitHuman on your own
  // hardware — the language bindings and the command-line tool — as one section.
  sdk: { label: "SDK", home: "/sdk" },
  concepts: { label: "Concepts", home: "/concepts" },
  guides: { label: "Guides", home: "/guides" },
  examples: { label: "Examples", home: "/examples" },
  resources: { label: "Resources", home: "/resources" },
};

// Optional explicit group ordering per section (groups not listed fall to the
// end, ordered by the lowest page `order` within them).
export const GROUP_ORDER: Partial<Record<SectionId, string[]>> = {
  // Verb-based groups that follow the build flow, so the longest sidebar stays scannable.
  api: ["Get started", "Build", "Deliver", "Account & teams", "Operate & reference"],
  sdk: ["Get started", "Languages", "Command line", "Real-time"],
  // Lead with the defining product choice (Essence vs Expression) before the internals.
  concepts: ["Models", "Core", "Architecture"],
  guides: ["Build", "Deploy", "Integrate", "Pricing"],
  resources: ["Resources"],
};
