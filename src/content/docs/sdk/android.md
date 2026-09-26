---
title: "Android"
description: "Add an Essence 2 or Expression 2 avatar to an Android app. Both models render on the handset from one Maven Central dependency."
section: sdk
group: "Platforms"
order: 40
type: platform
label: "Android"
---

Both models render on the handset: you feed 16 kHz mono speech in and pull picture frames out. After the one-time model download, the only network traffic is usage reporting.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [any character from one portrait](/concepts/expression-2), 416×720 at 20 fps | [a photoreal person from one portrait](/concepts/essence-2), at the identity's own resolution, 25 fps |
| **Devices** | `arm64-v8a` handset, `minSdk 26` | `arm64-v8a` handset, `minSdk 29` |
| **Dependency** | `implementation("ai.bithuman:expression2-android:0.5.0")` | `implementation("ai.bithuman:essence2-android:0.7.0")` |
| **Credential** | an [API secret](https://www.bithuman.ai/developer/api-keys) | an [API secret](https://www.bithuman.ai/developer/api-keys) |
| **First-run download** | about 160 MB | 226–281 MB |
| **Adds to your APK** | 2.8 MB, plus a 70 MB accelerator runtime you can leave out | 12.1 MB |
| **Worked example** | [Android example: Expression 2](/examples/android-expression2) | [Android example: Essence 2](/examples/android-essence2) |

Toolchain: JDK 17, Gradle 8.11 or newer, Android Gradle Plugin 8.7 or newer, and a physical arm64 handset (emulators cannot load the engines).

Essence 1 isn't supported on Android or in the Swift package. Use Essence 2 or Expression 2 on devices, or run Essence 1 from the [cloud API](/api) or the [Python SDK](/sdk/python) or [CLI](/sdk/cli) on a desktop. See [Essence 1](/concepts/essence-1).

## Install

Add Maven Central, restrict the build to `arm64-v8a`, and turn on legacy packaging so the engines' native libraries are extracted to disk. The API secret reaches your code through `BuildConfig`.

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

// app/build.gradle.kts
android {
    buildFeatures { buildConfig = true }
    defaultConfig {
        minSdk = 26   // 29 for Essence 2
        ndk { abiFilters += "arm64-v8a" }
        buildConfigField(
            "String", "BITHUMAN_API_SECRET",
            "\"${providers.gradleProperty("bithumanApiSecret").getOrElse("")}\"",
        )
    }
    packaging { jniLibs { useLegacyPackaging = true } }   // required
}
dependencies {
    implementation("ai.bithuman:expression2-android:0.5.0")
    // or: implementation("ai.bithuman:essence2-android:0.7.0")
}
```

Put the secret in `~/.gradle/gradle.properties` as `bithumanApiSecret=…`, outside your source tree.

`expression2-android` brings the Qualcomm accelerator runtime with it (`com.qualcomm.qti:qnn-litert-delegate:2.49.0` and `com.qualcomm.qti:qnn-runtime:2.49.0`). To keep the APK small and render on the CPU instead, exclude it:

```kotlin
implementation("ai.bithuman:expression2-android:0.5.0") {
    exclude(group = "com.qualcomm.qti")
}
```

## Authenticate

Pass your API secret in code before you download or create an avatar: `Expression2Credential.set(secret)` for Expression 2, `Essence2Credential.set(secret)` for Essence 2. That one call covers the download and the session. `Expression2Metering.apiSecret` and `Essence2Metering.apiSecret` still work but are deprecated. See [Your API secret](/start/api-secret).

Credits pay for session time, talking or idle, by the exact second ([pricing](/guides/pricing)).

> **Warning:** a `buildConfigField` compiles the secret into the APK, where anyone with the file can read it. Use it for local builds only. A shipped app fetches the secret from your own backend at startup.

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

Expected: `show` receives about 20 frames per second of audio, and the avatar's lips follow the speech. The first `create()` in a process prepares the accelerator and takes about 30–45 seconds; do it once, at app start.

Essence 2 takes 16-bit little-endian PCM bytes, as a 16 kHz mono WAV stores them, and fills an RGBA `ByteBuffer` sized from the identity:

```kotlin
import ai.bithuman.essence2.Essence2Avatar
import ai.bithuman.essence2.Essence2Credential
import ai.bithuman.essence2.Essence2ModelStore
import android.content.Context
import java.nio.ByteBuffer

fun render(context: Context, pcm16le: ByteArray, show: (ByteBuffer, Int, Int) -> Unit) {
    Essence2Credential.set(BuildConfig.BITHUMAN_API_SECRET)                   // before fetch() and create()
    val identity = Essence2ModelStore(context).fetch("A21SKT4314")            // 226–281 MB, first run only

    Essence2Avatar.create(identity.dir).use { avatar ->
        val frame = avatar.newFrameBuffer()   // width * height * 4, RGBA
        avatar.feed(pcm16le)
        avatar.endOfAudio()
        var idle = 0
        while (idle < 100) {                  // 1 s with no frame = drained
            if (avatar.pull(frame)) { show(frame, avatar.width, avatar.height); idle = 0; continue }
            idle++
            Thread.sleep(10)
        }
        avatar.checkRender()                  // throws Essence2RenderFailed if the engine stopped
        // a refused session throws Essence2MeteringRefused from pull() or idle()
    }
}
```

Frame size belongs to the identity (portrait 1080×1920, landscape 1920×1080 or 1280×720). Read `avatar.width` and `avatar.height`; do not hard-code them.

## Integrate into your app

In a live conversation, keep one avatar open and stream into it.

| Job | Expression 2 | Essence 2 |
|---|---|---|
| Stream audio as it arrives | `feed(chunk)` per chunk | `feed(chunk)` per chunk |
| Show frames | `pull(bitmap)` at 20 fps | `pull(buffer)` at 25 fps |
| End of a reply | `flushTail()` | `endOfAudio()` |
| Idle between replies | `avatar.idleLoop?.next(bitmap)` | `idle(buffer)` |
| Interrupt the reply | `resetState(true)` | `resetAudio()` |
| Check the session | `Expression2Exception` from `create` or `pull` | `Essence2MeteringRefused` from `pull`/`idle`; `checkRender()` throws `Essence2RenderFailed` if the engine stopped |

After your API secret is accepted, a network loss does not stop the session for 5 minutes of rendered video. After that, render calls throw a retryable exception until the connection returns. Usage is reported to your account when it does.

The [Flutter example app](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) is a complete voice conversation with idle and interruption, and it builds for Android from a clone.

## Platform notes

- **Release builds:** `isMinifyEnabled = true` needs nothing extra. Both AARs ship their own keep rules.
- **Two models in one app:** `essence2-android` needs `minSdk 29`. Raise the app to 29, or put each model in its own module.
- **Threads:** download and `create()` on a background thread. The first download is the size shown above, into app-private storage.
- **Check the version you resolved:** Gradle keeps an exact version, so read it back when behaviour differs from this page.

  ```bash
  ./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep ai.bithuman
  ```

- **Private avatars:** an avatar you created downloads with the secret you set with `Expression2Credential.set` or `Essence2Credential.set`; there is nothing else to pass.

## Performance

Frame rates on a Samsung Galaxy S25+ for both models are on [Mobile performance](/performance/mobile).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Expression2Exception` from `create()` naming the API secret | no secret set | call `Expression2Credential.set(secret)` before `fetch()` and `create()` |
| `MeteringRefused` on the first Essence 2 `pull()` | no secret set | call `Essence2Credential.set(secret)` before `fetch()` and `create()` |
| `Essence2StoreException` from `fetch()` | no secret was set when the store downloaded | call `Essence2Credential.set(secret)` before `fetch()` |
| Expression 2 renders slowly; `acceleratorNote` says no `libQnnTFLiteDelegate.so` | the accelerator runtime was excluded, or legacy packaging is off | keep the dependency whole and set `useLegacyPackaging = true` |
| The first Expression 2 `create()` takes about 30–45 s | the accelerator prepares the model once per process | create once, on a background thread, at app start |
| Download refused with `401` | the avatar is private | set its owner's API secret with `Expression2Credential.set` or `Essence2Credential.set` |
| `409 MODEL_NOT_GENERATED` on download | the agent has no model of that kind yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then retry |
| Manifest merge fails on `minSdk` | `essence2-android` needs `minSdk 29` | raise the module to 29 |
| `Unresolved reference: BuildConfig` | the Android Gradle Plugin turns `BuildConfig` off by default | add `buildFeatures { buildConfig = true }` |
| `Unresolved reference 'MeteredDoorResolver'` | the resolver's public name is `Essence2MeteredDoorResolver` | you rarely need it: `Essence2Credential.set(secret)` covers downloads. To pass a secret explicitly: `import ai.bithuman.essence2.Essence2MeteredDoorResolver`, then `Essence2ModelStore(context, urlResolver = Essence2MeteredDoorResolver(secret))` |
| `UnsatisfiedLinkError` on an emulator | the engines are `arm64-v8a` only | run on a physical arm64 handset |

## Reference

- [Android API reference](/sdk/android-api): every public class in both AARs.
- Examples: [Expression 2](/examples/android-expression2) · [Essence 2](/examples/android-essence2), complete apps you can clone.
- [Flutter example app](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat): a complete voice conversation for Android.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
- Licence: proprietary, bitHuman SDK License; the notice ships in each AAR. FFmpeg in `essence2-android` is LGPL: [relink materials](/legal/android-ffmpeg-lgpl).
