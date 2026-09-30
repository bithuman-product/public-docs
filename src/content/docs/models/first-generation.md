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

## Naming & migration

This is the one place the historical names are documented. Every other page uses
the four product names. Deprecating a word does not rename a wire format, so some
legacy names are still strings you read or type:

| Legacy name you may meet | Where | What it means | Do you type it? |
|---|---|---|---|
| `essence`, `expression` | older `?model=` links and request bodies | Essence 1, Expression 1 | No — write `essence-1` / `expression-1` |
| `essence2-light` | the `Engine:` line from `bithuman open` — a [legacy engine value](/resources/renamed#the-engine-value-is-a-legacy-name) | Essence 2 | No — read the `Family:` line |
| `essence-2-light` | the retired tier name (the old Light tier) | Essence 2 | No — a request naming it gets a `400`; write `essence-2` |
| `elevate`, `essence-2-quality` | retired names of the premium tier, now Essence 2 Max (Enterprise plan only) | a separate tier, not Essence 2 | No — a request naming them gets a `400` |
| `embody` | a retired request spelling | Expression 2 | No — a request naming it gets a `400` naming `expression-2` |
| `.lebundle.imx`, `.avatar` | older file extensions | an Essence 2 or Expression 2 model file | Only if you already have one; it opens as-is |
| `[embody]` | the legacy prefix on log lines of the Apple `Expression2` engine | Expression 2 | Grep your logs for it |
| `BITHUMAN_EMBODY_DIR`, `EMBODY_DEBUG_FAIL_PREDICT` | legacy variables the Apple `Expression2` engine still reads beside their `EXPRESSION2_` twins | Expression 2 | No — set `BITHUMAN_EXPRESSION2_DIR` |
| `libelevate`, `libelevate-android` | legacy library names | Essence 2 | No — the Android coordinate is `ai.bithuman:essence2-android` |
| `libelevate-web` | the legacy path of the in-browser runtime | Essence 2 in a browser | No — embed with `https://www.bithuman.ai/embed/<CODE>` |
| older Python module and class names for MP4 rendering | legacy names, still importable — listed under [Older names](/platforms/python/reference#older-names) | the Essence 2 MP4 route | No — write `bithuman.offline`, `OfflineRenderer`, `render_offline`, `OfflineRenderError` |
| `bithuman[offline]` and the other older pip extras | legacy pip extras, removed from the wheel in 2.11.6 | nothing — pip warns and installs the base wheel | No — `pip install bithuman` |

Saved links keep working: `essence-2-light-gpu` / `essence-2-light-cpu` still pin
their tiers, links carrying `essence-2-light` or `essence-2-light-ane` route to
the Essence 2 default chain, and the older `essence-2-ane` / `expression-2-ane`
spellings of the Apple tier stay accepted. A link carrying the retired
`?model=essence-2-quality` falls back to the agent's stored model.

One more naming point: the cloud's Apple tier is called **Apple**, not "ANE". It is the
whole Apple silicon target, not one accelerator inside it.
