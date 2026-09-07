---
title: "SDK overview"
description: "Embed a real-time, lip-synced bitHuman avatar natively in your app — on-device and private by design, so audio, video, and prompts never leave your hardware (or run fully offline). From Python, Apple, the browser, or a single CLI command, at 25 FPS from 1 credit/min self-hosted."
section: sdk
group: "Get started"
order: 0
label: "Overview"
---

## One engine, one API, every surface

Every bitHuman SDK is a thin, idiomatic binding over **the essence engine** — the
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
| Hardware | CPU (Essence 1) · Apple Silicon (`expression-2` from Swift SDK 2.5.0, `essence-2` from 2.7.0) · Android arm64 (`essence-1`, `expression-2`, `essence-2`) · NVIDIA GPU (Expression 1). | None — we host it |
| Cost | 1–2 credits/min (`essence-2` / `expression-2`: 2) | 2–8 credits/min (`essence-2` / `expression-2`: 4 · `essence-2-max`: 8) |
| Best for | Privacy, kiosks, edge, low latency | Zero-ops, web clients, sharing one avatar |

> **Second generation.** [`essence-2`](/concepts/essence-2) runs on-device
> through two published SDKs as of 2026-09-07: the
> [Swift SDK](/sdk/swift#essence-2-on-device)'s `Essence2` product (package
> 2.8.0 — a C interface that builds for iOS and macOS, with no in-app model
> download route yet) and the
> [Android SDK](/sdk/android#essence-2--aibithumanessence2-android040)'s
> `ai.bithuman:essence2-android:0.4.0` (with an in-SDK model store). Live
> sessions still run through the [REST API](/api/overview) or
> [LiveKit](/sdk/livekit). As of Python SDK **3.0.0** both `essence-2` and
> `expression-2` **render locally on your own CPU** through one call,
> `bithuman.open` — metered, no GPU — on macOS and Linux; the essence-2
> clip-to-file route is `bithuman.offline` with the `bithuman[offline]` extra
> ([Python SDK](/sdk/python)). Live streaming of an `essence-2` artifact from
> your own server still runs through the cloud.
> Both [`expression-2`](/concepts/expression-2) and — as of CLI **2.6.1** —
> `essence-2` also render locally via the
> [CLI](/sdk/cli/overview#local-rendering-by-platform) (macOS Apple Silicon,
> Linux x86_64; the runtimes ship in the tarball), and `expression-2`'s engine is on the Apple
> on-device rail as the `Expression2` SwiftPM product from **2.5.0**
> ([engine only — no model bundle is published](/sdk/swift#expression-2-on-device)).
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
| **Python** | `pip install bithuman` (3.0.0 — `bithuman.open` / `avatar.render`; `bithuman<3` to stay on 2.10.0) | On-device | **GA** |
| **Swift / Apple** | SwiftPM, pin `from: "2.8.0"` — products `bitHumanKit`, `Expression2` (2.6.0 gives it a model-path API) and `Essence2` (2.7.0; `import Essence2` from 2.8.0) | On-device | **Preview** |
| **Android / Kotlin** | Maven Central, three artifacts: `ai.bithuman:expression2-android:0.3.1` (expression-2), `ai.bithuman:essence2-android:0.4.0` (essence-2 — use no earlier version) and `ai.bithuman:sdk:2.3.6` (essence-1) — all `arm64-v8a` only | On-device | **Beta** |
| **JavaScript / TS** | `@bithuman/sdk` (not yet on npm) | Cloud client | **Preview** |
| **CLI** | `bithuman-cli` (2.6.1 — Homebrew / universal installer, macOS arm64 **and** Linux x86_64, essence-2 and expression-2 runtimes inside; 2.3.25 PyPI wheel) — Homebrew · PyPI · universal installer | On-device | **GA** |
| **Rust** | in-tree crate `bithuman` (versioned with the CLI, not on crates.io) | On-device | Internal / app-backing |
| **Flutter** | reference app only | On-device | Reference app only, not a published code SDK — see below |

> **Note** On Apple platforms the package
> ([`bithuman-product/homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman))
> vends **four** products: **`bitHumanKit`**, the umbrella — the Expression
> avatar engine plus an `.imx` avatar runtime plus the on-device LLM/TTS stack;
> **`Expression2`**, the second-generation engine on its own; **`Essence2`**,
> the essence-2 engine's C interface (since 2.7.0); and
> `BithumanEngineProtocol`, a source-only interface.
> **It does not contain the essence engine.** This page said it did until
> 2026-09-03; `strings -a` on the shipped `ios-arm64` binary counts the legacy
> engine string `libessence` **0** and `essence` **0**, against `ImxContainer` **141** in the same read. `Bithuman` is
> a **type** vended by `bitHumanKit`, not an importable module — and there is no
> `Expression` or `Bithuman` product to attach. This rail is **preview**. The
> [Swift page](/sdk/swift) has the details, including what the `Essence2`
> product does and does not give you yet.

> **Rust** The `bithuman` Rust crate is the on-device engine wrapper that **backs
> the [CLI](/sdk/cli/overview)**. It is internal / app-backing — source-only (not on
> crates.io) — and wraps essence engine ABI v7. You don't depend on it directly;
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
