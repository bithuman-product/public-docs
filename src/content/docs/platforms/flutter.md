---
title: "Flutter"
description: "The Flutter plugin renders Essence 2 and Expression 2 on Android phones."
section: platforms
group: "Flutter"
order: 10
type: platform
llms: apps
searchTitle: "Flutter: the bitHuman Flutter plugin"
renders: ["device"]
needs: ["Physical device", "API secret"]
artifacts: ["flutter_plugin"]
platforms: ["flutter", "android"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S8", "S10", "S26", "S30", "S32"]
next: ["/platforms/flutter/app", "/platforms/flutter/troubleshooting"]
moved:
  integrate-into-your-app: /platforms/flutter/app#integrate-into-your-app
  complete-example: /platforms/flutter/app#complete-example
  platform-notes: /platforms/flutter/app#platform-notes
  reference: /platforms/flutter/app#reference
  troubleshooting: /platforms/flutter/troubleshooting
---

One Flutter dependency gives your app an avatar widget. [Why on the device](/deploy/on-device).

## Before you start

On Android the plugin runs the same engines as the [Android SDK](/platforms/android), so the avatar renders on the phone: 16 kHz mono speech goes in, and a lip-synced picture comes out as a Flutter `Texture`.

| Platform | What the plugin does |
|---|---|
| **Android** (arm64-v8a, a physical device) | renders Essence 2 and Expression 2 on the phone; the plugin declares the repository the engines come from, and the example app builds from a clone |
| **iOS** (16 or newer) | builds from the published tag after the plugin's bootstrap step. For an iPhone or iPad app that renders on the device, use the [Swift package](/platforms/ios) |
| **macOS** (13 or newer, Apple silicon) | builds from the published tag after the bootstrap step and two Homebrew libraries. For a Mac app, the [Swift package](/platforms/macos) is the documented path |

| You need | Notes |
|---|---|
| Flutter 3 with the Android toolchain | JDK 17 and the Android SDK |
| A physical Android phone, arm64 | emulators cannot load the engines; Essence 2 needs Android 10 (API 29) or newer |
| An [API secret](/start/api-secret) | the Creator plan or higher |

## Install

The plugin is published as a tag in the `homebrew-bithuman` repository. Pin it in `pubspec.yaml`:

```yaml
dependencies:
  bithuman:
    git:
      url: https://github.com/bithuman-product/homebrew-bithuman.git
      path: packages/flutter-plugin
      ref: flutter-plugin-v2.6.31
```

Then run `flutter pub get`. On Android, Gradle resolves `ai.bithuman:essence2-android` and `ai.bithuman:expression2-android` from the repository the plugin declares, so you add no repository yourself.

For an iOS or macOS build, three more steps:

1. Run the plugin's `scripts/bootstrap.sh` once. It downloads the published engines and checks their sha256. For a git dependency, the plugin's folder is `packages/flutter-plugin` under `~/.pub-cache/git/homebrew-bithuman-…`.
2. Raise the deployment targets: `platform :ios, '16.0'` in `ios/Podfile`, `platform :osx, '13.0'` in `macos/Podfile`, and the Runner targets to match.
3. On macOS only: `brew install llama.cpp onnxruntime`. The plugin links both.

## Authenticate

The engines check your API secret when an avatar loads: pass it to `BithumanAvatar.load(…, apiSecret:)`. The example app asks for it on first launch and keeps it in the Android Keystore, or you can pass `--dart-define=BITHUMAN_API_SECRET=…` when you build. A shipped app holds the secret on the device, so give each app its own secret that you can rotate or revoke ([API secrets](https://www.bithuman.ai/developer/api-keys)).

Cost: active session time, to the second ([pricing](/pricing)).

## First frame

Build the example app for your phone, with the `wise-pup` sample avatar:

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/app/avatar_chat
flutter pub get
flutter run --release --dart-define=AGENT_CODE=A23WJF0199
```

<details class="expected">
<summary>Expected result</summary>

The app installs on the connected phone, asks for your API secret once, downloads the avatar (about 160 MB, first run only) and shows it idling full screen. Speak, or type a line, and it answers with its lips in sync.

</details>

## Performance

The plugin runs the Android SDK's own engines (the same native libraries), so the Android rows apply:

```perf
android-s25plus android-s25plus-sustained
```
