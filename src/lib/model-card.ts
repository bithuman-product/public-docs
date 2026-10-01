// One model card, drawn the same on the landing (src/pages/index.astro) and on
// /models (the ```model-cards block, src/lib/doc-blocks.ts). Owner, 2026-10-01:
// every model "should come up with highlights, description, and supported
// devices rather than just merely stating the performance number", each with
// an image. The text is src/data/models.ts; "Runs on" is its MATRIX (the
// places marked available), never typed here. A speed line, when a caller
// passes one, stays one quiet line at the foot.
import { MODELS, runsOn, type Model } from "../data/models.ts";

export interface ModelCard {
  id: Model["id"];
  title: string;
  /** One-line description */
  line: string;
  /** The model's page (no anchor: a card links a page) */
  href: string;
  /** Two or three short facts */
  highlights: string[];
  /** Where it runs, short names, matrix order */
  runsOn: string[];
  /** Poster base path (4:5): <poster>-480.{avif,webp} */
  poster: string;
  alt: string;
  /** Emphasis tags (owner, 2026-09-30: "New" and "Hot" on Essence 2 and Expression 2) */
  tags: string[];
  generation: Model["generation"];
}

export const MODEL_TAGS = ["New", "Hot"];

export const modelCard = (m: Model): ModelCard => ({
  id: m.id, title: m.name, line: m.line, href: m.href.split("#")[0], highlights: m.highlights,
  runsOn: runsOn(m.id).map((p) => p.short), poster: m.poster, alt: m.alt,
  tags: m.generation === "current" ? MODEL_TAGS : [], generation: m.generation,
});

/** Every model, current generation first. */
export const MODEL_CARDS: ModelCard[] = MODELS.map(modelCard);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The card's HTML: the portrait, the name and tags, the line, the highlights,
 *  "Runs on" and an optional quiet note. */
export function modelCardHtml(c: ModelCard, o: { h?: 2 | 3 | "strong"; note?: string; sizes?: string } = {}): string {
  // inside a markdown page the title is <strong>, so it never joins the page outline or TOC
  const h = o.h === "strong" ? "strong" : `h${o.h ?? 3}`;
  const sizes = o.sizes ?? "(max-width: 560px) 96px, 152px";
  const tags = c.tags.length ? `<span class="tags">${c.tags.map((t) => `<span class="tag tag-${t.toLowerCase()}">${esc(t)}</span>`).join("")}</span>` : "";
  return `<a class="card card-model mcard mcard-${c.generation}" href="${esc(c.href)}">` +
    `<picture class="card-figure"><source type="image/avif" srcset="${esc(c.poster)}-480.avif" sizes="${sizes}">` +
    `<img src="${esc(c.poster)}-480.webp" sizes="${sizes}" width="480" height="600" alt="${esc(c.alt)}" loading="lazy" decoding="async"></picture>` +
    `<span class="card-body">` +
    `<span class="card-title"><${h}>${esc(c.title)}</${h}>${tags}</span>` +
    `<span class="card-line">${esc(c.line)}</span>` +
    `<span class="mcard-points" role="list">${c.highlights.map((x) => `<span class="mcard-point" role="listitem">${esc(x)}</span>`).join("")}</span>` +
    `<span class="mcard-runs"><span class="mcard-runs-k">Runs on</span> ${c.runsOn.map((p) => `<span class="mcard-place">${esc(p)}</span>`).join(`<span class="mcard-sep" aria-hidden="true"> · </span>`)}</span>` +
    (o.note ? `<span class="mcard-note">${esc(o.note)}</span>` : "") +
    `</span></a>`;
}

/** The same card as one markdown list item (the .md twins and llms files). */
export function modelCardMd(c: ModelCard, href: string, note = ""): string {
  const tags = c.tags.length ? ` (${c.tags.join(", ")})` : "";
  return `- [${c.title}](${href})${tags}: ${c.line} Highlights: ${c.highlights.join("; ")}. Runs on: ${c.runsOn.join(", ")}.${note ? ` ${note}` : ""}`;
}
