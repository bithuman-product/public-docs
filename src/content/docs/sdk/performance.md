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
|---|---|---|---|
| Cloud GPU | NVIDIA RTX 4090 | 369 · e2e-unpaced (not re-measured on the ruled shape) · 416x720 at 20 fps · 18.4x real time · hosted baked-390440281 (2026-09-20) | 112 · e2e-unpaced (not re-measured on the ruled shape) · 1920x1080 at 25 fps · 4.48x real time · hosted 2d1302440 (2026-09-20) |
| Cloud Apple silicon | Apple M4 Max | 86 · e2e-unpaced (not re-measured on the ruled shape) · 416x720 at 20 fps · 4.3x real time · hosted moraga-expression-2-apple (2026-09-20) | 67 · e2e-unpaced (not re-measured on the ruled shape) · 1920x1080 at 25 fps · 2.68x real time · hosted moraga-lib-a790181f (2026-09-22) |
| Cloud CPU | Modal CPU container | 18 — not yet real time · e2e-unpaced (not re-measured on the ruled shape) · 416x720 at 20 fps · 0.9x real time · hosted expression-2-cpu-worker v25 (2026-09-20) | 6 — not yet real time · e2e-unpaced (not re-measured on the ruled shape) · 1920x1080 at 25 fps · 0.24x real time · hosted essence-2-cpu-worker v18 (2026-09-20) |
| macOS | Apple M4 | 160 · e2e-steady-state · 416x720 at 20 fps · 8x real time · cli-v2.6.25 (2026-09-20) | 108 · e2e-steady-state · 1920x1080 at 25 fps · 4.32x real time · cli-v2.6.25 (2026-09-20) |
| macOS · Python | Apple M4 | 159 · e2e-steady-state · 416x720 at 20 fps · 7.95x real time · bithuman 2.11.5 (2026-09-20) | 117 · e2e-steady-state · 1920x1080 at 25 fps · 4.68x real time · bithuman 2.11.5 (2026-09-20) |
| Linux | Intel Core i7-13700F | 35 · e2e-steady-state · 416x720 at 20 fps · 1.75x real time · cli-v2.6.25 (2026-09-20) | 36 · e2e-steady-state · 1920x1080 at 25 fps · 1.44x real time · cli-v2.6.25 (2026-09-20) |
| Linux · Python | Intel Core i7-13700F | 38 · e2e-steady-state · 416x720 at 20 fps · 1.9x real time · bithuman 2.11.5 (2026-09-20) | 30 · e2e-steady-state · 1920x1080 at 25 fps · 1.2x real time · bithuman 2.11.5 (2026-09-20) |
| iOS | iPhone 15 | 111 · e2e-unpaced (not re-measured on the ruled shape) · 416x720 at 20 fps · 5.55x real time · bithuman-product/homebrew-bithuman :: Expression2 2.13.8 (2026-09-20) | 54 · e2e-unpaced (not re-measured on the ruled shape) · 1920x1080 at 25 fps · 2.16x real time · essence2-v1.9.0 (2026-09-20) |
| Android | Galaxy S25+ | 43 · e2e-steady-state · 416x720 at 20 fps · 2.15x real time · expression2-android 0.4.7 (2026-09-19) | 46 · e2e-unpaced (not re-measured on the ruled shape) · 1920x1080 at 25 fps · 1.84x real time · essence2-android 0.5.12 (2026-09-19) |
| Web | Chrome on M4 | 30 · e2e-unpaced (not re-measured on the ruled shape) · 416x720 at 20 fps · 1.5x real time · bithuman-ui 021a6f6 (2026-09-12) | 18 — not yet real time · e2e-unpaced (not re-measured on the ruled shape) · 1920x1080 at 25 fps · 0.72x real time · bithuman-ui a1b6f7fa8 (2026-09-20) |
<!-- /FLOORS:TABLE -->

Rows marked **· Python** are the [Python library](/sdk/python)
(`pip install bithuman`), a separate product measured the same way on the same
machine. Everything else is the CLI, the platform SDK, or the hosted API.

**How to read a row.** Expression 2 plays at 20 frames per second, Essence 2 at
25. A number at or above its model's own rate holds a live, two-way conversation
on that hardware.

**What follows each number** is the artifact it was measured on — a CLI
release, a wheel, a Maven artifact, a Swift package tag. A frame rate you
cannot tie to a version is not reproducible, so every cell names its own, and
the two cells on a row can name different things: on Android, Expression 2 is
one Maven artifact and Essence 2 another, each with its own version. **hosted** means there is
no artifact to fetch — the number came from a service we run, so you cannot
reproduce it on your own hardware at all. A name is the version the measurement
was taken on, which is deliberately not always the newest one published; for
what to install today, see the page for your platform.

A cell with no number says what is missing instead.

## How current each row is

Every number above is re-taken on a **30-day clock**. Each cell names the day
its own run was measured; this table says whether that day is still inside the
clock, so a figure that has aged out reads as aged out rather than sitting in
the table looking like the others.

