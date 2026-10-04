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

The avatar is a `Texture` in your widget tree. Pass `engine:` every time, `'expression2'` or `'essence2'`: leave it out and Android refuses the load (`unsupported`). On Android the first argument to `load` is the agent code; the plugin downloads the avatar and keeps it.

```dart
import 'package:bithuman/bithuman.dart';

final avatar = await BithumanAvatar.load(
  'A23WJF0199',            // on Android, the agent code
  engine: 'expression2',   // required: 'expression2' or 'essence2'
  apiSecret: secret,
);

Texture(textureId: avatar.textureId);        // the avatar in your layout

await avatar.audioStart(enableMic: false);   // the speaker; required on iOS and macOS
await avatar.playSpeakerPCM(chunk);          // Uint8List, 24 kHz mono PCM16: heard, and the lips follow
await avatar.notifyTurnEnd();                // after the reply's last chunk
await avatar.interrupt();                    // cut the current reply
await avatar.dispose();                      // release the engine
```

| Job | Call |
|---|---|
| Show the avatar | `Texture(textureId: avatar.textureId)`; `frameWidth` and `frameHeight` give its size |
| Start the speaker | `audioStart(enableMic: false)`, once, before the first chunk |
| Play your speech | `playSpeakerPCM(Uint8List)`, 24 kHz mono PCM16, chunk by chunk; the same audio drives the lips |
| End a reply | `notifyTurnEnd()` after the last chunk, so the last word is not clipped |
| Know it is ready | `isReady`, or `await avatar.ready`; audio sent before it is dropped |
| Interrupt the reply | `interrupt()` |
| Stop | `audioStop()`, then `dispose()` |
| Pick the model | `engine: 'expression2'` or `engine: 'essence2'` (required) |

**A voice conversation instead of your own audio:** `BithumanRealtimeSession(apiKey: secret, avatar: avatar, model: 'gpt-realtime-mini')` from `package:bithuman/bithuman_realtime.dart` connects the avatar to bitHuman's [realtime relay](/api/realtime) with your API secret, billed 10 credits a minute with the avatar included. Show `spokenTranscriptStream` as captions and handle `errorStream` ([Flutter errors](/platforms/flutter/errors)).

## Complete example

The [`avatar_chat` app](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) is a complete voice conversation with idle motion and interruption, in one layout for every platform. From plugin 2.6.20 its voice session connects through bitHuman's [realtime relay](/api/realtime) with your API secret; no token is minted.

## Platform notes

- **Android build settings:** the plugin needs `minSdk 29` whichever model you use, `arm64-v8a` only, and `useLegacyPackaging = true` ([Install](/platforms/flutter#install)).
- **Your own voice pipeline:** any speech your stack produces works: resample it to 24 kHz mono PCM16 and send it through `playSpeakerPCM`, as above. `pushAudio` is not the call for this: on iOS and macOS it moves the lips with no sound (on Android it plays from plugin 2.6.36).
- **Sign-out:** call `BithumanAvatar.clearCredentials()` when an account signs out (plugin 2.6.36 or newer). The engines forget the secret, and on Android every load still running ends with `load_cancelled`. On iOS and macOS, set the Expression 2 agent folder again (`setExpression2AgentDir`) before the next load that needs one.
- **Errors:** what `load` throws and why a voice session ends are on [Flutter errors](/platforms/flutter/errors).
- **Captions:** with the plugin's realtime session, show `spokenTranscriptStream` rather than `botTranscriptStream`. It releases the agent's words as they are heard, so the caption keeps pace with the voice; each event holds the reply's caption so far, and a cut reply ends with only the words heard (plugin 2.6.27 or newer).
- **iOS (16+) and macOS (26+, Apple silicon) builds:** run the plugin's `scripts/bootstrap.sh` once (it downloads the published engines and checks their sha256; for a git dependency the plugin's folder is `packages/flutter-plugin` under `~/.pub-cache/git/homebrew-bithuman-…`), raise the deployment targets (`platform :ios, '16.0'` in `ios/Podfile`, `platform :osx, '26.0'` in `macos/Podfile`, and the Runner targets to match), and on macOS run `brew install llama.cpp onnxruntime`, which the plugin links. macOS needs 26.0 in plugin 2.6.36 while one of the plugin's macOS libraries is rebuilt for older macOS; 2.6.35 and earlier declared 13.0. Essence 2 renders on iOS 26 and macOS 26 and later; Expression 2 runs on every version the pod supports.
- **Versions:** each plugin tag fixes the Android SDK versions it uses. The current tag and its line are on [Downloads & versions](/downloads).

## Reference

- [Flutter errors](/platforms/flutter/errors): the codes `load` throws and the codes a voice session ends with.
- [Android](/platforms/android): the engines under the plugin, their API and their settings.
- [`avatar_chat` example](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) and the [plugin source](https://github.com/bithuman-product/homebrew-bithuman/tree/main/packages/flutter-plugin).
- [Changelog](/changelog) and [Downloads & versions](/downloads).
