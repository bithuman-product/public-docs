---
title: "Performance"
description: "How fast Essence 2 and Expression 2 render on iPhone, Android, a WebGPU browser, a Mac, a Linux PC with no GPU and the bitHuman cloud, in times real time, with the raw data as performance.json."
section: performance
group: "Performance"
order: 0
type: generated
llms: start
next: ["/performance/method", "/deploy", "/platforms"]
moved:
  pin-a-tier-for-a-benchmark: /performance/method#pin-a-tier-for-a-benchmark
---

**× real time** is seconds of avatar video rendered per second, rounded down to one decimal: at 1.0× or more, an avatar holds a live conversation.

```perf-explorer
```

<!-- FLOORS:TABLE all -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Cloud API · GPU | NVIDIA RTX 4090 | 104 | **4.1×** real time | 340 | **17.0×** real time |
| Cloud API · Apple silicon | Apple M4 Max | 71 | **2.8×** real time | 111 | **5.5×** real time |
| Cloud API · CPU | x86 server CPU | 28 | **1.1×** real time | 27 | **1.3×** real time |
| macOS · CLI | Apple M4 | 106 | **4.2×** real time | 168 | **8.4×** real time |
| macOS · Python | Apple M4 | 174 | **6.9×** real time | 169 | **8.4×** real time |
| macOS · Swift package | Apple M4 | 120 | **4.8×** real time | 177 | **8.8×** real time |
| Linux · CLI | Intel Core i7-13700F (x86_64) | 50 | **2.0×** real time | 44 | **2.2×** real time |
| Linux · Python | Intel Core i7-13700F (x86_64) | 49 | **1.9×** real time | 47 | **2.3×** real time |
| Windows · Python | Intel Core i7-13700F (x86_64), 8 threads | 30 | **1.2×** real time | 21 | **1.0×** real time |
| iPhone · Swift package | iPhone 15 | 54 | **2.1×** real time | 111 | **5.5×** real time |
| Android | Samsung Galaxy S25+ | 52 | **2.0×** real time | 48 | **2.4×** real time |
| Web browser (WebGPU) | Chrome on Apple M4 | 43 | **1.7×** real time | 39 | **1.9×** real time |
<!-- /FLOORS:TABLE -->

Each figure is one avatar session rendering as fast as the hardware allows. On the cloud API the service picks the tier for each session; the three Cloud API rows show each tier.

The sections below go platform by platform, on-device first. [How we measure](/performance/method) has the method, the releases measured, memory, the time to a finished video and the raw data.

## Mobile

First a short burst on each phone, then one session held for 10 minutes.

<!-- FLOORS:TABLE mobile -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| iPhone · Swift package | iPhone 15 | 54 | **2.1×** real time | 111 | **5.5×** real time |
| Android | Samsung Galaxy S25+ | 52 | **2.0×** real time | 48 | **2.4×** real time |
<!-- /FLOORS:TABLE -->

<details class="releases">
<summary>Releases measured</summary>

<!-- FLOORS:RELEASES mobile -->
Measured in September 2026 on Swift package 2.17.3, Swift package 2.18.0, essence2-android 0.7.0 and expression2-android 0.4.10.
<!-- /FLOORS:RELEASES -->

</details>

- The first table is one render of a speech clip on a cool phone, as fast as the phone allows.
- Some phone figures use a shorter speech clip than the other platforms; each cell's clip is in [performance.json](/performance.json).
- Only an iPhone 15 and a Samsung Galaxy S25+ are measured. Other phones render at other rates.

Setup for each SDK: [Apple](/platforms/ios), [Android](/platforms/android).

<!-- FLOORS:SUSTAINED -->
## Held for 10 minutes

| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| iPhone · Swift package | iPhone 15 | 33 | **1.3×** real time | 103 | **5.1×** real time |
| Android | Samsung Galaxy S25+ | 37 | **1.4×** real time | 44 | **2.2×** real time |
| Web browser (WebGPU) | Chrome on Apple M4 | 54 | **2.1×** real time | 41 | **2.0×** real time |

One session held open for ten minutes from a cool start on Swift package 2.15.0, essence2-android 0.8.1, expression2-android 0.5.2 and web viewer, rendering as fast as the device allows. Each number is the median 30-second stretch of the slowest of that row's sessions (four on iPhone · Swift package, three on Android, three on Web browser (WebGPU) Essence 2, four on Web browser (WebGPU) Expression 2); the slowest single stretch was lower (iPhone · Swift package Essence 2 31 fps; iPhone · Swift package Expression 2 100 fps; Android Essence 2 32 fps; Android Expression 2 37 fps; Web browser (WebGPU) Essence 2 50 fps; Web browser (WebGPU) Expression 2 41 fps). A phone warms up over a long conversation and slows its processor to stay cool, so a kiosk or any screen that renders all day should plan on this number rather than the short-burst rate.

