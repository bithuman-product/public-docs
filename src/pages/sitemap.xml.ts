import type { APIRoute } from "astro";
import { sitemapEntries } from "../lib/sitemap";

// /sitemap.xml — every doc page + the section landings, each with the date of
// its last commit. Dep-free (generated from the content collection rather
// than @astrojs/sitemap). /sitemap-index.xml points here.

export const prerender = true;

export const GET: APIRoute = async () => {
  const entries = await sitemapEntries();
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map((e) => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`)
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
