// @ts-check
import { defineConfig } from 'astro/config';

// Scalar-only docs site. Everything lives in public/api/openapi.yaml.
// src/pages/index.astro embeds the Scalar API Reference renderer.
export default defineConfig({
  site: 'https://docs.bithuman.ai',
});
