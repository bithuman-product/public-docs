/**
 * Stamp every table cell with the name of its column.
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
 */

const textOf = (node) =>
  node.type === "text"
    ? node.value
    : Array.isArray(node.children)
      ? node.children.map(textOf).join("")
      : "";

const childrenNamed = (node, tagName) =>
  (node.children ?? []).filter((c) => c.type === "element" && c.tagName === tagName);

function labelCells(table) {
  const headRow = childrenNamed(childrenNamed(table, "thead")[0] ?? {}, "tr")[0];
  if (!headRow) return;
  const names = childrenNamed(headRow, "th").map((th) => textOf(th).trim());
  if (!names.some(Boolean)) return;

  for (const body of childrenNamed(table, "tbody")) {
    for (const row of childrenNamed(body, "tr")) {
      childrenNamed(row, "td").forEach((cell, i) => {
        if (names[i]) (cell.properties ??= {})["data-label"] = names[i];
      });
    }
  }
}

export default function rehypeTableLabels() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === "element" && node.tagName === "table") labelCells(node);
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
