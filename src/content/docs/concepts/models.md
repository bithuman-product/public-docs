---
title: "Essence vs Expression"
description: "The two bitHuman avatar model families, Essence and Expression — the first-generation models, what each does, where each runs (on-device CPU, Raspberry Pi, Apple Silicon, or NVIDIA GPU), and which one to pick."
section: concepts
group: "Models"
order: 5
---

## The engines

bitHuman's avatar runtime is a family of **rendering engines** plus the
**conversation and voice stack** that feeds them. The two render engines you choose
between when packaging an avatar — and the focus of the rest of this page — are
**Essence** and **Expression**.

**Rendering engines** — two product families, each with tiers:

- **Essence** — the avatar family (a packaged `.imx` identity with real-time lip-sync):
  - **Essence 1** — first generation. Pre-built identity, runs on virtually
    any CPU. (No longer the creation default: as of 2026-07-12 an omitted
    `model` on `/v1/agent/generate` defaults to Expression 1 — still a v1
    engine at the same 250-credit rate, never a v2 engine or a higher price.
    For new photoreal work the recommended model is Essence 2.)
  - **[Essence 2](/concepts/essence-2)** — the standard photoreal model and
    **the default**: an efficient renderer served from bitHuman's cloud chain
    (GPU, Apple Silicon, CPU), from your own CPU servers for offline
    rendering, and — opt-in per session — in the viewer's browser
    (WebGPU/WASM). There is **no installable on-device build** for a Mac,
    iPhone, iPad or Android device.
  - **[Essence 2 Max](/concepts/essence-2-max)** — the premium model: the
    highest-fidelity renderer served on dedicated cloud GPUs.
- **Expression** — the expressive family (animation driven from a portrait at runtime):
  - **Expression 1** — first generation. Dynamic facial animation from any
    portrait image. **GPU only** — see
    [models and planes](/concepts/models-and-planes).
  - **[Expression 2](/concepts/expression-2)** — the second-generation
    generative engine: audio-driven, fully-generated motion from a single
    photo rather than patching a pre-rendered base. Serves on gpu, cpu, and
    ane tiers.

> **New** The two second-generation models — `essence-2`
> and `expression-2` — are **available now** (launched July 10, 2026). See
> [Essence 2 & Expression 2](/concepts/models-v2) for the
> family overview, and the official per-model guides:
> [Expression 2](/concepts/expression-2) ·
> [Essence 2](/concepts/essence-2) ·
> [Essence 2 Max](/concepts/essence-2-max).

Each family shares one `.imx` format, SDK methods, and the `push audio → drain frames`
shape; the tier is selected per session and is transparent to your integration.

**Conversation + voice stack** — drives a managed agent and feeds the renderers:

- **Converse** — the STT → LLM → TTS turn loop that drives a managed agent's
  dialogue. It produces the audio that the renderers lip-sync.
- **Voice** — the speech engine (the voice/TTS stack behind audio-only chat and the
  voices you select for an agent).

The rest of this page focuses on the **first-generation** models, Essence 1
vs Expression 1 — the numbers and hardware notes below are theirs. For the
second generation, see [Essence 2 & Expression 2](/concepts/models-v2).

## At a glance

bitHuman's two first-generation avatar models share the same [`.imx` file format](/concepts/avatars-imx), the same SDK methods, and the same [`push audio → drain frames`](/concepts/audio-streaming) shape. **Essence 1** runs on virtually every CPU and is what `bithuman pull` ships in the showcase. **Expression 1** is the heavier high-fidelity option for specific on-device Apple Silicon or GPU server use cases.

| | **Essence 1** | **Expression 1** |
|---|---|---|
| **What it does** | Pre-built avatar identity packaged in an `.imx` file. Real-time lip-sync. | Dynamic facial animation from any portrait image at runtime. |
| **Avatar source** | `.imx` you build once from a photo (the identity video is generated internally). | Any face image — provide at runtime, no build step. |
| **Custom gestures** | Yes (wave, nod, laugh, etc.) | No |
| **Idle animation** | Pre-recorded natural movement | AI-generated micro-movements |
| **Compute needed** | Any modern CPU | NVIDIA GPU (GPU-only — see [models and planes](/concepts/models-and-planes)) |
| **Memory footprint** | Low (~200–500 MB) | Higher (~2–6 GB) |
| **Best for** | Kiosks, mobile, edge, 24/7 deployments, high concurrency | Close-up native consumer apps, custom faces per session |
| **Pricing (first-generation rates)** | 1 credit/min self-hosted · 2 credits/min cloud | 2 credits/min self-hosted · 4 credits/min cloud |

**Essence 1** ships to every surface — SDKs, REST API, LiveKit plugin, CLI,
on-device, embed widget. **Expression 1 does not**; see below.

## Where each model runs

The authority for this is the **model / plane matrix**, which encodes an owner
scope ruling dated 2026-09-02. Read it there:
**[Models and planes](/concepts/models-and-planes)**. The short version for the
two first-generation models:

| Lane | **Essence 1** | **Expression 1** |
|---|---|---|
| **GPU — offline and live** | In scope | In scope |
| **Apple — macOS, iOS** | In scope | **Not applicable** |
| **Browser** | In scope | **Not applicable** |
| **Android** | In scope | **Not applicable** |

