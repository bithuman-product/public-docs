// The filter above the model × place matrix (/models) and the four deployment
// modes (/deploy): one choice shows one place or one mode; "All" shows every
// one. The markup is drawn at build time (src/lib/doc-blocks.ts); with
// JavaScript off the filter is hidden and everything shows.
document.querySelectorAll<HTMLElement>("[data-mx-filter]").forEach((bar) => {
  const scope = bar.parentElement!;
  const btns = [...bar.querySelectorAll<HTMLElement>("[data-mx]")];
  const deploy = bar.dataset.mxFilter === "deploy-matrix";
  const items = deploy ? [...scope.querySelectorAll<HTMLElement>("[data-mx-item]")] : [...(scope.querySelector("table")?.tBodies[0]?.rows ?? [])];
  const keys = btns.slice(1).map((b) => b.dataset.mx);
  const pick = (i: number, focus = false) => {
    const key = btns[i].dataset.mx;
    btns.forEach((b, j) => { b.setAttribute("aria-checked", String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    if (focus) btns[i].focus();
    items.forEach((el, j) => el.classList.toggle("mx-off", !!key && (deploy ? el.dataset.mxItem : keys[j]) !== key));
    scope.classList.toggle("mx-one", !!key);
  };
  btns.forEach((b, i) => {
    b.addEventListener("click", () => pick(i));
    b.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      pick((i + d + btns.length) % btns.length, true);
    });
  });
});
