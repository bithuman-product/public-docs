// <PlatformSwitcher> and <Only>: one site-wide choice (platform or model),
// read from the URL, then storage, then the switcher's default; a pick shows
// the matching <Only> blocks, is remembered, and switches the matching tab
// groups (src/scripts/tabs-sync.ts listens for the same event).
import { readState, setState, onState } from "./platform-state";
import type { StateName } from "../lib/ui-state";

document.querySelectorAll<HTMLElement>("[data-switcher]").forEach((sw) => {
  const name = (sw.dataset.state || "platform") as StateName;
  const radios = [...sw.querySelectorAll<HTMLElement>('[role="radio"]')];
  const keys = radios.map((r) => r.dataset.key!);
  const status = sw.nextElementSibling?.matches("[data-switcher-status]") ? (sw.nextElementSibling as HTMLElement) : null;

  const show = (key: string, focus = false) => {
    if (!keys.includes(key)) return;
    radios.forEach((r) => {
      const on = r.dataset.key === key;
      r.setAttribute("aria-checked", String(on));
      r.tabIndex = on ? 0 : -1;
      if (on && focus) r.focus();
    });
    document.querySelectorAll<HTMLElement>(`[data-only][data-only-state="${name}"]`).forEach((el) => el.classList.toggle("on", el.dataset.only === key));
  };
  const pick = (i: number, focus = false) => {
    show(keys[i], focus);
    setState(name, keys[i], sw.hasAttribute("data-url"));
    if (status) status.textContent = `Showing ${radios[i].textContent?.trim()}.`;
  };
  radios.forEach((r, i) => {
    r.addEventListener("click", () => pick(i));
    r.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      pick((i + d + radios.length) % radios.length, true);
    });
  });
  onState((n, k) => { if (n === name) show(k); });
  const start = readState(name, keys, sw.dataset.default ?? keys[0]);
  if (start) show(start);
});
