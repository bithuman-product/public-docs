// Every tab group on the site (markdown tab groups and <CodeTabs>): switch
// panels (WAI-ARIA tabs: arrows, Home and End move and select), and keep all
// groups with the same key (lang, platform, model) on the reader's last choice,
// site-wide. The clicked tab stays where it is on screen when groups above it
// change height.
import { groupOf, keyFor, STATE_NAMES, type StateName } from "../lib/ui-state";
import { readState, setState, onState } from "./platform-state";

interface Group { root: HTMLElement; tabs: HTMLElement[]; keys: string[]; name: StateName }

const groups: Group[] = [...document.querySelectorAll<HTMLElement>("[data-tabs]:not([data-tabs-ready])")].map((root) => {
  root.dataset.tabsReady = "";
  const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
  const label = (t: HTMLElement) => t.dataset.tab ?? t.textContent ?? "";
  const name = (root.dataset.group as StateName) || groupOf(tabs.map(label));
  return { root, tabs, name, keys: tabs.map((t) => t.dataset.key || keyFor(name, label(t))) };
});

const select = (g: Group, key: string) => {
  const i = g.keys.indexOf(key);
  if (i < 0) return false;
  g.tabs.forEach((t, j) => {
    const on = j === i;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    t.classList.toggle("active", on);
    document.getElementById(t.getAttribute("aria-controls") || "")?.classList.toggle("active", on);
  });
  return true;
};

const choose = (g: Group, i: number, focus = false) => {
  const t = g.tabs[i];
  const top = t.getBoundingClientRect().top;
  select(g, g.keys[i]);
  setState(g.name, g.keys[i]);
  if (focus) t.focus();
  const moved = t.getBoundingClientRect().top - top;
  if (moved) scrollBy(0, moved);
};

for (const g of groups) {
  g.tabs.forEach((t, i) => {
    t.addEventListener("click", () => choose(g, i));
    t.addEventListener("keydown", (e) => {
      const n = g.tabs.length;
      const k = e.key;
      const to = k === "ArrowRight" ? (i + 1) % n : k === "ArrowLeft" ? (i - 1 + n) % n : k === "Home" ? 0 : k === "End" ? n - 1 : -1;
      if (to < 0) return;
      e.preventDefault();
      choose(g, to, true);
    });
  });
}

onState((name, key) => groups.forEach((g) => g.name === name && select(g, key)));
for (const name of STATE_NAMES) {
  const key = readState(name);
  if (key) groups.forEach((g) => g.name === name && select(g, key));
}
