---
title: "Fully offline"
description: "Real-time avatars that run completely locally, off the internet."
section: deploy
group: "Where it renders"
order: 50
type: deploy
llms: deploy
searchTitle: "Fully offline: real-time avatars off the internet, for kiosks and terminals"
availability: "business-enterprise"
renders: ["offline"]
models: ["essence-2", "expression-2", "essence-1"]
claims: ["S11", "S12", "S13", "S21"]
next: ["/deploy/cpu", "/pricing", "/deploy"]
moved:
  models-available-here: /deploy#compare
  choosing-between-modes: /deploy#compare
---

## What it is

Offline license is only available to Business and Enterprise clients who want to run realtime avatars completely locally, off the internet — e.g. kiosks, trade shows, ATM machines, embedded screens. Linux and macOS computers (Apple silicon); bought in the console or through sales.

- **Plans:** Business & Enterprise.
- **Billing:** credit-based, from 100,000 credits, metered on the machine.
- **Connectivity:** no required reconnection.

Buy a pack in the console ([how](#first-command)), or [contact sales](https://www.bithuman.ai/enterprise?topic=offline#contact) for Enterprise terms.

Compare every mode: [Deployment options](/deploy#compare).

## Where it renders

```dataflow
offline
```

```diagram
topology offline
```

Creating the avatar from a portrait happens in the bitHuman cloud; the finished avatar model then runs on your machines.

## Speed

An offline machine is a Linux PC or a Mac with Apple silicon. How fast each model renders on a Linux PC with no GPU is on [CPU only (no GPU)](/deploy/cpu#speed).

## Price

```price
offline
```

## Limits

Essence 1 runs fully offline today on Linux (x86_64 and ARM64) and on macOS with Apple silicon. Essence 2 and Expression 2 run fully offline on Linux x86_64 (bitHuman 2.11.17 or later). On Linux, the Python package and the bitHuman CLI (2.8.4 or later) both run offline packs; on a Mac, the Python package. Expression 1 runs in the bitHuman cloud only.

- **Linux PCs and terminals, and Macs with Apple silicon** (the Python package, bitHuman 2.11.17 or later, on macOS). Phones and browsers stay online, and so do apps built on the Swift package: the Swift package, the Android SDK and the web embed check your credential when a session starts.
- **Creation is online:** you create the avatar from a portrait in the bitHuman cloud before it runs offline.
- **One pack per process:** an engaged pack meters every avatar its process renders, so run each model (Essence 1, Essence 2, Expression 2) in its own process.
- **File rendering:** without a pack, `bithuman render` and Python's `render()` sign in online and bill your account. With an installed pack that covers the avatar, they render with no network and no API secret, and spend the pack.

## First command

Available today: **Essence 1** on Linux x86_64, Linux ARM64 and macOS (Apple silicon); **Essence 2 and Expression 2** on Linux x86_64 (bitHuman 2.11.17 or later).

1. **Buy a pack** for the [offline license](/deploy/offline) in the console (**Developer → Offline licenses**), choosing the model and the platform it will run on. A pack is at least 100,000 credits at the self-hosted rate. You can cancel it for a full refund until a machine redeems it. Through the API: `POST /v1/offline/entitlements` with `"platform": "linux-x86_64"`, `"linux-aarch64"` or `"macos-arm64"`.
2. **Redeem it once, on the machine that will run it**, while it is online, with your account's API secret and bitHuman 2.11.16 or later on Linux (2.11.17 or later on a Mac):

   ```bash
   pip install -U "bithuman>=2.11.17"
   export BITHUMAN_API_SECRET=...
   python -m bithuman pack redeem
   ```

   For Expression 2, install `"bithuman[expression-2]>=2.11.17"` instead. With the bitHuman CLI on Linux (2.8.4 or later), `bithuman pack redeem` with `BITHUMAN_API_SECRET` set does the same.

   This binds the pack to this machine and installs it; on a Mac it is sealed with the Mac's Secure Enclave. If the install step fails, `python -m bithuman pack redeem --file <pack>` retries it from the copy kept in `~/.bithuman/packs/`, with no connection and no second charge.
3. **Prepare the machine once while online.** Render your avatar once before you disconnect (`python -m bithuman render <avatar> <audio>`), or with the CLI run `bithuman pull <avatar>`. This downloads the avatar and the engine files its model needs; a render is metered by the pack like any other.
4. **Run offline.** The machine now renders with no network and no API secret until the pack's credits are spent. Credits are metered on the machine, at the self-hosted rate for active session time. It never has to reconnect.

The overview to share with your team is on bithuman.ai: [offline AI avatars for kiosks and terminals](https://www.bithuman.ai/offline).
