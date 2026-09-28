// "What leaves your hardware" on /deploy/privacy (the ```dataflow-explorer
// block): one mode at a time. With JavaScript off every mode shows.
import { radioGroup } from "./radio-group";

document.querySelectorAll<HTMLElement>("[data-dfx-root]").forEach((root) => {
  const panels = [...root.querySelectorAll<HTMLElement>("[data-dfx-panel]")];
  radioGroup(root.querySelector<HTMLElement>('[role="radiogroup"]')!, "dfx", (m) => {
    for (const p of panels) p.classList.toggle("on", p.dataset.dfxPanel === m);
  });
});
