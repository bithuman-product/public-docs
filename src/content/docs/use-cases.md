---
title: "Use cases & case studies"
description: "What people build with bitHuman — real-time visual agents that run on any device, from Raspberry Pi kiosks to iPhone apps to GPU servers. Pick the scenario closest to yours and start there."
section: resources
group: "Resources"
order: 5
---

## What you can build

bitHuman is a platform for **real-time visual agents** — lifelike, lip-synced avatars that see, hear, and respond, and that run on-device on almost anything: Raspberry Pi, iPhone and iPad, Android, the browser via WASM, Mac mini, Windows, Linux and Jetson, or the cloud. Inference is on-device and [offline-capable](/concepts/architecture) — the only network call is a one-request-per-minute billing heartbeat — which is what makes bitHuman up to **10× cheaper** than cloud-render alternatives at better quality.

There are four core things builders ship with it, and they compose:

<div class="bh-cols">
  <div class="bh-cell"><strong>Real-time avatars</strong><br/>Audio in, lip-synced animated face out at 25 FPS. The interactive, conversational surface.</div>
  <div class="bh-cell"><strong>Talking avatar videos</strong><br/>Generate scripted videos from any face image. One photo, infinite cinema.</div>
  <div class="bh-cell"><strong>Illustrated multimedia books</strong><br/>Combine characters, narration, and imagery — from a single prompt to a print-ready book.</div>
  <div class="bh-cell"><strong>Shareable multi-avatar apps</strong><br/>Embed bitHuman agents anywhere — a website, a kiosk, an app, a product.</div>
</div>

The rest of this page maps real builder scenarios to those building blocks, the [model](/concepts/models) that fits, and where to start.

## Pick by scenario

| You want to build… | Best fit | Start here |
|---|---|---|
| A 24/7 kiosk or lobby display | Essence (CPU, no idle timeout) | [Self-hosted deploy](/guides/deploy-self-hosted) |
| A talking avatar on your website | Essence + embed widget | [Embed widget](/guides/deploy-embed) |
| A voice agent with a face on LiveKit | Essence (max concurrency) | [Deploy on LiveKit](/guides/deploy-livekit) |
| A native iPhone / iPad / Android app | Essence on-device | [Swift SDK](/sdk/swift) · [Android SDK](/sdk/android) |
| Close-up dynamic faces from any photo | Expression (Apple Silicon / GPU) | [Essence vs Expression](/concepts/models) |
| A scripted talking video at high quality | Expression batch render | [Building avatars](/guides/building-avatars) |
| An edge agent on Raspberry Pi | Essence (1–2 CPU cores) | [Self-hosted deploy](/guides/deploy-self-hosted) |
| A monetized character others can chat with | Any model + creator program | [Showcase](/showcase) |

## Interactive AI characters

> **One audio stream in, a lip-synced expressive face out — fully interactive, fully expressive.**

The most common build: a character that streams in real time and holds a conversation. The public [showcase](/showcase) runs hundreds of these — Energetic Audio Story Buddy, Pirate Trivia Host, Stage Presence Coach Lena, Wise Pup, Whimsical Bee Entertainer — across coaching, education, fiction, entertainment, and business roles.

- **Who it's for:** product teams adding a face to a voice assistant, coaches and tutors, entertainment and companion apps.
- **Model:** [Essence](/concepts/models) is the default — it runs on virtually every CPU at 25 FPS with no idle timeout, so it's the right pick for high-concurrency and always-on conversations.
- **Start here:** [AI voice chat example](/examples/ai-conversation) (OpenAI Realtime in, lip-synced avatar out) → [Deploy on LiveKit](/guides/deploy-livekit) for production.

## Kiosks, museums & edge devices

> **Best-in-class expressive avatars on everyday CPUs — even when connectivity is limited or intermittent.**

Essence was re-engineered with hashing-based compression to cut compute roughly 100×, so a believable avatar runs on a Mac mini or a Raspberry Pi 4B+ with no GPU and no constant network. That unlocks unattended, real-world deployments where cloud render is too expensive, too laggy, or simply unreachable.

<div class="bh-cols">
  <div class="bh-cell"><strong>Retail & hospitality</strong><br/>Menu agents, concierge, self check-in.</div>
  <div class="bh-cell"><strong>Museums & exhibits</strong><br/>Guides and interactive characters.</div>
  <div class="bh-cell"><strong>Enterprise on-prem</strong><br/>Internal assistants that never leave the building.</div>
  <div class="bh-cell"><strong>Education & home</strong><br/>Always-on companions and field deployments.</div>
</div>

