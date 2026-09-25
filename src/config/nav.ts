// The site's navigation, in one place. The header, the mobile menu, the footer,
// every sidebar and every section hub read this file, so they cannot disagree
// (scripts/check-nav-consistency.mjs enforces it).
//
// A markdown page declares `section` and `group` in its frontmatter; the sidebar
// groups a section's pages by `group` in GROUP_ORDER, then by `order`.

export type SectionId =
  | "start"
  | "api"
  | "sdk"
  | "guides"
  | "examples"
  | "performance"
  | "resources"
  | "legal";

export const SECTIONS: Record<SectionId, { label: string; home: string }> = {
  start: { label: "Get started", home: "/start" },
  api: { label: "API", home: "/api" },
  sdk: { label: "SDKs", home: "/sdk" },
  guides: { label: "Guides", home: "/guides" },
  examples: { label: "Examples", home: "/examples" },
  performance: { label: "Performance", home: "/performance" },
  resources: { label: "Resources", home: "/resources" },
  legal: { label: "Legal", home: "/legal/eu-ai-act" },
};

/** Sidebar groups per section, in display order. A page's `group` must be one of these. */
export const GROUP_ORDER: Record<SectionId, string[]> = {
  start: ["Get started"],
  api: ["Get started", "Build", "Deliver", "Account", "Reference"],
  sdk: ["Platforms", "Integrations", "Reference"],
  guides: ["Learn", "Build", "Deploy", "Pricing"],
  examples: ["Examples"],
  performance: ["Overview", "By platform", "Method"],
  resources: ["Resources"],
  legal: ["Legal"],
};

export interface NavLink { label: string; href: string; external?: boolean }

/** The header, left to right. */
export const TOP_NAV: NavLink[] = [
  { label: "Get started", href: "/start" },
  { label: "API", href: "/api" },
  { label: "SDKs", href: "/sdk" },
  { label: "Guides", href: "/guides" },
  { label: "Examples", href: "/examples" },
  { label: "Performance", href: "/performance" },
];

/** The header's Resources menu, and the Resources hub's cards. */
export const RESOURCES_MENU: NavLink[] = [
  { label: "Downloads & versions", href: "/downloads" },
  { label: "Changelog", href: "/changelog" },
  { label: "Community & support", href: "/community" },
  { label: "For AI agents", href: "/resources/agents" },
  { label: "Status", href: "https://status.bithuman.ai", external: true },
];

export const API_SECRET_URL = "https://www.bithuman.ai/developer/api-keys";

/** Footer columns: the header's sections, then resources, then community. */
export const FOOTER: { title: string; links: NavLink[] }[] = [
  { title: "Docs", links: TOP_NAV },
  { title: "Resources", links: RESOURCES_MENU },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "https://discord.gg/ES953n7bPA", external: true },
      { label: "GitHub", href: "https://github.com/bithuman-product", external: true },
      { label: "X", href: "https://x.com/bithuman_ai", external: true },
      { label: "Pricing", href: "/guides/pricing" },
    ],
  },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy", href: "https://www.bithuman.ai/legal/privacy", external: true },
  { label: "Terms", href: "https://www.bithuman.ai/legal/terms", external: true },
  { label: "EU AI Act", href: "/legal/eu-ai-act" },
  { label: "FFmpeg / LGPL", href: "/legal/android-ffmpeg-lgpl" },
];
