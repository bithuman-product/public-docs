// A recipe's steps (src/markdown/rehype-walkthrough.mjs): "Done" ticks kept in
// browser storage (bh.walk.<page>; the page reads fine without them), a
// progress bar, and a finish line when every step is ticked.
document.querySelectorAll<HTMLElement>("[data-walk]").forEach((root) => {
  const key = `bh.walk.${root.dataset.walk}`;
  const total = Number(root.dataset.walkTotal);
  const btns = [...root.querySelectorAll<HTMLButtonElement>("[data-walk-done]")];
  let done = new Set<string>();
  try { done = new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch {}
  const fill = root.querySelector<HTMLElement>("[data-walk-fill]")!;
  const status = root.querySelector<HTMLElement>("[data-walk-status]")!;
  const finish = root.querySelector<HTMLElement>("[data-walk-finish]")!;
  const draw = () => {
    for (const b of btns) {
      const on = done.has(b.dataset.walkDone!);
      b.setAttribute("aria-pressed", String(on));
      b.closest(".walk-step")!.classList.toggle("is-done", on);
    }
    const n = btns.filter((b) => done.has(b.dataset.walkDone!)).length;
    fill.style.setProperty("--v", String(n / total));
    status.textContent = n ? `${n} of ${total} steps done` : `${total} steps`;
    finish.hidden = n < total;
  };
  for (const b of btns) b.addEventListener("click", () => {
    const k = b.dataset.walkDone!;
    if (done.has(k)) done.delete(k); else done.add(k);
    try { localStorage.setItem(key, JSON.stringify([...done])); } catch {}
    draw();
  });
  draw();
});
