// "How many times faster than real time", as the docs print it: one decimal,
// TRUNCATED, never rounded up, so a 0.98 can never read as 1.0×. The same rule
// the performance emitter uses for the tables on /performance (its truncTenths
// works from fps and the play rate in integer arithmetic; this works from the
// x_realtime field of public/performance.json, which is fps / rate to two
// decimals). src/lib/format-multiple.test.ts proves the two agree on every
// published cell.

/** 4.16 → "4.1×", 17 → "17.0×", 0.98 → "0.9×". */
export function formatMultiple(x: number): string {
  if (typeof x !== "number" || !Number.isFinite(x) || x < 0) throw new Error(`formatMultiple: not a speed: ${x}`);
  // Integer arithmetic on thousandths, so 5.8 (5.7999…) is 5.8 and not 5.7.
  const tenths = Math.floor(Math.round(x * 1000) / 100);
  return `${(tenths / 10).toFixed(1)}×`;
}

/** The multiple straight from frames per second and the model's play rate. */
export function multipleFromFps(fps: number, rate: number): string {
  const tenths = Math.floor((Math.round(fps * 1000) * 10) / Math.round(rate * 1000));
  return `${(tenths / 10).toFixed(1)}×`;
}
