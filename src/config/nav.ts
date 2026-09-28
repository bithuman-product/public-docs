// The site's navigation, in one place. The header, the mobile menu, the footer,
// every sidebar and every section hub read this file, so they cannot disagree
// (scripts/check-nav-consistency.mjs enforces it).
//
// A markdown page declares `section` and `group` in its frontmatter; the sidebar
// groups a section's pages by `group` in GROUP_ORDER, then by `order`.

export type SectionId =
  | "start"
  | "platforms"
  | "deploy"
  | "models"
  | "build"
  | "api"
  | "performance"
  | "resources";

/** The sections, organized by the developer's question (start now, which
 *  platform, where it runs, which avatar, how to build X, what the endpoint
 *  takes, how fast, everything else). */
export const SECTIONS: Record<SectionId, { label: string; home: string }> = {
  start: { label: "Get started", home: "/start" },
  platforms: { label: "Platforms", home: "/platforms" },
  deploy: { label: "Deploy", home: "/deploy" },
  models: { label: "Models", home: "/models" },
  build: { label: "Build", home: "/build" },
  api: { label: "API", home: "/api" },
  performance: { label: "Performance", home: "/performance" },
  resources: { label: "Resources", home: "/resources" },
};

/** Sidebar groups per section, in display order. A page's `group` must be one of these. */
export const GROUP_ORDER: Record<SectionId, string[]> = {
  start: ["Get started"],
  platforms: ["Apps", "Code & terminal", "Agents & APIs", "SDK reference"],
  deploy: ["Overview", "Modes"],
  models: ["Models", "Concepts"],
  build: ["Create", "Recipes", "Examples"],
  api: ["Start", "Agents", "Speech & video", "Live sessions", "Account", "Reference"],
  performance: ["Performance"],
  resources: ["Resources", "Legal"],
};

export interface NavLink { label: string; href: string; external?: boolean; match?: string[] }

/** Sidebar entries that are not markdown pages (the .astro pages), placed in
 *  a group by `order` like any page. Their label is the page's H1. */
export const SIDEBAR_LINKS: Partial<Record<SectionId, { group: string; label: string; href: string; order: number }[]>> = {
  start: [
    { group: "Get started", label: "Quickstart", href: "/start", order: 10 },
    { group: "Get started", label: "Choose your platform", href: "/platforms", order: 30 },
  ],
  api: [
    { group: "Reference", label: "API reference", href: "/api/reference", order: 10 },
  ],
};

/** The header, left to right. `match` lists the other path prefixes a section owns. */
export const TOP_NAV: NavLink[] = [
  { label: "Get started", href: "/start" },
  { label: "Platforms", href: "/platforms" },
  { label: "Deploy", href: "/deploy", match: ["/pricing"] },
  { label: "Models", href: "/models" },
  { label: "Build", href: "/build", match: ["/examples"] },
  { label: "API", href: "/api" },
  { label: "Performance", href: "/performance" },
];

/** The header's Resources menu, and the Resources hub's cards. */
export const RESOURCES_MENU: NavLink[] = [
  { label: "Downloads & versions", href: "/downloads" },
  { label: "Changelog", href: "/changelog" },
  { label: "Pricing and credits", href: "/pricing" },
  { label: "Troubleshooting", href: "/resources/troubleshooting" },
  { label: "FAQ", href: "/resources/faq" },
  { label: "Glossary", href: "/resources/glossary" },
  { label: "Support & community", href: "/support" },
  { label: "For AI agents", href: "/resources/agents" },
  { label: "Status", href: "https://status.bithuman.ai", external: true },
];

export const API_SECRET_URL = "https://www.bithuman.ai/developer/api-keys";

/** Footer columns: the header's sections, then resources, community and legal. */
export const FOOTER: { title: string; links: NavLink[] }[] = [
  { title: "Docs", links: TOP_NAV },
  { title: "Resources", links: RESOURCES_MENU },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "https://discord.gg/ES953n7bPA", external: true },
      { label: "GitHub", href: "https://github.com/bithuman-product", external: true },
      { label: "X", href: "https://x.com/bithuman_ai", external: true },
    ],
  },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy", href: "https://www.bithuman.ai/legal/privacy", external: true },
  { label: "Terms", href: "https://www.bithuman.ai/legal/terms", external: true },
  { label: "EU AI Act", href: "/legal/eu-ai-act" },
  { label: "FFmpeg / LGPL", href: "/legal/android-ffmpeg-lgpl" },
];
