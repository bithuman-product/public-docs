---
title: "Expression 2"
description: "Official guide to expression-2 — bitHuman's second-generation expression engine: per-identity training from one photo, gpu/cpu/ane serving tiers, real-footage idle, latency expectations, and pricing."
section: concepts
group: "Models"
order: 3
label: "Expression 2"
---

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
training**. At creation time the platform distills a large foundation model
into a **small model of your specific identity**, built from a single photo.
The big teacher model never ships anywhere; only the compact per-identity
model serves your sessions. That per-identity step is why Expression 2's
motion tracks the audio so closely — and why creation takes longer than the
other models (see [creation](#how-creation-works) below).

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
existing agent (500 credits, uses its stored image).

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "prompt": "You are a friendly product specialist.",
        "image": "https://example.com/face.jpg",
        "model": "expression-2",
    },
)
print(resp.json())
# {"success": true, "message": "Agent generation started",
#  "agent_id": "A56ZFX6217", "status": "processing"}
```

**Inputs.** An `image` (URL or upload) is the identity source. If you omit it,
the platform generates a portrait from your prompt first. A voice is always
prepared as part of creation — supply `audio` to clone one, or one is
generated for you.

**What happens.** Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status): the run moves
through the standard steps (`payment` → `persona` → `voice_image`), then
enters the **model-training step** (reported as `current_step: "lip_sync"`,
~70% progress) where the per-identity model is distilled and packaged on a
training GPU. When the status reaches `ready`, the agent is servable on every
tier.

**How long.** The per-identity training step runs on an H100-class GPU and is
the dominant cost of creation — expect the whole run to take **roughly
45 minutes** (typically 30–60; the platform allows up to 90 minutes before a
run is considered stuck). This is deliberate: the training recipe is
quality-locked, and shorter recipes were removed after they measurably
degraded eye and expression fidelity.

```bash
curl https://api.bithuman.ai/v1/agent/status/A56ZFX6217 \
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
| `expression-2-ane` | Apple Neural Engine | Force the Apple-silicon Neural Engine tier; limited real-time slots. |

```text
https://bithuman.ai/embed/A56ZFX6217?model=expression-2-ane
```

Tier slugs are an advanced, operational surface — an unrecognized value falls
back to the agent's default routing. For production, omit `?model=` and let
the platform choose. See
[tier pinning on the embed widget](/guides/deploy-embed#pin-a-serving-tier).

**Self-hosted.** The CPU build also runs on your own servers via the
[SDK](/sdk/overview) at the self-hosted rate — it needs modern
(AVX-512-class) server CPUs; see the
[device matrix](/concepts/models-v2#where-each-model-runs).

**On-device.** The same distilled per-identity model also runs fully
on-device on Apple silicon via the [Swift SDK](/sdk/swift) rail (preview
maturity) — no server in the path. Download the Mac-runnable `.avatar` build
with [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
or `bithuman pull <code>`. A browser-local (WebGPU) tier is planned; there is
no WASM/CPU browser path for this model.

## Idle and speaking behavior

As of **2026-07-02**, Expression 2 agents use **real-footage idle**: during
silences the avatar plays a short, seamlessly looping clip derived from the
identity itself — cropped from your source footage when the agent has any, or
captured from the trained model's own rest pose for photo-only creations. The
clip is authored to loop **forward-only** (it wraps from its last frame back
to its first and never plays in reverse), so idle looks like a person waiting,
not a video scrubbing back and forth. Every new creation bakes its idle clip
automatically.

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
| Agent creation | 500 credits (one-time) |
| [Talking-video renders](/api/video) | 4 credits per minute of output (rounded up) |

Per-minute serving is metered on active avatar minutes only — idle, paused, or
disconnected time isn't billed. Full schedule: [Pricing & credits](/guides/pricing).

## Limits and expectations

- **Output**: the full 416×720 portrait scene, generated at 20 fps; video
  streams over WebRTC with adaptive bitrate.
- **Creation time**: plan for ~45 minutes (see above) — poll status rather
  than assuming the 2–5 minute wall-clock of `essence-1`.
- **Identity input**: a clear, frontal, well-lit face photo gives the best
  result. The identity is fixed at creation — to change the face, create a new
  agent.
- **First session on a fresh agent** can take longer to connect while the
  per-identity model is provisioned onto serving capacity; subsequent sessions
  reuse it. See [troubleshooting](/guides/session-troubleshooting).
- **Before training completes**, launch surfaces that request this model
  reject it with `409 MODEL_NOT_GENERATED`
  (`agent A56ZFX6217's expression-2 model hasn't been generated yet`). Once
  the agent is ready, its `supported_models` (on
  [status / get / list](/api/agents#poll-status) and the embed-token
  response) includes `expression-2`.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Download your model](/api/agents#download-an-agents-model) — the trained model's Mac-runnable `.avatar` build, via API or `bithuman pull <code>`.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `expression-2`.
