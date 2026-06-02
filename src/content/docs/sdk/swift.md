---
title: "Swift SDK"
description: "On-device, real-time, lip-synced avatars for iOS, iPadOS, and macOS. Apple Silicon only. Preview maturity."
section: sdk
group: "Languages"
order: 11
---

## Overview

On Apple platforms, bitHuman ships as two layers on the same on-device engine:

- **`Bithuman`** — the low-level SwiftPM package that binds directly to the
  `libessence` streaming engine. Its surface is `Fixture` / `Runtime` / `Avatar`:
  load weights once, drive a per-session runtime with audio in / composed BGR
  frames out. This is the real rail.
- **AvatarUIKit** — the app-layer renderer and view stack (from
  [`bithuman-apps/avatar-ui-kit`](https://github.com/bithuman-product)). It wraps
  `Bithuman` with SwiftUI/UIKit views and is what the `expression/{mac,ipad,iphone}`
  sample apps build on. Use it when you want a drop-in avatar view instead of
  managing frames yourself.

Audio in (16 kHz mono PCM), `CGImage` / BGR frames out at 25 FPS. All inference
runs **on-device**; a once-per-minute billing heartbeat meters avatar mode
(audio-only is unmetered).

> **Maturity** This rail is **preview**, not GA. The earlier dissolved
> `bitHumanKit` package — with `Bithuman.createRuntime` and
> `EssenceRuntime.frames()` — has been **removed**; do not use those APIs. The
> `Bithuman` package and AvatarUIKit are still stabilizing.

## Install

The `Bithuman` SwiftPM package links a binary XCFramework plus native engine
dependencies — **ONNX Runtime (ORT), ffmpeg, and hdf5** are required at the
install path. These are not zero-dependency: they are vendored/linked by the
package and add transitive native libraries. Plan your build settings and binary
size accordingly.

In Xcode: **File → Add Package Dependencies…** → paste the repo URL → pick the
latest tag → attach the `Bithuman` product (and AvatarUIKit, if you want the
view layer) to your target.

Auth: export `BITHUMAN_API_KEY` (Apple convention) or set the avatar config's
`apiKey`. Get a secret at
[Developer → API Keys](https://www.bithuman.ai/#developer). Audio-only voice runs
keyless and unmetered.

## The `Bithuman` libessence binding

The `Bithuman` package exposes the `libessence` streaming surface directly — the
same `Fixture` / `Runtime` shape as the Python and Kotlin SDKs, plus an `Avatar`
type for the composed-frame path.

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
    // Hand `bgr` to SwiftUI / UIKit / AppKit — or let AvatarUIKit do it.
}

// At end-of-utterance / when the conversation pauses:
try runtime.resetStream()
```

This is the Apple expression of the [audio-streaming push/drain
loop](/concepts/audio-streaming).

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
and wraps `libessence` **ABI v7**. `BithumanInfo.libraryVersion` /
`BithumanInfo.abiVersion` report the linked engine version.

## App-layer: AvatarUIKit

For a drop-in avatar view, build on **AvatarUIKit** rather than wiring frames by
hand. It owns the renderer lifecycle and exposes SwiftUI/UIKit views; the
`expression/{mac,ipad,iphone}` sample apps are the reference integrations. When
hosting a renderer view, return the **same** renderer instance from both
`makeXxxView` and `updateXxxView` — SwiftUI rebuilds the parent many times per
second and the renderer must persist, or the avatar vanishes on re-render.

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

Gate this at runtime — under-spec devices should get a polite refusal screen, not
a half-loaded engine. Use `HardwareCheck.evaluate()` to branch your SwiftUI root
and show your own `UnsupportedDeviceView` for `.unsupported(reason)`.

| | Essence | Expression |
|---|---|---|
| **macOS** | M3+, macOS 26 | M3+, macOS 26 |
| **iPadOS** | iPad Pro M4+, iPadOS 26 | iPad Pro M4+, 16 GB, iPadOS 26 |
| **iPhone** | iPhone 16 Pro+ (A18 Pro) | iPhone 16 Pro+ (A18 Pro) — **preview**, on-device validation in progress |

iPhone Expression ships in the `expression/iphone` sample app (see the
[iOS example](/examples/swift-ios-hello)) but is still being validated on-device —
treat it as preview and prefer Essence for production iPhone builds today.
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

Return the **same** renderer view instance from both `makeXxxView` and
`updateXxxView`. SwiftUI rebuilds the parent constantly; a fresh renderer each
time means a vanishing avatar.

### Under-spec device shows a refusal screen

Working as intended. Branch on `HardwareCheck.evaluate()`.

## See also

- [SDK overview](/sdk) — which SDK to pick
- [LiveKit (Apple)](/sdk/livekit) — connect a native app to a cloud-hosted avatar
- [Models](/concepts/models) — Essence vs Expression
- [CLI](/cli) — no-code Mac terminal tool, same engine
