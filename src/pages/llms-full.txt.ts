import type { APIRoute } from "astro";
import { fullFile } from "../lib/llms-sections";

// /llms-full.txt — what an agent needs to build, in one fetch: getting started,
// the API and every platform page. The guides, examples, changelog, legal pages
// and generated API references are linked, not inlined; each section is also
// served on its own at /llms/<section>.txt (src/lib/llms-sections.ts).
// scripts/check-llms.mjs caps every file (CI: --full-max-kb, --section-max-kb).

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(await fullFile(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
