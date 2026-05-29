---
title: "Swift / iOS — Hello, avatar"
description: "Render a real-time on-device bitHuman avatar on iPhone or iPad in ~40 lines of SwiftUI."
section: examples
group: "Examples"
order: 13
---

## Overview

The smallest runnable iOS program that drives a bitHuman avatar on-device. Sub-200 ms latency, no cloud round-trip for rendering.

> **Note** Swift / Apple is GA. The currently-published SwiftPM package is **bitHumanKit** (the full-stack on-device framework used below). A newer `libessence`-based `Bithuman` streaming binding is rolling out — until it lands, integrate against `bitHumanKit` as shown here.

## Prerequisites

- **Xcode 16+**, iOS 26.0+ deployment target.
- An iPhone 17 Pro+ or iPad Pro M4+ for on-device Essence. (Expression on iPhone is not supported yet — use Essence.)
- A `.imx` model file in your app bundle.
- A bitHuman API key exposed as `BITHUMAN_API_KEY` (Apple convention).

For the full hardware floor, see the [Swift SDK](/sdk/swift) page.

## 1. Add the SwiftPM dependency

In `Package.swift`:

```swift
dependencies: [
    .package(
        url: "https://github.com/bithuman-product/bithuman-sdk-public.git",
        from: "0.8.1"
    ),
],
targets: [
    .target(
        name: "MyApp",
        dependencies: [
            .product(name: "bitHumanKit", package: "bithuman-sdk-public"),
        ]
    )
]
```

Or in Xcode: **File → Add Package Dependencies…** → paste the URL → pick `0.8.1` or later.

## 2. Minimal SwiftUI view

```swift
// ContentView.swift
import SwiftUI
import bitHumanKit

@MainActor
final class AvatarVM: ObservableObject {
    @Published var currentFrame: CGImage?

    private var essence: EssenceRuntime?

    func start() async {
        guard let imxURL = Bundle.main.url(forResource: "avatar", withExtension: "imx") else { return }

        do {
            let runtime = try await Bithuman.createRuntime(modelPath: imxURL)
            if case .essence(let essence) = runtime {
                self.essence = essence
                for await frame in essence.frames() {
                    if let frame { self.currentFrame = frame }
                }
            }
        } catch {
            print("createRuntime failed: \(error)")
        }
    }

    /// Push 16 kHz mono PCM in as audio arrives (mic, TTS, WebRTC).
    func push(_ pcm: Data) async {
        try? await essence?.pushAudio(pcm)
    }
}

struct ContentView: View {
    @StateObject private var vm = AvatarVM()

    var body: some View {
        Group {
            if let cg = vm.currentFrame {
                Image(uiImage: UIImage(cgImage: cg))
                    .resizable().scaledToFit()
            } else {
                ProgressView("Loading…")
            }
        }
        .task { await vm.start() }
    }
}
```

That's the whole pipeline: bundled `.imx` in, `CGImage` frames at 25 fps on the main actor, fully on-device. Wire `vm.push(pcm)` to your audio source (mic, TTS, WebRTC) to make it lip-sync.

A complete runnable reference is at [Examples/swift/ios-avatar](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/ios-avatar) — same shape, with `HardwareCheck.evaluate()`, memory entitlements, and full lifecycle wiring.

> **Note** The sibling [`essence-playback`](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/essence-playback) example targets an SDK API surface that has not yet shipped (does not build against the current 0.8.x XCFramework). Use `ios-avatar` until that lands.

## Where to go next

- [Swift SDK](/sdk/swift) — full walkthrough: voice agent, lifecycle, entitlements, device matrix.
- [ios-avatar project](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/ios-avatar) — a complete runnable SwiftUI iOS reference app.
- [macos-voice project](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/macos-voice) — offline macOS voice agent: no avatar, no API key.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
