---
title: "Swift / iOS — Hello, avatar"
description: "Boot a real-time, lip-synced on-device bitHuman avatar on iPhone or iPad with SwiftUI and the bitHumanKit SwiftPM package."
section: examples
group: "Examples"
order: 13
---

> ★ **Read the device floor before you clone.** This example is the
> `bitHumanKit` umbrella, and it is the most demanding Apple path bitHuman has:
> it needs an **iPhone 16 Pro or later**, a **~1.6 GB** first-launch download,
> and **two memory entitlements Apple takes 1–3 business days to approve**.
> On any other Apple Silicon iPhone `HardwareCheck.evaluate()` refuses it at
> launch and you see the unsupported screen, not an avatar.
>
> If what you want is *an on-device avatar frame on the iPhone you already
> have*, take the **`Expression2`** product instead: no device gate, no
> entitlement, no 1.6 GB download — measured on 2026-09-09 it rendered
> **416x720 frames on an iPhone 15**. There is a complete app for it, every
> file printed in full:
> [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2).
> Its limits are stated with the measurement on
> [Expression 2 on-device](/sdk/ios#minimal-code).

## Prerequisites

- A bitHuman API key, exposed to the app as `BITHUMAN_API_KEY` (Apple convention) — get one at [Developer → API Keys](https://www.bithuman.ai/developer/api-keys); see [Authentication](/api/authentication).
- **Xcode 26+** on a Mac, plus an Apple Developer account. Add the SwiftPM package:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")
```

- Device floor (real hardware — the Simulator can't run on-device inference): **iPhone 16 Pro or later** (A18 Pro+), or **iPad Pro M4 or later**, on **iOS / iPadOS 26+**. Earlier devices are refused at launch by `HardwareCheck.evaluate()`.
- Apple-approved **memory entitlements** — without them iOS terminates the app mid-conversation. Request both before you start (Apple takes 1–3 business days): `com.apple.developer.kernel.increased-memory-limit` and `com.apple.developer.kernel.extended-virtual-addressing`.

> **Note** This rail is **preview**. This example uses the **`bitHumanKit`** product (`import bitHumanKit`) — an umbrella framework bundling an on-device avatar engine, an `.imx` avatar runtime, and the renderer views, with all third-party deps statically linked (zero transitive SwiftPM dependencies). Prefer **Essence** for production iPhone builds.
>
> ★ **Corrected 2026-09-06 — this is not an Apple build of `expression-1`.** This note used to say *"iPhone Expression 1 (this example) is preview … on-device validation of that engine is still in progress"*, which read as if an Apple port of the [`expression-1`](/concepts/expression-1) model were on its way. It is not: `expression-1` is **GPU-only** and has no macOS, iPadOS or iOS build ([where each model runs](/concepts/where-models-run)). What `bitHumanKit` bundles is the umbrella's own on-device engine, reached through the `VoiceChat` / `AvatarConfig` API below.
>
> The package also vends **`Expression2`** — a separate product and a separate engine ([`expression-2`](/concepts/expression-2)) — which *has* rendered on an iPhone. As of **2.6.0** it takes a model path and can open the `<code>.avatar` you download for your own agent; it still ships no weights of its own. This example does not use it: see [Expression 2 on-device](/sdk/ios#minimal-code). Since **2.7.0** it also vends **`Essence2`**, the [`essence-2`](/concepts/essence-2) engine's C interface, which builds for iOS device, iOS simulator and macOS but has no in-app model download route yet: [Essence 2 on-device](/sdk/ios#install).

## Run it

1. Open the example folder in Xcode (`File → Open` → select the folder containing `Package.swift`):

```bash
git clone https://github.com/bithuman-product/homebrew-bithuman.git
open homebrew-bithuman/Examples/swift/ios-avatar/Package.swift
```

2. Set the API key in the scheme: `Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables`, add `BITHUMAN_API_KEY`. Never hardcode it.

3. Select a physical iPhone 16 Pro or iPad Pro M4+, then Build and Run.

> **Fixed 2026-09-09 — until this date step 1 could not be completed.** Every
> Swift example in that repository, this one included, pinned
> `from: "0.8.1"`. The 0.x tags carry Homebrew formula files and no
> `Package.swift`, so opening it in Xcode failed at resolve with
> `error: the package manifest at '/Package.swift' cannot be accessed`. The
> `HardwareCheck` switch above then failed to compile for a second reason (see
> the `@unknown default` note in the code). Both are fixed on that repository's
> `main`, which is what `git clone` gives you — measured after the fix on
> macOS 26.6.2 / Xcode 26.3: `xcodebuild -scheme IOSAvatar -destination
> 'generic/platform=iOS'` → `** BUILD SUCCEEDED **`. If you cloned earlier,
> `git pull`.

## What you'll see

On first launch the app downloads the Expression weights (~1.6 GB, cached), warms the model, then shows a live circular avatar that says "live — talk to me". Speak and the avatar answers and lip-syncs the reply at 25 fps, fully on-device with sub-200 ms latency. Under-spec devices instead show an "unsupported device" screen.

## Full code

The minimal shape: a `HardwareCheck` gate, then a `VoiceChat` that boots the avatar. The full app (`Sources/IOSAvatarApp.swift`) adds the render-host wiring and lifecycle phases.

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
            // 1. Download / verify the Expression weights (~1.6 GB, cached).
            let weights = try await ExpressionWeights.ensureAvailable { _ in }
            phase = .warming

            // 2. Configure a voice chat with an avatar.
            let agent = AgentCatalog.defaultAgent
            var config = VoiceChatConfig()
            config.systemPrompt = agent.systemPrompt
            config.avatar = AvatarConfig(modelPath: weights,
                                         portraitPath: AgentCatalog.thumbnailURL(for: agent)!)
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

Full source: [GitHub](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/swift/ios-avatar)

## Next steps

- [Swift / iOS — expression-2 on-device](/examples/swift-ios-expression2) — the same goal without the device floor, the entitlements or the 1.6 GB download.
- [Swift SDK](/sdk/ios) — the full Apple SDK reference.
- [LiveKit integration](/sdk/livekit) — connect to a server-hosted agent.
- [AI voice chat](/examples/ai-conversation) — add a conversational brain.
- [macos-voice example](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/swift/macos-voice) — offline macOS voice agent: no avatar, no API key.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
