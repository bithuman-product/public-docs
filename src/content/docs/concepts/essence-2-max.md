---
title: "Essence 2 Max"
description: "Official guide to essence-2-max — bitHuman's premium avatar model: the highest-fidelity Essence 2 renderer served on dedicated cloud GPUs, instant identity prep from the internally generated identity video, latency expectations, and pricing."
section: concepts
group: "Models"
order: 3
label: "Essence 2 Max"
---

> **Note — Launching July 10, 2026 (rollout in progress).** For most agents you simply select
> **[`essence-2`](/concepts/essence-2)** — the standard model, served the
> right way for your hardware and quality needs. **`essence-2-max`** is the
> separate, explicitly selectable **premium model** for maximum-fidelity
> output — this page documents it. Renamed 2026-07-10 (was
> `essence-2-quality`): see
> [Naming & migration](/concepts/models-v2#naming--migration).

## What it is

**`essence-2-max`** ("Essence 2 Max") is the premium model of the
second-generation Essence family — bitHuman's **maximum-fidelity** avatar
renderer. It is the **highest-fidelity Essence 2 renderer served directly**:
the full rendering stack that the standard
[Essence 2](/concepts/essence-2) is distilled from, animating your identity's
footage on **dedicated cloud GPUs** and producing
hero-quality, close-up output at ~25 frames per second.

Two properties define it:

- **GPU-only, cloud-only.** The renderer needs a server-class GPU;
  there is no CPU or on-device runtime for this model. (For on-device, CPU,
  or in-browser serving, use [Essence 2](/concepts/essence-2) — the standard
  model serves everywhere.)
- **No per-identity training.** The rendering model is shared; your identity
  needs only a one-time, lightweight *prep* that distills the agent's
  **identity video** — generated internally at creation from your portrait
  image, 10 seconds, authored to loop seamlessly — into a compact identity
  bundle (a few megabytes). Prep takes **seconds**, so there is no long
  training step for Max itself.

## When to choose it

- **Image quality is the whole point** — close-up, hero, or brand-critical
  content where you want the best-looking output bitHuman produces.
- **True-to-portrait fidelity.** Max renders over the identity video
  generated from your portrait image, so the avatar keeps the person's true
  look and framing.
- **8 credits/min cloud is acceptable** — it is the most expensive serving
  tier, at twice the rate of `essence-2` or Expression 2.

If you need scale, CPU serving, or on-device privacy, choose
[Essence 2](/concepts/essence-2). If you want fully generated
motion for a stylized character, choose [Expression 2](/concepts/expression-2).
For the family-level decision, start at
[Essence 2 & Expression 2](/concepts/models-v2).

## How creation works

Essence 2 Max comes with the **combined Essence 2 creation**: create the
agent with [`POST /v1/agent/generate`](/api/agents#generate-an-agent) and
`model: "essence-2"` — the one asynchronous, **500-credit** creation (one-time,
per agent) trains [the standard Essence 2](/concepts/essence-2) **and** makes
Max available from the same internally generated identity video at no extra
charge. You pick the model at launch (`?model=essence-2-max`). You can also
[add `essence-2` to an existing agent](/api/agents#add-a-model-to-an-existing-agent)
that has a stored identity video.

> **Creation is image-only.** Supply a portrait `image` (or let the prompt
> generate one) — bitHuman generates the **10-second identity video
> internally**, authored to loop seamlessly (its first and last frames
> match). Video input is not part of the creation contract and is being
> removed platform-wide: do not send `video` — as the rollout completes, a
> request carrying it is rejected with
> [`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
> anything is billed.

Like every Essence 2 creation, the input must be a **photorealistic human
subject** — a cartoon / animal / stylized input is rejected up front with
[`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors), nothing billed
(use [Expression 2](/concepts/expression-2) for those, or `model: "auto"` to
route automatically).

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
        "prompt": "You are a concierge for a luxury hotel.",
        "image": "https://example.com/portrait.jpg",
        "model": "essence-2",   # the combined creation — Max included
    },
)
print(resp.json())
# {"success": true, "message": "Agent generation started",
#  "agent_id": "A66GYD8664", "status": "processing"}
```

**Inputs.** Supply an **`image`** — a well-lit portrait of the identity
facing the camera. bitHuman generates the identity video from it internally
(you'll see `current_step: "video"` at ~45% progress); Essence 2 Max derives
the avatar from that footage, so its look and framing carry into every
session. A voice is prepared as part of creation (supply `audio` to clone
one, or one is generated).

**What happens.** Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status): the run moves
through the standard steps (`payment` → `persona` → `voice_image` →
`video`), then the model step (reported as `current_step: "lip_sync"`) —
Max's own identity prep distills the compact identity bundle from the
generated identity video in **seconds**. When status reaches `ready`, the
agent is servable.

**How long.** Max's identity prep itself takes seconds; the combined
creation's overall wall-clock is set by the standard Essence 2
distillation — typically **about 45 minutes** (occasionally longer). Keep
polling `status` rather than applying a short client timeout.

## Serving

A ready agent serves through every delivery surface — the
[embed widget](/guides/deploy-embed), the viewer/share URL, the
[REST API](/api/agents), and the [LiveKit plugin](/guides/deploy-livekit).

Essence 2 Max has a **single serving tier**:

| `?model=` slug | Runtime | Notes |
|---|---|---|
| `essence-2-max` | Dedicated cloud GPU (only tier) | Always-warm first line, spilling to elastic cloud GPU overflow that scales from zero. |
| `essence-2-quality` | (deprecated alias) | The pre-rename slug — the serving worker accepts both, so saved links keep working. Prefer `essence-2-max`. See [Naming & migration](/concepts/models-v2#naming--migration). |

There are no `-cpu` / `-ane` runtime slugs for this model, and it is not
available on-device — requesting it in an on-device SDK context is reported as
cloud-only rather than treated as an unknown model.

**Connect behavior.** The identity bundle is shared across serving capacity.
If a session lands on capacity that hasn't cached your identity yet, the
worker prepares it on the fly (seconds) — you may notice this only as a
slightly longer connect on a fresh agent's first session. The platform also
pre-warms overflow capacity while your session connects, so spilling past the
first line stays smooth. See
[session behavior & troubleshooting](/guides/session-troubleshooting).

**What gates it.** The identity prepares on demand, but **only from the
agent's stored identity video** (generated internally at creation) — so
Essence 2 Max is gated on that footage, just as the trained families
([Expression 2](/concepts/expression-2), the standard
[Essence 2](/concepts/essence-2)) are gated on their per-identity models.

- An agent **with** a stored identity video lists the family in its
  `supported_models` ([status / get / list](/api/agents#poll-status) and the
  embed-token response — during the rename rollout, responses may report the
  pre-rename family name; see
  [Naming & migration](/concepts/models-v2#naming--migration)) and can be
  requested as this model immediately.
- An agent **without** one cannot render Max and gets a
  [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors) rejection naming the
  missing identity video. To unlock it, create the agent with the combined
  `essence-2` from an image — its pipeline generates the identity video that
  Max then derives from — or
  [add `essence-2`](/api/agents#add-a-model-to-an-existing-agent) to an agent
  that already stores one.

## Pricing

| Surface | Rate |
|---|---|
| Cloud serving | **8 credits/min** |
| Self-hosted serving | **4 credits/min** |
| Agent creation | 500 credits (one-time — the combined `essence-2` creation; Max included) |
| [Talking-video renders](/api/video) | 8 credits per minute of output (rounded up) |

Per-minute serving is metered on active avatar minutes only — idle, paused, or
disconnected time isn't billed. Full schedule: [Pricing & credits](/guides/pricing).

## Limits and expectations

- **Renders at ~25 fps** on cloud GPUs; video streams over WebRTC.
- **Image-only creation, via the combined `essence-2`.** Provide a portrait
  `image`; the identity video Max derives from is generated internally
  (10 seconds, authored to loop seamlessly). Video is not a creation input.
- **Look is fixed at creation.** The avatar inherits the generated identity
  video's framing and appearance; to change either, create a new agent.
- **Capacity model**: a session takes a dedicated GPU renderer, so Max
  capacity is deliberately narrower than the standard Essence 2's — at peak,
  sessions spill to elastic cloud GPUs that scale from zero, which can add
  connect time. For high-concurrency deployments, prefer
  [Essence 2](/concepts/essence-2).

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the family overview and model chooser.
- [Second-generation gallery](https://bithuman.ai/explore?gallery=v2) — talk to a live launch agent.
- [Agents API](/api/agents) — full create → poll → serve lifecycle.
- [Talking video generation](/concepts/talking-video) — render offline mp4s with `essence-2-max`.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Download your model](/api/agents#download-an-agents-model) — the identity bundle, via API or `bithuman pull <code>`.
- [Pricing & credits](/guides/pricing) — plans and the full schedule.
