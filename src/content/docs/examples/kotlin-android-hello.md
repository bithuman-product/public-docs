---
title: "Kotlin / Android — Hello, avatar"
description: "A complete Android project — every file in full — that renders a talking avatar on a physical phone from 16 kHz speech. Expression 2 from Maven Central, no API key, measured on a Galaxy S25+ on 2026-09-09."
section: examples
group: "Examples"
order: 14
---

This page is a whole project, not a fragment. Create the seven files below in the
order they appear, push one WAV, and a physical Android phone renders a talking
head from your audio — on the device, with no cloud round-trip and **no API key**.

**Measured on 2026-09-09**, exactly these files, on a Galaxy S25+ (SM-S936U1,
Snapdragon 8 Elite, Android 16): 5.72 s of speech in → **117 frames** of 416×720
out, rendered in 21.0 s, then played back in sync with the audio. The transcript
is [further down](#what-a-real-run-looks-like).

## What you end up with

An app that, when you tap it:

1. reads `speech.wav` out of its own external files directory,
2. downloads one published identity through the SDK's model store (about 158 MB,
   once, no credential),
3. renders every frame of the clip on the phone, then
4. plays the audio back and shows each frame on the audio clock, so the mouth
   matches what you hear.

It renders first and plays second on purpose: on the all-CPU arm this phone
renders about **5.6 frames per second**, and playback needs 20 — see
[On-device speed](/sdk/android#performance).

## Before you start

| You need | Why | Check it |
|---|---|---|
| A **physical `arm64-v8a` phone**, USB debugging on | every bitHuman AAR is `arm64-v8a` only; an x86_64 emulator installs and then throws `UnsatisfiedLinkError` | `adb devices` lists it — `adb` is **not** on your `PATH` by default; it ships inside the SDK at `$ANDROID_HOME/platform-tools`, which the export block below adds |
| That phone **unlocked**, not just awake | `adb shell input tap` is delivered to whatever window has focus, and on a locked phone that is the lock screen, not your app — the tap is swallowed with no error anywhere | `adb shell dumpsys window \| grep mCurrentFocus` names your activity, not `Bouncer` |
| **JDK 17** | the Android Gradle Plugin 8.7.3 this project pins refuses newer launcher JVMs — and refuses them illegibly: on a Homebrew JDK 26 the whole error is the string `26.0.2.1` | `"$JAVA_HOME/bin/java" -version` says `17.` — **not** bare `java -version`. Gradle launches the JVM that `JAVA_HOME` names, and bare `java` does not report it: on a Mac that *has* the required Homebrew `openjdk@17`, both `java -version` and `/usr/libexec/java_home -v 17` still print *"Unable to locate a Java Runtime"*, because a Homebrew JDK is keg-only and is never linked into `/Library/Java/JavaVirtualMachines`. Measured on macOS 26.6.2, 2026-09-09 |
| An **Android SDK** with platform 35 | `compileSdk = 35` below | `$ANDROID_HOME/platforms/android-35` exists |
| **Network on the phone** for the first run | the model store downloads the identity once | — |

★ **Building from a terminal? Set these three, in this order.** Android Studio
writes `local.properties` and finds `adb` for you; a plain terminal does neither
— without `ANDROID_HOME` the very first Gradle task fails with *"SDK location
not found"*, and without the `PATH` line every `adb` command on this page is
`adb: command not found`. Paste the whole block into the shell you build in:

```bash
# 1 · JDK 17 — AGP 8.7.3 refuses newer launcher JVMs.
#     java_home finds a Temurin/Oracle JDK; the brew fallback exists because a
#     Homebrew openjdk@17 is keg-only, so java_home cannot see it at all.
export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null \
  || echo "$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home")"
#     Linux instead:  export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# 2 · the Android SDK (macOS/Android Studio default; ~/Android/Sdk on Linux;
#     wherever you installed it — the next line follows whatever you set here)
export ANDROID_HOME="$HOME/Library/Android/sdk"

# 3 · adb ships INSIDE the SDK and nothing on macOS or Linux puts it on PATH
export PATH="$ANDROID_HOME/platform-tools:$PATH"

# Both of these must answer before you build — they are the real checks:
"$JAVA_HOME/bin/java" -version   # → openjdk version "17.…"   (bare `java -version` will NOT say this)
adb version                      # → Android Debug Bridge version 1.0.41
```

Instead of exporting `ANDROID_HOME` you may write `echo "sdk.dir=$ANDROID_HOME"
> local.properties` next to `settings.gradle.kts` — but that only feeds Gradle.
`adb` still needs the `PATH` line.

Android Studio gives you the JDK and the SDK. You do not need an API key, a
bitHuman account, or a `.imx` file for this page — [Expression 2](/concepts/models)
identities on the public mirror are fetched by agent code alone.

## Step 1 — make `speech.wav`

The engine takes **16 kHz mono** audio. Anything else is rejected by the reader in
`MainActivity.kt` with a message naming what it found.

On macOS, with nothing installed:

```bash
say -o /tmp/speech.aiff "Hello. I am an on device avatar. Every frame you see was rendered on this phone."
afconvert -f WAVE -d LEI16@16000 -c 1 /tmp/speech.aiff /tmp/speech.wav
```

With `ffmpeg`, from any audio file you already have:

```bash
ffmpeg -i whatever.mp3 -ac 1 -ar 16000 -c:a pcm_s16le /tmp/speech.wav
```

★ **Do not skip 44 bytes to find the samples.** `afconvert` writes an `FLLR`
padding chunk between the header and the data, so the classic "the data starts at
byte 44" shortcut reads padding as audio and the avatar mouths noise. The reader
below walks the RIFF chunks instead. This is measured, not theoretical: the WAV
this page's run used has its `data` chunk at byte **4,096**.

## Step 2 — create the project

Two ways to get a directory with a Gradle wrapper in it.

**From Android Studio.** *New Project → Empty Views Activity*, package
`com.example.x2hello`, language Kotlin, minimum SDK 26. Then replace the files it
generated with the ones below, and delete the `res/` layout and theme files it
made — this project builds its UI in code and needs no resources.

**From a terminal**, if you have Gradle installed. ★ **Make the directories,
write the seven files from [Step 3](#step-3--the-files-in-order), and run
`gradle wrapper` last** — on Gradle 9 that order is not optional, and the two
wrong orders are measured below:

```bash
mkdir -p x2hello/app/src/main/java/com/example/x2hello && cd x2hello
#  <- write the seven files from Step 3 into this tree now, then:
gradle wrapper --gradle-version 8.11.1      # writes gradlew + gradle/wrapper/*
```

★ **Why the wrapper comes last: `gradle wrapper` needs a build to attach itself
to.** Gradle 8 would write a wrapper into an empty directory; **Gradle 9 will
not**, and it is the Gradle you get from Homebrew today. Measured on 2026-09-09
with Gradle 9.7.1 (launcher JVM 17.0.20.1), three orders, one command:

| When you run `gradle wrapper --gradle-version 8.11.1` | What Gradle 9.7.1 does |
|---|---|
| in the freshly-`mkdir`'d tree, **no files written yet** — the order this page printed until today | `FAILURE … Directory '…/x2hello' does not contain a Gradle build.` **No `gradlew`, no `gradle/wrapper/`.** |
| with `settings.gradle.kts` written but the `app/` directory missing | `FAILURE … Configuring project ':app' without an existing directory is not allowed.` |
| with **all seven files** of Step 3 in place | `BUILD SUCCESSFUL in 728ms` — `gradlew` and `gradle/wrapper/{gradle-wrapper.jar,gradle-wrapper.properties}` appear |

The failure is not about bitHuman and not about AGP: `gradle wrapper` is a task,
tasks belong to a build, and Gradle 9 refuses to invent one. If your `gradle`
is 8.x the first row succeeds too — which is why this page said what it said,
and why the durable instruction is the order above rather than a version check.

The Gradle that writes the wrapper does not have to be the Gradle that builds:
the run below used Gradle **9.7.1** on `PATH` to generate a **8.11.1** wrapper,
and every later command is `./gradlew`, which downloads 8.11.1 the first time.
**Android Studio is unaffected** — it writes the wrapper as part of creating the
project, before there is anything for you to get out of order.

Either way, this is the whole tree — seven files you write, plus the wrapper:

```text
x2hello/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradlew                                  (from the wrapper)
├── gradle/wrapper/gradle-wrapper.jar        (from the wrapper)
├── gradle/wrapper/gradle-wrapper.properties
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        └── java/com/example/x2hello/MainActivity.kt
```

## Step 3 — the files, in order

Every file is complete. Nothing is elided, and nothing else is needed.

### 1. `settings.gradle.kts`

`google()` in **both** blocks. AGP resolves its own `aapt2` out of the dependency
repositories and `aapt2` is published only on Google's Maven; with `mavenCentral()`
alone this project configures, compiles Kotlin, and then dies at
`:app:processDebugResources` with `Could not find com.android.tools.build:aapt2`.
That has nothing to do with bitHuman — [the SDK page](/sdk/android#install)
has the transcript.

```kotlin
// settings.gradle.kts
pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositories {
        google()         // AGP resolves its own aapt2 from here — without it the build
                         // dies at :app:processDebugResources, nothing to do with bitHuman
        mavenCentral()   // ai.bithuman:expression2-android
    }
}
rootProject.name = "x2hello"
include(":app")
```

### 2. `build.gradle.kts`

AGP **8.7.3** and Kotlin **2.0.21** are the versions every number on this page and
on [Android](/sdk/android) were measured with.

```kotlin
// build.gradle.kts  (project root)
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
```

### 3. `gradle.properties`

```properties
# gradle.properties
android.useAndroidX=true
org.gradle.jvmargs=-Xmx2g
```

### 4. `gradle/wrapper/gradle-wrapper.properties`

If you ran `gradle wrapper --gradle-version 8.11.1` you already have this file; it
is printed so the version is not a guess — and if you are writing the seven files
by hand before running the wrapper (Step 2), this is the one of them the wrapper
task then rewrites. Gradle 9.7.1 wrote back two extra keys, `retries=0` and
`retryBackOffMs=500`; they are its defaults, they change nothing here, and a file
that gains them has not gone wrong.

```properties
# gradle/wrapper/gradle-wrapper.properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

### 5. `app/build.gradle.kts`

Three lines here are load-bearing and each one is silent when it is missing:
`minSdk = 26` (the AAR's own floor), `abiFilters` (the only ABI published), and
`useLegacyPackaging = true` — without the last one the installer leaves no `.so`
files on disk, which the accelerated path needs to find by file name.

```kotlin
// app/build.gradle.kts
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace  = "com.example.x2hello"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.x2hello"
        minSdk        = 26                      // the AAR's own floor
        targetSdk     = 35
        versionCode   = 1
        versionName   = "1.0"
        ndk { abiFilters += "arm64-v8a" }       // the only ABI published
    }

    // Not optional: the SDK looks for its native libraries as real files on disk.
    packaging { jniLibs { useLegacyPackaging = true } }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("ai.bithuman:expression2-android:0.4.1")
}
```

### 6. `app/src/main/AndroidManifest.xml`

No resources, no theme of your own, no `res/` directory: the activity builds its
views in code, so this manifest is the whole of the app's configuration.

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- The model store downloads over HTTPS. The AAR declares INTERNET itself and it
         merges into your app; it is repeated here so nothing is invisible. -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:label="x2hello"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar.Fullscreen">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### 7. `app/src/main/java/com/example/x2hello/MainActivity.kt`

The one Kotlin file. It is long because it is complete — the audio reader, the
render loop, and the playback clock are all here, and none of them is left as an
exercise.

```kotlin
// app/src/main/java/com/example/x2hello/MainActivity.kt
package com.example.x2hello

import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2ModelStore
import ai.bithuman.expression2.Expression2Options
import android.app.Activity
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Hello, avatar — Expression 2 on Android.
 *
 * Reads speech.wav from the app's own external files dir, renders it through the
 * on-device avatar, then plays the audio back with the rendered frames.
 * Nothing but the one-time model download leaves the phone.
 */
class MainActivity : Activity() {

    /** A published identity on the public mirror. Swap in your own agent code. */
    private val agentCode = "A66GYD8664"

    /**
     * How the engine is built.
     *
     * A bare Expression2Options() is all-CPU and renders on every arm64 device — start
     * here. To try the Qualcomm accelerator, add the two QNN artifacts to
     * app/build.gradle.kts and use:
     *
     *     import ai.bithuman.expression2.Routing
     *     private val options = Expression2Options(
     *         routing    = Routing.HTP_DECODER,
     *         qnnOptions = Expression2Options.QNN_OPTIONS_HEXAGON_BURST,
     *     )
     *
     * Leaving `accelerator` at its AUTO default is what makes that safe: the SDK tries
     * the accelerator and falls back to the CPU by itself, and says so in
     * avatar.acceleratorNote. Writing accelerator = Accelerator.NPU turns the same
     * refusal into a thrown exception and no frames.
     */
    private val options = Expression2Options()

    private lateinit var image: ImageView
    private lateinit var status: TextView

    @Volatile private var busy = false
    private var frames: List<ByteArray> = emptyList()
    private var pcm: FloatArray = FloatArray(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        image = ImageView(this).apply { scaleType = ImageView.ScaleType.FIT_CENTER }
        status = TextView(this).apply {
            setBackgroundColor(0xCC000000.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 13f
            setPadding(28, 28, 28, 28)
        }
        val root = FrameLayout(this).apply {
            setBackgroundColor(0xFF101014.toInt())
            addView(image, FrameLayout.LayoutParams(MATCH, MATCH))
            addView(status, FrameLayout.LayoutParams(MATCH, WRAP, Gravity.BOTTOM))
            setOnClickListener { start() }        // tap to run again
        }
        setContentView(root)
        start()
    }

    private fun start() {
        if (busy) return
        busy = true
        Thread {
            try {
                if (frames.isEmpty()) renderOnce() else say("replaying ${frames.size} frames")
                if (frames.isNotEmpty()) play()
            } catch (t: Throwable) {
                Log.e(TAG, "failed", t)
                say("FAILED: $t")
            } finally {
                busy = false
            }
        }.start()
    }

    // ---------------------------------------------------------------- render

    private fun renderOnce() {
        val wav = File(getExternalFilesDir(null), "speech.wav")
        if (!wav.isFile) {
            say("No speech.wav yet. On your machine:\n\nadb push speech.wav ${wav.absolutePath}\n\nthen tap the screen.")
            return
        }
        pcm = readWav16kMono(wav)
        val seconds = pcm.size.toFloat() / Expression2Avatar.SAMPLE_RATE
        val expected = Math.round(seconds * Expression2Avatar.FRAMES_PER_SECOND)
        say("audio: ${pcm.size} samples = %.2f s\nfetching model $agentCode — first run downloads ~158 MB…".format(seconds))

        // Blocks on the network the first time; that is why this is a worker thread.
        val model = Expression2ModelStore(this).fetch(agentCode)
        say("model ready — starting the engine…")

        val t0 = System.currentTimeMillis()
        val avatar = Expression2Avatar.create(this, model, options)
        Log.i(TAG, "engine: acc=${avatar.accelerator} routing=${avatar.routing} " +
            "initMs=${avatar.initMs} note=${avatar.acceleratorNote}")
        val out = ArrayList<ByteArray>(expected + 8)
        val jpeg = ByteArrayOutputStream(96 * 1024)

        avatar.use {
            val frame = avatar.newFrameBitmap()   // ARGB_8888, 416 x 720 — allocate once
            avatar.feed(pcm)                      // renders each complete 1.6 s chunk
            avatar.flushTail()                    // the padded tail is the last sentence
            while (true) {
                if (avatar.pull(frame) != null) {
                    if (out.isEmpty()) Log.i(TAG, "FIRST_FRAME at ${System.currentTimeMillis() - t0} ms")
                    jpeg.reset()
                    frame.compress(Bitmap.CompressFormat.JPEG, 85, jpeg)
                    out.add(jpeg.toByteArray())
                    if (out.size % 10 == 0) {
                        val preview = frame.copy(Bitmap.Config.ARGB_8888, false)
                        runOnUiThread { image.setImageBitmap(preview) }
                        say("rendering ${out.size} / $expected frames…")
                    }
                    continue
                }
                if (!avatar.hasPendingTail && avatar.queuedFrames == 0) break
            }
        }
        frames = out
        Log.i(TAG, "DONE_FRAMES ${out.size} in ${System.currentTimeMillis() - t0} ms")
        say("rendered ${out.size} frames in ${(System.currentTimeMillis() - t0) / 1000} s — playing…")
    }

    // -------------------------------------------------------------- playback

    /** Plays the PCM and shows each frame on the audio clock: 800 samples per frame at 20 fps. */
    private fun play() {
        val samples = ShortArray(pcm.size) { (pcm[it] * 32767f).toInt().toShort() }
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(Expression2Avatar.SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setTransferMode(AudioTrack.MODE_STATIC)
            .setBufferSizeInBytes(samples.size * 2)
            .build()
        try {
            track.write(samples, 0, samples.size)
            track.play()
            val perFrame = Expression2Avatar.SAMPLE_RATE / Expression2Avatar.FRAMES_PER_SECOND  // 800
            var shown = -1
            val deadline = System.currentTimeMillis() + (samples.size * 1000L / Expression2Avatar.SAMPLE_RATE) + 3000
            while (true) {
                val head = track.playbackHeadPosition           // samples the DAC has consumed
                val i = head / perFrame
                if (i < frames.size && i != shown) {
                    shown = i
                    val bmp = BitmapFactory.decodeByteArray(frames[i], 0, frames[i].size)
                    runOnUiThread { image.setImageBitmap(bmp) }
                }
                // The last frames are the padded tail, past the end of the audio.
                if (head >= samples.size || i >= frames.size) break
                if (System.currentTimeMillis() > deadline) break
                Thread.sleep(5)
            }
        } finally {
            track.stop()
            track.release()
        }
        say("${frames.size} frames, ${"%.2f".format(pcm.size.toFloat() / Expression2Avatar.SAMPLE_RATE)} s — tap to replay")
    }

    // ------------------------------------------------------------------ wav

    /**
     * 16-bit PCM WAV -> the FloatArray feed() takes: 16 kHz mono float32 in [-1, 1].
     * Walks the RIFF chunks — do not assume the data starts at byte 44, because real
     * encoders (macOS afconvert, for one) insert padding chunks before it.
     */
    private fun readWav16kMono(file: File): FloatArray {
        val b = file.readBytes()
        val bb = ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN)
        require(b.size > 44 && tag4(b, 0) == "RIFF" && tag4(b, 8) == "WAVE") { "${file.name} is not a RIFF/WAVE file" }
        var pos = 12
        var channels = 0; var rate = 0; var bits = 0; var dataAt = -1; var dataLen = 0
        while (pos + 8 <= b.size) {
            val id = tag4(b, pos)
            var size = bb.getInt(pos + 4)
            if (size < 0 || pos + 8 + size > b.size) size = b.size - (pos + 8)
            when (id) {
                "fmt " -> {
                    channels = bb.getShort(pos + 10).toInt()
                    rate = bb.getInt(pos + 12)
                    bits = bb.getShort(pos + 22).toInt()
                }
                "data" -> { dataAt = pos + 8; dataLen = size }
            }
            pos += 8 + size + (size and 1)
        }
        require(dataAt >= 0) { "${file.name} has no data chunk" }
        require(channels == 1 && rate == Expression2Avatar.SAMPLE_RATE && bits == 16) {
            "need 16 kHz mono 16-bit PCM; ${file.name} is $rate Hz, $channels ch, $bits-bit"
        }
        val n = dataLen / 2
        return FloatArray(n) { bb.getShort(dataAt + it * 2) / 32768f }   // the normalisation feed() expects
    }

    private fun tag4(b: ByteArray, at: Int) = String(b, at, 4, Charsets.US_ASCII)

    private fun say(msg: String) {
        Log.i(TAG, msg.replace('\n', ' '))
        runOnUiThread { status.text = msg }
    }

    private companion object {
        const val TAG = "X2HELLO"
        val MATCH = FrameLayout.LayoutParams.MATCH_PARENT
        val WRAP = FrameLayout.LayoutParams.WRAP_CONTENT
    }
}
```

## Step 4 — build, install, run

```bash
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.example.x2hello/.MainActivity
```

The app starts with no audio and tells you exactly what to do about it — the
external files directory only exists once the app has run once:

```text
No speech.wav yet. On your machine:

adb push speech.wav /storage/emulated/0/Android/data/com.example.x2hello/files/speech.wav

then tap the screen.
```

So:

```bash
adb push /tmp/speech.wav /storage/emulated/0/Android/data/com.example.x2hello/files/speech.wav
adb shell input tap 540 900          # or just tap the phone — see below if nothing happens
adb logcat -v time | grep X2HELLO
```

★ **If the tap does nothing, the phone is locked.** Measured on 2026-09-09: with
the handset awake but on its lock screen, `dumpsys window` reads
`mCurrentFocus=Window{… Bouncer}` while `mFocusedApp` is still
`com.example.x2hello/.MainActivity` — the activity is running behind the
keyguard, so `input tap` lands on the lock screen and the app never hears it. No
command reports an error; twelve polls of `logcat` showed the same
"No speech.wav yet" line as if nothing had been pushed. Unlock the phone, or skip
the tap entirely — the activity renders in `onCreate`, so restarting it picks the
file up:

```bash
adb shell am force-stop com.example.x2hello
adb shell am start -n com.example.x2hello/.MainActivity
```

## What a real run looks like

Debug APK **3,474,583 B** — a debug APK moves a few hundred bytes between builds,
so treat that as *about* 3.47 MB rather than a checksum. Galaxy S25+,
`A66GYD8664`, the `say`/`afconvert` clip above, 2026-09-09 — logcat, verbatim,
with the progress lines removed:

```text
09-09 11:54:22.898 I/X2HELLO: audio: 91477 samples = 5.72 s fetching model A66GYD8664 — first run downloads ~158 MB…
09-09 11:54:22.918 I/X2HELLO: model ready — starting the engine…
09-09 11:54:23.473 I/X2HELLO: engine: acc=CPU routing=Routing(enc=CPU, tok14=CPU, step=CPU, dec=CPU) initMs=525.43505859375 note=
09-09 11:54:43.356 I/X2HELLO: FIRST_FRAME at 20438 ms
09-09 11:54:43.950 I/X2HELLO: DONE_FRAMES 117 in 21032 ms
09-09 11:54:43.950 I/X2HELLO: rendered 117 frames in 21 s — playing…
09-09 11:54:49.655 I/X2HELLO: 117 frames, 5.72 s — tap to replay
```

117 frames for 5.72 s of audio is the published contract — 20 fps × 5.72 s = 114,
plus the three padded tail frames that `flushTail()` produces past the end of the
speech. 117 frames in 21.0 s, of which 0.5 s is the engine starting, is **5.7
frames per second** of render on the all-CPU arm; the wall clock moves a few
percent between runs (20.4–22.4 s across six builds).

### This page was executed, not written

The seven files above were parsed back **out of this page as it is served**, and
built in a directory that did not exist. On 2026-09-09, after the page went live:
the working tree was deleted, `com.example.x2hello` and its cached 158 MB model
were uninstalled from the phone, the code blocks were extracted from the HTML of
this URL, `gradle wrapper` + `./gradlew :app:assembleDebug` produced
`app-debug.apk` **3,474,583 B**, and the phone rendered **117 frames** again
(`FIRST_FRAME at 20724 ms`, `DONE_FRAMES 117 in 21322 ms`).

The frames are audio-driven, and that is measured rather than asserted. Taking
one delivered 416×720 frame every 20, and differencing each against the first:
the muzzle band moves **16–84×** more than a control box of the same width taken
below the subject, where nothing should move. A still image, or a mouth pasted on
a loop, would not separate the two boxes.

| frame | mean \|Δ\| in the muzzle band | same in the null control box | ratio |
|---|---:|---:|---:|
| 40 | 45.24 | 0.54 | **84×** |
| 60 | 27.63 | 1.72 | **16×** |
| 80 | 50.11 | 2.93 | **17×** |

★ **Why nothing appears for twenty seconds and then everything does.** The
first frame arrives only when `feed()` returns, because `feed()` is where the
compute happens: it renders every chunk whose look-ahead has arrived, and
`pull()` then drains a queue that is already full. That is why the app renders
the whole clip before it plays a second of it, and why `FIRST_FRAME` and
`DONE_FRAMES` are 0.6 s apart in the transcript above.

**Executed a second time, from zero, on 2026-09-09.** The whole working tree
was deleted again (`rm -rf ~/_devwalk_android`), the seven files were parsed out
of the served HTML of this URL by a script that types none of them, `gradle
wrapper --gradle-version 8.11.1` and `./gradlew :app:assembleDebug` produced
`app-debug.apk` **3,474,603 B**, and the same phone rendered **117 frames**
again: `FIRST_FRAME at 20765 ms`, `DONE_FRAMES 117 in 21369 ms`, from
`audio: 91477 samples = 5.72 s`. Two independent extractions of this page, twenty
bytes apart in the APK and 47 ms apart in the render — the page is the project.

**Executed a third time, from zero — and this is the run that caught the step
order.** 2026-09-09, same handset: `com.example.x2hello` was **uninstalled** (so
the cached 158 MB model went with it), `~/_devwalk_android` (78 MB) was deleted,
and a script re-fetched **183,783 bytes** of this URL and parsed the seven files
out of it. Run in the order this page printed until today — `mkdir`, then
`gradle wrapper` — **it stopped there**: `Directory '…/x2hello' does not contain
a Gradle build`, no `gradlew` written. That is [now fixed in Step 2](#step-2--create-the-project);
the two earlier executions had been done files-first, so the page had published
an order that neither run had actually taken. Files first, then the wrapper:
`BUILD SUCCESSFUL`, `app-debug.apk` **3,474,583 B**, install, one `adb push`,
and

```text
09-09 13:08:14.445 I/X2HELLO: audio: 91477 samples = 5.72 s fetching model A66GYD8664 — first run downloads ~158 MB…
09-09 13:08:17.069 I/X2HELLO: model ready — starting the engine…
09-09 13:08:17.713 I/X2HELLO: engine: acc=CPU routing=Routing(enc=CPU, tok14=CPU, step=CPU, dec=CPU) initMs=607.658203125 note=
09-09 13:08:38.347 I/X2HELLO: DONE_FRAMES 117 in 21278 ms
09-09 13:08:44.039 I/X2HELLO: 117 frames, 5.72 s — tap to replay
```

★ **The frames were checked as pixels, not as a counter.** One added line in a
copy of `MainActivity.kt` wrote every twentieth delivered `Bitmap` out as a PNG
(`FIRST_FRAME at 20709 ms`, `DONE_FRAMES 117 in 22472 ms` on that build), and the
five 416×720 frames were pulled off the phone and differenced against the first.
The muzzle band moves **19–134×** more than a box of static background in the
same frames:

| frame | mean \|Δ\| in the muzzle band (rows 340–400) | background control (rows 20–110) | ratio |
|---|---:|---:|---:|
| 40 | 48.39 | 0.36 | **134×** |
| 60 | 29.43 | 1.02 | **29×** |
| 80 | 53.21 | 1.47 | **36×** |
| 100 | 34.81 | 1.79 | **19×** |

A still image would put both columns at zero; a video loop would move both. The
separation is what says the mouth is following the audio.

## When it does not work

| What you see | What it is | Fix |
|---|---|---|
| `adb: command not found` (or `zsh: command not found: adb`) | `adb` ships inside the SDK at `$ANDROID_HOME/platform-tools` and nothing adds it to `PATH` for you | the `export PATH=` line in [Before you start](#before-you-start) |
| `SDK location not found … ANDROID_HOME … sdk.dir` | you are building from a terminal, so nothing wrote `local.properties` | Before you start — export `ANDROID_HOME` or write `sdk.dir=` |
| `java -version` says *"Unable to locate a Java Runtime"* on a Mac that has JDK 17 | a Homebrew JDK is keg-only, so neither bare `java` nor `/usr/libexec/java_home` ever sees it — the check is wrong, not the machine | check `"$JAVA_HOME/bin/java" -version` instead; set `JAVA_HOME` with the block in [Before you start](#before-you-start) |
| A `What went wrong:` whose whole body is a version like `26.0.2.1` | `JAVA_HOME` points at a JDK newer than 17 | point it at JDK 17 |
| `Could not find com.android.tools.build:aapt2` | `google()` missing from `dependencyResolutionManagement` | Step 3, `settings.gradle.kts` |
| `FAILURE … Directory '…' does not contain a Gradle build` from `gradle wrapper` | you ran the wrapper before writing the files; Gradle 9 will not write a wrapper into an empty directory | write the seven files of Step 3 first, then `gradle wrapper` — [Step 2](#step-2--create-the-project) |
| `Configuring project ':app' without an existing directory is not allowed` | `settings.gradle.kts` says `include(":app")` and there is no `app/` directory yet | `mkdir -p app/src/main/java/com/example/x2hello` (the `mkdir` line in Step 2 makes it) |
| `UnsatisfiedLinkError` at first launch | an x86_64 emulator, or a device that is not `arm64-v8a` | use a physical arm64 phone |
| `HTTP 400 … Object not found` naming a `web_manifest.json` URL | that agent code is not on the public mirror | [check the code first](/sdk/android#get-a-model) |
| `speech.wav is not a RIFF/WAVE file` | you pushed an AIFF/MP3, or the push landed elsewhere | re-run the `afconvert`/`ffmpeg` line in Step 1 |
| `need 16 kHz mono 16-bit PCM; speech.wav is 44100 Hz, 2 ch, 16-bit` | wrong sample rate or channel count | `-ac 1 -ar 16000` |
| App shows the push instructions again after you pushed | the file landed in another package's directory | the path in the message is the one to use, verbatim |
| App shows the push instructions and `adb shell input tap` changes nothing | the phone is locked — the tap goes to the keyguard | unlock it, or `am force-stop` then `am start` (Step 4) |
| `Expression2Exception: … the QNN delegate refused it` | you asked for `Accelerator.NPU` explicitly | see the next section — do not name the accelerator |

## Optional — ask for the accelerator without risking zero frames

Add the Qualcomm delegate and runtime to `app/build.gradle.kts`:

```kotlin
dependencies {
    implementation("ai.bithuman:expression2-android:0.4.1")
    implementation("com.qualcomm.qti:qnn-litert-delegate:2.49.0")   // both on Maven Central
    implementation("com.qualcomm.qti:qnn-runtime:2.49.0")           // no Qualcomm account needed
}
```

and name the **routing**, leaving `accelerator` at its `AUTO` default:

```kotlin
import ai.bithuman.expression2.Routing

private val options = Expression2Options(
    routing    = Routing.HTP_DECODER,
    qnnOptions = Expression2Options.QNN_OPTIONS_HEXAGON_BURST,
)
```

★ **`AUTO` is the fallback, and it is the whole difference between an app that
renders and an app that does not.** Three arms, same phone, same identity, same
audio, 2026-09-09 — only the options changed:

| `Expression2Options(…)` | QNN in the APK | Result |
|---|---|---|
| `()` — the file above | no | `acc=CPU`, **117 frames** |
| `routing = HTP_DECODER, qnnOptions = …` | no | `acc=CPU`, note *"no libQnnTFLiteDelegate.so in this APK — add com.qualcomm.qti:qnn-litert-delegate…"*, **117 frames** |
| `routing = HTP_DECODER, qnnOptions = …` | yes | `acc=CPU`, note *"the Hexagon refused this graph, fell back to XNNPACK: …"*, **117 frames** |
| `accelerator = Accelerator.NPU, routing = HTP_DECODER` | yes | `Expression2Exception: TfLiteInterpreterCreate returned null (graph rejected) … this device has no usable Hexagon for this graph`, **0 frames** |

The last row is the control: one token turns a working app into a crashed one.
Naming `Accelerator.NPU` makes the refusal fatal; leaving it at `AUTO` lets the
SDK build the CPU arm instead and record why in `avatar.acceleratorNote`, which
is why the app logs that field. All four rows were run on the same handset, the
same identity and the same clip on 2026-09-09, and the fourth is what makes the
first three a finding rather than a phone that only ever says `CPU`. The APK cost
is real too — **3,474,583 B** without the QNN artifacts, **75,981,876 B** with
them.

★ **This particular refusal is a Snapdragon 8 Elite (SM8750) fact**, not a
universal one: the Android member was tuned on an SM8550, where the same options
run the decoder on the Hexagon. Keep `AUTO` and you get whichever is available.

## Where the agent code comes from

`A66GYD8664` is a published identity on the SDK's default mirror. To use your own,
`POST /v1/agent/generate` with `model: "expression-2"` returns an `agent_code`
([Agents](/api/agents)) — but not every agent is mirrored, so check it before you
build it into an app. [The SDK page](/sdk/android#get-a-model)
carries the one-line `curl` and its negative control, plus the four codes verified
anonymously on 2026-09-09.

## Feed the microphone instead of a file

`feed()` takes any length of audio, so a live app skips the WAV entirely. Add
`<uses-permission android:name="android.permission.RECORD_AUDIO" />` to the
manifest, request it at runtime, and read float samples straight out of
`AudioRecord` — no conversion, because `ENCODING_PCM_FLOAT` is already the
`[-1, 1]` float32 the engine wants:

```kotlin
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder

/** Records [seconds] of 16 kHz mono float audio in the exact form feed() takes. */
fun recordMic(seconds: Int): FloatArray {
    val rate = 16000
    val min = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT)
    val rec = AudioRecord(
        MediaRecorder.AudioSource.VOICE_RECOGNITION, rate,
        AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT, maxOf(min, rate * 2),
    )
    val out = FloatArray(rate * seconds)
    rec.startRecording()
    var n = 0
    while (n < out.size) {
        val got = rec.read(out, n, out.size - n, AudioRecord.READ_BLOCKING)
        if (got <= 0) break
        n += got
    }
    rec.stop(); rec.release()
    return out.copyOf(n)
}
```

Compiled against `expression2-android:0.3.1` — the version current that day —
with the project above on 2026-09-09. Feeding a microphone live also means feeding *while* pulling — the
SDK is built for that ([the streaming contract](/concepts/audio-streaming)), but
remember this phone's all-CPU arm renders slower than real time, so a live app
either asks for the accelerator or falls behind.

## The first-generation artifact — essence-1 (`ai.bithuman:sdk:2.3.6`)

Everything above is [Expression 2](/concepts/models). essence-1 is the older
`ai.bithuman:sdk` artifact: it renders at 25 fps, it takes a `.imx` model file you
push yourself, and it needs an **API secret**.

> **The published `ai.bithuman:sdk:2.3.6` cannot authenticate on an Android device,
> so the example below compiles and installs and then throws before its first
> frame. Measured on a Galaxy S25+ on 2026-09-09**, with a real API secret and the
> showcase `.imx` from Step 2 on the phone:
>
> ```text
> ai.bithuman.sdk.BithumanException: be_auth_authenticate: status=11
>   msg=curl_easy_perform: SSL peer certificate or SSH remote key was not OK
>     at ai.bithuman.sdk.Avatar$Companion.load(Avatar.kt:185)
>     at com.example.bithumanhello.MainActivity.onCreate(MainActivity.kt:22)
> ```
>
> The artifact's native library ships with no CA trust store, and there is no
> app-side workaround on this version — the full measurement, with the two controls
> that rule out your network and your key, is on
> [the Android SDK page](/sdk/android#troubleshooting). It compiles:
> built from the block below exactly as printed, `BUILD SUCCESSFUL`, 20,515,057 B
> debug APK. It just cannot get past `Avatar.load`.
>
> **For a talking head on Android today, use the Expression 2 project at the top of
> this page.** It needs no key and no `.imx`.

It is still published and still supported; it is second on this page because it
is the longer road to a first frame.

### What essence-1 needs that Expression 2 does not

- A bitHuman API secret — get one at [Developer → API Keys](https://www.bithuman.ai/developer/api-keys); see [Authentication](/api/authentication). Read it from env or your app config at startup; never hardcode it.
- **Android Studio** with NDK 28.0.13004108 and compile SDK 35. Add the dependency:

```kotlin
implementation("ai.bithuman:sdk:2.3.6")   // Maven Central
```

- Device floor: an `arm64-v8a` device (physical phone or **`arm64-v8a` emulator image**), **Android 10+ (API 29+)** for the essence-1 example on this page — the expression-2 AAR's own floor is lower, `minSdk 26`. Inference is fully on-device — no cloud round-trip. ★The AAR ships **`arm64-v8a` only**, so an **x86_64** emulator resolves, builds and installs and then throws `UnsatisfiedLinkError` at the first `System.loadLibrary` — there is no fallback slice.
- A `.imx` model file pushed to the device (the snippet reads from `getExternalFilesDir(null)`). **Where to get one:** create an essence-1 agent and download its artifact with `GET /v1/agent/{code}/model/download` ([Agents](/api/agents)), or pull a showcase identity — `https://models.bithuman.ai/showcase/<slug>.imx`, e.g. `modern-court-jester` — see [Avatars and the .imx format](/concepts/avatars-imx). The two second-generation sections below need **no** `.imx` and no manual push: their model stores download the identity by agent code.

> **Note** The Android / Kotlin SDK is in **Beta**. The API surface is stable enough
> to build on, but expect minor changes ahead of GA. The complete project at the top
> of this page is the canonical starting point; track the
> [Android SDK](/sdk/android) page for updates.

### Running the essence-1 example

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
> verification](/sdk/android)). With the block as it was printed here
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
   The project skeleton is the same seven files as above; only the dependency, the
   `minSdk`, and the activity change.

