---
title: "iOS example: on-device voice agent"
description: "A whole voice conversation on an iPhone or iPad: speech recognition, a language model, speech and a lip-synced avatar, all on the device with bitHumanKit. Needs an iPhone 16 Pro or newer and two Apple entitlements."
section: examples
group: "Examples"
order: 32
type: example
slug: examples/swift-ios-voice-agent
label: "iOS: voice agent"
---

A complete conversation on the device: speech recognition, a language model, speech synthesis and a lip-synced avatar, from one Swift package product, `bitHumanKit`. It is the most demanding Apple path, so check the requirements first. For an avatar on any Apple silicon iPhone with no entitlement, use the [iOS Expression 2 example](/examples/swift-ios-expression2).

## Requirements

| You need | Notes |
|---|---|
| An **iPhone 16 Pro** or newer, or an **iPad Pro M4** or newer, on iOS 26 | `HardwareCheck.evaluate()` shows an "unsupported device" screen on anything else; the Simulator cannot stand in |
| Two Apple entitlements: `com.apple.developer.kernel.increased-memory-limit` and `com.apple.developer.kernel.extended-virtual-addressing` | request them under developer.apple.com → Account → Membership → *Request Additional Capabilities*; Apple usually answers in 1–3 business days. Without them iOS stops the app mid-conversation at its default memory ceiling |
| A Mac with Xcode 26 or newer, and an Apple Developer team | |
| An [API secret](/start/api-secret) | avatar mode bills talking time; idle is free |
| About 1.6 GB free on the device | the on-device model downloads on first launch and is cached |

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-avatar
```

`swift/ios-avatar` is a Swift package with the app's source, not an Xcode app project. You make the app target and add the source to it.

## Set up the app

1. **Make the app:** Xcode → *File → New → Project → App*, SwiftUI, Minimum Deployments **iOS 26.0**, Swift 6, your team under *Signing & Capabilities*.
2. **Add the package:** *File → Add Package Dependencies…*, `https://github.com/bithuman-product/homebrew-bithuman.git`, from **2.14.2**, product **`bitHumanKit`** only.
3. **Add the entitlements:** *Signing & Capabilities → + Capability*, add *Increased Memory Limit* and *Extended Virtual Addressing*. Xcode writes the `.entitlements` file. (Entitlements in an `Info.plist` grant nothing.)
4. **Add the privacy strings:** copy `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` from `Sources/Info.plist` into your app's `Info.plist`.
5. **Add the source:** copy `Sources/IOSAvatarApp.swift` into the app target and delete the `ContentView` Xcode generated, so there is one `@main`.

## Set your API secret

*Product → Scheme → Edit Scheme → Run → Environment Variables*, add `BITHUMAN_API_SECRET`. The app passes it to `bitHumanKit` as `config.apiKey`.

## Run it

Select your iPhone 16 Pro or iPad Pro and press **Run**.

## Expected output

The first launch downloads the on-device model (about 1.6 GB), warms it, then shows a round avatar and "live — talk to me". Speak, and the avatar answers out loud with its lips in sync, all on the device. The linker prints *"object file … was built for newer 'iOS' version (26.0)"* once per engine object; that is expected.

## How it works

`IOSAvatarApp.swift` gates on the hardware, then starts a `VoiceChat` with an avatar:

```swift
let weights = try await ExpressionWeights.ensureAvailable { _ in }   // ~1.6 GB, cached
let agent = AgentCatalog.defaultAgent
guard let portrait = AgentCatalog.thumbnailURL(for: agent) else { return }
var config = VoiceChatConfig()
config.systemPrompt = agent.systemPrompt
config.avatar = AvatarConfig(modelPath: weights, portraitPath: portrait)
config.apiKey = ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"]
let chat = VoiceChat(config: config)
try await chat.start()
let view = AvatarRendererView(frame: .zero, idleFrame: chat.initialIdleFrame, clipMode: .circle)
```

The full file adds the download progress, the frame pump and barge-in (interrupting the avatar by speaking). The products and their device floors are on [Apple](/sdk/apple).

## Make it your own

- **Another persona:** set `config.systemPrompt` to your own instructions.
- **Voice only:** leave `config.avatar` unset for an audio-only assistant; [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) is that shape on a Mac, with no API secret.
- **Ship it:** fetch the secret from your backend or the Keychain at launch; never put it in the app bundle.

## Troubleshooting

| Symptom | Fix |
|---|---|
| The "unsupported device" screen | use an iPhone 16 Pro / iPad Pro M4 or newer, or ship [Expression 2](/examples/swift-ios-expression2) on that device |
| The app is stopped mid-conversation, no crash log | the entitlements are not granted yet, or not in your provisioning profile: check Apple's reply, then rebuild |
| The microphone never opens | the privacy strings are missing from your app's `Info.plist`; iOS remembers a denial, so reinstall after adding them |
| No *Signing & Capabilities* tab, or **Run** is greyed out | you opened `Package.swift`; make an app project that depends on the package (step 1) |
| The avatar never starts and the error mentions a key | add `BITHUMAN_API_SECRET` to the Run scheme's environment |

## Next

- [iOS example: Expression 2](/examples/swift-ios-expression2) · [iOS example: Essence 2](/examples/swift-ios-essence2) · [Apple SDK](/sdk/apple) · [LiveKit](/sdk/livekit) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-avatar)
