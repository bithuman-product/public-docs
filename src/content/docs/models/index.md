---
title: "Compare models"
description: "Essence 2 renders a photoreal person and Expression 2 any character, each from one portrait. Where each model renders, which to pick, and how an avatar is created."
section: models
group: "Models"
order: 0
type: concept
llms: models
models: ["essence-2", "expression-2", "essence-1", "expression-1"]
claims: ["S1", "S3", "S12", "S13", "S21", "S28"]
demo: "both"
next: ["/models/essence-2", "/models/expression-2", "/deploy"]
---

Every model reads the same [`.imx` avatar file](/models/avatar-file) and has the same shape: [push audio in, take lip-synced frames out](/models/how-it-works#audio-in-frames-out). The same agent works on every platform that runs its model.

## The models

```model-cards
```

Essence 2 Max is available on the Enterprise plan only. [Contact sales](https://www.bithuman.ai/enterprise?topic=models#contact) to enable it.

Essence 1 and Expression 1 are the [first generation](/models/first-generation). They stay supported, and nothing changes for agents that use them.

## Which should I choose?

- **A photorealistic person:** Essence 2.
- **A stylized or non-human character, or a whole generated scene:** Expression 2.
- **Not sure:** create with `model: "auto"`. A photorealistic person routes to Essence 2, anything else to Expression 2.
- **On a phone, a Mac or in a browser:** Essence 2 or Expression 2.
- **Maintaining a first-generation agent:** keep it. Essence 1 runs on your own CPU; Expression 1 runs in the bitHuman cloud.

## Where each model runs

Each place links to the page that sets it up.

```model-matrix
```

Rendering on your own hardware, every place but the bitHuman cloud, bills at the self-hosted rate ([pricing](/pricing)). How fast each model renders on each device: [Performance](/performance).

## How creation works

You create an agent once, with [`POST /v1/agent/generate`](/api/agents#generate-an-agent) or in the bitHuman app, and serve it anywhere its model runs.

- **The input is one portrait image.** Essence 2 generates its identity video from it; Expression 2 trains straight from the photo. An uploaded image is treated as a reference and regenerated to a standard framing.
- **Creation happens in the bitHuman cloud;** the finished avatar model then runs on your devices.
- **Both second-generation models train on create.** Allow about 2 to 2.5 hours, and poll [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) until the status is `ready` or `failed` (`success` is not terminal).
- **Essence 2 needs a photorealistic human subject.** A stylized input is refused with [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) before anything is billed; `auto` routes it to Expression 2 instead.
- **Always send `model`.** An omitted `model` creates an Expression 1 agent; send `essence-2`, `expression-2` or `auto`.
- **An existing agent can gain a model** with [`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent).

What creation costs is on [pricing](/pricing#creation--one-time-credits); request fields and failure modes are on the [Agents API](/api/agents).

## Naming & migration

This is the one place the historical names are documented. Every other page uses
the four product names. Deprecating a word does not rename a wire format, so some
legacy names are still strings you read or type:

| Legacy name you may meet | Where | What it means | Do you type it? |
|---|---|---|---|
| `essence`, `expression` | older `?model=` links and request bodies | Essence 1, Expression 1 | No — write `essence-1` / `expression-1` |
| `essence2-light` | the `Engine:` line from `bithuman open` — a [legacy engine value](/models/avatar-file#the-engine-value-is-a-legacy-name) | Essence 2 | No — read the `Family:` line |
| `essence-2-light` | the retired tier name (the old Light tier) | Essence 2 | No — a request naming it gets a `400`; write `essence-2` |
| `elevate`, `essence-2-quality` | retired names of the premium tier, now Essence 2 Max (Enterprise plan only) | a separate tier, not Essence 2 | No — a request naming them gets a `400` |
| `embody` | a retired request spelling | Expression 2 | No — a request naming it gets a `400` naming `expression-2` |
| `.lebundle.imx`, `.avatar` | older file extensions | an Essence 2 or Expression 2 model file | Only if you already have one; it opens as-is |
| `[embody]` | the legacy prefix on log lines of the Apple `Expression2` engine | Expression 2 | Grep your logs for it |
| `BITHUMAN_EMBODY_DIR`, `EMBODY_DEBUG_FAIL_PREDICT` | legacy variables the Apple `Expression2` engine still reads beside their `EXPRESSION2_` twins | Expression 2 | No — set `BITHUMAN_EXPRESSION2_DIR` |
| `libelevate`, `libelevate-android` | legacy library names | Essence 2 | No — the Android coordinate is `ai.bithuman:essence2-android` |
| `libelevate-web` | the legacy path of the in-browser runtime | Essence 2 in a browser | No — embed with `https://www.bithuman.ai/embed/<CODE>` |
| `bithuman.tessera_offline`, `OfflineTesseraRenderer`, `TesseraOfflineError` | legacy Python module and class names, still importable | the Essence 2 MP4 route | No — write `bithuman.offline`, `OfflineRenderer`, `render_offline`, `OfflineRenderError` |
| `BITHUMAN_TESSERA_DIRECTOR` and the other `BITHUMAN_TESSERA_*` variables | legacy environment variables, still read | Essence 2 engine settings | No — the defaults are the fast path |
| `bithuman[tessera]`, `bithuman[offline]` | legacy pip extras, removed from the wheel in 2.11.6 | nothing — pip warns and installs the base wheel | No — `pip install bithuman` |

Saved links keep working: `essence-2-light-gpu` / `essence-2-light-cpu` still pin
their tiers, links carrying `essence-2-light` or `essence-2-light-ane` route to
the Essence 2 default chain, and the older `essence-2-ane` / `expression-2-ane`
spellings of the Apple tier stay accepted. A link carrying the retired
`?model=essence-2-quality` falls back to the agent's stored model.

One more naming point: the cloud's Apple tier is called **Apple**, not "ANE". It is the
whole Apple silicon target, not one accelerator inside it.
