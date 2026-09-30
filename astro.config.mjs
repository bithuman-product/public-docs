// @ts-check
import { defineConfig } from "astro/config";
import { codeTheme } from "./src/lib/code-theme.mjs";
import rehypeTableLabels from "./src/markdown/rehype-table-labels.mjs";
import rehypeCallouts from "./src/markdown/rehype-callouts.mjs";
import rehypePerfTables from "./src/markdown/rehype-perf-tables.mjs";
import rehypeEmbedNofollow from "./src/markdown/rehype-embed-nofollow.mjs";
import rehypeWalkthrough from "./src/markdown/rehype-walkthrough.mjs";
import rehypeChangelog from "./src/markdown/rehype-changelog.mjs";
import rehypeEndpoints from "./src/markdown/rehype-endpoints.mjs";
import remarkCodeTabs from "./src/markdown/remark-code-tabs.mjs";
import remarkDocBlocks from "./src/markdown/remark-doc-blocks.mjs";
import remarkApiSamples from "./src/markdown/remark-api-samples.mjs";

// Custom Astro theme modeled on developers.openai.com. The API reference at
// /api/reference is drawn from src/openapi/bithuman.yaml at build time.
export default defineConfig({
  site: "https://docs.bithuman.ai",
  // Inline the (small) stylesheets so no CSS request blocks the first paint.
  build: { inlineStylesheets: "always" },
  markdown: {
    // Below 700px a table stops being a grid; each cell then has to name its
    // own column, and that name is content, so it is put there at build time.
    // A callout's kind (Note / Tip / Warning / Important) is read off its
    // leading bold label the same way, so the stylesheet can tell them apart.
    // The generated performance tables are laid out one cell per model first
    // (rehype-perf-tables.mjs), so the column labels are the merged ones.
    // On /api/* pages a curl example gains Python and Node tabs generated from it
    // (remark-api-samples.mjs). Consecutive fences marked tab="…" become one tab
    // group (static; JS only switches).
    // A fence named for a generated block (```perf, ```model-matrix, …) becomes
    // that block, drawn from the data files at build time (src/lib/doc-blocks.ts).
    remarkPlugins: [remarkDocBlocks, remarkApiSamples, remarkCodeTabs],
    // A link to an /embed/ URL opens a billable live session: never followed by crawlers.
    // A recipe's "## Steps" becomes a walkthrough: numbered steps, #step-n links, progress.
    // On the changelog each release becomes a tagged entry the platform filter can hide.
    rehypePlugins: [rehypePerfTables, rehypeTableLabels, rehypeCallouts, rehypeEmbedNofollow, rehypeWalkthrough, rehypeChangelog, rehypeEndpoints],
    // One Shiki theme of CSS variables (src/lib/code-theme.mjs): the colours are
    // tokens in src/styles/tokens.css, so code follows the site theme.
    // wrap: true — a long line has to stay readable and copyable at 390px. With
    // wrap off Shiki puts `overflow-x: auto` in the element's own style
    // attribute, which no stylesheet can override, and the install command read
    // "curl -fsSL https://raw.githubusercontent.com" and stopped at the card
    // edge. src/styles/code.css gives the wrapped lines a hanging indent so a
    // wrapped command still reads as one command.
    shikiConfig: {
      theme: codeTheme,
      wrap: true,
    },
  },
});
