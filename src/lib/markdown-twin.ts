// The markdown an agent reads for a page: its title, URL and description, then
// its body with site-relative links made absolute, generator markers
// (<!-- FLOORS:… -->, <!-- VERSIONS:… -->, region markers) removed, and the
// generated blocks (```perf, ```model-matrix, …) drawn as plain markdown. Used by the
// per-page .md twins and by /llms-full.txt, so both carry the same text.

import { expandBlocks } from "./doc-blocks.ts";

export const SITE = "https://docs.bithuman.ai";

/** `](/path)` → `](https://docs.bithuman.ai/path)` outside fenced code. */
export function absolutize(md: string): string {
  return md
    .split(/(^```[\s\S]*?^```[ \t]*$)/m)
    .map((part, i) => (i % 2 ? part : part.replace(/\]\(\/(?!\/)/g, `](${SITE}/`)))
    .join("");
}

/** Drop every HTML comment outside fenced code. */
export function stripComments(md: string): string {
  return md
    .split(/(^```[\s\S]*?^```[ \t]*$)/m)
    .map((part, i) => (i % 2 ? part : part.replace(/<!--[\s\S]*?-->\n?/g, "")))
    .join("");
}

/** Page layout HTML an agent does not need: the lead's wrappers go, and a
 *  captured figure becomes one line naming what it shows and where it is. */
export function unwrapLayout(md: string): string {
  return md
    .split(/(^```[\s\S]*?^```[ \t]*$)/m)
    .map((part, i) => (i % 2 ? part : part
      .replace(/^<div class="lead(?:-text)?">\n|^<\/div>\n/gm, "")
      .replace(/<figure class="showcase">([\s\S]*?)<\/figure>/g, (_, inner: string) => {
        const src = /\b(?:src|poster)="([^"]+)"/.exec(inner)?.[1];
        const cap = (/<figcaption>([\s\S]*?)<\/figcaption>/.exec(inner)?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        return `*Capture: ${cap}*${src ? ` (${src.startsWith("/") ? SITE + src : src})` : ""}`;
      })
      .replace(/\n{3,}/g, "\n\n")))
    .join("");
}

export function twin(title: string, route: string, description: string, body: string): string {
  const url = `${SITE}${route === "/" ? "" : route}`;
  let out = `# ${title}\n\nURL: ${url}\n`;
  if (description) out += `\n> ${description}\n`;
  out += `\n${absolutize(unwrapLayout(expandBlocks(stripComments(body)))).trim()}\n`;
  return out;
}
