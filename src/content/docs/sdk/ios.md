---
title: "Apple"
description: "Add an Essence 2 or Expression 2 avatar to an iPhone, iPad or Mac app. One Swift package; both models render on the device."
section: sdk
group: "Platforms"
order: 30
type: platform
slug: sdk/apple
label: "Apple (iOS, iPadOS, macOS)"
---

One Swift package carries both models. Both models render on the device and bill session time to your API secret.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [any character from one portrait](/concepts/expression-2), 416×720 at 20 fps | [a photoreal person from one portrait](/concepts/essence-2), up to 1920×1080 at 25 fps |
| **Devices** | any Apple silicon iPhone, iPad or Mac; iOS 16 / macOS 13 | any Apple silicon iPhone, M-series iPad, M3 or newer Mac; iOS 26 / macOS 26 |
| **Product** | `.product(name: "Expression2", package: "homebrew-bithuman")` | `.product(name: "Essence2Kit", package: "homebrew-bithuman")` (Swift), or `.product(name: "Essence2", package: "homebrew-bithuman")` (C) |
| **Credential** | an [API secret](https://www.bithuman.ai/developer/api-keys) | an [API secret](https://www.bithuman.ai/developer/api-keys) |
| **First-run download** | about 355 MB (avatar + shared engine) | about 250 MB (avatar + engine resources) |
| **API** | Swift (`Expression2Engine`) | Swift (`Essence2Engine`), or C (`be_essence2_*`) |
| **Worked example** | [iOS: Expression 2](/examples/swift-ios-expression2) | [iOS: Essence 2](/examples/swift-ios-essence2) |

Toolchain: Xcode 26 or newer, an Apple Developer team, and a physical device for iPhone builds. On a Mac, `swift run` is enough: no device, profile or entitlement.

Essence 1 isn't supported on Android or in the Swift package. Use Essence 2 or Expression 2 on devices, or run Essence 1 from the [cloud API](/api) or the [Python SDK](/sdk/python) or [CLI](/sdk/cli) on a desktop. See [Essence 1](/concepts/essence-1).

## Install

In Xcode choose *File → Add Package Dependencies…* and paste `https://github.com/bithuman-product/homebrew-bithuman.git`. In a `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.16.0")
// then attach the products your target uses:
//   .product(name: "Expression2", package: "homebrew-bithuman")
//   .product(name: "Essence2Kit", package: "homebrew-bithuman")
```

| Product | Import | What it is |
|---|---|---|
| `Expression2` | `import Expression2` | the Expression 2 engine with a Swift API |
| `Essence2Kit` | `import Essence2Kit` | the Essence 2 engine with a Swift API; it includes `Essence2` |
| `Essence2` | `import Essence2` | the Essence 2 engine as a C library, for C, C++ and plugins |

Every product ships `ios-arm64`, `ios-arm64-simulator` (arm64 only) and `macos-arm64`. An app that links `Essence2Kit` or `Essence2` sets its deployment target to iOS 26 / macOS 26.

`bitHumanKit` 2.4.0 is legacy and frozen; new apps use `Expression2` or `Essence2Kit`.

## Authenticate

Set `BITHUMAN_API_SECRET` in the scheme's environment, or pass it in code before you create an engine: `Expression2Credential.set(secret)` or `Essence2Credential.set(secret)`. See [Your API secret](/start/api-secret).

Credits pay for session time, talking or idle, by the exact second ([pricing](/guides/pricing)). If the network drops after your secret is accepted, the session keeps rendering for 5 minutes, then pauses until the connection returns.

> **Warning:** do not compile the secret into an app you distribute. Fetch it from your own backend at startup and keep it in the Keychain.

## First frame

Download the `wise-pup` sample avatar, the shared Expression 2 engine and a speech clip. No account is needed for these downloads:

```bash
curl -fL -o A23WJF0199.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fLO "https://github.com/bithuman-product/homebrew-bithuman/releases/download/expression2-engine-mac-arm64-1.0.0/mac-arm64-1.0.0.engine"
curl -fL -o speech16k.wav "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2&member=demo_speech_16k.wav"
```

Then render (the `mac` engine file is the right one for iPhone apps too):

```swift
import Expression2

Expression2Credential.set(ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"] ?? "")
let engine = try Expression2Engine.create(
    avatarContainer: avatarURL,              // A23WJF0199.imx
    sharedEngineContainer: sharedEngineURL,  // mac-arm64-1.0.0.engine
    stagingDir: stagingURL)                  // any writable directory; keep it between launches

engine.feed(samples)   // [Float], 16 kHz mono
engine.flushTail()     // end of the utterance

var idleTicks = 0
while idleTicks < 100 {                       // 5 s with no frame = done
    var got = false
    while let (frame, _) = engine.pull() {    // BGR, width * height * 3 bytes
        got = true
        show(frame)
    }
    if got { idleTicks = 0 } else { idleTicks += 1; try await Task.sleep(nanoseconds: 50_000_000) }
}
```

Expected: 20 frames per second of audio, 416×720. The first start compiles the engine for the device; later starts reuse the staging directory.

Essence 2, with an Essence 2 avatar file (`.imx`, downloaded the same way with your agent code):

```swift
import Essence2Kit

Essence2Credential.set(secret)                                    // or BITHUMAN_API_SECRET
let engine = try await Essence2Engine.create(identity: imxURL)    // waits until the engine is ready
engine.feed(samples)                                              // [Float], 16 kHz mono
var spoke = false
while true {
    if let (frame, speech) = engine.pull() {                      // B, G, R bytes, width * height * 3
        show(frame, engine.width, engine.height)
        if speech { spoke = true } else if spoke { break }        // the first idle frame after the reply
    }
    try await Task.sleep(nanoseconds: 40_000_000)                 // pull at 25 fps, as a display does
}
engine.shutdown()
```

Expected: 25 frames per second of audio at the avatar's own size (for example 1920×1080). Between replies `pull()` keeps returning idle frames (`speech: false`) as fast as you call it, so pace the calls to your display, 25 per second. The first `create` downloads the engine's three runtime files (about 112 MB) from the package's release, checks their sha256 and keeps them in Application Support. To ship them in your app instead, pass `resourcesDirectory:`.

The same engine as a C interface, for C, C++ and plugins:

```c
be_essence2_handle h;
be_essence2_set_api_secret(secret);                    // or Essence2Credential.set in Swift
if (be_essence2_create(imx_path, NULL, 0, &h) != 0) { /* -3: no secret, rejected, or no network */ }
while (!be_essence2_is_ready(h)) { /* show be_essence2_idle_frame() meanwhile */ }
int32_t w, hgt; be_essence2_get_info(h, &w, &hgt);     // frame is w * hgt * 3 BGR bytes
be_essence2_push_audio(h, pcm16k_int16, count);        // -2: pull frames, then push again
while (be_essence2_frames_available(h) > 0) be_essence2_pull_frame(h, buf, w * hgt * 3);
be_essence2_destroy(h);
```

Call `Essence2Engine.quiesceAll()` (C: `be_essence2_quiesce_all(timeout_ms)`) from `applicationWillTerminate`. Without it the app can crash on exit while GPU work is still running.

## Integrate into your app

| Job | Expression 2 | Essence 2 |
|---|---|---|
| Stream audio as it arrives | `feed(chunk)` | `feed(chunk)` |
| Show frames | `pull()` at 20 fps | `pull()` at 25 fps |
| End of a reply | `flushTail()` | `pull()` returns `speech: false` again (idle frames follow; it does not return `nil`) |
| Idle between replies | `engine.idle` | `idle(into:)` (a `0` means keep the current frame) |
| Interrupt the reply | `resetState(clearFrames: true)` | `interrupt()` |
| Check the session | `meteringRefusal` | `meteringRefusal`, `runtimeFailure` |
| Quit | release the engine | `shutdown()`, then `Essence2Engine.quiesceAll()` at app exit |

The [Expression 2 example](/examples/swift-ios-expression2) is a complete SwiftUI app with microphone input, idle and interruption.

### Download an avatar in the app

Your app can download an avatar file itself, using the secret you set in [Authenticate](#authenticate):

```swift
let avatarURL = try await Expression2Download.avatar(agentCode: "A23WJF0199")   // Expression 2
let imxURL = try await Essence2Download.identity(agentCode: "A52DHS2219")      // Essence 2
```

Both return a local file to pass to `create`. They download the Apple build of the avatar, which is smaller than the full file, and refuse a file whose sha256 does not match. Files are kept in the app's Caches directory under their sha256, so a second call for the same avatar downloads nothing. Pass `directory:` to keep them somewhere else. The shared Expression 2 engine file is not an avatar; download it from the release as shown above.

## Platform notes

- **Your own MLX:** Essence 2 contains no MLX. Link your own `mlx-swift` (`MLX`, `MLXNN`) in the same target, also with `-ObjC` or `-all_load`; nothing to embed. Requires Swift package 2.16.0 or newer.
- **A Mac app built in Xcode:** the App template turns on App Sandbox. Under *Signing & Capabilities → App Sandbox*, tick **Outgoing Connections (Client)**, or the engines cannot check your secret. Add the `.imx` files and engine resources to the app bundle; a sandboxed app reads only its bundle and container.
- **Simulator:** simulator slices are arm64 only; pass `ARCHS=arm64`. Essence 2 does not run in the Simulator (`be_essence2_create` returns `-2`); Expression 2 does.
- **Privacy strings:** add `NSMicrophoneUsageDescription` to hear the user.
- **Check the version you resolved.** SwiftPM keeps what `Package.resolved` holds, so run `swift package update` after you raise `from:`, then read it back:

  ```bash
  grep -A3 homebrew-bithuman Package.resolved   # "version" must be 2.16.0 or newer
  ```

## Performance

Frame rates for both models are on [Mobile performance](/performance/mobile) for iPhone and [Desktop performance](/performance/desktop) for Mac.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `create` throws `meteringRefused` (C: `be_essence2_create` returns `-3`): *no API secret was found* | no secret | call `Essence2Credential.set` / `Expression2Credential.set`, or set `BITHUMAN_API_SECRET` in the scheme |
| *the API secret was rejected (401)* | revoked or mistyped secret | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys) |
| *cannot reach bitHuman to verify your credential* | no network at first contact; in a Mac app, no Outgoing Connections entitlement | fix the network or the entitlement, then create again |
| `pull()` keeps returning `nil` right after `feed()` | frames arrive asynchronously | poll, as in the first frame |
| crash in `__cxa_finalize` when the app quits | `be_essence2_quiesce_all()` was not called | call it from `applicationWillTerminate` |
| `unable to resolve module dependency: 'Expression2'` on a Simulator build | the default destination also builds x86_64 | add `ARCHS=arm64` |
| `duplicate symbol` naming `MLX` at the final link | Swift package older than 2.16.0 | set `from: "2.16.0"`, then `swift package update` |
| a link error naming `BithumanEngineProtocol` | that product was added beside `Expression2`, which already contains it | depend on `Expression2` only |
| `401 MISSING_AUTH` downloading a model | the agent code and `model=` do not match a sample avatar | check the code, or send your API secret for your own agent |

## Reference

- [Apple API reference](/sdk/apple-api): every Swift and C entry point.
- Examples: [iOS Expression 2](/examples/swift-ios-expression2) · [iOS Essence 2](/examples/swift-ios-essence2) · [macOS Expression 2](/examples/macos-expression2) (`swift run`).
- Sample avatars: [Ready-made avatars](/examples#ready-made-avatars). Your own agent's model: [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) with your API secret.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
