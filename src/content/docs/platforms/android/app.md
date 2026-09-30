---
title: "Build an Android app"
description: "Stream audio into an Android avatar and show its frames in your app."
section: platforms
group: "Android"
order: 30
type: platform-app
llms: apps
claims: ["S1", "S2", "S8", "S10", "S13", "S26", "S30", "S32"]
next: ["/platforms/android/troubleshooting", "/platforms/android/reference", "/platforms/android"]
---

## Integrate into your app

In a live conversation, keep one avatar open and stream into it.

| Job | Expression 2 | Essence 2 |
|---|---|---|
| Audio in | 16 kHz mono `FloatArray`, −1 to 1 | 16 kHz mono 16-bit little-endian PCM `ByteArray` |
| Stream audio as it arrives | `feed(chunk)` per chunk | `feed(chunk)` per chunk |
| Show frames | `pull(bitmap)`, 20 a second | `pull(buffer)`, 25 a second |
| End of a reply | `flushTail()` | `endOfAudio()` |
| Idle between replies | `avatar.idleLoop?.next(bitmap)` | `idle(buffer)` |
| Interrupt the reply | `resetState(true)` | `resetAudio()` |
| Check the session | `Expression2Exception` from `create` or `pull` | `Essence2MeteringRefused` from `pull`/`idle`; `checkRender()` throws `Essence2RenderFailed` if the engine stopped |
| Close it | `close()` | `close()` |

To feed the microphone, declare `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` in your manifest and ask for it at runtime (`ActivityResultContracts.RequestPermission`) before you start `AudioRecord`; without it the buffers are silent. The SDKs need only `INTERNET`, which their AARs merge in for you.

Resample 24 kHz speech (OpenAI Realtime's) to 16 kHz, and close the avatar when the app leaves the screen: [Companion app](/build/companion-app#resample-speech-to-16-khz).

After your API secret is accepted, a network loss does not stop the session for 5 minutes of rendered video. After that, render calls throw a retryable exception until the connection returns. Usage is reported to your account when it does.

For a Flutter app, the [Flutter plugin](/platforms/flutter) wraps these engines.

## Complete example

Two apps you can clone and run on a phone, each with idle motion between replies:

- [Android Expression 2](/examples/android-expression-2): the `wise-pup` sample avatar.
- [Android Essence 2](/examples/android-essence-2): the `sofia-ramirez` sample avatar at full resolution.

## Platform notes

- **Release builds:** `isMinifyEnabled = true` needs nothing extra. Both AARs ship their own keep rules.
- **Two models in one app:** `essence2-android` needs `minSdk 29`. Raise the app to 29, or put each model in its own module.
- **Threads:** download and `create()` on a background thread. The first download is the size shown above, into app-private storage.
- **Check the version you resolved:** Gradle keeps an exact version, so read it back when behaviour differs from this page.

  ```bash
  ./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep ai.bithuman
  ```

- **Private avatars:** an avatar you created downloads with the secret you set with `Expression2Credential.set` or `Essence2Credential.set`; there is nothing else to pass.

## Reference

- [Android API reference](/platforms/android/reference): every public class in both AARs.
- Examples: [Expression 2](/examples/android-expression-2) · [Essence 2](/examples/android-essence-2), complete apps you can clone.
- [Flutter](/platforms/flutter): the Flutter plugin, built on these engines.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
- FFmpeg in `essence2-android` is LGPL: [relink materials](/legal/android-ffmpeg-lgpl).
