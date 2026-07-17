---
title: "Swift / iOS — Hello, avatar"
description: "Boot a real-time, lip-synced on-device bitHuman avatar on iPhone or iPad with SwiftUI and the bitHumanKit SwiftPM package."
section: examples
group: "Examples"
order: 13
---

## Prerequisites

- A bitHuman API key, exposed to the app as `BITHUMAN_API_KEY` (Apple convention) — get one at [Developer → API Keys](https://www.bithuman.ai/#developer); see [Authentication](/api/authentication).
- **Xcode 26+** on a Mac, plus an Apple Developer account. Add the SwiftPM package:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "0.8.2")
```

- Device floor (real hardware — the Simulator can't run on-device inference): **iPhone 16 Pro or later** (A18 Pro+), or **iPad Pro M4 or later**, on **iOS / iPadOS 26+**. Earlier devices are refused at launch by `HardwareCheck.evaluate()`.
- Apple-approved **memory entitlements** — without them iOS terminates the app mid-conversation. Request both before you start (Apple takes 1–3 business days): `com.apple.developer.kernel.increased-memory-limit` and `com.apple.developer.kernel.extended-virtual-addressing`.

> **Note** This rail is **preview**. The SwiftPM product is **`bitHumanKit`** (`import bitHumanKit`) — an umbrella framework bundling the Expression avatar engine, the Essence (`libessence`) runtime, and the renderer views, with all third-party deps statically linked (zero transitive SwiftPM dependencies). **iPhone Expression (this example) is preview** — it runs on iPhone 16 Pro+, but on-device validation is still in progress, so prefer Essence for production iPhone builds (see [Models](/concepts/models) and the [Swift SDK matrix](/sdk/swift)).

## Run it

1. Open the example folder in Xcode (`File → Open` → select the folder containing `Package.swift`):

```bash
git clone https://github.com/bithuman-product/homebrew-bithuman.git
open homebrew-bithuman/Examples/swift/ios-avatar/Package.swift
```

2. Set the API key in the scheme: `Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables`, add `BITHUMAN_API_KEY`. Never hardcode it.

3. Select a physical iPhone 16 Pro or iPad Pro M4+, then Build and Run.

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

- [Swift SDK](/sdk/swift) — the full Apple SDK reference.
- [LiveKit integration](/sdk/livekit) — connect to a server-hosted agent.
- [AI voice chat](/examples/ai-conversation) — add a conversational brain.
- [macos-voice example](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/swift/macos-voice) — offline macOS voice agent: no avatar, no API key.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
