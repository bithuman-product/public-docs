---
title: "Android SDK (Kotlin)"
description: "Two on-device Android AARs on Maven Central — ai.bithuman:expression2-android:0.3.0 (expression-2) and ai.bithuman:sdk:2.3.6 (essence-1). Coordinates, a Gradle snippet that resolves, and the measured limits."
section: sdk
group: "Languages"
order: 12
---

## What is on Maven Central

Two Android artifacts are published under the `ai.bithuman` group and are
resolvable by anyone, with no credential:

| Maven coordinate | Model | Published | `minSdk` | ABI |
|---|---|---|---|---|
| `ai.bithuman:expression2-android:0.3.0` | **expression-2** | 2026-09-02 | 26 | `arm64-v8a` |
| `ai.bithuman:sdk:2.3.6` | **essence-1** | since May 2026 | 29 | `arm64-v8a` |

`ai.bithuman:essence2-android` (**essence-2**) is **not published**. It is staged
and its coordinate does not resolve — see [essence-2 on Android](#essence-2-on-android).

> ### Correction — 2026-09-02
>
> This page previously said Expression 2 was *"a cloud-served engine … not part of
> this on-device AAR"* and that *"there is no second-generation Android artifact you
> can resolve today"*. **That was true until 2026-09-02 and is now false.**
> `ai.bithuman:expression2-android:0.3.0` is on Maven Central and an anonymous
> Gradle build resolves, compiles and links against it. The transcript of that build
> is on [Verifying the Android SDK](/sdk/android-verify) — every command on this page
> was executed before it was published here.

> ### Which models belong on Android at all
>
> Per the model/plane scope ruling of 2026-09-02, three models are in scope for the
> Android lane: **essence-1**, **expression-2** and **essence-2**. **expression-1**
> and **essence-2-max** are **GPU-only**. Their absence from Android is correct and
> deliberate — it is not a gap and there is no Android build of them coming.
> The full matrix, every model against every lane, is on
> [Models and planes](/concepts/models-and-planes).

---

## expression-2 — `ai.bithuman:expression2-android:0.3.0`

Feed 16 kHz mono `FloatArray` audio, pull RGBA frames of a talking head. All
inference is on-device. The AAR is **2,722,532 B** to download and carries two
native libraries for `arm64-v8a` — `libexpr2jni.so` (446,200 B) and `libLiteRt.so`
(5,508,376 B).

### Install — the minimal build that works

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        mavenCentral()   // ai.bithuman:expression2-android
        google()         // REQUIRED — see below
    }
}
```

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        minSdk = 26                       // the AAR's own minSdk
        ndk { abiFilters += "arm64-v8a" }
    }
    packaging { jniLibs { useLegacyPackaging = true } }   // not optional — see below
}
dependencies {
    implementation("ai.bithuman:expression2-android:0.3.0")
}
```

