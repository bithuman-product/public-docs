import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE } from "../lib/markdown-twin";

// /news.xml — the posts on /news as an RSS 2.0 feed, newest first. A post is a
// page under src/content/docs/news/ named YYYY-MM-DD-<slug>.md: the file name
// carries its date, so a post without one fails the build instead of dropping
// out of the feed. Each item is the post's H1, its lede and its URL.

export const prerender = true;
const POST = /^news\/(\d{4}-\d{2}-\d{2})-[a-z0-9-]+$/;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rfc822 = (d: string) => new Date(`${d}T12:00:00Z`).toUTCString();

export const GET: APIRoute = async () => {
  const docs = await getCollection("docs", (e: any) => !e.data.draft && e.id.startsWith("news/"));
  const posts = docs
    .map((e: any) => {
      const m = POST.exec(e.id);
      if (!m) throw new Error(`news.xml: ${e.id} is not named news/YYYY-MM-DD-<slug>.md`);
      return { e, date: m[1] };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || (a.e.data.order ?? 100) - (b.e.data.order ?? 100));
  if (!posts.length) throw new Error("news.xml: read no posts from src/content/docs/news");
  const items = posts.map(({ e, date }) => {
    const link = `${SITE}/${e.id}`;
    return `    <item>
      <title>${esc(e.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(date)}</pubDate>
      <description>${esc(e.data.description)}</description>
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>bitHuman news</title>
    <link>${SITE}/news</link>
    <atom:link href="${SITE}/news.xml" rel="self" type="application/rss+xml" />
    <description>Announcements from bitHuman: the models, where they render and how fast. Release notes are in ${SITE}/changelog.xml.</description>
    <language>en</language>
    <lastBuildDate>${rfc822(posts[0].date)}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
