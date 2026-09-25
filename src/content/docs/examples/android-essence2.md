---
title: "Android example: Essence 2"
description: "A complete Kotlin app that renders a talking photoreal Essence 2 avatar at full resolution on an Android phone: clone it, add your API secret, build and run."
section: examples
group: "Examples"
order: 41
type: example
label: "Android: Essence 2"
---

<figure class="showcase">
  <video controls preload="none" playsinline poster="/examples/android/essence2.webp" width="540" height="1005" src="/examples/android/essence2.mp4"></video>
  <figcaption>The <code>essence2-hello</code> app on a Samsung Galaxy S25+, rendering the <code>sofia-ramirez</code> sample avatar at 1080×1920 on the phone with <code>essence2-android</code> 0.5.14.</figcaption>
</figure>

The app downloads the `sofia-ramirez` sample avatar once, renders every frame of a speech clip on the phone, then plays the audio with the frames in sync. Tap the screen to replay.

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
cd bithuman-examples/android/essence2-hello
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
adb shell am start -n com.example.e2hello/.MainActivity
adb push ../../python/quickstart/speech.wav /storage/emulated/0/Android/data/com.example.e2hello/files/speech.wav && adb shell am start -S -n com.example.e2hello/.MainActivity
```

The first launch creates the app's files folder and says that `speech.wav` is missing; the push fills it and the restart renders. Any 16 kHz mono 16-bit WAV works.

## Expected output

`adb logcat -s E2HELLO` shows the download, then:

```text
engine: 1080x1920 targetFrames=251
rendered 347 frames in 13 s — playing…
347 frames, 13.87 s — tap to replay
```

347 frames for 13.87 seconds of audio is 25 fps at the avatar's own 1080×1920. The first run downloads about 240 MB; later runs start at the engine.

## How it works

`MainActivity.kt` does four things, all from `ai.bithuman:essence2-android`:

1. sets `Essence2Metering.apiSecret` from `BuildConfig`;
2. downloads the avatar with `Essence2ModelStore(..., urlResolver = MeteredDoorResolver(secret)).fetch(agentCode)` (`A52DHS2219` by default). Essence 2 uses the secret twice: once for usage, once for the download;
3. opens it with `Essence2Avatar.create(identity.dir)` on a background thread;
4. calls `feed(pcm)` and `endOfAudio()`, then `pull(frame)` until every frame is out: one frame per 40 ms of audio.

The calls and the live-streaming loop are on [Android](/sdk/android).

## Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents) with `"model": "essence-2"`, then pass its agent code to `fetch`. The same resolver downloads it with your secret.
- **Live speech:** feed 16 kHz mono 16-bit audio as it arrives and pull frames at 25 fps; call `endOfAudio()` at the end of each reply and `idle(buffer)` between replies.
- **Ship it:** the secret in `BuildConfig` can be read out of the APK. A real app fetches it from your backend at startup and sets the same property.
- **Zero-copy frames (essence2-android 0.7.0 and newer):** `useHardwareBuffers()` switches delivery to zero-copy: `pullHardwareBuffer()` and `idleHardwareBuffer()` return an `Essence2HardwareFrame` whose RGBA `HardwareBuffer` your renderer samples directly. Close each frame after presenting it. `pull(ByteBuffer)` is unchanged, and nothing changes until you call `useHardwareBuffers()` ([Android API](/sdk/android-api)).

  ```kotlin
  val avatar = Essence2Avatar.create(bundleDir)
  avatar.useHardwareBuffers()            // once, before the first frame
  avatar.feed(pcm)
  avatar.pullHardwareBuffer()?.use { frame ->
      renderer.draw(frame.buffer)        // e.g. an EGLImage / Vulkan import, or Bitmap.wrapHardwareBuffer
  }
  ```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `MeteringRefused` on the first `pull()` | set `bithuman.apiSecret` in `local.properties`, rebuild |
| Manifest merge fails on `minSdk` | Essence 2 needs `minSdk 29`; the example already sets it |
| `UnsatisfiedLinkError` | run on a physical arm64 phone, not an emulator |
| The build refuses the JDK | use JDK 17 (`java -version`) |
| The app says `speech.wav` is missing | run the `adb push` line, then restart the app |

More on [Android: Troubleshooting](/sdk/android#troubleshooting).

## Next

- [Android example: Expression 2](/examples/android-expression2) · [Android SDK](/sdk/android) · [Android API reference](/sdk/android-api) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/android/essence2-hello)
