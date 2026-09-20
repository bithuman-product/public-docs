import type { APIRoute } from "astro";
import { sitemapEntries } from "../lib/sitemap";

// /sitemap-index.xml — the conventional entry point (robots.txt names it),
// listing the one sitemap this site has, dated by its newest page.

export const prerender = true;

export const GET: APIRoute = async () => {
  const newest = (await sitemapEntries())
    .map((e) => e.lastmod)
    .filter((d): d is string => !!d)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .pop();
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap><loc>https://docs.bithuman.ai/sitemap.xml</loc>${newest ? `<lastmod>${newest}</lastmod>` : ""}</sitemap>\n` +
    `</sitemapindex>\n`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
