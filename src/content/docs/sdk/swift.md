---
title: "Swift SDK"
description: "On-device, real-time, lip-synced avatars for iOS, iPadOS, and macOS. Apple Silicon only. Preview maturity."
section: sdk
group: "Languages"
order: 11
---

## Overview

On Apple platforms, bitHuman ships as **`bitHumanKit`** — a single SwiftPM
package that drops a real-time voice agent, with an optional lip-synced avatar,
into your Mac, iPad, or iPhone app. The umbrella framework re-exports both
on-device engines:

- **Expression** — animates any portrait image at runtime (speech encoder →
  animator → face decoder on the GPU + Apple Neural Engine). Home of `VoiceChat` /
  `VoiceChatConfig` / `AvatarConfig`.
- **Essence** — the portable `libessence` C++ runtime that renders a pre-built
  `.imx` avatar (audio in, composed BGR frames out). Reached via
  `Bithuman.createRuntime(modelPath:)`.

Audio in (16 kHz mono PCM), `CGImage` / BGR frames out at 25 FPS. All inference
runs **on-device**; a once-per-minute billing heartbeat meters avatar mode
(audio-only is unmetered).

> **Maturity** This rail is **preview**, not GA. Today the package publishes
> exactly one product — **`bitHumanKit`** (`import bitHumanKit`), which bundles
> everything. The standalone Layer-1 engine products (`Expression`, `Bithuman`)
> are not yet published as separate SwiftPM products; until they ship, import
> the umbrella.

## Install

In Xcode: **File → Add Package Dependencies…** → paste the package URL:

```
https://github.com/bithuman-product/bithuman-sdk-public.git
```

Pick **0.8.2** (or "Up to Next Major" from 0.8.1) and attach the
**`bitHumanKit`** product to your target. Or in `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/bithuman-sdk-public.git",
         from: "0.8.1")   // resolves to the latest 0.8.x tag (0.8.2 today)
```

The package wraps a pre-compiled `bitHumanKit.xcframework`; every third-party
dependency (MLX, HuggingFace, Tokenizers, …) is statically linked, so consumers
have **zero transitive Swift Package dependencies**. Just `import bitHumanKit`.

