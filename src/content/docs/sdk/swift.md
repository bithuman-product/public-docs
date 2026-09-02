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
  animator → face decoder, through CoreML on Apple Silicon). Home of `VoiceChat` /
  `VoiceChatConfig` / `AvatarConfig`.
- **Essence** — an `.imx` avatar runtime that renders a pre-built avatar (audio
  in, composed BGR frames out). Reached via `Bithuman.create(modelPath:)`.
  (This page used to call it "the portable `libessence` C++ runtime". It is not:
  the published `bitHumanKit.xcframework` binary is a static archive of 28
  objects — `bitHumanKit.o`, MLX, HuggingFace, Tokenizers, Crypto, yyjson — and
  `libessence` is not among them.)

Audio in (16 kHz mono PCM), `CGImage` / BGR frames out at 25 FPS. All inference
runs **on-device**; a once-per-minute billing heartbeat meters avatar mode
(audio-only is unmetered).

> **Maturity** This rail is **preview**, not GA. The package vends three
> products: **`bitHumanKit`** (`import bitHumanKit`), the binary umbrella;
> **`Expression2`** (`import Expression2`), the second-generation avatar engine,
> new in **v2.5.0**; and `BithumanEngineProtocol`, a source-only Layer-0 engine
> interface. The older standalone Layer-1 products (`Expression`, `Bithuman`) are
> **not** published — naming one fails at resolve time with
> `product 'Expression' ... not found in package 'homebrew-bithuman'`.

