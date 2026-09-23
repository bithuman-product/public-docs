---
title: "Essence 2"
description: "Essence 2 — bitHuman's photorealistic avatar model: your identity's own footage, lip-synced live at up to 1080p. Where it runs, how an agent is created, how it serves, and what to expect."
section: concepts
group: "Models"
order: 2
label: "Essence 2"
---

## What it is

**Essence 2** (`essence-2`) is bitHuman's photorealistic model and the default
for real people. It animates your identity's own footage — a 10-second identity
video generated from your portrait, at up to 1920x1080 — and renders lip-sync
and expression over it live, at 25 fps. The mouth interior, teeth included, is
rendered sharply rather than averaged out of the source frames.

It is **fail-closed**: a model file with a required part missing is refused
rather than played with a substituted mouth.

## When to choose it

- **A photorealistic person** — start here.
- **Always-on and high-concurrency deployments** — kiosks, lobby displays and
  24/7 assistants. The cloud serves it from CPU and Apple Silicon tiers as well
  as GPU.
- **On your own hardware** — every SDK platform runs it.

For a stylized character, or a scene generated from one photo, choose
[Expression 2](/concepts/expression-2). The side-by-side is on
[Models](/concepts/models).

## Where it runs

| Surface | How |
|---|---|
| bitHuman cloud | the [REST API](/api/overview), the [embed widget](/guides/deploy-embed) and [LiveKit](/sdk/livekit) — routed down a GPU → Apple Silicon → CPU chain |
| macOS and Linux | the [CLI](/sdk/cli) (`run`, `render`) and the [Python SDK](/sdk/python) (frames, and MP4 clips with `bithuman.offline`) |
| iPhone, iPad, Mac | the [Apple SDK](/sdk/ios)'s `Essence2` product (iOS / macOS 26) — a complete app is on [Swift / iOS — Essence 2](/examples/swift-ios-essence2) |
| Android | [`essence2-android`](/sdk/android) — fetching the identity needs your API secret |
| The viewer's browser | [`?render=local`](/sdk/web#render-in-the-tab), for an identity whose in-browser build is published |

The file you download is `<CODE>.imx`, from
[`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE> --model essence-2`. Measured frame rates per platform
are on [performance](/sdk/performance).

## How creation works

Create the agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
and `model: "essence-2"`, or add `essence-2` to an existing agent with
[`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent).

- **The input is a portrait image** of a photorealistic human. A stylized or
  non-human input is refused with
  [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) before anything is
  billed; `model: "auto"` routes it to Expression 2 instead.
- **The platform generates the identity video** from the image, then trains the
  identity. Poll [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status)
  until `ready`; allow **about 2 to 2.5 hours**.
- **`ready` serves before it downloads.** The downloadable file is published a
  little later; until then the download endpoint answers a retryable
  `404 MODEL_ARTIFACT_NOT_READY`.

The creation cost is on [pricing](/guides/pricing).

## Serving tiers

By default each cloud session is routed down the **GPU → Apple → CPU** chain and
overflows to the next tier on capacity. The Apple tier is bitHuman's Apple
Silicon, not your Mac. To force one tier for a benchmark, append
`?model=essence-2-gpu`, `essence-2-apple` or `essence-2-cpu` to the session
URL — how a pin behaves is on
[pin a serving tier](/concepts/models#advanced-pin-a-serving-tier). For
production, omit it.

## Idle and speaking behavior

The identity video plays continuously and loops **forward-only**: at its last
frame it wraps to the first, and it never plays in reverse. While idle it is
pure playback of your footage; while talking, the animated face is rendered
over the same frames. Idle animation is not billed.

## Limits and expectations

- **Output is 25 fps on every tier.** How fast a platform can *produce* frames
  is on [performance](/sdk/performance).
- **The downloadable file is about 85–105 MB**, varying per identity — read
  `Content-Length` rather than assuming a size.
- **The identity is fixed at creation.** To change the face, create a new agent.
- **The first session on a new agent** can take longer to connect while the
  identity is provisioned; later sessions reuse it.
- **Before training completes**, a launch that requests this model is refused
  with [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors). Once ready,
  `essence-2` appears in the agent's `supported_models`.
- **Renderer improvements roll out per identity.** An agent created earlier
  keeps its build until it is retrained; nothing in the API or the price
  changes.

## Next steps

- [Models](/concepts/models) — the four models side by side
- [Agents API](/api/agents) — create, poll, download
- [Embed widget](/guides/deploy-embed) — a live session in minutes
- [Video API](/api/video) — render an MP4 with `model: "essence-2"`
- [Session behavior & troubleshooting](/guides/session-troubleshooting)
