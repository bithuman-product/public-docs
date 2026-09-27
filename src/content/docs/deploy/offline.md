---
title: "Fully offline"
description: "Realtime avatars that run completely locally, off the internet, on Linux PCs and terminals: for Business and Enterprise clients, arranged through sales."
section: deploy
group: "Modes"
order: 50
type: deploy
searchTitle: "Fully offline: realtime avatars off the internet, for kiosks and terminals"
availability: "business-enterprise"
renders: ["offline"]
models: ["essence-1", "essence-2", "expression-2"]
claims: ["S11", "S12", "S13", "S21"]
next: ["/deploy/cpu", "/pricing", "/deploy"]
---

## What it is

Offline license is only available to Business and Enterprise clients who want to run realtime avatars completely locally, off the internet — e.g. kiosks, trade shows, ATM machines, embedded screens. Linux PCs and terminals; arranged through sales.

- **Plans:** Business & Enterprise.
- **Billing:** credit-based, from 100,000 credits, metered on the machine.
- **Connectivity:** no required reconnection.

[Contact sales](https://www.bithuman.ai/sales) to arrange an offline license.

## Where it renders

```dataflow
offline
```

Creating the avatar from a portrait happens in the bitHuman cloud; the finished avatar model then runs on your machines.

## Models available here

```model-matrix
place: offline
```

Essence 1, Essence 2 and Expression 2 run fully offline; Expression 1 runs in the bitHuman cloud only.

## Speed

An offline machine is a Linux PC. How fast each model renders on a Linux PC with no GPU is on [CPU only (no GPU)](/deploy/cpu#speed).

## Price

```price
offline
```

## Limits

- **Linux PCs and terminals** only. Phones, Macs and browsers stay online: the Swift package, the Android SDK and the web embed check your credential when a session starts.
- **Creation is online:** you create the avatar from a portrait in the bitHuman cloud before it runs offline.
- **Not file rendering:** `bithuman render` and Python's `bithuman.offline` write a video file and sign in online, on any plan that can render.

## Choosing between modes

- **A Linux PC with a connection:** [CPU only (no GPU)](/deploy/cpu), on the Creator plan or higher.
- **Your own machines, online:** [Your servers](/deploy/self-hosted).
- **Inside an app on the phone or in the browser:** [On the device](/deploy/on-device).
- **Nothing to run yourself:** [bitHuman cloud](/deploy/cloud).
- **All five side by side:** [Deployment options](/deploy).
