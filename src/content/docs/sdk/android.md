---
title: "Android SDK (Kotlin)"
description: "Three on-device Android AARs on Maven Central — ai.bithuman:expression2-android:0.3.0 (expression-2), ai.bithuman:essence2-android:0.2.0 (essence-2) and ai.bithuman:sdk:2.3.6 (essence-1). Coordinates, a Gradle snippet that resolves, and the measured limits."
section: sdk
group: "Languages"
order: 12
---

## What is on Maven Central

Three Android artifacts are published under the `ai.bithuman` group and are
resolvable by anyone, with no credential:

| Maven coordinate | Model | Published | `minSdk` | ABI |
|---|---|---|---|---|
| `ai.bithuman:expression2-android:0.3.0` | **expression-2** | 2026-09-02 | 26 | `arm64-v8a` |
| `ai.bithuman:essence2-android:0.2.0` | **essence-2** | 2026-09-03 | 29 | `arm64-v8a` |
| `ai.bithuman:sdk:2.3.6` | **essence-1** | since May 2026 | 29 | `arm64-v8a` |

All three models that the scope ruling puts on Android now have a coordinate that
resolves. See [essence-2 on Android](#essence-2-on-android) for what is and is not
verified about the newest one.

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
import android.content.Context
import java.io.File

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
is `routing ?: when (accelerator) { NPU -> Routing.MIXED; AUTO, CPU -> Routing.ALL_CPU }`
— read out of the 0.3.0 bytecode, where `Accelerator.NPU` is the branch that
selects `MIXED`. So `Accelerator.NPU` on its own resolves to `Routing.MIXED`.

The wart is that **`MIXED` is the one routing this page publishes no measurement
for.** Every figure above was taken on `HTP_DECODER` (the Hexagon runs) or on
`ALL_CPU` (the 7.7 fps default). Ask for `Accelerator.NPU` alone and you silently
get a third arm that none of these numbers describe.

**And nothing warns you.** An earlier version of this page called `MIXED`
*"retired"*. That was editorial, not shipped: `ai.bithuman:expression2-android:0.3.0`
carries **no `@Deprecated` marker anywhere** — not on `MIXED`, not on anything — and
the words *retired* and *deprecated* appear in no string in the AAR's own code.
(They occur only inside the bundled Google `libLiteRt.so`, in `absl`'s retired-flag
machinery and an XNNPACK message — nothing to do with routing.) `MIXED` is a live,
undeprecated public constant, your IDE will not grey it out, and your build will
not caution you. Name the routing you want and you get the arm you read about.

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
[Developer → API Keys](https://www.bithuman.ai/developer/api-keys). `BithumanAuth`
exchanges it for a runtime token at startup and then renews on a heartbeat: the
2.3.6 defaults are `intervalSeconds = 60` and `offlineGraceSeconds = 300`, so a
60-second heartbeat with a 5-minute offline grace.

> ### Correction — 2026-09-02: there is no `AUTH_FAILED`
>
> This page previously said that without a valid secret `Avatar.load` throws
> **`BithumanException: AUTH_FAILED`**. **That identifier does not exist.** The
> string `AUTH_FAILED` occurs nowhere in `ai.bithuman:sdk:2.3.6` — not in any of
> the 19 classes in `classes.jar`, and not in any of the three bundled `.so`
> files. Anyone who wrote a `catch` against that name was matching on nothing.

What the 2.3.6 AAR actually does on the failure path, read out of its bytecode:

| What you did | What you get |
|---|---|
| Passed no secret, with no env var set | **`java.lang.IllegalArgumentException`** — *not* a `BithumanException` — from `Avatar$Companion.load`, message `Avatar.load: apiSecret required (or set BITHUMAN_API_SECRET env, or BITHUMAN_UNMETERED=1 for dev).` |
| Passed an empty secret | `java.lang.IllegalArgumentException`, message `apiSecret must not be empty`, from `BithumanAuth.configure` |
| Passed a secret the server rejects | **`BithumanException`**, message `be_auth_init: status=<n>` or `be_auth_authenticate: status=<n>` |

The type you must catch therefore depends on *which* failure it is: a **missing or
empty** secret is an unchecked `IllegalArgumentException` (it is treated as a
programming error), and only a **rejected** one is a `BithumanException`. A
`try { … } catch (e: BithumanException)` around `Avatar.load` does not catch the
missing-secret case at all.

The numeric codes the native layer returns are `BithumanError.NO_AUTH = 11` and
`BithumanError.AUTH_FATAL = 12`. Live auth status is exposed as `AuthState`, whose
six values are `UNCONFIGURED`, `AUTHENTICATING`, `OK`, `OFFLINE`, `FATAL_BALANCE`
and `FATAL_SUSPENDED`.

★ **`BITHUMAN_UNMETERED=1` — real, and undocumented until now.** `Avatar.load`
reads this environment variable with `System.getenv` as its **first** action, before
it looks for a secret at all. If it is exactly the string `1`, the whole
authentication block is skipped: no secret is required, `BithumanAuth.configure` is
never called, and `load` goes straight to opening the `Fixture`. It is a
development affordance — the value must be exactly `1` (`true` and `yes` do not
work) and you should not ship it in a release build.

The SDK also reads the `BITHUMAN_API_SECRET` environment variable, likewise via
`System.getenv`, so it must be set before the process starts. A Java *system
property* is not consulted on this path.

★ **Why this page's own compile probe could not catch this.** Every snippet here is
put through a compile probe before publication, and that control works — it is what
caught the `ShortArray` mistake in the next section. But this defect was in
**prose**, naming an identifier on a **failure path that no snippet exercises**. A
control that compiles the happy path is structurally blind to a false claim about
what happens when the happy path is *not* taken. That is a gap in the method, not a
slip: it is why the table above is quoted out of the artifact rather than from
memory, and why the failure-path names are now the ones the bytecode uses.

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
many `Runtime`s to amortize the model load.

### Execution providers — what is actually in the artifact

`ExecutionProvider` has five values: `CPU`, `AUTO`, `COREML`, `NNAPI` and `QNN`.
The default is **`CPU`** (it is the default argument of `Avatar.load`). An earlier
version of this page said `NNAPI` and `QNN` *"are accepted but no-op to CPU"*. That
is not what the artifact shows, and the two are not in the same position:

- **`NNAPI` is genuinely wired.** `libessence_jni.so` carries an undefined dynamic
  reference to `OrtSessionOptionsAppendExecutionProvider_Nnapi@VERS_1.26.0`, and
  the bundled `libonnxruntime.so` — a `DT_NEEDED` of the wrapper — exports that
  symbol. A compiled call site exists, so selecting NNAPI demonstrably does **not**
  no-op inside our wrapper: the provider really is appended to the ORT session
  options. **What ONNX Runtime then does with it on a real handset — whether NNAPI
  takes any of the graph, or whether ORT assigns every node back to CPU — is a
  device fact, and it is not verified here.** No phone measurement backs either
  answer, so this page asserts neither. Read it as "the provider is requested", not
  as "the model is accelerated", until you measure it on your own device.
- **`QNN` has no backend in this AAR to reach.** The bundled `libonnxruntime.so`
  contains no QNN execution-provider code: no `libQnn*.so` reference, no
  `QnnBackend_*` and no `QnnInterface*` symbol. The bare string
  `QNNExecutionProvider` *does* appear, but so do `CUDAExecutionProvider`,
  `OpenVINOExecutionProvider` and `DmlExecutionProvider`, none of which can be
  compiled into an Android `arm64-v8a` build — that list is ORT's static table of
  provider *names*, not evidence that any of them is present. The same test run
  against NNAPI as a positive control finds 103 `ANeuralNetworks*` symbols, so the
  test does discriminate. **What `ExecutionProvider.QNN` does at runtime is
  therefore unverified**; what is certain is that this artifact ships no Qualcomm
  backend for it to use.

If you want the Qualcomm NPU on Android today, the measured path is the
**expression-2** AAR at the top of this page, which takes the QNN delegate as an
explicit dependency.

> **Not re-measured for this page.** The on-device frame-rate and memory figures
> previously published for essence-1 on Android (a tight-loop mean of 3.96 ms,
> 252 fps sustained, 139 MB PSS on a Snapdragon 8 Gen 2) were **not** re-taken here
> and this page does not vouch for them. What is verified above is the coordinate,
> the artifact contents, the API surface and that an outside project compiles
> against it.

---

## essence-2 on Android

**Published.** `ai.bithuman:essence2-android:0.2.0` resolves from Maven Central.

```kotlin
dependencies {
    implementation("ai.bithuman:essence2-android:0.2.0")
}
```

> ### Correction — 2026-09-03
>
> Until today this page said essence-2 was *"not published"*, that *"there is no
> coordinate to write"* and that `ai.bithuman:essence2-android` *"returns 404 from
> Maven Central today"*. **That was true when it was written and is now false.**
> The artifact was published at **2026-09-03 03:39:15 UTC** (`maven-metadata.xml`
> `lastUpdated=20260903033915`), which is after the previous revision of this page.
> The licensing blocker it described has been resolved in the artifact itself — the
> AAR now carries `META-INF/NOTICE.txt` and the full licence texts for FFmpeg 7.1
> (LGPL v2.1), LLVM libc++ and ONNX Runtime 1.26.0.

### FFmpeg is linked statically — and the LGPL §6(a) offer resolves

`lible_jni.so` **defines 618 FFmpeg symbols** and imports none, so FFmpeg is
inside the library rather than beside it. That makes LGPL-2.1 §6(b) unavailable
and §6(a) the route, and the relink materials are published on Maven Central at
the same coordinate as the AAR — classifier `relink`, extension `zip`. The URL
is baked into the shipped `META-INF/NOTICE.txt`, and it resolves:

```bash
curl -fsSL -o essence2.aar https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.2.0/essence2-android-0.2.0.aar
OFFER=$(unzip -p essence2.aar META-INF/NOTICE.txt | grep -o 'https://repo1[^ ]*relink.zip')
echo "$OFFER"
curl -o /dev/null -s -w '%{http_code}\n' -L "$OFFER"
curl -o /dev/null -s -w '%{http_code}\n' -L "${OFFER%.zip}X.zip"
```

```text
https://repo1.maven.org/maven2/ai/bithuman/essence2-android/0.2.0/essence2-android-0.2.0-relink.zip
200
404
rc=0
```

The kit holds **15 entries** — FFmpeg 7.1's complete corresponding source, the
object-code form of the work that uses it, and the real link command. What is
in it, why §6(a) rather than §6(b), and the commands that check every claim:
[FFmpeg / LGPL — the Android relink offer](/legal/android-ffmpeg-lgpl).

You do not need any of this to *use* the AAR. It matters if you redistribute
it inside your own product.

### What was measured

Every line below was executed against Maven Central on 2026-09-03, anonymously
(no `~/.netrc`, no `~/.curlrc`, `curl -q`):

| Check | Result |
|---|---|
| `essence2-android-0.2.0.pom` | HTTP 200, 1,967 B |
| `essence2-android-0.2.0.aar` | HTTP 200, 11,784,075 B |
| SHA-1 vs the published `.aar.sha1` | matches (`1d769543…`) |
| `-sources.jar`, `-javadoc.jar` | HTTP 200 |
| `minSdkVersion` (from the AAR's `AndroidManifest.xml`) | **29** |
| ABI | `arm64-v8a` **only** |
| Native payload | `lible_jni.so` (2,968,408 B), `libonnxruntime.so` (27,408,600 B), `libc++_shared.so` (1,253,544 B) |

The probe discriminates: `junit:junit:4.13.2` returned 200 as a positive control,
while `ai.bithuman:expression2-android:9.9.9` and a nonexistent artifact both
returned 404.

### On-device speed, measured on a Snapdragon 8 Elite

★ **This supersedes the previous version of this page, which said no on-device
performance figure had been taken.** One has now been taken — for the renderer
graph, on a handset. Read the scope before the numbers.

**What was measured, and what was not.** The renderer graph was benchmarked
directly on the device through the same ONNX Runtime 1.26.0 CPU build this AAR
carries. It is **not** a run through this artifact's own Kotlin API, and it is
**not** a live session. The API remains unexercised from outside — see
[What is still not verified](#what-is-still-not-verified).

- **Device** Galaxy S25+ (`SM-S936U1`), **Snapdragon 8 Elite (SM8750)**.
- **Runtime** ONNX Runtime **1.26.0**, CPU execution provider — no accelerator.
- **Shape** batch 1, the single-frame graph, which is the one this engine runs.
- **Threads** 4 intra-op, 1 inter-op, pinned to the four big cores — the mask
  the shipping engine sets.
- **Protocol** 8 repeats × 5 arms, interleaved and rotated, medians. Screen held
  awake so the device could not enter its idle clock cap. 80 of 80 samples
  passed the clock and contention guards.

| Renderer graph | Cooled ms/frame | fps | RTF | Sustained ms/frame | fps | RTF |
|---|---:|---:|---:|---:|---:|---:|
| Previous head upsample — what 51 of 52 identities carry | **109.23** | 9.15 | 2.73 | **160.04** | 6.25 | 4.00 |
| Rebuilt head upsample — 1 of 52 today | **49.00** | 20.41 | 1.23 | **83.38** | 11.99 | 2.08 |

**Cooled** is after a quiet-and-cool window. **Sustained** is after a burn-in,
which is the state a real turn of speech puts the device in — quote it, not the
cooled row, when you are sizing a product. RTF is render wall-clock over the
duration of audio rendered; below 1.00 is faster than playback.

★ **essence-2 does not render in real time on this device, before or after.**
Even cooled, with the rebuilt step, 20.41 fps is below the 25 fps a session
consumes (RTF 1.22), and sustained it is 11.99 fps. Plan for offline rendering
or a cloud session; do not plan a live on-device essence-2 turn on current
hardware.

**Both controls fired**, in the same session: a byte-identical duplicate of the
graph measured 1.003× cooled / 1.016× sustained (inside the noise floor), and a
deliberately heavier arm carrying 33.8% more multiply-accumulates measured
**slower**, 0.968× / 0.938×.

**The second row is not what you get from `0.2.0` today.** It is a graph change
that rolls out per identity and is currently on **1 of 52** published
identities. The [Essence 2 concept page](/concepts/essence-2#android-measured-on-the-handset)
carries the full protocol, the throttling caveat that makes 1.92× a lower bound
on the sustained gain, and why the phone gains 2.23× where an x86 workstation
gains 3.00×.

**No other Android device has been measured and no figure is projected for
one.** In particular, the **7.54 → 23.87 fps** figure published for the CPU
render core is a **developer workstation** (Threadripper PRO 5955WX, x86-64,
batch 24). It is not a phone number, and it does not describe this artifact.

### What is still not verified

Unlike expression-2 above, **no outside Gradle project has been compiled against
this artifact**, and no render through its own API has been taken — the figures
above drive the graph, not the SDK. What is established is the coordinate, the
bytes, the checksum, the declared `minSdk`, the native payload and the renderer
graph's speed on one handset — nothing further. Treat the API as unexercised
until that build transcript exists.

### The legacy `elevate` name is in the published API surface

The AAR declares `package="ai.bithuman.elevate"` and its `classes.jar` contains
`ai/bithuman/elevate/{ElevateFrames, ElevateArmLayout, NativeBridge}`. The
`elevate` spelling is **deprecated** as a product name — the only two product names
are expression-2 and essence-2 — but it is now a **published Kotlin package** and
a Maven coordinate's contents cannot be rewritten after release. Import it as it is
spelled; a rename would be a breaking API change, not an erratum.

★ The *artifact* name `libelevate-android` was never published and is still
obsolete — the coordinate is `ai.bithuman:essence2-android`. It is only the
internal Kotlin package that carries the old spelling.

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
