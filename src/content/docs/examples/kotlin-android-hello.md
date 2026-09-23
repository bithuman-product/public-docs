---
title: "Kotlin / Android — Hello, avatar"
description: "Two complete Android projects — every file in full — that render a talking avatar on a physical phone from 16 kHz speech. Expression 2 needs no API key; Essence 2 needs one and renders the identity's own canvas, up to 1920x1080. Both from Maven Central, both measured on a Galaxy S25+."
section: examples
group: "Examples"
order: 14
---

This page is a whole project, not a fragment. Create the seven files below in the
order they appear, push one WAV, and a physical Android phone renders a talking
head from your audio — on the device, with no cloud round-trip and **no API key**.

**Measured on 2026-09-09**, exactly these files, on a Galaxy S25+ (SM-S936U1,
Snapdragon 8 Elite, Android 16): 5.72 s of speech in → **117 frames** of 416×720
out, rendered in 21.0 s, then played back in sync with the audio.

**Re-run on 2026-09-23 with `expression2-android` 0.4.8**, the same files extracted
from this page, same phone: 4.93 s of speech in → **99 frames** out, with the
decoder on the phone's Hexagon NPU and no option set to ask for it — the log line
read `acc=NPU routing=Routing(enc=CPU, tok14=CPU, step=CPU, dec=NPU)` with an empty
`note`.

## Which model does this page build?

Both. [Expression 2](/concepts/expression-2) is first because it is the shorter
road to a frame: no account, no key, nothing to sign up for.
[Essence 2](/concepts/essence-2) is the same seven files with three of them
changed, and it is [further down this page](#essence-2-on-android--the-same-seven-files-three-of-them-changed).

| | Expression 2 | Essence 2 |
|---|---|---|
| Maven coordinate | `ai.bithuman:expression2-android:0.4.8` | `ai.bithuman:essence2-android:0.5.12` |
| bitHuman API key | **not needed** | **required**, and used twice — see that section |
| `minSdk` | 26 | 29 |
| Picture | 416x720 at 20 fps | the identity's own canvas at 25 fps (1080x1920 for `A21SKT4314`) |
| First-run download | about 158 MB | about 238 MB |
| Measured rate on a Galaxy S25+ | above its play rate | above its play rate — [performance](/sdk/performance) has both numbers |

Everything up to that section — the phone, the JDK, `adb`, the WAV, the Gradle
wrapper — is shared by both, so read it once and it applies to either. The rest
of this page is the Expression 2 project.

**Every coordinate on this page was re-fetched on 2026-09-21**, by a reader that
did not write it, from the bytes rather than from a note: `maven-metadata.xml`
on Maven Central makes `0.4.7` and `0.5.12` the current release of each
artifact; both AARs' own `AndroidManifest.xml` declare
`minSdkVersion` **26** and **29**, and each ships exactly one ABI directory,
`arm64-v8a`; the two `com.qualcomm.qti` artifacts at `2.49.0` resolve; and the
door at `api.bithuman.ai` answered an **anonymous** request for `A02HCY0444` and
for all six Essence 2 codes below. `A02HCY0444`'s manifest puts its Android
member at **158,524,428 bytes**, which is the "about 158 MB" this page quotes.

## What you end up with

An app that, when you tap it:

1. reads `speech.wav` out of its own external files directory,
2. downloads one published identity through the SDK's model store (about 158 MB,
   once, no credential),
3. renders every frame of the clip on the phone, then
4. plays the audio back and shows each frame on the audio clock, so the mouth
   matches what you hear.

