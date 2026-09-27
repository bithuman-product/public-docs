---
title: "Essence 2"
description: "Essence 2 renders a photoreal person from one portrait: the identity's own footage, lip-synced live, on the device or in the bitHuman cloud."
section: models
group: "Models"
order: 10
type: concept
models: ["essence-2"]
claims: ["S1", "S3", "S13", "S21", "S28"]
demo: "essence-2"
renders: ["device", "server", "cloud"]
next: ["/platforms", "/build/create-avatar", "/models/expression-2"]
---

## What it is

**Essence 2** (`essence-2`) renders a photoreal person from one portrait, up to
1080p: the identity's own canvas, 1080×1920 portrait for a standard identity. From your portrait the platform generates a 10-second
identity video; the model then animates lip-sync and expression over it live,
with a sharp mouth and teeth taken from that video.

## When to choose it

- **A photorealistic person** — start here.
- **Always-on displays** — kiosks, lobby screens and 24/7 assistants.
- **On your own hardware** — every SDK platform runs it.

For a stylized character, or a scene generated from one photo, choose
[Expression 2](/models/expression-2). The side-by-side is on
[Models](/models).

## Where it runs

```model-matrix
model: essence-2
```

A complete app for iPhone and iPad is the [iOS Essence 2 example](/examples/ios-essence-2); for Android, the [Android Essence 2 example](/examples/android-essence-2).

The file you download is `<CODE>.imx`, from
[`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE> --model essence-2`. How fast it renders on each device
is on [performance](/performance).

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

The creation cost is on [pricing](/pricing).

## Serving tiers

In the bitHuman cloud, the service picks the hardware for each session. To benchmark one tier, see [pin a tier for a benchmark](/performance#pin-a-tier-for-a-benchmark); in production, let the service choose.

## Idle and speaking behavior

The identity video plays continuously and loops **forward-only**: at its last
frame it wraps to the first, and it never plays in reverse. While idle it is
pure playback of your footage; while talking, the animated face is rendered
over the same frames. A running session bills talking and idle time alike ([pricing](/pricing)).

## Limits and expectations

- **Output plays at 25 frames a second** everywhere it runs. How fast a platform
  renders is on [performance](/performance).
- **The downloadable file is about 140–160 MB**, varying per identity — read
  `Content-Length` rather than assuming a size.
- **The identity is fixed at creation.** To change the face, create a new agent.
- **The first session on a new agent** can take longer to connect while the
  identity is provisioned; later sessions reuse it.
- **Before training completes**, a launch that requests this model is refused
  with [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors). Once ready,
  `essence-2` appears in the agent's `supported_models`.

## Next steps

- [Models](/models) — the four models side by side
- [Agents API](/api/agents) — create, poll, download
- [Embed widget](/api/embedding) — a live session in minutes
- [Video API](/api/video) — render an MP4 with `model: "essence-2"`
- [Session behavior & troubleshooting](/resources/troubleshooting)