<!-- PERF-CURRENCY -->
| Row | Measured | Within the 30-day clock |
|---|---|---|
| Cloud GPU | 2026-09-20 | yes |
| Cloud Apple silicon | Expression 2 2026-09-20 · Essence 2 2026-09-22 | yes |
| Cloud CPU | 2026-09-20 | yes |
| macOS | 2026-09-20 | yes |
| macOS · Python | 2026-09-20 | yes |
| Linux | 2026-09-20 | yes |
| Linux · Python | 2026-09-20 | yes |
| iOS | 2026-09-20 | yes |
| Android | 2026-09-19 | yes |
| Web | Expression 2 2026-09-12 · Essence 2 2026-09-20 | yes |
<!-- /PERF-CURRENCY -->

This table is generated from the same record as the one above, and a scheduled
check regrades it against the calendar rather than against the day it was
written — so a row crosses the clock here on the day it crosses, not on the day
someone happens to look.

<details>
<summary>What each number includes, row by row</summary>

<!-- FLOORS:NOTES -->
The Expression 2 Cloud GPU number already includes saving the video file.

The Essence 2 Cloud GPU number is how fast a finished 1920x1080 video file is delivered, including encoding it. The GPU itself renders Essence 2 at roughly 140 to 160 frames per second when the card is not busy with other work; the published figure is lower because it also includes encoding the video file. Cloud GPU is a hosted service rather than an SDK on your own hardware; a live hosted conversation plays at the model's own rate, 20 frames per second for Expression 2 and 25 for Essence 2, and never faster: the headroom above that rate shortens a file render and lets one card carry more sessions at once, rather than putting more frames on screen.

The two Cloud rows below Cloud GPU are the same hosted service, not separate products. A hosted render is sent to an NVIDIA RTX 4090 first; if every card is busy it goes to an Apple silicon server, and if that is busy too it goes to a CPU container. The Cloud GPU row is what a render normally gets and the two rows under it are what it gets when the service is under load, which is why they are slower. All three are measured the same way, with the same clip, counting the finished video file.

The iPhone Essence 2 number is what a phone does with no pause between renders: the published figure is the worst of three runs, and the slowest of them was the one taken straight after another with no cooldown. An iPhone 15 stayed above 53 frames per second in all three — more than twice the 25 Essence 2 plays at, so a conversation stays real time.

The Android Expression 2 number is what a cool phone does. Under continuous rendering a Galaxy S25+ warms up and settles at about 40 frames per second after a few minutes — still twice the 20 frames per second Expression 2 plays at, so a conversation stays real time.

The Android Essence 2 number went from 52 on essence2-android 0.5.11 to 46 on 0.5.12, and that is a change in the picture, not a slower engine: from 0.5.12 the mouth is drawn inside the identity's own lip outline instead of a plain oval that covered more of the face, and shaping every frame to that outline is more work per frame. A cool Galaxy S25+ measured 47, 46 and 50 frames per second on three separate starts; 46 is the lowest, and it is still well above the 25 frames per second Essence 2 plays at.

The Essence 2 Web number, 18 frames per second, is under the 25 Essence 2 plays at, and it was measured on the older of the two renderers a browser can use here. It now understates what most identities get: a faster renderer went live on 2026-09-20, reaches 25 to 29 frames per second — real time — and as of 2026-09-22 eleven of the twelve avatars published for in-browser rendering ship it, one does not. The cell still reads 18 because a number reaches this page only once three separate runs of the same test agree, and the faster renderer has two; it moves on the third run and not before. On the page a visitor actually opens, with the voice playing and the picture drawn on the same browser thread, it is lower again: about 11 frames per second on 2026-09-15. Expression 2 in the same browser delivers its full 20 frames per second, because it does its work on a background thread and leaves the display loop free.

The Linux numbers come from an Intel Core i7-13700F desktop with nothing else running.

The Linux Essence 2 number is how fast the CLI renders a file, not the rate a conversation plays at. Essence 2 plays at 25 frames per second on every platform, and headroom above that shortens a render and absorbs a busy machine rather than putting more frames on screen. Both Linux numbers also vary from run to run more than the other rows here: on the same desktop, the same release and the same clip, repeated renders at the stock settings measured between 25 and 33 frames per second for Essence 2 on 2026-09-17, and on 2026-09-20 Expression 2 measured between 35 and 44 across one morning — with the slowest and the fastest of each taken on an idle machine. Each published number is the slowest of the quiet runs, so it is the figure that holds across that spread rather than the best one.

Read a number here with the frame size beside it. Essence 2 delivers a 1920x1080 picture 25 times a second and Expression 2 delivers a 416x720 picture 20 times a second, which is 8.65 times the pixels per second of speech. On the Cloud GPU row that makes Essence 2's 112 about 232 megapixels a second against Expression 2's 369 at 111 — Essence 2 is doing 2.1 times more pixel work per second while its number reads smaller. What the two columns DO compare on is how far above the conversation each one renders, 4.48 times real time against 18.4, and every cell prints it.
<!-- /FLOORS:NOTES -->

</details>

Measured audio in to frame out, once the model has loaded. Loading the model the
first time adds to the total.

Setup for each platform is on its own page — [pick a platform](/sdk).

<small>Every figure on this page is generated from the measurement record that
produces it. Nothing here is typed by hand, and the dates beside the numbers are
the days those runs were taken.</small>
