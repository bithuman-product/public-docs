---
title: "Android"
description: "A lip-synced Expression 2 avatar on an arm64 Android handset from one Maven coordinate — ai.bithuman:expression2-android:0.3.1 — with no account, no API key and no credits for the first frame. 58 fps unpaced on a Snapdragon 8 Elite with three options named."
section: sdk
group: "Platforms"
order: 30
label: "Android"
---

## Install

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()         // AGP resolves its own aapt2 here — every Android project needs it
        mavenCentral()   // the bitHuman AAR
    }
}
```

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        minSdk = 26                        // the AAR's own floor
        ndk { abiFilters += "arm64-v8a" }  // the only ABI published
    }
    packaging { jniLibs { useLegacyPackaging = true } }   // not optional — see Troubleshooting
}
dependencies {
    implementation("ai.bithuman:expression2-android:0.3.1")
    implementation("com.qualcomm.qti:qnn-litert-delegate:2.49.0")   // the Hexagon path — both on Maven Central,
    implementation("com.qualcomm.qti:qnn-runtime:2.49.0")           // no Qualcomm account; +67 MB of APK
}
```

Leave the two Qualcomm lines out and the avatar still renders — on the CPU, at
a fraction of the speed in the table below. The whole project, every file in
the order you create them, is on
[Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello); there is no
repository to clone, the page is the project.

## Get a model

`Expression2ModelStore` downloads a published identity over **anonymous HTTPS**
into app-private storage — no account, no key, no host argument:

```kotlin
val model = Expression2ModelStore(context).fetch("A66GYD8664")   // ~158 MB the first time; never on the main thread
```

`A66GYD8664`, `A55NVK9945`, `A17ZTB0222` and `A74NWD9723` all answer
anonymously; every code on the [showcase](/showcase) is meant to. Your own
agent's code comes from [Agents](/api/agents) — a code that is not on the public
mirror fails the fetch with `HTTP 400 … Object not found` naming the URL it
tried; if you already hold the two member files, `Expression2Model.combined(
File(dir, "combined_fp32.tflite"), File(dir, "canon.bin"))` opens them.

## Minimal code

16 kHz mono `FloatArray` in, `Bitmap` frames out. The frame contract is on the
class as constants: `FRAME_WIDTH` 416, `FRAME_HEIGHT` 720, `FRAMES_PER_SECOND`
20, `SAMPLE_RATE` 16000.

### Calling it — audio in, frames out

```kotlin
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2ModelStore
import ai.bithuman.expression2.Expression2Options
import ai.bithuman.expression2.Routing
import android.content.Context
import android.graphics.Bitmap

/** [pcm16k] is 16 kHz MONO float32 in [-1, 1] — one float per sample, not ShortArray. */
fun render(context: Context, agentCode: String, pcm16k: FloatArray, show: (Bitmap) -> Unit) {
    // Blocks on the network the first time (~158 MB). Never on the main thread.
    val model = Expression2ModelStore(context).fetch(agentCode)   // anonymous HTTPS

    // Name the routing and leave accelerator at AUTO: a refused graph then falls back to the CPU
    // instead of throwing. A bare Expression2Options() is all-CPU — 7 fps on a Galaxy S25+;
    // these three options are 58 fps on the same phone, pixel-identical.
    val options = Expression2Options(routing = Routing.HTP_DECODER, overlapDecoder = true, threads = 6)

    Expression2Avatar.create(context, model, options).use { avatar ->
        val frame = avatar.newFrameBitmap()   // ARGB_8888, 416 x 720 — allocate once
        avatar.feed(pcm16k)                   // renders each complete 1.6 s chunk
        avatar.flushTail()                    // the padded tail is the last sentence
        while (true) {
            if (avatar.pull(frame) != null) { show(frame); continue }
            if (!avatar.hasPendingTail && avatar.queuedFrames == 0) break
        }
    }
}
```

`create` tells you what it actually built — log `avatar.accelerator`,
`avatar.routing`, `avatar.acceleratorNote` and `avatar.initMs`; they are the
only honest answer to "did my accelerator option do anything?". On an Adreno
instead of a Hexagon, the same shape is `Routing.GPU_DECODER` with
`Expression2Options.QNN_OPTIONS_ADRENO_FP32`.

## Run

```bash
./gradlew :app:installDebug
```

A terminal build needs three things Android Studio sets for you: `ANDROID_HOME`
(or `sdk.dir=` in `local.properties`), a **JDK 17** launcher (AGP 8.7.3 refuses
newer ones illegibly), and the Gradle wrapper written **last** —
`gradle wrapper --gradle-version 8.11.1` after `settings.gradle.kts` and `app/`
exist, because Gradle 9 refuses to write a wrapper into an empty directory.
The first `create()` on the Hexagon path takes about 45 s while the delegate
compiles the graph — do it on a background thread at app start, once.

No account, no key and no credit spend anywhere in this run; a
[self-hosted session](/guides/pricing) is metered only once you attach a key.

## Performance

Measured 2026-09-10 on a **Galaxy S25+** (SM-S936U1, Snapdragon 8 Elite /
SM8750, Hexagon V79, Android 16) through the published AAR, unpaced (frames
produced as fast as the engine can, 1,642 frames per row, all rows pixel-identical):

