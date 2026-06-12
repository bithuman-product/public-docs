---
title: "SDKs"
description: "Embed a real-time, lip-synced bitHuman avatar natively in your app — on-device or over the cloud — from Python, Apple, Android, or the browser."
section: sdk
group: "Overview"
order: 0
label: "Overview"
---

## One engine, one API, every language

Every bitHuman SDK is a thin, idiomatic binding over **`libessence`** — the
portable C++ avatar-rendering engine that also powers the [CLI](/cli) and the
[cloud REST API](/api/reference). They all read the same `.imx` avatar file and
produce identical frames at 25 FPS, so anything you prove out in one language
ports straight to the others.

The contract is the same everywhere:

1. **Push** 16 kHz mono PCM audio as it arrives (mic, TTS, WebRTC).
2. **Drain** lip-synced video frames at 25 FPS.

That push/drain loop is documented once, canonically, under
[audio streaming](/concepts/audio-streaming) — every language page links back to
it rather than repeating it.

## Which SDK should I use?

Match your target platform to a binding. All four ship visual, lip-synced
avatars; the difference is where they run and how mature each surface is.

| Platform / target | SDK | On-device / cloud | Status |
|---|---|---|---|
| Backend, AI agents, batch render, edge boxes | **[Python](/sdk/python)** | On-device | **GA** |
| Native Mac, iPad, iPhone apps | **[Swift / Apple](/sdk/swift)** | On-device | **Preview** |
| Native Android apps | **[Android (Kotlin)](/sdk/android)** | On-device | **Beta** |
| Browser & Node web clients | **[JavaScript / TS](/sdk/javascript)** | Cloud client | **Preview** |
| On-device engine wrapper backing the CLI | **[Rust](/cli)** | On-device | Internal / app-backing |
| Native app ↔ server avatar over WebRTC, or Python voice agent with a face | **[LiveKit (Apple + Python)](/sdk/livekit)** | Cloud / hybrid | Built on the bindings |

If you are not sure, start with the [Python SDK](/sdk/python) or the no-code
[CLI](/cli).

## On-device vs cloud

bitHuman runs in two topologies. The same `.imx` and the same API work in both.

<div class="bh-cols">
  <div class="bh-cell"><strong>On-device</strong><br/>Runs on the user's machine, phone, or edge box. Private, low-latency, offline-capable. Python, Swift, Kotlin.</div>
  <div class="bh-cell"><strong>Cloud</strong><br/>We host the GPU. Zero ops, ideal for web clients and sharing one avatar. JavaScript/TS, LiveKit.</div>
</div>

| | On-device | Cloud |
|---|---|---|
| Where inference runs | Your machine / phone | bitHuman's GPU pool |
| SDKs | Python, Swift, Kotlin | JavaScript/TS, [LiveKit](/sdk/livekit) |
| Network | Optional — billing heartbeat only ([or fully offline](/cli/local-mode)) | Required |
| Hardware | Any modern CPU (Essence); Apple Silicon / NVIDIA GPU (Expression) | None — we host it |
| Cost | 1 credit/min (Essence) · 2 credits/min (Expression) | 2 credits/min · 4 credits/min |
| Best for | Privacy, kiosks, edge, low latency | Zero-ops, web clients, sharing one avatar |

See [models](/concepts/models) for the Essence vs Expression comparison and
[pricing](/guides/pricing) for credit details.

## Status matrix

We keep this honest so you can plan around it.

| SDK | Package | Topology | Status |
|---|---|---|---|
| **Python** | `pip install bithuman` (2.3.4) | On-device | **GA** |
| **Swift / Apple** | SwiftPM `bitHumanKit` (0.8.2) | On-device | **Preview** |
| **Android (Kotlin)** | Gradle `ai.bithuman:sdk:2.3.6` | On-device | **Beta** |
| **JavaScript / TS** | `@bithuman/sdk` (not yet on npm) | Cloud client | **Preview** |
| **Rust** | in-tree crate `bithuman` (versioned with the CLI, not on crates.io) | On-device | Internal / app-backing |
| **Flutter** | reference app only | On-device | Reference app in `bithuman-apps`, **not a published code SDK** — see below |

> **Note** On Apple platforms the SwiftPM product is **`bitHumanKit`** — an
> umbrella framework (from
> [`bithuman-product/bithuman-sdk-public`](https://github.com/bithuman-product/bithuman-sdk-public))
> that re-exports both the Expression avatar engine and the Essence
> (`libessence`) runtime. `import bitHumanKit` is all you need; the standalone
> Layer-1 engine products are not yet published separately. This rail is
> **preview**. The [Swift page](/sdk/swift) has the details.

> **Rust** The `bithuman` Rust crate is the on-device engine wrapper that **backs
> the [CLI](/cli)**. It is internal / app-backing — source-only (not on
> crates.io) — and wraps `libessence` ABI v7. You don't depend on it directly;
> you get it through the CLI.

### A note on Flutter

A Flutter integration exists, but it is a **reference app** in the private
`bithuman-apps` repo — it is **not** published to pub.dev and the plugin source
is not in a public repo. Do not add `bithuman: ^X.Y.Z` to a `pubspec.yaml`;
`flutter pub get` will fail with "package not found". Until it ships, build
Flutter apps on the underlying [Swift SDK](/sdk/swift) (Apple) and
[Android SDK](/sdk/android) via platform channels, or [ping us on
Discord](https://discord.gg/ES953n7bPA) for early access.

## See also

- [Audio streaming](/concepts/audio-streaming) — the canonical push/drain loop
- [Models](/concepts/models) — Essence vs Expression and the `.imx` format
- [CLI](/cli) — the no-code path, same engine
- [API reference](/api/reference) — the cloud REST API
