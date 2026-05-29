---
title: "SDKs"
description: "Embed a real-time, lip-synced bitHuman avatar natively in your app — on-device or over the cloud — from Python, Apple, Android, or the browser."
section: sdk
group: "Overview"
order: 1
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

- **[Python](/sdk/python)** — backend services, AI agents, batch render jobs,
  edge boxes. The most popular surface. **GA.**
- **[Swift / Apple](/sdk/swift)** — native Mac, iPad, and iPhone apps, fully
  on-device. **GA.**
- **[Android (Kotlin)](/sdk/android)** — native Android apps, on-device. **Beta.**
- **[JavaScript / TypeScript](/sdk/javascript)** — browser and Node clients that
  talk to a served or cloud avatar. **Preview.**
- **[LiveKit (Apple + Python)](/sdk/livekit)** — connect a native app to a
  server-hosted avatar over WebRTC, or deploy a Python voice agent with a face.

If you are not sure, start with the [Python SDK](/sdk/python) or the no-code
[CLI](/cli).

## On-device vs cloud

bitHuman runs in two topologies. The same `.imx` and the same API work in both.

| | On-device | Cloud |
|---|---|---|
| Where inference runs | Your machine / phone | bitHuman's GPU pool |
| SDKs | Python, Swift, Kotlin | JavaScript/TS, [LiveKit](/sdk/livekit) |
| Network | Optional — billing heartbeat only ([or fully offline](/cli/local-mode)) | Required |
| Hardware | Any modern CPU (Essence); Apple Silicon / NVIDIA GPU (Expression) | None — we host it |
| Cost | 1 credit/min (Essence) · 2 credits/min (Expression) | 2 credits/min · 4 credits/min |
| Best for | Privacy, kiosks, edge, low latency | Zero-ops, web clients, sharing one avatar |

See [models](/concepts/models) for the Essence vs Expression comparison and
[pricing](/concepts/pricing) for credit details.

## Status matrix

We keep this honest so you can plan around it.

| SDK | Package | Topology | Status |
|---|---|---|---|
| **Python** | `pip install bithuman` | On-device | **GA** |
| **Swift / Apple** | SwiftPM `bitHumanKit` | On-device | **GA** — `bitHumanKit` is the published full-stack package; the newer `libessence` `Bithuman` streaming binding is rolling out |
| **Android (Kotlin)** | Gradle `ai.bithuman:sdk` | On-device | **Beta** |
| **JavaScript / TS** | `npm install @bithuman/sdk` | Cloud client | **Preview** |
| **Flutter** | reference app only | On-device | Reference app in `bithuman-apps`, **not a published code SDK** — see below |

> **Note** Swift has two surfaces today. The currently-published SwiftPM package
> is **`bitHumanKit`** — a full-stack on-device library with a built-in voice
> agent (STT + LLM + TTS) and a low-level streaming runtime. A newer binding
> named **`Bithuman`** maps directly onto the `libessence` streaming engine
> (`Fixture` / `Runtime` / `pushAudio` / `pullFrame`) and is rolling out. The
> [Swift page](/sdk/swift) covers both.

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
