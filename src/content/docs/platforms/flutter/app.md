---
title: "Build a Flutter app"
description: "Stream audio into a Flutter avatar and show its frames in your app."
section: platforms
group: "Flutter"
order: 30
type: platform-app
llms: apps
claims: ["S1", "S2", "S8", "S10", "S26", "S30", "S32"]
next: ["/platforms/flutter/troubleshooting", "/platforms/flutter"]
---

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

## Complete example

The [`avatar_chat` app](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) is a complete voice conversation with idle motion and interruption, in one layout for every platform. From plugin 2.6.20 its voice session connects through bitHuman's [realtime relay](/api/realtime) with your API secret; no token is minted.

## Platform notes

- **Two models in one app:** `essence2-android` needs `minSdk 29`; raise the app to 29.
- **Your own voice pipeline:** any speech your stack produces works, as 16 kHz mono PCM through `pushAudio`.
- **Captions:** with the plugin's realtime session, show `spokenTranscriptStream` rather than `botTranscriptStream`. It releases the agent's words as they are heard, so the caption keeps pace with the voice; each event holds the reply's caption so far, and a cut reply ends with only the words heard (plugin 2.6.27 or newer).
- **iOS (16+) and macOS (13+, Apple silicon) builds:** run the plugin's `scripts/bootstrap.sh` once (it downloads the published engines and checks their sha256; for a git dependency the plugin's folder is `packages/flutter-plugin` under `~/.pub-cache/git/homebrew-bithuman-…`), raise the deployment targets (`platform :ios, '16.0'` in `ios/Podfile`, `platform :osx, '13.0'` in `macos/Podfile`, and the Runner targets to match), and on macOS run `brew install llama.cpp onnxruntime`, which the plugin links.
- **Versions:** each plugin tag fixes the Android SDK versions it uses. The current tag and its line are on [Downloads & versions](/downloads).

## Reference

- [Android](/platforms/android): the engines under the plugin, their API and their settings.
- [`avatar_chat` example](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) and the [plugin source](https://github.com/bithuman-product/homebrew-bithuman/tree/main/packages/flutter-plugin).
- [Changelog](/changelog) and [Downloads & versions](/downloads).
