---
title: "Android example: Expression 2"
description: "A complete Kotlin app that renders a talking Expression 2 avatar on an Android phone: clone it, add your API secret, build and run."
section: examples
group: "Examples"
order: 40
type: example
label: "Android: Expression 2"
---

<figure class="showcase">
  <video controls preload="none" playsinline poster="/examples/android/expression2.webp" width="540" height="1005" src="/examples/android/expression2.mp4"></video>
  <figcaption>The <code>expression2-hello</code> app on a Samsung Galaxy S25+, rendering the <code>wise-pup</code> sample avatar on the phone with <code>expression2-android</code> 0.4.9.</figcaption>
</figure>

The app downloads the `wise-pup` sample avatar once, renders every frame of a speech clip on the phone, then plays the audio with the frames in sync. Tap the screen to replay.

## Requirements

| You need | Notes |
|---|---|
| A physical `arm64-v8a` Android phone, USB debugging on | emulators cannot load the engine |
| JDK 17 and an Android SDK with platform 35 | the project pins Gradle 8.11.1 and Android Gradle Plugin 8.7.3 |
| `adb` on your `PATH` | it ships in `$ANDROID_HOME/platform-tools` |
| An [API secret](/start/api-secret) | the engine bills talking time; idle is free |

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/android/expression2-hello
```

## Set your API secret

Write `local.properties` next to `settings.gradle.kts`. The file is git-ignored.

```properties
sdk.dir=/path/to/your/Android/sdk
bithuman.apiSecret=<your API secret>
```

`BITHUMAN_API_SECRET` in the environment works instead of the second line.

## Run it

```bash
./gradlew :app:assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.example.x2hello/.MainActivity
adb push ../../python/quickstart/speech.wav /storage/emulated/0/Android/data/com.example.x2hello/files/speech.wav && adb shell am start -S -n com.example.x2hello/.MainActivity
```

The first launch creates the app's files folder and says that `speech.wav` is missing; the push fills it and the restart renders. Any 16 kHz mono 16-bit WAV works.

## Expected output

`adb logcat -s X2HELLO` shows the download, the engine starting on the phone's NPU, then:

```text
rendered 277 frames in 36 s — playing…
277 frames, 13.87 s — tap to replay
```

277 frames for 13.87 seconds of audio is 20 fps. Most of that time is the one-time download (about 160 MB) and `create()` preparing the model for the NPU, which takes about 30 seconds once per app process; the frames themselves render in a few seconds.

## How it works

`MainActivity.kt` does four things, all from `ai.bithuman:expression2-android`:

1. sets `Expression2Metering.apiSecret` from `BuildConfig`;
2. downloads the avatar with `Expression2ModelStore(this).fetch(agentCode)` (`A23WJF0199` by default);
3. opens it with `Expression2Avatar.create(this, model, options)` on a background thread;
4. calls `feed(pcm)` and `flushTail()`, then `pull(frame)` until every frame is out: one frame per 50 ms of audio.

The calls, the live-streaming loop and the accelerator are on [Android](/sdk/android).

## Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents), then pass its agent code to `fetch`. A private avatar downloads with your secret through `Expression2ModelStore.MeteredDoorResolver(secret)`.
- **Live speech:** feed microphone audio (16 kHz mono float from `AudioRecord` with `ENCODING_PCM_FLOAT`) as it arrives and pull frames at 20 fps; call `flushTail()` at the end of each reply.
- **Ship it:** the secret in `BuildConfig` can be read out of the APK. A real app fetches it from your backend at startup and sets the same property.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Expression2Exception` from `create()` naming the API secret | set `bithuman.apiSecret` in `local.properties`, rebuild |
| `UnsatisfiedLinkError` | run on a physical arm64 phone, not an emulator |
| The build refuses the JDK | use JDK 17 (`java -version`) |
| The app says `speech.wav` is missing | run the `adb push` line, then restart the app |

More on [Android: Troubleshooting](/sdk/android#troubleshooting).

## Next

- [Android example: Essence 2](/examples/android-essence2) · [Android SDK](/sdk/android) · [Android API reference](/sdk/android-api) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/android/expression2-hello)
