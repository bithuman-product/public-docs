import type { APIRoute } from "astro";
import pricing from "../data/pricing.json";

// /pricing.json — src/data/pricing.json as published (the snapshot of GET /v1/pricing that /pricing renders). bithuman.ai reads it at build
// time (Next data cache, revalidated every 6 h) instead of raw.githubusercontent.com, so the
// website reads the docs' own copy from the docs' own host, never from a git host.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(pricing, null, 2) + "\n", {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
