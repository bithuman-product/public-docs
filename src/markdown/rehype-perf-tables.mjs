/**
 * Lay out the generated performance tables as one cell per model.
 *
 * The performance emitter writes each speed table as six plain columns —
 * `Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps |
 * Expression 2 × real time` — because that is what an agent reading the page's
 * Markdown twin, and every gate that pins the numbers, can parse without
 * guessing. A reader does not need six columns: at 390px the table was a
 * stack of eleven labelled lines per row, and on a desktop the fourth column
 * was cut off. So at build time, and only in the HTML, each model's two cells
 * become one: the frame rate, then the multiple of real time as the same chip
 * the headline on the landing page uses.
 *
 *     | Runs on | Hardware | Essence 2 | Expression 2 |
 *     | Cloud API · GPU | NVIDIA RTX 4090 | 98 fps [3.9×] | 340 fps [17.0×] |
 *
 * Nothing is computed here. The number and the multiple are the emitter's own
 * text, moved into one cell; scripts/check-performance-floors.mjs reads the
 * served cells back and compares them with the pinned Markdown.
 *
 * A performance table (first header "Runs on") also drops a column that is a
 * dash on every row — a model the table has no measurement for — rather than
 * showing a column of dashes. Any other table is left exactly as it was.
 */

const textOf = (node) =>
  node.type === "text"
    ? node.value
    : Array.isArray(node.children)
      ? node.children.map(textOf).join("")
      : "";

const isEl = (n, tag) => n && n.type === "element" && n.tagName === tag;
const kids = (node, tag) => (node?.children ?? []).filter((c) => isEl(c, tag));
const el = (tagName, className, children, props = {}) => ({
  type: "element",
  tagName,
  properties: { ...(className ? { className: [].concat(className) } : {}), ...props },
  children,
});
const txt = (value) => ({ type: "text", value });

const DASH = "—";

/** "3.9× real time" -> {x: "3.9", rt: true}; "0.8× below real time" -> {x: "0.8", rt: false}. */
function parseMultiple(s) {
  const m = /^(\d+(?:\.\d+)?)×\s*(below\s+)?real time$/.exec(s.replace(/\s+/g, " ").trim());
  return m ? { x: m[1], rt: !m[2] } : null;
}

/** The merged cell: "98 fps" and a chip reading "3.9×". */
function mergedCell(fps, mult, align) {
  const f = fps.trim();
  if (!f || f === DASH) return el("td", "perf-cell is-dash", [txt(DASH)]);
  const p = parseMultiple(mult);
  const children = [el("span", "perf-fps", [txt(`${f} fps`)])];
  if (p) {
    const label = p.rt ? `${p.x}× real time` : `${p.x}× real time, below real time`;
    children.push(txt(" "), el("span", ["perf-x", p.rt ? "is-rt" : "is-below"], [txt(`${p.x}×`)], { title: label }));
  }
  return el("td", "perf-cell", children, align ? { align } : {});
}

function layoutTable(table) {
  const thead = kids(table, "thead")[0];
  const headRow = kids(thead, "tr")[0];
  if (!headRow) return;
  const heads = kids(headRow, "th");
  const names = heads.map((th) => textOf(th).trim());
  if (!/^runs on$/i.test(names[0] ?? "")) return;

  // columns: {kind: "keep", i} | {kind: "pair", model, fps, x}
  const cols = [];
  for (let i = 0; i < names.length; i++) {
    const m = /^(.+) fps$/.exec(names[i]);
    if (m && names[i + 1] === `${m[1]} × real time`) {
      cols.push({ kind: "pair", model: m[1], fps: i, x: i + 1 });
      i++;
    } else {
      cols.push({ kind: "keep", i });
    }
  }
  const pairs = cols.some((c) => c.kind === "pair");

  const bodies = kids(table, "tbody");
  const rows = bodies.flatMap((b) => kids(b, "tr"));
  const cellsOf = (tr) => kids(tr, "td");
  const cellText = (tr, i) => textOf(cellsOf(tr)[i] ?? { type: "text", value: "" }).trim();

  // a column that is a dash on every row is a model this table does not measure
  const isAllDash = (c) =>
    rows.length > 0 &&
    rows.every((tr) => (c.kind === "pair" ? cellText(tr, c.fps) : cellText(tr, c.i)) === DASH) &&
    !(c.kind === "keep" && c.i < 2);
  const shown = cols.filter((c) => !isAllDash(c));
  if (!pairs && shown.length === cols.length) return;

  headRow.children = shown.map((c) =>
    c.kind === "pair" ? el("th", "perf-model", [txt(c.model)]) : heads[c.i],
  );
  for (const tr of rows) {
    const cells = cellsOf(tr);
    tr.children = shown.map((c) =>
      c.kind === "pair"
        ? mergedCell(cellText(tr, c.fps), cellText(tr, c.x))
        : cells[c.i] ?? el("td", null, []),
    );
  }
  if (pairs) {
    const props = (table.properties ??= {});
    props.className = [...(props.className ?? []), "perf-table"];
  }
  return pairs;
}

/** The emitter's "Measured in … on …" line under a table reads as the table's caption. */
function captionAfter(siblings, i) {
  for (let j = i + 1; j < siblings.length; j++) {
    const n = siblings[j];
    if (n.type !== "element") continue;
    if (isEl(n, "p") && /^Measured (in|on) /.test(textOf(n).trim())) {
      const props = (n.properties ??= {});
      props.className = [...(props.className ?? []), "perf-caption"];
    }
    return;
  }
}

export default function rehypePerfTables() {
  return (tree) => {
    const walk = (node) => {
      const list = node.children ?? [];
      list.forEach((child, i) => {
        if (isEl(child, "table")) {
          if (layoutTable(child)) captionAfter(list, i);
        } else walk(child);
      });
    };
    walk(tree);
  };
}
