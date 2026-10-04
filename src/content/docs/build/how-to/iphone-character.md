---
title: "Put an animated character in an iPhone app"
description: "Feed speech to the Swift package; the character renders on the iPhone."
section: build
group: "How-to"
order: 10
type: recipe
llms: apps
searchTitle: "Put an animated, talking character in an iPhone or iPad app"
availability: "creator"
renders: ["device"]
needs: ["API secret"]
platforms: ["ios", "ipados"]
models: ["expression-2"]
claims: ["S1", "S10", "S24", "S30"]
next: ["/examples/ios-expression-2", "/platforms/swift/app", "/performance"]
artifacts: ["swift"]
---

## What you'll build

Add the Swift package's `Expression2` product to your app, open an Expression 2 avatar, and feed it 16 kHz mono speech: it hands back lip-synced frames that you draw. The character renders on the iPhone or iPad itself, with no render server. Expression 2 animates any character from one portrait, so the avatar can be a cartoon, an animal, a robot or a creature as well as a person.

This page follows the [iOS Expression 2 example](/examples/ios-expression-2), which uses the `wise-pup` sample avatar. You need:

- a Mac with Xcode 26 or newer, and an Apple Developer team;
- an iPhone or iPad, or the iOS Simulator (Expression 2 also runs in the Simulator; judge speed on a device);
- an [API secret](/start/api-secret) (Creator plan or higher).

## Steps

### Run the example first

Clone the example and download the `wise-pup` avatar, the shared engine and a 16 kHz speech clip. The download is anonymous:

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-expression2
./setup.sh
```

Add `BITHUMAN_API_SECRET` under **Product → Scheme → Edit Scheme → Run → Environment Variables**, then open the project, pick your team under **Signing & Capabilities** and press **Run**:

```bash
open IOSExpression2.xcodeproj
```

```expected
The avatar appears and idles. Tap **Speak**: it says the sample line with its lips in sync. The first launch prepares the engine on the device and takes a few seconds longer than later launches.
```

### Add the Swift package to your app

In Xcode choose *File → Add Package Dependencies…*, paste `https://gitlab.com/bithuman/sdk/bithuman-swift` and attach the `Bithuman` product to your target. The current version pin and the `Package.swift` line are on [iOS & iPadOS: Install](/platforms/ios#install).

```expected
Your app builds with `import Expression2`.
```

### Set your API secret

The engine checks an API secret when a session starts. Set it before you create the engine:

```swift
Expression2Credential.set(ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"] ?? "")
```

Set `BITHUMAN_API_SECRET` in the scheme's environment while you build. Keep the secret out of the app bundle you ship ([What a shipped app holds](/start/api-secret#what-a-shipped-app-holds)).

```expected
No refusal when the engine opens in the next step.
```

### Add the character's files

Download the `wise-pup` sample avatar, the shared Expression 2 engine and a 16 kHz speech clip, and add them to your app. No account is needed for these downloads:

```bash
curl -fL -o A23WJF0199.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fLO "https://downloads.bithuman.ai/homebrew-bithuman/expression2-engine-mac-arm64-1.0.0/mac-arm64-1.0.0.engine"
curl -fL -o speech16k.wav "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2&member=demo_speech_16k.wav"
```

The `mac` engine file is the right one for iPhone apps too.

```expected
Three files in your app: the avatar (`A23WJF0199.imx`), the shared engine and the speech clip.
```

### Feed it speech and draw the frames

The example keeps the engine in an actor. `create` opens the two files as they are, `feed` takes 16 kHz mono float audio, `flushTail()` ends a reply, and `pull()` returns the next frame, or `nil` until a chunk of frames is ready:

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

Feed the speech in chunks and take frames out as they appear, so the app feeds and drains at the same time:

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

To play the reply's audio in step with the lips, start it on the reply's first frame (`audioTime == 0`): the full loop is in [iOS & iPadOS: First frame](/platforms/ios#run-your-first-avatar).

```expected
The character idles, then says the clip with its lips in sync, rendered in your app.
```

### Use your own character

Create an Expression 2 avatar from one portrait ([Turn a drawing, mascot or pet photo into a talking character](/build/how-to/drawing-to-character)), then download it with your agent code in place of `A23WJF0199`. In the example, run `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.

```expected
Your character in place of `wise-pup`, with the same calls.
```

### Run it on a device

Choose your iPhone or iPad as the run destination. Expression 2 also runs in the iOS Simulator, which is fine while you build; Essence 2, the photoreal model, needs a physical device. How fast each device renders is on [Performance](/performance).

```expected
The character idles and speaks on the device.
```

## How it works

The avatar renders inside your app, from 16 kHz mono speech to picture frames. Your app keeps its own speech recognition, language model and voice, and feeds the reply's audio to the engine. The engine contacts bitHuman only to check your API secret and report session time, and a session bills active session time, talking or idle ([pricing](/pricing)).

## Make it your own

- **A live conversation:** pass the audio your voice stack produces into `feed`, in chunks, as it arrives: [Give an app's voice assistant a face](/build/how-to/voice-assistant-face).
- **A companion screen:** interruptions, resampling and closing the avatar with the screen are on [Companion app](/build/companion-app).
- **A photoreal person:** the [iOS Essence 2 example](/examples/ios-essence-2) renders an Essence 2 avatar on the device.
- **A Mac app:** the same calls run on a Mac: [macOS example](/examples/macos-expression-2).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `refusing to serve: no API secret was found` | add `BITHUMAN_API_SECRET` to the scheme's environment variables, or call `Expression2Credential.set` before `create` |
| `Sources/Model/agent.imx is missing` or a missing shared engine file | run `./setup.sh` again; it names the step that failed |
| The view stays empty and nothing throws | keep polling `pull()` while you feed; it returns `nil` between chunks |
| `unable to resolve module dependency: 'Expression2'` on a Simulator build of your own project | the simulator slices are arm64 only: set `EXCLUDED_ARCHS[sdk=iphonesimulator*] = x86_64` (the example project already does) |

More on [Apple: Troubleshooting](/platforms/swift/troubleshooting#ios).