Memory over the ten minutes (the probe's own reading at the start and the end of the held window): Android Essence 2 memory (PSS) 0.9 GB to 0.9 GB (+0 MB); Android Expression 2 memory (PSS) 0.7 GB to 0.8 GB (+34 MB); Web browser (WebGPU) Essence 2 Chrome tab memory footprint 3.1 GB to 3.0 GB (-55 MB).

The Web browser row is the engine's render throughput with WebGPU in Chrome on an Apple M4, measured in a visible (headed) browser window. It is not the frame rate a visitor sees on the page, where the voice and the display share the browser with the engine.
<!-- /FLOORS:SUSTAINED -->

## Web

These figures are for the avatar rendering in the visitor's own tab (`render=local`). By default the avatar renders on the [cloud API](/performance#cloud) and streams to the page.

<!-- FLOORS:TABLE web -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Web browser (WebGPU) | Chrome on Apple M4 | 43 | **1.7×** real time | 39 | **1.9×** real time |
<!-- /FLOORS:TABLE -->

<details class="releases">
<summary>Releases measured</summary>

<!-- FLOORS:RELEASES web -->
Measured in September 2026 on the hosted web viewer.
<!-- /FLOORS:RELEASES -->

</details>

- Each figure is the engine's render throughput with WebGPU in Chrome on an Apple M4, measured in an automated browser.
- It is not the frame rate a visitor sees on the page, where the voice and the display share the browser with the engine.
- Only Chrome on an Apple M4 is measured. Other browsers, other GPUs and devices without WebGPU are not.

Setup and the WebGPU check: [Web](/platforms/web).

## Desktop

Pick the row for the product you use: the CLI, Python and the Swift package render at different rates on the same machine.

<!-- FLOORS:TABLE desktop -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| macOS · CLI | Apple M4 | 106 | **4.2×** real time | 168 | **8.4×** real time |
| macOS · Python | Apple M4 | 174 | **6.9×** real time | 169 | **8.4×** real time |
| macOS · Swift package | Apple M4 | 120 | **4.8×** real time | 177 | **8.8×** real time |
| Linux · CLI | Intel Core i7-13700F (x86_64) | 50 | **2.0×** real time | 44 | **2.2×** real time |
| Linux · Python | Intel Core i7-13700F (x86_64) | 49 | **1.9×** real time | 47 | **2.3×** real time |
| Windows · Python | Intel Core i7-13700F (x86_64), 8 threads | 30 | **1.2×** real time | 21 | **1.0×** real time |
<!-- /FLOORS:TABLE -->

<details class="releases">
<summary>Releases measured</summary>

<!-- FLOORS:RELEASES desktop -->
Measured in September 2026 on CLI 2.8.1, bithuman 2.11.12, bithuman 2.11.13, bithuman 2.11.18 and Swift package 2.15.0.
<!-- /FLOORS:RELEASES -->

</details>

- Each figure is one render of a reference speech clip, as fast as the machine allows, with nothing else running.
- The macOS CLI Essence 2 figure was measured with `BITHUMAN_THREADS=8`; by default the CLI uses one thread per CPU it may use, up to 16. The Linux CLI uses default settings.
- Only these two machines are measured: an Apple M4 Mac and an Intel Core i7-13700F desktop. Other processors render at other rates.

Memory per render is on [How we measure](/performance/method#memory). Setup for each product: [CLI](/platforms/cli), [Python](/platforms/python), [Apple](/platforms/ios).

## Cloud

By default the service picks the tier for each session; each row is one tier. To benchmark one tier you can pin it ([pin a tier for a benchmark](/performance/method#pin-a-tier-for-a-benchmark)); in production, let the service choose.

<!-- FLOORS:TABLE cloud -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Cloud API · GPU | NVIDIA RTX 4090 | 104 | **4.1×** real time | 340 | **17.0×** real time |
| Cloud API · Apple silicon | Apple M4 Max | 71 | **2.8×** real time | 111 | **5.5×** real time |
| Cloud API · CPU | x86 server CPU | 28 | **1.1×** real time | 27 | **1.3×** real time |
<!-- /FLOORS:TABLE -->

<details class="releases">
<summary>Releases measured</summary>

<!-- FLOORS:RELEASES cloud -->
Measured in September 2026 on the cloud API.
<!-- /FLOORS:RELEASES -->

</details>

- Each figure is how fast one finished video is delivered, including encoding the video file, on a server with no other sessions.
- With other sessions on the same server, a session can render more slowly than shown.
- A live conversation plays at the model's own rate, 25 fps for Essence 2 and 20 fps for Expression 2. Speed above that makes a video file finish sooner; it does not put more frames on screen.
