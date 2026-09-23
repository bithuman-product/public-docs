// The markdown an agent reads for a page: its title, URL and description, then
// its body with site-relative links made absolute and generator markers
// (<!-- FLOORS:… -->, <!-- VERSIONS:… -->, region markers) removed. Used by the
// per-page .md twins and by /llms-full.txt, so both carry the same text.

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

export function twin(title: string, route: string, description: string, body: string): string {
  const url = `${SITE}${route === "/" ? "" : route}`;
  let out = `# ${title}\n\nURL: ${url}\n`;
  if (description) out += `\n> ${description}\n`;
  out += `\n${absolutize(stripComments(body)).trim()}\n`;
  return out;
}
