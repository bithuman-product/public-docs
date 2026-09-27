// How the performance rows group for readers (on-device first), and which
// rows run with no GPU, keyed by performance.json row id. The no-GPU list lives
// here until the emitter writes an accelerator field into performance.json;
// scripts/check-perf-render.mjs fails on an id that is not a published row.
//
// No imports, so the gate can load this file with Node alone.

export interface PerfGroup {
  id: "phone" | "browser" | "computer" | "cloud";
  title: string;
  /** Row ids, in display order */
  rows: string[];
  /** The /performance anchor that shows this group */
  anchor: string;
}

export const PERF_GROUPS: PerfGroup[] = [
  { id: "phone", title: "On a phone", anchor: "mobile", rows: ["iphone-15", "iphone-15-sustained", "android-s25plus", "android-s25plus-sustained"] },
  { id: "browser", title: "In the browser", anchor: "web", rows: ["web", "web-sustained"] },
  { id: "computer", title: "On a computer", anchor: "desktop", rows: ["macos-sdk", "macos-m4", "python-macos", "linux-cpu", "python-linux"] },
  { id: "cloud", title: "bitHuman cloud", anchor: "cloud", rows: ["cloud-gpu", "apple-serve", "cloud-cpu"] },
];

/** The configurations that render on a CPU alone, with no GPU: labelled
 *  "CPU only (no GPU)" wherever a row is shown. */
export const NO_GPU: string[] = ["linux-cpu", "python-linux", "cloud-cpu"];
