---
title: "Models"
description: "bitHuman's four avatar models — Essence 2 and Expression 2, the current generation, and Essence 1 and Expression 1, the first — what each renders, where each runs, which to pick, and the legacy names you may still meet."
section: guides
group: "Learn"
order: 1
type: concept
label: "Models: which one?"
---

bitHuman has four avatar models in two generations. **Essence 2** and
**Expression 2** are the current generation — start there for anything new.
**Essence 1** and **Expression 1** are the first generation; they stay
supported, and nothing changes for agents that already use them.

Every model reads the same [`.imx` container](/concepts/avatars-imx) and has
the same shape: [push audio in, take lip-synced frames out](/concepts/audio-streaming).
The same agent code works on every surface that runs its model.

## The four models

| Model | What it renders | Pick it for |
|---|---|---|
| [**Essence 2**](/concepts/essence-2) (`essence-2`) | A photoreal person from one portrait, up to 1920×1080 at 25 fps | Real people |
| [**Expression 2**](/concepts/expression-2) (`expression-2`) | Any character (stylized, animal, robot or human) from one portrait, 416×720 at 20 fps | Characters of every kind |
| [**Essence 1**](/concepts/essence-1) (`essence-1`) | First generation: pre-rendered base motion with the mouth patched in real time | Existing agents, custom gestures, low-power CPUs |
| [**Expression 1**](/concepts/expression-1) (`expression-1`) | First generation: facial animation driven from a portrait at runtime | Existing agents on an NVIDIA GPU |

## Which should I choose?

- **A photorealistic person, anywhere** — Essence 2.
- **A stylized or non-human character, or a whole generated scene** — Expression 2.
- **Not sure** — create with `model: "auto"`: a photorealistic person routes to
  Essence 2, anything else to Expression 2.
- **On a phone, a Mac or in a browser** — Essence 2 or Expression 2. Expression 1
  runs only on a GPU, and that is permanent.
- **Maintaining a first-generation agent** — keep it. Essence 1 runs on any CPU
  you host; Expression 1 runs on a GPU.

Rates for every model are on [pricing](/guides/pricing).

## Where each model runs

What is published today, per surface. Each link goes to the page that installs it.

