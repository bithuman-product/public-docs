---
title: "iOS & iPadOS"
description: "The Swift package renders Essence 2 and Expression 2 on iPhone and iPad."
section: platforms
group: "Swift"
order: 10
type: platform
llms: apps
searchTitle: "iOS & iPadOS SDK: the Swift package for real-time avatars"
renders: ["device"]
needs: ["Physical device", "API secret"]
artifacts: ["swift"]
platforms: ["ios", "ipados"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S10", "S13", "S17", "S26", "S30", "S32"]
next: ["/platforms/swift/app", "/platforms/swift/troubleshooting", "/platforms/swift/reference"]
moved:
  integrate-into-your-app: /platforms/swift/app#integrate-into-your-app
  download-an-avatar-in-the-app: /platforms/swift/app#download-an-avatar-in-the-app
  complete-example: /platforms/swift/app#complete-example
  platform-notes: /platforms/swift/app#platform-notes
  troubleshooting: /platforms/swift/troubleshooting#ios
  reference: /platforms/swift/reference
---

The avatar renders inside your app, with no render server. [Why on the device](/deploy/on-device).

## Before you start

You feed 16 kHz mono speech in and take lip-synced frames out. The same package builds [Mac apps](/platforms/macos).

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **Devices** | iPhone or iPad, iOS 16 or newer; measured on iPhone 15 only | iPhone, or an M-series iPad, iOS 26 or newer; measured on iPhone 15 only |
| **Product** | `.product(name: "Expression2", package: "homebrew-bithuman")` | `.product(name: "Essence2Kit", package: "homebrew-bithuman")` (Swift), or `.product(name: "Essence2", package: "homebrew-bithuman")` (C) |
| **Credential** | an [API secret](/start/api-secret), Creator plan or higher | an API secret, Creator plan or higher |
| **First-run download** | about 370 MB (avatar and shared engine) | about 250 MB (avatar and engine resources) |
| **Worked example** | [iOS Expression 2](/examples/ios-expression-2) | [iOS Essence 2](/examples/ios-essence-2) |

- **Xcode 26 or newer** and an Apple Developer team.
- **A physical iPhone or iPad** for device builds. Essence 2 does not run in the Simulator: use a physical device. Expression 2 does run in the Simulator.
- **Essence 1** is not available on phones or in the Swift package: use Essence 2 or Expression 2 on devices ([First generation](/models/first-generation)).

## Install

```partial
swift-install
```

The package lives in the `homebrew-bithuman` repository, so its package identity is `homebrew-bithuman`; the name is expected. The Simulator slices are arm64 only: for a `generic/platform=iOS Simulator` or other command-line build, set `EXCLUDED_ARCHS[sdk=iphonesimulator*] = x86_64` in your target's build settings.

## Authenticate

```partial
swift-auth
```

## First frame

Download the `wise-pup` sample avatar, the shared Expression 2 engine and a 16 kHz speech clip. No account is needed for these downloads:

```bash
curl -fL -o A23WJF0199.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fLO "https://github.com/bithuman-product/homebrew-bithuman/releases/download/expression2-engine-mac-arm64-1.0.0/mac-arm64-1.0.0.engine"
curl -fL -o speech16k.wav "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2&member=demo_speech_16k.wav"
```

Add them to your app, then render. The `mac` engine file is the right one for iPhone apps too. For Essence 2, download the avatar in the app with `Essence2Download` ([Swift: Integrate into your app](/platforms/swift/app#download-an-avatar-in-the-app)).

```swift tab="Expression 2"
// excerpt: inside your app. samples is the clip as [Float], 16 kHz mono;
// show(_:_:_:) draws B, G, R bytes; the URLs point at the files above.
import Expression2
import AVFoundation

Expression2Credential.set(ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"] ?? "")
let engine = try Expression2Engine.create(
    avatarContainer: avatarURL,              // A23WJF0199.imx
    sharedEngineContainer: sharedEngineURL,  // mac-arm64-1.0.0.engine
    stagingDir: stagingURL)                  // any writable directory; keep it between launches

let audio = AVAudioEngine(), player = AVAudioPlayerNode()         // your app's audio output
let format = AVAudioFormat(standardFormatWithSampleRate: 16000, channels: 1)!
audio.attach(player); audio.connect(player, to: audio.mainMixerNode, format: format); try audio.start()
let reply = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count))!
reply.frameLength = reply.frameCapacity
samples.withUnsafeBufferPointer { reply.floatChannelData![0].update(from: $0.baseAddress!, count: samples.count) }

// seconds of the current reply your player has played (nil before it starts); frames() reads it
// off the main actor, so the player goes in a Sendable box
final class PlayedSeconds: @unchecked Sendable {
    let node: AVAudioPlayerNode
    init(_ node: AVAudioPlayerNode) { self.node = node }
    func callAsFunction() -> Double? {
        guard let t = node.lastRenderTime, let pt = node.playerTime(forNodeTime: t) else { return nil }
        return Double(pt.sampleTime) / pt.sampleRate
    }
}
let played = PlayedSeconds(player)

engine.feed(samples)   // [Float], 16 kHz mono
engine.flushTail()     // end of the reply
for await frame in engine.frames(audioClock: { played() }) {
    show(frame.bgr, frame.width, frame.height)                        // B, G, R bytes
    if frame.audioTime == 0 { player.scheduleBuffer(reply, completionHandler: nil); player.play() }   // the reply's first frame: start its audio
    if frame.endsReply { break }                                      // the reply is over; idle frames follow
}
```

```swift tab="Essence 2"
// excerpt: inside your app. samples is the clip as [Float], 16 kHz mono;
// show(_:_:_:) draws B, G, R bytes.
import Essence2Kit
import AVFoundation

Essence2Credential.set(ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"] ?? "")
let imxURL = try await Essence2Download.identity(agentCode: "A52DHS2219")   // sofia-ramirez
let engine = try await Essence2Engine.create(identity: imxURL)            // waits until the engine is ready

let audio = AVAudioEngine(), player = AVAudioPlayerNode()         // your app's audio output
let format = AVAudioFormat(standardFormatWithSampleRate: 16000, channels: 1)!
audio.attach(player); audio.connect(player, to: audio.mainMixerNode, format: format); try audio.start()
let reply = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count))!
reply.frameLength = reply.frameCapacity
samples.withUnsafeBufferPointer { reply.floatChannelData![0].update(from: $0.baseAddress!, count: samples.count) }

engine.feed(samples)                                              // [Float], 16 kHz mono
engine.flushTail()                                                // that is the whole reply
for await frame in engine.frames(following: player) {
    show(frame.bgr, frame.width, frame.height)                    // B, G, R bytes, width * height * 3
    if frame.audioTime == 0 {                                     // the reply's first speech frame:
        player.stop(); player.scheduleBuffer(reply, completionHandler: nil); player.play()  // start its audio now
    }
    if frame.endsReply { break }                                  // the reply is over; idle frames follow
}
engine.shutdown()
```

<details class="expected">
<summary>Expected result</summary>

- **Expression 2:** 416×720 frames, 20 a second: idle motion between replies, speech while a reply plays. Each speech frame is handed out when your player has played its audio. The first start prepares the engine for the device; later starts reuse the staging directory.
- **Essence 2:** 25 frames a second at the avatar's own size (1080×1920 for `sofia-ramirez`). `frames(following: player)` keeps voice and lips together however long the reply is; a frame that would be shown late is skipped. The first `create` downloads the engine's three runtime files (about 112 MB), checks their sha256 and keeps them in Application Support. To ship them in your app instead, pass `resourcesDirectory:`.

</details>

The C interface for C, C++ and plugins (`Essence2`) is on the [Swift reference](/platforms/swift/reference#essence-2-c).

<div class="fig-end">

```figure
ios-expression-2
```

</div>

## Performance

```perf
iphone-15 iphone-15-sustained
```
