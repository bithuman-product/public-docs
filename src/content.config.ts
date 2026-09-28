import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// The docs content collection: plain Markdown pages, rendered by
// src/pages/[...slug].astro inside DocLayout. The file path is the URL (no
// `slug:` overrides). The sidebar groups a section's pages by `group` (the
// order is GROUP_ORDER in src/config/nav.ts), then by `order`. The H1 is the
// sidebar label, so there is no separate label field.
const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(""),
    // the section this page belongs to (the header item it sits under)
    section: z.enum(["start", "platforms", "deploy", "models", "build", "api", "performance", "resources"]),
    // the page template it follows (STYLE.md "Page templates"; scripts/check-page-template.mjs)
    type: z.enum([
      "hub", "quickstart", "platform", "recipe", "concept", "endpoint", "deploy",
      "guide", "reference", "example", "changelog", "generated", "legal",
    ]),
    // the sidebar group it sits in
    group: z.string().optional().default(""),
    // ordering within the group
    order: z.number().optional().default(100),
    draft: z.boolean().optional().default(false),
    // the plan chip under the H1
    availability: z.enum(["creator", "business-enterprise", "enterprise"]).optional(),
    // where the avatar renders, as chips under the H1
    renders: z.array(z.enum(["device", "browser", "server", "cloud", "offline", "no-gpu"])).optional(),
    // the platforms and models the page is about (search filters and chips)
    platforms: z.array(z.string()).optional(),
    models: z.array(z.enum(["essence-2", "expression-2", "essence-2-max", "essence-1", "expression-1"])).optional(),
    // the PLAN_v2 SAFE claim ids the page makes (required on deploy and privacy pages)
    claims: z.array(z.string()).optional(),
    // what a reader needs, as chips under the H1 (the fixed "Needs" vocabulary, STYLE.md)
    needs: z.array(z.enum(["Physical device", "Apple silicon", "Linux x86_64 / arm64", "API secret"])).optional(),
    // the artifacts whose current version the chips row shows (keys of versions.json)
    artifacts: z.array(z.enum(["swift", "essence2_android", "expression2_android", "python", "cli", "livekit_plugin", "flutter_plugin"])).optional(),
    // a recipe's time to a working result, as a chip under the H1 ("15 min")
    time: z.string().regex(/^\d+(–\d+)? min$/).optional(),
    // a live sample avatar under the lede: one model, or both with a switch
    demo: z.enum(["essence-2", "expression-2", "both"]).optional(),
    // the title search results show (site search, and the page's <title> for search engines), when
    // the H1 alone does not name what readers type (the iOS page is "iOS & iPadOS"; its result says it is the Swift package)
    searchTitle: z.string().optional(),
    // 1–3 docs paths shown as the "Next" cards at the foot of the page
    next: z.array(z.string()).max(3).optional(),
  }),
});

export const collections = { docs };
