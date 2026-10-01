---
title: "Android"
description: "Render Essence 2 and Expression 2 on Android phones, from bitHuman's Maven repository."
section: platforms
group: "Android"
order: 10
type: platform
llms: apps
searchTitle: "Android SDK (Kotlin): on-device talking avatars"
renders: ["device"]
needs: ["Physical device", "API secret"]
artifacts: ["expression2_android", "essence2_android"]
platforms: ["android"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S8", "S10", "S13", "S26", "S30", "S32"]
next: ["/platforms/android/app", "/platforms/android/troubleshooting", "/platforms/android/reference"]
moved:
  integrate-into-your-app: /platforms/android/app#integrate-into-your-app
  complete-example: /platforms/android/app#complete-example
  platform-notes: /platforms/android/app#platform-notes
  reference: /platforms/android/reference
  troubleshooting: /platforms/android/troubleshooting
---

After the one-time model download, the only network traffic is usage reporting. [Why on the device](/deploy/on-device).

## Before you start

You feed 16 kHz mono speech in and pull picture frames out. Each model is one Gradle dependency, from bitHuman's Maven repository at `maven.bithuman.ai`.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **Devices** | a physical `arm64-v8a` phone, `minSdk 26` | a physical `arm64-v8a` phone, `minSdk 29` |
| **Dependency** | `implementation("ai.bithuman:expression2-android:0.5.2")` | `implementation("ai.bithuman:essence2-android:0.9.0")` |
| **Credential** | an [API secret](/start/api-secret), Creator plan or higher | an API secret, Creator plan or higher |
| **First-run download** | about 160 MB | 226–281 MB |
| **Adds to your APK** | about 3 MB, plus a 70 MB accelerator runtime you can leave out | 12.1 MB |
| **Worked example** | [Android Expression 2](/examples/android-expression-2) | [Android Essence 2](/examples/android-essence-2) |

- **JDK 17, Gradle 8.11 or newer and Android Gradle Plugin 8.7 or newer.**
- **A physical arm64 phone.** Emulators cannot load the engines.
- **Frame rate depends on the phone.** Essence 2 plays at 25 frames a second, and the phone has to render at least that fast to keep up with live speech. A Galaxy S25+ renders about 52 frames a second (37 held for 10 minutes). Older chips can fall below real time: on a Galaxy Z Flip5 (Snapdragon 8 Gen 2) Essence 2 rendered about 14 to 24 frames a second, slowing as the phone warmed. Test on the phones your app targets.
- **Essence 1** is not available on phones: use Essence 2 or Expression 2 on devices ([First generation](/models/first-generation)).

## Install

Add bitHuman's Maven repository for the `ai.bithuman` group, restrict the build to `arm64-v8a`, and turn on legacy packaging so the engines' native libraries are extracted to disk. Merge the lines into your existing app module, which keeps its own `namespace`, `compileSdk` and Java 17 targets. The API secret reaches your code through `BuildConfig`.

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        exclusiveContent {   // ai.bithuman resolves from bitHuman's repository only
            forRepository { maven { url = uri("https://maven.bithuman.ai") } }
            filter { includeGroup("ai.bithuman") }
        }
    }
}

// app/build.gradle.kts
import java.util.Properties

// bithuman.apiSecret=… in local.properties (git-ignored), or BITHUMAN_API_SECRET in the environment
val bithumanApiSecret: String = run {
    val props = Properties()
    val f = rootProject.file("local.properties")
    if (f.isFile) f.inputStream().use { props.load(it) }
    props.getProperty("bithuman.apiSecret") ?: System.getenv("BITHUMAN_API_SECRET") ?: ""
}

