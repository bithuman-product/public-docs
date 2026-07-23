---
title: "SDK overview"
description: "Embed a real-time, lip-synced bitHuman avatar natively in your app — on-device and private by design, so audio, video, and prompts never leave your hardware (or run fully offline). From Python, Apple, the browser, or a single CLI command, at 25 FPS from 1 credit/min self-hosted."
section: sdk
group: "Get started"
order: 0
label: "Overview"
---

## One engine, one API, every surface

Every bitHuman SDK is a thin, idiomatic binding over **`libessence`** — the
portable C++ avatar-rendering engine that also powers the [cloud REST
API](/api/reference). They all read the same `.imx` avatar file and produce
identical frames at 25 FPS, so anything you prove out in one language ports
straight to the others.

This section covers both ways to build on your own hardware:

- **Language libraries** — call the engine from [Python](/sdk/python),
  [Swift](/sdk/swift), [Android / Kotlin](/sdk/android), or the
  [browser](/sdk/wasm).
- **The [command-line tool](/sdk/cli/overview)** — the same engine in a single
  binary, no code required. Documented here under **Command line**.

The contract is the same everywhere:

1. **Push** 16 kHz mono PCM audio as it arrives (mic, TTS, WebRTC).
2. **Drain** lip-synced video frames at 25 FPS.

That push/drain loop is documented once, canonically, under
[audio streaming](/concepts/audio-streaming) — every language page links back to
it rather than repeating it.

## Which one should I use?

Match your target platform to a binding. They all ship visual, lip-synced
avatars; the difference is where they run and how mature each surface is.

| Platform / target | SDK | On-device / cloud | Status |
|---|---|---|---|
| Backend, AI agents, batch render, edge boxes | **[Python](/sdk/python)** | On-device | **GA** |
| Native Mac, iPad, iPhone apps | **[Swift / Apple](/sdk/swift)** | On-device | **Preview** |
| Native Android apps | **[Android / Kotlin](/sdk/android)** | On-device | **Beta** |
| Browser & Node web clients | **[JavaScript / TS](/sdk/javascript)** | Cloud client | **Preview** |
| No code — terminal or browser viewer | **[CLI](/sdk/cli/overview)** | On-device | **GA** |
| Native app ↔ server avatar over WebRTC, or Python voice agent with a face | **[LiveKit (Apple + Python)](/sdk/livekit)** | Cloud / hybrid | Built on the bindings |

If you are not sure, start with the [Python SDK](/sdk/python) or the no-code
[CLI](/sdk/cli/overview).

## On-device vs cloud

bitHuman runs in two topologies. The same `.imx` and the same API work in both.

<div class="bh-cols">
  <div class="bh-cell"><strong>On-device</strong><br/>Runs on the user's machine or edge box. Private, low-latency, offline-capable. Python, Swift, CLI.</div>
  <div class="bh-cell"><strong>Cloud</strong><br/>We host the GPU. Zero ops, ideal for web clients and sharing one avatar. JavaScript/TS, LiveKit.</div>
</div>

| | On-device | Cloud |
|---|---|---|
| Where inference runs | Your machine | bitHuman's GPU pool |
| Surfaces | Python, Swift, [CLI](/sdk/cli/overview) | JavaScript/TS, [LiveKit](/sdk/livekit) |
| Network | Optional — billing heartbeat only ([or fully offline](/sdk/cli/local-mode)) | Required |
| Hardware | CPU (Essence 1 · `essence-2`) · Apple Silicon / Neural Engine (`essence-2`, `expression-2`) · Apple Silicon or NVIDIA GPU (Expression 1) | None — we host it |
| Cost | 1–2 credits/min (`essence-2` / `expression-2`: 2) | 2–8 credits/min (`essence-2` / `expression-2`: 4 · `essence-2-max`: 8) |
| Best for | Privacy, kiosks, edge, low latency | Zero-ops, web clients, sharing one avatar |

> **Second generation.** [`essence-2`](/concepts/essence-2) runs on-device on
> Apple Silicon / the Neural Engine and self-hosted on CPU;
> [`expression-2`](/concepts/expression-2) runs self-hosted on CPU
> (AVX-512-class) and on the Neural Engine.
> [`essence-2-max`](/concepts/essence-2-max) is cloud-GPU-only — no on-device
> or self-hosted runtime. See
> [where each model runs](/concepts/models-v2#where-each-model-runs).

See [models](/concepts/models) for the Essence vs Expression comparison,
[Essence 2 & Expression 2](/concepts/models-v2) for the second-generation
lineup, and [pricing](/guides/pricing) for credit details.

## Status matrix

We keep this honest so you can plan around it.

| SDK | Package | Topology | Status |
|---|---|---|---|
| **Python** | `pip install bithuman` (2.8.0) | On-device | **GA** |
| **Swift / Apple** | SwiftPM `bitHumanKit` (0.8.2) | On-device | **Preview** |
| **Android / Kotlin** | `ai.bithuman:sdk:2.3.6` — Maven Central (Essence, pinned) | On-device | **Beta** |
| **JavaScript / TS** | `@bithuman/sdk` (not yet on npm) | Cloud client | **Preview** |
| **CLI** | `bithuman-cli` (2.3.27) — Homebrew · PyPI · universal installer | On-device | **GA** |
| **Rust** | in-tree crate `bithuman` (versioned with the CLI, not on crates.io) | On-device | Internal / app-backing |
| **Flutter** | reference app only | On-device | Reference app only, not a published code SDK — see below |

> **Note** On Apple platforms the SwiftPM product is **`bitHumanKit`** — an
> umbrella framework (from
> [`bithuman-product/homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman))
> that re-exports both the Expression avatar engine and the Essence
> (`libessence`) runtime. `import bitHumanKit` is all you need; the standalone
> Layer-1 engine products are not yet published separately. This rail is
> **preview**. The [Swift page](/sdk/swift) has the details.

> **Rust** The `bithuman` Rust crate is the on-device engine wrapper that **backs
> the [CLI](/sdk/cli/overview)**. It is internal / app-backing — source-only (not on
> crates.io) — and wraps `libessence` ABI v7. You don't depend on it directly;
> you get it through the CLI.

### A note on Flutter

A Flutter integration exists today as an internal reference app — it is **not**
published to pub.dev, so don't add `bithuman: ^X.Y.Z` to a `pubspec.yaml`. Until it ships, build
Flutter apps on the underlying [Swift SDK](/sdk/swift) (Apple) via platform
channels, or [ping us on Discord](https://discord.gg/ES953n7bPA) for early access.

## See also

- [Audio streaming](/concepts/audio-streaming) — the canonical push/drain loop
- [Models](/concepts/models) — Essence vs Expression and the `.imx` format
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and where each runs
- [CLI](/sdk/cli/overview) — the command-line tool, same engine
- [API reference](/api/reference) — the cloud REST API
