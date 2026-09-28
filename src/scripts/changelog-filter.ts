// The changelog's platform filter: "All" or one tag. Hides the releases of
// other platforms and any month left empty, and keeps the choice in ?tag= so a
// filtered view can be shared. The markup is static; this only toggles `hidden`.
const bar = document.querySelector<HTMLElement>(".cl-filter");
if (bar) {
  const buttons = [...bar.querySelectorAll<HTMLButtonElement>(".cl-f")];
  const entries = [...document.querySelectorAll<HTMLElement>(".cl-entry")];
  const cards = [...document.querySelectorAll<HTMLElement>(".hl-grid > li")];
  const count = document.querySelector<HTMLElement>(".cl-count");
  const months = [...document.querySelectorAll<HTMLElement>(".prose h2")].filter((h) => h.nextElementSibling?.classList.contains("cl-entry"));

  const apply = (tag: string, remember: boolean) => {
    for (const b of buttons) b.setAttribute("aria-pressed", String((b.dataset.tag ?? "") === tag));
    let shown = 0;
    for (const e of entries) {
      e.hidden = !!tag && e.dataset.tag !== tag;
      if (!e.hidden) shown++;
    }
    for (const c of cards) c.hidden = !!tag && c.dataset.tag !== tag;
    // the Highlights heading and its line go with the last visible card
    const grid = cards[0]?.parentElement;
    if (grid) {
      const none = cards.every((c) => c.hidden);
      for (let el: Element | null = grid; el; el = el.previousElementSibling) {
        (el as HTMLElement).hidden = none;
        if (el.tagName === "H2") break;
      }
    }
    for (const h of months) {
      let el = h.nextElementSibling as HTMLElement | null;
      let any = false;
      while (el && el.tagName !== "H2") { if (el.classList.contains("cl-entry") && !el.hidden) any = true; el = el.nextElementSibling as HTMLElement | null; }
      h.hidden = !any;
    }
    if (count) {
      const label = buttons.find((b) => b.dataset.tag === tag)?.textContent ?? "";
      count.textContent = tag ? `${shown} ${label} release${shown === 1 ? "" : "s"}` : "";
      count.hidden = !tag;
    }
    if (remember) {
      const u = new URL(location.href);
      if (tag) u.searchParams.set("tag", tag); else u.searchParams.delete("tag");
      history.replaceState(history.state, "", u);
    }
  };

  bar.hidden = false;
  bar.addEventListener("click", (ev) => {
    const b = (ev.target as Element).closest<HTMLButtonElement>(".cl-f");
    if (b) apply(b.dataset.tag ?? "", true);
  });
  const start = new URL(location.href).searchParams.get("tag") ?? "";
  if (start && buttons.some((b) => b.dataset.tag === start)) apply(start, false);
}
