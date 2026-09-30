---
title: "Flutter"
description: "The Flutter plugin renders Essence 2 and Expression 2 on Android phones, inside a Flutter app."
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
next: ["/platforms/android", "/platforms/ios", "/deploy/on-device"]
---

One Flutter dependency gives your app an avatar widget. On Android the plugin runs the same engines as the [Android SDK](/platforms/android), so the avatar renders on the phone: 16 kHz mono speech goes in, and a lip-synced picture comes out as a Flutter `Texture`.

```why-on-device
flutter
```

| Platform | What the plugin does |
|---|---|
| **Android** (arm64-v8a, a physical device) | renders Essence 2 and Expression 2 on the phone; the engines resolve from Maven Central, and the example app builds from a clone |
| **iOS** (16 or newer) | builds from the published tag after the plugin's bootstrap step. For an iPhone or iPad app that renders on the device, use the [Swift package](/platforms/ios) |
| **macOS** (13 or newer, Apple silicon) | builds from the published tag after the bootstrap step and two Homebrew libraries. For a Mac app, the [Swift package](/platforms/macos) is the documented path |

## Before you start

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
      ref: flutter-plugin-v2.6.22
```

Then run `flutter pub get`. On Android, Gradle resolves `ai.bithuman:essence2-android` and `ai.bithuman:expression2-android` from Maven Central; nothing else to fetch.

For an iOS or macOS build, three more steps:

1. Run the plugin's `scripts/bootstrap.sh` once. It downloads the published engines and checks their sha256. For a git dependency, the plugin's folder is `packages/flutter-plugin` under `~/.pub-cache/git/homebrew-bithuman-…`.
2. Raise the deployment targets: `platform :ios, '16.0'` in `ios/Podfile`, `platform :osx, '13.0'` in `macos/Podfile`, and the Runner targets to match.
3. On macOS only: `brew install llama.cpp onnxruntime`. The plugin links both.

## Authenticate

The engines check your API secret when an avatar loads: pass it to `BithumanAvatar.load(…, apiSecret:)`. The example app asks for it on first launch and keeps it in the Android Keystore, or you can pass `--dart-define=BITHUMAN_API_SECRET=…` when you build. A shipped app holds the secret on the device, so give each app its own secret that you can rotate or revoke ([API secrets](https://www.bithuman.ai/developer/api-keys)).

Credits pay for active session time, talking or idle, billed to the second ([pricing](/pricing)).

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

## Complete example

The [`avatar_chat` app](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) is a complete voice conversation with idle motion and interruption, in one layout for every platform. From plugin 2.6.20 its voice session connects through bitHuman's [realtime relay](/api/realtime) with your API secret; no token is minted.

## Integrate into your app

The avatar is a `Texture` in your widget tree. On Android the first argument to `load` is the agent code:

```dart
// excerpt: app/avatar_chat/lib/main.dart (bithuman-examples)
import 'package:bithuman/bithuman.dart';

await BithumanAvatar.setExpression2AgentDir('A23WJF0199');
final avatar = await BithumanAvatar.load('A23WJF0199', engine: 'expression2', apiSecret: secret);

Texture(textureId: avatar.textureId);   // the avatar in your layout
avatar.pushAudio(pcm);                   // Int16List, 16 kHz mono speech
avatar.interrupt();                      // cut the current reply
await avatar.dispose();                  // release the engine
```

| Job | Call |
|---|---|
| Show the avatar | `Texture(textureId: avatar.textureId)`; `frameWidth` and `frameHeight` give its size |
| Stream speech | `pushAudio(Int16List)`, 16 kHz mono |
| Know it is ready | `isReady`; audio pushed before it is dropped |
| Interrupt the reply | `interrupt()` |
| Stop | `dispose()` |
| Pick the model | `engine: 'expression2'` or `engine: 'essence2'` |

## Platform notes

- **Two models in one app:** `essence2-android` needs `minSdk 29`; raise the app to 29.
- **Your own voice pipeline:** any speech your stack produces works, as 16 kHz mono PCM through `pushAudio`.
- **Versions:** each plugin tag fixes the Android SDK versions it uses. The current tag and its line are on [Downloads & versions](/downloads).

## Performance

The plugin runs the Android SDK's own engines (the same native libraries), so the Android rows apply:

```perf
android-s25plus android-s25plus-sustained
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `UnsatisfiedLinkError` on an emulator | the engines are `arm64-v8a` only | run on a physical arm64 phone |
| The app shows a refusal and asks for a secret | no API secret, or a rejected one | enter a valid secret, or build with `--dart-define=BITHUMAN_API_SECRET=…` |
| Manifest merge fails on `minSdk` | Essence 2 needs `minSdk 29` | raise the app to 29 |
| `pod install` fails on iOS or macOS | the deployment target is below iOS 16 or macOS 13 | raise the Podfile platform and the Runner targets |
| The iOS or macOS build cannot find the engines | the bootstrap step was skipped | run `scripts/bootstrap.sh` in the plugin's folder, then build again |
| A macOS link error names `llama` or `onnxruntime` | the Homebrew libraries are missing | `brew install llama.cpp onnxruntime` |

## Reference

- [Android](/platforms/android): the engines under the plugin, their API and their settings.
- [`avatar_chat` example](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) and the [plugin source](https://github.com/bithuman-product/homebrew-bithuman/tree/main/packages/flutter-plugin).
- [Changelog](/changelog) and [Downloads & versions](/downloads).
