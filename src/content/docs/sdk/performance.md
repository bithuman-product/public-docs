---
title: "Performance"
description: "How fast Essence 2 and Expression 2 render on every platform, in frames per second and times real time, with the raw data as performance.json."
section: performance
group: "Overview"
order: 0
type: generated
slug: performance
label: "Overview"
---

Essence 2 plays at 25 fps (up to 1080p; 1080×1920 portrait for a standard identity) and Expression 2 at 20 fps (416×720). **× real time** is the rendered frame rate divided by that playback rate, rounded down to one decimal: at 1.0× or more, the avatar keeps up with a live conversation.

<!-- FLOORS:TABLE all -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Cloud API · GPU | NVIDIA RTX 4090 | 98 | **3.9×** real time | 340 | **17.0×** real time |
| Cloud API · Apple silicon | Apple M4 Max | 70 | **2.8×** real time | 111 | **5.5×** real time |
| Cloud API · CPU | x86 server CPU | 28 | **1.1×** real time | 27 | **1.3×** real time |
| macOS · CLI | Apple M4 | 114 | **4.5×** real time | 165 | **8.2×** real time |
| macOS · Python | Apple M4 | 174 | **6.9×** real time | 169 | **8.4×** real time |
| macOS · Swift package | Apple M4 | 120 | **4.8×** real time | 177 | **8.8×** real time |
| Linux · CLI | Intel Core i7-13700F (x86_64) | 51 | **2.0×** real time | 44 | **2.2×** real time |
| Linux · Python | Intel Core i7-13700F (x86_64) | 50 | **2.0×** real time | 47 | **2.3×** real time |
| iPhone · Swift package | iPhone 15 | 54 | **2.1×** real time | 111 | **5.5×** real time |
| Android | Samsung Galaxy S25+ | 52 | **2.0×** real time | 48 | **2.4×** real time |
| Web browser (WebGPU) | Chrome on Apple M4 | 42 | **1.6×** real time | 38 | **1.9×** real time |
<!-- /FLOORS:TABLE -->

Each figure is one avatar session rendering as fast as the hardware allows. On the cloud API the service picks the tier for each session; the three Cloud API rows show each tier.

## By platform

- [Cloud API](/performance/cloud): the hosted service, per tier (GPU, Apple silicon and CPU).
- [Desktop](/performance/desktop): the CLI, Python and the Swift package on a Mac; the CLI and Python on Linux.
- [Mobile](/performance/mobile): iPhone and Android, including one session held for 10 minutes.
- [Web browser](/performance/web): render throughput in Chrome on Apple M4 with WebGPU.
- [How we measure](/performance/method): method, releases measured, memory, time to a finished video, and the raw data.
