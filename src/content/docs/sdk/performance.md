---
title: "Performance"
description: "Frames per second for Expression 2 and Essence 2 on reference hardware — every platform in one table."
section: sdk
group: "Reference"
order: 90
label: "Performance"
---

| Platform | Reference hardware | Expression 2 | Essence 2 |
|---|---|---:|---:|
| Cloud GPU | NVIDIA RTX 4090 | — | 51.9 |
| macOS | Apple M4 | 70 | 25 |
| iOS | iPhone 15 | 118 | — |
| Android | Galaxy S25+ | 58 | — |
| Web | Chrome on M4 | 30 | — |
| Linux | x86 workstation | 37 | 13 |

<!-- FLOORS:NOTES -->
The Cloud GPU figure is the engine rate: writing an MP4 adds a CPU H.264 encode that costs about a third of it.
<!-- /FLOORS:NOTES -->

Frames per second = steady-state throughput after warm-up — audio in to frame out, model load excluded, worst of three quiet runs on the published release, 28-second reference clip.

Hyper-realtime = 40 fps or more, unpaced (avatars play at 20–25 fps).

Whole-clip time including model load is longer — see each platform page.

<small>Measured September 2026.</small>
