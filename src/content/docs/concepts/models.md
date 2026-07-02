---
title: "Essence vs Expression"
description: "The two bitHuman avatar models, Essence and Expression — what each does, where each runs (on-device CPU, Raspberry Pi, Apple Silicon, or NVIDIA GPU), and which one to pick for real-time 25 FPS lip-sync."
section: concepts
group: "Models"
order: 1
---

## The engines

bitHuman's avatar runtime is a family of **rendering engines** plus the
**conversation and voice stack** that feeds them. The two render engines you choose
between when packaging an avatar — and the focus of the rest of this page — are
**Essence** and **Expression**.

**Rendering engines** — two product families, each with tiers:

- **Essence** — the avatar family (a packaged `.imx` identity with real-time lip-sync):
  - **Essence 1** — the default. Pre-built identity, runs on virtually any CPU.
  - **[Essence 2 Quality](/concepts/essence-2-quality)** — the
    highest-fidelity premium renderer (cloud GPU).
  - **[Essence 2 Light](/concepts/essence-2-light)** — the cost-effective
    distilled renderer (runs on GPU, CPU, or the Apple Neural Engine —
    including fully on-device).
- **Expression** — the expressive family (animation driven from a portrait at runtime):
  - **Expression 1** — dynamic facial animation from any portrait image (Apple Silicon
    or NVIDIA GPU).
  - **[Expression 2](/concepts/expression-2)** — the second-generation
    generative engine: audio-driven, fully-generated motion from a single
    photo rather than patching a pre-rendered base. Serves on gpu, cpu, and
    ane tiers.

> **New** The three second-generation models — `essence-2-quality`,
> `essence-2-light`, and `expression-2` — are **generally available as of
> 2026-07-01**. See [Essence 2 & Expression 2](/concepts/models-v2) for the
> family overview, and the official per-model guides:
> [Expression 2](/concepts/expression-2) ·
> [Essence 2 Quality](/concepts/essence-2-quality) ·
> [Essence 2 Light](/concepts/essence-2-light).

Each family shares one `.imx` format, SDK methods, and the `push audio → drain frames`
shape; the tier is selected per session and is transparent to your integration. (A
separate self-hosted **Flash** GPU tier is metered per the [pricing](/guides/pricing) table.)

**Conversation + voice stack** — drives a managed agent and feeds the renderers:

- **Converse** — the STT → LLM → TTS turn loop that drives a managed agent's
  dialogue. It produces the audio that the renderers lip-sync.
- **Voice** — the speech engine (the voice/TTS stack behind audio-only chat and the
  voices you select for an agent).

The rest of this page focuses on Essence vs Expression — the two you choose between
when packaging an avatar.

## At a glance

bitHuman's two avatar models share the same [`.imx` file format](/concepts/avatars-imx), the same SDK methods, and the same [`push audio → drain frames`](/concepts/audio-streaming) shape. **Essence is the default** — it runs on virtually every CPU and is what `bithuman pull` ships in the showcase. **Expression** is the heavier high-fidelity option for specific on-device Apple Silicon or GPU server use cases.

| | **Essence** (default) | **Expression** |
|---|---|---|
| **What it does** | Pre-built avatar identity packaged in an `.imx` file. Real-time lip-sync. | Dynamic facial animation from any portrait image at runtime. |
| **Avatar source** | `.imx` you build once from a photo or video. | Any face image — provide at runtime, no build step. |
| **Custom gestures** | Yes (wave, nod, laugh, etc.) | No |
| **Idle animation** | Pre-recorded natural movement | AI-generated micro-movements |
| **Compute needed** | Any modern CPU | Apple Silicon M3+ (demo apps) or NVIDIA GPU |
| **Memory footprint** | Low (~200–500 MB) | Higher (~2–6 GB) |
| **Best for** | Kiosks, mobile, edge, 24/7 deployments, high concurrency | Close-up native consumer apps, custom faces per session |
| **Pricing** | 1 credit/min self-hosted · 2 credits/min cloud | 2 credits/min self-hosted · 4 credits/min cloud |

