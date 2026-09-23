// @ts-check
import { defineConfig } from "astro/config";
import rehypeTableLabels from "./src/markdown/rehype-table-labels.mjs";
import rehypeCallouts from "./src/markdown/rehype-callouts.mjs";

// Custom Astro theme modeled on developers.openai.com. The embedded API
// reference (Scalar) lives at /api/reference; the rest is a bespoke theme.
export default defineConfig({
  site: "https://docs.bithuman.ai",
  // Inline the (small) stylesheets so no CSS request blocks the first paint.
  build: { inlineStylesheets: "always" },
  markdown: {
    // Below 700px a table stops being a grid; each cell then has to name its
    // own column, and that name is content, so it is put there at build time.
    // A callout's kind (Note / Tip / Warning / Important) is read off its
    // leading bold label the same way, so the stylesheet can tell them apart.
    rehypePlugins: [rehypeTableLabels, rehypeCallouts],
    // Dual Shiki themes so code blocks match the site theme:
    // clean light in light mode, dark in dark mode (toggled via [data-theme]).
    // wrap: true — a long line has to stay readable and copyable at 390px. With
    // wrap off Shiki puts `overflow-x: auto` in the element's own style
    // attribute, which no stylesheet can override, and the install command read
    // "curl -fsSL https://raw.githubusercontent.com" and stopped at the card
    // edge. src/styles/code.css gives the wrapped lines a hanging indent so a
    // wrapped command still reads as one command.
    shikiConfig: {
      themes: { light: "github-light-high-contrast", dark: "github-dark" },
      wrap: true,
    },
  },
});
