---
title: "Performance"
description: "Measured, unpaced frame rates for Expression 2 and Essence 2 on every platform, from the published SDKs, in one table."
section: sdk
group: "Reference"
order: 90
label: "Performance"
---

Frames per second, unpaced, from the bytes you install, measured on the named
hardware on the named date. A `—` is a cell with no measurement.

| Platform | Hardware | Expression 2 | Essence 2 | Measured |
|---|---|---:|---:|---|
| macOS | Apple M4 | 54 ¹ | 2 ² | 2026-09-10/11 |
| iOS | iPhone 15 (A16) | 107 | — ³ | 2026-09-09 |
| Android | Galaxy S25+ (Snapdragon 8 Elite) | 48 ⁴ | — ⁵ | 2026-09-10 |
| Web | Chrome on x86 (WASM) | — ⁶ | 12 ⁷ | 2026-09-10 |
| Linux | Ryzen Threadripper PRO 5955WX | 34 ⁸ | 1 ² | 2026-09-11 |

- **Unpaced** is as fast as the engine can render. Playback is 20 fps for
  Expression 2 and 25 fps for Essence 2, so everything above that is headroom.
- Our bar: macOS 200+, iPhone 60+, Android 40+, web and Linux 40+.
- The single-digit Essence 2 figures are the teeth-texture stage running on the
  CPU. It is moving to the GPU on every platform, and each cell is updated as
  that lands.
- Reproduce with the [CLI](/sdk/cli): `bithuman render <model> -a <clip.wav>
  -o out.mp4 --json`; fps = frames ÷ the render-loop `seconds` in the JSON.
  Figures are rounded to the nearest frame.

¹ Steady state over 32-frame chunks, 54–69 fps (465–594 ms per chunk); a whole
16 s clip including CoreML model load renders at 31 fps.
² CLI 2.6.5 at 8 threads: an offline `render` of 408 frames at 1920×1080 from a
16 s clip.
³ iPhone 16 Pro or later; no downloadable model yet.
⁴ `expression2-android` 0.4.1 with no options set (mean of three four-clip runs;
58 over one 20 s clip). 0.3.1 with `routing = HTP_DECODER, overlapDecoder = true,
threads = 6`: 58.
⁵ `essence2-android` 0.5.2 (published 2026-09-11) is not yet measured end to
end; 0.5.1 measured 1 fps.
⁶ No in-browser Expression 2 package is published; the hosted route plays at
20 fps.
⁷ The reduced in-browser renderer (keypoint-driven, without the teeth
pipeline), WASM at 4 threads — see [Web](/sdk/web#self-host-the-renderer).
⁸ CLI 2.6.5 render loop on a machine under other load; whole process 29, Python
`bithuman` 3.1.0 26.
