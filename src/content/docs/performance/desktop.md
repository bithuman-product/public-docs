---
title: "Desktop performance"
description: "How fast Essence 2 and Expression 2 render on your own Mac or Linux machine with the CLI, Python and the Swift package."
section: performance
group: "By platform"
order: 2
type: generated
label: "Desktop"
---

Pick the row for the product you use: the CLI, Python and the Swift package render at different rates on the same machine.

<!-- FLOORS:TABLE desktop -->
| Runs on | Hardware | Essence 2 fps | Essence 2 × real time | Expression 2 fps | Expression 2 × real time |
|---|---|---|---|---|---|
| macOS · CLI | Apple M4 | 114 | **4.5×** real time | 165 | **8.2×** real time |
| macOS · Python | Apple M4 | 174 | **6.9×** real time | 169 | **8.4×** real time |
| macOS · Swift package | Apple M4 | 120 | **4.8×** real time | 177 | **8.8×** real time |
| Linux · CLI | Intel Core i7-13700F (x86_64) | 51 | **2.0×** real time | 44 | **2.2×** real time |
| Linux · Python | Intel Core i7-13700F (x86_64) | 50 | **2.0×** real time | 47 | **2.3×** real time |
<!-- /FLOORS:TABLE -->

<!-- FLOORS:RELEASES desktop -->
Measured in September 2026 on CLI 2.7.8, bithuman 2.11.12 and Swift package 2.15.0.
<!-- /FLOORS:RELEASES -->

## What the numbers mean

- Each figure is one render of a reference speech clip, as fast as the machine allows, with nothing else running.
- The macOS CLI Essence 2 figure was measured with 8 render threads. The Linux CLI uses default settings.
- Only these two machines are measured: an Apple M4 Mac and an Intel Core i7-13700F desktop. Other processors render at other rates.

Memory per render is on [How we measure](/performance/method#memory). Setup for each product: [CLI](/sdk/cli), [Python](/sdk/python), [Apple](/sdk/apple).