★ **`google()` is not optional, and leaving it out fails in a confusing place.** The
AAR depends on `com.google.ai.edge.litert:litert:2.2.0`, which is **not on Maven
Central** — it is only on Google's Maven repository. With `mavenCentral()` alone,
Gradle still reports `expression2-android:0.3.0` as *resolved*, and then
`assembleRelease` dies at `checkReleaseAarMetadata` with
`Could not find com.google.ai.edge.litert:litert:2.2.0`. That is measured, not
predicted — the [negative control](/sdk/android-verify#control-2-mavencentral-alone-is-not-enough)
runs it.

★ **`useLegacyPackaging = true` is not a style choice, and leaving it out is
silent.** AGP defaults to `android:extractNativeLibs="false"` for `minSdk >= 23`, so
the installer puts **no** `.so` files in `applicationInfo.nativeLibraryDir`.
`System.loadLibrary` does not care — the linker reads straight out of the APK — so
the engine loads and everything looks healthy. But the SDK finds the Qualcomm
delegate with a `File(nativeLibraryDir, "libQnnTFLiteDelegate.so").isFile` check and
puts that directory on `ADSP_LIBRARY_PATH`, and both need real files on disk. The
result is `Accelerator.NPU` throwing *"no libQnnTFLiteDelegate.so in this APK"*
while the delegate is sitting in the APK.

### The accelerated path needs two more artifacts

The Qualcomm delegate is **not** in our AAR. Your app supplies it:

```kotlin
dependencies {
    implementation("ai.bithuman:expression2-android:0.3.0")
    implementation("com.qualcomm.qti:qnn-litert-delegate:2.49.0")
    implementation("com.qualcomm.qti:qnn-runtime:2.49.0")
}
```

Both are on Maven Central. **Budget for the size**: measured on the throwaway
project in [the verification page](/sdk/android-verify), the release APK goes from
**4,539,502 B** (SDK only) to **71,866,299 B** with the QNN runtime added — a 15.8x
jump, because `qnn-runtime` packages the Hexagon skels and the Adreno backend.
Do not exclude `libQnnGpu.so`: it is what `backend_type:gpu` loads.

### Calling it

```kotlin
import ai.bithuman.expression2.Accelerator
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2Model
import ai.bithuman.expression2.Expression2Options
import ai.bithuman.expression2.Routing

val model = Expression2Model.combined(
    File(dir, "combined_fp32.tflite"),   // legacy member filenames, kept for
    File(dir, "canon.bin"),              // compatibility — you will receive these
)
val avatar = Expression2Avatar.create(
    context, model,
    Expression2Options(
        accelerator = Accelerator.NPU,
        routing     = Routing.HTP_DECODER,   // pass BOTH — see below
        qnnOptions  = Expression2Options.QNN_OPTIONS_HEXAGON_BURST,
    ),
)
```

`Expression2Avatar` exposes the frame contract as constants:
`FRAME_WIDTH` **416**, `FRAME_HEIGHT` **720**, `FRAMES_PER_SECOND` **20**,
`SAMPLE_RATE` **16000**. Twenty frames per second of audio, not 25 — the
essence-1 AAR further down this page is the 25 fps one.

★ **Pass `routing` as well as `accelerator`.** `Expression2Options.resolveRouting()`
is `routing ?: when (accelerator) { NPU -> Routing.MIXED; AUTO, CPU -> Routing.ALL_CPU }`.
So `Accelerator.NPU` on its own resolves to `Routing.MIXED`, which is retired.
Naming the routing you want is the difference between the arm you measured and a
different one.

★ **The default is the slow one, deliberately.** A bare `Expression2Options()`
leaves `accelerator = Accelerator.AUTO`, which resolves to `Routing.ALL_CPU` on
every device — it does not try an accelerator and fall back, it never asks.
Measured on a Snapdragon 8 Gen 2: **7.7 fps**.

### Honest quality — what this 0.3.0 does today

The owner shipped this knowingly, under the ruling of 2026-08-30: *"for Android,
let's release SDK even when RTF is not hyper realtime — we need to get base
offering there first, and later we can continuously optimize."* These are not
blockers. They are stated because a first public artifact is the worst place to
discover them.

**It fails the `PARITY_U8` gate, at 2 levels.** The internal policy sets
`max_u8_delta: 1`; the full-clip measurement is **2**, on **3 of 363,916,800** RGB
samples over 405 frames (416 × 720 × 3 × 405). The widely-quoted "1 level" figure
is a 117-frame subsample; over a whole clip the answer is 2.

**Sustained speed is 1.63x short of the accepted bar.** A 1,000-second Hexagon run
reads **RTF 0.9959 / 20.08 fps** against an accepted **RTF 0.61 / 32.7 fps**. On the
member the model store actually serves it is **RTF 0.9240 / 21.65 fps**, plateau
**1.0282** — *slower than playback*, so audio outruns video over a long turn.
RTF is render wall-clock over the duration of audio rendered; below 1.00 is faster
than playback.

★ **The bottleneck is the CPU, not the accelerator**, which reverses the usual
assumption. Over those 1,000 s the Hexagon `dec` stage drifts **+3.2–7.6 %** while
`step` on the CPU grows **+80.7 %** and `enc` **+96.1 %**, and `decWaitMs` — the
time the CPU thread spends parked on the decode worker — falls to **0.000**. The
accelerator is fully hidden; the CPU leg is the critical path. **A faster decoder
therefore buys almost nothing**: re-exporting to a cheaper member was measured, not
modelled, and moved the plateau 1.0636 → 1.0282.

What *is* measured to help: `overlapDecoder = true` (1.21x, opt-in — the 0.3.0
default is `false`), `threads = 6` (1.202x at matched throttle), the two together
(~RTF 0.894 — real time at last), and newer silicon with no code change at all
(Snapdragon 8 Elite / SM8750 stock: plateau **RTF 0.8725**, clears real time out of
the box).

**Other things a first consumer meets:**

- `arm64-v8a` only.
- **Qualcomm only for anything faster than the CPU.** `Accelerator.NPU` *is* the
  Qualcomm QNN delegate. On non-Qualcomm arm64 the SDK does not fail — `AUTO`
  resolves to all-CPU and renders slowly: measured on an Exynos 1380 (Galaxy A37),
  **5.62 fps sustained** over 100 s. Asking for `Accelerator.NPU` explicitly where
  there is no QNN **throws** rather than silently running on the CPU under an NPU
  label. Whether Samsung's own `enn` NPU could run this graph is **unmeasured** —
  this SDK cannot address it, because `Device` is `{CPU, NPU, REFERENCE}` and `NPU`
  means QNN.
- **First frame is slow.** 7.6 s at `htp_optimization_strategy:1`, and a **~45 s
  median** at the options the SDK actually ships. Call `create()` off the main
  thread and show real progress; do not put it behind a tap.
- Peak memory up to **2,292.7 MiB** (`VmHWM`).
- The model store has **no decoder-generation predicate**, so 10 of 69 mirrored
  identities download a retired decoder and verify perfectly against a manifest that
  never mentions it.

### Getting a model onto the device

`Expression2ModelStore` downloads an identity's published bundle over HTTPS into
app-private storage and hands you an `Expression2Model`:

```kotlin
val store = Expression2ModelStore(context)
val model = store.fetch(agentCode)     // members: combined_fp32.tflite, canon.bin
```

The member filenames (`combined_fp32.tflite`, `canon.bin`) and the manifest name
(`web_manifest.json`) are **legacy literals kept for compatibility** — you will
receive files with exactly those names, so they are shown rather than hidden. The
AAR's own manifest declares `android.permission.INTERNET`, which merges into your
app; an app that links the store and strips that permission fails at the first GET.

### Licence

The POM declares **Proprietary — bitHuman SDK License** (`https://bithuman.ai/license`).
The bundled `libLiteRt.so` is Apache-2.0 Google code, and the AAR ships
`META-INF/NOTICE.txt`, the verbatim `litert-2.2.0-LICENSE.txt` and a 1.9 MB
`litert-2.2.0-THIRD_PARTY_NOTICE.txt` alongside it.

---

## essence-1 — `ai.bithuman:sdk:2.3.6`

★ **This artifact has been publicly resolvable on Maven Central since May 2026 and
this documentation has never mentioned it.** Until 2026-09-02 it was the *only*
publicly consumable Android artifact this org had.

The coordinate is `ai.bithuman:sdk` — a legacy artifact name from before the SDK
family had more than one member. It is frozen and it is what you must type.

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        minSdk = 29                       // Android 10
        ndk { abiFilters += "arm64-v8a" }
    }
    packaging { jniLibs { useLegacyPackaging = true } }
}
dependencies {
    implementation("ai.bithuman:sdk:2.3.6")
}
```

The AAR is **16,955,315 B** and carries `libessence_jni.so` (11,404,936 B),
`libonnxruntime.so` (27,408,600 B) and `libc++_shared.so` (1,253,544 B) for
`arm64-v8a`. A release APK containing it measured **18,986,991 B**. It loads a
single self-contained `.imx` model file — generate an agent with an **essence-1**
model and download its `.imx`.

### High-level

```kotlin
import ai.bithuman.sdk.Avatar

