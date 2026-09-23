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

One Swift package carries both models, plus `bitHumanKit`, a complete on-device voice agent. Both models render on the device and bill talking time to your API secret.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [any character from one portrait](/concepts/expression-2), 416×720 at 20 fps | [a photoreal person from one portrait](/concepts/essence-2), up to 1920×1080 at 25 fps |
| **Devices** | any Apple silicon iPhone, iPad or Mac; iOS 16 / macOS 13 | any Apple silicon iPhone, M-series iPad, M3 or newer Mac; iOS 26 / macOS 26 |
| **Product** | `.product(name: "Expression2", package: "homebrew-bithuman")` | `.product(name: "Essence2", package: "homebrew-bithuman")` |
| **Credential** | an [API secret](https://www.bithuman.ai/developer/api-keys) | an [API secret](https://www.bithuman.ai/developer/api-keys) |
| **First-run download** | about 355 MB (avatar + shared engine) | about 250 MB (avatar + engine resources) |
| **API** | Swift (`Expression2Engine`) | C (`be_essence2_*`) |
| **Worked example** | [iOS: Expression 2](/examples/swift-ios-expression2) | [iOS: Essence 2](/examples/swift-ios-essence2) |

Toolchain: Xcode 26 or newer, an Apple Developer team, and a physical device for iPhone builds. On a Mac, `swift run` is enough: no device, profile or entitlement.

## Install

In Xcode choose *File → Add Package Dependencies…* and paste `https://github.com/bithuman-product/homebrew-bithuman.git`. In a `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.14.2")
// then attach the products your target uses:
//   .product(name: "Expression2", package: "homebrew-bithuman")
//   .product(name: "Essence2",    package: "homebrew-bithuman")
//   .product(name: "bitHumanKit", package: "homebrew-bithuman")
```

| Product | Import | What it is |
|---|---|---|
| `Expression2` | `import Expression2` | the Expression 2 engine with a Swift API |
| `Essence2` | `import Essence2` | the Essence 2 engine as a C library |
| `bitHumanKit` | `import bitHumanKit` | a voice agent: speech recognition, language model, speech and avatar views |

Every product ships `ios-arm64`, `ios-arm64-simulator` and `macos-arm64`. An app that links `Essence2` sets its deployment target to iOS 26 / macOS 26.

## Authenticate

Set `BITHUMAN_API_SECRET` in the scheme's environment, or pass it in code before you create an engine: `Expression2Credential.set(secret)` or `Essence2Credential.set(secret)`. `bitHumanKit` takes it as `config.apiKey`. See [Your API secret](/start/api-secret).

Credits pay for talking time; idle time is free ([pricing](/guides/pricing)). If the network drops after your secret is accepted, the session keeps rendering for 5 minutes, then pauses until the connection returns.

> **Warning:** do not compile the secret into an app you distribute. Fetch it from your own backend at startup and keep it in the Keychain.

## First frame

Download the `wise-pup` sample avatar, the shared Expression 2 engine and a speech clip. No account is needed for these downloads:

```bash
curl -fL -o A23WJF0199.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl -fLO "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/engines/expression-2/mac-arm64-1.0.0.engine"
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

Essence 2 is a C interface. Place its engine resources in your app bundle first: unzip this archive at the bundle's `Resources` root, keeping its two `.bundle` directories.

```bash
curl -fLO "https://github.com/bithuman-product/homebrew-bithuman/releases/download/essence2-v1.11.0/libessence2-resources.zip"
```

Then:

```c
be_essence2_handle h;
be_essence2_set_api_secret(secret);                    // or Essence2Credential.set in Swift
if (be_essence2_create(imx_path, NULL, 0, &h) != 0) { /* -3: no secret, rejected, or no network */ }
while (!be_essence2_is_ready(h)) { /* show be_essence2_idle_frame() meanwhile */ }
int32_t w, hgt; be_essence2_get_info(h, &w, &hgt);     // frame is w * hgt * 3 RGB bytes
be_essence2_push_audio(h, pcm16k_int16, count);        // -2: pull frames, then push again
while (be_essence2_frames_available(h) > 0) be_essence2_pull_frame(h, buf, w * hgt * 3);
be_essence2_destroy(h);
```

Call `be_essence2_quiesce_all(timeout_ms)` from `applicationWillTerminate`. Without it the app can crash on exit while GPU work is still running.

## Integrate into your app

| Job | Expression 2 (Swift) | Essence 2 (C) |
|---|---|---|
| Stream audio as it arrives | `feed(chunk)` | `be_essence2_push_audio` |
| Show frames | `pull()` at 20 fps | `be_essence2_pull_frame` at 25 fps |
| End of a reply | `flushTail()` | keep pulling until `frames_available` is 0 |
| Idle between replies | `engine.idle` | `be_essence2_idle_frame` (a `0` means keep the current frame) |
| Interrupt the reply | `resetState(clearFrames: true)` | `be_essence2_reset` |
| Quit | release the engine | `be_essence2_quiesce_all` |

The [Expression 2 example](/examples/swift-ios-expression2) is a complete SwiftUI app with microphone input, idle and interruption.

## Platform notes

- **A Mac app built in Xcode:** the App template turns on App Sandbox. Under *Signing & Capabilities → App Sandbox*, tick **Outgoing Connections (Client)**, or the engines cannot check your secret. Add the `.imx` files and engine resources to the app bundle; a sandboxed app reads only its bundle and container.
- **Simulator:** simulator slices are arm64 only; pass `ARCHS=arm64`. Essence 2 does not run in the Simulator (`be_essence2_create` returns `-2`); Expression 2 does.
- **`bitHumanKit`:** needs an iPhone 16 Pro or newer (or iPad Pro M4, 16 GB) and two Apple entitlements, `com.apple.developer.kernel.increased-memory-limit` and `com.apple.developer.kernel.extended-virtual-addressing`. Request them under *Account → Membership → Request Additional Capabilities*; Apple replies in 1–3 business days. The engines need no entitlement.
- **Privacy strings:** add `NSMicrophoneUsageDescription` to hear the user, and `NSSpeechRecognitionUsageDescription` if you use `bitHumanKit` recognition.
- **Check the version you resolved.** SwiftPM keeps what `Package.resolved` holds, so run `swift package update` after you raise `from:`, then read it back:

  ```bash
  grep -A3 homebrew-bithuman Package.resolved   # "version" must be 2.14.2 or newer
  ```

## Performance

Frame rates on iPhone and Mac for both models are on the [performance page](/performance).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `be_essence2_create` returns `-3`, or `create` throws `meteringRefused`: *no API secret was found* | no secret | call `Essence2Credential.set` / `Expression2Credential.set`, or set `BITHUMAN_API_SECRET` in the scheme |
| *the API secret was rejected (401)* | revoked or mistyped secret | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys) |
| *cannot reach bitHuman to verify your credential* | no network at first contact; in a Mac app, no Outgoing Connections entitlement | fix the network or the entitlement, then create again |
| `pull()` keeps returning `nil` right after `feed()` | frames arrive asynchronously | poll, as in the first frame |
| crash in `__cxa_finalize` when the app quits | `be_essence2_quiesce_all()` was not called | call it from `applicationWillTerminate` |
| `unable to resolve module dependency: 'Expression2'` on a Simulator build | the default destination also builds x86_64 | add `ARCHS=arm64` |
| a link error naming `BithumanEngineProtocol` | that product was added beside `Expression2`, which already contains it | depend on `Expression2` only |
| `ld: warning: Could not find or use auto-linked framework 'CoreAudioTypes'` | a harmless linker option in the Essence 2 library | nothing; the link succeeds |
| the app is killed mid-conversation with no crash log | `bitHumanKit` exceeded the default memory limit | add the two Apple entitlements |
| `bitHuman needs an iPhone 16 Pro or newer` | `bitHumanKit`'s device floor | use `Expression2` or `Essence2` directly on that device |
| `401 MISSING_AUTH` downloading a model | the agent code and `model=` do not match a sample avatar | check the code, or send your API secret for your own agent |

## Reference

- [Apple API reference](/sdk/apple-api): every Swift and C entry point.
- Examples: [iOS Expression 2](/examples/swift-ios-expression2) · [iOS Essence 2](/examples/swift-ios-essence2) · [voice agent](/examples/swift-ios-voice-agent) · [macOS Expression 2](/examples/macos-expression2) (`swift run`).
- Sample avatars: [Ready-made avatars](/examples#ready-made-avatars). Your own agent's model: [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) with your API secret.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
