// The home page's "Runs everywhere" band: six real configurations, on-device
// first, each drawn as a device frame with two × real time chips. Only row ids
// live here; every number comes from public/performance.json at build time.
// scripts/check-perf-render.mjs fails when an id is missing or unpublished.
//
// No imports, so the gate can load this file with Node alone.

export type DeviceKind = "iphone" | "android" | "mac" | "browser" | "linux-pc" | "terminal" | "cloud";

export interface BandFrame {
  /** What the frame is called on the page */
  title: string;
  /** The line under the title (the hardware comes from the JSON) */
  where: string;
  device: DeviceKind;
  /** The performance.json row whose multiples the chips show */
  row: string;
  /** A 10-minute sustained row for the same device, shown as "held 10 min" */
  held?: string;
  /** The page that tells this story (never an anchor) */
  href: string;
}

export const PERF_BAND: BandFrame[] = [
  { title: "iPhone", where: "Renders on the device", device: "iphone", row: "iphone-15", held: "iphone-15-sustained", href: "/platforms/ios" },
  { title: "Android", where: "Renders on the device", device: "android", row: "android-s25plus", held: "android-s25plus-sustained", href: "/platforms/android" },
  { title: "Browser", where: "In the browser (WebGPU)", device: "browser", row: "web", href: "/platforms/web" },
  { title: "Linux PC", where: "No GPU", device: "linux-pc", row: "linux-cpu", href: "/deploy/cpu" },
  { title: "Mac", where: "Renders on the device", device: "mac", row: "macos-sdk", href: "/platforms/macos" },
  { title: "bitHuman cloud", where: "Streams to any screen", device: "cloud", row: "cloud-gpu", href: "/deploy/cloud" },
];