> **Which second-generation engines are on this rail.**
> [`expression-2`](/concepts/expression-2) **is**, as of **v2.5.0** — see
> [Expression 2 on-device](#expression-2-on-device) below, including what that
> release does and does not include.
> [`essence-2`](/concepts/essence-2) **is not**: it is not a SwiftPM product and
> it is not bundled inside `bitHumanKit`. That is measured against the shipped
> binary, not assumed — `bitHumanKit.xcframework` @ `v2.4.0` contains zero
> occurrences of the string `essence` and its public interface declares no
> Essence 2 type. [`essence-2-max`](/concepts/essence-2-max) is cloud-only by
> design. To reach Essence 2 from an Apple app today, call the
> [REST API](/api/overview) or join a [LiveKit](/sdk/livekit) session.

## Install

In Xcode: **File → Add Package Dependencies…** → paste the package URL:

```
https://github.com/bithuman-product/homebrew-bithuman.git
```

Pick **2.5.0** ("Up to Next Major Version" from 2.5.0) and attach the product
you want — **`bitHumanKit`** for the umbrella, **`Expression2`** for the
second-generation engine alone. Or in `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git",
         from: "2.5.0")
```

> **One package, two release tags — by design.** `2.5.0` is the version you pin;
> it is the manifest that declares every product. The umbrella's binary still
> downloads from the **`v2.4.0`** release and the Expression 2 binaries from
> **`v2.5.0`**, because a single shared tag would have re-pointed
> `bitHumanKit.xcframework.zip` at a release that does not carry it — a hard 404
> for every existing consumer. SwiftPM reads absolute asset URLs out of the
> manifest it resolves, so the assets do not have to live on the resolved tag.

> **Do not pin `0.8.x` here.** This repo has no `0.8.2` tag, and no `v0.x` tag
> carries a `Package.swift` — those tags hold Homebrew formula files. Resolving
> `from: "0.8.1"` fails with
> `error: the package manifest at '/Package.swift' cannot be accessed`. The
> `0.8.x` numbers belong to the retired `bithuman-sdk-public` repo, archived when
> the SwiftPM distribution moved here.

The package wraps a pre-compiled `bitHumanKit.xcframework`; every third-party
dependency (MLX, HuggingFace, Tokenizers, …) is statically linked, so consumers
have **zero transitive Swift Package dependencies**. Just `import bitHumanKit`.

Auth: export `BITHUMAN_API_KEY` or set `VoiceChatConfig.apiKey` before
starting avatar mode. Get a key at
[Developer → API Keys](https://www.bithuman.ai/developer/api-keys). Audio-only voice
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
drive the runtime directly — push PCM in, drain frames out:

```swift
import bitHumanKit
import CoreGraphics

let result = try Bithuman.create(modelPath: modelURL)
let runtime = result.bithuman        // result.staticIdleImage is the rest pose
try await runtime.start()

// Push audio as it arrives — 24 kHz for playback, 16 kHz for the encoder.
try await runtime.pushAudio(audio24k: samples24, audio16k: samples16)

// Drain rendered chunks; each carries its frames and the audio they pair with.
while let chunk = runtime.tryDequeueChunk() {
    let frames: [CGImage] = chunk.frames   // 25 FPS
    // hand the frames to your view layer
}

await runtime.interrupt()            // at end-of-utterance
await runtime.shutdown()
```

This is the Apple expression of the [audio-streaming push/drain
loop](/concepts/audio-streaming). The entry point is `Bithuman.create` — there
is no `createRuntime` on the published module. Verified to compile against
`bitHumanKit` 2.4.0 with Xcode 26.5.

## Expression 2 on-device

**New in v2.5.0.** [`expression-2`](/concepts/expression-2) is now a SwiftPM
product of its own — the first second-generation engine on this rail. It is a
pure Swift + CoreML talking head; Apple Silicon only, `macos-arm64`,
`ios-arm64`, `ios-arm64-simulator`.

**The `ios-arm64` slice is real, and it has rendered on an iPhone.** This page
used to describe only macOS, which read as if iOS were a build target nobody
had exercised. It has been: a consumer app declaring `Expression2` as a SwiftPM
binary target, using only the public API, selected the `ios-arm64` slice and
rendered **117 frames at 416×720 on an iPhone 15 running iOS 26.6.1** — every
frame distinct, full 256-level picture, with a forced-black control arm going
red beside it. The same engine on the same phone then sustained **36,021 frames
— 1,801.6 s of speech in 338.01 s of wall clock, 106.57 fps (RTF 0.19)** at
100 % talk duty in one process, with the worst ten-second bucket of that run
still at 99.90 fps. CoreML's own per-operation compute plan for that run
placed the work on the **Neural Engine** and none of it on the GPU — and for
the per-identity decoder the GPU was *eligible* and CoreML chose the Neural
Engine anyway.

**What that does and does not buy you.** It establishes that the engine runs on
iOS silicon and is fast there. It is deliberately **not** a support statement:
the SDK's own iOS support level is still **compiles-only** and has not been
promoted, those runs used development provisioning rather than a distribution
profile, and — the part that actually blocks you — **there is still no
published per-identity model bundle**, so an app that resolves this product on
an iPhone gets the same `isReady=false` described below. Treat iOS as
proven-capable and unshipped, not as ready to build a product on.

```swift
.product(name: "Expression2", package: "homebrew-bithuman")
```

```swift
import Expression2

let engine = Expression2Engine()
engine.warmUp()
engine.feed(samples)                       // [Float] PCM
while let (frame, speech) = engine.pull() {
    // frame: [UInt8], the composed image; engine.width x engine.height
}
```

> **Read this before you plan around it — `Expression2` ships the engine, not a
> runnable avatar.** `Expression2Engine()` takes no model path. The engine looks
> for a per-identity CoreML bundle as a **directory of `.mlpackage` members** in
> `$BITHUMAN_EXPRESSION2_DIR` or in your app bundle, and **`isReady` stays
> `false` until it finds one**. No bundle in that form is published, so
> resolving this product does not by itself get you a rendering avatar. On a
> clean machine the engine constructs and reports `isReady=false` — that is the
> expected result today, not a misconfiguration.
>
> **How you get a bundle: ask us — there is no self-serve path.** No download
> page or CLI command hands you one in the layout this product reads, and it is
> not gated behind a plan you can buy. Email
> [hello@bithuman.ai](mailto:hello@bithuman.ai) with the identity you want.
>
> **What the download endpoint gives you instead, stated precisely.** For an
> `expression-2` agent,
> [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
> returns a `<code>.avatar`. That file is **not** empty of CoreML: measured on a
> downloaded one, it is an `IMX\0` v2 container whose members include
> `dec_p2_v3_all.mlpackage`, `audiotokenizer_cpuAndNE.mlpackage` and
> `student_v4_forward_frame_cpuAndNE.mlpackage` — and `dec_p2_v3_all` is exactly
> the member name the shipped `Expression2.xcframework` (macos-arm64, v2.5.0)
> carries in its strings. **What is missing is not the weights, it is a
> supported way to hand them to this product**: the engine reads a directory,
> the artifact is a packed container, and no unpacking route is published or
> supported. Do not build on prising one open — there is no contract behind it,
> and nothing about that file's layout is promised to stay put.
>
> **An `.imx` is definitely not the missing piece.** `bithuman pull <code>` on
> an Essence agent returns an `.imx` for the Essence runtime. `Expression2`
> cannot read one: measured against the same xcframework, `strings` finds
> **zero** occurrences of `imx`. Pointing `$BITHUMAN_EXPRESSION2_DIR` at an
> unpacked `.imx` will not start the engine.

> **Depend on `Expression2` alone.** Adding both `Expression2` and the
> `BithumanEngineProtocol` product pulls the Layer-0 module in twice and fails to
> link.

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
| **iPhone** | iPhone 16 Pro+ (A18 Pro) | iPhone 16 Pro+ (A18 Pro) — **preview**; on-device validation of *this* engine is in progress |

**This table grades the two `bitHumanKit` engines — Essence and Expression 1.
It is not Expression 2's floor.** The `Expression2` product is a separate
CoreML engine with its own characteristics; the iPhone measurement above was
taken on an **iPhone 15**, two generations below this table's iPhone row, so
do not read the Expression column as an Expression 2 requirement. Expression 2
has no published device floor yet, because it has no published model bundle to
gate one on.

Requires Xcode 26+ (older Xcodes reject the Swift 6 concurrency syntax).
Expression on Apple Silicon auto-spawns a `bithuman-expression-daemon`
subprocess; on unsupported hardware it raises `ExpressionModelNotSupported` — not
a crash. See [models](/concepts/models).

## Performance

Measured on an M5 MacBook Pro against the `libessence` engine (1.19.1, single
conversation). Treat them as indicative of the runtime, not as a measurement of
the shipped `bitHumanKit` binary, which does not contain `libessence`:

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

- [Runnable Swift examples](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/swift) — voice, avatar, and benchmark apps
- [SDK overview](/sdk) — which SDK to pick
- [LiveKit (Apple)](/sdk/livekit) — connect a native app to a cloud-hosted avatar
- [Models](/concepts/models) — Essence vs Expression
- [CLI](/sdk/cli/overview) — no-code Mac terminal tool, same engine
