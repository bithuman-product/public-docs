---
title: "Kotlin / Android — Hello, avatar"
description: "Render an on-device AI avatar on Android in ~20 lines of Kotlin — Maven Central AAR, arm64-v8a, fully private lip-sync."
section: examples
group: "Examples"
order: 14
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Keys](https://www.bithuman.ai/#developer); see [Authentication](/api/authentication). Read it from env or your app config at startup; never hardcode it.
- **Android Studio** with NDK 28.0.13004108 and compile SDK 35. Add the dependency:

```kotlin
implementation("ai.bithuman:sdk:1.17.1")   // Maven Central
```

- Device floor: an `arm64-v8a` device (physical phone or arm64 emulator image), **Android 10+ (API 29+)**. Inference is fully on-device — no cloud round-trip.
- A `.imx` model file pushed to the device (the snippet reads from `getExternalFilesDir(null)`).

> **Note** The Android / Kotlin SDK is in **Beta**. The API surface below is stable enough to build on, but expect minor changes ahead of GA. There is no standalone Android project under `Examples/` yet — this snippet is the canonical starting point; track the [Android SDK](/sdk/android) page for updates.

## Run it

1. In `app/build.gradle.kts`, restrict to `arm64-v8a` and add the dependency.

```kotlin
android {
    defaultConfig {
        ndk { abiFilters += setOf("arm64-v8a") }
        minSdk = 29
    }
}
dependencies {
    implementation("ai.bithuman:sdk:1.17.1")   // Maven Central
}
```

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
// MainActivity.kt — load model, compose frames, display them
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

        // Compose runs off the main thread; each Bitmap is a 25 fps frame.
        Thread {
            Avatar.load(model).use { avatar ->
                avatar.composeFromFile(audio).forEach { frame ->
                    runOnUiThread { imageView.setImageBitmap(frame.toBitmap()) }
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
