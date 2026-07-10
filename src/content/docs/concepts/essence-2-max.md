---
title: "Essence 2 Max"
description: "Official guide to essence-2-max (formerly essence-2-quality) — bitHuman's premium avatar model: the Essence 2 gold teacher served directly on L40S-class GPUs, instant identity prep from a source video, latency expectations, and pricing."
section: concepts
group: "Models"
order: 4
label: "Essence 2 Max"
---

> **Note — Launching July 10, 2026 (rollout in progress).** For most agents you simply select
> **[`essence-2`](/concepts/essence-2)** — the standard model, served the
> right way for your hardware and quality needs. **`essence-2-max`** is the
> separate, explicitly selectable **premium model** for maximum-fidelity
> output — this page documents it.

> **Renamed 2026-07-10 — was `essence-2-quality`.** `essence-2-max` is the
> canonical name; the API still accepts `essence-2-quality` as a
> **deprecated alias** during the migration, and server *responses*
> (`supported_models`, `409` messages, model downloads) keep reporting the
> `essence-2-quality` family name until the platform-side flip. New
> integrations should send `essence-2-max`.

## What it is

**`essence-2-max`** ("Essence 2 Max") is the premium model of the
second-generation Essence family — bitHuman's **maximum-fidelity** avatar
renderer. It is the Essence 2 **gold teacher served directly**: the full
diffusion-transformer rendering stack that the standard
[Essence 2](/concepts/essence-2) is distilled from, animating your identity's
**real source footage** on **L40S-class cloud GPUs** and producing
hero-quality, close-up output at ~25 frames per second.

Two properties define it:

- **GPU-only, cloud-only.** The renderer needs an L40S-class server GPU;
  there is no CPU or on-device runtime for this model. (For on-device, CPU,
  or in-browser serving, use [Essence 2](/concepts/essence-2) — the standard
  model serves everywhere.)
- **No per-identity training.** The rendering model is shared; your identity
  needs only a one-time, lightweight *prep* that distills your source video
  into a compact identity bundle (a few megabytes). Prep takes **seconds**, so
  creation completes at standard agent-generation speed — there is no long
  training step.

## When to choose it

- **Image quality is the whole point** — close-up, hero, or brand-critical
  content where you want the best-looking output bitHuman produces.
- **You have real footage of the identity.** Max renders over your actual
  source video, so the avatar keeps the person's true look and framing.
- **8 credits/min cloud is acceptable** — it is the most expensive serving
  tier, at twice the rate of `essence-2` or Expression 2.

If you need scale, CPU serving, or on-device privacy, choose
[Essence 2](/concepts/essence-2). If you only have a photo and
want fully generated motion, choose [Expression 2](/concepts/expression-2).
For the family-level decision, start at
[Essence 2 & Expression 2](/concepts/models-v2).

## How creation works

Create the agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
and `model: "essence-2-max"`. Creation is asynchronous and costs
**500 credits** (one-time, per agent).

