---
title: "Performance"
description: "Frames per second for Expression 2 and Essence 2 on reference hardware — every platform in one table."
section: sdk
group: "Reference"
order: 90
label: "Performance"
---

<!-- FLOORS:TABLE all -->
| Platform | Reference hardware | Expression 2 | Essence 2 |
|---|---|---:|---:|
| Cloud GPU | NVIDIA RTX 4090 | 290 | 83.5 |
| macOS | Apple M4 | 158 | 82 |
| macOS · Python | Apple M4 | 157 | not measured on 3.1.8 (2026-09-14) |
| Linux | Intel Core i7-13700F | 44 | 29 |
| Linux · Python | Intel Core i7-13700F | 49 | 27 |
| iOS | iPhone 15 | 118 | 52 |
| Android | Galaxy S25+ | 58 | 50 |
| Web | Chrome on M4 | 30 | 27 |
<!-- /FLOORS:TABLE -->

Rows marked **· Python** are the [Python library](/sdk/python)
(`pip install bithuman`), a separate product measured the same way on the same
machine. Everything else is the CLI, the platform SDK, or the hosted API.

**How to read a row.** Expression 2 plays at 20 frames per second, Essence 2 at
25. A number at or above its model's own rate holds a live, two-way conversation
on that hardware.

A cell with no number says what is missing instead.

<details>
<summary>What each number includes, row by row</summary>

<!-- FLOORS:NOTES -->
The Expression 2 Cloud GPU number already includes saving the video file.

The Essence 2 Cloud GPU number is how fast a finished 1920x1080 video file is delivered, including encoding it. The GPU itself renders Essence 2 at roughly 190 to 210 frames per second when the card is not busy with other work; the published figure is lower because it also includes encoding the video file. Cloud GPU is a hosted service rather than an SDK on your own hardware; a live hosted conversation plays at the model's own rate, 20 frames per second for Expression 2 and 25 for Essence 2, and never faster: the headroom above that rate shortens a file render and lets one card carry more sessions at once, rather than putting more frames on screen.

The iPhone Essence 2 number is what a cool phone does. Render again straight away, with no pause, and an iPhone 15 still does about 49 frames per second — well above the 25 Essence 2 plays at, so a conversation stays real time.

The Android Expression 2 number is what a cool phone does. Under continuous rendering a Galaxy S25+ warms up and settles at about 40 frames per second after a few minutes — still twice the 20 frames per second Expression 2 plays at, so a conversation stays real time.

The Linux numbers come from an Intel Core i7-13700F desktop with nothing else running. Earlier Linux numbers (37 and 13) came from a different machine, an AMD Threadripper PRO 5955WX server that was also running production work, so the change reflects the machine, not a software update.
<!-- /FLOORS:NOTES -->

</details>

Measured audio in to frame out, once the model has loaded. Loading the model the
first time adds to the total.

Setup for each platform is on its own page — [pick a platform](/sdk).

<small>Measured September 2026.</small>
