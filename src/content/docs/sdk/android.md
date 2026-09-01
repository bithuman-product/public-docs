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
> **Essence** models — the newer Essence 2 and Expression 2 engines are served
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
- **Essence only.** Essence 2 and Expression 2 are cloud-served engines — their
  artifacts are not `.imx` and are not loadable by this on-device AAR. Use an
  **Essence** (`essence-1`) model. `Fixture.abiVersion()` reports the linked
  engine ABI at runtime, and an incompatible file fails with a clear
  `BithumanException` rather than rendering wrong.

> **There is no second-generation Android artifact you can resolve today, and
> no newer coordinate to try.** Measured against Maven Central: the group
> `ai.bithuman` publishes exactly **one** artifact, `ai.bithuman:sdk`, whose
> latest and only current release is **2.3.6** — the Essence runtime on this
> page. No Expression 2 or Essence 2 AAR is published **to Maven Central**
> under that group or any other, or from any other **public** repository, so no
> Gradle coordinate you can write will fetch one; a build file naming a
> second-generation Android artifact fails at dependency resolution. When an
> Expression 2 AAR ships publicly it will resolve from **Maven Central under
> the same `ai.bithuman` group**, and this page will carry the coordinate and
> version the day it does. Until then, reach the second-generation models on
> Android through the cloud — the [REST API](/api/overview), a
> [LiveKit](/sdk/livekit) session, or the agent landing page in a WebView.

