/**
 * Name the kind of a callout so the stylesheet can tell them apart.
 *
 * Every callout on the site is a blockquote whose first words are bold:
 * `> **Note** …`, `> **Tip — …** …`, `> **Warning** …`, `> **Important for
 * self-hosters.** …`. All 134 of them rendered as the same coral box, so a
 * warning looked like a footnote. This reads that leading bold label and adds
 * `is-note`, `is-tip`, `is-warning` or `is-important` to the blockquote; the
 * stylesheet gives each its own border colour and glyph. A quote with no such
 * label keeps the default box. No new authoring syntax: an author still types
 * a Markdown blockquote, and if this step ever went away nothing would render
 * wrongly — the label is real text either way.
 */

const KINDS = { note: "is-note", tip: "is-tip", warning: "is-warning", important: "is-important" };

const textOf = (node) =>
  node.type === "text"
    ? node.value
    : Array.isArray(node.children)
      ? node.children.map(textOf).join("")
      : "";

const isEl = (n, tag) => n.type === "element" && n.tagName === tag;

/** The bold label a callout opens with, or nothing. */
function kindOf(quote) {
  const p = (quote.children ?? []).find((c) => isEl(c, "p"));
  if (!p) return;
  const first = (p.children ?? []).find((c) => !(c.type === "text" && !c.value.trim()));
  if (!first || !isEl(first, "strong")) return;
  const m = /^\s*(note|tip|warning|important)\b/i.exec(textOf(first));
  return m && KINDS[m[1].toLowerCase()];
}

export default function rehypeCallouts() {
  return (tree) => {
    const walk = (node) => {
      for (const child of node.children ?? []) {
        if (isEl(child, "blockquote")) {
          const kind = kindOf(child);
          if (kind) {
            const props = (child.properties ??= {});
            props.className = [...(props.className ?? []), kind];
          }
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
