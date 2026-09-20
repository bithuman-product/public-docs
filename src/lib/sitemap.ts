import { getCollection } from "astro:content";
import { lastModified } from "./git-lastmod";
import { HUBS } from "../config/hubs";

// Every URL the site serves, with the date of its last commit — the one list
// behind /sitemap.xml, /sitemap-index.xml and the "Site sections" block of
// /llms.txt.

const SITE = "https://docs.bithuman.ai";

// Static (non-collection) pages that produce their own routes, keyed by the
// route with the source file that renders it — one list, src/config/hubs.ts,
// which must match the .astro pages under src/pages/ (no phantom routes: they
// 404 and waste crawl budget).
export const STATIC_ROUTES: Record<string, string> = Object.fromEntries(HUBS.map((h) => [h.route, h.file]));

export async function sitemapEntries(): Promise<{ loc: string; lastmod: string | null }[]> {
  const docs = await getCollection("docs", (e: any) => !e.data.draft);
  const seen = new Set<string>();
  const entries: { loc: string; lastmod: string | null }[] = [];
  const add = (route: string, file: string) => {
    const loc = route ? `${SITE}/${route}` : `${SITE}/`;
    if (seen.has(loc)) return;
    seen.add(loc);
    entries.push({ loc, lastmod: lastModified(file) });
  };
  for (const [route, file] of Object.entries(STATIC_ROUTES)) add(route, file);
  for (const d of docs) add(d.id, `src/content/docs/${d.id}.md`);
  return entries;
}

