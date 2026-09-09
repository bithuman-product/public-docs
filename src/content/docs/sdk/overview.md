---
title: "SDK overview"
description: "Embed a real-time, lip-synced bitHuman avatar natively in your app — on-device and private by design, so audio, video, and prompts never leave your hardware (or run fully offline). From iOS, Android, Python, macOS, the browser, or a single CLI command, at 25 FPS from 1 credit/min self-hosted."
section: sdk
group: "Get started"
order: 0
label: "Overview"
---

## One engine, one API, every surface

Every bitHuman SDK is a thin, idiomatic binding over **the essence engine** — the
portable C++ avatar-rendering engine that also powers the [cloud REST
API](/api/reference). The push/drain contract and the 25 FPS output are the same
in every binding, so the shape of your code ports straight from one language to
the next.

**What does not port is the model file.** Each engine opens the artifact it was
built for, and the families do not all reach every rail — most sharply,
`essence-2` does not render on an iPhone or iPad today. If you are building for
a phone, read [getting an avatar model onto a
phone](#getting-an-avatar-model-onto-a-phone) first: it is one table, and it is
the only place that question is answered in full.

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
  <div class="bh-cell"><strong>On-device</strong><br/>Runs on the user's machine, phone or edge box. Private, low-latency, offline-capable. Python, Swift, Android/Kotlin, CLI.</div>
  <div class="bh-cell"><strong>Cloud</strong><br/>We host the GPU. Zero ops, ideal for web clients and sharing one avatar. JavaScript/TS, LiveKit.</div>
</div>

| | On-device | Cloud |
|---|---|---|
| Where inference runs | Your machine | bitHuman's GPU pool |
| Surfaces | Python, [Swift](/sdk/swift), [Android / Kotlin](/sdk/android), [CLI](/sdk/cli/overview) | JavaScript/TS, [LiveKit](/sdk/livekit) |
| Network | Optional — billing heartbeat only ([or fully offline](/sdk/cli/local-mode)) | Required |
| Hardware | CPU (Essence 1) · Apple Silicon (`expression-2` from Swift SDK 2.5.0, `essence-2` from 2.7.0) · Android arm64 (`essence-1`, `expression-2`, `essence-2`) · NVIDIA GPU (Expression 1). | None — we host it |
| Cost | 1–2 credits/min (`essence-2` / `expression-2`: 2) | 2–8 credits/min (`essence-2` / `expression-2`: 4 · `essence-2-max`: 8) |
| Best for | Privacy, kiosks, edge, low latency | Zero-ops, web clients, sharing one avatar |

> **Second generation.** [`essence-2`](/concepts/essence-2) runs on-device
> through two published SDKs as of 2026-09-07: the
> [Swift SDK](/sdk/swift#essence-2-on-device)'s `Essence2` product (package
> 2.11.0 — a C interface that builds for iOS and macOS; ★ it does **not** yet
> render on a phone, because the model the download endpoint returns is not a
> package it opens and the engine refuses every iPhone below an iPhone 16 Pro
> — [both measured, on the Swift SDK page](/sdk/swift#essence-2-on-device)) and the
> [Android SDK](/sdk/android#essence-2--aibithumanessence2-android051)'s
> `ai.bithuman:essence2-android:0.5.1` (with an in-SDK model store and a metered session). Live
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

## Getting an avatar model onto a phone

Both mobile SDKs assume you already hold two things, and neither is created by
the SDK. Get them once, in this order.

1. **An account and a secret.** Sign up and create a secret at
   [bithuman.ai → Developer → API Keys](https://www.bithuman.ai/developer/api-keys)
   — free tier, no card. It is one value with two names: the Swift SDK reads
   `BITHUMAN_API_KEY`, while Android, Python, the CLI and the REST API read
   `BITHUMAN_API_SECRET`. Export both if you move between rails. You do **not**
   need a key to resolve the packages, to compile, or to run audio-only Swift
   voice chat with no avatar attached — you need one the moment an avatar
   renders, because that is what is metered.
2. **An agent code.** An avatar is an agent, and an agent is a code like
   `A17ZTB0222`. Create one from the dashboard or with [`POST
   /v1/agent/generate`](/api/agents#generate-an-agent); list the ones you already
   own with [`GET /v1/agents`](/api/agents#list-your-agents). Every route below
   takes that code.

Then the model reaches the handset one of these ways. Which one is decided by the
rail and the model, not by you:

| Rail | Model | How the model reaches the device |
|---|---|---|
| Android | `expression-2` | The AAR's own model store — `Expression2ModelStore(…).fetch(code)` downloads and digest-verifies the identity bundle over HTTPS at runtime. Nothing to bundle into the APK. [How](/sdk/android#getting-a-model-onto-the-device) |
| Android | `essence-2` | Same shape — `Essence2ModelStore.fetch(code)`, shipped since 0.4.0. Use [0.5.1 and only 0.5.1](/sdk/android#essence-2--aibithumanessence2-android051). |
| Android | `essence-1` | No store. Download the agent's `.imx` with [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) — or `bithuman pull <CODE>` — and put the file on the device yourself. [How](/sdk/android#essence-1--aibithumansdk236) |
| Apple | `expression-2` | Call the same download endpoint with `?model=expression-2`, then **stage the container's members yourself** and call `Expression2Engine.create(modelPath:sharedEngineDir:)` — the one-call `create(avatarContainer:)` opener refuses a published `.avatar` on iOS through 2.11.2. The engine ships no weights of its own, and it needs the shared graphs too. [The whole app, file by file](/examples/swift-ios-expression2) |
| Apple | bitHumanKit (`Essence`) | `ExpressionWeights.ensureAvailable()` pulls ~1.6 GB of shared weights on first launch and caches them; you supply a portrait image. There is no per-agent download on this path. |
| Apple | `essence-2` | **Nothing renders today.** The `Essence2` product builds for iOS and macOS, but the artifact the download endpoint returns is not a package this engine opens, and the engine refuses every iPhone below an iPhone 16 Pro. [Both measured](/sdk/swift#essence-2-on-device) |
| Desktop / CLI | any | `bithuman pull <CODE>`, or a showcase slug — `bithuman pull modern-court-jester` — into `~/.cache/bithuman`. |

The download endpoint answers `404 MODEL_ARTIFACT_NOT_READY` while an agent's
artifact is still being published, so a freshly generated agent is not
immediately downloadable — poll rather than treating it as a failure. Codes,
sizes and every error are on [the Agents API
page](/api/agents#download-an-agents-model).

### Which handset

Check this before you order hardware, not after — both floors are hard refusals,
not degraded modes.

| Rail | Minimum device |
|---|---|
| Android — all three AARs | **arm64-v8a only.** There is no x86, x86_64 or armeabi-v7a slice. On an x86_64 emulator the dependency resolves, the app compiles, the APK installs — and the first `System.loadLibrary` throws `UnsatisfiedLinkError`, with nothing earlier warning you. Use a physical arm64 phone, or build the AVD from an arm64-v8a system image. Android 10+ (API 29; `expression2-android` is API 26). |
| iPhone — `Expression2` | No device gate in the shipped binary; it has rendered on an iPhone 15. |
| iPhone — bitHumanKit and `Essence2` | iPhone 16 Pro / Pro Max (A18 Pro) or later. Earlier iPhones are refused by device name at launch. |
| iPad | iPad Pro M4 or later for bitHumanKit; an M-series iPad for `Essence2`. |
| Mac | Apple Silicon, M3 or later. |

One more Apple constraint that only bites at link time: taking the `Expression2`
and `Essence2` products in the **same app** does not link on a device. Per-product
tables, the refusal strings they were counted from, and that measurement are on
the [Swift](/sdk/swift#hardware-floor) and [Android](/sdk/android) pages.

## Status matrix

We keep this honest so you can plan around it.

| SDK | Package | Topology | Status |
|---|---|---|---|
| **Python** | `pip install bithuman` (3.0.0 — `bithuman.open` / `avatar.render`; `bithuman<3` to stay on 2.10.0) | On-device | **GA** |
| **Swift / Apple** (iOS, iPadOS, macOS) | SwiftPM, pin `from: "2.11.0"` — products `bitHumanKit`, `Expression2` (2.6.0 gives it a model-path API) and `Essence2` (2.7.0; `import Essence2` from 2.8.0). 2.11.0 is the tag that carries two corrections: `Expression2` + `Essence2` in one app does not link on a device, and the iPhone floor grades `Essence2` too | On-device | **Preview** |
| **Android / Kotlin** | Maven Central, three artifacts: `ai.bithuman:expression2-android:0.3.1` (expression-2), `ai.bithuman:essence2-android:0.5.1` (essence-2 — use no earlier version) and `ai.bithuman:sdk:2.3.6` (essence-1 — resolves and compiles, but [cannot authenticate on a device](/sdk/android#essence-1--aibithumansdk236)) — all `arm64-v8a` only | On-device | **Beta** |
| **JavaScript / TS** | `@bithuman/sdk` (not yet on npm) | Cloud client | **Preview** |
| **CLI** | `bithuman-cli` (2.6.3 — Homebrew / universal installer, macOS arm64 **and** Linux x86_64, essence-2 and expression-2 runtimes inside; 2.3.25 PyPI wheel) — Homebrew · PyPI · universal installer | On-device | **GA** |
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
