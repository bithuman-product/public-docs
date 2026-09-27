// Tab groups written in markdown (src/markdown/remark-code-tabs.mjs): switch
// panels, and follow the language the reader picked last, site-wide.
const KEY = "bh-code-lang";
const groups = [...document.querySelectorAll<HTMLElement>("[data-md-tabs]")];
const select = (root: HTMLElement, label: string, focus = false) => {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>(".mdt-tab")];
  const hit = tabs.find((t) => t.dataset.tab === label);
  if (!hit) return;
  for (const t of tabs) {
    const on = t === hit;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    root.querySelector(`#${t.getAttribute("aria-controls")}`)?.classList.toggle("active", on);
  }
  if (focus) hit.focus();
};
for (const root of groups) {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>(".mdt-tab")];
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => {
      const label = t.dataset.tab!;
      try { localStorage.setItem(KEY, label); } catch (_) {}
      document.dispatchEvent(new CustomEvent(KEY, { detail: label }));
    });
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(root, tabs[(i + d + tabs.length) % tabs.length].dataset.tab!, true);
    });
  });
}
document.addEventListener(KEY, (e) => groups.forEach((g) => select(g, (e as CustomEvent).detail)));
try { const saved = localStorage.getItem(KEY); if (saved) groups.forEach((g) => select(g, saved)); } catch (_) {}
