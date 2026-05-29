// @ts-check
import { defineConfig } from "astro/config";

// Custom Astro theme modeled on developers.openai.com. The embedded API
// reference (Scalar) lives at /api/reference; the rest is a bespoke theme.
export default defineConfig({
  site: "https://docs.bithuman.ai",
  markdown: {
    // Dual Shiki themes so code blocks match the site theme:
    // clean light in light mode, dark in dark mode (toggled via [data-theme]).
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: false,
    },
  },
});
