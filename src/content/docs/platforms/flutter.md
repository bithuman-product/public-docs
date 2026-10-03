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
  first-frame: /platforms/flutter#run-your-first-avatar
  integrate-into-your-app: /platforms/flutter/app#integrate-into-your-app
  complete-example: /platforms/flutter/app#complete-example
  platform-notes: /platforms/flutter/app#platform-notes
  reference: /platforms/flutter/app#reference
  troubleshooting: /platforms/flutter/troubleshooting
---

One Flutter dependency gives your app an avatar widget. [Why on the device](/deploy/on-device).

## Before you start

On Android the plugin runs the same engines as the [Android SDK](/platforms/android), so the avatar renders on the phone: 16 kHz mono speech goes in, and a lip-synced picture comes out as a Flutter `Texture`.

Flutter renders on Android phones (arm64). For an iPhone, iPad or Mac app, use the [Swift package](/platforms/ios); the plugin's iOS and macOS builds are covered in [Flutter: Integrate into your app](/platforms/flutter/app).

| You need | Notes |
|---|---|
| Flutter 3 with the Android toolchain | JDK 17 and the Android SDK |
| A physical Android phone, arm64 | emulators cannot load the engines; Essence 2 needs Android 10 (API 29) or newer |
| An [API secret](/start/api-secret) | the Creator plan or higher; usage bills per second while the avatar runs ([pricing](/pricing)) |

## Install

The plugin is published as a tag in the `homebrew-bithuman` repository. Pin it in `pubspec.yaml`:

```yaml
dependencies:
  bithuman:
    git:
      url: https://github.com/bithuman-product/homebrew-bithuman.git
      path: packages/flutter-plugin
      ref: flutter-plugin-v2.6.34
```

Then run `flutter pub get`. On Android, Gradle resolves `ai.bithuman:essence2-android` and `ai.bithuman:expression2-android` from the repository the plugin declares, so you add no repository yourself.

## Authenticate

The engines check your API secret when an avatar loads: pass it to `BithumanAvatar.load(…, apiSecret:)`. For a local build, the example app asks for it on first launch and keeps it in the Android Keystore, or you pass `--dart-define=BITHUMAN_API_SECRET=…` when you build. A shipped app fetches the secret from your backend ([What a shipped app holds](/start/api-secret#what-a-shipped-app-holds)).
## Run your first avatar

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
