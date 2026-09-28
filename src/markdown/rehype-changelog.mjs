// On /changelog (and its archive): each release heading and the text under it
// become one <section class="cl-entry" data-tag="…">, and a platform tag chip
// follows the heading, so readers can see and filter what applies to them
// (the filter is the ```changelog-filter block, src/components/ChangelogFilter.astro).
// Headings keep their text, so their ids and every link to them are unchanged.
import { tagOf, tagLabel } from "../lib/changelog.ts";

const text = (n) => (n.type === "text" ? n.value : (n.children || []).map(text).join(""));
const isHeading = (n, max) => n.type === "element" && /^h[1-6]$/.test(n.tagName) && Number(n.tagName[1]) <= max;

export default function rehypeChangelog() {
  return (tree, file) => {
    const path = String(file?.path ?? "");
    if (!/content\/docs\/changelog(\.md|\/archive\.md)$/.test(path)) return;
    const out = [];
    let cur = null;
    for (const node of tree.children) {
      if (isHeading(node, 2)) { cur = null; out.push(node); continue; }
      if (node.type === "element" && node.tagName === "h3") {
        const tag = tagOf(text(node));
        cur = {
          type: "element", tagName: "section",
          properties: { className: ["cl-entry"], dataTag: tag },
          children: [
            node,
            { type: "element", tagName: "p", properties: { className: ["cl-tags"] },
              children: [{ type: "element", tagName: "span", properties: { className: ["chip", "cl-chip"], dataTag: tag }, children: [{ type: "text", value: tagLabel(tag) }] }] },
          ],
        };
        out.push(cur);
        continue;
      }
      if (cur) cur.children.push(node);
      else out.push(node);
    }
    tree.children = out;
  };
}
