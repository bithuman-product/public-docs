---
title: "Faster than real time on every configuration we publish"
description: "Measured speed for Essence 2 and Expression 2 on iPhone 15, Samsung Galaxy S25+, an Apple M4 Mac, a Linux PC with no GPU, Chrome with WebGPU and the bitHuman cloud."
section: resources
group: "News"
order: 30
type: guide
llms: none
searchTitle: "News: Essence 2 and Expression 2 render faster than real time on the device"
models: ["essence-2", "expression-2"]
next: ["/performance", "/performance/method", "/deploy/on-device"]
---

Published 2026-09-29.

Every configuration we publish renders faster than real time, including 10-minute sustained runs on iPhone 15 and Samsung Galaxy S25+.

## The numbers

```perf
iphone-15 iphone-15-sustained android-s25plus android-s25plus-sustained macos-sdk macos-m4 linux-cpu web cloud-gpu
```

In Chrome on an Apple M4 with WebGPU, the figure is the engine's render speed in the tab, not the frame rate a visitor sees.

## How we measure

× real time is seconds of avatar video rendered per second, end to end from speech audio in to frame out, one session, unpaced; each figure is the slowest of three quiet runs on the published release. At 1.0× or more an avatar holds a live conversation.

The full method and the raw data: [How we measure](/performance/method). Every published configuration: [Performance](/performance).

## Where it renders

Essence 2 and Expression 2 render on the device: iPhone, iPad and Mac (Swift package), Android arm64 (Android SDK), macOS on Apple silicon and Linux x86_64/arm64 (CLI, Python SDK), and in a browser tab with WebGPU. Both models run live on a standard Linux PC with no GPU.

Android, and Essence 2 on iPhone and iPad, need a physical device, not an emulator or the Simulator.

## Try it

- Sample avatars you can try without an account: Essence 2 `sofia-ramirez` and Expression 2 `wise-pup`. Talk to one in the [quickstart](/start).
- Render on the phone, the Mac or in the browser: [On the device](/deploy/on-device).
- Render on a PC with no graphics card: [CPU only (no GPU)](/deploy/cpu).
