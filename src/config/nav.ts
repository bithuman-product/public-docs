// Section (pillar) metadata for the docs sidebar + breadcrumbs.
// Each migrated Markdown page declares `section` in its frontmatter; the
// DocLayout groups same-section pages by their `group` field, ordered by `order`.

export type SectionId =
  | "api"
  | "cli"
  | "sdk"
  | "concepts"
  | "guides"
  | "examples"
  | "resources";

export const SECTIONS: Record<SectionId, { label: string; home: string }> = {
  api: { label: "API Platform", home: "/api" },
  cli: { label: "CLI", home: "/cli" },
  sdk: { label: "Apps SDK", home: "/sdk" },
  concepts: { label: "Concepts", home: "/concepts" },
  guides: { label: "Guides", home: "/guides" },
  examples: { label: "Examples", home: "/examples" },
  resources: { label: "Resources", home: "/resources" },
};

// Optional explicit group ordering per section (groups not listed fall to the
// end, ordered by the lowest page `order` within them).
export const GROUP_ORDER: Partial<Record<SectionId, string[]>> = {
  api: ["Get started", "Voice", "Agents", "Assets", "Platform", "Reference"],
  cli: ["Get started", "Usage", "Guides"],
  sdk: ["Overview", "Languages", "Real-time", "Advanced"],
  concepts: ["Core", "Models", "Architecture"],
  guides: ["Deploy", "On-device", "Avatars"],
  resources: ["Resources"],
};
