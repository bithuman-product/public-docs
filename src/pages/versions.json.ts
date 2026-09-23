import type { APIRoute } from "astro";
import versions from "../data/versions.json";

// /versions.json — src/data/versions.json as published: the current version and
// install line of every bitHuman artifact, for scripts and AI agents. The pages
// carry the same values (scripts/sync-versions.mjs keeps them equal).
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(versions, null, 2) + "\n", {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
