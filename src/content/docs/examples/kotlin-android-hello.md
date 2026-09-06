---
title: "Kotlin / Android — Hello, avatar"
description: "Render an on-device AI avatar on Android in ~20 lines of Kotlin — Maven Central AAR, arm64-v8a, fully private lip-sync."
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

## Next steps

- [Android SDK](/sdk/android) — full walkthrough: API surface, streaming, `Fixture` + `Runtime`.
- [Audio streaming](/concepts/audio-streaming) — the streaming contract that backs `composeFromFile`.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
