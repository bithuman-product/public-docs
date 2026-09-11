---
title: "Performance"
description: "Measured, unpaced frame rates for Expression 2 and Essence 2 on every platform we ship to: what the published SDKs deliver today, and what is on main for the next release."
section: sdk
group: "Reference"
order: 90
label: "Performance"
---

Every figure on this page is a measurement on the named device on the named
date, from the published bytes a developer installs today unless the row says
otherwise. Nothing is projected: a cell that reads **not measured** means
exactly that.

**Unpaced** means frames were produced as fast as the engine could make them,
not paced to playback. Expression 2 plays at 20 fps and Essence 2 at 25 fps, so
anything above those is headroom. **Above 40 fps** is what we call
hyper-realtime: twice real time, with room left for the rest of your app.

## Expression 2

Measured 2026-09-09 to 2026-09-11.

| Platform | Device | Published today | fps (unpaced) | On main, not yet released |
|---|---|---|---:|---|
| macOS | Apple M4, CoreML on the Neural Engine | CLI 2.6.5 | **54–69** in steady state (32-frame chunks); 30.7 over a whole 16 s clip including model load | — |
| iOS | iPhone 15 (A16), iOS 26.6.1 | `Expression2` 2.11.x | **106.6** (36,021 frames; worst 10 s window 99.9) | — |
| Android | Galaxy S25+ (Snapdragon 8 Elite, Hexagon V79), Android 16 | `expression2-android:0.3.1` | 7.1 with a bare `Expression2Options()` · 23.6 with `routing = HTP_DECODER` · **57.9** with `overlapDecoder = true, threads = 6` | **48.2** with a bare `Expression2Options()` at its new defaults (the successor to 0.3.1; not on Maven Central yet) |
| Web | Apple M4 (WebGPU) · Linux x86_64 (WASM) | no in-browser Expression 2 package is published; the hosted route plays at 20 fps | not published | 28 (M4, WebGPU) · 20 (x86, WASM) from an internal build |
| Linux CPU | x86_64 (Ryzen Threadripper PRO 5955WX, 32 threads) | CLI 2.6.5 · Python `bithuman` 3.1.0 | **34.0** from the CLI (326 frames in 9.6 s, on a machine under other load) · 29 whole process · 25.5 from Python | — |

Above 40 fps today: **macOS yes**, in steady state. **iOS yes.** **Android yes**
with the two options set; the bare defaults reach it in the next release.
**Web no.** **Linux CPU no** (34 fps on a busy machine; an idle one has not
been measured).

## Essence 2

Measured 2026-09-10 and 2026-09-11.

| Platform | Device | Published today | fps (unpaced) | On main, not yet released |
|---|---|---|---:|---|
| macOS | Apple M4 (10 cores) | CLI 2.6.5 | **2.2** at 8 threads (408 frames of 1080×1920 in 187 s) | the teeth-texture stage runs 10× faster (36 ms per frame at 10 threads, identical pixels); end to end not measured |
| iOS | iPhone 15 (A16) | `Essence2` requires an iPhone 16 Pro (A18 Pro) or later, and no downloadable model opens in the iOS engine today | not available | not measured on this device |
| Android | Galaxy S25+ | `essence2-android:0.5.1` | **1.0** (CPU only, and no public model host) | the teeth-texture stage runs 7× faster on the phone (130 ms per frame, one thread); end to end not measured |
| Web | Apple M4 (WebGPU) · Linux x86_64 (WASM) | the reduced in-browser renderer (a June package: keypoint-driven, without the teeth pipeline) — see [Web](/sdk/web#self-host-the-renderer) | **12** (Linux x86_64, headless Chrome, WASM, 4 threads) | the teeth-texture stage 2.4× faster at 1 thread and 10× at 8 threads (needs cross-origin isolation); end to end not measured |
| Linux CPU | x86_64 (Ryzen Threadripper PRO 5955WX) | CLI 2.6.5 | **1.10** at 8 threads · 1.09 at 4 threads (408 frames of 1920×1080 in 371 s) | the teeth-texture stage 9× faster (78 ms per frame at 8 threads, identical pixels) and a 7.6× faster live audio path; end to end not measured |

Above 40 fps today: **no, on every platform.** Essence 2 on a CPU is an offline
render today: render a clip to a file with the CLI or Python, or use the hosted
route, which plays at 25 fps. The changes on main speed up the stage that
dominates the frame; each platform's end-to-end figure will be measured from a
release that carries them, not projected here.

## How these were measured

- CLI rows: `bithuman render <model> -a <clip.wav> -o out.mp4 --json` on the
  published `cli-v2.6.5` build; fps = frames ÷ the `seconds` the JSON reports
  for the render loop (model load excluded unless the row says "whole process"
  or "including model load"). The same 16.3 s clip on macOS and Linux.
- Android rows: the published AAR through its public API, 1,642 frames per row,
  all rows pixel-identical; the on-main row is the mean of three four-clip runs.
- iOS row: the published `Expression2` package, one process, 100 % talk duty.
- Web rows: headless Chrome, frames rendered back to back.
- "On main" figures come from the same tools run against the source on `main`.
  They become published figures only when a release carries them.

Each platform page carries its own figures next to the code that produced them:
[Android](/sdk/android#performance) · [iOS](/sdk/ios#performance) ·
[macOS](/sdk/macos#performance) · [Web](/sdk/web#performance) ·
[CLI](/sdk/cli#performance) · [Python](/sdk/python#performance).
