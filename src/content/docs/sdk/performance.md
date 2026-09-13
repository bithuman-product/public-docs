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
| Cloud GPU | NVIDIA RTX 4090 | 290 | 51.9 |
| macOS | Apple M4 | 73 | 43 |
| iOS | iPhone 15 | 118 | — |
| Android | Galaxy S25+ | 58 | — |
| Web | Chrome on M4 | 30 | — |
| Linux | Intel Core i7-13700F | 41 | 21 |

Avatars play at 20–25 fps, so a platform at or above that keeps up in real time.
A dash means we have not measured that pairing yet.

<!-- FLOORS:NOTES -->
The Expression 2 Cloud GPU number already includes saving the video file.

The Essence 2 Cloud GPU number counts frames as they are rendered. Saving them to a video file adds encoding time on top, so a benchmark that writes an MP4 will measure less.

The Linux numbers come from an Intel Core i7-13700F desktop with nothing else running. Earlier Linux numbers (37 and 13) came from a different machine, an AMD Threadripper PRO 5955WX server that was also running production work, so the change reflects the machine, not a software update.
<!-- /FLOORS:NOTES -->

Measured audio in to frame out, once the model has loaded. Loading the model the
first time adds to the total.

Setup for each platform is on its own page — [pick a platform](/sdk).

<small>Measured September 2026.</small>
