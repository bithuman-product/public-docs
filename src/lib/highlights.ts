// The highlights (src/data/highlights.ts) joined to their releases on
// /changelog: date, platform tag and anchor. Throws when a highlight names a
// release the changelog does not carry, so a stale highlight fails the build.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HIGHLIGHTS, type Highlight } from "../data/highlights.ts";
import { parseChangelog, tagLabel, type Entry } from "./changelog.ts";

export interface ResolvedHighlight extends Highlight { entry: Entry; tagLabel: string }

let cache: ResolvedHighlight[] | null = null;
export function resolvedHighlights(): ResolvedHighlight[] {
  if (cache) return cache;
  const entries = parseChangelog(readFileSync(join(process.cwd(), "src/content/docs/changelog.md"), "utf8"));
  cache = HIGHLIGHTS.map((h) => {
    const entry = entries.find((e) => e.title === h.release);
    if (!entry) throw new Error(`src/data/highlights.ts: "${h.release}" is not a release heading on /changelog`);
    return { ...h, entry, tagLabel: tagLabel(entry.tag) };
  });
  return cache;
}

/** "2026-09-27" → "Sep 27" */
export const shortDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "";
