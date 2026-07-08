---
title: "Essence 2 & Expression 2"
description: "bitHuman's second-generation avatar models — essence-2 and expression-2 — real-time, privacy-first avatar video with on-device and cloud serving, per-minute pricing, and which to choose. Launching July 10, 2026."
section: concepts
group: "Models"
order: 2
label: "Essence 2 & Expression 2"
---

## Upcoming — launches July 10, 2026

bitHuman's second-generation avatar models, **`essence-2`** and
**`expression-2`**, launch on **July 10, 2026**. Until then, use the
first-generation models ([`essence-1` and `expression-1`](/concepts/models)),
which are available today and remain fully supported.

When they launch, the two second-generation models will be available on every
surface — the REST API, the embed widget, the dashboard, and the SDKs:

- **[`expression-2`](/concepts/expression-2)** — the second-generation
  expression engine. Audio-driven, real-time avatar video generated from a
  **single photo**: at agent creation it trains a small per-identity model
  (roughly 45 minutes on a training GPU), then synthesizes fully generated
  motion live — not patched onto a pre-rendered base. Runs on GPU, CPU, and
  Apple Neural Engine.
- **`essence-2`** — the highest-fidelity Essence model for photorealistic
  people. It animates your identity's real source footage, and runs everywhere
  from **fully on-device** (iPhone, iPad, Mac, CPU — audio and video never
  leave your hardware) up to **cloud GPUs** for close-up, hero-quality output.
  bitHuman automatically serves the right way for your hardware and quality
  needs — you just pick `essence-2`.

The first-generation models ([`essence-1` and `expression-1`](/concepts/models))
remain fully supported; nothing changes for existing agents or integrations.

## At a glance

| | **essence-2** | **essence-2-quality** | **expression-2** |
|---|---|---|---|
| **Guide** | [Essence 2 (light tier)](/concepts/essence-2-light) | [Essence 2 Quality](/concepts/essence-2-quality) | [Expression 2](/concepts/expression-2) |
| **Family** | Essence | Essence | Expression |
| **What it is** | The Essence 2 model — efficient distilled renderer, serves everywhere | Highest-fidelity GPU renderer (reference tier) | Generative motion from one photo |
| **Best for** | Photorealistic humans | Photorealistic humans, close-up/hero quality | Characters: cartoons, animals, creatures, robots |
| **Identity source** | Video, or generated from your image | Video (real footage) | Single photo |
| **Serving tiers** | gpu · ane · cpu (auto-routed chain) | gpu | gpu · ane · cpu (auto-routed chain) |
| **On-device** | Yes (CPU / Apple Neural Engine) | — | Yes (Apple Neural Engine) |
| **Creation** | Train-on-create (typically 25–40 min) | Train-on-create (instant identity prep) | Train-on-create (~45 min per-identity model) |
| **Cloud** | 4 credits/min | 8 credits/min | 4 credits/min |
| **Self-hosted** | 2 credits/min | 4 credits/min | 2 credits/min |

> **Note** The name `essence-2-light` was consolidated into **`essence-2`**
> (2026-07-05): you create and serve with `model="essence-2"`, and the light
> tier is what it serves. `essence-2-quality` remains a separate, explicitly
> selectable reference tier. Requests naming `essence-2-light` get a
> `400` with a hint pointing at `essence-2`.

All three keep the platform contract unchanged: push 16-bit PCM audio in,
drain real-time lip-synced video frames out. The same agent code works across
every surface.

## Which should I choose?

### Highest visual fidelity, close-up or hero content

**[`essence-2-quality`](/concepts/essence-2-quality).** The premium Essence
renderer on cloud GPUs — pick it when image quality is the whole point and
8 credits/min is acceptable. Needs a source video of the identity.

### Cost-effective at scale, or on-device

**[`essence-2`](/concepts/essence-2-light).** Half the cloud price of
Quality, and it runs on CPU and the Apple Neural Engine as well as GPU — so
the same agent serves from bitHuman's cloud, your own servers, or entirely
on-device. The right default for photorealistic humans, kiosks,
high-concurrency deployments, and privacy-sensitive environments.