**Expression 1 is GPU-only, deliberately.** The blank cells above are not a
roadmap and not a gap — they are the intended shape of the model, and no release
will fill them. If you need an expressive, portrait-driven model somewhere other
than a GPU, the model is **[Expression 2](/concepts/expression-2)**, which is in
scope on every lane.

Essence 1 on-device runs on macOS arm64, Linux x86_64 / aarch64, iOS, iPadOS,
Raspberry Pi 4B+ and in the browser. Native macOS-Intel and Windows wheels are
pending for the 2.3 line; the [architecture](/concepts/architecture) page tracks
per-platform shipping status.

## Essence

Essence packages a complete avatar identity (face, body, gestures) into an `.imx` file. At runtime, the SDK plays back pre-rendered base motion and patches the mouth region in real time to match incoming audio.

**Runtime characteristics**

- ~200–500 MB resident, 1–2 CPU cores, real-time at 25 FPS.
- Runs on macOS arm64, Linux x86_64 / aarch64, iOS, iPadOS, Raspberry Pi 4B+, and in the browser via WASM.
- No idle timeout — sessions can run 24/7. Reliable for unattended kiosks and lobby displays.
- Supports custom gestures (wave, nod, laugh) triggered by keywords or API.
- Predictable, consistent behavior. Lower per-stream cost — the right pick for high-concurrency self-hosted deployments.

**Try it from the showcase**

The CLI ships a curated set of ready-to-run Essence `.imx` avatars:

```bash
bithuman list                          # browse the showcase
bithuman pull modern-court-jester      # downloads to ~/.cache/bithuman/showcase/<slug>.imx
bithuman run modern-court-jester.imx   # live browser-served avatar
```

**How to ship it**

- [Python SDK](/sdk/python) — self-host on macOS arm64 + Linux x86_64 / aarch64.
- [Swift SDK](/sdk/swift) — native Mac, iPad, iPhone apps.
- [bitHuman CLI](/sdk/cli/overview) — no code, terminal or browser.
- [REST API](/api/reference) — backend integration in any language.
- [Cloud LiveKit plugin](/guides/deploy-livekit) — managed, no infrastructure.
- [Embed widget](/guides/deploy-embed) — drop-in iframe for websites.

## Expression

Expression generates real-time facial animation directly from a portrait image. The face can change between sessions or even mid-session — no avatar build step is required.

**Runtime characteristics**

- ~2–6 GB resident; needs an NVIDIA GPU (8 GB+ VRAM). **GPU only** — there is no
  Apple, browser or Android lane for Expression 1, by scope ruling.
- Works with any face image — drag-and-drop swap, photo, video frame, anything.
- AI-driven expressions adapt to speech content and emotional context.
- Higher visual fidelity for close-up conversational interactions.
- For an expressive model that *does* run on a Mac, an iPhone, in a browser or
  on Android, use **[Expression 2](/concepts/expression-2)**.

**How to ship it**

- [Cloud LiveKit plugin](/guides/deploy-livekit) — bitHuman hosts the GPU worker (set `model="expression"`).
- [Self-hosted GPU](/guides/deploy-self-hosted) — your own NVIDIA GPU via the Docker container.
- [REST API](/api/reference) — same endpoint as Essence; the model is selected per agent.

There is deliberately no on-device row here. See
[models and planes](/concepts/models-and-planes).

## Which should I use?

### 24/7 kiosk or always-on display

**Essence.** No idle timeout, runs on CPU, predictable for unattended deployments.

### iPhone app

**Essence 1**, or **[Essence 2](/concepts/essence-2)** /
**[Expression 2](/concepts/expression-2)** for the second generation. Not
Expression 1 — it is GPU-only.

### Native Mac or iPad app with close-up dynamic faces

**[Expression 2](/concepts/expression-2)** via the [Swift SDK](/sdk/swift).
Expression *1* is GPU-only and has no on-device Apple build — see
[models and planes](/concepts/models-and-planes).

### Need custom gestures (wave, nod, laugh)

**Essence.** Essence supports custom gestures — wave, nod, laugh — triggered by keyword or API.

### Quickest setup with any face photo

**Expression** via the cloud plugin. Pass the image at session start — no build step.

### Voice agent on LiveKit with maximum concurrency

**Essence.** Lower per-stream cost makes it the right pick for high-concurrency deployments.

### Edge hardware (Raspberry Pi, low-power laptop)

**Essence.** Runs on 1–2 CPU cores at 25 FPS.

### Highest visual quality for offline video generation

**[Talking video generation](/concepts/talking-video)** — render a finished mp4 with any model, including [Essence 2 Max](/concepts/essence-2-max) for premium fidelity. Best for offline batch jobs rather than real-time streaming.

## Next steps

- [Models and planes](/concepts/models-and-planes) — the model x lane matrix, and what "GPU only" means
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models `essence-2` and `expression-2` (launched July 10, 2026), with per-model guides: [Expression 2](/concepts/expression-2), [Essence 2](/concepts/essence-2), [Essence 2 Max](/concepts/essence-2-max).
- [Building avatars](/guides/building-avatars) — get or generate your first avatar.
- [Pricing & credits](/guides/pricing) — what each model costs to run.
- [SDK overview](/sdk/overview) — run a model on your own hardware.
- [Architecture](/concepts/architecture) — engine layering and the full per-platform device matrix.
- [Avatars and the `.imx` format](/concepts/avatars-imx) — how avatars are packaged.
