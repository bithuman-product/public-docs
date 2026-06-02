import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

// /sitemap.xml — every doc page + the section landings. Dep-free (generated
// from the content collection rather than @astrojs/sitemap).

export const prerender = true;

const SITE = "https://docs.bithuman.ai";

export const GET: APIRoute = async () => {
  const docs = await getCollection("docs", (e: any) => !e.data.draft);
  const staticRoutes = [
    "",
    "api",
    "api/reference",
    "cli",
    "sdk",
    "guides",
    "resources",
    "showcase",
  ];
  const urls = Array.from(
    new Set([
      ...staticRoutes.map((r) => (r ? `${SITE}/${r}` : SITE)),
      ...docs.map((d: any) => `${SITE}/${d.id}`),
    ]),
  );

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
