---
title: "Build a Swift app"
description: "Stream audio into a Swift avatar on iPhone, iPad or Mac."
section: platforms
group: "Swift"
order: 30
type: platform-app
llms: apps
claims: ["S1", "S2", "S10", "S13", "S17", "S26", "S30", "S32"]
next: ["/platforms/swift/troubleshooting", "/platforms/swift/reference", "/platforms/ios"]
---

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

Resample 24 kHz speech (OpenAI Realtime's) to 16 kHz, and close the avatar when the app leaves the screen: [Companion app](/build/companion-app#resample-speech-to-16-khz).

### Download an avatar in the app

Your app can download an avatar file itself, with the secret you set in [Authenticate](/platforms/ios#authenticate):

```swift
let avatarURL = try await Expression2Download.avatar(agentCode: "A23WJF0199")   // Expression 2
let imxURL = try await Essence2Download.identity(agentCode: "A52DHS2219")      // Essence 2
```

Both return a local file to pass to `create`. They download the Apple build of the avatar, which is smaller than the full file, and refuse a file whose sha256 does not match.

Files are kept in the app's Caches directory under their sha256, so a second call for the same avatar downloads nothing. Pass `directory:` to keep them somewhere else. The shared Expression 2 engine file is not an avatar; download it from the release as in [First frame](/platforms/ios#run-your-first-avatar).

### On a Mac

The Swift API is the same on the Mac as on iPhone and iPad: feed 16 kHz mono audio, take frames on your player's clock, end and interrupt replies. The whole table is [above](#integrate-into-your-app); every entry point is on the [Swift reference](/platforms/swift/reference).

On a Mac:

- **Files:** add the `.imx` files and engine resources to the app bundle. A sandboxed app reads only its bundle and container.
- **App Sandbox:** tick **Outgoing Connections (Client)** so the engine can check your secret, and **Audio Input** (`com.apple.security.device.audio-input`) if the app uses the microphone.
- **Quitting:** call `Essence2Engine.quiesceAll()` from `applicationWillTerminate`.

## Complete example

Two SwiftUI apps you can clone and run on an iPhone or iPad, each with a microphone button, idle motion and interruption:

- [iOS Expression 2](/examples/ios-expression-2): the `wise-pup` sample avatar.
- [iOS Essence 2](/examples/ios-essence-2): a photoreal Essence 2 avatar at full resolution.

[macOS Expression 2](/examples/macos-expression-2) walks through the tool above: requirements, your own avatar and audio, and troubleshooting. For a window with a microphone button, the [iOS Expression 2 example](/examples/ios-expression-2) is the same engine in a SwiftUI app.

## Platform notes

- **Your own MLX:** Essence 2 contains no MLX. Link your own `mlx-swift` (`MLX`, `MLXNN`) in the same target, also with `-ObjC` or `-all_load`; nothing to embed.
- **Simulator:** simulator slices are arm64 only; pass `ARCHS=arm64`, or set `EXCLUDED_ARCHS[sdk=iphonesimulator*] = x86_64` in the target. Essence 2 does not run in the Simulator: use a physical device. Expression 2 does run in the Simulator.
- **Privacy strings:** add `NSMicrophoneUsageDescription` to hear the user.
- **Check the version you resolved.** SwiftPM keeps what `Package.resolved` holds, so run `swift package update` after you raise `from:`, then read it back:

  ```bash
  grep -A3 bithuman-swift Package.resolved   # "version" must be the one on Downloads & versions
  ```
- **Also on a Mac:** the [CLI](/platforms/cli) renders an avatar or runs a live conversation with no code, and [Python](/platforms/python) renders frames from your own scripts. Both run on Apple silicon.
- **Intel Macs** are not supported.

## Reference

- [Swift reference](/platforms/swift/reference): every Swift and C entry point.
- Examples: [iOS Expression 2](/examples/ios-expression-2) · [iOS Essence 2](/examples/ios-essence-2) · [macOS Expression 2](/examples/macos-expression-2).
- Sample avatars: [Ready-made avatars](/examples/avatars). Your own agent's model: [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) with your API secret.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
- [macOS Expression 2 example](/examples/macos-expression-2) and its [source on GitLab](https://gitlab.com/bithuman/sdk/bithuman-examples/-/tree/main/swift/macos-expression2).
