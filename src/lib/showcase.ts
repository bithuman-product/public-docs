// Real captures on the page: a ```figure block (one capture, in its device
// frame, with its provenance) and the ```example-gallery block (every example
// as a card, with filters). Both are drawn at build time from
// src/data/examples.ts; src/scripts/figure.ts plays a muted loop only while
// it is on screen, and swaps in the recording with sound and captions on a
// click; src/scripts/gallery.ts filters the cards. With JavaScript off the
// poster shows and "Play with sound" opens the MP4.
import { CAPTURES, EXAMPLES, MORE_ON_GITHUB, PLATFORM_LABEL, WHERE_LABEL, media, provenanceLine, repoUrl, type CaptureId, type Example } from "../data/examples.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MODEL_NAME = { "essence-2": "Essence 2", "expression-2": "Expression 2" } as const;
const SITE = "https://docs.bithuman.ai";

function capture(id: string) {
  const c = (CAPTURES as Record<string, (typeof CAPTURES)[CaptureId]>)[id];
  if (!c) throw new Error(`unknown capture "${id}" (${Object.keys(CAPTURES).join(", ")})`);
  return c;
}

/** The framed poster, loop and sound button a figure and a gallery card share. */
function mediaHtml(id: CaptureId, opts: { eager?: boolean; sizes: string; sound: boolean }): string {
  const c = CAPTURES[id];
  const m = media(id);
  const loop = m.loopAv1
    ? `<video class="fig-loop" muted playsinline loop preload="none" aria-hidden="true" tabindex="-1" data-loop>` +
      `<source src="${m.loopAv1}" type='video/mp4; codecs="av01.0.05M.08"'><source src="${m.loopH264}" type="video/mp4"></video>`
    : "";
  const sound = opts.sound && m.clip
    ? `<a class="fig-sound" href="${m.clip}" data-sound="${m.clip}" data-vtt="${m.captions}" data-w="${c.width}" data-h="${c.height}">` +
      `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>` +
      `Play with sound<span class="sr"> (${Math.round(c.clip!.seconds)} seconds, captions)</span></a>`
    : "";
  return `<div class="fig-media dev dev-${c.frame}" style="aspect-ratio:${c.width}/${c.height}">` +
    `<picture><source type="image/avif" srcset="${m.posterAvif}"><img src="${m.posterWebp}" width="${c.width}" height="${c.height}" alt="${esc(c.alt)}"` +
    ` sizes="${opts.sizes}" loading="${opts.eager ? "eager" : "lazy"}"${opts.eager ? ` fetchpriority="high"` : ""} decoding="async"></picture>` +
    loop + sound + `</div>`;
}

/** ```figure <capture id> — one capture with its provenance. */
export function figureBlock(arg: string, mode: "page" | "twin"): string {
  const [id, ...flags] = arg.split(/\s+/);
  const c = capture(id);
  const m = media(c.id);
  if (mode === "twin") {
    return `*Capture: ${c.alt}. ${provenanceLine(c.id)}.${c.provenance.note ? ` ${c.provenance.note}` : ""}* (${SITE}${m.clip ?? m.posterWebp})\n`;
  }
  const eager = flags.includes("eager");
  const note = c.provenance.note ? ` ${esc(c.provenance.note)}` : "";
  return `<figure class="fig" data-fig data-pagefind-ignore="all">${mediaHtml(c.id, { eager, sizes: "(max-width: 760px) 240px, 320px", sound: true })}` +
    // One 12 px caption line; the full provenance sits behind a disclosure (and stays whole in the twin).
    `<figcaption><span class="fig-cap">Measured with ${esc(c.provenance.release)}</span>` +
    `<details class="fig-more"><summary>Capture details</summary><span class="fig-prov">${esc(provenanceLine(c.id))}.${note}</span></details></figcaption></figure>`;
}

const chips = (e: Example) =>
  [...e.where.map((w) => WHERE_LABEL[w]), ...e.models.map((m) => MODEL_NAME[m])].map((t) => `<span class="chip">${esc(t)}</span>`).join("");

