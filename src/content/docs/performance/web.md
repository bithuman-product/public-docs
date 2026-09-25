---
title: "Web browser performance"
description: "How fast Essence 2 and Expression 2 render in the visitor's browser with WebGPU, measured in Chrome on an Apple M4."
section: performance
group: "By platform"
order: 4
type: generated
label: "Web browser"
---

How fast the in-browser engine renders each model when the avatar runs in the visitor's own tab (`render=local`). By default the avatar renders on the [cloud API](/performance/cloud) and streams to the page.

<!-- FLOORS:TABLE web -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| Web browser (WebGPU) | Chrome on Apple M4 | 42 | **1.6×** real time | 38 | **1.9×** real time |
<!-- /FLOORS:TABLE -->

<!-- FLOORS:RELEASES web -->
Measured in September 2026 on the hosted web viewer.
<!-- /FLOORS:RELEASES -->

## What the numbers mean

- Each figure is the engine's render throughput with WebGPU in Chrome on an Apple M4, measured in an automated browser.
- It is not the frame rate a visitor sees on the page, where the voice and the display share the browser with the engine.
- Only Chrome on an Apple M4 is measured. Other browsers, other GPUs and devices without WebGPU are not.

Setup and the WebGPU check: [Web](/sdk/web).
