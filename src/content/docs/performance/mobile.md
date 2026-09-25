---
title: "Mobile performance"
description: "How fast Essence 2 and Expression 2 render on iPhone and Android, including one session held for 10 minutes."
section: performance
group: "By platform"
order: 3
type: generated
label: "Mobile"
---

First a short burst on each phone, then one session held for 10 minutes.

<!-- FLOORS:TABLE mobile -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| iPhone · Swift package | iPhone 15 | 54 | **2.1×** real time | 110 | **5.5×** real time |
| Android | Samsung Galaxy S25+ | 52 | **2.0×** real time | 48 | **2.4×** real time |
<!-- /FLOORS:TABLE -->

<!-- FLOORS:RELEASES mobile -->
Measured in September 2026 on Swift package 2.14.2, essence2-android 0.7.0 and expression2-android 0.4.10.
<!-- /FLOORS:RELEASES -->

<!-- FLOORS:SUSTAINED -->
## Held for 10 minutes

| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Android | Samsung Galaxy S25+ | 33 | **1.3×** real time | — | — |

One session held open for ten minutes from a cool start on essence2-android 0.7.0, rendering as fast as the device allows. Each number is the median 30-second stretch of the slowest of three such sessions; the slowest single stretch was lower (Android Essence 2 33 fps). A phone warms up over a long conversation and slows its processor to stay cool, so a kiosk or any screen that renders all day should plan on this number rather than the short-burst rate.
<!-- /FLOORS:SUSTAINED -->

## What the numbers mean

- The first table is one render of a speech clip on a cool phone, as fast as the phone allows.
- Some phone figures use a shorter speech clip than the other platforms; each cell's clip is in [performance.json](/performance.json).
- Only an iPhone 15 and a Samsung Galaxy S25+ are measured. Other phones render at other rates.

Setup for each SDK: [Apple](/sdk/apple), [Android](/sdk/android).