Auth: export `BITHUMAN_API_KEY` or set `VoiceChatConfig.apiKey` before
starting avatar mode. Get a key at
[Developer → API Keys](https://www.bithuman.ai/#developer). Audio-only voice
runs keyless and unmetered.

> **Note** The Swift SDK reads **`BITHUMAN_API_KEY`**; every other surface
> (Python, CLI, REST API) reads **`BITHUMAN_API_SECRET`**. Same value, two
> names — export both if you move between rails.

## Quick start: voice agent

The highest-level surface is `VoiceChat` — STT, LLM, and TTS all on-device.
No API key needed without an avatar:

```swift
import bitHumanKit

var config = VoiceChatConfig()
config.localeIdentifier = "en-US"
config.systemPrompt = "You are a helpful assistant. One sentence per turn."

let chat = VoiceChat(config: config)
try await chat.start()
// Speak into the mic. The agent listens, thinks, and replies aloud.
```

Add the lip-synced avatar by pointing the config at the Expression weights and
a portrait, and supplying your key:

```swift
import bitHumanKit

let weights = try await ExpressionWeights.ensureAvailable()  // ~1.6 GB, cached

var config = VoiceChatConfig()
config.avatar = AvatarConfig(modelPath: weights, portraitPath: portraitURL)
config.apiKey = ProcessInfo.processInfo.environment["BITHUMAN_API_KEY"]

let chat = VoiceChat(config: config)
try await chat.start()   // throws .missingAPIKey / .authenticationFailed
```

## The Essence runtime

For a pre-built `.imx` avatar (branded characters, 720p+, lowest credit rate),
drive the `libessence` runtime directly — push PCM in, drain frames out:

```swift
import bitHumanKit

let runtime = try await Bithuman.createRuntime(modelPath: modelURL)

try runtime.pushAudio(pcm16kMonoFloat32)     // any amount, as it arrives
for await frame in runtime.frames() {        // composed BGR frames, 25 FPS
    // hand the frame to your view layer
}
runtime.resetStream()                        // at end-of-utterance
```

This is the Apple expression of the [audio-streaming push/drain
loop](/concepts/audio-streaming) — the same `Fixture`/`Runtime` contract as the
Python SDK.

## Permissions + entitlements

`Info.plist` (all platforms):

```xml
<key>NSMicrophoneUsageDescription</key><string>Talk to your assistant.</string>
<key>NSSpeechRecognitionUsageDescription</key><string>Recognise what you say.</string>
```

Without these, mic / speech start fails silently (the OS denies and remembers).
Sandboxed Mac apps also need `com.apple.security.device.audio-input` in
`.entitlements`.

> **Warning** **The iOS increased-memory entitlement is mandatory.** Without it,
> iOS kills your app mid-conversation (~30 s into a turn) when memory exceeds the
> default ~3 GB ceiling. Request approval **before** development — Apple takes
> 1–3 business days.
>
> ```xml
> <key>com.apple.developer.kernel.increased-memory-limit</key><true/>
> <key>com.apple.developer.kernel.extended-virtual-addressing</key><true/>
> ```
>
> Request at developer.apple.com → **Account → Membership → Request Additional
> Capabilities**.

## Audio-only keyless mode

On-device voice chat (no lip-synced avatar) **needs no API key** — STT, LLM, and
TTS all run locally and audio-only mode is unmetered. You only need a key (and the
billing heartbeat fires) once you add the lip-synced avatar.

## Hardware floor

Gate this at runtime — on under-spec devices, guide people to a friendly fallback
rather than a half-loaded engine. Use `HardwareCheck.evaluate()` to branch your
SwiftUI root and show your own `UnsupportedDeviceView` for `.unsupported(reason)`.

| | Essence | Expression |
|---|---|---|
| **macOS** | M3+, macOS 26 | M3+, macOS 26 |
| **iPadOS** | iPad Pro M4+, iPadOS 26 | iPad Pro M4+, 16 GB, iPadOS 26 |
| **iPhone** | iPhone 16 Pro+ (A18 Pro) | iPhone 16 Pro+ (A18 Pro) — **preview**, on-device validation in progress |

Requires Xcode 26+ (older Xcodes reject the Swift 6 concurrency syntax).
Expression on Apple Silicon auto-spawns a `bithuman-expression-daemon`
subprocess; on unsupported hardware it raises `ExpressionModelNotSupported` — not
a crash. See [models](/concepts/models).

## Performance

Measured on an M5 MacBook Pro (libessence 1.19.1, single conversation):

| Metric | Value |
|---|---|
| Per-tick mean | 1.43 ms |
| Per-tick p99 | 1.51 ms |
| Sustained (tight loop) | 698 FPS |
| Cold start | ~290 ms |
| Peak RSS | ~84 MB |
| Wrapper overhead vs raw libessence | +1.7 % |

Comfortable headroom over the 25 FPS / 40 ms tick budget.

## Troubleshooting

### Mic / speech start fails silently

Missing `Info.plist` privacy strings — the OS denies mic / speech and caches the
denial for the session.

### App killed ~30 s into a conversation (iOS)

Missing the increased-memory-limit entitlement. See the warning above — it must
be approved by Apple before it takes effect.

### Avatar disappears on re-render

When hosting `AvatarRendererView` in SwiftUI, return the **same** renderer view
instance from both `makeXxxView` and `updateXxxView`. SwiftUI rebuilds the
parent constantly; a fresh renderer each time means a vanishing avatar.

### Under-spec device shows a friendly fallback

Working as intended. Branch on `HardwareCheck.evaluate()`.

## See also

- [Runnable Swift examples](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift) — voice, avatar, and benchmark apps
- [SDK overview](/sdk) — which SDK to pick
- [LiveKit (Apple)](/sdk/livekit) — connect a native app to a cloud-hosted avatar
- [Models](/concepts/models) — Essence vs Expression
- [CLI](/sdk/cli/overview) — no-code Mac terminal tool, same engine
