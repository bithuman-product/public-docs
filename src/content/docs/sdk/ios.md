---
title: "iOS & iPadOS SDK"
description: "A lip-synced Expression 2 avatar on the iPhone you already have — one SwiftPM package, a public showcase identity fetched with curl, no account, no API key and no credits for the first frame. The same package builds for macOS."
section: sdk
group: "Platforms"
order: 40
label: "iOS & iPadOS"
---

## Install

You need Xcode 26+, an Apple Developer team and a physical iPhone or iPad —
the Simulator cannot run this engine.

In Xcode, *File → Add Package Dependencies…* and paste the URL, or in
`Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")
// product: .product(name: "Expression2", package: "homebrew-bithuman")
```

`from:` is a floor — it resolves the newest 2.x tag. The `Expression2` product
is the [Expression 2](/concepts/expression-2) engine as a pre-compiled
xcframework (`ios-arm64`, `macos-arm64`) with no transitive packages.
The `Essence2` product is the [Essence 2](/concepts/essence-2) engine, also a pre-compiled xcframework (`ios-arm64`, `ios-arm64-simulator`, `macos-arm64`). Since **2.13.2** it opens the `.imx` you download for your own agent, on both iPhone and Mac — the measured iPhone 15 rate is on the [performance page](/sdk/performance). The newest package tag, **2.13.8**, ships Essence 2 engine **1.9.0** and Expression 2 engine **2.6.3**, and `from:` resolves it for you. You still fetch the file yourself; there is no in-app download route.

## Authentication and configuration