It renders first and plays second on purpose, because it is the shortest correct
program: `feed()` renders the whole clip before it returns, so there is nothing to
pace. A live app feeds and pulls at the same time instead — see
[Feed the microphone](#feed-the-microphone-instead-of-a-file). The measured rate is
on the [performance page](/sdk/performance).

## Before you start

| You need | Why | Check it |
|---|---|---|
| A **physical `arm64-v8a` phone**, USB debugging on | every bitHuman AAR is `arm64-v8a` only; an x86_64 emulator installs and then throws `UnsatisfiedLinkError` | `adb devices` lists it — `adb` is **not** on your `PATH` by default; it ships inside the SDK at `$ANDROID_HOME/platform-tools`, which the export block below adds |
| That phone **unlocked**, not just awake | `adb shell input tap` is delivered to whatever window has focus, and on a locked phone that is the lock screen, not your app — the tap is swallowed with no error anywhere | `adb shell dumpsys window \| grep mCurrentFocus` names your activity, not `Bouncer` |
| **JDK 17** | the Android Gradle Plugin 8.7.3 this project pins refuses newer launcher JVMs — and refuses them illegibly: on a Homebrew JDK 26 the whole error is the string `26.0.2.1` | `"$JAVA_HOME/bin/java" -version` says `17.` — **not** bare `java -version`. Gradle launches the JVM that `JAVA_HOME` names, and bare `java` does not report it: on a Mac that *has* the required Homebrew `openjdk@17`, both `java -version` and `/usr/libexec/java_home -v 17` still print *"Unable to locate a Java Runtime"*, because a Homebrew JDK is keg-only and is never linked into `/Library/Java/JavaVirtualMachines` |
| An **Android SDK** with platform 35 | `compileSdk = 35` below | `$ANDROID_HOME/platforms/android-35` exists — if it does not, the line under this table installs it |
| **Network on the phone** for the first run | the model store downloads the identity once | — |

★ **No Android Studio? The SDK is two commands, and neither of them is
obvious.** Android Studio installs the platform and `platform-tools` for you;
a terminal-only machine has to ask. Unpack the *command-line tools only*
package from [developer.android.com/studio](https://developer.android.com/studio)
into `$ANDROID_HOME/cmdline-tools/latest/`, then:

```bash
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" \
  "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

The licence step is not optional and it is not automatic: without it the first
Gradle task fails on a missing licence rather than a missing package, which
reads like a different problem. `platform-tools` is also where `adb` comes
from, so this is the command that satisfies two rows of the table above.

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
bitHuman account, or a `.imx` file for this page — [Expression 2](/concepts/expression-2)
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
below walks the RIFF chunks instead.

## Step 2 — create the project

Two ways to get a directory with a Gradle wrapper in it.

**From Android Studio.** *New Project → Empty Views Activity*, package
`com.example.x2hello`, language Kotlin, minimum SDK 26. Then replace the files it
generated with the ones below, and delete the `res/` layout and theme files it
made — this project builds its UI in code and needs no resources.

**From a terminal**, if you have Gradle installed (`gradle -v`; `brew install
gradle` on a Mac, `sdk install gradle` with SDKMAN! elsewhere — this Gradle only
writes the wrapper, so its version barely matters and today it is 9.x). ★ **Make
the directories, write the seven files from
[Step 3](#step-3--the-files-in-order), and run `gradle wrapper` last** — on
Gradle 9 that order is not optional:

```bash
mkdir -p x2hello/app/src/main/java/com/example/x2hello && cd x2hello
#  <- write the seven files from Step 3 into this tree now, then:
gradle wrapper --gradle-version 8.11.1      # writes gradlew + gradle/wrapper/*
```

★ **Why the wrapper comes last: `gradle wrapper` needs a build to attach itself
to.** Gradle 8 would write a wrapper into an empty directory; **Gradle 9 will
not**, and it is the Gradle you get from Homebrew today. In a freshly-`mkdir`'d
tree with no files written yet it stops at `FAILURE … Directory '…/x2hello' does
not contain a Gradle build.` and writes no `gradlew`; with all seven files of
Step 3 in place it succeeds.

The failure is not about bitHuman and not about AGP: `gradle wrapper` is a task,
tasks belong to a build, and Gradle 9 refuses to invent one.

The Gradle that writes the wrapper does not have to be the Gradle that builds,
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
    implementation("ai.bithuman:expression2-android:0.4.8")
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

    /** A PUBLIC showcase identity — the door serves it with no credential. Swap in your own agent code. */
    private val agentCode = "A02HCY0444"

    /**
     * How the engine is built.
     *
     * A bare Expression2Options() is the right start on every arm64 device. On a
     * Snapdragon it runs the decoder on the Hexagon NPU — 0.4.8 brings the Qualcomm
     * runtime with it, so there is nothing to add — and everywhere else it renders on
     * the CPU. The log line below prints which one you got, and why, in
     * avatar.acceleratorNote.
     *
     * Leaving `accelerator` at its AUTO default is what makes that safe: the SDK tries
     * the accelerator and falls back to the CPU by itself. Writing
     * accelerator = Accelerator.NPU turns a refusal into a thrown exception and no
     * frames.
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
                // A null is "not ready yet". pull() never renders, so asking again at
                // once just burns a core the engine needs — wait, then ask again.
                Thread.sleep(10)
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

★ **If the tap does nothing, the phone is locked.** With the handset awake but
on its lock screen, `dumpsys window` reads `mCurrentFocus=Window{… Bouncer}`
while `mFocusedApp` is still `com.example.x2hello/.MainActivity` — the activity
is running behind the keyguard, so `input tap` lands on the lock screen and the
app never hears it, and no command reports an error. Unlock the phone, or skip
the tap entirely — the activity renders in `onCreate`, so restarting it picks the
file up:

```bash
adb shell am force-stop com.example.x2hello
adb shell am start -n com.example.x2hello/.MainActivity
```

## What a real run looks like

117 frames for 5.72 s of audio is the published contract — 20 fps × 5.72 s = 114,
plus the three padded tail frames that `flushTail()` produces past the end of the
speech.

★ **Why nothing appears for half a minute and then everything does.** Two costs
come before the first frame. The first `create()` in a process compiles the graph
for the phone's accelerator — the `initMs` field in the `engine:` log line, which
read 30,281 ms on the 2026-09-23 run; a second `create()` in the same process does
not pay it again. Then `feed()` does the rendering: it renders every chunk whose
look-ahead has arrived, and `pull()` drains a queue that is already full. That is
why the app renders the whole clip before it plays a second of it.

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
| the `engine:` log line says `acc=CPU` on a Snapdragon phone, and `note` names a missing `libQnnTFLiteDelegate.so` | `useLegacyPackaging = true` is missing, so the Qualcomm libraries were never extracted to disk, or the two `com.qualcomm.qti` artifacts were excluded | put `packaging { jniLibs { useLegacyPackaging = true } }` back (Step 3, file 5) |

## The accelerator — already on, and how to leave it that way

There is nothing to add for it. `expression2-android` 0.4.8 declares the Qualcomm
delegate and runtime in its own POM (`com.qualcomm.qti:qnn-litert-delegate:2.49.0`
and `com.qualcomm.qti:qnn-runtime:2.49.0`, both on Maven Central), so the one
dependency line in Step 3 already brings them, and a bare `Expression2Options()`
runs the decoder on the Hexagon NPU wherever the phone has one. On the 2026-09-23
run above it did, on a Snapdragon 8 Elite, with no option set.

Two things keep it working:

- **`useLegacyPackaging = true`** (Step 3, file 5). The accelerator loads its
  libraries as files on disk; without the line they are never extracted, and the
  engine renders on the CPU with the reason in `acceleratorNote`.
- **Leave `accelerator` at its `AUTO` default.** `AUTO` is the fallback, and it is
  the whole difference between an app that renders and an app that does not:
  naming `Accelerator.NPU` makes a refusal fatal — `Expression2Exception:
  TfLiteInterpreterCreate returned null (graph rejected) …`, and no frames at all.
  Under `AUTO` the SDK builds the CPU arm instead and records why in
  `avatar.acceleratorNote`, which is why the app logs that field.

To opt out of the accelerator — it is about 70 MB of your APK — exclude the
Qualcomm group and the engine renders on the CPU, slower and otherwise the same:

```kotlin
dependencies {
    implementation("ai.bithuman:expression2-android:0.4.8") {
        exclude(group = "com.qualcomm.qti")
    }
}
```

[The SDK page](/sdk/android#expression-2) has the measured size of that trade.

## Where the agent code comes from

`A02HCY0444` is a **public** showcase identity, which is what makes it keyless:
since 0.4.0 the store fetches through the metered door at `api.bithuman.ai`, and
that door serves a public agent to anonymous callers and answers `401
MISSING_AUTH` for a private one. To use your own, `POST /v1/agent/generate` with
`model: "expression-2"` returns an `agent_code` ([Agents](/api/agents)) — a
private agent needs its owner's key passed to `MeteredDoorResolver`, so check
visibility before you build a code into an app. [The SDK
page](/sdk/android#get-a-model) carries the door's three answers and the codes
verified anonymously on 2026-09-11.

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

Feeding a microphone live also means feeding *while* pulling — the
SDK is built for that ([the streaming contract](/concepts/audio-streaming)). Keep
the accelerator (see [above](#the-accelerator--already-on-and-how-to-leave-it-that-way)):
a live app has to render at least as fast as it plays, and the CPU-only arm is the
slower one.

## The first-generation artifact — essence-1 (`ai.bithuman:sdk:2.3.6`)

Everything above is [Expression 2](/concepts/expression-2). essence-1 is the older
`ai.bithuman:sdk` artifact: it renders at 25 fps, it takes a `.imx` model file you
push yourself, and it needs an **API secret**.

> **The published `ai.bithuman:sdk:2.3.6` cannot authenticate on an Android
> device, so the example below compiles and installs and then throws before its
> first frame** — `be_auth_authenticate: status=11`. The artifact's native
> library ships with no CA trust store, and there is no app-side workaround on
> this version; the details are on
> [the Android SDK page](/sdk/android#troubleshooting).
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
- A `.imx` model file pushed to the device (the snippet reads from `getExternalFilesDir(null)`). **Where to get one:** create an essence-1 agent and download its artifact with `GET /v1/agent/{code}/model/download` ([Agents](/api/agents)) — see [Avatars and the .imx format](/concepts/avatars-imx). The two second-generation projects on this page need **no** `.imx` and no manual push: their model stores download the identity by agent code.

  ★ **One frozen first-generation file is on the public CDN, and it is a URL, not
  a CLI slug.** `https://models.bithuman.ai/showcase/modern-court-jester.imx`
  answers `200` with an 82,583,342-byte container (verified 2026-09-21,
  anonymously). `modern-court-jester` is **not** a name `bithuman pull` knows —
  it is in no CLI manifest and that command fails on it. Use the URL verbatim,
  and do not type the name anywhere else.

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

> ★ **Both lines above are load-bearing.** `BuildConfig` is generated only when
> `buildFeatures.buildConfig` is `true`, and it has defaulted to **false** since
> AGP 8.0 — the version this documentation pins is **8.7.3** ([Android SDK
> verification](/sdk/android)). Without them the snippet in
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

2. Push your model and audio onto the device's app-private external dir.

   ★ **The package is `com.example.bithumanhello` here, not `x2hello`, and the
   push path is built from it.** The [Full code](#full-code) below declares that
   package, so four places have to agree or the push lands in a directory no app
   reads and the app reports a missing file: `namespace` and `applicationId` in
   `app/build.gradle.kts`, the source directory
   `app/src/main/java/com/example/bithumanhello/`, and the two paths below.
   Pick one name and change all four.

```bash
adb push sample-avatar.imx /sdcard/Android/data/com.example.bithumanhello/files/
adb push speech.wav        /sdcard/Android/data/com.example.bithumanhello/files/
```

3. Drop the [Full code](#full-code) into `MainActivity.kt`, then Build and Run on the device.
   The project skeleton is the same seven files as above; the dependency, the
   `minSdk`, the package name (see above) and the activity change.

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

## Essence 2 on Android — the same seven files, three of them changed

[Essence 2](/concepts/essence-2) renders a **full-resolution** picture at 25 frames per
second on the same handset — 1080x1920 for the identity this project uses — from one more Maven coordinate. A Galaxy S25+ renders
it faster than it plays, on `essence2-android` 0.5.12 — [the performance
page](/sdk/performance) carries the measured rate and is the only place it is
written.

Build it the way you built the project above: the phone, the JDK, `ANDROID_HOME`,
`adb`, `speech.wav` and the Gradle wrapper are all the same. Use the package name
`com.example.e2hello` instead of `com.example.x2hello`, so the two apps can live
on one phone, and change the three files below. `gradle.properties`,
`gradle/wrapper/gradle-wrapper.properties` and the root `build.gradle.kts` are
identical; `AndroidManifest.xml` needs only its `android:label` changed.

### Before you start — one key, used twice

★ **Essence 2 needs a bitHuman API key and Expression 2 does not.** This is the
one prerequisite that is not shared, and it bites in two separate places, each
with its own refusal. Get a key at [Developer → API
Keys](https://www.bithuman.ai/developer/api-keys) — it is free, and the free
tier's monthly credits cover a session like this many times over
([pricing](/guides/pricing) is the authority on what a self-hosted session
costs). Then:

| Where | Why | What happens without it |
|---|---|---|
| `Essence2ModelStore` | the identity's members are served through the metered door, and a download is 0 credits but is **recorded** | the first `fetch()` throws `Essence2StoreException`: *"Essence2ModelStore has no credential… it needs one: `Essence2ModelStore(context, urlResolver = Essence2ModelStore.MeteredDoorResolver("<api-secret or runtime token>"))`"* |
| `Essence2Metering.apiSecret` | the render is a metered self-hosted session | `Essence2Avatar.create()` throws `Essence2MeteringRefused` — which prints as `MeteringRefused` — with *"refusing to serve: no credential was supplied, so this render cannot be attributed to an account. Set BITHUMAN_API_SECRET to your api-secret, or assign Essence2Metering.apiSecret…"* |

★ **Setting one does not arm the other** — the engine's own message says so.
They take the same api-secret, and the code below assigns both.

Put the key where Gradle can read it and your source tree cannot. In
`~/.gradle/gradle.properties`:

```properties
# ~/.gradle/gradle.properties  — NOT in your project, NOT in source control
bithumanApiSecret=<the key from your API keys page>
```

or pass `-PbithumanApiSecret=…` on the command line. The `app/build.gradle.kts`
below turns it into `BuildConfig.BITHUMAN_API_SECRET`.

> **This bakes the key into the debug APK,** which is fine for the local
> hello-world this is and wrong for anything you ship — a `buildConfigField` is
> a string constant anyone can read back out. For a real app, fetch a
> short-lived credential from **your** backend at startup and pass that string
> to `MeteredDoorResolver` and to `Essence2Metering.apiSecret` instead. Nothing
> else in the code changes. See [Authentication](/api/authentication).

### Pick an identity

Every one of these is a bitHuman-owned Essence 2 identity with an Android bundle
published. **Verified 2026-09-21** by fetching each identity's own Android
store manifest from the door: each declares a complete bundle, and the figure
below is that manifest's own `download_bytes` — the manifest plus every member,
which is what the first `fetch()` pulls over the network.

| Identity | Agent code | First-run download | Frame size |
|---|---|---|---|
| warm-clear-professional-presenter | `A21SKT4314` | 237,748,400 B (about 238 MB) | 1080x1920 |
| afro-latina-astrophysics-mentor | `A23KSG5258` | 234,959,721 B (about 235 MB) | 1920x1080 |
| calm-product-specialist-advisor | `A24EKJ8433` | 225,916,858 B (about 226 MB) | 1280x720 |
| sofia-ramirez | `A52DHS2219` | 237,667,642 B (about 238 MB) | 1080x1920 |
| kwame-warm-museum-guide | `A62SJB3901` | 238,012,554 B (about 238 MB) | 1080x1920 |
| executive-coach-for-clear-decisions | `A80HVD8577` | 280,744,559 B (about 281 MB) | 1280x720 |

It lands in the app's own private storage and stays there, so it is also roughly
what the installed app grows by. The project below uses `A21SKT4314`.

★ **Frame size is per identity, not per model.** Essence 2 renders whatever
canvas the identity was generated at — these six are portrait 1080x1920,
landscape 1920x1080 and 1280x720. Read it from `avatar.width` / `avatar.height`
after `create()`, as the code below does; do not hard-code a size, and do not
assert on one. The values above are each identity's own `manifest.json` `W` and
`H`, read from the container the door serves on 2026-09-21.

Your own agent's code comes from [Agents](/api/agents) and comes through the
same door with the same key — but **creating** one is a one-time credit charge
that the free tier cannot cover, so start from a code in the table above unless
you already have an agent. [Pricing](/guides/pricing) is the authority on both
numbers.

### Make the project tree

Same shape as [Step 2](#step-2--create-the-project), one directory name apart.
Write the seven files first and run the wrapper last, for the reason given
there — Gradle 9 refuses to write a wrapper into a directory with no build in
it.

```bash
mkdir -p e2hello/app/src/main/java/com/example/e2hello && cd e2hello
#  <- write the seven files below into this tree now, then:
gradle wrapper --gradle-version 8.11.1      # writes gradlew + gradle/wrapper/*
```

Four of the seven files are the Expression 2 ones unchanged. This table is the
whole difference, so you can work straight down it:

| File | What to write |
|---|---|
| `settings.gradle.kts` | **changed** — [file 1 below](#changed-file-1--settingsgradlekts) |
| `build.gradle.kts` | verbatim from [Step 3 · 2](#2-buildgradlekts) |
| `gradle.properties` | verbatim from [Step 3 · 3](#3-gradleproperties) |
| `gradle/wrapper/gradle-wrapper.properties` | verbatim from [Step 3 · 4](#4-gradlewrappergradle-wrapperproperties) |
| `app/build.gradle.kts` | **changed** — [file 2 below](#changed-file-2--appbuildgradlekts) |
| `app/src/main/AndroidManifest.xml` | from [Step 3 · 6](#6-appsrcmainandroidmanifestxml), with `android:label="x2hello"` changed to `android:label="e2hello"` and nothing else — the activity is named relatively (`.MainActivity`), so the package change needs no edit here |
| `app/src/main/java/com/example/e2hello/MainActivity.kt` | **changed** — [file 3 below](#changed-file-3--appsrcmainjavacomexamplee2hellomainactivitykt). Note the directory: `e2hello`, not `x2hello` |

The finished tree:

```text
e2hello/
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
        └── java/com/example/e2hello/MainActivity.kt
```

The three blocks below name their path from `e2hello/`, because this is a
second project beside the Expression 2 one — the two trees have files with the
same names and different contents, and a path with no root would not say which
tree it belongs to.

### Changed file 1 — `settings.gradle.kts`

Only the project name changes. `google()` is still needed in **both** blocks:
`essence2-android` itself resolves from Maven Central alone, but AGP fetches its
own `aapt2` from Google's Maven and without it the build dies at
`:app:processDebugResources`.

```kotlin
// e2hello/settings.gradle.kts
pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositories {
        google()         // AGP resolves its own aapt2 from here
        mavenCentral()   // ai.bithuman:essence2-android
    }
}
rootProject.name = "e2hello"
include(":app")
```

### Changed file 2 — `app/build.gradle.kts`

Four differences from the Expression 2 version, and every one is silent when it
is missing: `minSdk = 29` (this AAR's own floor, three higher), the coordinate,
`buildFeatures { buildConfig = true }`, and the `buildConfigField` that carries
the key. AGP has defaulted `buildConfig` to **off** since 8.0, so without that
line `BuildConfig` is never generated and the activity below fails to compile
with `Unresolved reference: BuildConfig`.

```kotlin
// e2hello/app/build.gradle.kts
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace  = "com.example.e2hello"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.e2hello"
        minSdk        = 29                      // essence2-android's own floor
        targetSdk     = 35
        versionCode   = 1
        versionName   = "1.0"
        ndk { abiFilters += "arm64-v8a" }       // the only ABI published

        // Read from ~/.gradle/gradle.properties or -PbithumanApiSecret=…,
        // never from a literal in a file you commit.
        buildConfigField(
            "String", "BITHUMAN_API_SECRET",
            "\"${providers.gradleProperty("bithumanApiSecret").getOrElse("")}\"",
        )
    }

    // Required. AGP 8.x defaults buildConfig to OFF, so without this line the
    // BuildConfig class is never generated at all.
    buildFeatures { buildConfig = true }

    // Not optional: the SDK looks for its native libraries as real files on disk.
    packaging { jniLibs { useLegacyPackaging = true } }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("ai.bithuman:essence2-android:0.5.12")
}
```

★ **No Qualcomm artifacts here.** Expression 2 takes two optional
`com.qualcomm.qti` dependencies; Essence 2 takes none, and needs none. Its AAR
already declares `<uses-native-library android:name="libOpenCL.so"
android:required="false" />` in its own manifest, which merges into yours — so
the engine reaches the handset's GPU without you adding a line, and an app still
installs on a device that ships no OpenCL.

### Changed file 3 — `app/src/main/java/com/example/e2hello/MainActivity.kt`

The whole activity. The `AndroidManifest.xml` from Step 3 is unchanged apart
from `android:label`, because the activity is named relatively (`.MainActivity`)
and this project builds its UI in code too.

★ **One import names a legacy package, and it has to.** The `ai.bithuman.essence2`
names in the AAR are Kotlin type aliases onto `ai.bithuman.elevate`, where the real
classes live — `elevate` is a retired name kept for binary compatibility
([why these names stay spellable](/concepts/avatars-imx#the-engine-value-is-a-legacy-name)).
Kotlin resolves a type alias to the class but **not** to a class nested inside it, so
`Essence2ModelStore.MeteredDoorResolver` does not compile through the alias
(`unresolved reference 'MeteredDoorResolver'`, verified against `essence2-android`
0.5.12 with kotlinc 2.0.21). Import that one nested class from its real package, as
the block below does, and the rest of the file keeps the `ai.bithuman.essence2`
spelling.

```kotlin
// e2hello/app/src/main/java/com/example/e2hello/MainActivity.kt
package com.example.e2hello

import ai.bithuman.essence2.Essence2Avatar
import ai.bithuman.essence2.Essence2Metering
import ai.bithuman.elevate.Essence2ModelStore.MeteredDoorResolver
import ai.bithuman.essence2.Essence2ModelStore
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
 * Hello, avatar — essence-2 on Android.
 *
 * Reads speech.wav from the app's own external files dir, renders it through the
 * on-device avatar, then plays the audio back with the rendered frames.
 *
 * The ONE thing that differs from the expression-2 project on the same page: this
 * needs an API secret, and it needs it in two places. See the doc page.
 */
class MainActivity : Activity() {

    /** One of the published Essence 2 identities — the table on the doc page has the rest. */
    private val agentCode = "A21SKT4314"

    private lateinit var image: ImageView
    private lateinit var status: TextView

    @Volatile private var busy = false
    private var frames: List<ByteArray> = emptyList()
    private var pcm: ByteArray = ByteArray(0)     // 16-bit little-endian, 16 kHz mono

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
        val secret = BuildConfig.BITHUMAN_API_SECRET
        if (secret.isBlank()) {
            say("No API secret. Put\n\nbithumanApiSecret=<your key>\n\nin ~/.gradle/gradle.properties and rebuild. essence-2 needs one for the download AND for the meter.")
            return
        }

        // 1. The METER, before anything opens an engine. create() arms the meter
        //    while it opens the bundle and refuses there if it has no credential.
        //    This is a DIFFERENT credential slot from the store's, and the engine
        //    says so in its own refusal: setting one does not arm the other.
        Essence2Metering.apiSecret = secret

        val wav = File(getExternalFilesDir(null), "speech.wav")
        if (!wav.isFile) {
            say("No speech.wav yet. On your machine:\n\nadb push speech.wav ${wav.absolutePath}\n\nthen tap the screen.")
            return
        }
        pcm = readWav16kMonoPcm16(wav)
        val seconds = pcm.size / 2f / SAMPLE_RATE
        val expected = Math.round(seconds * FPS)
        say("audio: ${pcm.size / 2} samples = %.2f s\nfetching $agentCode — first run downloads about 238 MB…".format(seconds))

        // 2. The STORE. Its default resolver carries an EMPTY credential and
        //    throws on the first fetch, so name the resolver explicitly.
        //    Blocks on the network the first time; that is why this is a worker thread.
        val store = Essence2ModelStore(
            this,
            urlResolver = MeteredDoorResolver(secret),
        )
        val identity = store.fetch(agentCode, progress = { member, done, total ->
            if (done == total) Log.i(TAG, "fetched $member ($total B)")
        })
        say("identity ready — starting the engine…")

        val t0 = System.currentTimeMillis()
        // On Android the shared audio front end rides INSIDE the bundle, so
        // create() needs nothing but the directory the store just filled.
        Essence2Avatar.create(identity.dir).use { avatar ->
            Log.i(TAG, "engine: ${avatar.width}x${avatar.height} targetFrames=${avatar.targetFrames}")
            val frame = avatar.newFrameBuffer()   // direct, width * height * 4, RGBA
            val bmp = Bitmap.createBitmap(avatar.width, avatar.height, Bitmap.Config.ARGB_8888)
            val out = ArrayList<ByteArray>(expected + 16)
            val jpeg = ByteArrayOutputStream(512 * 1024)

            avatar.feed(pcm)                      // 16-bit little-endian PCM bytes, as read
            avatar.endOfAudio()                   // "that is the whole utterance"

            var quietMs = 0
            while (quietMs < 5_000) {             // 5 s with no frame at all = finished
                frame.clear()
                if (avatar.pull(frame)) {         // true = a frame was written
                    quietMs = 0
                    frame.rewind()
                    // Android's ARGB_8888 is R,G,B,A in memory, which is the
                    // order the engine delivers, so this copy is a memcpy.
                    bmp.copyPixelsFromBuffer(frame)
                    jpeg.reset()
                    bmp.compress(Bitmap.CompressFormat.JPEG, 88, jpeg)
                    out.add(jpeg.toByteArray())
                    if (out.size % 10 == 0) say("rendering ${out.size} / $expected frames…")
                    continue
                }
                if (out.size >= expected && avatar.available() == 0) break
                Thread.sleep(10)
                quietMs += 10
            }

            // A render that failed must not reach you as silence: checkRender()
            // turns a zero-frame render into a throw that names the reason.
            avatar.checkRender()
            frames = out
        }
        Log.i(TAG, "DONE_FRAMES ${frames.size} in ${System.currentTimeMillis() - t0} ms")
        say("rendered ${frames.size} frames in ${(System.currentTimeMillis() - t0) / 1000} s — playing…")
    }

    // -------------------------------------------------------------- playback

    /** Plays the PCM and shows each frame on the audio clock: 640 samples per frame at 25 fps. */
    private fun play() {
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
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setTransferMode(AudioTrack.MODE_STATIC)
            .setBufferSizeInBytes(pcm.size)
            .build()
        // The stored frames are full resolution (1080x1920 here); the screen is not. Decoding at
        // half size keeps each step of the loop inside its 40 ms budget.
        val opts = BitmapFactory.Options().apply { inSampleSize = 2 }
        try {
            track.write(pcm, 0, pcm.size)
            track.play()
            val samples = pcm.size / 2
            val perFrame = SAMPLE_RATE / FPS                     // 640
            var shown = -1
            val deadline = System.currentTimeMillis() + (samples * 1000L / SAMPLE_RATE) + 3000
            while (true) {
                val head = track.playbackHeadPosition             // samples the DAC has consumed
                val i = head / perFrame
                if (i < frames.size && i != shown) {
                    shown = i
                    val b = BitmapFactory.decodeByteArray(frames[i], 0, frames[i].size, opts)
                    runOnUiThread { image.setImageBitmap(b) }
                }
                if (head >= samples || i >= frames.size) break
                if (System.currentTimeMillis() > deadline) break
                Thread.sleep(5)
            }
        } finally {
            track.stop()
            track.release()
        }
        say("${frames.size} frames, ${"%.2f".format(pcm.size / 2f / SAMPLE_RATE)} s — tap to replay")
    }

    // ------------------------------------------------------------------ wav

    /**
     * 16-bit PCM WAV -> the exact bytes feed(ByteArray) takes: 16 kHz mono,
     * 16-bit little-endian, no conversion. Walks the RIFF chunks — do not assume
     * the data starts at byte 44, because real encoders (macOS afconvert, for
     * one) insert padding chunks before it.
     */
    private fun readWav16kMonoPcm16(file: File): ByteArray {
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
        require(channels == 1 && rate == SAMPLE_RATE && bits == 16) {
            "need 16 kHz mono 16-bit PCM; ${file.name} is $rate Hz, $channels ch, $bits-bit"
        }
        return b.copyOfRange(dataAt, dataAt + (dataLen / 2) * 2)
    }

    private fun tag4(b: ByteArray, at: Int) = String(b, at, 4, Charsets.US_ASCII)

    private fun say(msg: String) {
        Log.i(TAG, msg.replace('\n', ' '))
        runOnUiThread { status.text = msg }
    }

    private companion object {
        const val TAG = "E2HELLO"
        const val SAMPLE_RATE = 16000
        const val FPS = 25
        val MATCH = FrameLayout.LayoutParams.MATCH_PARENT
        val WRAP = FrameLayout.LayoutParams.WRAP_CONTENT
    }
}
```

### Build, install, run

The same build, install and launch as [Step 4](#step-4--build-install-run), with
the `e2hello` package. The key comes from `~/.gradle/gradle.properties`, or pass
`-PbithumanApiSecret=…` to `./gradlew`:

```bash
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.example.e2hello/.MainActivity

# the app prints the exact push path on first launch; it is this one:
adb push /tmp/speech.wav /storage/emulated/0/Android/data/com.example.e2hello/files/speech.wav
adb shell am force-stop com.example.e2hello
adb shell am start -n com.example.e2hello/.MainActivity
adb logcat -v time | grep E2HELLO
```

The first run downloads the identity — about 238 MB for `A21SKT4314` — into
app-private storage and keeps it there. Later runs start at the engine.

### How to tell it worked

The activity writes its whole progress to the screen and to `logcat` under the
tag `E2HELLO`. These are the lines the code above prints, in this order; each
`<…>` is whatever your own run produces. `say()` collapses its newlines for the
log, so the first line is one line in `logcat` and two on the screen:

```text
audio: <n> samples = <s> s fetching A21SKT4314 — first run downloads about 238 MB…
identity ready — starting the engine…
engine: 1080x1920 targetFrames=<n>
rendering <n> / <n> frames…
DONE_FRAMES <n> in <ms> ms
rendered <n> frames in <s> s — playing…
<n> frames, <s> s — tap to replay
```

Three of them are the assertions worth automating:

- `engine: <W>x<H>` — the engine opened the identity and reports **that
  identity's** frame size, which for `A21SKT4314` is `1080x1920`. Assert that
  the line appears and that both numbers are non-zero, not on a particular
  size: the six codes above span three different canvases.
- `DONE_FRAMES <n>` with `<n>` near 25 × seconds of speech — the render
  produced frames rather than an idle face. `checkRender()` turns a zero-frame
  render into a throw, so a run that reaches this line rendered something.
- No `FAILED:` line. Every throw in the activity lands on the screen and in
  `logcat` with that prefix.

### When Essence 2 in particular does not work

The [table above](#when-it-does-not-work) still applies to the toolchain. These
rows are Essence 2's own, and each quotes the shipped 0.5.12 AAR's wording.

| What you see | What it is | Fix |
|---|---|---|
| `Essence2StoreException: Essence2ModelStore has no credential…` | you used the default `Essence2ModelStore(context)`, whose resolver carries an empty credential | add `import ai.bithuman.elevate.Essence2ModelStore.MeteredDoorResolver` and pass `urlResolver = MeteredDoorResolver(BuildConfig.BITHUMAN_API_SECRET)`. The message's own spelling does not compile — [see the note above](#changed-file-3--appsrcmainjavacomexamplee2hellomainactivitykt) |
| `MeteringRefused: refusing to serve: no credential was supplied…` | the store credential is set but the meter's is not | assign `Essence2Metering.apiSecret` **before** `Essence2Avatar.create()` |
| `Unresolved reference: BuildConfig` at compile time | `buildFeatures { buildConfig = true }` is missing | add it — AGP 8.x defaults it off |
| a store failure naming *"no android bundle is published for THIS identity"* | that agent code has no Android build of its identity | use one of the six codes in the table above, or ask whoever publishes the identity to add one |
| the manifest merger fails: *"uses-sdk:minSdkVersion 26 cannot be smaller than version 29 declared in library"* | you copied the Expression 2 project's `minSdk` | `minSdk = 29` — the AAR declares that floor itself |
| `java.lang.UnsatisfiedLinkError` at launch | an x86_64 emulator; this AAR ships `arm64-v8a` only | a physical arm64 phone |
| the store refuses and deletes what it downloaded, naming a member by name | the bundle is incomplete on the door; the store will not install unverified bytes | re-run it; if it repeats, report the agent code |
| `Essence2RenderFailed`, or `checkRender()` throws *"no frames came out of that render"* | the audio had no speech in it, or the runtime failed | check `speech.wav` actually contains speech; the message carries the runtime's own reason |

## Next steps

- [Android SDK](/sdk/android) — full walkthrough: API surface, streaming, `Fixture` + `Runtime`, and the two second-generation model stores.
- [Android API reference](/sdk/android-api) — every public class and Kotlin signature in both AARs, read back out of the bytes Maven Central serves.
- [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2) — the same model, the same shape, on an iPhone.
- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) — the Expression 2 project above, on an iPhone.
- [Audio streaming](/concepts/audio-streaming) — the streaming contract that backs `composeFromFile`.
- [Where each model runs](/concepts/models#where-each-model-runs) — which model to ship, and which platforms it runs on.
