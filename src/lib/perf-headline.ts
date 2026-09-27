// The generated performance headline (src/partials/performance-headline.md,
// written by the performance emitter) read as data: one row per model, one cell
// per platform. Nothing here is typed by hand; if the emitter's table shape
// changes, headlineData() returns null and callers draw nothing.
import raw from "../partials/performance-headline.md?raw";

export interface HeadlineCell {
  platform: string;
  /** e.g. "4.1×" as the emitter wrote it */
  multiple: string;
  /** the same, as a number (times real time) */
  value: number;
}
export interface HeadlineRow { model: string; cells: HeadlineCell[] }

export function headlineData(): HeadlineRow[] | null {
  const md = raw.replace(/<!--[\s\S]*?-->/g, "");
  const rows = md.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim().replace(/\*\*/g, "")));
  const [head, ...body] = rows;
  if (!head || body.length === 0 || !body.every((r) => r.length === head.length)) return null;
  const out = body.map((r) => ({
    model: r[0],
    cells: r.slice(1).map((c, i) => {
      const multiple = (c.split("·")[1] ?? "").trim();
      return { platform: head[i + 1], multiple, value: parseFloat(multiple) };
    }),
  }));
  return out.every((r) => r.cells.every((c) => c.multiple && Number.isFinite(c.value))) ? out : null;
}
