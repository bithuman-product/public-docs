---
title: "iOS Expression 2"
description: "A complete SwiftUI app with a talking Expression 2 avatar on iPhone or iPad."
section: build
group: "Examples"
order: 20
type: example
llms: linked
parent: /examples
---

```figure
ios-expression-2 eager
```

A SwiftUI app: **Speak** plays a speech clip through the avatar, and **Talk to it** drives the avatar from the microphone, live. Everything renders on the device; the engine contacts bitHuman only to check your API secret and report session time.

## Requirements

| You need | Notes |
|---|---|
| A Mac with Xcode 26 or newer, and an Apple Developer team | a device build is a signed build |
| A physical iPhone or iPad with Apple silicon, or the iOS Simulator | Expression 2 also runs in the Simulator (arm64); judge speed on a device. No Apple entitlement is needed |
| Nothing else to install | `setup.sh` is three `curl` downloads, the same ones [iOS: First frame](/platforms/ios#first-frame) uses |
| An [API secret](/start/api-secret) | the engine bills session time, talking or idle |

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-expression2
./setup.sh
```

`setup.sh` downloads the `wise-pup` avatar (`agent.imx`), the shared engine (`shared-engine.imx`) and a 16 kHz speech clip into `Sources/Model/` (git-ignored). The download is anonymous. If a step fails, it names the step and prints the server's answer. For your own avatar run `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.

## Set your API secret

In Xcode: **Product → Scheme → Edit Scheme → Run → Environment Variables**, add `BITHUMAN_API_SECRET`. The engine reads it at `create`.

## Run it

```bash
open IOSExpression2.xcodeproj
```

Pick your team under **Signing & Capabilities**, choose your iPhone or an iPhone simulator as the run destination, and press **Run**.

## Expected output

The avatar appears and idles. Tap **Speak**: it says the sample line with its lips in sync. Xcode's console prints `engine ready`, then the frames generated for the clip, and writes the first frame to the app's `Documents/first-frame.png`. The first launch prepares the engine on the device and takes a few seconds longer than later launches.

## How it works

`Sources/App.swift` is the whole app. Its `Renderer` actor wraps `Expression2Engine` from the Swift package's `Expression2` product:

1. `Expression2Engine.create(avatarContainer:sharedEngineContainer:stagingDir:)` opens the two downloads as they are;
2. `feed(samples)` takes 16 kHz mono float audio as it arrives, and `flushTail()` ends a reply;
3. `pull()` returns the next frame, or `nil` until a chunk of frames is ready, so the app feeds and drains at the same time;
4. a display loop shows each frame when the player reaches its audio, on the audio clock.

The same three calls run on a Mac: [macOS example](/examples/macos-expression-2). The API is on [Apple](/platforms/ios) and [Apple API reference](/platforms/swift/reference).

## The code that matters

`Sources/App.swift` keeps the engine in an actor, then feeds the speech in 100 ms chunks and takes frames out as they appear:

```swift
// excerpt: swift/ios-expression2/Sources/App.swift
actor Renderer {
    private var engine: Expression2Engine?
        // …
        let e = try Expression2Engine.create(avatarContainer: avatar,
                                             sharedEngineContainer: sharedEngine,
                                             stagingDir: staging)
        engine = e
    // …
    func idleFrame() -> [UInt8]? { engine?.idle }
    func feed(_ samples: [Float]) { engine?.feed(samples) }
    func flushTail() { engine?.flushTail() }
    func reset() { engine?.resetState(clearFrames: true) }
    // …
    func pullOne() -> [UInt8]? { engine?.pull()?.frame }
    func queued() -> Int { engine?.queuedFrames ?? 0 }
}
```

```swift
// excerpt: swift/ios-expression2/Sources/App.swift
var i = 0
while i < pcm.count {
    let j = min(i + chunk, pcm.count)
    await renderer.feed(Array(pcm[i..<j]))
    i = j
    // Generation is ASYNCHRONOUS — pull() returns nil until a chunk of
    // frames lands, so this usually takes nothing on the first passes and
    // then keeps up. It is not a busy-wait: it only removes what is ready.
    while let f = await renderer.pullOne() {
        if let cg = makeCGImage(f, w, h) { frames.append(cg) }
    }
}
await renderer.flushTail()
```

The complete file is [on GitHub](https://github.com/bithuman-product/bithuman-examples/blob/main/swift/ios-expression2/Sources/App.swift).

## Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents) (`"model": "expression-2"`), then `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.
- **Your own voice pipeline:** feed the audio your text-to-speech produces into `feed`, in chunks, as it arrives.
- **Ship it:** don't put the secret in the app bundle. Fetch it from your backend or the Keychain and call `Expression2Credential.set(key)` before `create`.
- **A photoreal person:** the [iOS Essence 2 example](/examples/ios-essence-2) renders an Essence 2 avatar on the device.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `refusing to serve: no API secret was found` | add `BITHUMAN_API_SECRET` to the scheme's environment variables |
| `Sources/Model/agent.imx is missing` or a missing shared engine file | run `./setup.sh` again; it names the step that failed |
| The view stays empty and nothing throws | keep polling `pull()` while you feed; it returns `nil` between chunks |
| `unable to resolve module dependency: 'Expression2'` on a Simulator build of your own project | the simulator slices are arm64 only: set `EXCLUDED_ARCHS[sdk=iphonesimulator*] = x86_64` (the example project already does) |

More on [Apple: Troubleshooting](/platforms/swift/troubleshooting#ios).

## Next

- [macOS example](/examples/macos-expression-2) · [iOS & iPadOS](/platforms/ios) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-expression2)
