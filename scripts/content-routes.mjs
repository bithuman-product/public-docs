// The URL a content file is served at: its frontmatter `slug:` when it has one
// (Astro's glob loader uses it as the entry id), else its path under
// src/content/docs without the extension. Every gate that maps a file to a
// route reads this, so a page served under a new URL is graded at that URL.
import { readFileSync } from "node:fs";
import { relative } from "node:path";

export function routeOf(contentDir, file, text = null) {
  const md = text ?? readFileSync(file, "utf8");
  const fm = /^---\n([\s\S]*?)\n---/.exec(md);
  const slug = fm && /^slug:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(fm[1]);
  if (slug) return "/" + slug[1].replace(/^\/+|\/+$/g, "");
  return "/" + relative(contentDir, file).replace(/\.mdx?$/, "").replace(/\/index$/, "");
}
