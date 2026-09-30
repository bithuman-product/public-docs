---
title: "How we measure"
description: "How the frame rates are measured, on which releases, with the raw data."
section: performance
group: "Speed"
order: 10
type: generated
llms: start
---

## Method

<!-- FLOORS:RELEASES -->
Measured in September 2026 on CLI 2.8.1, bithuman 2.11.12, bithuman 2.11.13, bithuman 2.11.18, Swift package 2.15.0, Swift package 2.17.3, Swift package 2.18.0, essence2-android 0.7.0, expression2-android 0.4.10, the hosted web viewer and the cloud API.
<!-- /FLOORS:RELEASES -->

<!-- FLOORS:METHOD -->
Frames per second from speech audio in to finished video frame out, for one avatar session, rendering as fast as the hardware allows on a reference speech clip. × real time is fps divided by the model's playback rate (Essence 2 25 fps, Expression 2 20 fps); at 1.0× or more the avatar keeps up with a live conversation. Every figure is re-measured at least every 30 days on the releases listed above. Raw records, including the clip, per-run dates and memory: [performance.json](/performance.json).
<!-- /FLOORS:METHOD -->

## Memory

<!-- FLOORS:MEMORY -->
| Runs on | Hardware | Essence 2 | Expression 2 | Measured on |
|---|---|---|---|---|
| macOS · CLI | Apple M4 | 1.0 GB | 0.9 GB | CLI 2.7.8 |
| macOS · Python | Apple M4 | 1.2 GB | 0.8 GB | bithuman 2.11.12 |
| Linux · CLI | Intel Core i7-13700F (x86_64) | 2.2 GB | 1.6 GB | CLI 2.7.8 |
| Linux · Python | Intel Core i7-13700F (x86_64) | 1.0 GB | 1.5 GB | bithuman 2.11.12 |
| iPhone · Swift package | iPhone 15 | 0.9 GB | 0.5 GB | Swift engine 1.10.0, Swift package 2.14.1 |
| Android | Samsung Galaxy S25+ | 1.0 GB | 2.3 GB | essence2-android 0.7.0, expression2-android 0.5.0 |
| Web browser (WebGPU) | Chrome on Apple M4 | 3.0 GB (Chrome tab memory footprint) | 1.8 GB (Chrome tab memory footprint) | — |

Peak memory (RAM) of one render, or of one session on a phone, on the release in the last column. Cloud API: nothing to provision.
<!-- /FLOORS:MEMORY -->

<!-- FLOORS:WALLCLOCK -->
## Time to a finished video

| Runs on | Hardware | Essence 2, first run | Essence 2, after that | Expression 2, first run | Expression 2, after that |
|---|---|---|---|---|---|
| macOS · CLI | Apple M4 | 4.0 s | 4.8 s | — | — |

Seconds from starting the command to a finished MP4 of a 10-second clip, for the whole process: loading, rendering, encoding and exit, timed on CLI 2.7.8. Each number is the slowest of three runs. "First run" is a fresh install with the model files already downloaded. "After that" is every later render on the same machine. Lip sync is checked on every run: no run published here plays more than 40 ms off the audio.
<!-- /FLOORS:WALLCLOCK -->

Later renders are not faster: the model files are already downloaded on the first run, so both columns measure the same work, within run-to-run variation.

## Pin a tier for a benchmark

To measure one tier, append `?model=` with a tier slug to the viewer or embed URL:

```text
https://www.bithuman.ai/embed/A23WJF0199?model=expression-2-apple
```

| Model | Tier slugs |
|---|---|
| `essence-2` | `essence-2-gpu` · `essence-2-apple` · `essence-2-cpu` |
| `expression-2` | `expression-2-gpu` · `expression-2-apple` · `expression-2-cpu` |

- **A recognized slug pins the session** to that tier: if the tier is unavailable, the session fails rather than playing elsewhere.
- **An unrecognized slug is ignored** and the session plays as usual. If a pin seems to have no effect, check the spelling.
- **To be told about a typo**, set the embed token's `model` field instead: an unknown value is refused with a `400` listing the accepted names when you [mint the token](/api/embedding#production-mint-a-token).

In production, omit `?model=` and let the service choose.

## Raw data

[performance.json](/performance.json) holds every published cell: frame rate, × real time, release, date, the speech clip it was measured on, and memory. The pages under [Performance](/performance) are generated from it.
