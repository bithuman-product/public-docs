// @ts-check
import { defineConfig } from "astro/config";

// Custom Astro theme modeled on developers.openai.com. The embedded API
// reference (Scalar) lives at /api/reference; the rest is a bespoke theme.
export default defineConfig({
  site: "https://docs.bithuman.ai",
  markdown: {
    // Dual Shiki themes so code blocks match the site theme:
    // clean light in light mode, dark in dark mode (toggled via [data-theme]).
    // wrap: true — a long line has to stay readable and copyable at 390px. With
    // wrap off Shiki puts `overflow-x: auto` in the element's own style
    // attribute, which no stylesheet can override, and the install command read
    // "curl -fsSL https://raw.githubusercontent.com" and stopped at the card
    // edge. src/styles/code.css gives the wrapped lines a hanging indent so a
    // wrapped command still reads as one command.
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
});
