---
title: "iOS & iPadOS"
description: "A lip-synced Expression 2 avatar on the iPhone you already have — one SwiftPM package, a public showcase identity fetched with curl, no account, no API key and no credits for the first frame. The same package builds for macOS."
section: sdk
group: "Platforms"
order: 40
label: "iOS & iPadOS"
---

## Install

In Xcode, *File → Add Package Dependencies…* and paste the URL, or in
`Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")
// product: .product(name: "Expression2", package: "homebrew-bithuman")
```

`from:` is a floor — it resolves the newest 2.x tag, and a higher number in
your `Package.resolved` is not a problem. The package wraps pre-compiled
xcframeworks with every dependency statically linked: zero transitive Swift
packages. What you need from Apple: **Xcode 26+**, an **Apple Developer team**,
and a **physical iPhone or iPad** — the Simulator cannot run this engine.

| Product | What it is |
|---|---|
| **`Expression2`** | the [Expression 2](/concepts/expression-2) engine alone — `ios-arm64`, `macos-arm64`, `ios-arm64-simulator` (builds only). **This page.** |
| `bitHumanKit` | the umbrella: an on-device voice agent (speech recognition, language model, text-to-speech) with an optional avatar. iPhone 16 Pro / M3 Mac or later, two Apple entitlements that take 1–3 business days |
| `Essence2` | the [Essence 2](/concepts/essence-2) engine's C interface — builds, and renders on no iPhone today (no published per-identity bundle; floor iPhone 16 Pro / A18 Pro) |

Do not take `Expression2` and `Essence2` in the same app: they collide at your
app's final device link (116 duplicate symbols) while a Simulator build stays
green.

## Get a model

Three anonymous `curl`s — the identity, the shared engine graphs it does not
carry, and something for it to say. No account, no key, no credits:

```bash
PUB=https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web
curl -fLo agent.avatar     "$PUB/showcase/A08CCD3871.avatar"
curl -fLo mac-arm64.engine "$PUB/engines/expression-2/mac-arm64-1.0.0.engine"
curl -fLo speech16k.wav "https://api.bithuman.ai/v1/agent/A08CCD3871/model/download?member=demo_speech_16k.wav&model=expression-2"
```

`A08CCD3871` is a bitHuman-owned public showcase identity; any code on the
[showcase](/showcase) works the same way. The `setup.sh` on the example page
runs these, unpacks the container and stages the engine directory for you.
Your own agent's `.avatar` comes from
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
with your key.

## Minimal code

```swift
import Expression2

let engine = try Expression2Engine.create(modelPath: avatarDirectory,        // the unpacked .avatar
                                          sharedEngineDir: sharedEngineDirectory)
engine.feed(samples)                       // [Float] PCM, 16 kHz mono
engine.flushTail()                         // at the end of an utterance

// Generation is ASYNCHRONOUS: pull() returns nil until a chunk lands. A bare
// `while let` on the line after feed() drains nothing and your view stays empty. Poll.
var idleTicks = 0
while idleTicks < 100 {                    // 100 x 50 ms with nothing = done
    var got = false
    while let (frame, _) = engine.pull() { // frame: [UInt8], BGR, engine.width * engine.height * 3
        got = true
        show(frame)
    }
    if got { idleTicks = 0 } else { idleTicks += 1; try await Task.sleep(nanoseconds: 50_000_000) }
}
```

Every file of a working app — `Info.plist`, the Xcode settings, the whole of
`App.swift`, the unpack script and the `xcodebuild` line — is printed on
[Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2).

## Run

Signing & Capabilities → your team → select your iPhone → **Run**. Automatic
signing creates a development profile for a paired, trusted phone the first
time. From the command line the working shape is `CODE_SIGN_STYLE=Automatic
DEVELOPMENT_TEAM=<team> xcodebuild … -allowProvisioningUpdates`, run from a
logged-in GUI session (over SSH the keychain reports 0 signing identities and
the install fails with `0xe800801c`). `Info.plist` needs
`NSMicrophoneUsageDescription` to hear the user. Neither `Expression2` nor
`Essence2` needs the increased-memory entitlements — those belong to
`bitHumanKit`.

