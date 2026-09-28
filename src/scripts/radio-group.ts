// A row of role="radio" buttons with a roving tabindex (WAI-ARIA radiogroup):
// click or arrow keys pick one; `onPick` gets the picked button's data value.
export function radioGroup(group: HTMLElement, attr: string, onPick: (value: string) => void): (value: string) => void {
  const btns = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
  const pick = (i: number, focus = false) => {
    btns.forEach((b, j) => { b.setAttribute("aria-checked", String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    if (focus) btns[i].focus();
    onPick(btns[i].dataset[attr] ?? "");
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
  return (value: string) => { const i = btns.findIndex((b) => (b.dataset[attr] ?? "") === value); if (i >= 0) pick(i); };
}
