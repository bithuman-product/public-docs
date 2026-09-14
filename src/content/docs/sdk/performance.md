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
| macOS | Apple M4 | 74 | 82 |
| iOS | iPhone 15 | 118 | 33 |
| Android | Galaxy S25+ | 58 | 15 — not yet real time |
| Web | Chrome on M4 | 30 | being re-measured |
| Linux | Intel Core i7-13700F | 41 | 21 — not yet real time |

**How to read a row.** Expression 2 plays at 20 frames per second, Essence 2 at
25. A number at or above its model's own rate holds a live, two-way conversation
on that hardware.

A cell marked **not yet real time** is a real measurement that falls under that
rate: the pairing renders, just not fast enough to talk to. Use it for offline
files, or run that model [in the cloud](/api/overview) instead.

A cell with no number says what is missing instead. It never means the platform
is unsupported — [what each platform needs →](/sdk)

<!-- FLOORS:NOTES -->
The Expression 2 Cloud GPU number already includes saving the video file.

The Essence 2 Cloud GPU number counts frames as they are rendered. Saving them to a video file adds encoding time on top, so a benchmark that writes an MP4 will measure less.

Cloud GPU is a hosted service rather than an SDK on your own hardware, and its number is how fast the cloud renders frames — what a video-file render gets. A live hosted conversation plays at the model's own rate, 20 frames per second for Expression 2 and 25 for Essence 2, and never faster: the headroom above that rate shortens a file render and lets one card carry more sessions at once, rather than putting more frames on screen.

The iPhone number is what a cool phone does. Render again straight away, with no pause, and an iPhone 15 settles at about 31 frames per second — still above the 25 Essence 2 plays at, so a conversation stays real time.

The Android Expression 2 number is what a cool phone does. Under continuous rendering a Galaxy S25+ warms up and settles at about 40 frames per second after a few minutes — still twice the 20 frames per second Expression 2 plays at, so a conversation stays real time.

The Linux numbers come from an Intel Core i7-13700F desktop with nothing else running. Earlier Linux numbers (37 and 13) came from a different machine, an AMD Threadripper PRO 5955WX server that was also running production work, so the change reflects the machine, not a software update.
<!-- /FLOORS:NOTES -->

Measured audio in to frame out, once the model has loaded. Loading the model the
first time adds to the total.

Setup for each platform is on its own page — [pick a platform](/sdk).

<small>Measured September 2026.</small>
