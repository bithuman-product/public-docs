---
title: "macOS example: Expression 2"
description: "Render a talking Expression 2 avatar on a Mac from one Swift file: a speech WAV goes in, lip-synced frames come out, all on the machine."
section: examples
group: "Examples"
order: 33
type: example
label: "macOS: Expression 2"
---

<figure class="showcase">
  <video controls preload="none" playsinline poster="/examples/macos/hero.webp" width="416" height="720" src="/examples/macos/clip.mp4"></video>
  <figcaption>Frames from the <code>macos-expression2</code> example on an Apple M4 iMac, with the speech clip it rendered (Swift package 2.14.2, the <code>wise-pup</code> sample avatar).</figcaption>
</figure>

The shortest native Apple path: a command-line tool that opens an avatar, feeds it a 16 kHz WAV and pulls 416×720 frames, rendered on this Mac; the engine contacts bitHuman only to check your API secret and report session time. It writes the first frame to `out/first-frame.png`; the clip above muxes every frame it pulled with the audio.

## Requirements

| You need | Notes |
|---|---|
| A Mac with Apple silicon on macOS 15.6 or newer, with Xcode 26 or newer | the built tool runs on macOS 13 or newer |
| About 800 MB of disk | about 370 MB of downloads (avatar + shared engine), plus the folder the engine unpacks them into |
| An [API secret](/start/api-secret) | the engine bills session time, talking or idle |

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/macos-expression2
./setup.sh
```

`setup.sh` downloads the `wise-pup` avatar, the shared engine files and a speech clip into `Model/`. For your own avatar run `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.

## Set your API secret

```bash
export BITHUMAN_API_SECRET="<your API secret>"
```

## Run it

```bash
swift run -c release MacOSExpression2
```

## Expected output

```text
engine ready: 416x720, isReady=true
audio: 325451 samples, 20.34 s
generated 407 frames in … s (… FPS, …x real time) -> out/first-frame.png
```

407 frames for 20.34 seconds of audio is 20 fps. The first run prepares the engine for your Mac; keep `Model/staged/` and later runs start faster. The link step prints about ten `unable to open object file` warnings that name a folder on another machine. They are harmless.

## How it works

`Sources/main.swift` is about 60 lines around three calls from the Swift package's `Expression2` product:

```swift
let engine = try Expression2Engine.create(
    avatarContainer: model.appendingPathComponent("agent.imx"),
    sharedEngineContainer: model.appendingPathComponent("shared-engine.imx"),
    stagingDir: model.appendingPathComponent("staged"))
engine.feed(samples)      // 16 kHz mono float, any length
engine.flushTail()        // end of the utterance
while let (frame, _) = engine.pull() { /* 416×720 BGR, 3 bytes per pixel */ }
```

`pull()` returns `nil` until a chunk of frames is ready, so the example polls until it has drained them all. The API is on [Apple](/sdk/apple).

## Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents) (`"model": "expression-2"`), then `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.
- **Your own audio:** any 16 kHz mono 16-bit WAV works as `Model/speech16k.wav`; `afconvert -f WAVE -d LEI16@16000 -c 1 in.m4a Model/speech16k.wav` converts one.
- **A window instead of a file:** the [iOS example](/examples/swift-ios-expression2) is the same engine in a SwiftUI app with a microphone button, and it also builds for iPad.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `refusing to serve: no API secret was found` | `export BITHUMAN_API_SECRET=…` in the same shell |
| `create` throws before `engine ready` | run `./setup.sh` first, from the example folder, so `Model/` holds the three files |
| The first run is slow | it prepares the engine once; keep `Model/staged/` |

## Next

- [iOS example](/examples/swift-ios-expression2) · [Apple SDK](/sdk/apple) · [CLI example](/examples/cli) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-expression2)
