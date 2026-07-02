---
title: "Essence 2 Quality"
description: "Official guide to essence-2-quality — bitHuman's highest-fidelity avatar model: instant identity prep from a source video, cloud GPU serving, latency expectations, and pricing."
section: concepts
group: "Models"
order: 4
label: "Essence 2 Quality"
---

## What it is

**`essence-2-quality`** is the premium tier of the second-generation Essence
family — bitHuman's **highest-fidelity** avatar renderer. A heavy
diffusion-transformer rendering stack animates your identity's **real source
footage** on cloud GPUs, producing hero-quality, close-up output at ~25 frames
per second.

Two properties define it:

- **GPU-only, cloud-only.** The renderer needs a server-class GPU; there is no
  CPU or on-device runtime for this tier. (For on-device or CPU serving, use
  [Essence 2 Light](/concepts/essence-2-light).)
- **No per-identity training.** The rendering model is shared; your identity
  needs only a one-time, lightweight *prep* that distills your source video
  into a compact identity bundle (a few megabytes). Prep takes **seconds**, so
  creation completes at standard agent-generation speed — there is no long
  training step.

## When to choose it

- **Image quality is the whole point** — close-up, hero, or brand-critical
  content where you want the best-looking output bitHuman produces.
- **You have real footage of the identity.** Quality renders over your actual
  source video, so the avatar keeps the person's true look and framing.
- **8 credits/min cloud is acceptable** — it is the most expensive serving
  tier, at twice the rate of Essence 2 Light or Expression 2.

If you need scale, CPU serving, or on-device privacy, choose
[Essence 2 Light](/concepts/essence-2-light). If you only have a photo and
want fully generated motion, choose [Expression 2](/concepts/expression-2).
For the family-level decision, start at
[Essence 2 & Expression 2](/concepts/models-v2).

## How creation works

Create the agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent)
and `model: "essence-2-quality"`. Creation is asynchronous and costs
**500 credits** (one-time, per agent).

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/agent/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={
        "prompt": "You are a concierge for a luxury hotel.",
        "video": "https://example.com/identity.mp4",
        "model": "essence-2-quality",
    },
)
print(resp.json())
# {"success": true, "message": "Agent generation started",
#  "agent_id": "A56ZFX6217", "status": "processing"}
```

**Inputs.** Supply a **`video`** — a short, well-lit clip of the identity
facing the camera. Essence 2 Quality derives the avatar from real footage, so
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
`essence-2-quality` creation typically completes in **a few minutes**
end-to-end — the persona/voice/image asset generation dominates, not the
model step.

## Serving

A ready agent serves through every delivery surface — the
[embed widget](/guides/deploy-embed), the viewer/share URL, the
[REST API](/api/agents), and the [LiveKit plugin](/guides/deploy-livekit).

Essence 2 Quality has a **single serving tier**:

| `?model=` slug | Runtime | Notes |
|---|---|---|
| `essence-2-quality` | Cloud GPU (only tier) | Always-warm dedicated GPU first line, spilling to elastic cloud GPU overflow that scales from zero. |

There are no `-cpu` / `-ane` runtime slugs for this model, and it is not
available on-device — requesting it in an on-device SDK context is reported as
cloud-only rather than treated as an unknown model.

The identity bundle is shared across serving planes. If a session lands on a
plane that hasn't cached your identity yet, the worker prepares it on the fly
(seconds) — you may notice this only as slightly longer connect time on a
fresh agent's first session. The platform also pre-warms overflow capacity
while your session connects, so spilling past the first line stays smooth. See
[session behavior & troubleshooting](/guides/session-troubleshooting).

Because the identity prepares on demand, Essence 2 Quality is **never gated**
behind a training artifact: any agent with an image lists
`essence-2-quality` in its `supported_models`
([status / get / list](/api/agents#poll-status) and the embed-token response)
and can be requested as this model without a `409 MODEL_NOT_GENERATED`
rejection — unlike the trained families
([Expression 2](/concepts/expression-2),
[Essence 2 Light](/concepts/essence-2-light)).

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
  is not enough for this tier. Provide `video` in the generate request.
- **Look is fixed at creation.** The avatar inherits the source video's
  framing and appearance; to change either, create a new agent.
- **Capacity model**: a session takes a dedicated GPU renderer, so quality
  capacity is deliberately narrower than the Light tier's — at peak, sessions
  spill to elastic cloud GPUs that scale from zero, which can add connect
  time. For high-concurrency deployments, prefer
  [Essence 2 Light](/concepts/essence-2-light).

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `essence-2-quality`.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Pricing & credits](/guides/pricing) — plans and the full schedule.