> **Tip — one creation, both Essence 2 models.** `model: "essence-2"` (the
> [combined creation](/api/agents#essence-2--the-combined-creation)) charges
> the same 500 credits and gives you Max **and**
> [the standard Essence 2](/concepts/essence-2) from one identity video — you
> pick the model at launch. You can also
> [add `essence-2` to an existing agent](/api/agents#add-a-model-to-an-existing-agent)
> that has a source video.

Like every Essence 2 creation, the input must be a **photorealistic human
subject** — a cartoon / animal / stylized input is rejected up front with
[`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors), nothing billed
(use [Expression 2](/concepts/expression-2) for those, or `model: "auto"` to
route automatically).

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "prompt": "You are a concierge for a luxury hotel.",
        "video": "https://example.com/identity.mp4",
        "model": "essence-2-max",
    },
)
print(resp.json())
# {"success": true, "message": "Agent generation started",
#  "agent_id": "A56ZFX6217", "status": "processing"}
```

**Inputs.** Supply a **`video`** — a short, well-lit clip of the identity
facing the camera. Essence 2 Max derives the avatar from real footage, so
the source video is the identity: its look, framing, and natural motion carry
into every session. A voice is prepared as part of creation (supply `audio` to
clone one, or one is generated).

**What happens.** Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status): the run moves
through the standard steps (`payment` → `persona` → `voice_image`), then the
identity-prep step (reported as `current_step: "lip_sync"`, ~70% progress)
distills the compact identity bundle from your footage — this takes on the
order of **10–30 seconds** on a warm builder. When status reaches `ready`,
the agent is servable.

**How long.** Because there is no per-identity training, an
`essence-2-max` creation typically completes in **a few minutes**
end-to-end — the persona/voice/image asset generation dominates, not the
model step.

## Serving

A ready agent serves through every delivery surface — the
[embed widget](/guides/deploy-embed), the viewer/share URL, the
[REST API](/api/agents), and the [LiveKit plugin](/guides/deploy-livekit).

Essence 2 Max has a **single serving tier**:

| `?model=` slug | Runtime | Notes |
|---|---|---|
| `essence-2-max` | L40S-class cloud GPU (only tier) | Always-warm dedicated GPU first line, spilling to elastic cloud GPU overflow that scales from zero. |
| `essence-2-quality` | (deprecated alias) | The pre-rename slug — the serving worker accepts both, so saved links keep working. Prefer `essence-2-max`. |

There are no `-cpu` / `-ane` runtime slugs for this model, and it is not
available on-device — requesting it in an on-device SDK context is reported as
cloud-only rather than treated as an unknown model.

The identity bundle is shared across serving planes. If a session lands on a
plane that hasn't cached your identity yet, the worker prepares it on the fly
(seconds) — you may notice this only as slightly longer connect time on a
fresh agent's first session. The platform also pre-warms overflow capacity
while your session connects, so spilling past the first line stays smooth. See
[session behavior & troubleshooting](/guides/session-troubleshooting).

The identity prepares on demand, but **only from the agent's source video**
— so Essence 2 Max is gated on that footage, just as the trained families
([Expression 2](/concepts/expression-2), the standard
[Essence 2](/concepts/essence-2)) are gated on their
per-identity models. An agent **with** a source video lists the family in its
`supported_models` ([status / get / list](/api/agents#poll-status) and the
embed-token response) — reported as `essence-2-quality`, the family's
pre-rename name, until the platform-side flip — and can be requested as this
model immediately; an image-only agent cannot render Max and gets a
[`409 MODEL_NOT_GENERATED`](/api/errors#model-errors) rejection whose message
names the real blocker: `agent <code>'s essence-2-quality model requires a
source video, which this agent doesn't have`. To unlock it, the agent needs
identity footage: supply `video` at creation, or create with the combined
`essence-2` from an image — its pipeline generates the identity video that
Max then derives from.

## Pricing

| Surface | Rate |
|---|---|
| Cloud serving | **8 credits/min** |
| Self-hosted serving | **4 credits/min** |
| Agent creation | 500 credits (one-time) |
| [Talking-video renders](/api/video) | 8 credits per minute of output (rounded up) |

Per-minute serving is metered on active avatar minutes only — idle, paused, or
disconnected time isn't billed. Full schedule: [Pricing & credits](/guides/pricing).

## Limits and expectations

- **Renders at ~25 fps** on cloud GPUs; video streams over WebRTC.
- **Source video required.** Creation needs identity footage — an image alone
  is not enough for this model. Provide `video` in the generate request.
- **Look is fixed at creation.** The avatar inherits the source video's
  framing and appearance; to change either, create a new agent.
- **Capacity model**: a session takes a dedicated GPU renderer, so Max
  capacity is deliberately narrower than the standard Essence 2's — at peak,
  sessions spill to elastic cloud GPUs that scale from zero, which can add
  connect time. For high-concurrency deployments, prefer
  [Essence 2](/concepts/essence-2).

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `essence-2-max`.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Download your model](/api/agents#download-an-agents-model) — the identity `.pkl` bundle, via API or `bithuman pull <code>`.
- [Pricing & credits](/guides/pricing) — plans and the full schedule.
