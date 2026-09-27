// node --test src/lib/calculator.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculate, planLine, clampInput, fmtUsd, type CalcData } from "./calculator.ts";

const plansFile = JSON.parse(readFileSync(join(import.meta.dirname, "../data/plans.json"), "utf8"));
const pricing = JSON.parse(readFileSync(join(import.meta.dirname, "../data/pricing.json"), "utf8")).realtime;
const data: CalcData = {
  rates: { device: pricing.self_hosted.by_model["essence-2"].rate, cloud: pricing.hosted.by_model["essence-2"].rate, chat: pricing.hosted.chat_line.rate },
  credits_per_usd: plansFile.topup.credits_per_usd,
  plans: plansFile.plans,
};

test("credits = minutes a day × days × sessions × the mode's rate", () => {
  const r = calculate(data, { mode: "device", minutes: 60, days: 30, sessions: 1 });
  assert.equal(r.minutes, 1800);
  assert.equal(r.credits, 1800 * data.rates.device);
  assert.equal(r.usd, r.credits / data.credits_per_usd);
  const c = calculate(data, { mode: "cloud", minutes: 10, days: 20, sessions: 3 });
  assert.equal(c.credits, 10 * 20 * 3 * data.rates.cloud);
});

test("the smallest plan whose monthly credits cover the month", () => {
  const sorted = [...data.plans].sort((a, b) => a.credits_per_month - b.credits_per_month);
  const small = calculate(data, { mode: "device", minutes: 1, days: 1, sessions: 1 });
  assert.equal(small.plan?.id, sorted[0].id);
  const justOver = sorted[0].credits_per_month + data.rates.device;
  const r = calculate(data, { mode: "device", minutes: justOver / data.rates.device, days: 1, sessions: 1 });
  assert.equal(r.plan?.id, sorted[1].id);
});

test("cloud sessions must also fit the plan's concurrent-session limit", () => {
  const creator = data.plans[0];
  const over = creator.cloud_concurrent_sessions + 1;
  const cloud = calculate(data, { mode: "cloud", minutes: 1, days: 1, sessions: over });
  assert.notEqual(cloud.plan?.id, creator.id);
  assert.ok(cloud.plan!.cloud_concurrent_sessions >= over);
  const device = calculate(data, { mode: "device", minutes: 1, days: 1, sessions: over });
  assert.equal(device.plan?.id, creator.id, "on the device only credits limit sessions");
});

test("beyond every plan: credits or sessions, never a made-up plan", () => {
  const max = Math.max(...data.plans.map((p) => p.credits_per_month));
  const big = calculate(data, { mode: "chat", minutes: 1440, days: 31, sessions: 100 });
  assert.ok(big.credits > max);
  assert.equal(big.plan, null);
  assert.equal(big.over, "credits");
  assert.match(planLine(big, "chat"), /top-up credits|contact sales/);
  const wide = calculate(data, { mode: "cloud", minutes: 1, days: 1, sessions: 5000 });
  assert.equal(wide.over, "sessions");
});

test("inputs are whole, non-negative and bounded", () => {
  assert.deepEqual(clampInput({ mode: "device", minutes: -5, days: 40, sessions: 2.7 }), { mode: "device", minutes: 0, days: 31, sessions: 2 });
  assert.deepEqual(clampInput({ mode: "cloud", minutes: Number.NaN, days: 3, sessions: 1 }).minutes, 0);
  assert.equal(calculate(data, { mode: "device", minutes: 0, days: 30, sessions: 1 }).credits, 0);
  assert.equal(fmtUsd(36), "$36.00");
});
