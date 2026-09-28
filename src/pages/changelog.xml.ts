import type { APIRoute } from "astro";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import raw from "../content/docs/changelog.md?raw";
import { parseChangelog, tagLabel } from "../lib/changelog";
import { absolutize, SITE } from "../lib/markdown-twin";

// /changelog.xml — the changelog as an RSS 2.0 feed: one item per release
// heading on /changelog, newest first, each tagged with its platform and linked
// to its anchor on the page. Built from the same markdown the page renders.

export const prerender = true;
const MAX_ITEMS = 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rfc822 = (d: string) => new Date(`${d}T12:00:00Z`).toUTCString();

export const GET: APIRoute = () => {
  const entries = parseChangelog(raw as string)
    .filter((e) => e.date)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.date!.localeCompare(a.e.date!) || a.i - b.i)
    .slice(0, MAX_ITEMS)
    .map(({ e }) => e);
  if (entries.length < 10) throw new Error(`changelog.xml: read only ${entries.length} dated entries from changelog.md`);
  const items = entries.map((e) => {
    const html = micromark(absolutize(e.body), { extensions: [gfm()], htmlExtensions: [gfmHtml()], allowDangerousHtml: false });
    const link = `${SITE}/changelog#${e.anchor}`;
    return `    <item>
      <title>${esc(e.heading)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(e.date!)}</pubDate>
      <category>${esc(tagLabel(e.tag))}</category>
      <description><![CDATA[${html.replace(/]]>/g, "]]&gt;")}]]></description>
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>bitHuman changelog</title>
    <link>${SITE}/changelog</link>
    <atom:link href="${SITE}/changelog.xml" rel="self" type="application/rss+xml" />
    <description>Release notes for every bitHuman artifact: the CLI, the Python SDK, the Swift package, the Android SDK, the Flutter plugin, the LiveKit plugin and the REST API.</description>
    <language>en</language>
    <lastBuildDate>${rfc822(entries[0].date!)}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
