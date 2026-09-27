// The credit calculator on /pricing (markup and the default result drawn at
// build time by the ```credit-calculator block). Rates and plans come from the
// JSON the block embeds, which the build reads from pricing.json and plans.json.
import { calculate, planLine, fmtInt, fmtUsd, type CalcData, type CalcMode } from "../lib/calculator";

document.querySelectorAll<HTMLFormElement>("[data-calculator]").forEach((form) => {
  let data: CalcData;
  try { data = JSON.parse(form.querySelector("[data-calc]")?.textContent ?? ""); } catch (_) { return; }
  const set = (sel: string, text: string) => { const el = form.querySelector(sel); if (el) el.textContent = text; };
  const run = () => {
    const f = new FormData(form);
    const mode = (f.get("cc-mode") as CalcMode) || "device";
    const r = calculate(data, { mode, minutes: Number(f.get("minutes")), days: Number(f.get("days")), sessions: Number(f.get("sessions")) });
    set("[data-credits]", fmtInt(r.credits));
    set("[data-usd]", fmtUsd(r.usd));
    set("[data-plan]", planLine(r, mode));
  };
  form.addEventListener("input", run);
  form.addEventListener("submit", (e) => e.preventDefault());
  run();
});
