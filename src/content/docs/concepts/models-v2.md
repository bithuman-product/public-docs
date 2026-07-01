---
title: "Essence 2 & Expression 2"
description: "bitHuman's second-generation avatar models — essence-2-quality, essence-2-light, and expression-2 — real-time, privacy-first avatar video with on-device and cloud serving tiers, per-minute pricing, and which to choose."
section: concepts
group: "Models"
order: 2
label: "Essence 2 & Expression 2"
---

## Generally available

As of **2026-07-01**, bitHuman's three second-generation avatar models are
**generally available** on every surface — the REST API, the embed widget, the
dashboard, and the SDKs:

- **`expression-2`** — the second-generation expression engine. Audio-driven,
  real-time avatar video generated from a **single photo**: at agent creation
  it trains a small per-identity model (a few minutes), then synthesizes fully
  generated motion live — not patched onto a pre-rendered base. Serves on
  three tiers: **gpu**, **cpu**, and **ane** (Apple Neural Engine).
- **`essence-2-quality`** — the **highest-fidelity** tier of the Essence
  family. A heavy GPU renderer for close-up, hero-quality output; served on
  cloud GPUs.
- **`essence-2-light`** — the **cost-effective** tier. A distilled renderer
  that runs across **gpu**, **cpu**, and **ane** — including fully
  **on-device**, where audio and video never leave your hardware.

The first-generation models ([`essence-1` and `expression-1`](/concepts/models))
remain fully supported; nothing changes for existing agents or integrations.

## At a glance

| | **essence-2-quality** | **essence-2-light** | **expression-2** |
|---|---|---|---|
| **Family** | Essence | Essence | Expression |
| **What it is** | Highest-fidelity GPU renderer | Efficient distilled renderer | Generative motion from one photo |
| **Serving tiers** | gpu | gpu · cpu · ane | gpu · cpu · ane |
| **On-device** | — | Yes (CPU / Apple Neural Engine) | Yes (Apple Neural Engine) |
| **Creation** | Train-on-create | Train-on-create | Train-on-create (~minutes, per-identity model) |
| **Cloud** | 8 credits/min | 4 credits/min | 4 credits/min |
| **Self-hosted** | 4 credits/min | 2 credits/min | 2 credits/min |

All three keep the platform contract unchanged: push 16-bit PCM audio in,
drain real-time lip-synced video frames out. The same agent code works across
every surface.

## Which should I choose?

### Highest visual fidelity, close-up or hero content

**`essence-2-quality`.** The premium Essence renderer on cloud GPUs — pick it
when image quality is the whole point and 8 credits/min is acceptable.

### Cost-effective at scale, or on-device

**`essence-2-light`.** Half the cloud price of Quality, and the only Essence 2
tier that runs on CPU and the Apple Neural Engine as well as GPU — so the same
agent serves from bitHuman's cloud, your own servers, or entirely on-device.
The right default for kiosks, high-concurrency deployments, and
privacy-sensitive environments.

### Fully generated motion from a single photo

**`expression-2`.** The most lifelike motion in the lineup — expressions and
head movement are generated live from the audio rather than replayed. Creation
trains a per-identity model from your photo in a few minutes; serving spans
gpu, cpu, and ane tiers.

Still deciding between the **families** (Essence vs Expression)? Start with
[Essence vs Expression](/concepts/models).

## How creation works

All three models are **train-on-create**: you create an agent once with
`POST /v1/agent/generate` and the platform prepares that identity's model as
part of generation. Creation is asynchronous, costs **250 credits** (one-time,
per agent), and typically completes in a few minutes — `expression-2` trains
its per-identity model within that window. Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents) until the status is terminal
(`success` / `ready`).

### Create an agent with `expression-2`

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
```

```json
{
  "success": true,
  "message": "Agent generation started",
  "agent_id": "A56ZFX6217",
  "status": "processing"
}
```

The same request shape works for the other two models — set `model` to
`essence-2-quality` or `essence-2-light`. Invalid model names return
`400 VALIDATION_ERROR` with no credits charged; the retired internal engine
names are not accepted.

Then poll until the agent is ready:

```bash
curl https://api.bithuman.ai/v1/agent/status/A56ZFX6217 \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

## Launch a live session

Serving works exactly like every other bitHuman agent — the model tier is
resolved for you at session launch. The fastest path is the
[embed widget](/guides/deploy-embed): mint a short-lived token on your backend,
then drop the iframe on any page.

```js
// SERVER — mint a token (api-secret stays server-side)
const res = await fetch("https://api.bithuman.ai/v1/embed-tokens/request", {
  method: "POST",
  headers: {
    "api-secret": process.env.BITHUMAN_API_SECRET,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    agent_id: "A56ZFX6217",
    fingerprint: visitorFingerprint,   // stable per-device hex — required
  }),
});
const { data: { token } } = await res.json();
```

```html
<!-- BROWSER — the agent renders on its model's serving tier -->
<iframe
  src="https://bithuman.ai/embed/A56ZFX6217?token=YOUR_TOKEN"
  allow="microphone *; camera *; autoplay *"
  style="width: 400px; height: 700px; border: 0;"
></iframe>
```

The other delivery surfaces work unchanged too — the
[LiveKit plugin](/guides/deploy-livekit), the [REST API](/api/agents)
(`/speak`, `/add-context`), and the [SDKs](/sdk/overview).

### Advanced: pin a serving tier

By default the platform routes each session to the best available tier for the
agent's model. For benchmarking or placement testing you can **pin a specific
tier** by appending `?model=` with a tier slug to the session (viewer / embed)
URL:

```text
https://bithuman.ai/embed/A56ZFX6217?model=expression-2-ane
```

| Model | Tier slugs |
|---|---|
| `expression-2` | `expression-2-gpu` · `expression-2-cpu` · `expression-2-ane` |
| `essence-2-light` | `essence-2-light-gpu` · `essence-2-light-cpu` · `essence-2-light-ane` |
| `essence-2-quality` | `essence-2-quality` (single GPU tier) |

> **Note** Tier pinning is an advanced, operational surface — slugs may be
> adjusted as capacity evolves, and an unrecognized value falls back to the
> agent's default routing. For production, omit `?model=` and let the platform
> choose.

## Pricing

Per active minute of avatar runtime, from the
[pricing schedule](/guides/pricing):

| Model | Cloud | Self-hosted |
|---|---|---|
| `essence-2-quality` | 8 credits/min | 4 credits/min |
| `essence-2-light` | 4 credits/min | 2 credits/min |
| `expression-2` | 4 credits/min | 2 credits/min |

Creation is a one-time 250 credits per agent for every model. Idle, paused, or
disconnected time isn't billed.

## Next steps

- [Essence vs Expression](/concepts/models) — the two model families.
- [Agents API](/api/agents) — the full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [Pricing & credits](/guides/pricing) — plans, top-ups, and the full schedule.
- [Changelog](/changelog) — the GA announcement.