android {
    buildFeatures { buildConfig = true }
    defaultConfig {
        minSdk = 26   // 29 for Essence 2
        ndk { abiFilters += "arm64-v8a" }
        buildConfigField("String", "BITHUMAN_API_SECRET", "\"$bithumanApiSecret\"")
    }
    packaging { jniLibs { useLegacyPackaging = true } }   // required
}
dependencies {
    implementation("ai.bithuman:expression2-android:0.5.2")
    // or: implementation("ai.bithuman:essence2-android:0.9.0")
}
```

Put the secret in `local.properties` as `bithuman.apiSecret=…` (Android Studio keeps that file out of git), or export `BITHUMAN_API_SECRET` before you build; the example apps read it the same way. An empty secret makes the session refuse to start.

The build prints `Unable to strip the following libraries, packaging them as they are: libLiteRt.so, libQnn…`. It is expected when no NDK is installed.

The `dependencyResolutionManagement` block works unchanged in a Groovy `settings.gradle`. Only `ai.bithuman` comes from `maven.bithuman.ai`; the engines' own dependencies still come from `google()` and `mavenCentral()`.

`expression2-android` brings the Qualcomm accelerator runtime with it (`com.qualcomm.qti:qnn-litert-delegate:2.49.0` and `com.qualcomm.qti:qnn-runtime:2.49.0`). To keep the APK small and render on the CPU instead, exclude it:

```kotlin
implementation("ai.bithuman:expression2-android:0.5.2") {
    exclude(group = "com.qualcomm.qti")
}
```

## Authenticate

Pass your API secret ([create one](https://www.bithuman.ai/developer/api-keys)) in code before you download or create an avatar: `Expression2Credential.set(secret)` for Expression 2, `Essence2Credential.set(secret)` for Essence 2. That one call covers the download and the session. `Expression2Metering.apiSecret` and `Essence2Metering.apiSecret` still work but are deprecated. See [Your API secret](/start/api-secret).

Cost: active session time, to the second ([pricing](/pricing)).

> **Warning:** a `buildConfigField` compiles the secret into the APK, where anyone with the file can read it. Use it for local builds only.

A shipped app fetches its secret from your backend ([What a shipped app holds](/start/api-secret#what-a-shipped-app-holds)).

## First frame

Expression 2, with the published `wise-pup` avatar (agent code `A23WJF0199`). Call `render` off the main thread.

```kotlin
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2Credential
import ai.bithuman.expression2.Expression2ModelStore
import ai.bithuman.expression2.Expression2Options
import android.content.Context
import android.graphics.Bitmap

/** [pcm16k] is 16 kHz mono float32 in [-1, 1]. */
fun render(context: Context, pcm16k: FloatArray, show: (Bitmap) -> Unit) {
    Expression2Credential.set(BuildConfig.BITHUMAN_API_SECRET)        // before fetch() and create()
    val model = Expression2ModelStore(context).fetch("A23WJF0199")     // ~160 MB, first run only

    Expression2Avatar.create(context, model, Expression2Options()).use { avatar ->
        val frame = avatar.newFrameBitmap()   // 416 x 720, allocate once
        avatar.feed(pcm16k)
        avatar.flushTail()                    // end of the utterance
        while (true) {
            if (avatar.pull(frame) != null) { show(frame); continue }
            if (!avatar.hasPendingTail && avatar.queuedFrames == 0) break
            Thread.sleep(10)                  // null means "not ready yet"
        }
    }
}
```

Expected: `show` receives 20 frames for each second of audio, and the avatar's lips follow the speech. The first `create()` after install prepares the accelerator once and takes noticeably longer than later launches, which reuse it. Create once, at app start, on a background thread.

Essence 2 takes 16-bit little-endian PCM bytes, as a 16 kHz mono WAV stores them, and fills an RGBA `ByteBuffer` sized from the identity:

```kotlin
import ai.bithuman.essence2.Essence2Avatar
import ai.bithuman.essence2.Essence2Credential
import ai.bithuman.essence2.Essence2ModelStore
import android.content.Context
import java.nio.ByteBuffer

fun render(context: Context, pcm16le: ByteArray, show: (ByteBuffer, Int, Int) -> Unit) {
    Essence2Credential.set(BuildConfig.BITHUMAN_API_SECRET)                   // before fetch() and create()
    val identity = Essence2ModelStore(context).fetch("A52DHS2219")            // sofia-ramirez; 226–281 MB, first run only

    Essence2Avatar.create(identity.dir).use { avatar ->
        val frame = avatar.newFrameBuffer()   // width * height * 4, RGBA
        avatar.feed(pcm16le)
        avatar.endOfAudio()
        var quietMs = 0
        while (quietMs < 5_000) {             // 5 s with no frame at all = finished
            if (avatar.pull(frame)) { show(frame, avatar.width, avatar.height); quietMs = 0; continue }
            Thread.sleep(10)                  // false means "not ready yet"; the first frame can take seconds
            quietMs += 10
        }
        avatar.checkRender()                  // throws Essence2RenderFailed if the engine stopped
        // a refused session throws Essence2MeteringRefused from pull() or idle()
    }
}
```

Frame size belongs to the identity (portrait 1080×1920, landscape 1920×1080 or 1280×720). Read `avatar.width` and `avatar.height`; do not hard-code them.

<div class="fig-end">

```figure
android-essence-2
```

</div>

## Performance

```perf
android-s25plus android-s25plus-sustained
```
