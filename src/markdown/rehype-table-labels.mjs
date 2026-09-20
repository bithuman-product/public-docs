/**
 * Give every table a scroll wrapper, and stamp every cell with its column name.
 *
 * A table is a grid, and a grid needs width. At 390px the four-column
 * troubleshooting tables on /sdk/cli were a column of clipped paths, and the
 * only way to read one was to drag it sideways inside a box with no visible
 * edge. Below 700px src/styles/prose.css therefore stops treating a table as a
 * grid and makes each row a card of labelled values — and a stacked cell has to
 * say which column it came from, because its header row is no longer above it.
 *
 * Done here, at build time, rather than in a script on the page: the label is
 * part of the content, so it must be there whether or not anything runs.
 * Every table on this site comes from Markdown, so every table is covered.
 *
 * The wrapper is what lets a table fill its column. Scrolling used to be put on
 * the table itself with `display: block`, and a block-level table box sizes to
 * its content rather than to `width: 100%` — which is why the performance
 * table, the whole point of its page, sat at 470px inside a 728px column. The
 * overflow now belongs to the wrapper and the table can be a table again.
 */

const textOf = (node) =>
  node.type === "text"
    ? node.value
    : Array.isArray(node.children)
      ? node.children.map(textOf).join("")
      : "";

const childrenNamed = (node, tagName) =>
  (node.children ?? []).filter((c) => c.type === "element" && c.tagName === tagName);

/** A figure, or a sentence standing in for one. */
const isFigure = (t) => /^[0-9]+(\.[0-9]+)?$/.test(t.trim());

function labelCells(table) {
  const headRow = childrenNamed(childrenNamed(table, "thead")[0] ?? {}, "tr")[0];
  if (!headRow) return;
  const names = childrenNamed(headRow, "th").map((th) => textOf(th).trim());
  if (!names.some(Boolean)) return;

  for (const body of childrenNamed(table, "tbody")) {
    for (const row of childrenNamed(body, "tr")) {
      childrenNamed(row, "td").forEach((cell, i) => {
        const props = (cell.properties ??= {});
        if (names[i]) props["data-label"] = names[i];
        // A cell in a figures column that carries a sentence instead is a
        // status, and reads as one rather than competing with the numbers.
        if (props.align === "right" && !isFigure(textOf(cell))) {
          props.className = [...(props.className ?? []), "is-status"];
        }
        // The stacked cell is a two-column grid of label and value, and a grid
        // makes every child its own item — so a value like "`render` exits 69"
        // used to scatter into three cells, its code in one and its words in
        // the next. One span holds the value together. On a wide screen the
        // span is inline and changes nothing.
        if (cell.children?.length) {
          cell.children = [{ type: "element", tagName: "span", properties: { className: ["td-v"] }, children: cell.children }];
        }
      });
    }
  }
}

export default function rehypeTableLabels() {
  return (tree) => {
    const walk = (node) => {
      const kids = node.children ?? [];
      for (let i = 0; i < kids.length; i++) {
        const child = kids[i];
        if (child.type === "element" && child.tagName === "table") {
          labelCells(child);
          kids[i] = {
            type: "element",
            tagName: "div",
            properties: { className: ["table-wrap"] },
            children: [child],
          };
          continue;
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
