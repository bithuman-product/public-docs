---
title: "Swift SDK"
description: "On-device, real-time, lip-synced avatars for iOS, iPadOS, and macOS via SwiftPM. Apple Silicon only. GA."
section: sdk
group: "Languages"
order: 11
---

## Overview

The Swift SDK drops a real-time, lip-synced avatar into a native Mac, iPad, or
iPhone app. Audio in (16 kHz mono PCM), `CGImage` / BGR frames out at 25 FPS.
All inference runs **on-device**; a once-per-minute billing heartbeat meters
avatar mode (audio-only is unmetered). This SDK is **GA**.

> **Note** Swift has two surfaces today, both on the same `libessence` engine:
>
> - **`bitHumanKit`** — the currently-**published** SwiftPM package. Full-stack
>   and on-device: a high-level `VoiceChat` agent (built-in STT + LLM + TTS) plus
>   a low-level streaming runtime. This is what you install today.
> - **`Bithuman`** — a newer binding that maps directly onto the `libessence`
>   streaming engine (`Fixture` / `Runtime` / `pushAudio` / `pullFrame`). It is
>   **rolling out**; both are documented below.

It ships as a single binary XCFramework (macOS arm64 + iOS device + simulator)
with **zero transitive SwiftPM dependencies** — everything is statically linked.

## Install — `bitHumanKit` (published)

In Xcode: **File → Add Package Dependencies…** → paste the URL → pick the latest
tag → attach `bitHumanKit` to your target.

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/bithuman-product/bithuman-sdk-public.git",
             from: "0.8.1")
],
targets: [
    .target(name: "MyApp",
            dependencies: [.product(name: "bitHumanKit", package: "bithuman")])
]
```

The SwiftPM package was renamed `bithuman-sdk-public` → `bithuman` in Wave 8. The
import stays `import bitHumanKit` — only the `package:` field changes. Do not pin
below **0.8.1** (older versions are unsupported).

Auth: export `BITHUMAN_API_KEY` (Apple convention) or set
`VoiceChatConfig.apiKey`. Get a secret at [Developer → API
Keys](https://www.bithuman.ai/#developer).

## Two API surfaces in `bitHumanKit`

Both ship in the same package.

- **`VoiceChat`** — high-level voice agent with built-in speech recognition,
  LLM, and TTS. Fastest way to ship a talking on-device assistant.
- **`Bithuman.createRuntime` + `EssenceRuntime.frames()`** — low-level
  streaming: push your own PCM, pull `CGImage` frames. Use when you bring your
  own audio (WebRTC, custom TTS).

### Low-level streaming (bring your own audio)

```swift
import bitHumanKit

let imxURL = Bundle.main.url(forResource: "avatar", withExtension: "imx")!
let runtime = try await Bithuman.createRuntime(modelPath: imxURL)
guard case .essence(let essence) = runtime else { return }

// Drain frames at 25 fps → your SwiftUI view.
Task {
    for await frame in essence.frames() {
        if let frame { renderer.present(frame) }
    }
}

// Push 16 kHz mono PCM as it arrives.
try await essence.pushAudio(pcmChunk)
```

This is the Apple expression of the [audio-streaming push/drain
loop](/concepts/audio-streaming).

### High-level voice agent (audio-only, unmetered)

```swift
import SwiftUI
import bitHumanKit

@MainActor
final class Lifecycle: ObservableObject {
    @Published var status = "booting…"
    private var chat: VoiceChat?

    func start() async {
        var config = VoiceChatConfig()
        config.localeIdentifier = "en-US"
        config.systemPrompt = "You are a helpful assistant. One sentence per turn."
        config.voice = .preset("Aiden")
        do {
            let chat = VoiceChat(config: config)
            try await chat.start()
            self.chat = chat
            status = "live — talk to me"
        } catch { status = "error: \(error.localizedDescription)" }
    }
}
```

Say "hello" — it transcribes, thinks, and replies via TTS. Fully offline, no API
key for audio-only. To add the lip-synced avatar, set
`config.avatar = AvatarConfig(modelPath:portraitPath:)` and host an
`AvatarRendererView` — return the **same** renderer instance from both
`makeXxxView` and `updateXxxView` (SwiftUI rebuilds the parent many times per
second and the renderer must persist).

## The `Bithuman` libessence binding (rolling out)

The newer binding exposes the `libessence` streaming surface directly — the same
`Fixture` / `Runtime` shape as the Python and Kotlin SDKs. Install via SwiftPM
against the `bithuman-sdk` repo and import `Bithuman`:

```swift
dependencies: [
    .package(url: "https://github.com/bithuman-product/bithuman-sdk", from: "1.16.0")
],
targets: [
    .target(name: "MyApp",
            dependencies: [.product(name: "Bithuman", package: "bithuman-sdk")])
]
```

Push PCM whenever it arrives; pull a composed BGR frame whenever you want one:

```swift
import Bithuman

