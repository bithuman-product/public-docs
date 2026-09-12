---
title: "Android"
description: "A lip-synced Expression 2 avatar on an arm64 Android handset from one Maven coordinate — ai.bithuman:expression2-android:0.4.1 — with no account, no API key and no credits for the first frame."
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
        google()         // every Android project needs it
        mavenCentral()   // the bitHuman AAR
    }
}

// app/build.gradle.kts
android {
    defaultConfig {
        minSdk = 26                        // the AAR's own floor
        ndk { abiFilters += "arm64-v8a" }  // the only ABI published
    }
    packaging { jniLibs { useLegacyPackaging = true } }   // required — see Troubleshooting
}
dependencies {
    implementation("ai.bithuman:expression2-android:0.4.1")
    implementation("com.qualcomm.qti:qnn-litert-delegate:2.49.0")   // accelerated rendering on Snapdragon handsets;
    implementation("com.qualcomm.qti:qnn-runtime:2.49.0")           // both on Maven Central, no Qualcomm account; +67 MB of APK
}
```

Without the two Qualcomm lines the avatar still renders, on the CPU, slower.
The whole project, file by file: [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello).

## Get a model

`Expression2ModelStore` downloads a published identity into app-private storage
— no account, no key, no host argument:

```kotlin
val model = Expression2ModelStore(context).fetch("A02HCY0444")   // ~158 MB the first time; never on the main thread
```

**A public agent needs no credential at all.** `A02HCY0444` is one, and so is
every Expression 2 identity in the [showcase](/showcase). Your own agent's code
comes from [Agents](/api/agents). A private agent answers `401` without its
owner's key — see Troubleshooting.

## Minimal code

16 kHz mono `FloatArray` in, `Bitmap` frames out. The frame contract is on the
class as constants: `FRAME_WIDTH` 416, `FRAME_HEIGHT` 720, `FRAMES_PER_SECOND`
20, `SAMPLE_RATE` 16000.

```kotlin
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2ModelStore
import ai.bithuman.expression2.Expression2Options
import android.content.Context
import android.graphics.Bitmap

/** [pcm16k] is 16 kHz mono float32 in [-1, 1] — one float per sample, not ShortArray. */
fun render(context: Context, agentCode: String, pcm16k: FloatArray, show: (Bitmap) -> Unit) {
    // Downloads the model the first time (~158 MB). Never on the main thread.
    val model = Expression2ModelStore(context).fetch(agentCode)

    Expression2Avatar.create(context, model, Expression2Options()).use { avatar ->
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

The default `Expression2Options()` uses the handset's accelerator when it has
one and falls back to the CPU instead of throwing.

## Run

```bash
./gradlew :app:installDebug
```

A terminal build needs what Android Studio sets for you: `ANDROID_HOME` (or
`sdk.dir=` in `local.properties`), a JDK 17 launcher, Gradle 8.11.1 and AGP
8.7.3. No account, no key and no credit spend in this run; a
[self-hosted session](/guides/pricing) is metered once you attach a key.

## Performance

Measured frame rates for every platform are on the [performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| `acceleratorNote` = *"no libQnnTFLiteDelegate.so in this APK"* | the Qualcomm artifacts are missing, or `useLegacyPackaging` is off so no `.so` is on disk | add the two `com.qualcomm.qti` lines and `packaging { jniLibs { useLegacyPackaging = true } }` |
| `acceleratorNote` says the accelerator refused the graph | you still get frames, on the CPU | nothing to fix in your app; log it and ship |
| the download is refused with `401` | that agent is private | use a [showcase](/showcase) code, or pass its owner's key: `Expression2ModelStore(context, urlResolver = Expression2ModelStore.MeteredDoorResolver(BuildConfig.BITHUMAN_API_SECRET))` |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no Expression 2 model yet | [add the model](/api/agents#add-a-model-to-an-existing-agent) and poll until it is listed |
| the first `create()` takes about 45 s | the accelerator compiles the graph once per process | create on a background thread at app start, once |
| `UnsatisfiedLinkError` on an emulator | the AAR is arm64-v8a only; an x86_64 image installs, then cannot load it | run on a physical arm64 handset |
| `SDK location not found` | no `ANDROID_HOME` and no `local.properties` | set one of them |
| AGP fails with `What went wrong: 26.0.2.1` (or another bare version) | `JAVA_HOME` points at a JDK newer than 17 | use a JDK 17 launcher |
| `gradle wrapper` refuses an empty directory | Gradle 9 | write `settings.gradle.kts` and `app/` first, the wrapper last |
| you want Essence 2 on Android | the coordinate is `implementation("ai.bithuman:essence2-android:0.5.3")`; earlier `0.5.x` versions cannot install a model on a handset | use `0.5.3`; Expression 2 is the path this page documents |

**Licence.** *Proprietary — bitHuman SDK License* (`https://bithuman.ai/license`);
the bundled LiteRT is Apache-2.0 (notices in the AAR's `META-INF/`); FFmpeg is
linked statically under LGPL §6(a), relink on request to
[hello@bithuman.ai](mailto:hello@bithuman.ai).