| Device | Model · options | fps (unpaced) | Notes |
|---|---|---:|---|
| Galaxy S25+ | Expression 2 · `expression2-android:0.3.1` · bare `Expression2Options()` | 7.1 | `AUTO` with no routing resolves to all-CPU — it does not try the Hexagon |
| Galaxy S25+ | 0.3.1 · `routing = HTP_DECODER` (threads 4, overlap off — the accelerated defaults) | 23.6 | the Hexagon runs the decoder; the CPU `step` leg is the bottleneck |
| Galaxy S25+ | 0.3.1 · `routing = HTP_DECODER, overlapDecoder = true, threads = 6` — the snippet above | **57.9** | worst heat-soaked 10 s window 43.4; 6 is the foreground cpuset ceiling |
| Galaxy S25+ | next release · bare `Expression2Options()` at its new defaults | 48.2 | mean of 3 × 4-clip runs (57.6 over one clip); not on Maven Central yet |
| Galaxy S25+ | Essence 2 · `essence2-android:0.5.1` | 1.0 | CPU only, and no public bundle host today — see below |

The model plays at 20 fps, so anything above 20 is headroom. No other handset
has been measured and no figure is projected for one.

Every platform side by side: [Performance](/sdk/performance).

## Essence 2 and Essence 1 on Android

**Expression 2 is the Android rail today.** The other two families have
published coordinates that resolve, and neither renders a frame for an outside
developer:

- **`ai.bithuman:essence2-android:0.5.1`** — `Essence2ModelStore` has no
  default host and bitHuman publishes none that serves its `android/v1` tree;
  the REST download serves Essence 2 as a single `.imx` this store does not
  consume; and there is no audio-in call (`open` answers `NotSupported`). The
  metering rule is the same as everywhere (300 s grace on a rejected key, then
  refused; `★ UNMETERED RENDER` when the service is unreachable). Come back when
  a mirror is published.
- **`ai.bithuman:sdk:2.3.6`** (Essence 1) — its native library carries no TLS
  trust store, so `Avatar.load` fails at `be_auth_authenticate: status=11 …
  SSL peer certificate … was not OK` on every device. The fix is in a version
  not yet on Maven Central; there is no app-side workaround.

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| `acc=CPU`, ~7 fps, with `Expression2Options()` | a bare options object never asks for the accelerator | name the routing: `Expression2Options(routing = Routing.HTP_DECODER, overlapDecoder = true, threads = 6)` |
| `acceleratorNote` = *"no libQnnTFLiteDelegate.so in this APK"* | the Qualcomm artifacts are missing, or `useLegacyPackaging` is off so no `.so` is on disk | add the two `com.qualcomm.qti` lines and `packaging { jniLibs { useLegacyPackaging = true } }` |
| `acceleratorNote` = *"the Hexagon refused this graph, fell back to XNNPACK"* | this Hexagon rejected the graph; you still get frames on the CPU | nothing to fix in your app; log it and ship |
| `Expression2Exception: TfLiteInterpreterCreate returned null (graph rejected) … on the NPU` | you named `accelerator = Accelerator.NPU`, which makes a refusal fatal | leave `accelerator` at `AUTO` and name the `routing` instead |
| `fetch` fails with `HTTP 400 … Object not found` | the code is not on the public mirror | use a [showcase](/showcase) code, or open the two member files with `Expression2Model.combined(...)` |
| `404 NOT_FOUND` from `GET /v1/agent/<CODE>/model/download` | not an agent on your account, and not public | check the code under [your agents](/api/agents) |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no Expression 2 model yet | [add the model](/api/agents#add-a-model-to-an-existing-agent) and poll until it is listed |
| `MODEL_ARTIFACT_NOT_READY` from the download | trained, not yet published to the download store | poll the same URL; it clears on its own |
| `UnsatisfiedLinkError` on an emulator | the AAR is arm64-v8a only; an x86_64 image installs, then cannot load it | run on a physical arm64 handset |
| `SDK location not found` | no `ANDROID_HOME` and no `local.properties` | set one of them |
| AGP fails with `What went wrong: 26.0.2.1` (or another bare version) | `JAVA_HOME` points at a JDK newer than 17 | use a JDK 17 launcher |
| `gradle wrapper` refuses an empty directory | Gradle 9 | write `settings.gradle.kts` and `app/` first, the wrapper last |
| the first `create()` takes ~45 s | the Hexagon compiles the graph once per process | create on a background thread at app start; do not persist a QNN context cache — it makes decode 74–97× slower |

**Licence.** The POM declares *Proprietary — bitHuman SDK License*
(`https://bithuman.ai/license`); the bundled LiteRT is Apache-2.0 and its
notices ship in the AAR's `META-INF/`. FFmpeg is linked statically under LGPL
§6(a) — the relink offer is honoured on request to
[hello@bithuman.ai](mailto:hello@bithuman.ai).

## See also

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — the whole project, seven files
- [Expression 2](/concepts/expression-2) — what the model is
- [Agents](/api/agents) — creating an agent of your own and downloading its model
- [SDK](/sdk) — every platform on one table
