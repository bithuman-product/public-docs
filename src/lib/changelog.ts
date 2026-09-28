// The changelog read as data: one entry per release heading
// ("### CLI 2.8.2 — 2026-09-27"), with its platform tag and the anchor the page
// gives it. /changelog.xml (RSS), the per-platform tags and filter on
// /changelog (src/markdown/rehype-changelog.mjs) and the home "What's new" strip
// all read it, so the feed, the page and the strip name the same releases.
import Slugger from "github-slugger";

export type TagId = "cli" | "python" | "swift" | "android" | "flutter" | "livekit" | "api" | "app" | "docs";

/** The platform tags, in the order the filter shows them. */
export const TAGS: { id: TagId; label: string }[] = [
  { id: "cli", label: "CLI" },
  { id: "python", label: "Python" },
  { id: "swift", label: "Swift" },
  { id: "android", label: "Android" },
  { id: "flutter", label: "Flutter" },
  { id: "livekit", label: "LiveKit" },
  { id: "api", label: "API" },
  { id: "app", label: "bitHuman app" },
  { id: "docs", label: "Docs" },
];
export const tagLabel = (id: TagId) => TAGS.find((t) => t.id === id)!.label;

/** The tag a release heading belongs to, from the artifact it names. */
export function tagOf(title: string): TagId {
  const t = title.replace(/`/g, "");
  if (/\bFlutter\b/i.test(t)) return "flutter";
  if (/\bLiveKit\b|livekit-plugins/i.test(t)) return "livekit";
  if (/\bCLI\b/.test(t)) return "cli";
  if (/android/i.test(t)) return "android";
  if (/\bSwift\b/i.test(t)) return "swift";
  if (/^bithuman\b|\bPython\b/i.test(t)) return "python";
  if (/\bAPI\b|\bBilling\b|\bRealtime\b|\bVideo\b|\bREST\b/i.test(t)) return "api";
  if (/\bDashboard\b|\bapp\b|\bembed\b/i.test(t)) return "app";
  return "docs";
}

export interface Entry {
  /** The heading as plain text ("CLI 2.8.2 — 2026-09-27") */
  heading: string;
  /** The heading without its date ("CLI 2.8.2") */
  title: string;
  /** YYYY-MM-DD, when the heading carries one */
  date: string | null;
  tag: TagId;
  /** The id the page gives the heading */
  anchor: string;
  /** The entry's markdown, up to the next heading of its level or above */
  body: string;
}

/** Headings as the page slugs them: every heading in order, one slugger. */
export function parseChangelog(md: string): Entry[] {
  const slugger = new Slugger();
  const lines = md.replace(/^---\n[\s\S]*?\n---\n/, "").split("\n");
  const entries: Entry[] = [];
  let cur: Entry | null = null;
  let fence = false;
  for (const line of lines) {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const h = fence ? null : /^(#{2,6}) (.+)$/.exec(line);
    if (h) {
      const text = h[2].replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_]/g, "").trim();
      const anchor = slugger.slug(text);
      if (cur) entries.push(cur);
      cur = null;
      if (h[1] === "###") {
        const date = /(\d{4}-\d{2}-\d{2})\s*$/.exec(text)?.[1] ?? null;
        cur = { heading: text, title: text.replace(/\s*[—–-]\s*\d{4}-\d{2}-\d{2}\s*$/, ""), date, tag: tagOf(text), anchor, body: "" };
      }
      continue;
    }
    if (cur) cur.body += `${line}\n`;
  }
  if (cur) entries.push(cur);
  for (const e of entries) e.body = e.body.trim();
  return entries;
}
