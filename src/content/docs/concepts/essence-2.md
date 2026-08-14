---
title: "Essence 2"
description: "Official guide to essence-2 — bitHuman's standard photoreal avatar model: an efficient renderer that runs everywhere (GPU, Apple Neural Engine, CPU, WebGPU/WASM), train-on-create from a photo, and pricing."
section: concepts
group: "Models"
order: 2
label: "Essence 2"
---

> **Note — Generally available.** **`essence-2`** ("Essence 2") is the
> **standard** second-generation Essence model and the default for
> photorealistic humans — as a developer you simply select `essence-2`, and
> bitHuman serves the right tier for your hardware and quality needs.
> Coming from an earlier model name? See
> [Naming & migration](/concepts/models-v2#naming--migration).

## What it is

**Essence 2** is the standard photoreal model of the second-generation
Essence family: a **compact, efficient** engine that keeps the Essence look — your
identity's footage at its native resolution (a full-HD 1080p identity
video by default), lip-synced live at ~25 frames per second — at a
fraction of the compute of [Essence 2 Max](/concepts/essence-2-max), the
highest-fidelity renderer in the family. At creation the platform
packages your identity into a compact bundle; that one artifact then runs
**everywhere**: cloud **GPU**, the **Apple Neural Engine (ANE)**, **CPU**,
and in-browser **WebGPU/WASM** (in rollout) — including a fully
**on-device** Apple Silicon build where audio and video never leave the
hardware.

It is half the cloud price of [Essence 2 Max](/concepts/essence-2-max)
and the only Essence 2 model with CPU, Neural Engine, and browser runtimes —
the right default for photorealistic humans, kiosks, high-concurrency
deployments, and privacy-sensitive environments.

## When to choose it

- **It's the default.** For photorealistic humans, start here — pick
  [Essence 2 Max](/concepts/essence-2-max) only when maximum fidelity is the
  whole point.
- **Cost-effective at scale.** 4 credits/min cloud (2 self-hosted) with CPU
  and Neural Engine runtimes that don't need a server GPU per session.
- **On-device or privacy-first.** The Apple Silicon build runs entirely
  on-device on the Neural Engine — inference is local, and the ANE renders far
  faster than real time (hundreds of frames per second on M4-class hardware),
  leaving the CPU and GPU free for your app.
- **Always-on deployments.** Kiosks, lobby displays, and 24/7 assistants where
  per-minute GPU pricing would dominate.

If maximum image fidelity is the whole point, choose
[Essence 2 Max](/concepts/essence-2-max) — the highest-fidelity renderer,
served on dedicated cloud GPUs. If you want fully generated
motion from a single photo, choose [Expression 2](/concepts/expression-2). For
the family-level decision, start at
[Essence 2 & Expression 2](/concepts/models-v2).

## How creation works

Create the agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
and `model: "essence-2"`. Creation is asynchronous and costs **500 credits**
(one-time, per agent).

