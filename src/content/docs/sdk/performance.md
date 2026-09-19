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
| Cloud GPU | NVIDIA RTX 4090 | 272 · 416x720 at 20 fps · 13.6x real time · hosted baked-5e4d606b8 (2026-09-19) | 86 · 1920x1080 at 25 fps · 3.44x real time · hosted 5e4d606b8 (2026-09-19) |
| macOS | Apple M4 | 160 · 416x720 at 20 fps · 8x real time · cli-v2.6.24 (2026-09-19) | 109 · 1920x1080 at 25 fps · 4.36x real time · cli-v2.6.24 (2026-09-19) |
| macOS · Python | Apple M4 | 157 · 416x720 at 20 fps · 7.85x real time · bithuman 3.1.8 (2026-09-14) | not measured on 3.1.8 (2026-09-14) |
| Linux | Intel Core i7-13700F | 44 · 416x720 at 20 fps · 2.2x real time · cli-v2.6.22 (2026-09-19) | 37 · 1920x1080 at 25 fps · 1.48x real time · cli-v2.6.24 (2026-09-19) |
| Linux · Python | Intel Core i7-13700F | 47 · 416x720 at 20 fps · 2.35x real time · bithuman 2.11.3 (2026-09-19) | 32 · 1920x1080 at 25 fps · 1.28x real time · bithuman 2.11.3 (2026-09-19) |
| iOS | iPhone 15 | 118 measured, no recorded way to re-run it | 53 · 1920x1080 at 25 fps · 2.12x real time · essence2-v1.7.0 (2026-09-16) |
| Android | Galaxy S25+ | 45 · 416x720 at 20 fps · 2.25x real time · expression2-android 0.4.7 (2026-09-19) | 46 · 1920x1080 at 25 fps · 1.84x real time · essence2-android 0.5.12 (2026-09-19) |
| Web | Chrome on M4 | 30 · 416x720 at 20 fps · 1.5x real time · bithuman-ui 021a6f6 (2026-09-12) | not yet real time in a browser |
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

**The Android Essence 2 cell is being re-measured.** Its number was taken on
`essence2-android` 0.5.11, which `0.5.12` superseded on 2026-09-19 — and
`0.5.12` is the coordinate every install page here now names. Read that cell as
the record of the release it names, not as what today's artifact does on a
handset; the new measurement replaces it here when it is taken.

<details>
<summary>What each number includes, row by row</summary>

<!-- FLOORS:NOTES -->
The Expression 2 Cloud GPU number already includes saving the video file.

The Essence 2 Cloud GPU number is how fast a finished 1920x1080 video file is delivered, including encoding it. The GPU itself renders Essence 2 at roughly 190 to 210 frames per second when the card is not busy with other work; the published figure is lower because it also includes encoding the video file. Cloud GPU is a hosted service rather than an SDK on your own hardware; a live hosted conversation plays at the model's own rate, 20 frames per second for Expression 2 and 25 for Essence 2, and never faster: the headroom above that rate shortens a file render and lets one card carry more sessions at once, rather than putting more frames on screen.

The iPhone Essence 2 number is what a phone does with no pause between renders: the published figure is the worst of three runs, and the slowest of them was the one taken straight after another with no cooldown. An iPhone 15 stayed above 53 frames per second in all three — more than twice the 25 Essence 2 plays at, so a conversation stays real time.

The Android Expression 2 number is what a cool phone does. Under continuous rendering a Galaxy S25+ warms up and settles at about 40 frames per second after a few minutes — still twice the 20 frames per second Expression 2 plays at, so a conversation stays real time.

The Android Essence 2 number went from 52 on essence2-android 0.5.11 to 46 on 0.5.12, and that is a change in the picture, not a slower engine: from 0.5.12 the mouth is drawn inside the identity's own lip outline instead of a plain oval that covered more of the face, and shaping every frame to that outline is more work per frame. A cool Galaxy S25+ measured 47, 46 and 50 frames per second on three separate starts; 46 is the lowest, and it is still well above the 25 frames per second Essence 2 plays at.

The Essence 2 Web cell does not carry a number today. The engine computes about 27 frames per second in Chrome on an M4 when it is driven on its own, but that measurement stops the page's own display loop and detaches the live audio. On the page a visitor actually opens, with the voice playing and the picture being drawn on the same browser thread, Essence 2 delivered about 11 frames per second on 2026-09-15 — well under the 25 it plays at, so the face barely moves while the voice continues. Expression 2 in the same browser delivers its full 20 frames per second, because it does its work on a background thread and leaves the display loop free. This is a limitation of the Essence 2 web build, not of the hardware.

The Linux numbers come from an Intel Core i7-13700F desktop with nothing else running. Earlier Linux numbers (37 and 13) came from a different machine, an AMD Threadripper PRO 5955WX server that was also running production work, so the change reflects the machine, not a software update.

The Linux Essence 2 number is how fast the CLI renders a file, not the rate a conversation plays at. Essence 2 plays at 25 frames per second on every platform, and headroom above that shortens a render and absorbs a busy machine rather than putting more frames on screen. Essence 2 on Linux also varies more from run to run than any other row here: on the same desktop, the same release and the same clip, repeated renders at the stock settings measured between 25 and 33 frames per second on 2026-09-17, with the slowest and the fastest both taken on an idle machine. Expression 2 measured in the same session on the same desktop stayed inside 2 per cent, so this is something about Essence 2 rather than about the machine.

Read a number here with the frame size beside it. Essence 2 delivers a 1920x1080 picture 25 times a second and Expression 2 delivers a 416x720 picture 20 times a second, which is 8.65 times the pixels per second of speech. On the Cloud GPU row that makes Essence 2's 86 about 178 megapixels a second against Expression 2's 272 at 81 — Essence 2 is doing 2.19 times more pixel work per second while its number reads smaller. What the two columns DO compare on is how far above the conversation each one renders, 3.44 times real time against 13.6, and every cell prints it.
<!-- /FLOORS:NOTES -->

</details>

Measured audio in to frame out, once the model has loaded. Loading the model the
first time adds to the total.

Setup for each platform is on its own page — [pick a platform](/sdk).

<small>Measured September 2026.</small>
