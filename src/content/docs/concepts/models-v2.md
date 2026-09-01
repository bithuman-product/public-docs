---
title: "Essence 2 & Expression 2"
description: "bitHuman's second-generation avatar models — essence-2 and expression-2 — real-time avatar video with on-device, browser, and cloud serving, per-minute pricing, and which to choose. Available now."
section: concepts
group: "Models"
order: 1
label: "Essence 2 & Expression 2"
---

> **Available now.** bitHuman's second-generation avatar models,
> **`essence-2`** and **`expression-2`**, are **live** — create them today via
> the API ([`POST /v1/agent/generate`](/api/agents#generate-an-agent)) or the
> dashboard. The first-generation models
> ([`essence-1` and `expression-1`](/concepts/models)) remain fully supported,
> and nothing changes for existing agents or integrations. Browse the
> [gallery](https://bithuman.ai/explore?gallery=v2) to see the second generation
> live and talk to a demo agent.

## The second-generation lineup

The two second-generation models roll out across every surface — the REST
API, the embed widget, the dashboard, and the SDKs:

- **[`expression-2`](/concepts/expression-2)** — the second-generation
  expression engine, for **stylized and universal characters** (cartoons,
  animals, creatures, robots — and people). Audio-driven, real-time avatar
  video generated from a **single photo**: at agent creation it trains a small
  per-identity model (about 2–2.5 hours on a training GPU; measured median
  2h04m over 39 creations), then synthesizes
  the **entire 416×720 scene** live at 20 fps — fully generated motion, not
  patched onto a pre-rendered base. Runs on GPU, CPU, and Apple Neural Engine.
- **[`essence-2`](/concepts/essence-2)** — the **standard** Essence model for
  photorealistic people, and the default. It animates your identity's
  footage (a full-HD 1080p identity video, generated internally from your
  image) at ~25 fps with an efficient engine that serves from **cloud GPUs**,
  **Apple Neural Engine** and **CPU** tiers, from **your own CPU servers**
  for offline rendering, and — where you opt a session into it —
  **in the viewer's browser** (WebGPU/WASM), where frames never leave that
  browser. bitHuman routes cloud sessions for you; you just pick `essence-2`.
  There is **no installable on-device build** for a Mac, iPhone, iPad or
  Android device.
- **[`essence-2-max`](/concepts/essence-2-max)** — the **premium** Essence
  model: the highest-fidelity Essence renderer served directly on dedicated
  cloud GPUs for close-up and hero-quality output. It has no separate
  creation — every `essence-2` creation includes it.

## At a glance

| | **essence-2** | **essence-2-max** | **expression-2** |
|---|---|---|---|
| **Guide** | [Essence 2](/concepts/essence-2) | [Essence 2 Max](/concepts/essence-2-max) | [Expression 2](/concepts/expression-2) |
| **Family** | Essence | Essence | Expression |
| **What it is** | The standard Essence 2 model — efficient renderer, serves from every cloud tier plus your own CPU servers and the browser; the default | The premium model — the highest-fidelity renderer, served on dedicated cloud GPUs | Generative motion from one photo |
| **Best for** | Photorealistic humans | Photorealistic humans, close-up/hero quality | Characters: cartoons, animals, creatures, robots |
| **Identity source** | Identity video generated internally from your image | The same internally generated identity video | Single photo |
| **Output** | Identity footage animated at its native resolution (1080p driver default), ~25 fps | Identity footage, reference fidelity, ~25 fps | Fully generated 416×720 scene, 20 fps |
| **Serving tiers** | gpu · ane · cpu (auto-routed chain) · browser (WebGPU/WASM, in rollout) | gpu | gpu · ane · cpu (auto-routed chain) |
| **On-device** | Your own CPU servers (Python SDK 2.9.0+). **Not** on your Mac/iPhone — the Apple Neural Engine tier is bitHuman's hardware, reached over the network | — | Your own CPU/GPU via the CLI; Apple Silicon via the `Expression2` SwiftPM product (2.5.0+, [engine only](/sdk/swift#expression-2-on-device)) |
| **Creation** | Train-on-create, 500 credits (typically about 45 minutes) | Included with the combined `essence-2` creation (instant identity prep) | Train-on-create, 2000 credits (about 2–2.5 hours) |
| **Cloud** | 4 credits/min | 8 credits/min | 4 credits/min |
| **Self-hosted** | 2 credits/min | 4 credits/min | 2 credits/min |

All three keep the platform contract unchanged: push 16-bit PCM audio in,
drain real-time lip-synced video frames out. The same agent code works across
every surface.

## Which should I choose?

### Highest visual fidelity, close-up or hero content

**[`essence-2-max`](/concepts/essence-2-max).** The premium Essence
renderer — the highest-fidelity model, served on dedicated cloud GPUs — pick
it when image quality is the whole point and 8 credits/min is acceptable.
Its identity derives from the agent's stored identity video — generated
internally by every `essence-2` creation.

### Cost-effective at scale, or off our cloud

**[`essence-2`](/concepts/essence-2).** The standard model and the default —
half the cloud price of Max, and the same identity artifact serves three
different ways: from **bitHuman's cloud** (GPU, Apple Neural Engine and CPU
tiers, routed for you), from **your own CPU servers** for offline rendering
(Python SDK 2.9.0+), and **in the viewer's browser** where you opt a session
into it. The right default for photorealistic humans, kiosks,
high-concurrency deployments, and privacy-sensitive environments.

> **What "on-device" means here.** There is **no installable Essence 2 build
> for a Mac, iPhone, iPad or Android device** today — the Apple Neural Engine
> tier runs on *bitHuman's* Apple Silicon, reached over the network like any
> other cloud tier. The two places Essence 2 runs off our cloud are your own
> CPU servers and the viewer's browser. See
> [where each model runs](#where-each-model-runs).

### Fully generated motion from a single photo

**[`expression-2`](/concepts/expression-2).** The most lifelike motion in the
lineup — expressions and head movement are generated live from the audio
rather than replayed. Creation trains a per-identity model from your photo
(about 2–2.5 hours); serving spans GPU, CPU, and Apple Neural Engine
tiers.

Still deciding between the **families** (Essence vs Expression)? Start with
[Essence vs Expression](/concepts/models).

## How creation works

All three models are **train-on-create**: you create an agent once with
`POST /v1/agent/generate` and the platform prepares that identity's model as
part of generation. Creation is asynchronous and one-time per agent —
**500 credits** for `essence-2` (the combined creation, Essence 2 Max
included) and **2000 credits** for `expression-2`. Poll
[`GET /v1/agent/status/{agent_id}`](/api/agents) until the status is terminal
(`ready`, or `failed`). `success` is **not** terminal — the voice/image and
video steps each write it mid-run, so a loop that stops on it exits at ~20%
(see [the status table](/api/agents#poll-status)).

How long creation takes depends on the model — the v2 models do real
per-identity work, so don't apply a short client timeout:

| Model | Identity step | Typical creation time |
|---|---|---|
| `essence-2` | Builds a compact identity bundle on a cloud GPU | Typically about 45 minutes (up to a few hours) |
| `essence-2-max` | Instant prep from the internally generated identity video (seconds) | Included with the combined `essence-2` creation |
| `expression-2` | Trains a per-identity model on a dedicated training GPU | About 2–2.5 hours. Measured over 39 creations completed within 12 h in the window 2026-07-15 → 2026-08-30: median 2h04m, fastest 1h25m, slowest decile beyond 3h45m |

**Creation input is a portrait image for all three** — `essence-2` generates
a 10-second identity video from it internally (25 fps, authored to loop
seamlessly, its first and last frames match), `essence-2-max` derives from
that same video, and `expression-2` trains straight from the photo. The
identity image itself is produced by **Seedream 5 pro** (text-to-image from
your prompt); an uploaded `image` is treated as a **reference** and always
regenerated through Seedream 5 edit to standardize it — never used raw. The
internal identity/driver video is generated by **Seedance 1.5 pro**. Video
input is not part of the creation contract for any model and is being removed
platform-wide: do not send `video` — as the rollout completes, a request
carrying it is rejected with
[`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
anything is billed. Details and failure modes are in each
model's guide and the [Agents API](/api/agents#generate-an-agent).

Three optional fields shape the generated identity (they apply to every
model):

- **`aspect_ratio`** — `16:9` (default), `9:16`, or `1:1`. Drives **both** the
  generated identity image and the driver video; images are generated at 1080p.
- **`transparency`** — `false` by default. Set `true` to generate the identity
  image on a solid **green-screen** background for chroma-key / transparent
  embedding — the character itself never uses green.
- **`framing`** — `portrait` (default) frames head-and-shoulders; `full_body`
  shows the whole figure including the feet, for kiosk / standing-avatar
  layouts.

Two notes round out the creation surface:

- **`essence-2` is a combined creation.** The one 500-credit charge trains
  the standard Essence 2 identity bundle **and** makes Essence 2 Max
  available from the same internally generated identity video — launch with `?model=essence-2-max`
  (or the embed-token `model` field) when you want the premium model. See
  [the combined creation](/api/agents#essence-2--the-combined-creation).
- **`auto` — classify and route.** An LLM looks at your input (the image if
  provided, else the prompt): a photorealistic person routes to `essence-2`
  (combined), a cartoon / animal / creature / robot routes to `expression-2`.
  It's the default in the dashboard's create flow; API callers must send it
  explicitly — an omitted `model` now defaults to `expression-1` (Expression 1,
  version `v1`, 250 credits), flipped from the old `essence-1` default on
  2026-07-12. The flip is price-neutral (still 250 credits, still `v1`, still
  ungated) and never silently selects a v2 engine or a higher price.
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
        "model": "expression",   # family: expression or essence
        "version": "v2",         # v1 or v2 → expression + v2 = Expression 2
        "aspect_ratio": "9:16",
        "framing": "portrait",
    },
)
print(resp.json())
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


```json
{
  "success": true,
  "message": "Agent generation started",
  "agent_id": "A66GYD8664",
  "status": "processing"
}
```

The same request shape works for the other models. Select an engine with
`model` + `version` — `model` is `expression` (default) or `essence`, and
`version` is `v1` (default) or `v2`, so `essence` + `v2` is Essence 2 while
`expression` + `v1` is Expression 1. You can still pass a **full engine name**
directly (`essence-2`, `essence-2-max`, `expression-2`, `essence-1`,
`expression-1`) — those pass through unchanged and `version` is ignored, so
existing integrations keep working. Omitting `model` entirely defaults to
`expression-1` (250 credits). Invalid or retired model names return
`400 VALIDATION_ERROR` with no credits charged; pre-rename aliases are
handled as described in [Naming & migration](#naming--migration).

Then poll until the agent is ready:

```bash
curl https://api.bithuman.ai/v1/agent/status/A66GYD8664 \
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
    agent_id: "A66GYD8664",
    fingerprint: visitorFingerprint,   // stable per-device hex — required
  }),
});
const { data: { token } } = await res.json();
```

```html
<!-- BROWSER — the agent renders on its model's serving tier -->
<iframe
  src="https://bithuman.ai/embed/A66GYD8664?token=YOUR_TOKEN"
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
https://bithuman.ai/embed/A66GYD8664?model=expression-2-ane
```

| Model | Force-tier slugs |
|---|---|
| [`essence-2`](/concepts/essence-2#serving-tiers) | `essence-2-gpu` · `essence-2-ane` · `essence-2-cpu` |
| [`expression-2`](/concepts/expression-2#serving-tiers) | `expression-2-gpu` · `expression-2-cpu` · `expression-2-ane` |
| [`essence-2-max`](/concepts/essence-2-max#serving) | `essence-2-max` (single cloud GPU tier; also self-hostable — see [Self-hosted Essence 2 Max](/guides/deploy-essence-2-max)) |

Saved links carrying pre-rename or retired slugs keep working — see
[Naming & migration](#naming--migration).

> **Note** Tier forcing is an advanced, operational surface — slugs may be
> adjusted as capacity evolves. For production, omit `?model=` and let the
> platform choose.

## Where each model runs

The device/runtime matrix for the second generation:

| Runtime | `essence-2` | `essence-2-max` | `expression-2` |
|---|---|---|---|
| bitHuman cloud — GPU | ✅ chain tier | ✅ (the only tier) | ✅ chain tier |
| bitHuman cloud — Apple Neural Engine | ✅ chain tier | — | ✅ chain tier |
| bitHuman cloud — CPU | ✅ chain tier | — | ✅ chain tier |
| Self-hosted (your servers, CPU) | ✅ offline rendering, SDK 2.9.0+, metered ([quickstart](/guides/deploy-self-hosted#essence-2-self-hosted--cpu-offline-rendering-sdk-290)); live streaming still via the cloud | — | Local rendering via the [CLI](/sdk/cli/overview#local-rendering-by-platform) (macOS Apple Silicon, Linux x86_64) |
| On-device macOS / iOS (Apple Silicon) | — not published ([Swift SDK](/sdk/swift) does not carry Essence 2) | — (cloud-only) | [Swift SDK](/sdk/swift) `Expression2` product, 2.5.0+ — `macos-arm64` **and** `ios-arm64`; both have rendered on real hardware, but it is engine only, [no model bundle published](/sdk/swift#expression-2-on-device) |
| Browser-local (WASM/WebGPU, no server render) | Rolling out — `?render=local` renders Essence 2 in-browser (WebGPU on Apple Silicon/desktop-class GPUs, WASM fallback) as per-identity web bundles publish; the [browser rendering](/guides/browser-rendering) modes ship with `essence-1` today | — | Rolling out — `?render=local` renders Expression 2 in-browser (LiteRT.js / WebGPU, WASM fallback). **Opt-in:** cloud is the default for every visitor; the URL has to ask, and a session falls back to cloud when the identity has no published web bundle or the browser can't run the engine. A client-side option, not a serving tier. See [browser rendering](/guides/browser-rendering) |

Cloud sessions are routed automatically; on-device and self-hosted serving
use the downloaded model artifact
([`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)).