> **Tip — one creation, both Essence 2 models.** `essence-2` is the
> [combined creation](/api/agents#essence-2--the-combined-creation): the one
> 500-credit charge trains the standard Essence 2 **and** makes
> [Essence 2 Max](/concepts/essence-2-max) available from the same
> internally generated identity video — pick the model at launch. Like every Essence 2 creation,
> the input must be a **photorealistic human subject** (else
> [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors), nothing billed);
> `model: "auto"` routes automatically instead. You can also
> [add `essence-2`](/api/agents#add-a-model-to-an-existing-agent) to an
> existing agent that has a stored identity video.

> **Note** The Python examples below use
> [`requests`](https://pypi.org/project/requests/), which is not in the standard
> library — `pip install requests` first, or use `curl`.
>
> Do **not** use Python's standard-library `urllib` without setting a
> `User-Agent`: it sends `Python-urllib/3.x`, which our edge rejects with
> `403 error code: 1010` before the request ever reaches the API. Any
> explicit User-Agent works — `requests`, `httpx`, `aiohttp` and `curl` all
> send one and are unaffected.

```python
import requests

import os

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={
        "Content-Type": "application/json",
        "api-secret": os.environ["BITHUMAN_API_SECRET"],
    },
    json={
        "prompt": "You are a helpful retail assistant.",
        "image": "https://example.com/portrait.jpg",
        "model": "essence-2",
    },
)
print(resp.json())
# {"success": true, "message": "Agent generation started",
#  "agent_id": "A66GYD8664", "status": "processing"}
```

> **Note — `image` must be publicly fetchable, and this is not checked at
> submit time.** The `https://example.com/…` URLs above are placeholders.
> Posting one verbatim returns `HTTP 200` with
> `{"success": true, "status": "processing"}`, and the job only fails seconds
> later with `Image processing failed: Failed to download after 3 attempts:
> 404`. The credits are charged at submit and **automatically refunded** on that
> failure (verified 2026-07-28: `-500` then `+500` within 4 s), so nothing is
> lost — but a `200` here is not confirmation that your image was accepted. Poll
> [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) before assuming
> the creation started.


**Inputs.** Creation is **image-only**: supply a portrait `image` of the
identity (or let the prompt generate one), and the platform **generates the
identity video for you** as a creation step before training — a 10-second
clip authored to loop seamlessly, so idle playback never shows a seam
(you'll see `current_step: "video"` at ~45% progress). Video input is not
part of the creation contract: a request carrying `video` is rejected with
[`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
anything is billed (verified live 2026-08-01). One `aspect_ratio` value
drives **both** the identity image and the driver video (`16:9` default,
`9:16`, `1:1`), and the `framing` / `transparency` knobs shape the generated
identity image — see [the parameter table](/api/agents#generate-an-agent).
A voice is prepared as part of creation (supply `audio` to clone one, or one
is generated).

**What happens.** Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status): the run moves
through the standard steps (`payment` → `persona` → `voice_image`), generates
the identity video (`video`), then enters the
training step (reported as `current_step: "lip_sync"`, ~70% progress)
where the trainer builds the compact identity bundle on a cloud GPU. When
status reaches `ready`, the agent is servable on every tier.

**How long.** Creation typically takes **about 45 minutes** end to end.
Some identities take longer — the platform allows a run up to several
hours before flagging it as stuck, so keep polling `status` rather than
applying your own short timeout.

## Serving tiers

A ready agent serves through every delivery surface — the
[embed widget](/guides/deploy-embed), the viewer/share URL, the
[REST API](/api/agents), and the [LiveKit plugin](/guides/deploy-livekit).
By default (`?model=essence-2`, or no override at all) the platform routes
each session down the **serving chain — GPU → Apple Neural Engine → CPU** —
overflowing to the next tier on capacity, so sessions land on the most
cost-efficient runtime that's available.

For benchmarking or placement testing you can **force one runtime tier** with
the `?model=` override on the session URL (a forced tier never overflows and
fails loudly if unavailable):

| `?model=` slug | Runtime | Notes |
|---|---|---|
| `essence-2` | The full chain (default) | GPU → Neural Engine → CPU with automatic overflow — the public name. |
| `essence-2-gpu` | Cloud GPU | Force the GPU tier. |
| `essence-2-ane` | Apple Neural Engine | Force the ANE tier. |
| `essence-2-cpu` | Cloud CPU | Force the CPU tier — no GPU in the path. |

```text
https://bithuman.ai/embed/A66GYD8664?model=essence-2-cpu
```

Tier slugs are an advanced, operational surface. Saved links carrying
pre-rename or retired slugs keep working — see
[Naming & migration](/concepts/models-v2#naming--migration). For production,
omit `?model=` and let the platform choose. See
[tier pinning on the embed widget](/guides/deploy-embed#pin-a-serving-tier).

**On-device.** The same compact identity also runs **fully on-device** on
Apple Silicon via the [Swift SDK](/sdk/swift) rail (preview maturity): the
Neural Engine executes the model locally, so audio, video, and prompts never
leave the device — the only network traffic is the once-per-minute billing
heartbeat. (Essence 2 Max has no on-device runtime; the standard Essence 2 is
the on-device Essence 2 model.)

**In the browser.** A browser-local tier is **rolling out**: appending
`?render=local` to a session URL downloads the identity's compact web bundle
and renders Essence 2 **in the browser** — WebGPU on Apple Silicon and
desktop-class GPUs (real-time with headroom), WASM fallback elsewhere — with
no server render in the path. It activates per identity as web bundles
publish; sessions without a published bundle fall back to cloud serving. See
[browser rendering](/guides/browser-rendering) and the
[device/runtime matrix](/concepts/models-v2#where-each-model-runs) for
current status.

## Idle and speaking behavior

Essence 2 animates the identity's footage — the internally generated
identity video: the base video
plays continuously and the engine renders lip-sync and expression over it. As
of **2026-07-02**, the base video loops **forward-only** on every tier — when
the clip reaches its last frame it wraps back to the first, and it never plays
in reverse. This applies both while idle and while speaking, so motion always
reads as natural forward movement.

## Pricing

| Surface | Rate |
|---|---|
| Cloud serving (all runtimes) | **4 credits/min** |
| Self-hosted serving | **2 credits/min** |
| Agent creation | 500 credits (one-time) |
| [Talking-video renders](/api/video) | 4 credits per minute of output (rounded up) |

Per-minute serving is metered for the whole time a session is live and the
engine is rendering — **idle/silent animation included**. Only stopped, paused,
or disconnected sessions stop accruing. Full schedule: [Pricing & credits](/guides/pricing).

## The renderer (updated 2026-07-27)

Essence 2 renders through a **unified renderer**: the face is animated from your
identity's own footage, while the **mouth interior — the teeth especially — is
synthesized** rather than being averaged out of the source frames. Teeth simply
are not present in a closed-mouth portrait, so they have to be generated; that
is the part that most visibly improved. Measured
against each identity's own previous build, mouth-region fidelity improved
**roughly 2× to 4.7×** across the launch gallery, verified frame by frame by
eye. Mouth motion is also re-centred and wider, so speech reads as more dynamic.

It costs nothing extra to serve — measured warm and end to end — and **pricing
is unchanged**. The identity bundle also got about **5× smaller** (see Limits,
below). **New creations get it automatically**; agents created before
2026-07-27 keep serving their current build until they are retrained. Nothing
in the API, the session contract, or the `?model=` tier slugs changed.

## Limits and expectations

- **Renders at ~25 fps** across GPU, CPU, and Apple Neural Engine runtimes.
- **Creation takes about 45 minutes** (see above) — poll status rather than
  assuming the few-minute wall-clock of `essence-1`.
- **The downloadable identity bundle is ~85–105 MB** on the current renderer
  (agents created before 2026-07-27 are larger — up to ~550 MB — until
  retrained). Size varies per identity: read `Content-Length` rather than
  assuming a fixed figure.
- **Identity is fixed at creation.** The bundle bakes the generated identity
  video's look and framing; to change the face, create a new agent.
- **First session on a fresh agent** can take longer to connect while the
  identity bundle is provisioned onto the serving tier; subsequent sessions
  reuse it. See [troubleshooting](/guides/session-troubleshooting).
- **Before training completes**, launch surfaces that request this model
  reject it with [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors). Once
  the agent is ready, this model's family appears in its `supported_models`
  (on [status / get / list](/api/agents#poll-status) and the embed-token
  response). During the rename rollout, server responses may still report
  the family under an earlier name — see
  [Naming & migration](/concepts/models-v2#naming--migration).

## The developer journey

Every path to a live Essence 2 avatar, in order — each step links the page
with runnable, verified examples:

1. **Create** — [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
   with `model: "essence-2"` (equivalently `model: "essence", version: "v2"`).
   Image-only intake, 500 credits, idempotent retries via the
   [`Idempotency-Key` header](/api/agents#idempotent-retries--the-idempotency-key-header).
   Also creatable from any [MCP client](/guides/mcp-server) (`generate_agent`
   with `model`/`version`) or the dashboard.
2. **Poll** — [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status)
   until `status: "ready"`; the long `lip_sync` step is the training.
   Failures refund automatically.
3. **Inspect** — [`GET /v1/agent/{code}`](/api/agents#get-an-agent) returns
   the persona, voice, media (including the internally generated identity
   video), and `supported_models` (`essence-2` + `essence-2-max` after the
   combined creation).
4. **Go live** — [embed widget](/guides/deploy-embed) or share URL for the
   fastest path; [LiveKit plugin](/guides/deploy-livekit) for programmatic
   real-time sessions (`AvatarSession` takes the agent code); tier control
   via [`?model=`](#serving-tiers). Drive a live session with
   [`/speak` and `/add-context`](/api/agents#make-an-agent-speak).
5. **Render offline** — [`POST /v1/video/generate`](/api/video) with
   `model: "essence-2"` for mp4s (4 credits/min of output).
6. **Download the artifact** —
   [`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model)
   or [`bithuman pull <code>`](/sdk/cli/commands#pull-your-own-agents-model-by-code)
   → `<code>.lebundle.imx`. Inspect it with
   [`bithuman info`](/sdk/cli/commands#bithuman-info--inspect-a-model) (full
   member listing as of CLI 2.4.1). **Licensed weights, cloud-served today**:
   the [Python SDK](/sdk/python#which-model-artifacts-can-the-sdk-load) cannot
   yet load current-renderer Essence 2 bundles locally — serve through the
   cloud surfaces.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Second-generation gallery](https://bithuman.ai/explore?gallery=v2) — talk to a live launch agent.
- [Essence 2 Max](/concepts/essence-2-max) — the premium, highest-fidelity model.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [MCP server](/guides/mcp-server) — create and manage agents from Claude, Cursor, or any MCP client.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `model: "essence-2"`.
