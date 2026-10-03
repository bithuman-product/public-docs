---
title: "Flutter troubleshooting"
description: "Fix Flutter plugin build and runtime errors by symptom."
section: platforms
group: "Flutter"
order: 40
type: troubleshooting
llms: troubleshooting
---

| Symptom | Cause | Fix |
|---|---|---|
| `UnsatisfiedLinkError` on an emulator | the engines are `arm64-v8a` only | run on a physical arm64 phone |
| `flutter pub get` fails: *version solving failed*, naming `bithuman` and an SDK version | the plugin needs Dart 3.11.5 or newer | upgrade Flutter to a release that ships Dart 3.11.5 or newer |
| The app shows a refusal and asks for a secret | no API secret, or a rejected one | enter a valid [API secret](/start/api-secret), or build with `--dart-define=BITHUMAN_API_SECRET=…` |
| Manifest merge fails on `minSdk` | the plugin needs `minSdk 29`, whichever model you use | set `minSdk = 29` in `android/app/build.gradle.kts` ([Install](/platforms/flutter#install)) |
| Expression 2 runs slowly on Android, or a library is reported missing | the engines' native libraries were compressed into the APK | set `packaging { jniLibs { useLegacyPackaging = true } }` ([Install](/platforms/flutter#install)) |
| `MissingPluginException` from `pushAudio` on Android | Android has no `pushAudio` | send 24 kHz speech with `playSpeakerPCM` ([Integrate into your app](/platforms/flutter/app#integrate-into-your-app)) |
| On iOS or macOS the lips move but nothing is heard | `pushAudio` drives the lips only | call `audioStart(enableMic: false)`, then `playSpeakerPCM` |
| `PlatformException(unsupported)` from `load` on Android | `engine:` left out, or a name Android does not know | pass `engine: 'expression2'` or `engine: 'essence2'` |
| On iOS or macOS the avatar never becomes ready | no API secret, or a refused one: the Apple engines do not throw for it | pass a valid `apiSecret:` to `load` |
| `load` throws `BithumanModelRejected` (`MODEL_REJECTED`) | the engine refused the avatar file | see [Flutter errors](/platforms/flutter/errors#loading-an-avatar) |
| A voice session ends with `FORBIDDEN` as it starts | the model needs an entitlement: the session's default `gpt-realtime` does | pass `model: 'gpt-realtime-mini'` |
| A voice session ends with `PAYWALL`, `INSUFFICIENT_BALANCE` or `PLAN_REQUIRED` | no minutes, no credits, or the plan does not include it | see [Flutter errors](/platforms/flutter/errors#voice-session) |
| `pod install` fails on iOS or macOS | the deployment target is below iOS 16 or macOS 13 | raise the Podfile platform and the Runner targets |
| The iOS or macOS build cannot find the engines | the bootstrap step was skipped | run `scripts/bootstrap.sh` in the plugin's folder, then build again |
| A macOS link error names `llama` or `onnxruntime` | the Homebrew libraries are missing | `brew install llama.cpp onnxruntime` |
