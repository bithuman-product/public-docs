---
title: "Android SDK (Kotlin)"
description: "On-device avatar runtime for Android — a self-contained AAR via Maven Central. arm64-v8a, Android 10+. Beta."
section: sdk
group: "Languages"
order: 12
---

## Overview

`ai.bithuman:sdk` is a self-contained Android AAR. Audio in (16 kHz mono PCM),
25 FPS `Bitmap` / packed-BGR frames out. All inference runs **on-device**; a
once-per-minute billing heartbeat meters avatar mode. The AAR bundles every
native library — your app adds no ONNX Runtime, OpenSSL, or other system
dependency. This SDK is **Beta**.

> **Status — pinned at `2.3.6`.** The Android SDK is the **Essence** on-device
> runtime (Engine ABI v7). `2.3.6` is the current published release on Maven
> Central and is what you build against today; there is no newer Android
> version, and it does not track the Python/Swift release cadence. It renders
> **Essence** models — the newer Essence-2 and Expression-2 engines are served
> from the cloud and are not part of this on-device AAR. See
> [Models](#models) below for exactly which `.imx` to ship.

## Install

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        ndk { abiFilters += setOf("arm64-v8a") }
        minSdk = 29
    }
}
dependencies { implementation("ai.bithuman:sdk:2.3.6") }
```

| Field | Value |
|---|---|
| Maven coordinate | `ai.bithuman:sdk:2.3.6` |
| ABI | `arm64-v8a` only |
| Engine ABI | v7 |
| Min / Compile SDK | 29 (Android 10) / 35 |
| NDK | 28.0.13004108 |
| Size | ~16 MB download · ~40 MB installed (native libs) |

`mavenCentral()` is in `settings.gradle.kts` by default in new projects.
`armeabi-v7a` / `x86_64` are not supported — file an issue if you need them. The
Kotlin SDK has its own release cadence and is **not** locked to the Python
`bithuman` 2.x line.

## Models

The AAR runs a single self-contained model file — a `.imx` — entirely on the
device. It is the **Essence** on-device engine at **Engine ABI v7**, and a model
you generate on the platform today runs on it **directly, with no conversion**:
the platform's Essence `.imx` is the `IMX\0` v2 container this build loads, and
the SDK bundles its own audio encoder, so a stock model needs no extra assets.

- **Get one:** generate an agent with an **Essence** model and download its
  `.imx` — see [Download a model](/api/agents) (or the
  [`bithuman` CLI](/sdk/cli/overview) `pull`). Push the file onto the device's
  app-private storage (`getExternalFilesDir(null)` / `filesDir`) and pass its
  path to `Avatar.load` / `Fixture`.
- **Essence only.** Essence-2 and Expression-2 are cloud-served engines — their
  artifacts are not `.imx` and are not loadable by this on-device AAR. Use an
  **Essence** (`essence-1`) model. `Fixture.abiVersion()` reports the linked
  engine ABI at runtime, and an incompatible file fails with a clear
  `BithumanException` rather than rendering wrong.

## Auth

Pass your secret as the `apiSecret` argument to `Avatar.load` (the SDK also reads
the `BITHUMAN_API_SECRET` environment variable if you set it before the process
starts — but a Java *system property* is **not** read):

```kotlin
val avatar = Avatar.load(
    modelPath,
    apiSecret = BuildConfig.BITHUMAN_API_SECRET,
)
```

Get a secret at [Developer → API Keys](https://www.bithuman.ai/#developer). The
library exchanges it for a short-lived runtime token at startup and renews on the
heartbeat (5-minute offline grace).

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

Each tick consumes 640 samples (40 ms @ 16 kHz). `composeAsBitmaps` needs
`pcm.size >= avatar.samplesPerTick` or it returns empty.

## Streaming: long live conversations

The right shape when audio arrives incrementally (mic, WebRTC sink, TTS). Each
push is constant cost; each pull returns one frame — session length never
degrades per-frame performance. This is the Android expression of the
[audio-streaming push/drain loop](/concepts/audio-streaming).

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

`pushAudio` and `pullFrame` are independent: push as audio arrives, pull on a
40 ms `Choreographer` tick. A single `Runtime` is **not** internally
synchronized — pin push/pull to one thread or wrap in your own mutex.
Multi-conversation hosts share **one `Fixture`** across many `Runtime`s to
amortize the model load:

```kotlin
Fixture(modelPath).use { fx ->
    val rtA = Runtime(fx)
    val rtB = Runtime(fx)
    // ... interleave ticks per conversation
}
```

Default execution provider is CPU (predictable, identical across platforms).
`NNAPI` / `QNN` are accepted but currently no-op to CPU.

## API surface

Public types in `ai.bithuman.sdk`:

| Tier | Types |
|---|---|
| High-level | `Avatar`, `ComposedFrame` |
| Low-level | `Fixture`, `FixtureInfo`, `Runtime`, `ComposeResult` |
| Config | `ExecutionProvider` |
| Errors | `BithumanException` |
| Auth | `BithumanAuth`, `AuthState` |

`Fixture.libraryVersion()` / `Fixture.abiVersion()` expose the linked
`libessence` version and ABI.

## Hardware

`arm64-v8a` only. Runs on modern Android silicon (Snapdragon 8 Gen 1+, Tensor
G2+). Older arm64 chips are uncharacterized — treat as unsupported for production
until measured.

Measured on a Snapdragon 8 Gen 2 (Z Fold 5), Essence, CPU EP:

| Metric | Value |
|---|---|
| Tight-loop mean | 3.96 ms |
| Sustained FPS | 252 |
| RSS peak (PSS) | 139 MB |

Comfortable headroom over the 25 FPS / 40 ms tick budget (~10× faster than
realtime in a tight loop).

## Troubleshooting

### `UnsatisfiedLinkError` on launch

Build variant didn't include `arm64-v8a` — check `abiFilters` in `defaultConfig`.

### `BithumanException: AUTH_FAILED`

Secret missing or invalid. Confirm `BITHUMAN_API_SECRET` is set before the first
`Avatar.load`.

### First compose tick is slow (~400 ms)

First-run init. Pre-warm with one silent tick at startup for consistent latency
from frame one.

### `composeAsBitmaps` returns empty

`pcm.size` must be ≥ `avatar.samplesPerTick` (640 samples / tick).

## See also

- [SDK overview](/sdk) — which SDK to pick
- [Audio streaming](/concepts/audio-streaming) — the canonical push/drain loop
- [Models](/concepts/models) — Essence vs Expression
- [Swift SDK](/sdk/swift) — the Apple counterpart
