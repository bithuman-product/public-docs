---
title: "Essence 1"
description: "Essence 1 — bitHuman's first-generation avatar model: a pre-built identity lip-synced in real time on virtually any CPU. Where it runs, how to self-host it, and what the .imx file contains."
section: concepts
group: "Models"
order: 6
label: "Essence 1"
---

## What it is

**Essence 1** (`essence-1`) is bitHuman's original avatar model, and it is
maintained, not deprecated. It reads a pre-built identity out of an
[`.imx` file](/concepts/avatars-imx), plays its base motion, and patches the
mouth in real time to match 16 kHz mono audio, at 25 fps. It runs on virtually
any CPU — no GPU, no accelerator — and supports custom gestures. `?model=essence`
serves it.

For **new** photorealistic work, the recommended model is
[Essence 2](/concepts/essence-2).

## Where it runs

In bitHuman's cloud, and on your own hardware through:

- **Python** — `pip install bithuman` opens an Essence 1 `.imx` with no extra;
  see the [Python SDK](/sdk/python).
- **The CLI** — `bithuman run` on macOS Apple Silicon and Linux x86_64; see the
  [CLI](/sdk/cli). `render` does not take Essence 1 — use the Python SDK or the
  [Video API](/api/video) for a file.
- **The browser** — [`?render=local`](/sdk/web#render-in-the-tab).

There is no Essence 1 product in the Swift package, and the legacy Android
artifact `ai.bithuman:sdk` cannot authenticate on a device — on a phone, use
Essence 2 or Expression 2. The full matrix is on
[Models](/concepts/models#where-each-model-runs).

## What the file is

One file, `<CODE>.imx`: the identity, and optionally baked-in idle and gesture
clips. Download it with `bithuman pull <CODE> --model essence-1`, or:

```bash
curl -L -o "<CODE>.imx" -H "api-secret: $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/<CODE>/model/download?model=essence-1"
```

Rates are on [pricing](/guides/pricing).

## See also

* [Models](/concepts/models) — the four models, where each runs, and which to pick
* [Expression 1](/concepts/expression-1) — the other first-generation model
* [Essence 2](/concepts/essence-2) — the recommended model for new work
