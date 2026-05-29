---
title: "Swift SDK"
description: "On-device real-time avatar for iOS, iPadOS, and macOS. SwiftPM bitHumanKit. Apple Silicon only."
icon: "apple"
---

`bitHumanKit` drops a real-time, lip-synced avatar into a native
Mac / iPad / iPhone app. Audio in (16 kHz mono PCM), `CGImage` frames
out at 25 FPS. All inference runs on-device; a once-per-minute billing
heartbeat meters avatar mode (audio-only is unmetered).

It ships as a single binary XCFramework (macOS arm64 + iOS device +
simulator) with **zero transitive SwiftPM dependencies**.

## Install

In Xcode: **File → Add Package Dependencies…** → paste the URL → pick
the latest tag → attach `bitHumanKit` to your target.

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

The SwiftPM package was renamed `bithuman-sdk-public` → `bithuman` in
Wave 8. The product import stays `import bitHumanKit` — only the
`package:` field changes.

Auth: export `BITHUMAN_API_KEY` (Apple convention) or set
`VoiceChatConfig.apiKey`. Get a secret at
[Developer → API Keys](https://www.bithuman.ai/#developer).

## Two API surfaces

Both ship in the same package.

- **`VoiceChat`** — high-level voice agent: built-in speech
  recognition, LLM, and TTS. Fastest way to ship a talking on-device
  assistant.
- **`Bithuman.createRuntime` + `EssenceRuntime.frames()`** — low-level
  streaming: push your own PCM, pull `CGImage` frames. Use when you
  bring your own audio (WebRTC, custom TTS).

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

Say "hello" — it transcribes, thinks, replies via TTS. Fully offline,
no API key for audio-only. To add the lip-synced avatar, set
`config.avatar = AvatarConfig(modelPath:portraitPath:)` and host an
`AvatarRendererView` (return the **same** renderer instance from both
`makeXxxView` and `updateXxxView` — SwiftUI rebuilds the parent many
times per second and the renderer must persist).

## Permissions + entitlements

`Info.plist` (all platforms):

```xml
<key>NSMicrophoneUsageDescription</key><string>Talk to your assistant.</string>
<key>NSSpeechRecognitionUsageDescription</key><string>Recognise what you say.</string>
```

Without these, `chat.start()` fails silently (OS denies + remembers).


**iOS memory entitlement is mandatory.** Without it iOS kills your app
mid-conversation (~30 s into a turn) when memory exceeds the default
~3 GB ceiling. Request approval **before** development — Apple takes
1–3 business days.

```xml
<key>com.apple.developer.kernel.increased-memory-limit</key><true/>
<key>com.apple.developer.kernel.extended-virtual-addressing</key><true/>
```

Request at developer.apple.com → **Account → Membership → Request
Additional Capabilities**.


Sandboxed Mac apps also need
`com.apple.security.device.audio-input` in `.entitlements`.

## Hardware floor

The SDK gates this at runtime — under-spec devices get a polite
refusal screen, not a half-loaded engine. Use
`HardwareCheck.evaluate()` to branch your SwiftUI root.

| | Essence | Expression |
|---|---|---|
| **macOS** | M3+, macOS 26 | M3+, macOS 26 |
| **iPadOS** | iPad Pro M4+, iPadOS 26 | iPad Pro M4+, 16 GB, iPadOS 26 |
| **iPhone** | iPhone 17 Pro+ | Not supported — use Essence |

Requires Xcode 26+ (older Xcodes reject the Swift 6 concurrency syntax).

## Troubleshooting


  
    Missing `Info.plist` privacy strings — the OS denies mic / speech
    and caches the denial for the session.
  
  
    Missing the increased-memory-limit entitlement. See the warning
    above — it must be approved by Apple before it takes effect.
  
  
    Return the **same** `AvatarRendererView` instance from both
    `makeXxxView` and `updateXxxView`. SwiftUI rebuilds the parent
    constantly; a fresh renderer each time = a vanishing avatar.
  
  
    Working as intended. Branch on `HardwareCheck.evaluate()` and show
    your own `UnsupportedDeviceView` for `.unsupported(reason)`.
  


## See also


  
    The minimal SwiftUI integration, ~40 lines
  
  
    Essence vs Expression
  
  
    No-code Mac terminal tool, same engine
  

