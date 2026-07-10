---
title: "Essence 2"
description: "Official guide to essence-2 — bitHuman's standard photoreal avatar model: a distilled renderer that runs everywhere (GPU, Apple Neural Engine, CPU, WebGPU/WASM), train-on-create from video or photo, and pricing."
section: concepts
group: "Models"
order: 5
label: "Essence 2"
---

> **Note — Launching July 10, 2026 (rollout in progress).** **`essence-2`** ("Essence 2") is the
> **standard** second-generation Essence model and the default for
> photorealistic humans — as a developer you simply select `essence-2`, and
> bitHuman serves the right tier for your hardware and quality needs. Naming
> history: the former `essence-2-light` name was **retired on 2026-07-05**
> and consolidated into `essence-2` (requests naming it get a `400` with a
> hint pointing at `essence-2`); it remains the internal *family* name you'll
> see in `supported_models`, artifact errors, and downloads until the
> platform-side flip. The premium tier was renamed `essence-2-quality` →
> [`essence-2-max`](/concepts/essence-2-max) on 2026-07-10.

## What it is

**Essence 2** is the standard photoreal model of the second-generation
Essence family: a **distilled** engine that keeps the Essence look — your
identity's real footage at its native resolution (full-HD 1080p driver
video by default), lip-synced live at ~25 frames per second — at a
fraction of the compute of its gold teacher. At creation the platform
distills your identity into a compact bundle; that one artifact then runs
**everywhere**: cloud **GPU**, the **Apple Neural Engine (ANE)**, **CPU**,
and in-browser **WebGPU/WASM** (in rollout) — including a fully
**on-device** Apple-silicon build where audio and video never leave the
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
- **On-device or privacy-first.** The Apple-silicon build runs entirely
  on-device on the Neural Engine — inference is local, and the ANE renders far
  faster than real time (hundreds of frames per second on M4-class hardware),
  leaving the CPU and GPU free for your app.
- **Always-on deployments.** Kiosks, lobby displays, and 24/7 assistants where
  per-minute GPU pricing would dominate.

If maximum image fidelity is the whole point, choose
[Essence 2 Max](/concepts/essence-2-max) — the gold teacher served directly
on L40S-class GPUs. If you want fully generated
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
> identity video — pick the model at launch. Like every Essence 2 creation,
> the input must be a **photorealistic human subject** (else
> [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors), nothing billed);
> `model: "auto"` routes automatically instead. You can also
> [add `essence-2`](/api/agents#add-a-model-to-an-existing-agent) to an
> existing agent that has an identity video.

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "prompt": "You are a helpful retail assistant.",
        "video": "https://example.com/identity.mp4",   # or pass "image" — see below
        "model": "essence-2",
    },
)
print(resp.json())
# {"success": true, "message": "Agent generation started",
#  "agent_id": "A56ZFX6217", "status": "processing"}
```

**Inputs.** Essence 2 derives its identity bundle from **video**. Supply
a short clip of the identity — or supply just an `image`, and the platform
**generates the identity video for you** as an extra creation step before
training (you'll see `current_step: "video"` at ~45% progress). A voice is
prepared as part of creation (supply `audio` to clone one, or one is
generated).

**What happens.** Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status): the run moves
through the standard steps (`payment` → `persona` → `voice_image`), generates
the identity video if you didn't provide one (`video`), then enters the
distillation step (reported as `current_step: "lip_sync"`, ~70% progress)
where the trainer builds the compact identity bundle on a cloud GPU. When
status reaches `ready`, the agent is servable on every tier.

**How long.** The distillation step typically takes **25–40 minutes** of GPU
time. Some identities take longer — the platform allows a run up to several
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
| `essence-2-light-gpu` · `essence-2-light-cpu` | (legacy) | Pre-2026-07-05 force slugs — still accepted. |
| `essence-2-light` · `essence-2-light-ane` | (retired) | Saved links keep working — they route to the `essence-2` chain. |

```text
https://bithuman.ai/embed/A56ZFX6217?model=essence-2-cpu
```

Tier slugs are an advanced, operational surface. For production, omit
`?model=` and let the platform choose. See
[tier pinning on the embed widget](/guides/deploy-embed#pin-a-serving-tier).

**On-device.** The same distilled identity also runs **fully on-device** on
Apple silicon via the [Swift SDK](/sdk/swift) rail (preview maturity): the
Neural Engine executes the model locally, so audio, video, and prompts never
leave the device — the only network traffic is the once-per-minute billing
heartbeat. (Essence 2 Max has no on-device runtime; the standard Essence 2 is
the on-device Essence 2 model.)

**In the browser.** The same bundle also renders **browser-locally** via
WebGPU/WASM — no server render in the loop. The browser tier is in rollout;
see the [device/runtime matrix](/concepts/models-v2#where-each-model-runs)
for current status.

**In the browser.** A browser-local tier is **rolling out**: appending
`?render=local` to a session URL downloads the identity's compact web bundle
and renders Essence 2 **in the browser** — WebGPU on Apple-silicon and
desktop-class GPUs (real-time with headroom), WASM fallback elsewhere — with
no server render in the path. It activates per identity as web bundles
publish; sessions without a published bundle fall back to cloud serving. See
[browser rendering](/guides/browser-rendering).

## Idle and speaking behavior

Essence 2 animates the identity's **real footage**: the base video
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

Per-minute serving is metered on active avatar minutes only — idle, paused, or
disconnected time isn't billed. Full schedule: [Pricing & credits](/guides/pricing).

## Limits and expectations

- **Renders at ~25 fps** across gpu, cpu, and ane runtimes.
- **Creation takes tens of minutes** (see above) — poll status rather than
  assuming the 2–5 minute wall-clock of `essence-1`.
- **Identity is fixed at creation.** The bundle bakes the source footage's
  look and framing; to change the face, create a new agent.
- **First session on a fresh agent** can take longer to connect while the
  identity bundle is provisioned onto the serving tier; subsequent sessions
  reuse it. See [troubleshooting](/guides/session-troubleshooting).
- **Before distillation completes**, launch surfaces that request this model
  reject it with `409 MODEL_NOT_GENERATED`
  (`agent A56ZFX6217's essence-2-light model hasn't been generated yet` —
  note the *family* keeps the internal `essence-2-light` name in server
  responses until the platform-side flip).
  Once the agent is ready, its `supported_models` (on
  [status / get / list](/api/agents#poll-status) and the embed-token
  response) includes `essence-2-light`.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Essence 2 Max](/concepts/essence-2-max) — the premium model: the gold teacher served directly.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `model: "essence-2"`.
- [Download your model](/api/agents#download-an-agents-model) — the trained `.lebundle.imx` (licensed weights), via API or `bithuman pull <code>`.