The showcase identity on this page needs nothing — no account, no key, no
credits. Your own agent does: the Swift SDK reads `BITHUMAN_API_KEY` from the
app's environment, the same value the other SDKs read as
`BITHUMAN_API_SECRET`, and a metered render refuses without it. Keys are free
at [your API keys](https://www.bithuman.ai/developer/api-keys).

## Get a model

Three anonymous downloads — the identity, the shared engine graphs it does not
carry, and something for it to say. No account, no key, no credits:

```bash
# 1. the identity, through the download door (1-hour signed URL, no credential)
curl -fL -o A23WJF0199.avatar "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"

# 2. the shared engine, from the public channel `bithuman engine install` reads — the `mac` engine is right for an iPhone app:
#    its graphs are CoreML packages compiled on the device at first launch, and it is named for the machine that downloads it
curl -fLO "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/engines/expression-2/mac-arm64-1.0.0.engine"

# 3. 16 kHz mono speech — the identity's own bundle carries one
curl -fL -o speech16k.wav "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2&member=demo_speech_16k.wav"
```

`A23WJF0199` is **Wise Pup**, a bitHuman-owned identity in the free gallery; any
code `bithuman list` prints works the same way, and so does your own agent once
you add `-H "api-secret: $BITHUMAN_API_KEY"`. The identity comes through the
same download door either way — it answers a 1-hour signed URL and needs no
credential for a gallery identity. The **engine** is different: it is one shared
artifact per platform, not per-identity, and it is published on the public
channel that `bithuman engine install` reads, sha-pinned. The `setup.sh` on
[the example page](/examples/swift-ios-expression2) fetches these, unpacks the
container and stages the engine directory for you. Your own agent's `.avatar`
comes from [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
with your key.

## Minimal code

```swift
import Expression2

// modelPath is the unpacked .avatar
let engine = try Expression2Engine.create(modelPath: avatarDirectory,
                                          sharedEngineDir: sharedEngineDirectory)
engine.feed(samples)   // [Float] PCM, 16 kHz mono
engine.flushTail()     // at the end of an utterance

// Generation is asynchronous: pull() returns nil until a chunk lands, so poll.
// 100 x 50 ms with nothing = done.
var idleTicks = 0
while idleTicks < 100 {
    var got = false
    // frame: [UInt8], BGR, engine.width * engine.height * 3
    while let (frame, _) = engine.pull() {
        got = true
        show(frame)
    }
    if got { idleTicks = 0 } else {
        idleTicks += 1
        try await Task.sleep(nanoseconds: 50_000_000)
    }
}
```

Every file of a working app — `Info.plist`, the Xcode settings, the whole of
`App.swift`, the unpack script — is printed on
[Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2).

## Run

In Xcode: *Signing & Capabilities* → your team → select your iPhone → **Run**.
Automatic signing creates a development profile for a paired, trusted phone
the first time. `Info.plist` needs `NSMicrophoneUsageDescription` to hear the
user. The showcase identity above renders without a key; a render of your own
agent is metered — [pricing](/guides/pricing) is the authority.

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| duplicate symbols at the device link, while a Simulator build is green | `Expression2` and `Essence2` in one target | take one of them |
| the app runs, no error, no avatar; `pull()` keeps returning `nil` | you drained synchronously on the line after `feed()` — frames arrive asynchronously | poll as in the snippet above |
| `product 'Expression' … not found in package 'homebrew-bithuman'` | an older product name; `swift package resolve` does not check product names, `swift build` does | name the product `Expression2` |
| building from the command line: a *Xcode managed … manually managed profile* error, or `0xe800801c (No code signature found.)` at install | signing needs an automatic profile and a keychain with your identity — over SSH the keychain has none | from a logged-in GUI session run `CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=<team> xcodebuild … -allowProvisioningUpdates` |
| mic or speech start fails silently | missing `Info.plist` privacy strings; the OS caches the denial | add `NSMicrophoneUsageDescription` |
| you are looking for `essence-1` and cannot find a product for it | there is no standalone Essence product for the first-generation model in the Swift package — it exposes `bitHumanKit`, `BithumanEngineProtocol`, `Expression2` and `Essence2`, so an iOS or macOS app cannot import `essence-1` directly | on a Mac, render it with the [CLI](/sdk/cli) or the [Python SDK](/sdk/python); in an app, serve it from the [cloud API](/api/overview). The model itself is described on [essence-1](/concepts/essence-1) |
| avatar disappears on re-render | a fresh renderer view on every SwiftUI update | return the same instance from `makeUIView` and `updateUIView` |
| `404 NOT_FOUND` from `/v1/agent/<CODE>/model/download` | not an agent on your account, and not public | check the code under [your agents](/api/agents) or on the [showcase](/showcase) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no Expression 2 model yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll |
| `MODEL_ARTIFACT_NOT_READY` from the download | trained, not yet published to the download store | poll the same URL; it clears on its own |
| `Essence2` refuses the file you downloaded: *need a directory with meta.json {"format":"elevatedir-v*" \| "essence2-light-dir-v*"}* | a package older than **2.13.2**, whose `Essence2` product opened an unpacked bundle directory rather than the single `.imx` the download endpoint serves (the quoted format names are legacy names kept for compatibility) | pin **2.13.2** or newer — from there the `Essence2` product opens that `.imx` as served |
| a metered render refuses | `BITHUMAN_API_KEY` unset in the app's environment | set it — the Swift SDK reads that name (same value as `BITHUMAN_API_SECRET`) |

## Examples and source

- [iOS app, end to end](/examples/swift-ios-expression2) — the whole project
  printed on one page, and [`swift/ios-expression2`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-expression2)
  to clone, with a `setup.sh` that fetches the model.
- [`swift/ios-avatar`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-avatar) — a complete SwiftUI reference app.
- [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — voice only, on device, no key.
- [Homebrew tap](https://github.com/bithuman-product/homebrew-bithuman) — the Swift package itself.

## See also

- [LiveKit](/sdk/livekit) — subscribing to a server-hosted avatar from a native
  app, when the render is not on the device
- [CLI](/sdk/cli) — the same engines on an Apple Silicon Mac, with no Xcode
- [Performance](/sdk/performance) — measured frame rates for every platform
- [SDK](/sdk) — every platform on one page
