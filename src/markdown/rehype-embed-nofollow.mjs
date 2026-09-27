// A markdown link to a web-embed URL (https://www.bithuman.ai/embed/<CODE>)
// starts a live, billable session when opened. It stays a link for readers,
// and carries rel="nofollow" so crawlers do not open it.
export default function rehypeEmbedNofollow() {
  const visit = (node) => {
    if (node.type === "element" && node.tagName === "a" && /bithuman\.ai\/embed\//.test(String(node.properties?.href ?? ""))) {
      const rel = new Set([].concat(node.properties.rel ?? []).flatMap((r) => String(r).split(/\s+/)).filter(Boolean));
      rel.add("nofollow");
      node.properties.rel = [...rel];
    }
    for (const c of node.children ?? []) visit(c);
  };
  return (tree) => visit(tree);
}
