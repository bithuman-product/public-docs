// Consecutive fenced blocks that each carry `tab="Label"` in their meta become
// one tab group:
//
//   ```bash tab="curl"          ```python tab="Python"
//
// Static at build time: with JavaScript off every panel shows, stacked under
// its label; with it on (the `.js` class Base sets) one panel shows and the
// tab bar switches them (src/scripts/md-tabs.ts), remembering the reader's
// language across the site.
const TAB = /\btab="([^"]+)"/;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export default function remarkCodeTabs() {
  return (tree) => {
    let group = 0;
    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      const kids = node.children;
      for (let i = 0; i < kids.length; i++) {
        const tab = (n) => n && n.type === "code" && TAB.exec(n.meta || "");
        if (!tab(kids[i]) || !tab(kids[i + 1])) { walk(kids[i]); out.push(kids[i]); continue; }
        const run = [];
        while (tab(kids[i])) run.push(kids[i++]);
        i--;
        const g = `mdt-${++group}`;
        const labels = run.map((c) => TAB.exec(c.meta)[1]);
        const html = (value) => ({ type: "html", value });
        out.push(html(
          `<div class="md-tabs" data-md-tabs><div class="mdt-bar" role="tablist" aria-label="Code examples">` +
          labels.map((l, k) => `<button type="button" role="tab" class="mdt-tab" id="${g}-${k}" aria-controls="${g}-${k}-p" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}" data-tab="${esc(l)}">${esc(l)}</button>`).join("") +
          `</div>`));
        run.forEach((c, k) => {
          c.meta = (c.meta || "").replace(TAB, "").trim() || null;
          out.push(html(`<div class="mdt-panel${k === 0 ? " active" : ""}" role="tabpanel" id="${g}-${k}-p" aria-labelledby="${g}-${k}" data-tab="${esc(labels[k])}"><p class="mdt-label">${esc(labels[k])}</p>`));
          out.push(c);
          out.push(html(`</div>`));
        });
        out.push(html(`</div>`));
      }
      node.children = out;
    };
    walk(tree);
  };
}
