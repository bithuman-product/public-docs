---
title: "Swift / iOS — Hello, avatar"
description: "A complete on-device voice agent on iPhone or iPad — speech in, a language model, speech out and a lip-synced avatar — built on the bitHumanKit SwiftPM package. Needs an iPhone 16 Pro or newer and two Apple entitlements, so read the requirements first."
section: examples
group: "Examples"
order: 13
---

This example is the **whole conversation**: on-device speech recognition, a
language model, speech synthesis and a lip-synced avatar, from one SwiftPM
product (`bitHumanKit`). It is also the most demanding Apple path bitHuman has —
it needs recent hardware and two Apple entitlements that take days to be
granted, so check the requirements before you clone anything.

Want only *a rendered avatar frame on the iPhone in your pocket*? Take
[Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2)
instead: no device floor, no entitlement, no large download.

## Before you start

Work down this list in order. Step 1 is first because Apple's reply is the long
pole — everything else takes minutes.

1. **Request two Apple entitlements.** developer.apple.com → Account →
   Membership → *Request Additional Capabilities*, and ask for both:

   ```text
   com.apple.developer.kernel.increased-memory-limit
   com.apple.developer.kernel.extended-virtual-addressing
   ```

   Apple replies by email; it has taken **1–3 business days**. Without them iOS
   terminates the app mid-conversation, about half a minute into a live turn,
   when memory passes the ~3 GB default ceiling. The provisioning profile
   updates itself once they are granted. Full detail:
   [Apple entitlements](/sdk/ios#apple-entitlements).
2. **Check your device is above the floor.** This example needs an **iPhone 16
   Pro or later** (A18 Pro), or an **iPad Pro M4 or later** (16 GB), on **iOS /
   iPadOS 26 or newer**. `HardwareCheck.evaluate()` refuses anything else at
   launch and you get the unsupported screen, not an avatar. Explicitly refused:
   iPhone 15 Pro and earlier, iPhone 16 / 16 Plus (non-Pro A18), iPad Air M2 and
   M3, iPad Pro M1 and M2. The Simulator cannot stand in for the device.
3. **Install Xcode 26 or newer** on a Mac, and join an Apple Developer team.
   Older Xcodes reject the Swift 6 concurrency syntax the package is built with.
4. **Get an API key** — free at
   [Developer → API Keys](https://www.bithuman.ai/developer/api-keys). The Swift
   rail reads it as `BITHUMAN_API_KEY`; it is the same value every other surface
   reads as `BITHUMAN_API_SECRET` ([authentication](/api/authentication)).
   Avatar mode is metered ([pricing](/guides/pricing)); audio-only voice is not.
5. **Leave room for the weights.** On first launch the app downloads the
   on-device model — about **1.6 GB**, cached afterwards.

## Which example should I take?

| You want | Take | Floor |
|---|---|---|
| a rendered avatar frame on the phone you already own | [Expression 2 on the iPhone you have](/examples/swift-ios-expression2) | any Apple Silicon iPhone or iPad |
| the whole voice conversation, avatar included | this page (`bitHumanKit`) | iPhone 16 Pro / iPad Pro M4, iOS 26, two entitlements |
| the 1080p photoreal renderer in your own app | the `Essence2` product — [Swift SDK](/sdk/ios#can-i-ship-essence-2-on-iphone) | any Apple Silicon iPhone, M-series iPad or M3 Mac, OS 26 |

This page uses the **`bitHumanKit`** umbrella product (`import bitHumanKit`):
an on-device avatar engine, an `.imx` avatar runtime and the renderer views in
one framework, with every third-party dependency statically linked and zero
transitive SwiftPM dependencies. It is a **preview** rail.

`bitHumanKit` bundles its own engine. It is not an Apple build of
[`expression-1`](/concepts/expression-1), which is GPU-only and has no Apple
build at all ([where each model runs](/concepts/where-models-run)). The two
engine products in the same package — `Expression2` and `Essence2` — are
separate products with their own APIs, and this example uses neither: see
[Swift SDK](/sdk/ios#choose-an-engine).

## Run it

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
open bithuman-examples/swift/ios-avatar/Package.swift
```

That opens the example as a package in Xcode. Its `Package.swift` targets
iOS 26 and takes `bitHumanKit` from the tap at `from: "2.11.0"`, which resolves
the newest 2.x tag:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")
```

Then, in Xcode:

1. *Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables* →
   add `BITHUMAN_API_KEY` with your key. Never hard-code it in source.
2. *Signing & Capabilities* → select your team. The two entitlements are already
   declared in
   [`Sources/Info.plist`](https://github.com/bithuman-product/bithuman-examples/blob/main/swift/ios-avatar/Sources/Info.plist),
   beside the microphone and speech-recognition privacy strings; they only take
   effect once Apple has granted them.
3. Select a physical iPhone 16 Pro or iPad Pro M4+, then **Run**.

To build it from the command line instead — from a logged-in GUI session, since
signing needs a keychain identity:

```bash
xcodebuild -scheme IOSAvatar -destination 'generic/platform=iOS' \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=<YOUR_TEAM_ID> \
  -allowProvisioningUpdates build
```

If you cloned this repository before 2026-09-09, `git pull`: until then every
Swift example pinned a 0.x tag that carries no `Package.swift`, and Xcode failed
at resolve with `error: the package manifest at '/Package.swift' cannot be
accessed`.

## What you'll see

On first launch the app downloads the on-device weights (~1.6 GB, cached), warms
the model, then shows a live circular avatar that says "live — talk to me".
Speak, and the avatar answers and lip-syncs the reply entirely on the device.
Under-spec devices show an "unsupported device" screen instead — that is
`HardwareCheck.evaluate()` doing its job, not a failure.

## The code

The minimal shape: a `HardwareCheck` gate, then a `VoiceChat` that boots the
avatar. The full app (`Sources/IOSAvatarApp.swift`) adds the render-host wiring,
the frame pump and the lifecycle phases.

```swift
// IOSAvatarApp.swift — iOS voice agent with a lip-synced avatar
import SwiftUI
import UIKit
import bitHumanKit

@main
struct IOSAvatarApp: App {
    var body: some Scene {
        WindowGroup {
            switch HardwareCheck.evaluate() {
            case .supported:                 AvatarRootView()
            case .unsupported(let reason):   UnsupportedDeviceView(reason: reason)
            // Required. Without it the switch does not compile against the
            // shipped binary: "switch covers known cases, but
            // 'DeviceCapability' may have additional unknown values".
            @unknown default:                UnsupportedDeviceView(reason: "This device is not supported.")
            }
        }
    }
}

@MainActor
final class AvatarLifecycle: ObservableObject {
    @Published var phase: Phase = .idle
    @Published private(set) var renderer: AvatarRendererView?
    private var chat: VoiceChat?

    enum Phase: Equatable { case idle, warming, live, error(String) }

    func start() async {
        do {
            // 1. Download / verify the on-device weights (~1.6 GB, cached).
            let weights = try await ExpressionWeights.ensureAvailable { _ in }
            phase = .warming

            // 2. Configure a voice chat with an avatar.
            let agent = AgentCatalog.defaultAgent
            var config = VoiceChatConfig()
            config.systemPrompt = agent.systemPrompt
            config.avatar = AvatarConfig(modelPath: weights,
                                         portraitPath: AgentCatalog.thumbnailURL(for: agent))
            config.apiKey = ProcessInfo.processInfo.environment["BITHUMAN_API_KEY"]

            // 3. Start it and render frames into a view.
            let chat = VoiceChat(config: config)
            try await chat.start()
            self.chat = chat
            self.renderer = AvatarRendererView(frame: .zero,
                                               idleFrame: chat.initialIdleFrame,
                                               clipMode: .circle)
            self.phase = .live
        } catch {
            phase = .error(error.localizedDescription)
        }
    }
}
```

Full source:
[`swift/ios-avatar`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-avatar).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the "unsupported device" screen at launch | the device is below the floor — the refusal names the model it detected | use an iPhone 16 Pro / iPad Pro M4+, or ship [`Expression2`](/examples/swift-ios-expression2) on that device |
| the app is killed mid-conversation, no crash log | the ~3 GB memory ceiling: the entitlements are not granted yet, or not in the profile | check Apple's reply, then rebuild so the profile picks them up ([entitlements](/sdk/ios#apple-entitlements)) |
| `error: the package manifest at '/Package.swift' cannot be accessed` | a clone from before 2026-09-09, pinning a 0.x tag | `git pull` |
| the avatar never starts and the error mentions a key | `BITHUMAN_API_KEY` is not in the scheme's environment | add it under *Edit Scheme → Run → Arguments* |
| the microphone never opens | missing privacy strings; the OS caches the denial | keep `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` in `Info.plist` |
| a Simulator build succeeds and proves nothing | the hardware gate reads `hw.machine`, which in a Simulator is not your phone's | test on the device ([why](/sdk/ios#the-simulator-is-not-a-test-of-the-device)) |

## Next steps

- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) — the same goal without the device floor, the entitlements or the 1.6 GB download.
- [Swift SDK](/sdk/ios) — the full Apple reference: requirements, products, models, errors.
- [Apple — check before you ship](/examples/apple-swiftpm-check) — verify the package resolves, from any operating system.
- [LiveKit integration](/sdk/livekit) — connect to a server-hosted agent instead.
- [AI voice chat](/examples/ai-conversation) — add a conversational brain in Python.
- [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — offline macOS voice agent: no avatar, no API key.
- [Where each model runs](/concepts/where-models-run) — which model to ship, and which platforms it runs on.
