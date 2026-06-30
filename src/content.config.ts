import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Docs content collection — plain Markdown pages migrated from the old
// Mintlify site + OpenAPI prose. Rendered by src/pages/[...slug].astro
// inside the 3-column DocLayout. Sidebar grouping is driven by `section`
// (the pillar) + `group` (the sub-section), ordered by `order`.
const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(""),
    // top-level pillar / area this page belongs to
    section: z.enum(["api", "sdk", "concepts", "guides", "examples", "resources"]),
    // sub-section heading shown in the sidebar group
    group: z.string().optional().default(""),
    // sidebar label override (defaults to title)
    label: z.string().optional(),
    // ordering within the group
    order: z.number().optional().default(100),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { docs };
