---
title: "iOS & iPadOS"
description: "The Swift package renders Essence 2 and Expression 2 on iPhone and iPad."
section: platforms
group: "Apps"
order: 10
type: platform
searchTitle: "iOS & iPadOS: the Swift package"
renders: ["device"]
needs: ["Physical device", "API secret"]
artifacts: ["swift"]
platforms: ["ios", "ipados"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S10", "S13", "S17", "S26", "S30", "S32"]
next: ["/examples/ios-expression-2", "/examples/ios-essence-2", "/platforms/macos"]
---

<div class="lead">
<div class="lead-text">

One Swift package carries both models. The avatar renders inside your app on the iPhone or iPad: you feed 16 kHz mono speech in and take lip-synced frames out, with no render server. The same package builds [Mac apps](/platforms/macos).

```why-on-device
ios
```

</div>

```figure
ios-expression-2 eager
```

</div>

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **Devices** | any Apple silicon iPhone or iPad, iOS 16 or newer | any Apple silicon iPhone, an M-series iPad, iOS 26 or newer |
| **Product** | `.product(name: "Expression2", package: "homebrew-bithuman")` | `.product(name: "Essence2Kit", package: "homebrew-bithuman")` (Swift), or `.product(name: "Essence2", package: "homebrew-bithuman")` (C) |
| **Credential** | an [API secret](/start/api-secret), Creator plan or higher | an API secret, Creator plan or higher |
| **First-run download** | about 370 MB (avatar and shared engine) | about 250 MB (avatar and engine resources) |
| **Worked example** | [iOS Expression 2](/examples/ios-expression-2) | [iOS Essence 2](/examples/ios-essence-2) |

## Before you start

- **Xcode 26 or newer** and an Apple Developer team.
- **A physical iPhone or iPad** for device builds. Essence 2 does not run in the Simulator; Expression 2 does.
- **Essence 1** is not available on phones or in the Swift package: use Essence 2 or Expression 2 on devices ([First generation](/models/first-generation)).

## Install

```partial
swift-install
```

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

Add them to your app, then render. The `mac` engine file is the right one for iPhone apps too. For Essence 2, download the avatar in the app with `Essence2Download` ([below](#download-an-avatar-in-the-app)).

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
    if frame.audioTime == 0 { player.scheduleBuffer(reply); player.play() }   // the reply's first frame: start its audio
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
        player.stop(); player.scheduleBuffer(reply); player.play()  // start its audio now
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

## Complete example

Two SwiftUI apps you can clone and run on an iPhone or iPad, each with a microphone button, idle motion and interruption:

- [iOS Expression 2](/examples/ios-expression-2): the `wise-pup` sample avatar.
- [iOS Essence 2](/examples/ios-essence-2): a photoreal Essence 2 avatar at full resolution.

## Integrate into your app

| Job | Expression 2 | Essence 2 |
|---|---|---|
| Audio in | 16 kHz mono `[Float]`: `feed(chunk)` as it arrives | the same |
| Show frames | `frames(audioClock:)` on your player's clock, or `pull()`, which returns frames as soon as they render | `frames(following:)`, or `pull()` paced to 25 a second |
| End of a reply | `flushTail()`; the first frame after it has `endsReply`, and `events()` reports `.replyEnded` | the same |
| Start the reply's audio | with its first frame (`audioTime == 0`, or `events()` `.replyStarted`) | with its first speech frame; `frames(following: player)` keeps the picture on it |
| Idle between replies | `frames()` keeps returning idle frames (`isSpeech == false`), or `engine.idle` | `frames()` / `pull()` keep returning idle frames |
| Interrupt the reply | `interrupt()` | `interrupt()` |
| Check the session | `meteringRefusal` | `meteringRefusal`, `runtimeFailure` |
| Quit | `shutdown()` | `shutdown()`, then `Essence2Engine.quiesceAll()` from `applicationWillTerminate` |

For file rendering, set `engine.pacing = .unpaced`: Essence 2 then hands out frames as fast as it renders them. If your audio does not go through an `AVAudioPlayerNode`, pass your own clock: `frames(audioClock: { secondsOfThisReplyPlayed })`.

### Download an avatar in the app

Your app can download an avatar file itself, with the secret you set in [Authenticate](#authenticate):

```swift
let avatarURL = try await Expression2Download.avatar(agentCode: "A23WJF0199")   // Expression 2
let imxURL = try await Essence2Download.identity(agentCode: "A52DHS2219")      // Essence 2
```

Both return a local file to pass to `create`. They download the Apple build of the avatar, which is smaller than the full file, and refuse a file whose sha256 does not match. Files are kept in the app's Caches directory under their sha256, so a second call for the same avatar downloads nothing. Pass `directory:` to keep them somewhere else. The shared Expression 2 engine file is not an avatar; download it from the release as in [First frame](#first-frame).

## Platform notes

- **Your own MLX:** Essence 2 contains no MLX. Link your own `mlx-swift` (`MLX`, `MLXNN`) in the same target, also with `-ObjC` or `-all_load`; nothing to embed.
- **Simulator:** simulator slices are arm64 only; pass `ARCHS=arm64`. Essence 2 does not run in the Simulator (`be_essence2_create` returns `-2`); Expression 2 does.
- **Privacy strings:** add `NSMicrophoneUsageDescription` to hear the user.
- **Check the version you resolved.** SwiftPM keeps what `Package.resolved` holds, so run `swift package update` after you raise `from:`, then read it back:

  ```bash
  grep -A3 homebrew-bithuman Package.resolved   # "version" must be the one on Downloads & versions
  ```

## Performance

```perf
iphone-15 iphone-15-sustained
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `create` throws `meteringRefused` (C: `be_essence2_create` returns `-3`): *no API secret was found* | no secret | call `Essence2Credential.set` / `Expression2Credential.set`, or set `BITHUMAN_API_SECRET` in the scheme |
| *the API secret was rejected (401)* | revoked or mistyped secret | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys) |
| *cannot reach bitHuman to verify your credential* | no network at first contact | fix the network, then create again |
| `pull()` keeps returning `nil` right after `feed()` | frames arrive asynchronously, and Essence 2 hands out at most 25 a second | poll, or use `frames()` |
| crash in `__cxa_finalize` when the app quits | `Essence2Engine.quiesceAll()` (C: `be_essence2_quiesce_all`) was not called | call it from `applicationWillTerminate` |
| `unable to resolve module dependency: 'Expression2'` on a Simulator build | the default destination also builds x86_64 | add `ARCHS=arm64` |
| `duplicate symbol` naming `MLX` at the final link, or Essence 2 memory rising in a long session | an older Swift package | raise `from:` to the version on [Downloads & versions](/downloads), then `swift package update` |
| a link error naming `BithumanEngineProtocol` | that product was added beside `Expression2`, which already contains it | depend on `Expression2` only |
| `401 MISSING_AUTH` downloading a model | the agent code and `model=` do not match a sample avatar | check the code, or send your API secret for your own agent |

## Reference

- [Swift reference](/platforms/swift/reference): every Swift and C entry point.
- Examples: [iOS Expression 2](/examples/ios-expression-2) · [iOS Essence 2](/examples/ios-essence-2) · [macOS Expression 2](/examples/macos-expression-2).
- Sample avatars: [Ready-made avatars](/examples#ready-made-avatars). Your own agent's model: [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) with your API secret.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
