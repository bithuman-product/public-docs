---
title: "Flutter"
description: "The Flutter plugin renders Essence 2 and Expression 2 on Android, iOS and macOS."
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

On Android the plugin runs the same engines as the [Android SDK](/platforms/android), so the avatar renders on the phone: your app's speech audio goes in, and a lip-synced picture comes out as a Flutter `Texture`.

The plugin runs on Android phones (arm64), and on iPhone, iPad and Mac (Apple silicon) after one bootstrap step that fetches the engines ([Platform notes](/platforms/flutter/app#platform-notes)). A native iPhone or iPad app can use the [Swift package](/platforms/ios) instead.

| You need | Notes |
|---|---|
| Dart 3.11.5 or newer (the Flutter release that ships it), with the Android toolchain | JDK 17 and the Android SDK; an older Dart fails `flutter pub get` |
| A physical Android phone, arm64, Android 10 (API 29) or newer | emulators cannot load the engines; the plugin needs API 29 whichever model you use |
| An [API secret](/start/api-secret) | the Creator plan or higher; usage bills per second while the avatar runs ([pricing](/pricing)) |

## Install

The plugin is published on pub.dev as [`bithuman`](https://pub.dev/packages/bithuman). Add it to `pubspec.yaml`:

```yaml
dependencies:
  bithuman: ^3.0.0
```

Then run `flutter pub get`. On Android, Gradle resolves `ai.bithuman:essence2-android` and `ai.bithuman:expression2-android` from the repository the plugin declares, so you add no repository yourself.

In `android/app/build.gradle.kts`, set the plugin's floor and keep the engines' native libraries as they ship:

```kotlin
android {
    defaultConfig {
        minSdk = 29                         // the plugin's floor, whichever model you use
        ndk { abiFilters += "arm64-v8a" }   // the engines ship arm64-v8a only
    }
    packaging { jniLibs { useLegacyPackaging = true } }   // required
}
```

## Authenticate

The engines check your API secret when an avatar loads: pass it to `BithumanAvatar.load(…, apiSecret:)`. For a local build, the example app asks for it on first launch and keeps it in the Android Keystore, or you pass `--dart-define=BITHUMAN_API_SECRET=…` when you build. A shipped app fetches the secret from your backend ([What a shipped app holds](/start/api-secret#what-a-shipped-app-holds)).
## Run your first avatar

Build the example app for your phone, with the `wise-pup` sample avatar:

```bash
git clone https://gitlab.com/bithuman/sdk/bithuman-examples.git
cd bithuman-examples/flutter/avatar-chat
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
