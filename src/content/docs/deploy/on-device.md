---
title: "On the device"
description: "Essence 2 and Expression 2 render on the device in front of the user."
section: deploy
group: "Where it renders"
order: 40
type: deploy
llms: deploy
availability: "creator"
renders: ["device", "browser"]
needs: ["Physical device"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S8", "S10", "S13", "S24", "S26", "S29", "S30", "S31", "S32"]
next: ["/platforms/ios", "/platforms/android", "/platforms/web"]
moved:
  models-available-here: /deploy#compare
  choosing-between-modes: /deploy#compare
---

## What it is

The avatar renders inside your app on the device in front of the user: iPhone, iPad and Mac with the [Swift package](/platforms/ios), Android phones with the [Android SDK](/platforms/android) or the [Flutter plugin](/platforms/flutter), or the visitor's browser tab with [WebGPU](/platforms/web). There is no render server to run.

The mobile SDKs take any 16 kHz mono speech your pipeline produces and return frames, so any speech-recognition, language-model and voice stack works.

Compare every mode: [Deployment options](/deploy#compare).

## Where it renders

```dataflow
device
```

```diagram
topology device
```

- **In your app:** when the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text.
- **On Android:** after the one-time model download, the only network traffic is usage reporting.

```why-on-device
web
```

## Speed

Measured on the device, including 10-minute held runs:

```perf
iphone-15 iphone-15-sustained android-s25plus android-s25plus-sustained web macos-sdk
```

## Price

```price
device
```

## Limits

Essence 1 and Expression 1 are not available on phones or in the Swift package.

- **Network:** a session checks your credential when it starts and keeps rendering through a network drop of up to 5 minutes.
- **Devices:** Android, and Essence 2 on iPhone and iPad, need a physical device, not an emulator or the Simulator; Expression 2 also runs in the iOS Simulator. Essence 2 on Apple needs iOS 26 or macOS 26.
- **Sessions:** on-device sessions are limited by credits, not by a session cap.
- **First run:** each avatar downloads once (about 160–370 MB, by model and platform), then stays on the device.

## First command

```swift tab="iOS & iPadOS"
// Package.swift (or Xcode → Add Package Dependencies)
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.19.4")
```

```kotlin tab="Android"
// settings.gradle.kts, in dependencyResolutionManagement { repositories { … } }
exclusiveContent {   // ai.bithuman resolves from bitHuman's repository only
    forRepository { maven { url = uri("https://maven.bithuman.ai") } }
    filter { includeGroup("ai.bithuman") }
}
// app/build.gradle.kts
implementation("ai.bithuman:expression2-android:0.5.2")
```

```bash tab="Mac"
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/macos-expression2 && ./setup.sh
BITHUMAN_API_SECRET="<your API secret>" swift run -c release MacOSExpression2
```

```html tab="Web"
<iframe src="https://www.bithuman.ai/embed/A23WJF0199?render=local" allow="microphone *"
        style="width:100%;height:600px;border:0"></iframe>
```

The whole first frame for each: [iOS & iPadOS](/platforms/ios#first-frame) · [Android](/platforms/android#first-frame) · [macOS](/platforms/macos#first-frame) · [Web](/platforms/web/webgpu).