Avatar.load(modelPath, apiSecret).use { avatar ->
    avatar.composeFromFile("${filesDir}/speech.wav").forEach { frame ->
        // frame.bgr is width*height*3 packed BGR uint8
    }
    avatar.composeAsBitmaps(pcm).forEach { bmp -> imageView.setImageBitmap(bmp) }
}
```

`Avatar.load(modelPath, apiSecret)` — get a secret at
[Developer → API Keys](https://www.bithuman.ai/developer/api-keys). The library
exchanges it for a short-lived runtime token at startup and renews on a heartbeat
(5-minute offline grace). **Without a valid secret `Avatar.load` throws
`BithumanException: AUTH_FAILED`** — the SDK also reads the
`BITHUMAN_API_SECRET` environment variable if it is set before the process starts,
but a Java *system property* is not read.

### Streaming

```kotlin
import ai.bithuman.sdk.Fixture
import ai.bithuman.sdk.Runtime

Fixture(modelPath).use { fx ->
    val rt = Runtime(fx)
    val info = fx.info
    val frame = ByteArray(info.frameWidth * info.frameHeight * 3)

    fun onAudio(pcm: FloatArray) {        // 16 kHz mono
        rt.pushAudio(pcm)
        while (rt.ticksAvailable > 0) rt.pullFrame(frame, -1)
    }
    fun onEndOfTurn() = rt.resetStream()
}
```

★ **Correction.** This page previously wrote `fun onAudio(pcm: ShortArray)` here.
`Runtime.pushAudio` takes a **`FloatArray`**, and the old snippet did not compile:
`Argument type mismatch: actual type is 'kotlin.ShortArray', but 'kotlin.FloatArray'
was expected.` That failure is reproduced as a
[negative control](/sdk/android-verify#control-3-the-old-pages-shortarray) so you
can see it go red.

A single `Runtime` is **not** internally synchronized — pin push/pull to one thread
or wrap it in your own mutex. Multi-conversation hosts share one `Fixture` across
many `Runtime`s to amortize the model load. The default execution provider is CPU;
`ExecutionProvider.NNAPI` and `QNN` are accepted but no-op to CPU.

> **Not re-measured for this page.** The on-device frame-rate and memory figures
> previously published for essence-1 on Android (a tight-loop mean of 3.96 ms,
> 252 fps sustained, 139 MB PSS on a Snapdragon 8 Gen 2) were **not** re-taken here
> and this page does not vouch for them. What is verified above is the coordinate,
> the artifact contents, the API surface and that an outside project compiles
> against it.

---

## essence-2 on Android

**Not published. There is no coordinate to write.**
`ai.bithuman:essence2-android` returns **404** from Maven Central today — you can
[check that yourself](/sdk/android-verify#is-it-on-maven-central) with the same
probe that returns 200 for the two artifacts above. It is staged, and its remaining
blocker is a licensing question, not a build.

essence-2 **is** in scope for the Android lane, so this is a real gap rather than a
deliberate absence — unlike expression-1 and essence-2-max, which are GPU-only.
Reach essence-2 from an Android app through the cloud in the meantime: the
[REST API](/api/overview), a [LiveKit](/sdk/livekit) session, or the agent landing
page in a WebView.

★ The name `libelevate-android` appears in older internal material. It was
**never published** and is obsolete; do not write it into a build file.

---

## Verify it yourself

Every snippet on this page was executed before publication. The scripts, their real
output and their negative controls are on
**[Verifying the Android SDK](/sdk/android-verify)** — including a run that
deliberately fails, so you can tell a working setup from a silently-broken one.

## See also

- [Verifying the Android SDK](/sdk/android-verify) — the executed transcripts
- [SDK overview](/sdk) — which SDK to pick
- [Audio streaming](/concepts/audio-streaming) — the push/drain loop
- [Swift SDK](/sdk/swift) — the Apple counterpart
- [Models and planes](/concepts/models-and-planes) — which model runs on which lane, and what "GPU only" means