### What you'll see

A full-screen `ImageView` shows the avatar lip-syncing to `speech.wav` — 16 kHz mono PCM in, lip-synced `Bitmap`s out at 25 fps, rendered entirely on the phone with no network inference.

### Full code

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

Full source: [Android SDK reference](/sdk/android) — the SDK page carries the
streaming API surface, `Fixture` and `Runtime`.

## essence-2 on Android — `Essence2ModelStore.fetch(code).open()`

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

★ **This snippet compiles and cannot run today, and the reason is not your code.**
`mirrorBase` has no value you can supply: `Essence2ModelStore` fetches
`{base}/{code}/android/v1/android_store.v1.json` and **bitHuman publishes no public
host that serves that tree**. Measured on the handset on 2026-09-09, both hosts a
developer would guess refuse through the SDK's own error path — the expression-2
web mirror with `HTTP 400 … {"error":"not_found"}`, `assets.bithuman.ai` with
`HTTP 404` — each saying *"this identity has no android bundle published on this
mirror"*. The REST model-download door serves essence-2 as a single
`<code>.lebundle.imx`, which is not the member tree this store reads. Two more
things the snippet assumes: the session plays the avatar's **recorded** sequence,
because there is no audio-in entry point on this artifact yet (`BitHuman.open`
throws `AvatarError.NotSupported`); and a refusal ends the session — there is no
other render call to fall back to. **For an audio-driven talking head on Android
today, use expression-2 above.** The
[Android SDK page](/sdk/android#troubleshooting) carries
the full measurement.

## Next steps

- [Android SDK](/sdk/android) — full walkthrough: API surface, streaming, `Fixture` + `Runtime`, and the two second-generation model stores.
- [Audio streaming](/concepts/audio-streaming) — the streaming contract that backs `composeFromFile`.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
