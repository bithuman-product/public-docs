---
title: "Performance"
description: "How fast Essence 2 and Expression 2 render on every platform you can run them on — frames per second, times real time and memory, with the raw data as performance.json."
section: performance
group: "Performance"
order: 0
type: generated
slug: performance
label: "Performance"
---

How fast each model renders on each place you can run it. Essence 2 plays at
25 fps (1920×1080) and Expression 2 at 20 fps (416×720); any row at **1.0× or
more holds a live, two-way conversation**. On the cloud API the service picks
the tier for each session, and the three Cloud rows show each tier.

## Frame rate

<!-- FLOORS:TABLE all -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Cloud API · GPU | NVIDIA RTX 4090 | 98 | **3.9×** real time | 340 | **17.0×** real time |
| Cloud API · Apple silicon | Apple M4 Max | 70 | **2.8×** real time | 111 | **5.5×** real time |
| Cloud API · CPU | x86 server CPU | 22 | 0.8× below real time | 27 | **1.3×** real time |
| macOS · CLI | Apple M4 | 114 | **4.5×** real time | 168 | **8.4×** real time |
| macOS · Python | Apple M4 | 176 | **7.0×** real time | 164 | **8.2×** real time |
| Linux · CLI | Intel Core i7-13700F (x86_64) | 36 | **1.4×** real time | 44 | **2.2×** real time |
| Linux · Python | Intel Core i7-13700F (x86_64) | 50 | **2.0×** real time | 47 | **2.3×** real time |
| iPhone · Swift package | iPhone 15 | 54 | **2.1×** real time | 110 | **5.5×** real time |
| Android | Samsung Galaxy S25+ | 47 | **1.8×** real time | 48 | **2.4×** real time |
| Web browser (WebGPU) | Chrome on Apple M4 | 42 | **1.6×** real time | 40 | **2.0×** real time |
<!-- /FLOORS:TABLE -->

<!-- FLOORS:RELEASES -->
Measured on current releases: CLI 2.7 · bithuman 2.11 · Swift package 2.14 · essence2-android 0.5 · expression2-android 0.4 · cloud API (September 2026).
<!-- /FLOORS:RELEASES -->

<!-- FLOORS:SUSTAINED -->
### Held for 10 minutes

| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Android | Samsung Galaxy S25+ | 28 | **1.1×** real time | — | — |

Paced at 25 fps, as a kiosk plays video, one Android Essence 2 session delivered every frame for 10 minutes of continuous talking.

One session held open for ten minutes from a cool start, rendering as fast as the device allows. Each number is the median 30-second stretch of the slowest of three such sessions; the slowest single stretch was lower (Android Essence 2 24 fps). The table above is the short-burst rate. A phone warms up over a long conversation and slows its processor to stay cool, so a kiosk or any screen that renders all day should plan on this number.
<!-- /FLOORS:SUSTAINED -->

<!-- FLOORS:WALLCLOCK -->
## Time to a finished video

| Runs on | Hardware | Essence 2, first run | Essence 2, after that | Expression 2, first run | Expression 2, after that |
|---|---|---|---|---|---|
| macOS · CLI | Apple M4 | 9.6 s | 7.8 s | — | — |
| macOS · Python | Apple M4 | 7.8 s | 6.2 s | — | — |

Seconds from starting the command to a finished MP4 of a 10-second clip, for the whole process: loading, rendering, encoding and exit. Each number is the slowest of three runs. "First run" is a fresh install with the model files already downloaded. "After that" is every later render on the same machine. Lip sync is checked on every run: no run published here plays more than 40 ms off the audio.
<!-- /FLOORS:WALLCLOCK -->

## Memory

<!-- FLOORS:MEMORY -->
| Runs on | Hardware | Essence 2 peak RAM | Expression 2 peak RAM |
|---|---|---|---|
| macOS · CLI | Apple M4 | 1.6 GB | 0.9 GB |
| macOS · Python | Apple M4 | 1.6 GB | 0.8 GB |
| Linux · CLI | Intel Core i7-13700F (x86_64) | 3.5 GB | 1.7 GB |
| Linux · Python | Intel Core i7-13700F (x86_64) | 2.6 GB | 1.5 GB |
| iPhone · Swift package | iPhone 15 | 0.9 GB | 0.5 GB |
| Android | Samsung Galaxy S25+ | 1.0 GB | 2.3 GB |

Cloud API: nothing to provision.
<!-- /FLOORS:MEMORY -->

## How we measure

<!-- FLOORS:METHOD -->
Frames per second from speech audio in to finished video frame out, for one avatar session, rendering as fast as the hardware allows on a reference speech clip. × real time is fps divided by the model's playback rate (Essence 2 25 fps, Expression 2 20 fps); at 1.0× or more the avatar keeps up with a live conversation. Every figure is re-measured at least every 30 days on the releases listed above. Raw records, including the clip, per-run dates and memory: [performance.json](/performance.json).
<!-- /FLOORS:METHOD -->

Machine-readable: [performance.json](/performance.json), the same cells with
each one's release, date, clip and memory. Setup for each platform is on its own
page: [pick a platform](/sdk).
