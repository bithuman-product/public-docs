import type { APIRoute } from "astro";
import plans from "../data/plans.json";

// /plans.json — src/data/plans.json as published (the plan catalog that /pricing renders). bithuman.ai reads it at build
// time (Next data cache, revalidated every 6 h) instead of raw.githubusercontent.com, so the
// website reads the docs' own copy from the docs' own host, never from a git host.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(plans, null, 2) + "\n", {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
