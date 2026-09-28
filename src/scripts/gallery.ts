// The example gallery's filters (the ```example-gallery block): where it
// renders, the model and the platform narrow the cards. With JavaScript off
// the filters are hidden and every card shows.
import { radioGroup } from "./radio-group";

document.querySelectorAll<HTMLElement>("[data-gallery]").forEach((root) => {
  const items = [...root.querySelectorAll<HTMLElement>(".gal-item")];
  const status = root.querySelector<HTMLElement>("[data-gal-status]")!;
  const empty = root.querySelector<HTMLElement>("[data-gal-empty]")!;
  const f = { where: "", models: "", platform: "" };
  const apply = () => {
    let n = 0;
    for (const it of items) {
      const ok = (!f.where || it.dataset.where!.split(" ").includes(f.where)) && (!f.models || it.dataset.models!.split(" ").includes(f.models)) && (!f.platform || it.dataset.platform === f.platform);
      it.hidden = !ok;
      if (ok) n++;
    }
    empty.hidden = n > 0;
    status.textContent = `Showing ${n} of ${items.length} examples.`;
  };
  const set: Record<string, (v: string) => void> = {};
  root.querySelectorAll<HTMLElement>('[role="radiogroup"][data-g]').forEach((g) => {
    const key = g.dataset.g as "where" | "models";
    set[key] = radioGroup(g, "f", (v) => { f[key] = v; apply(); });
  });
  const sel = root.querySelector<HTMLSelectElement>("select[data-g]")!;
  sel.addEventListener("change", () => { f.platform = sel.value; apply(); });
  root.querySelector("[data-gal-reset]")?.addEventListener("click", () => { set.where?.(""); set.models?.(""); sel.value = ""; f.platform = ""; apply(); });
});
