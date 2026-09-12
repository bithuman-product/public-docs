---
title: "iOS & iPadOS"
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

## Get a model

Three anonymous downloads — the identity, the shared engine graphs it does not
carry, and something for it to say. No account, no key, no credits:

```bash
curl -fLO "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/{showcase/A08CCD3871.avatar,engines/expression-2/mac-arm64-1.0.0.engine}"
curl -fLo speech16k.wav "https://api.bithuman.ai/v1/agent/A08CCD3871/model/download?member=demo_speech_16k.wav&model=expression-2"
```

`A08CCD3871` is a bitHuman-owned public showcase identity; any code on the
[showcase](/showcase) works the same way. The `setup.sh` on
[the example page](/examples/swift-ios-expression2) fetches these, unpacks the
container and stages the engine directory for you. Your own agent's `.avatar`
comes from [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
with your key.

## Minimal code

```swift
import Expression2

let engine = try Expression2Engine.create(modelPath: avatarDirectory,        // the unpacked .avatar
                                          sharedEngineDir: sharedEngineDirectory)
engine.feed(samples)                       // [Float] PCM, 16 kHz mono
engine.flushTail()                         // at the end of an utterance

// Generation is asynchronous: pull() returns nil until a chunk lands, so poll.
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
| avatar disappears on re-render | a fresh renderer view on every SwiftUI update | return the same instance from `makeUIView` and `updateUIView` |
| `404 NOT_FOUND` from `/v1/agent/<CODE>/model/download` | not an agent on your account, and not public | check the code under [your agents](/api/agents) or on the [showcase](/showcase) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no Expression 2 model yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll |
| `MODEL_ARTIFACT_NOT_READY` from the download | trained, not yet published to the download store | poll the same URL; it clears on its own |
| `Essence2` refuses the file you downloaded: *need a directory with meta.json {"format":"elevatedir-v*" \| "essence2-light-dir-v*"}* | the package's `Essence2` product opens an unpacked bundle directory, not the single `.imx` the download endpoint serves; no such bundle is published for a phone (the quoted format names are legacy names kept for compatibility) | use `Expression2` on the phone; Essence 2 renders through the [cloud API](/api/overview) |
| a metered render refuses | `BITHUMAN_API_KEY` unset in the app's environment | set it — the Swift SDK reads that name (same value as `BITHUMAN_API_SECRET`) |
