---
title: "Cloud API performance"
description: "How fast Essence 2 and Expression 2 render on the hosted cloud API, for each tier the service runs on."
section: performance
group: "By platform"
order: 1
type: generated
label: "Cloud API"
---

By default the service picks the tier for each session; each row is one tier. To benchmark one tier you can pin it ([pin a serving tier](/concepts/models#advanced-pin-a-serving-tier)); in production, let the service choose.

<!-- FLOORS:TABLE cloud -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Cloud API · GPU | NVIDIA RTX 4090 | 98 | **3.9×** real time | 340 | **17.0×** real time |
| Cloud API · Apple silicon | Apple M4 Max | 70 | **2.8×** real time | 111 | **5.5×** real time |
| Cloud API · CPU | x86 server CPU | 28 | **1.1×** real time | 27 | **1.3×** real time |
<!-- /FLOORS:TABLE -->

<!-- FLOORS:RELEASES cloud -->
Measured in September 2026 on the cloud API.
<!-- /FLOORS:RELEASES -->

## What the numbers mean

- Each figure is how fast one finished video is delivered, including encoding the video file, on a server with no other sessions.
- With other sessions on the same server, a session can render more slowly than shown.
- A live conversation plays at the model's own rate, 25 fps for Essence 2 and 20 fps for Expression 2. Speed above that makes a video file finish sooner; it does not put more frames on screen.

To render on your own hardware instead, see [Desktop](/performance/desktop), [Mobile](/performance/mobile) and [Web browser](/performance/web).
