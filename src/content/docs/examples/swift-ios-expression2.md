---
title: "iOS example: Expression 2"
description: "A complete SwiftUI app that renders a talking Expression 2 avatar on an iPhone or iPad, on the device: clone it, fetch the avatar, set your API secret, run."
section: examples
group: "Examples"
order: 30
type: example
label: "iOS: Expression 2"
---

<figure class="showcase">
  <img src="/examples/ios/hero.webp" alt="The wise-pup avatar mid-sentence, as drawn by the example app on an iPhone 15" width="416" height="720">
  <figcaption>A frame the <code>ios-expression2</code> app drew on an iPhone 15 (iOS 26), rendering the <code>wise-pup</code> sample avatar on the phone with Swift package 2.14.2.</figcaption>
</figure>

A SwiftUI app: **Speak** plays a speech clip through the avatar, and **Talk to it** drives the avatar from the microphone, live. Everything renders on the device at 416×720, 20 fps; rendered on the device; the engine contacts bitHuman only to check your API secret and report session time.

## Requirements

| You need | Notes |
|---|---|
| A Mac with Xcode 26 or newer, and an Apple Developer team | a device build is a signed build |
| A physical iPhone or iPad with Apple silicon | the Simulator cannot run the engine; no Apple entitlement is needed |
| The bitHuman CLI | `setup.sh` uses it once: `brew install bithuman-product/bithuman/bithuman-cli` |
| An [API secret](/start/api-secret) | the engine bills session time, talking or idle |

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-expression2
./setup.sh
```

`setup.sh` puts the `wise-pup` avatar, the shared engine files and a speech clip in `Sources/Model/` (git-ignored). For your own avatar run `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.

## Set your API secret

In Xcode: **Product → Scheme → Edit Scheme → Run → Environment Variables**, add `BITHUMAN_API_SECRET`. The engine reads it at `create`.

## Run it

```bash
open IOSExpression2.xcodeproj
```

Pick your team under **Signing & Capabilities**, choose your iPhone as the run destination, and press **Run**.

## Expected output

The avatar appears and idles. Tap **Speak**: it says the sample line with its lips in sync. Xcode's console prints `engine ready`, then the frames generated for the clip, and writes the first frame to the app's `Documents/first-frame.png`. The first launch prepares the engine on the device and takes a few seconds longer than later launches.

## How it works

`Sources/App.swift` is the whole app. Its `Renderer` actor wraps `Expression2Engine` from the Swift package's `Expression2` product:

1. `Expression2Engine.create(modelPath:sharedEngineDir:)` opens the avatar;
2. `feed(samples)` takes 16 kHz mono float audio as it arrives, and `flushTail()` ends a reply;
3. `pull()` returns the next frame, or `nil` until a chunk of frames is ready, so the app feeds and drains at the same time;
4. a display loop shows one frame per 50 ms of audio, on the audio clock.

The same three calls run on a Mac: [macOS example](/examples/macos-expression2). The API is on [Apple](/sdk/apple) and [Apple API reference](/sdk/apple-api).

## Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents), then `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.
- **Your own voice pipeline:** feed the audio your text-to-speech produces into `feed`, in chunks, as it arrives.
- **Ship it:** don't put the secret in the app bundle. Fetch it from your backend or the Keychain and call `Expression2Credential.set(key)` before `create`.
- **A photoreal person:** the [iOS Essence 2 example](/examples/swift-ios-essence2) renders an Essence 2 avatar at full resolution.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `refusing to serve: no API secret was found` | add `BITHUMAN_API_SECRET` to the scheme's environment variables |
| `missing w2v_frontend_cpuAndNE.mlpackage` | run `./setup.sh` again; it stages the shared engine files |
| `the bithuman CLI is not on PATH` from `setup.sh` | `brew install bithuman-product/bithuman/bithuman-cli`, then rerun |
| The view stays empty and nothing throws | keep polling `pull()` while you feed; it returns `nil` between chunks |
| It builds for the Simulator and crashes there | run on a physical device |

More on [Apple: Troubleshooting](/sdk/apple#troubleshooting).

## Next

- [macOS example](/examples/macos-expression2) · [Apple SDK](/sdk/apple) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-expression2)
