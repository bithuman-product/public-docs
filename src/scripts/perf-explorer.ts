// The performance explorer on /performance (markup drawn at build time by the
// ```perf-explorer block, src/lib/doc-blocks.ts): a model switch that follows
// the reader's site-wide model choice, and the held-for-10-minutes rows. With
// JavaScript off both models and every row show, stacked.
import { readState, setState, onState } from "./platform-state";

document.querySelectorAll<HTMLElement>("[data-perf-explorer]").forEach((root) => {
  const radios = [...root.querySelectorAll<HTMLElement>('[role="radio"][data-model]')];
  const models = radios.map((r) => r.dataset.model!);
  const held = root.querySelector<HTMLInputElement>("[data-held]");
  const status = root.querySelector<HTMLElement>("[data-pe-status]");
  const name = (m: string) => radios.find((r) => r.dataset.model === m)?.textContent ?? m;
  const say = () => { if (status) status.textContent = `Showing ${name(root.dataset.model!)}${held?.checked ? ", with the rows held for 10 minutes" : ""}.`; };

  const show = (m: string, focus = false) => {
    radios.forEach((r) => {
      const on = r.dataset.model === m;
      r.setAttribute("aria-checked", String(on));
      r.tabIndex = on ? 0 : -1;
      if (on && focus) r.focus();
    });
    root.dataset.model = m;
  };
  radios.forEach((r, i) => {
    r.addEventListener("click", () => { show(models[i]); setState("model", models[i]); say(); });
    r.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const m = models[(i + d + models.length) % models.length];
      show(m, true); setState("model", m); say();
    });
  });
  held?.addEventListener("change", () => { root.toggleAttribute("data-held", held.checked); say(); });
  onState((n, k) => { if (n === "model" && models.includes(k)) show(k); });
  show(readState("model", models, models[0])!);
});