| Surface | Essence 2 | Expression 2 | Essence 1 | Expression 1 |
|---|---|---|---|---|
| **bitHuman cloud** — [REST API](/api), [embed](/api/embedding), [LiveKit](/sdk/livekit) | yes | yes | yes | yes |
| [**CLI**](/sdk/cli) — macOS Apple Silicon, Linux x86_64 / arm64 | `run`, `render` | `run`, `render` | `run` | — |
| [**Python**](/sdk/python) — macOS Apple Silicon, Linux x86_64 / aarch64 | frames and MP4 clips | frames (`[expression-2]` extra) | frames | — |
| [**Apple**](/sdk/apple) — iPhone, iPad, Mac | `Essence2` product (iOS / macOS 26) | `Expression2` product | — | — |
| [**Android**](/sdk/android) — arm64 | `essence2-android` | `expression2-android` | — | — |
| [**Web**](/sdk/web) — rendered in the viewer's tab | per identity, where an in-browser build exists | yes | yes | — |
| [**Self-hosted GPU container**](/guides/self-hosting#the-expression-1-gpu-container) | — | — | — | yes |

- **Expression 1 is GPU-only by design.** Its empty cells are not a roadmap
  item. If you need an expressive model on a Mac, a phone or in a browser, use
  Expression 2.
- **The cloud routes each session for you**, down the model's chain of GPU,
  Apple Silicon and CPU tiers. The cloud's Apple tier is bitHuman's hardware,
  not your Mac.
- **Running on your own hardware** — every surface below the first row — is
  billed at the self-hosted rate. See [self-hosting](/guides/self-hosting).

Measured frame rates for every platform are on the
[performance page](/performance).

## How creation works

You create an agent once — with
[`POST /v1/agent/generate`](/api/agents#generate-an-agent) or the dashboard —
and serve it anywhere its model runs.

- **The input is a portrait image.** Essence 2 generates its identity video from
  it; Expression 2 trains straight from the photo. An uploaded image is treated
  as a reference and regenerated to a standard framing.
- **Both second-generation models train on create.** Allow **about 2 to 2.5
  hours**, and poll [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status)
  until the status is `ready` or `failed` — `success` is not terminal.
- **Essence 2 needs a photorealistic human subject.** A stylized input is
  rejected with [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) before
  anything is billed; `auto` routes it to Expression 2 instead.
- **An omitted `model` creates an Expression 1 agent.** Send `essence-2`,
  `expression-2` or `auto` explicitly.
- **The dashboard starts on Expression 2.** Pick Essence 2 in the model dialog,
  or switch the version to V1 for Essence 1 or Expression 1.
- **An existing agent can gain a model** with
  [`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent).

Request fields, creation costs and failure modes are on the
[Agents API](/api/agents).

## Advanced: pin a serving tier

By default the platform routes a session down the model's chain and overflows on
capacity. For benchmarking you can force one tier by appending `?model=` with a
force-tier slug to the viewer or embed URL:

```text
https://www.bithuman.ai/embed/A23WJF0199?model=expression-2-apple
```

| Model | Force-tier slugs |
|---|---|
| `essence-2` | `essence-2-gpu` · `essence-2-apple` · `essence-2-cpu` |
| `expression-2` | `expression-2-gpu` · `expression-2-apple` · `expression-2-cpu` |

- **A recognized slug pins the session** and never overflows: if that tier is
  unavailable, the session fails rather than playing elsewhere.
- **An unrecognized slug is ignored silently** and the session plays on the
  default chain. If a pin seems to have no effect, check the spelling.
- **To be told about a typo**, set the embed token's `model` field instead: an
  unknown value is refused with a `400` listing the accepted names when you
  [mint the token](/api/embedding#production-mint-a-token).

For production, omit `?model=` and let the platform choose.

## Naming & migration

This is the one place the historical names are documented. Every other page uses
the four product names. Deprecating a word does not rename a wire format, so some
legacy names are still strings you read or type:

| Legacy name you may meet | Where | What it means | Do you type it? |
|---|---|---|---|
| `essence` | the `model` field in the showcase manifest and in `agents.model` | Essence 1 | Yes — an accepted request spelling |
| `essence2-light` | the `Engine:` line from `bithuman open` — a [legacy engine value](/concepts/avatars-imx#the-engine-value-is-a-legacy-name) | Essence 2 | No — read the `Family:` line |
| `essence-2-light` | retired tier name, still stored in older `agents.model` rows | Essence 2 | No — write `essence-2`. A request naming it gets a `400` with a hint |
| `essence-2-quality` | retired internal premium tier, in older billing rows | a separate retired tier, not Essence 2 | No — a request naming it gets a `400` |
| `.lebundle.imx` | the legacy file extension an older release saved | an Essence 2 model file | Only if you already have one; `bithuman open` reads it |
| `elevate` | legacy SDK request field | Essence 2 | Accepted for compatibility; write `essence-2` |
| `embody` | legacy request spelling | Expression 2 | Accepted for compatibility; write `expression-2` |
| `libelevate`, `libelevate-android` | legacy library names | Essence 2 | No — the Android coordinate is `ai.bithuman:essence2-android` |
| `libelevate-web` | the legacy path of the in-browser Essence 2 runtime under `models.bithuman.ai/web/` | Essence 2 in a browser | No — embed with `https://www.bithuman.ai/embed/<CODE>` |
| `[embody]` | the legacy prefix on every log line of the shipped Apple `Expression2` engine | Expression 2 | Grep your logs for it |
| `BITHUMAN_EMBODY_DIR`, `EMBODY_DEBUG_FAIL_PREDICT` | legacy variables the Apple `Expression2` engine still reads beside their `EXPRESSION2_` twins | Expression 2 | No — set `BITHUMAN_EXPRESSION2_DIR` |
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

## Next steps

- [Essence 2](/concepts/essence-2) · [Expression 2](/concepts/expression-2) — the per-model guides
- [SDK](/sdk) — install a model on your own hardware
- [Agents API](/api/agents) — create, poll and download
- [Pricing & credits](/guides/pricing) — what each model costs to run
