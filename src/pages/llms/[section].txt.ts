import type { APIRoute, GetStaticPaths } from "astro";
import { LLMS_SECTIONS, sectionFile } from "../../lib/llms-sections";

// /llms/<section>.txt — one section of the docs as markdown, standalone (key
// facts, contents, pages). /llms-full.txt inlines the sections marked inFull.

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => LLMS_SECTIONS.map((s) => ({ params: { section: s.id } }));

export const GET: APIRoute = async ({ params }) => {
  const s = LLMS_SECTIONS.find((x) => x.id === params.section)!;
  return new Response(await sectionFile(s), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
