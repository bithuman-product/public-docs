---
title: "Expression 2"
description: "Official guide to expression-2 — bitHuman's second-generation expression engine: per-identity training from one photo, GPU/CPU/Apple Neural Engine serving tiers, real-footage idle, latency expectations, and pricing."
section: concepts
group: "Models"
order: 4
label: "Expression 2"
---

> **Note — Generally available.** `expression-2`
> ("Expression 2") is the second-generation expression engine and the model
> for **stylized and universal characters** — cartoons, animals, creatures,
> robots, and people. Available now — see
> [Essence 2 & Expression 2](/concepts/models-v2) for the family overview.

## What it is

**`expression-2`** is bitHuman's second-generation expression engine: an
audio-driven, real-time talking avatar whose motion is **fully generated**
live from the audio — expressions, mouth, and head movement are synthesized
each session, not replayed from a pre-rendered base.

It is also **fully generative across the whole scene**: the engine animates
the **entire 416×720 portrait frame**, not a detected face region. That is
what makes it the model for **any character morphology** — cartoons, animals,
creatures, robots, objects with a "face", and people alike. There is no face
detector, cropping, or landmark step anywhere in the pipeline, so a winged
creature or a talking appliance animates just as naturally as a headshot.

What makes it different from every other bitHuman model is **per-identity
training**. At creation time the platform builds a **small model of your
specific identity** from a single photo. The full rendering model never ships
anywhere; only the compact per-identity model serves your sessions — a small,
fast build tuned to render a sharp, well-defined mouth and teeth. That
per-identity step is why Expression 2's motion tracks the audio so closely —
and why creation takes longer than the other models (see
[creation](#how-creation-works) below).

At serve time the engine generates the full **416×720** scene at **20 frames
per second** and streams it over WebRTC like every other bitHuman session —
the platform contract (push audio in, drain lip-synced video out) is
unchanged.

## When to choose it

- **You want the most lifelike generated motion in the lineup.** Expression 2
  synthesizes expression and movement from the audio itself rather than
  patching a base video.
- **Your character isn't a photorealistic human.** The whole scene animates —
  stylized, cartoon, animal, creature, robot, and object characters are
  exactly what this engine is for (and where `model: "auto"` routes them).
- **You only have a photo.** One image is enough — creation is image-only for every model, and Expression 2 trains straight from the photo.
- **You want the same identity on cloud GPU, CPU, or Apple Neural Engine** —
  Expression 2 serves on all three tiers (see [serving](#serving-tiers)).

If you need the absolute highest image fidelity for close-up content, compare
with [Essence 2 Max](/concepts/essence-2-max). If cost at scale or
on-device deployment is the priority, compare with
[Essence 2](/concepts/essence-2). For the family-level decision,
start at [Essence 2 & Expression 2](/concepts/models-v2).

## How creation works

Create the agent once with
[`POST /v1/agent/generate`](/api/agents#generate-an-agent) and
`model: "expression-2"`. Creation is asynchronous and costs **2000 credits**
(one-time, per agent). Expression 2 handles **any subject** — photorealistic
or stylized — and it is the family that **works best for cartoonish,
stylized, animal, creature, and robot characters**, which is why
`model: "auto"` routes those inputs here, and why the Essence 2
[subject gate](/api/agents#the-essence-2-subject-gate-422)
points rejected creations at this model. You can also
[add `expression-2`](/api/agents#add-a-model-to-an-existing-agent) to an
existing agent (2000 credits — the same per-identity training runs; it uses
the agent's stored image).

> **When the credits leave your balance.** Creation is **charged up front, not
> on delivery.** The 2000 credits are debited within seconds of the request
> being accepted — at the first step of the run, before the persona, the
> portrait, the idle clip or the two hours of training. It is a flat one-time
> charge, unlike [live serving](/guides/pricing#serving--credits-per-live-minute),
> which meters the minutes actually rendered: creation does not cost more when
> training takes longer or needs more attempts internally, and it is not
> refunded pro rata if you never launch the agent.
>
> **What is refunded.** If the run fails early — a portrait that cannot be
> fetched, a persona step that errors — the charge is reversed automatically,
> typically within a minute, and a matching `credit_refund_…` row appears in
> [`GET /v1/usage`](/api/billing#usage-history). **A creation that completes is
> not refundable**, and completion is judged on the trained model being
> published, not on your having launched it. So poll
> [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) to `ready` and
> start a session while you still have the run in front of you. If an agent
> reaches `ready` and will not serve, that is a fault worth reporting rather
> than retrying — a second `generate` is a second 2000 credits.

> **Note** The Python examples below use
> [`requests`](https://pypi.org/project/requests/), which is not in the standard
> library — `pip install requests` first, or use `curl` / `urllib` instead.

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
        "prompt": "You are a friendly product specialist.",
        "image": "https://example.com/face.jpg",
        "model": "expression-2",
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


**Inputs.** Creation is **image-only**: an `image` (URL or upload) is the
identity source, and Expression 2 trains straight from the photo. If you omit
it, the platform generates a portrait from your prompt first. bitHuman also
generates the agent's **10-second idle clip internally** as part of creation,
authored to loop seamlessly. Video input is not part of the creation contract
and is being removed platform-wide: do not send `video` — as the rollout
completes, a request carrying it is rejected with
[`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
anything is billed. A voice is always prepared as part of creation — supply
`audio` to clone one, or one is generated for you.

**What happens.** Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status): the run moves
through the standard steps (`payment` → `persona` → `voice_image`), then
enters the **model-training step** (reported as `current_step: "lip_sync"`,
~70% progress) where the per-identity model is trained and packaged on a
training GPU. When the status reaches `ready`, the agent is servable on every
tier.

**How long.** The per-identity training step runs on a dedicated training GPU
and is the dominant cost of creation — plan for **about 2 to 2.5 hours** end to
end, and treat 4 hours as a normal upper tail rather than a fault. Of the 48
creations that completed between 2026-07-15 and 2026-08-30, 39 finished inside
12 hours; across those the **median was 2 hours 4 minutes**, the fastest 1 hour
25 minutes, and 1 in 10 took longer than 3 hours 45 minutes. The other nine
stalled and completed days later — rare, but real, which is why you should poll
or wait for the email rather than time out on a fixed budget. Everything before the training step —
persona, voice, portrait, the internally generated idle clip — accounts for only
about 3 minutes of that; essentially the whole wait is training.

The training recipe is **adaptive**: it starts from a short, efficient schedule,
and every agent must pass the same quality checks before it ships — an identity
that needs more work automatically climbs to more training, never a lower bar.
That is why harder identities take longer, and why the tail is long.

Build the wait into your integration: poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status), or wait for the
completion email, rather than holding a request open or assuming the few-minute
wall-clock of `essence-1`.

```bash
curl https://api.bithuman.ai/v1/agent/status/A66GYD8664 \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

Creation failures are terminal and reported on the same status endpoint
(`status: "failed"` plus `error_message`); a failed creation is not silently
retried into a different model. See
[failure modes](/api/agents#creation-failure-modes).

## Serving tiers

A ready `expression-2` agent serves through every delivery surface — the
[embed widget](/guides/deploy-embed), the viewer/share URL, the
[REST API](/api/agents), and the [LiveKit plugin](/guides/deploy-livekit).
By default the platform routes each session down the model's **serving
chain — GPU → Apple Neural Engine → CPU** — starting at an always-warm GPU
first line and overflowing to the next tier on capacity.

For benchmarking or placement testing you can **force one runtime tier** with
the `?model=` override on the session URL (a forced tier never overflows and
fails loudly if unavailable):

| `?model=` slug | Runtime | Notes |
|---|---|---|
| `expression-2` | The full chain (default) | GPU → Neural Engine → CPU with automatic overflow. |
| `expression-2-gpu` | GPU | The production GPU line with elastic cloud GPU overflow. |
| `expression-2-cpu` | CPU | Force the native quantized (int8) build on CPU servers — no GPU in the path. |
| `expression-2-ane` | Apple Neural Engine | Force the Apple Silicon Neural Engine tier; limited real-time slots. |

```text
https://bithuman.ai/embed/A66GYD8664?model=expression-2-ane
```

Tier slugs are an advanced, operational surface — an unrecognized value falls
back to the agent's default routing. For production, omit `?model=` and let
the platform choose. See
[tier pinning on the embed widget](/guides/deploy-embed#pin-a-serving-tier).

Real-time streaming is carried by the **GPU and Apple Neural Engine tiers**. The
**CPU tier is offline-batch-grade** — sized for offline talking-video generation
and used as capacity overflow / fallback, not as the primary real-time line — so
pin `expression-2-cpu` for batch and self-hosted-server work rather than
low-latency live sessions.

**Self-hosted.** Expression 2 also renders on your own hardware via the
[CLI's local renderer](/sdk/cli/overview#local-rendering-by-platform) —
macOS (Apple Silicon) and Linux x86_64 — at the self-hosted rate; batch /
server-grade CPU work wants modern (AVX-512-class) CPUs. (The Python SDK has
no Expression-2-loadable artifact — local rendering is a CLI surface.) See
the [device matrix](/concepts/models-v2#where-each-model-runs).

**On-device.** The engine runs on Apple Silicon via the [Swift SDK](/sdk/swift)
rail (preview maturity) — no server in the path. The `Expression2` SwiftPM
product, new in **2.5.0**, vends the engine binary; it ships **no model
weights**, and no per-identity CoreML bundle is published yet, so resolving it
does not by itself give you a rendering avatar. There is no self-serve path to a
bundle — email [hello@bithuman.ai](mailto:hello@bithuman.ai) with the identity
you want. See [Expression 2 on-device](/sdk/swift#expression-2-on-device).

**The `.imx` below is a different rail, not the missing bundle.** Download the
runnable `<code>.imx` build
(legacy `.avatar` zip)
with [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
or `bithuman pull <code>` — that artifact drives the **Essence** runtime and the
CLI. The `Expression2` SwiftPM product cannot read one: `strings` on the shipped
v2.5.0 `Expression2.xcframework` finds zero occurrences of `imx`. **In the
browser:** append `?render=local` to a
session URL to render Expression 2 locally (LiteRT.js / WebGPU, WASM fallback),
so the video never leaves the machine — rolling out per identity as web bundles
publish. See [Browser rendering](/guides/browser-rendering).

## Idle and speaking behavior

As of **2026-07-02**, Expression 2 agents use **real-footage idle**: during
silences the avatar plays the **10-second idle clip generated internally at
creation** from the identity itself. The clip is authored to loop seamlessly
and **forward-only** (it wraps from its last frame back to its first and never
plays in reverse), so idle looks like a person waiting, not a video scrubbing
back and forth. Every new creation bakes its idle clip automatically.

When speech starts, the engine hands off from the idle clip to generated
frames on the first rendered frame, and a per-identity color match keeps the
two visually continuous. When speech ends, idle resumes only after sustained
silence — brief pauses inside a sentence never flip the avatar back to idle.

**Speech onset.** The Expression 2 engine renders in fixed audio chunks, so
the first *talking* frame appears roughly **1.6 seconds** after speech audio
begins (less when the platform bursts audio faster than real time). The lively
real-footage idle masks this window — the avatar keeps moving naturally until
the generated frames take over. See
[session behavior & troubleshooting](/guides/session-troubleshooting).

## Pricing

| Surface | Rate |
|---|---|
| Cloud serving | **4 credits/min** |
| Self-hosted serving | **2 credits/min** |
| Agent creation | 2000 credits (one-time) |
| [Talking-video renders](/api/video) | 4 credits per minute of output (rounded up) |

Per-minute serving is metered for the whole time a session is live and the
engine is rendering — **idle/silent animation included**. Only stopped, paused,
or disconnected sessions stop accruing. Full schedule: [Pricing & credits](/guides/pricing).

## Limits and expectations

- **Output**: the full 416×720 portrait scene, generated at 20 fps; video
  streams over WebRTC with adaptive bitrate.
- **Creation time**: plan for about 2 to 2.5 hours (measured median 2h04m over
  39 creations; fastest 1h25m, slowest decile beyond 3h45m — see above) — and
  poll status rather than assuming the few-minute wall-clock of `essence-1`.
- **Identity input**: a clear, frontal, well-lit face photo gives the best
  result. The identity is fixed at creation — to change the face, create a new
  agent.
- **First session on a fresh agent** can take longer to connect while the
  per-identity model is provisioned onto serving capacity; subsequent sessions
  reuse it. See [troubleshooting](/guides/session-troubleshooting).
- **Before training completes**, launch surfaces that request this model
  reject it with `409 MODEL_NOT_GENERATED`
  (`agent A66GYD8664's expression-2 model hasn't been generated yet`). Once
  the agent is ready, its `supported_models` (on
  [status / get / list](/api/agents#poll-status) and the embed-token
  response) includes `expression-2`.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Second-generation gallery](https://bithuman.ai/explore?gallery=v2) — talk to a live launch agent.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Download your model](/api/agents#download-an-agents-model) — the trained model's runnable `<code>.imx` build (legacy `.avatar` zip), via API or `bithuman pull <code>`.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `expression-2`.
