---
title: "First generation"
description: "Essence 1 and Expression 1: what each is, where it runs, and its file."
section: models
group: "Models"
order: 40
type: concept
llms: models
models: ["essence-1", "expression-1"]
next: ["/models", "/models/essence-2", "/models/expression-2"]
moved:
  naming--migration: /resources/renamed#retired-model-and-file-names
---

Both first-generation models are maintained, not deprecated. For new work, start on [Essence 2](/models/essence-2) (a photoreal person) or [Expression 2](/models/expression-2) (any character).

| | Essence 1 | Expression 1 |
|---|---|---|
| **Renders** | a pre-built identity from an `.imx` file | facial motion generated from a portrait at runtime |
| **Where it runs** | the bitHuman cloud; Python and the CLI on macOS and Linux; the browser (`render=local`) | the bitHuman cloud only |
| **`model` value** | `essence-1` | `expression-1` |
| **Subject** | a real person's face | a real person's face |

Both need a clear photo of a real human face. A cartoon, animal, robot or creature, or a photo with no face found, is refused with `422 MODEL_SUBJECT_MISMATCH` before anything is charged; for a character, use [Expression 2](/models/expression-2). See [Choosing a model](/models#choosing-a-model).

## Essence 1

**Essence 1** (`essence-1`) reads a pre-built identity out of an [`.imx` file](/models/avatar-file), plays its base motion, and patches the mouth in real time to match 16 kHz mono audio, at 25 fps. It runs on a CPU, with no GPU or accelerator, and supports custom [gestures](/build/gestures). `?model=essence-1` serves it.

### Where Essence 1 runs

In the bitHuman cloud, and on your own hardware through:

- **Python**: `pip install bithuman` opens an Essence 1 `.imx` with no extra; see [Python](/platforms/python).
- **The CLI**: `bithuman run` on macOS (Apple silicon) and Linux x86_64 and arm64; see [CLI](/platforms/cli). `render` does not take Essence 1: use the Python SDK or the [Talking video API](/api/video) for a file.
- **The browser**: [`?render=local`](/platforms/web/app#integrate-into-your-app).

Essence 1 is not in the Android SDK or the Swift package. On phones, use Essence 2 or Expression 2, or run Essence 1 from the cloud API, or from Python or the CLI on a desktop. The full matrix is on [Compare models](/models#where-each-model-runs).

### The Essence 1 file

One file, `<CODE>.imx`: the identity, and optionally baked-in idle and gesture clips. Download it with `bithuman pull <CODE> --model essence-1`, or:

```bash
curl -L -o "<CODE>.imx" -H "api-secret: $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/<CODE>/model/download?model=essence-1"
```

## Expression 1

**Expression 1** (`expression-1`) animates a face from a **portrait image** at runtime: you give it audio, and it generates the facial motion to match, with no per-identity build step. `?model=expression-1` serves it, and it is what `/v1/agent/generate` creates when the request names no `model`.

It is a different engine from [Expression 2](/models/expression-2), not an earlier version of it.

### Where Expression 1 runs

In the bitHuman cloud only, on cloud GPUs. There is no CPU, Apple, Android or browser build. For an expressive model on a Mac, a phone or in a browser, use Expression 2.

Cloud output is 512×512. Expression 1 can also animate a photo with no agent: see [Cloud avatar in your room](/platforms/livekit/cloud-avatar#a-photo-instead-of-an-agent).

### The Expression 1 file

Usually there is nothing to download: Expression 1 renders from the agent's portrait, so the download endpoint answers [`400 MODEL_NOT_DOWNLOADABLE`](/api/errors#model-errors) for most agents. A few older agents have a downloadable `.imx`, which the endpoint serves. The engine weights are not part of any download.

## Pricing

Rates for both models are on [Pricing and credits](/pricing).

## Older names

Older names you may meet in links, logs or files: [Renamed and retired names](/resources/renamed#retired-model-and-file-names).