Both ship to every surface — SDKs, REST API, LiveKit plugin, CLI, on-device, embed widget. The same `.imx` file works everywhere.

## Where each model runs

| Surface | Essence | Expression |
|---|---|---|
| **iOS / iPadOS** | iPhone 16 Pro+, iPad Pro M4+ | iPad Pro M4+ (iPhone 16 Pro+ preview) |
| **macOS arm64** | Any Apple Silicon | M3+ |
| **macOS Intel** | Pending (2.3 ships arm64 only) | — |
| **Linux x86_64 / aarch64** | Any modern CPU | via NVIDIA GPU (Docker) |
| **Windows** | Pending (use WSL2 today) | — |
| **Raspberry Pi 4B+** | Supported | — |
| **bitHuman Cloud** | Managed | Managed |
| **Self-hosted CPU** | Python SDK / LiveKit plugin | — |
| **Self-hosted GPU** | — | Docker container |

Native macOS-Intel and Windows wheels are pending for the 2.3 line; the [architecture](/concepts/architecture) page tracks per-platform shipping status. On iPhone, Essence delivers a fast, real-time on-device avatar; Expression's heavier renderer targets iPad Pro and Mac (iPhone is in preview).

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

- ~2–6 GB resident; needs Apple Silicon M3+ (Mac) / M4+ (iPad Pro) or an NVIDIA GPU (8 GB+ VRAM).
- Works with any face image — drag-and-drop swap, photo, video frame, anything.
- AI-driven expressions adapt to speech content and emotional context.
- Higher visual fidelity for close-up conversational interactions.
- On-device demo apps target macOS M3+ and iPad Pro M4+ today; iPhone Expression and macOS-Intel are on the way.
- On Apple Silicon the Swift SDK auto-spawns a `bithuman-expression-daemon` subprocess to drive the model.

**How to ship it**

- [Cloud LiveKit plugin](/guides/deploy-livekit) — bitHuman hosts the GPU worker (set `model="expression"`).
- [Self-hosted GPU](/guides/deploy-self-hosted) — your own NVIDIA GPU via the Docker container.
- [On-device macOS / iPadOS](/sdk/swift) — Apple Silicon M3+, via the Swift SDK.
- [bitHuman CLI](/sdk/cli/overview) — `bithuman run` with an Expression `.imx`.
- [REST API](/api/reference) — same endpoint as Essence; the model is selected per agent.

## Which should I use?

### 24/7 kiosk or always-on display

**Essence.** No idle timeout, runs on CPU, predictable for unattended deployments.

### iPhone app

**Essence.** On iPhone, choose Essence; iPad and Mac are the on-device homes for Expression.

### Native Mac or iPad app with close-up dynamic faces

**Expression on-device** via the [Swift SDK](/sdk/swift) or the Mac/iPad reference apps.

### Need custom gestures (wave, nod, laugh)

**Essence.** Essence supports custom gestures — wave, nod, laugh — triggered by keyword or API.

### Quickest setup with any face photo

**Expression** via the cloud plugin. Pass the image at session start — no build step.

### Voice agent on LiveKit with maximum concurrency

**Essence.** Lower per-stream cost makes it the right pick for high-concurrency deployments.

### Edge hardware (Raspberry Pi, low-power laptop)

**Essence.** Runs on 1–2 CPU cores at 25 FPS.

### Highest visual quality for offline video generation

**Expression** with `quality="high"`. Best for offline batch jobs rather than real-time streaming.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models (GA 2026-07-01), with per-model guides: [Expression 2](/concepts/expression-2), [Essence 2 Quality](/concepts/essence-2-quality), [Essence 2 Light](/concepts/essence-2-light).
- [Building avatars](/guides/building-avatars) — get or generate your first avatar.
- [Pricing & credits](/guides/pricing) — what each model costs to run.
- [SDK overview](/sdk/overview) — run a model on your own hardware.
- [Architecture](/concepts/architecture) — engine layering and the full per-platform device matrix.
- [Avatars and the `.imx` format](/concepts/avatars-imx) — how avatars are packaged.