> **Where Expression 2 on Android stands.** An `arm64-v8a` Expression 2 AAR
> exists and has been built and run, but it is staged in a **private** registry
> — it is not on Maven Central and an anonymous Gradle build cannot fetch it,
> so there is no coordinate to publish here yet. When it does ship publicly,
> these are the measured limits it ships with, stated plainly rather than
> smoothed over: **`arm64-v8a` only**, **minSdk 26**, a **Qualcomm Snapdragon**
> requirement for the accelerated path, a first `create()` that takes **tens of
> seconds**, and a sustained frame rate that **depends on the Snapdragon
> generation** — real time on Snapdragon 8 Elite, below real time on Snapdragon
> 8 Gen 2.
>
> ### The frame rate — and which path each number belongs to
>
> ★ **The accelerated path is opt-in. The library's own default is not it.**
> `Expression2Options()` leaves `accelerator = Accelerator.AUTO`, and since
> 2026-08-25 AUTO resolves to `Routing.ALL_CPU` on **every** device — it does
> not try the Hexagon and fall back, it never asks for it. That default is the
> correct-picture arm and it is slow: measured through this AAR on the Galaxy
> Z Fold 5 (SM8550), 2026-08-26, 405 frames — **RTF 2.6046 · 7.67 fps**. To get
> the numbers below you must pass **both** arguments:
>
> ```kotlin
> Expression2Options(
>     accelerator = Accelerator.NPU,      // alone, this resolves to the
>     routing     = Routing.HTP_DECODER,  // retired Routing.MIXED — pass both
> )
> ```
>
> Everything else in those runs was left at its default: `overlapDecoder =
> false`, `threads = 4`, and `qnnOptions = DEFAULT_QNN_OPTIONS`
> (`backend_type:htp;htp_precision:1;htp_performance_mode:6`). Continuous
> speech at 100 % talk duty from a cooled start, one process, one identity:
>
> | Handset | SoC | Run | Cold, first 39.5 s | **Sustained plateau** |
> |---|---|---|---|---|
> | Galaxy S25+ (SM-S936U1) | Snapdragon 8 Elite (SM8750) | 600 s of audio, 12,021 frames | RTF 0.7331 · 27.28 fps | **RTF 0.8732 · 22.90 fps** (audio 204–578 s) |
> | Galaxy Z Fold 5 (SM-F946U1) | Snapdragon 8 Gen 2 (SM8550) | 500 s of audio, 10,005 frames | RTF 0.9014 · 22.19 fps | **RTF 1.1472 · 17.43 fps** (audio 161–500 s) |
>
> **RTF is render wall-clock divided by the duration of the audio rendered:
> below 1.00 is faster than playback.** `fps` is the same measurement in the
> other unit — the engine renders 20 frames per second of audio, so
> `RTF × fps = 20` for every run. Quote one of them, not both as if they
> confirmed each other.
>
> **Plan around the plateau, not the cold window.** On the S25+ the plateau
> reproduces across two independent cooled runs (600 s and 500 s) to **0.3 %**,
> while the cold 39.5-second window of those same two runs differs by **7.7 %**
> (RTF 0.7331 vs 0.7892) — a short benchmark on Android measures the thermal
> state, not the engine. The S25+ CPU clock cap settles after about 200 s
> (cpu0/2/4 fall 3,532,800 → 2,745,600 kHz over the run) and the reading is
> flat from there apart from one 6 % excursion; the Z Fold 5 settles by about
> 161 s and keeps falling slightly past 500 s, so **its plateau is an upper
> bound on speed** — a longer run reads worse, not better.
>
> **What this means for a conversation.** On Snapdragon 8 Elite this
> configuration renders **faster than playback (RTF 0.87)** and held it flat
> for the full ten minutes measured; beyond ten minutes is unmeasured. On
> Snapdragon 8 Gen 2 it renders about **15 % slower than playback (RTF 1.15)**,
> so audio outruns video over a long turn. Neither reaches 40 fps, and the
> ceiling is arithmetic rather than tuning: at the S25+ plateau the `step`
> stage alone costs **24.70 ms per frame** of a 25 ms budget, on the CPU, while
> `decWait` is **0.000** — the accelerator is never the stage being waited on.
>
> ### First `create()` takes tens of seconds
>
> On the Galaxy S25+, three cold `create()` calls on this routing with no
> compiled-context cache measured **46.6 s, 52.5 s and 63.7 s** — the spread is
> the honest figure, so budget for the top of it, not the bottom. A fourth run
> **with** the QNN context cache already warm measured **50.8 s**, inside that
> same spread: the cost is **not** amortised by a later launch. Call `create()`
> off the main thread and show real progress; do not put it behind a tap that
> is expected to respond.
>
> ### Silicon boundary — Snapdragon only for the accelerated path
>
> The decoder runs on the **Hexagon NPU** through Qualcomm's QNN LiteRT
> delegate, which your app supplies by adding `com.qualcomm.qti:qnn-litert-delegate`
> and `com.qualcomm.qti:qnn-runtime` (2.49.0 packs Hexagon skels v68, v69, v73,
> v75, v79 and v81). On silicon with no Hexagon — Exynos, Google Tensor,
> MediaTek Dimensity — there is no accelerated path: `Accelerator.NPU` raises
> `Expression2Exception` and deliberately does **not** fall back, because a CPU
> run reported as an NPU run is worse than an error. What you are left with is
> the all-CPU default above, **RTF 2.6046 · 7.67 fps** — about two and a half
> times slower than playback — and even that number was measured on Snapdragon.
> Expression 2 has **never been measured on non-Qualcomm silicon at all**.
> Treat non-Snapdragon Android as **unsupported for Expression 2** until it is,
> and serve those devices from the cloud.

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

Get a secret at [Developer → API Keys](https://www.bithuman.ai/developer/api-keys). The
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

### The first compose tick is much slower than the rest

First-run initialization — the first tick pays model load and warm-up. Its cost
depends on the model shape and the device and spans more than an order of
magnitude, so measure it on your target rather than budgeting from a single
figure. Pre-warm with one silent tick at startup for consistent latency from
frame one.

### `composeAsBitmaps` returns empty

`pcm.size` must be ≥ `avatar.samplesPerTick` (640 samples / tick).

## See also

- [SDK overview](/sdk) — which SDK to pick
- [Audio streaming](/concepts/audio-streaming) — the canonical push/drain loop
- [Models](/concepts/models) — Essence vs Expression
- [Swift SDK](/sdk/swift) — the Apple counterpart
