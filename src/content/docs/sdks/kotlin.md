---
title: "Kotlin SDK"
description: "On-device avatar runtime for Android. Self-contained AAR via Maven Central. arm64-v8a, Android 10+."
icon: "android"
---

`ai.bithuman:sdk` is a self-contained Android AAR. Audio in (16 kHz
mono PCM), 25 FPS `Bitmap` / packed-BGR frames out. All inference runs
on-device; a once-per-minute billing heartbeat meters avatar mode.

The AAR bundles every native library — your app adds no ONNX Runtime,
OpenSSL, or other system dependency.

## Install

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        ndk { abiFilters += setOf("arm64-v8a") }
        minSdk = 29
    }
}
dependencies { implementation("ai.bithuman:sdk:1.17.1") }
```

| Field | Value |
|---|---|
| Maven coord | `ai.bithuman:sdk:1.17.1` |
| ABI | `arm64-v8a` only |
| Engine ABI | v6 (v7 refresh queued — track via release notes) |
| Min / Compile SDK | 29 (Android 10) / 35 |
| NDK | 28.0.13004108 |
| AAR size | ~40 MB |

`mavenCentral()` is in `settings.gradle.kts` by default in new
projects. `armeabi-v7a` / `x86_64` are not supported — file an issue
if you need them.

The Kotlin SDK has its own release cadence — `ai.bithuman:sdk` is
**not** locked to the Python `bithuman` 2.x line.

## Auth

```kotlin
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        System.setProperty("BITHUMAN_API_SECRET", BuildConfig.BITHUMAN_API_SECRET)
    }
}
```

Get a secret at
[Developer → API Keys](https://www.bithuman.ai/#developer). The library
exchanges it for a short-lived runtime token at startup and renews on
the heartbeat (5-minute offline grace).

## High-level: one avatar, one conversation

Push the model + a driving clip to the device, then:

```kotlin
import ai.bithuman.sdk.Avatar

Avatar.load("${filesDir}/avatar.imx").use { avatar ->
    // From a file (WAV / MP3 / M4A, decoded via MediaExtractor):
    avatar.composeFromFile("${filesDir}/speech.wav").forEach { frame ->
        // frame.bgr is width*height*3 packed BGR uint8
    }
    // Or from raw 16 kHz mono FloatArray PCM (e.g. live mic):
    avatar.composeAsBitmaps(pcm).forEach { bmp -> imageView.setImageBitmap(bmp) }
}
```

Each tick consumes 640 samples (40 ms @ 16 kHz). `composeAsBitmaps`
needs `pcm.size >= avatar.samplesPerTick` or it returns empty.

## Streaming: long live conversations

The right shape when audio arrives incrementally (mic, WebRTC sink,
TTS). Each push is constant cost; each pull returns one frame —
session length never degrades per-frame performance.

```kotlin
import ai.bithuman.sdk.Fixture
import ai.bithuman.sdk.Runtime

Fixture(modelPath).use { fx ->
    val rt = Runtime(fx)
    val info = fx.info()
    val frameOut = ByteArray(info.frameWidth * info.frameHeight * 3)

    fun onAudio(pcm: ShortArray) {                 // from AudioRecord / WebRTC
        rt.pushAudio(pcm)
        while (rt.ticksAvailable > 0) {
            rt.pullFrame(frameOut, frameIdxHint = -1)
            renderer.present(frameOut, info.frameWidth, info.frameHeight)
        }
    }
    fun onEndOfTurn() = rt.resetStream()           // barge-in / agent switch
}
```

`pushAudio` and `pullFrame` are independent: push as audio arrives,
pull on a 40 ms `Choreographer` tick. A single `Runtime` is **not**
internally synchronized — pin push/pull to one thread or wrap in your
own mutex. Multi-conversation hosts share **one `Fixture`** across many
`Runtime`s to amortize the model load.

Default execution provider is CPU (predictable, identical across
platforms). `NNAPI` / `QNN` are accepted but currently no-op to CPU.

## Hardware

`arm64-v8a` only. Runs on modern Android silicon (Snapdragon 8 Gen 1+,
Tensor G2+). Older arm64 chips are uncharacterized — treat as
unsupported for production until measured.

## Troubleshooting


  
    Build variant didn't include `arm64-v8a` — check `abiFilters` in
    `defaultConfig`.
  
  
    Secret missing/invalid. Confirm `BITHUMAN_API_SECRET` is set
    before the first `Avatar.load`.
  
  
    First-run init. Pre-warm with one silent tick at startup for
    consistent latency from frame one.
  
  
    `pcm.size` must be ≥ `avatar.samplesPerTick` (640 samples / tick).
  


## See also


  
    The minimal Kotlin integration, ~20 lines
  
  
    Essence vs Expression
  
  
    Same runtime, one Dart codebase
  

