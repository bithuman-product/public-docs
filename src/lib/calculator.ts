// The credit calculator's arithmetic (the /pricing calculator, docs spec §4.2
// #7): minutes a day × days × sessions at once × the mode's rate. Rates and
// plans are passed in from pricing.json and plans.json, never typed here.
// Shared by the build (the static result and worked examples), the browser
// script (src/scripts/calculator.ts) and the unit tests.

export type CalcMode = "device" | "cloud" | "chat";

export interface CalcPlan {
  id: string;
  name: string;
  monthly_usd: number;
  credits_per_month: number;
  cloud_concurrent_sessions: number;
}

export interface CalcData {
  /** credits per minute for each mode */
  rates: Record<CalcMode, number>;
  credits_per_usd: number;
  plans: CalcPlan[];
}

export interface CalcInput { mode: CalcMode; minutes: number; days: number; sessions: number }

export interface CalcResult {
  minutes: number;
  credits: number;
  usd: number;
  /** The smallest plan whose monthly credits cover the month (and, in the
   *  cloud, whose concurrent-session limit covers the sessions), or null. */
  plan: CalcPlan | null;
  /** Why no plan covers it: more credits, or more concurrent cloud sessions, than any plan */
  over: "credits" | "sessions" | null;
}

/** Sessions in the bitHuman cloud count against the plan's concurrent-session limit. */
export const inCloud = (mode: CalcMode) => mode !== "device";

const whole = (n: number, max: number) => (Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : 0);

/** Clamp a reader's input to whole, non-negative numbers in range. */
export function clampInput(i: CalcInput): CalcInput {
  return { mode: i.mode, minutes: whole(i.minutes, 1440), days: whole(i.days, 31), sessions: whole(i.sessions, 10000) };
}

export function calculate(data: CalcData, input: CalcInput): CalcResult {
  const i = clampInput(input);
  const minutes = i.minutes * i.days * i.sessions;
  const credits = minutes * data.rates[i.mode];
  const usd = credits / data.credits_per_usd;
  const byCredits = data.plans.filter((p) => p.credits_per_month >= credits);
  const fits = byCredits.filter((p) => !inCloud(i.mode) || p.cloud_concurrent_sessions >= i.sessions);
  const plan = fits[0] ?? null;
  const over = plan ? null : byCredits.length ? "sessions" : "credits";
  return { minutes, credits, usd, plan, over };
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtUsd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The sentence under the numbers: which plan covers it. */
export function planLine(r: CalcResult, mode: CalcMode): string {
  if (r.credits === 0) return "Enter the minutes, days and sessions you expect.";
  if (r.plan) {
    const cloud = inCloud(mode) ? ` and ${r.plan.cloud_concurrent_sessions} concurrent cloud sessions` : "";
    return `Covered by the ${r.plan.name} plan: $${r.plan.monthly_usd} a month for ${fmtInt(r.plan.credits_per_month)} credits${cloud}.`;
  }
  if (r.over === "sessions") return "More concurrent cloud sessions than any plan allows: contact sales for a custom plan.";
  return "More than any plan's monthly credits: add top-up credits, or contact sales for a custom plan.";
}