Only a **metered render with your own key** needs `BITHUMAN_API_KEY` (the
Swift SDK's spelling of `BITHUMAN_API_SECRET` — same value); the showcase
identity above renders without one. A self-hosted session is metered —
[pricing](/guides/pricing) is the authority.

## Performance

Measured 2026-09-09 on an **iPhone 15** (iPhone15,4, iOS 26.6.1), Xcode 26.3,
through the published `Expression2` product, unpaced (frames produced as fast
as the engine can, 100 % talk duty, one process):

| Device | Model | fps (unpaced) | Notes |
|---|---|---:|---|
| iPhone 15 (A16) | Expression 2, `Expression2` 2.11.x | **106.6** | 36,021 frames — 1,801.6 s of speech in 338.0 s; worst 10 s window 99.9 fps; first frame 263 ms after `feed()`; CoreML placed the work on the Neural Engine |
| Apple Silicon Mac | Expression 2, same package (`macos-arm64`) | see [macOS](/sdk/macos#performance) | the CLI's CoreML figure on the same engine |
| iPhone 16 Pro / M3 Mac or later | Essence 2, `Essence2` | none published | builds; no per-identity bundle to open on a phone today |

The model plays at 20 fps. `Expression2` carries no device floor — it has
rendered on an iPhone 15, two generations below the `Essence2` / `bitHumanKit`
floor (iPhone 16 Pro or later, A18 Pro; a standard A18 is refused).

Every platform side by side: [Performance](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the app runs, no error, no avatar; `pull()` keeps returning `nil` | you drained synchronously on the line after `feed()` — frames arrive asynchronously | poll as in the snippet above |
| `product 'Expression' … not found in package 'homebrew-bithuman'` | the older products are not published; `swift package resolve` does not check product names, `swift build` does | name `Expression2`, `bitHumanKit` or `Essence2` |
| 116 duplicate symbols at the device link, Simulator green | `Expression2` and `Essence2` in one app | take one of them |
| `Provisioning profile "…" is Xcode managed, but signing settings require a manually managed profile` | a `PROVISIONING_PROFILE_SPECIFIER` on an automatic profile | `CODE_SIGN_STYLE=Automatic` + `DEVELOPMENT_TEAM` + `-allowProvisioningUpdates` |
| `0xe800801c (No code signature found.)` at install | built over SSH — the session's keychain has no signing identity | build from a logged-in GUI session |
| `unsupported hardware — iPhone15,4 detected … requires iPhone 16 Pro or later` | the `Essence2` / `bitHumanKit` floor, checked at warm-up; there is no override | `Expression2` on that phone, or an A18 Pro / M-series device |
| mic or speech start fails silently | missing `Info.plist` privacy strings; the OS caches the denial | add `NSMicrophoneUsageDescription` (and `NSSpeechRecognitionUsageDescription` for `bitHumanKit`) |
| app killed ~30 s into a conversation | `bitHumanKit` without the increased-memory entitlements | request `com.apple.developer.kernel.increased-memory-limit` and `extended-virtual-addressing` — Apple takes 1–3 business days |
| avatar disappears on re-render | a fresh renderer view on every SwiftUI update | return the same instance from `makeUIView` and `updateUIView` |
| `404 NOT_FOUND` from `/v1/agent/<CODE>/model/download` | not an agent on your account, and not public | check the code under [your agents](/api/agents) or on the [showcase](/showcase) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no Expression 2 model yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll |
| `MODEL_ARTIFACT_NOT_READY` from the download | trained, not yet published to the download store | poll the same URL; it clears on its own |
| `Essence2` refuses the file you downloaded: *need a directory with meta.json {"format":"elevatedir-v*" \| "essence2-light-dir-v*"}* | the Essence 2 engine opens an unpacked bundle directory, not the single `.imx` the download door serves — and no such bundle is published for a phone today | use `Expression2` for an on-device avatar; Essence 2 renders through the [cloud API](/api/overview) |
| a metered render refuses | `BITHUMAN_API_KEY` unset in the app's environment | set it — the Swift SDK reads that name, not `BITHUMAN_API_SECRET` |

## See also

- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) — the whole app
- [Apple — check before you ship](/examples/apple-swiftpm-check) — resolve the tag and verify every binary target from any machine
- [macOS](/sdk/macos) — the same package on a Mac, and the CLI
- [LiveKit](/sdk/livekit) — a voice agent with a face, from Swift
- [SDK](/sdk) — every platform on one table
