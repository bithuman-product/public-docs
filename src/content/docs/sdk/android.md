---
title: "Android"
description: "A lip-synced Expression 2 avatar on an arm64 Android handset from one Maven coordinate — ai.bithuman:expression2-android:0.4.7 — with no account, no API key and no credits for the first frame."
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
    implementation("ai.bithuman:expression2-android:0.4.7")
    implementation("com.qualcomm.qti:qnn-litert-delegate:2.49.0")   // accelerated rendering on Snapdragon handsets;
    implementation("com.qualcomm.qti:qnn-runtime:2.49.0")           // both on Maven Central, no Qualcomm account; +67 MB of APK
}
```

Without the two Qualcomm lines the avatar still renders, on the CPU, slower.
The whole project, file by file: [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello).

> **`mavenCentral()` is not optional, and searching for the artifact will not
> find it.** The `ai.bithuman` group is served by Maven Central itself and is
> **not** on Google's Maven mirror, so a build with only `google()` resolves
> nothing. It also returns no results on `search.maven.org` — verified
> 2026-09-15, with a control query that does return results — so the web search
> saying "not found" is not evidence the artifact is missing. Browse
> [the group directory](https://repo1.maven.org/maven2/ai/bithuman/) instead,
> which lists every published version.

## Authentication and configuration

A public agent needs no credential at all — no account, no key, no credits.
Your own private agent does: pass its owner's key through the model store,

```kotlin
// app/build.gradle.kts — AGP 8.x generates no BuildConfig unless you ask
android {
    buildFeatures { buildConfig = true }
    defaultConfig {
        buildConfigField(
            "String", "BITHUMAN_API_SECRET",
            "\"${providers.gradleProperty("bithumanApiSecret").getOrElse("")}\"",
        )
    }
}
```

Put `bithumanApiSecret=…` in `~/.gradle/gradle.properties` or pass
`-PbithumanApiSecret=…` — never in source control. Then hand it to the model
store:

```kotlin
Expression2ModelStore(context, urlResolver =
    Expression2ModelStore.MeteredDoorResolver(BuildConfig.BITHUMAN_API_SECRET))
```

Keys are free at [your API keys](https://www.bithuman.ai/developer/api-keys).
Without one a private agent answers `401`.

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

Every public class and member of both Android artifacts, with the Kotlin
signature each one actually has, is on the
[Android API reference](/sdk/android-api) — generated from the AARs Maven
Central serves, not typed.

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
| you want `essence-1` on Android | it is the first-generation artifact, `ai.bithuman:sdk:2.3.6` — a `.imx` you push yourself and an API secret, not the model-store route above. The published 2.3.6 **cannot authenticate on a device**: it installs, then throws before its first frame with `be_auth_authenticate: status=11`, because its native library ships with no CA trust store and there is no app-side workaround on this version | for a talking head on Android today use Expression 2 above, which needs no key; the whole first-generation project is on [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello#the-first-generation-artifact--essence-1-aibithumansdk236) |
| you want Essence 2 on Android | the coordinate is `implementation("ai.bithuman:essence2-android:0.5.10")`; versions before `0.5.3` cannot install a model on a handset, and `0.5.7` delivers 72–77 % of a reply's frames under an un-paced feed | use `0.5.10`; Expression 2 is the path this page documents |

**Licence.** *Proprietary — bitHuman SDK License*. The full text travels with the
bytes: `META-INF/NOTICE.txt` inside the AAR states which part is under which
licence, and a copy is available from [hello@bithuman.ai](mailto:hello@bithuman.ai).
the bundled LiteRT is Apache-2.0 (notices in the AAR's `META-INF/`); FFmpeg is
linked statically under LGPL §6(a), relink on request to
[hello@bithuman.ai](mailto:hello@bithuman.ai).

## Examples and source

- [Android app, end to end](/examples/kotlin-android-hello) — the whole project
  printed on one page: `build.gradle.kts`, the activity, the audio loop.
- [Examples](/examples) — every runnable project, by language.
- [bithuman-examples](https://github.com/bithuman-product/bithuman-examples/tree/main) — the repository behind those pages.

## See also

- [Android API reference](/sdk/android-api) — every public class in both
  artifacts, read back out of the published AARs
- [LiveKit](/sdk/livekit) — subscribing to a server-hosted avatar when the
  render is not on the handset
- [Performance](/sdk/performance) — measured frame rates for every platform
- [SDK](/sdk) — every platform on one page
