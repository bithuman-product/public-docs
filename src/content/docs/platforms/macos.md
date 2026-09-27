---
title: "macOS"
description: "Render Essence 2 and Expression 2 on a Mac with Apple silicon, in a Mac app or from a terminal, with the same package as iPhone and iPad."
section: platforms
group: "Apps"
order: 20
type: platform
searchTitle: "macOS: Mac apps and terminal tools on Apple silicon"
renders: ["device"]
needs: ["Apple silicon", "API secret"]
artifacts: ["swift"]
platforms: ["macos"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S10", "S13", "S17", "S26", "S30"]
next: ["/examples/macos-expression-2", "/platforms/ios", "/platforms/cli"]
---

<div class="lead">
<div class="lead-text">

The same Swift package that runs on iPhone and iPad renders the avatar on a Mac with Apple silicon: in a Mac app, or in a command-line tool with `swift run`. No device, provisioning profile or entitlement is needed to try it from a terminal.

```why-on-device
macos
```

</div>

<figure class="showcase">
  <video controls preload="none" playsinline poster="/examples/macos/hero.webp" width="416" height="720" src="/examples/macos/clip.mp4"></video>
  <figcaption>The <a href="/examples/macos-expression-2">macOS Expression 2 example</a> on an Apple M4 iMac, Swift package 2.14.2, with the <code>wise-pup</code> sample avatar and the speech clip it rendered.</figcaption>
</figure>

</div>

## Before you start

| You need | Expression 2 | Essence 2 |
|---|---|---|
| **A Mac** | Apple silicon, macOS 13 or newer | Apple silicon M3 or newer, macOS 26 or newer |
| **Toolchain** | Xcode 26 or newer (to build) | the same |
| **Credential** | an [API secret](/start/api-secret) (Creator plan or higher) | the same |
| **Disk** | about 800 MB for the example: downloads plus the folder the engine unpacks them into | about 250 MB of downloads |

## Install

```partial
swift-install
```

## Authenticate

```partial
swift-auth
```

A Mac app built from Xcode's App template turns on App Sandbox. Under *Signing & Capabilities → App Sandbox*, tick **Outgoing Connections (Client)**, or the engines cannot check your secret.

## First frame

The [macOS Expression 2 example](/examples/macos-expression-2) is one Swift file. Clone it, fetch the sample avatar, and run it:

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/macos-expression2
./setup.sh                                 # the wise-pup avatar, the shared engine and a speech clip
export BITHUMAN_API_SECRET="<your API secret>"
swift run -c release MacOSExpression2
```

<details class="expected">
<summary>Expected result</summary>

```text
engine ready: 416x720, isReady=true
audio: 325451 samples, 20.34 s
generated 407 frames in … s -> out/first-frame.png
```

407 frames for 20.34 seconds of audio: one frame per 50 ms of speech. The first run prepares the engine for your Mac; keep `Model/staged/` and later runs start faster.

</details>

The core of `Sources/main.swift`:

```swift
// excerpt: swift/macos-expression2/Sources/main.swift
let engine = try Expression2Engine.create(
    avatarContainer: model.appendingPathComponent("agent.imx"),
    sharedEngineContainer: model.appendingPathComponent("shared-engine.imx"),
    stagingDir: model.appendingPathComponent("staged"))
engine.feed(samples)      // 16 kHz mono float, any length
engine.flushTail()        // end of the utterance
while let (frame, _) = engine.pull() { /* 416×720 BGR, 3 bytes per pixel */ }
```

## Complete example

[macOS Expression 2](/examples/macos-expression-2) walks through the tool above: requirements, your own avatar and audio, and troubleshooting. For a window with a microphone button, the [iOS Expression 2 example](/examples/ios-expression-2) is the same engine in a SwiftUI app.

## Integrate into your app

The Swift API is the same on the Mac as on iPhone and iPad: feed 16 kHz mono audio, take frames on your player's clock, end and interrupt replies. The whole table is on [iOS & iPadOS](/platforms/ios#integrate-into-your-app); every entry point is on the [Swift reference](/platforms/swift/reference).

On a Mac:

- **Files:** add the `.imx` files and engine resources to the app bundle. A sandboxed app reads only its bundle and container.
- **Quitting:** call `Essence2Engine.quiesceAll()` from `applicationWillTerminate`.

## Platform notes

- **Also on a Mac:** the [CLI](/platforms/cli) renders an avatar or runs a live conversation with no code, and [Python](/platforms/python) renders frames from your own scripts. Both run on Apple silicon.
- **Intel Macs** are not supported.

## Performance

```perf
macos-sdk macos-m4 python-macos
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `refusing to serve: no API secret was found` | no secret in this shell or scheme | `export BITHUMAN_API_SECRET=…`, or set it in the scheme |
| *cannot reach bitHuman to verify your credential* in a Mac app | App Sandbox blocks outgoing connections | tick **Outgoing Connections (Client)** under App Sandbox |
| `create` throws before `engine ready` | the model files are missing | run `./setup.sh` from the example folder, so `Model/` holds the three files |
| The link step prints about ten `unable to open object file` warnings naming a folder on another machine | debug paths recorded in the published binary | harmless; the tool runs |
| The first run is slow | the engine is prepared for this Mac once | keep `Model/staged/` between runs |

## Reference

- [Swift reference](/platforms/swift/reference): every Swift and C entry point.
- [macOS Expression 2 example](/examples/macos-expression-2) and its [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-expression2).
- [Changelog](/changelog) and [Downloads & versions](/downloads).
