// The site's navigation, in one place. The header, the mobile menu, the footer,
// every sidebar and every section hub read this file, so they cannot disagree
// (scripts/check-nav-consistency.mjs enforces it).
//
// A markdown page declares `section` and `group` in its frontmatter; the sidebar
// groups a section's pages by `group` in GROUP_ORDER, then by `order`.

export type SectionId =
  | "overview"
  | "platforms"
  | "models"
  | "build"
  | "deploy"
  | "performance"
  | "api";

/** The 7 tabs (docs v2 SPEC §3), organized by the developer's question: start
 *  and look things up, which platform, which avatar, how to build X, where it
 *  runs, how fast, what the endpoint takes. /build keeps its URL, labelled Guides. */
export const SECTIONS: Record<SectionId, { label: string; home: string }> = {
  overview: { label: "Overview", home: "/" },
  platforms: { label: "Platforms", home: "/platforms" },
  models: { label: "Models", home: "/models" },
  build: { label: "Guides", home: "/build" },
  deploy: { label: "Deploy", home: "/deploy" },
  performance: { label: "Performance", home: "/performance" },
  api: { label: "API reference", home: "/api" },
};

/** Sidebar groups per section, in display order. A page's `group` must be one of these.
 *  A group holds 2–8 entries (scripts/check-nav-consistency.mjs); the few that hold
 *  one until a later wave adds its pages are listed there with the reason. */
export const GROUP_ORDER: Record<SectionId, string[]> = {
  overview: ["Get started", "Pricing", "Help", "Resources"],
  platforms: ["Swift", "Android", "Flutter", "Web", "Python", "CLI", "LiveKit", "Pipecat", "REST"],
  models: ["Models", "Concepts"],
  build: ["Conversations", "Avatars", "Apps", "How-to", "Examples"],
  deploy: ["Where it renders", "Privacy & compliance", "Use cases"],
  performance: ["Speed"],
  api: ["Basics", "Agents", "Media", "Account", "Index"],
};

/** Groups that render closed until the reader is inside them (SPEC D4). */
export const COLLAPSED_GROUPS: Partial<Record<SectionId, string[]>> = {
  deploy: ["Use cases"],
};

export interface NavLink { label: string; href: string; external?: boolean; match?: string[] }

/** Sidebar entries that are not markdown pages (the .astro pages and outside
 *  links), placed in a group by `order` like any page. Their label is the page's H1. */
export const SIDEBAR_LINKS: Partial<Record<SectionId, { group: string; label: string; href: string; order: number; external?: boolean }[]>> = {
  overview: [
    { group: "Get started", label: "Quickstart", href: "/start", order: 10 },
    { group: "Get started", label: "Choose a platform", href: "/platforms", order: 30 },
    { group: "Help", label: "Status", href: "https://status.bithuman.ai", order: 90, external: true },
  ],
  platforms: [
    { group: "Flutter", label: "Plugin source", href: "https://github.com/bithuman-product/homebrew-bithuman/tree/main/packages/flutter-plugin", order: 50, external: true },
  ],
  api: [
    { group: "Index", label: "API reference", href: "/api/reference", order: 10 },
    { group: "Index", label: "OpenAPI", href: "/api/openapi.yaml", order: 20, external: true },
  ],
};

/** The header's tab row, left to right. `match` lists the other path prefixes a tab owns. */
export const TOP_NAV: NavLink[] = [
  { label: "Overview", href: "/", match: ["/start", "/pricing", "/resources", "/downloads", "/changelog", "/news", "/support", "/legal"] },
  { label: "Platforms", href: "/platforms" },
  { label: "Models", href: "/models" },
  { label: "Guides", href: "/build", match: ["/examples"] },
  { label: "Deploy", href: "/deploy" },
  { label: "Performance", href: "/performance" },
  { label: "API reference", href: "/api" },
];

/** Parents whose children their hub lists instead of the sidebar (news posts). */
export const HUB_LISTED: string[] = ["/news"];

export const API_SECRET_URL = "https://www.bithuman.ai/developer/api-keys";

/** The header's "Console": the developer dashboard on bithuman.ai. */
export const CONSOLE_URL = "https://www.bithuman.ai/developer";

/** The bitHuman Discord, THE community home (owner 2026-10-03: "emphasize Discord").
 *  Always bithuman.ai's /discord path, the tracked invite redirect, never a raw
 *  discord.gg invite: the header, the footer and every "Need help?" line use it. */
export const DISCORD_URL = "https://www.bithuman.ai/discord";

/** The footer's first row (one design everywhere); the second row is LEGAL_LINKS and the ©.
 *  The community links follow Marketing's canonical list (2026-10-03): Discord (with its
 *  mark), X, LinkedIn, Bluesky, GitHub. No YouTube, TikTok or Instagram, and not the
 *  dormant @bithuman_ai X account. */
export const FOOTER_LINKS: NavLink[] = [
  { label: "Status", href: "https://status.bithuman.ai", external: true },
  { label: "Changelog", href: "/changelog" },
  { label: "Downloads", href: "/downloads" },
  { label: "llms.txt", href: "/llms.txt" },
  { label: "Discord", href: DISCORD_URL, external: true },
  { label: "X", href: "https://x.com/steve_gu_1984", external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/bithuman-ai", external: true },
  { label: "Bluesky", href: "https://bsky.app/profile/bithuman.ai", external: true },
  { label: "GitHub", href: "https://github.com/bithuman-product", external: true },
  { label: "bithuman.ai", href: "https://www.bithuman.ai", external: true },
];

/** "Contact sales": the contact form on bithuman.ai/enterprise. `topic` preselects
 *  the form's deployment or industry where bithuman.ai knows it (offline, banking,
 *  healthcare) and otherwise tags the enquiry with the docs page it came from. */
export const contactSalesUrl = (topic: string) => `https://www.bithuman.ai/enterprise?topic=${topic}#contact`;

export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy", href: "https://www.bithuman.ai/legal/privacy", external: true },
  { label: "Terms", href: "https://www.bithuman.ai/legal/terms", external: true },
  { label: "EU AI Act", href: "/legal/eu-ai-act" },
  { label: "FFmpeg / LGPL", href: "/legal/android-ffmpeg-lgpl" },
];