### Fully generated motion from a single photo

**[`expression-2`](/concepts/expression-2).** The most lifelike motion in the
lineup — expressions and head movement are generated live from the audio
rather than replayed. Creation trains a per-identity model from your photo
(roughly 45 minutes); serving spans gpu, cpu, and ane tiers.

Still deciding between the **families** (Essence vs Expression)? Start with
[Essence vs Expression](/concepts/models).

## How creation works

All three models are **train-on-create**: you create an agent once with
`POST /v1/agent/generate` and the platform prepares that identity's model as
part of generation. Creation is asynchronous and costs **500 credits**
(one-time, per agent). Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents) until the status is terminal
(`success` / `ready`).

How long creation takes depends on the model — the v2 models do real
per-identity work, so don't apply a short client timeout:

| Model | Identity step | Typical creation time |
|---|---|---|
| `essence-2` | Distills a compact identity bundle on a cloud GPU | Typically 25–40 minutes; occasionally longer |
| `essence-2-quality` | Instant prep from your source video (seconds) | A few minutes end-to-end |
| `expression-2` | Trains a per-identity model on an H100-class GPU | Roughly 45 minutes (30–60) |

Inputs differ too: `essence-2-quality` **requires a source video**;
`essence-2` takes a video *or* generates one from your image;
`expression-2` needs only a photo. Details and failure modes are in each
model's guide and the [Agents API](/api/agents#generate-an-agent).

Two notes round out the creation surface:

- **`essence-2` is a combined creation.** The one 500-credit charge trains
  the light-tier identity bundle **and** makes Essence 2 Quality available
  from the same identity video — launch with `?model=essence-2-quality` (or
  the embed-token `model` field) when you want the reference tier. See
  [the combined creation](/api/agents#essence-2--the-combined-creation).
- **`auto` — classify and route.** An LLM looks at your input (the image if
  provided, else the prompt): a photorealistic person routes to `essence-2`
  (combined), a cartoon / animal / creature / robot routes to `expression-2`.
  It's the default in the dashboard's create flow; API callers must send it
  explicitly (an omitted `model` keeps the historical `essence-1` default).
  See [`auto`](/api/agents#auto--let-the-platform-pick-the-model).

**Which family for which character?** Essence 2 works best for
photorealistic human figures; Expression 2 works best for cartoonish,
stylized, animal, creature, or robot characters. `auto` applies this rule for
you, and every classifiable creation records the recommended model.

The Essence 2 family requires a **photorealistic human subject** — an
explicit `essence-2*` creation with a stylized or non-human input is rejected
with [`422 MODEL_SUBJECT_MISMATCH`](/api/errors#model-errors) before
anything is billed (`auto` routes instead of rejecting).

Already have an agent? You don't need to re-create it —
[`POST /v1/agent/{code}/models`](/api/agents#add-a-model-to-an-existing-agent)
adds a model to it at the same per-model rates (adding `expression-1` is
free and instant), and
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
downloads a generated artifact.

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

The same request shape works for the other models — set `model` to
`essence-2` or `essence-2-quality`. Invalid model names return
`400 VALIDATION_ERROR` with no credits charged; retired names are not
accepted (`essence-2-light` returns a targeted hint pointing at `essence-2`).

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

By default the platform routes each session down the model's serving chain
(GPU → Apple Neural Engine → CPU) and overflows on capacity. For benchmarking
or placement testing you can **force a specific tier** by appending `?model=`
with a force-tier slug to the session (viewer / embed) URL. A forced tier is
pinned — it never overflows, and it fails loudly if that tier is unavailable:

```text
https://bithuman.ai/embed/A56ZFX6217?model=expression-2-ane
```

| Model | Force-tier slugs |
|---|---|
| [`essence-2`](/concepts/essence-2-light#serving-tiers) | `essence-2-gpu` · `essence-2-ane` · `essence-2-cpu` |
| [`expression-2`](/concepts/expression-2#serving-tiers) | `expression-2-gpu` · `expression-2-cpu` · `expression-2-ane` |
| [`essence-2-quality`](/concepts/essence-2-quality#serving) | `essence-2-quality` (single GPU tier) |

Legacy pins from before the 2026-07-05 consolidation keep working: the old
`essence-2-light-gpu` / `essence-2-light-cpu` slugs still pin their tiers, and
saved links carrying `essence-2-light` or `essence-2-light-ane` route to the
`essence-2` default chain.

> **Note** Tier forcing is an advanced, operational surface — slugs may be
> adjusted as capacity evolves. For production, omit `?model=` and let the
> platform choose.

## Where each model runs

The device/runtime matrix for the second generation:

| Runtime | `essence-2` | `essence-2-quality` | `expression-2` |
|---|---|---|---|
| bitHuman cloud — GPU | ✅ chain tier | ✅ (the only tier) | ✅ chain tier |
| bitHuman cloud — Apple Neural Engine | ✅ chain tier | — | ✅ chain tier |
| bitHuman cloud — CPU | ✅ chain tier | — | ✅ chain tier |
| Self-hosted (your servers, CPU) | ✅ [SDK](/sdk/overview) | — | ✅ (AVX-512-class CPUs) |
| On-device macOS / iOS (Apple silicon) | ✅ [Swift SDK](/sdk/swift) | — (cloud-only) | ✅ [Swift SDK](/sdk/swift) |
| Browser-local (WASM/WebGPU, no server render) | Upcoming — the [browser rendering](/guides/browser-rendering) modes ship with `essence-1` today; the Essence 2 browser tier is in rollout | — | Planned (WebGPU) |

Cloud sessions are routed automatically; on-device and self-hosted serving
use the downloaded model artifact
([`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)).

## Pricing

Per active minute of avatar runtime, from the
[pricing schedule](/guides/pricing):

| Model | Cloud | Self-hosted |
|---|---|---|
| `essence-2` | 4 credits/min | 2 credits/min |
| `essence-2-quality` | 8 credits/min | 4 credits/min |
| `expression-2` | 4 credits/min | 2 credits/min |

Creation is one-time and per agent: **500 credits** for the v2 models above
(the [combined `essence-2`](/api/agents#essence-2--the-combined-creation),
`essence-2-quality`, `expression-2` — and
[`auto`](/api/agents#auto--let-the-platform-pick-the-model), which charges the
routed model's 500) and 250 credits for the v1 models (`essence-1`, `expression-1`).
[Adding a model to an existing agent](/api/agents#add-a-model-to-an-existing-agent)
charges the same per-model rates. Idle, paused, or disconnected time isn't
billed. Machine-readable schedule:
[`GET /v1/pricing`](/api/billing#get-the-pricing-schedule).

## Idle behavior

All three models keep the avatar naturally alive during silences, and as of
**2026-07-02** their idle loops play **forward-only** — footage wraps from its
last frame back to its first and never plays in reverse. Expression 2
additionally bakes a **real-footage idle clip** into every creation, so idle
is the identity's own footage rather than generated frames. Details per model:
[Expression 2](/concepts/expression-2#idle-and-speaking-behavior) ·
[Essence 2 light tier](/concepts/essence-2-light#idle-and-speaking-behavior), and
the expectations overview in
[Session behavior & troubleshooting](/guides/session-troubleshooting).

## Next steps

- [Expression 2](/concepts/expression-2) · [Essence 2 Quality](/concepts/essence-2-quality) · [Essence 2 light tier](/concepts/essence-2-light) — the official per-model guides.
- [Essence vs Expression](/concepts/models) — the two model families.
- [Agents API](/api/agents) — the full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Pricing & credits](/guides/pricing) — plans, top-ups, and the full schedule.
- [Changelog](/changelog) — the GA announcement.
