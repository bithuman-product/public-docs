---
title: "Kotlin / Android — Hello, avatar"
description: "Render an on-device AI avatar on Android in ~20 lines of Kotlin — Maven Central AARs for essence-1, expression-2 and essence-2, arm64-v8a, fully private lip-sync."
section: examples
group: "Examples"
order: 14
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Keys](https://www.bithuman.ai/developer/api-keys); see [Authentication](/api/authentication). Read it from env or your app config at startup; never hardcode it.
- **Android Studio** with NDK 28.0.13004108 and compile SDK 35. Add the dependency:

```kotlin
implementation("ai.bithuman:sdk:2.3.6")   // Maven Central
```

- Device floor: an `arm64-v8a` device (physical phone or **`arm64-v8a` emulator image**), **Android 10+ (API 29+)**. Inference is fully on-device — no cloud round-trip. ★The AAR ships **`arm64-v8a` only**, so an **x86_64** emulator resolves, builds and installs and then throws `UnsatisfiedLinkError` at the first `System.loadLibrary` — there is no fallback slice.
- A `.imx` model file pushed to the device (the snippet reads from `getExternalFilesDir(null)`).

> **Note** The Android / Kotlin SDK is in **Beta**. The API surface below is stable enough to build on, but expect minor changes ahead of GA. There is no standalone Android project under `Examples/` yet — this snippet is the canonical starting point; track the [Android SDK](/sdk/android) page for updates.

## Run it

1. In `app/build.gradle.kts`, restrict to `arm64-v8a` and add the dependency.

```kotlin
android {
    defaultConfig {
        ndk { abiFilters += setOf("arm64-v8a") }
        minSdk = 29

        // The code below reads BuildConfig.BITHUMAN_API_SECRET. That constant
        // does not exist unless you declare it here, and the value is taken
        // from the environment or from gradle.properties -- never from a
        // literal in a file you commit.
        val bithumanSecret: String =
            System.getenv("BITHUMAN_API_SECRET")
                ?: (project.findProperty("bithuman.apiSecret") as String?)
                ?: ""
        buildConfigField("String", "BITHUMAN_API_SECRET", "\"$bithumanSecret\"")
    }

    // Required. AGP 8.x defaults buildConfig to OFF, so without this line the
    // BuildConfig class is never generated at all.
    buildFeatures { buildConfig = true }
}
dependencies {
    implementation("ai.bithuman:sdk:2.3.6")   // Maven Central
}
```

> ★ **Both lines above are load-bearing, and the example did not compile without
> them.** `BuildConfig` is generated only when `buildFeatures.buildConfig` is
> `true`, and it has defaulted to **false** since AGP 8.0 — the version this
> documentation pins is **8.7.3** ([Android SDK
> verification](/sdk/android-verify)). With the block as it was printed here
> until 2026-09-06 — no `buildConfigField`, no `buildFeatures` — the snippet in
> [Full code](#full-code) fails at compile time with
> `Unresolved reference: BuildConfig`, not at runtime.
>
> **This still bakes the secret into the APK,** which is fine for the local
> hello-world this page is and wrong for anything you ship: a `buildConfigField`
> is a string constant in the compiled artifact and anyone can read it back out.
> It satisfies the "never hardcode it" rule in the prerequisites only in the
> sense that the value is not in your source tree. For a real app, have the
> device fetch a short-lived credential from **your** backend at startup and
> pass that to `Avatar.load(...)` instead — the parameter takes any `String`,
> so nothing else in the code below changes.

2. Push your model and audio onto the device's app-private external dir (or adapt the paths in the code).

```bash
adb push sample-avatar.imx /sdcard/Android/data/com.example.bithumanhello/files/
adb push speech.wav        /sdcard/Android/data/com.example.bithumanhello/files/
```

3. Drop the [Full code](#full-code) into `MainActivity.kt`, then Build and Run on the device.

## What you'll see

A full-screen `ImageView` shows the avatar lip-syncing to `speech.wav` — 16 kHz mono PCM in, lip-synced `Bitmap`s out at 25 fps, rendered entirely on the phone with no network inference.

## Full code

```kotlin
// MainActivity.kt — load the model, render frames, display them
package com.example.bithumanhello

import android.app.Activity
import android.os.Bundle
import android.widget.ImageView
import ai.bithuman.sdk.Avatar
import java.io.File

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val imageView = ImageView(this).also { setContentView(it) }

        // Read .imx + WAV from app-private external files dir.
        val dir   = getExternalFilesDir(null)!!
        val model = File(dir, "sample-avatar.imx").absolutePath
        val audio = File(dir, "speech.wav").absolutePath

        // composeFromFile() runs off the main thread; each Bitmap is a 25 fps frame.
        Thread {
            Avatar.load(model, apiSecret = BuildConfig.BITHUMAN_API_SECRET).use { avatar ->
                avatar.composeFromFile(audio).forEach { frame ->
                    val bmp = Avatar.bgrToBitmap(frame.bgr, frame.width, frame.height)
                    runOnUiThread { imageView.setImageBitmap(bmp) }
                }
            }
        }.start()
    }
}
```

Full source: [Android SDK reference](/sdk/android) — no standalone `Examples/` project yet; the SDK page carries the canonical streaming snippets.

## Second generation: expression-2 and essence-2

The example above is essence-1, the `ai.bithuman:sdk` artifact, and you push
its model file by hand. The two second-generation artifacts each ship a
**model store**, so the file becomes a download call. Both snippets below were
**compiled on 2026-09-07** against the published AARs — `expression2-android`
**0.3.1** and `essence2-android` **0.4.0**, resolved anonymously from Maven
Central by an outside Gradle project (AGP 8.7.3, Kotlin 2.0.21, JDK 17) with
no other path to the SDK: `compileReleaseKotlin` → `BUILD SUCCESSFUL`, and a
control that renames one call to a name that does not exist → `BUILD FAILED`,
`Unresolved reference`. Neither was run on a device for this page.

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("ai.bithuman:expression2-android:0.3.1")   // expression-2 — minSdk 26
    implementation("ai.bithuman:essence2-android:0.5.1")      // essence-2   — minSdk 29
}
```

### expression-2 — `Expression2ModelStore.fetch` and `Expression2Avatar`

```kotlin
// Expression2Hello.kt — fetch an expression-2 identity and render speech through it
package com.example.bithumanhello

import ai.bithuman.expression2.Accelerator
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2ModelStore
import ai.bithuman.expression2.Expression2Options
import ai.bithuman.expression2.Routing
import android.content.Context
import android.graphics.Bitmap

/** Renders [pcm16k] — 16 kHz mono float32 in [-1, 1] — for agent [code], handing every frame to [show]. */
fun renderExpression2(context: Context, code: String, pcm16k: FloatArray, show: (Bitmap) -> Unit) {
    // Public mirror, no credential. Blocks on the network (~158 MB the first time) — call it off the main thread.
    val model = Expression2ModelStore(context).fetch(code)

    Expression2Avatar.create(
        context, model,
        Expression2Options(
            accelerator = Accelerator.NPU,        // Qualcomm only; a bare Expression2Options() is the slow all-CPU default
            routing = Routing.HTP_DECODER,        // pass BOTH — NPU alone resolves to a routing nobody has measured
            qnnOptions = Expression2Options.QNN_OPTIONS_HEXAGON_BURST,
        ),
    ).use { avatar ->
        val frame = avatar.newFrameBitmap()       // ARGB_8888, 416 x 720 — allocate once, reuse it
        avatar.feed(pcm16k)                       // renders each complete 1.6 s chunk; pauses when its frame queue is full
        avatar.flushTail()                        // the padded tail is the last sentence — never skip it
        while (true) {
            if (avatar.pull(frame) != null) { show(frame); continue }   // pull resumes rendering where feed paused
            if (!avatar.hasPendingTail && avatar.queuedFrames == 0) break
        }
    }
}
```

`Accelerator.NPU` is the Qualcomm delegate, and it needs two more artifacts
in `dependencies` — `com.qualcomm.qti:qnn-litert-delegate:2.49.0` and
`com.qualcomm.qti:qnn-runtime:2.49.0` — plus
`packaging { jniLibs { useLegacyPackaging = true } }`; the
[Android SDK page](/sdk/android#the-accelerated-path-needs-two-more-artifacts)
has the measured reasons. On a non-Qualcomm device use `Accelerator.AUTO`,
which is all-CPU and slow. The model store's public mirror needs no
credential today.

### essence-2 — `Essence2ModelStore.fetch(code).open()`

```kotlin
// Essence2Hello.kt — fetch an essence-2 identity through the in-SDK store and play its recorded sequence
package com.example.bithumanhello

import ai.bithuman.essence2.Essence2BorrowRefused
import ai.bithuman.essence2.Essence2ModelStore
import ai.bithuman.elevate.Essence2ModelStore.PublicMirrorResolver  // nested types stay on the legacy package, kept for compatibility
import android.content.Context
import java.nio.ByteBuffer

/** Plays agent [code]'s recorded sequence into [show], one RGBA8888 frame at a time. False if the session was refused. */
fun playEssence2(context: Context, mirrorBase: String, code: String, show: (ByteBuffer) -> Unit): Boolean {
    // There is no default host yet — the mirror base is your argument. Blocks on the network; call it off the main thread.
    val store = Essence2ModelStore(context, urlResolver = PublicMirrorResolver(mirrorBase))
    val bundle = store.fetch(code)                // refused, naming the file, if any of the four recorded-mouth files is missing
    bundle.open().use { session ->                // the session already carries the avatar's recorded mouth
        val out = session.newFrameBuffer()        // RGBA8888, session.width x session.height
        return try {
            for (i in 0 until session.driveFrames) {
                if (session.renderDriveBorrow(i, out) >= 0) show(out)   // -1 on the first push: nothing written yet
            }
            if (session.flushBorrow(out) >= 0) show(out)
            true
        } catch (e: Essence2BorrowRefused) {
            false                                  // the session is over; there is no other render call to retry
        }
    }
}
```

Three things the [Android SDK page](/sdk/android#getting-a-model-onto-the-device)
explains and this snippet assumes: there is **no default mirror host yet**, so
`mirrorBase` is yours to supply; the session plays the avatar's recorded
sequence, because there is no audio-in entry point on this artifact yet; and a
refusal ends the session — there is no other render call to fall back to.

## Next steps

- [Android SDK](/sdk/android) — full walkthrough: API surface, streaming, `Fixture` + `Runtime`, and the two second-generation model stores.
- [Audio streaming](/concepts/audio-streaming) — the streaming contract that backs `composeFromFile`.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