function card(e: Example, i: number): string {
  const c = CAPTURES[e.capture];
  return `<li class="gal-item" data-where="${e.where.join(" ")}" data-models="${e.models.join(" ")}" data-platform="${e.platform}">` +
    `<article class="card gal-card"><div class="gal-stage" data-fig>${mediaHtml(e.capture, { eager: i === 0, sizes: "180px", sound: false })}</div>` +
    `<div class="card-body"><span class="gal-head"><span class="card-title"><span class="gal-title"><a class="gal-link" href="${e.href}">${esc(e.title)}</a></span></span>` +
    `</span>` +
    `<span class="card-line">${esc(e.line)}</span>` +
    `<span class="card-chips">${chips(e)}</span>` +
    (e.note ? `<span class="gal-note"><a href="${e.note[1]}">${esc(e.note[0])}</a>${esc(e.note[2])}</span>` : "") +
    `<span class="gal-prov">${esc(provenanceLine(c.id))}</span>` +
    `<span class="gal-get"><code>${esc(e.get)}</code></span></div></article></li>`;
}

/** ```example-gallery — every example as a card, with filters. */
export function galleryBlock(mode: "page" | "twin"): string {
  if (mode === "twin") {
    const rows = EXAMPLES.map((e) => `- [${e.title}](${e.href}): ${e.line} ${e.where.map((w) => WHERE_LABEL[w]).join(", ")}; ${e.models.map((m) => MODEL_NAME[m]).join(", ")}. Get it: \`${e.get}\`.${e.note ? ` [${e.note[0]}](${e.note[1]})${e.note[2]}` : ""} ${provenanceLine(e.capture)}.`);
    return `${rows.join("\n")}\n`;
  }
  const where = (["", "device", "no-gpu", "servers", "cloud"] as const).map((w, i) =>
    `<button type="button" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-f="${w}">${w ? esc(WHERE_LABEL[w]) : "Everywhere"}</button>`).join("");
  const models = (["", "essence-2", "expression-2"] as const).map((m, i) =>
    `<button type="button" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-f="${m}">${m ? MODEL_NAME[m] : "Both models"}</button>`).join("");
  const platforms = [...new Set(EXAMPLES.map((e) => e.platform))];
  const select = `<label class="gal-sel"><span class="sr">Platform</span><select data-g="platform"><option value="">Every platform</option>` +
    platforms.map((p) => `<option value="${p}">${esc(PLATFORM_LABEL[p])}</option>`).join("") + `</select></label>`;
  return `<div class="gal" data-gallery data-pagefind-ignore="all">` +
    `<div class="gal-filters"><div class="seg" role="radiogroup" aria-label="Where it renders" data-g="where">${where}</div>` +
    `<div class="gal-row2"><div class="seg" role="radiogroup" aria-label="Model" data-g="models">${models}</div>${select}</div></div>` +
    `<ul class="gal-grid" role="list">${EXAMPLES.map(card).join("")}</ul>` +
    `<p class="gal-status" aria-live="polite" data-gal-status>${EXAMPLES.length} examples, each recorded on the device named under it.</p>` +
    `<p class="gal-empty" data-gal-empty hidden>No example matches these filters. <button type="button" data-gal-reset>Show all</button></p></div>`;
}

/** ```github-examples — complete projects in bithuman-examples with no recording here yet. */
export function githubBlock(mode: "page" | "twin"): string {
  if (mode === "twin") return MORE_ON_GITHUB.map((g) => `- [${g.title}](${repoUrl(g.path)}) (\`${g.path}\`): ${g.line}${g.href ? ` ([guide](${g.href}))` : ""}`).join("\n") + "\n";
  return `<ul class="gal-gh" role="list">` + MORE_ON_GITHUB.map((g) =>
    `<li><a class="gal-gh-repo" href="${repoUrl(g.path)}" rel="noopener"><strong>${esc(g.title)}</strong><code>${esc(g.path)}</code></a>` +
    `<span class="gal-gh-line">${esc(g.line)}${g.href ? ` <a href="${g.href}">Guide</a>` : ""}</span></li>`).join("") + `</ul>`;
}