- **Who it's for:** retail, hospitality, museums, on-prem enterprise, and any field deployment with limited connectivity.
- **Model:** [Essence](/concepts/models) — ~200–500 MB resident, 1–2 CPU cores, runs 24/7 with no idle timeout, lower per-stream cost at fleet scale.
- **Start here:** [Self-hosted deploy](/guides/deploy-self-hosted) and the device matrix in [Downloads](/downloads).

## Talking avatar videos — "one photo, infinite cinema"

> **The world's most realistic AI avatar video generation. Write any script.**

Provide a single portrait and a script and get a talking video out. [Expression](/concepts/models) generates frame-by-frame facial motion — natural lip motion, subtle head movement, and believable expression that tracks both *what* is said and *how* it's said — rather than stitching pre-rendered clips. It runs real-time at 41–45 FPS on a modern GPU, and far faster than batch alternatives for offline jobs.

- **Who it's for:** marketers and creators producing scripted spokesperson, explainer, or social video at scale from a still image.
- **Model:** [Expression](/concepts/models) (Apple Silicon M3+ or NVIDIA GPU); use `quality="high"` for offline batch renders.
- **Start here:** [Building avatars](/guides/building-avatars) for portrait specs and prompting → [Self-hosted GPU deploy](/guides/deploy-self-hosted).

## AI books & multimedia publishing — "write once, publish forever"

> **From a single prompt to a fully illustrated, print-ready book.**

Combine characters, narration, and imagery into long-form, illustrated multimedia books — titles like *The Universe* (395 pages), *An Invitation to the Coral Reef* (384 pages), and *The Hitchhiker's Guide to Quantum Mechanics* (332 pages) were produced this way. The avatar narrates and reacts; the book carries the imagery and structure.

- **Who it's for:** publishers, educators, and creators turning a prompt or an outline into a complete narrated, illustrated work.
- **Model:** [Essence](/concepts/models) narrators for interactive reading; combine with the generation APIs for imagery.
- **Start here:** [Showcase](/showcase) to see published books, then [Building avatars](/guides/building-avatars) for the narrator characters.

## Shareable & embeddable apps — "build empires, no code required"

> **Embed bitHuman agents anywhere.**

Wrap one or many avatars into a shareable app, a product surface, or a single drop-in iframe on a website — no backend required. Multi-avatar apps let several characters share a screen or hand off to each other. Creators who publish into the showcase earn **25% of every dollar** their characters generate.

- **Who it's for:** no-code creators, SaaS teams adding a branded avatar, and anyone monetizing a character without running infrastructure.
- **Model:** any — the same [`.imx`](/concepts/avatars-imx) file works across the embed widget, SDKs, and cloud.
- **Start here:** [Embed widget](/guides/deploy-embed) for the drop-in iframe (and per-visitor embed tokens) → [Browser rendering](/guides/browser-rendering) for in-page WASM playback.

## Native mobile & desktop apps

> **Real-time lip-synced avatars that run on-device — from Raspberry Pi to iPhone to NVIDIA GPU.**

Ship the avatar inside your own app with on-device inference, so it keeps working offline and your costs don't scale with cloud render minutes. [Essence](/concepts/models) covers iPhone, iPad, Android, and Apple Silicon Macs; [Expression](/concepts/models) adds high-fidelity dynamic faces on Apple Silicon M3+ Macs and iPad Pro M4+.

- **Who it's for:** iOS / iPadOS, Android, and macOS app teams that want a face that runs locally.
- **Model:** [Essence](/concepts/models) for the widest device reach (including iPhone); [Expression](/concepts/models) for close-up dynamic faces on capable Apple Silicon.
- **Start here:** [Swift SDK](/sdk/swift) (iOS / iPadOS / macOS), [Android SDK](/sdk/android), or the runnable [iOS](/examples/swift-ios-hello) and [Android](/examples/kotlin-android-hello) hello-world apps.

## Why builders pick bitHuman

| | bitHuman | Cloud-render alternatives |
|---|---|---|
| **Where it runs** | On-device: Pi, phone, browser, Mac, GPU, cloud | Cloud GPU only |
| **Offline** | Yes — inference is local | No |
| **Cost** | Up to 10× cheaper at scale | Per-minute cloud render |
| **Latency** | Real-time, local | Network round-trip |
| **Tooling** | Cross-platform [CLI](/cli) + [SDKs](/sdk) + [REST API](/api) | Varies |

## Where to go next

- [Essence vs Expression](/concepts/models) — pick the model for your scenario.
- [Examples](/examples) — runnable, open-source starting points for every surface.
- [Guides](/guides) — production deploy shapes: LiveKit cloud, self-hosted GPU/CPU, embed widget.
- [Showcase](/showcase) — hundreds of live agents and published works to try and remix.
- [Pricing](/guides/pricing) — credits, tiers, and what's metered.
