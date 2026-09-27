// node --test src/lib/format-multiple.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatMultiple, multipleFromFps } from "./format-multiple.ts";

test("truncates to one decimal, never rounds up", () => {
  assert.equal(formatMultiple(4.16), "4.1×");
  assert.equal(formatMultiple(2.08), "2.0×");
  assert.equal(formatMultiple(0.98), "0.9×");
  assert.equal(formatMultiple(0.999), "0.9×");
  assert.equal(formatMultiple(1), "1.0×");
  assert.equal(formatMultiple(17), "17.0×");
  assert.equal(formatMultiple(123.45), "123.4×");
});

test("a float just under a tenth is still that tenth", () => {
  // 5.8 * 10 is 57.99999999999999 in binary floating point
  assert.equal(formatMultiple(5.8), "5.8×");
  assert.equal(formatMultiple(8.4), "8.4×");
  assert.equal(formatMultiple(2.2), "2.2×");
  assert.equal(formatMultiple(4.35), "4.3×");
});

test("refuses what is not a speed", () => {
  assert.throws(() => formatMultiple(Number.NaN));
  assert.throws(() => formatMultiple(-1));
  assert.throws(() => formatMultiple(Infinity));
});

test("agrees with the emitter's truncTenths(fps, rate) on every published cell", () => {
  const perf = JSON.parse(readFileSync(join(import.meta.dirname, "../../public/performance.json"), "utf8"));
  let n = 0;
  for (const row of perf.rows) {
    for (const [model, cell] of Object.entries<any>(row.cells)) {
      if (!cell || cell.fps == null) continue;
      const rate = perf.models[model].fps;
      assert.equal(formatMultiple(cell.x_realtime), multipleFromFps(cell.fps, rate), `${row.id} ${model}`);
      n++;
    }
  }
  assert.ok(n >= 20, `only ${n} cells read from performance.json`);
});

test("the emitter's own examples", () => {
  assert.equal(multipleFromFps(357, 20), "17.8×");
  assert.equal(multipleFromFps(104, 25), "4.1×");
  assert.equal(multipleFromFps(49, 50), "0.9×");
});