let fixture = try Fixture(path: modelURL.path)   // load weights once
let runtime = try Runtime(fixture: fixture)      // cheap per session

var bgr = [UInt8](repeating: 0, count: fixture.info.bgrFrameByteCount)

// Feed any amount of 16 kHz mono Float32 PCM (incremental, O(n_new)).
try runtime.pushAudio(audioPCM: pcm16kMonoFloat32)

// Drain however many ticks have become available.
while runtime.ticksAvailable > 0 {
    _ = try bgr.withUnsafeMutableBufferPointer {
        try runtime.pullFrame(frameIdxHint: -1, frameOut: $0)
    }
    // Hand `bgr` to SwiftUI / UIKit / AppKit.
}

// At end-of-utterance / when the conversation pauses:
try runtime.resetStream()
```

For multi-conversation hosting, share a single `Fixture` (~344 MB) across many
lightweight `Runtime`s (~36 MB each) — about 5.6× memory efficiency at N=10
concurrent streams on M5. A `Runtime` is not internally synchronized; pin
push/pull to one thread or wrap in your own mutex.

```swift
let fixture = try Fixture(path: modelURL.path)
let convoA  = try Runtime(fixture: fixture)
let convoB  = try Runtime(fixture: fixture)
```

The binding targets Swift 6 (strict-concurrency clean), swift-tools-version 6.0,
and wraps `libessence` ABI v6. `BithumanInfo.libraryVersion` /
`BithumanInfo.abiVersion` report the linked engine version.

## Permissions + entitlements

`Info.plist` (all platforms):

```xml
<key>NSMicrophoneUsageDescription</key><string>Talk to your assistant.</string>
<key>NSSpeechRecognitionUsageDescription</key><string>Recognise what you say.</string>
```

Without these, `chat.start()` fails silently (the OS denies and remembers).
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

The high-level `VoiceChat` agent runs fully on-device and **needs no API key for
audio-only** use — STT, LLM, and TTS all run locally and audio-only mode is
unmetered. You only need a key (and the billing heartbeat fires) once you add the
lip-synced avatar.

## Hardware floor

The SDK gates this at runtime — under-spec devices get a polite refusal screen,
not a half-loaded engine. Use `HardwareCheck.evaluate()` to branch your SwiftUI
root and show your own `UnsupportedDeviceView` for `.unsupported(reason)`.

| | Essence | Expression |
|---|---|---|
| **macOS** | M3+, macOS 26 | M3+, macOS 26 |
| **iPadOS** | iPad Pro M4+, iPadOS 26 | iPad Pro M4+, 16 GB, iPadOS 26 |
| **iPhone** | iPhone 16 Pro+ (A18 Pro) | Not supported — use Essence |

Requires Xcode 26+ (older Xcodes reject the Swift 6 concurrency syntax).
Expression on Apple Silicon auto-spawns a `bithuman-expression-daemon`
subprocess; on unsupported hardware it raises `ExpressionModelNotSupported` — not
a crash. See [models](/concepts/models).

## Performance

Measured on an M5 MacBook Pro (libessence 1.16.0, single conversation):

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

### `chat.start()` fails silently

Missing `Info.plist` privacy strings — the OS denies mic / speech and caches the
denial for the session.

### App killed ~30 s into a conversation (iOS)

Missing the increased-memory-limit entitlement. See the warning above — it must
be approved by Apple before it takes effect.

### Avatar disappears on re-render

Return the **same** `AvatarRendererView` instance from both `makeXxxView` and
`updateXxxView`. SwiftUI rebuilds the parent constantly; a fresh renderer each
time means a vanishing avatar.

### Under-spec device shows a refusal screen

Working as intended. Branch on `HardwareCheck.evaluate()`.

## See also

- [SDK overview](/sdk) — which SDK to pick
- [LiveKit (Apple)](/sdk/livekit) — connect a native app to a cloud-hosted avatar
- [Models](/concepts/models) — Essence vs Expression
- [CLI](/cli) — no-code Mac terminal tool, same engine
