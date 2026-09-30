---
title: "macOS"
description: "Render Essence 2 and Expression 2 on a Mac with Apple silicon."
section: platforms
group: "Swift"
order: 20
type: platform
llms: apps
searchTitle: "macOS: Mac apps and terminal tools on Apple silicon"
renders: ["device"]
needs: ["Apple silicon", "API secret"]
artifacts: ["swift"]
platforms: ["macos"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S10", "S13", "S17", "S26", "S30"]
next: ["/platforms/swift/app", "/platforms/swift/troubleshooting", "/platforms/swift/reference"]
moved:
  integrate-into-your-app: /platforms/swift/app#integrate-into-your-app
  complete-example: /platforms/swift/app#complete-example
  platform-notes: /platforms/swift/app#platform-notes
  troubleshooting: /platforms/swift/troubleshooting#macos
  reference: /platforms/swift/reference
---

The iPhone and iPad Swift package, in a Mac app or from a terminal with `swift run`.

## Before you start

No device, provisioning profile or entitlement is needed to try it from a terminal.

[Why render on the device](/deploy/on-device).

| You need | Expression 2 | Essence 2 |
|---|---|---|
| **A Mac** | Apple silicon, macOS 13 or newer | Apple silicon M3 or newer, macOS 26 or newer |
| **Toolchain** | Xcode 26 or newer (to build; Xcode 26 needs macOS 15.6 or newer) | the same |
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

The link step prints `ld: warning: … libengine_core.a(engine_core.o) was built for newer 'macOS' version (14.0) than being linked (13.0)`. The build still succeeds; running an Expression 2 tool on macOS 13 is not verified.

</details>

The core of `Sources/main.swift`:

```swift
// excerpt: swift/macos-expression2/Sources/main.swift
let engine = try Expression2Engine.create(
    avatarContainer: model.appendingPathComponent("agent.imx"),
    sharedEngineContainer: model.appendingPathComponent("shared-engine.imx"),
    stagingDir: model.appendingPathComponent("staged"))
// …
let started = Date()
engine.feed(samples)
engine.flushTail()
// …
var frames = 0, idleTicks = 0
while idleTicks < 100 {
    var got = false
    while let (frame, _) = engine.pull() {
        if frames == 0 {
            writePNG(frame, width: engine.width, height: engine.height,
                     to: out.appendingPathComponent("first-frame.png"))
        }
        frames += 1
        got = true
    }
    if got { idleTicks = 0 } else { idleTicks += 1; usleep(50_000) }
}
```

### Essence 2 on a Mac

Essence 2 needs an M3 or newer Mac on macOS 26. The same `Essence2Kit` calls as on the iPhone render a file from a terminal tool: download the avatar in code, set `pacing = .unpaced`, and take the frames as fast as they render.

```swift
// excerpt: a terminal tool (swift run) with the Essence2Kit product;
// samples is a 16 kHz mono clip as [Float].
import Essence2Kit

Essence2Credential.set(ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"] ?? "")
let imxURL = try await Essence2Download.identity(agentCode: "A52DHS2219")   // sofia-ramirez
let engine = try await Essence2Engine.create(identity: imxURL)            // waits until the engine is ready
engine.pacing = .unpaced                     // a file render: frames as fast as they render

engine.feed(samples)                         // [Float], 16 kHz mono
engine.flushTail()                           // that is the whole reply
var speech = 0
for await frame in engine.frames() {
    if frame.isSpeech { speech += 1 }        // frame.bgr: B, G, R bytes, width * height * 3
    if frame.endsReply { break }             // the reply is over; idle frames follow
}
print("\(engine.width)x\(engine.height): \(speech) frames for \(Double(samples.count) / 16_000) s of audio")
engine.shutdown()
```

<details class="expected">
<summary>Expected result</summary>

With the [15-second sample clip](/samples/speech-16k.wav):

```text
1080x1920: 375 frames for 14.997375 s of audio
```

25 frames a second at the avatar's own size. The first `create` downloads the avatar and the engine's runtime files, then keeps them in Caches and Application Support. The engine also prints its own diagnostic lines on stderr.

</details>

<div class="fig-end">

```figure
macos-expression-2
```

</div>

## Performance

```perf
macos-sdk macos-m4 python-macos
```