A few things to know today: essence-2's **in-browser WebGPU** tier renders on the
viewer's own device (audio and frames never leave the browser), with the WASM
fallback covering living idle + voice while full in-browser lip-sync lands for
WASM and for expression-2. **Local playback of a downloaded artifact** differs
by model: `expression-2` already renders locally via the
[CLI](/sdk/cli/overview#local-rendering-by-platform) (macOS Apple Silicon,
Linux x86_64), and as of SDK **2.9.0** the `essence-2` download **renders
offline on your own CPU servers** — metered, no GPU — via
`bithuman.tessera_offline`
([quickstart](/guides/deploy-self-hosted#essence-2-self-hosted--cpu-offline-rendering-sdk-290)).
**Locally-hosted LiveKit** (live streaming from your own server) is still in
active development — live sessions run through the cloud or the browser. And **neither** second-generation model's CPU tier sustains real-time
rendering: essence-2's cloud CPU tier measured **0.9–1.0 fps** with the sharp
mouth-interior rendering armed on 2026-08-30
([conditions](/concepts/essence-2#rendering-throughput-measured)), and
expression-2's CPU tier is sized for **offline talking-video generation** rather
than real-time streaming. Real-time streaming uses the GPU and Apple Neural
Engine tiers.

## Pricing

Per active minute of avatar runtime, from the
[pricing schedule](/guides/pricing):

| Model | Cloud | Self-hosted |
|---|---|---|
| `essence-2` | 4 credits/min | 2 credits/min |
| `essence-2-max` | 8 credits/min | 4 credits/min |
| `expression-2` | 4 credits/min | 2 credits/min |

Creation is one-time and per agent: **500 credits** for the
[combined `essence-2`](/api/agents#essence-2--the-combined-creation) (Essence
2 Max included — no separate Max creation), **2000 credits** for
`expression-2`,
[`auto`](/api/agents#auto--let-the-platform-pick-the-model) charges the
routed model's rate (500 or 2000), and 250 credits for the v1 models
(`essence-1`, `expression-1`).
[Adding a model to an existing agent](/api/agents#add-a-model-to-an-existing-agent)
charges the same per-model rates. Serving accrues for the whole time a session
is live and rendering, idle/silent animation included; only stopped, paused, or
disconnected sessions stop accruing. Machine-readable schedule:
[`GET /v1/pricing`](/api/billing#get-the-pricing-schedule).

## Naming & migration

This is the one place the historical model names are documented — every other
page uses the canonical names (`essence-2`, `essence-2-max`, `expression-2`).

- **`essence-2-quality` → `essence-2-max`** (renamed 2026-07-10; alias
  retired 2026-07-29). `essence-2-max` is the canonical name everywhere a
  model is requested. The generation endpoints
  ([`POST /v1/agent/generate`](/api/agents), [`POST /v1/video/generate`](/api/video),
  and the embed-token `model` field) **no longer accept `essence-2-quality`** —
  a request naming it returns a `400` listing the current models. Server
  *responses* (`supported_models`, `409` messages, model downloads,
  talking-video job responses) report `essence-2-max`. Send `essence-2-max`.
- **`essence-2-light`** was consolidated into **`essence-2`** (2026-07-05)
  and is retired: you create and serve with `model="essence-2"`, the standard
  model. Requests naming `essence-2-light` get a `400` with a hint pointing
  at `essence-2`.
- **Saved viewer links keep rendering.** A share link carrying
  `?model=essence-2-quality` no longer pins the premium tier by that string —
  the viewer ignores the unrecognized override and falls back to the agent's
  stored model, so the link still plays. New links should use
  `?model=essence-2-max` to pin the premium tier. The old
  `essence-2-light-gpu` / `essence-2-light-cpu` slugs still pin their tiers,
  and links carrying `essence-2-light` or `essence-2-light-ane` route to the
  `essence-2` default chain.

## Idle behavior

All three models keep the avatar naturally alive during silences, and as of
**2026-07-02** their idle loops play **forward-only** — footage wraps from its
last frame back to its first and never plays in reverse. Expression 2
additionally bakes a **real-footage idle clip** into every creation, so idle
is the identity's own footage rather than generated frames. Details per model:
[Expression 2](/concepts/expression-2#idle-and-speaking-behavior) ·
[Essence 2](/concepts/essence-2#idle-and-speaking-behavior), and
the expectations overview in
[Session behavior & troubleshooting](/guides/session-troubleshooting).

## Next steps

- [Expression 2](/concepts/expression-2) · [Essence 2](/concepts/essence-2) · [Essence 2 Max](/concepts/essence-2-max) — the official per-model guides.
- [Essence vs Expression](/concepts/models) — the two model families.
- [Agents API](/api/agents) — the full create → poll → serve lifecycle.
- [Embed widget](/guides/deploy-embed) — ship a live session in minutes.
- [Session behavior & troubleshooting](/guides/session-troubleshooting) — latency, idle, common errors.
- [Pricing & credits](/guides/pricing) — plans, top-ups, and the full schedule.
- [Changelog](/changelog) — the GA announcement.
