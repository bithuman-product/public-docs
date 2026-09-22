---
title: "Android SDK"
description: "Both second-generation models on an arm64 Android handset, each from one Maven coordinate: ai.bithuman:expression2-android:0.4.7 renders a generated scene with no account and no key, and ai.bithuman:essence2-android:0.5.12 renders your own identity at full resolution with a bitHuman API key. Device floors, download sizes and a worked example for each."
section: sdk
group: "Platforms"
order: 30
label: "Android"
---

Both second-generation models render **on the handset**, from one Maven
coordinate each. Nothing is streamed: you feed 16 kHz mono speech in and pull
picture frames out, on the phone, and the only network traffic is the one-time
model download.

The two are separate artifacts with separate floors. This table is everything
you need to decide before you open Android Studio; every figure in it was read
from Maven Central and from the download door on **2026-09-21**.

| | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [a whole generated scene](/concepts/expression-2) — head, shoulders and background — at 416x720, 20 fps | [your own portrait, animated](/concepts/essence-2), at 25 fps, on the canvas that identity was generated at |
| **Devices** | `arm64-v8a` handset, `minSdk 26` | `arm64-v8a` handset, `minSdk 29` — three higher |
| **Dependency line** | `implementation("ai.bithuman:expression2-android:0.4.7")` | `implementation("ai.bithuman:essence2-android:0.5.12")` |
| **Credential** | **none** for a published identity — no account, no key, no credits | a bitHuman **api-secret**, needed in two separate places — [keys are free](https://www.bithuman.ai/developer/api-keys) |
| **First-run download** | about 160 MB, into app-private storage | 226–281 MB, into app-private storage |
| **Adds to your app** | 2.8 MB AAR — 6.0 MB of `arm64-v8a` libraries | 12.1 MB AAR — 32.1 MB of `arm64-v8a` libraries |
| **Worked example** | [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) | [the same page, second half](/examples/kotlin-android-hello#essence-2-on-android--the-same-seven-files-three-of-them-changed) |

> **Important** **The credential is the one difference that decides the project.**
> Expression 2 reaches its first frame with no account at all. Essence 2 needs a
> bitHuman API key **twice** — once to download the identity, once to arm the
> meter — and setting one does not arm the other. Everything else on this page
> is a detail; that is the thing to know before you start. See
> [Authentication and configuration](#authentication-and-configuration).

Every public class and member of both artifacts, with the Kotlin signature each
one actually has, is on the [Android API reference](/sdk/android-api) —
generated from the AARs Maven Central serves, not typed.

## Install

Both artifacts are `arm64-v8a` only and both need `useLegacyPackaging`: the
SDKs look for their native libraries as real files on disk, and without it no
`.so` is extracted.

> **`mavenCentral()` is not optional, and searching for the artifact will not
> find it.** The `ai.bithuman` group is served by Maven Central itself and is
> **not** on Google's Maven mirror, so a build with only `google()` resolves
> nothing. It also returns no results on `search.maven.org` — verified
> 2026-09-15, with a control query that does return results — so the web search
> saying "not found" is not evidence the artifact is missing. Browse
> [the group directory](https://repo1.maven.org/maven2/ai/bithuman/) instead,
> which lists every published version.

`google()` is still needed in both repository blocks even though neither
bitHuman artifact comes from there: the Android Gradle Plugin fetches its own
`aapt2` from Google's Maven, and without it the build dies at
`:app:processDebugResources`.

### Expression 2

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()         // AGP resolves its own aapt2 from here
        mavenCentral()   // the bitHuman AAR
    }
}

// app/build.gradle.kts
android {
    defaultConfig {
        minSdk = 26                        // this AAR's own floor
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

### Essence 2

Three differences from the block above, and every one of them is silent when it
is missing: the floor is `minSdk 29`, `buildConfig` has to be switched on, and
the key has to reach the code.

```kotlin
// app/build.gradle.kts — AGP 8.x generates no BuildConfig unless you ask
android {
    buildFeatures { buildConfig = true }
    defaultConfig {
        minSdk = 29                        // essence2-android's own floor
        ndk { abiFilters += "arm64-v8a" }
        buildConfigField(
            "String", "BITHUMAN_API_SECRET",
            "\"${providers.gradleProperty("bithumanApiSecret").getOrElse("")}\"",
        )
    }
    packaging { jniLibs { useLegacyPackaging = true } }
}
dependencies {
    implementation("ai.bithuman:essence2-android:0.5.12")
}
```

**No Qualcomm artifacts here.** Expression 2 takes two optional
`com.qualcomm.qti` dependencies; Essence 2 takes none and needs none. Its AAR
declares `<uses-native-library android:name="libOpenCL.so"
android:required="false" />` in its own manifest, which merges into yours, so
the engine reaches the handset's GPU without you adding a line — and the app
still installs on a device that ships no OpenCL.

**Do not lower the floor to share one module with Expression 2.** `minSdk 26`
with `essence2-android` on the classpath fails the manifest merge; give each
model its own module, or raise the whole app to 29.

## Authentication and configuration

Expression 2 needs no credential at all for a published identity — no account,
no key, no credits. Essence 2 needs one, and it is asked for **twice**, in two
places that fail differently:

| Where | Why | What happens without it |
|---|---|---|
| `Essence2ModelStore` | members are served through the metered door; a download is 0 credits but is **recorded** | the first `fetch()` throws `Essence2StoreException` naming `MeteredDoorResolver` |
| `Essence2Metering.apiSecret` | the render is a metered self-hosted session | `Essence2Avatar.create()` throws `Essence2MeteringRefused`, which prints as `MeteringRefused` |

**Setting one does not arm the other** — the engine's own message says so. Both
take the same api-secret. Keys are free at
[your API keys](https://www.bithuman.ai/developer/api-keys); what a session
costs is on [pricing](/guides/pricing).

Put the key where Gradle can read it and your source tree cannot — in
`~/.gradle/gradle.properties` as `bithumanApiSecret=…`, or passed as
`-PbithumanApiSecret=…`. The `buildConfigField` in the Essence 2 block above
turns it into `BuildConfig.BITHUMAN_API_SECRET`.

> **Warning** **A `buildConfigField` bakes the key into the APK**, which is fine
> for a local hello-world and wrong for anything you ship — a string constant is
> readable by anyone who has the file. For a real app, fetch a short-lived
> credential from **your** backend at startup and pass that string to
> `MeteredDoorResolver` and to `Essence2Metering.apiSecret` instead. Nothing
> else in the code changes. See [Authentication](/api/authentication).

A **private** Expression 2 agent needs its owner's key too, through the same
kind of resolver:

```kotlin
Expression2ModelStore(context, urlResolver =
    Expression2ModelStore.MeteredDoorResolver(BuildConfig.BITHUMAN_API_SECRET))
```

Without one a private agent answers `401`.

## Get a model

Neither AAR ships weights. Each model store downloads an identity by agent code
into app-private storage, once, and keeps it there — so the download figure is
also roughly what the installed app grows by.

### Expression 2 — no credential

```kotlin
val model = Expression2ModelStore(context).fetch("A02HCY0444")   // never on the main thread
```

**A published identity needs no credential at all.** `A02HCY0444` is one, and
so is every Expression 2 identity in the [showcase](/showcase).

About **160 MB** on first run: measured 2026-09-21 from each identity's own
`web_manifest.json` at the door, summing the three members this store actually
requests — 160.3 MB for `A02HCY0444`, 159.4 MB for `A23WJF0199`, 159.5 MB for
`A74NWD9723`. Almost all of it is one graph file. The store does **not** fetch
the Hexagon variant: with the Qualcomm delegate present it compiles the graph it
downloaded into an on-device context cache instead.

### Essence 2 — a credential in two places

`Essence2ModelStore` **bakes in no default resolver.** Construct it without one
and the first `fetch()` throws rather than guessing a host, so name it:

```kotlin
val secret = BuildConfig.BITHUMAN_API_SECRET
val store  = Essence2ModelStore(context, urlResolver = MeteredDoorResolver(secret))
val identity = store.fetch("A21SKT4314")   // 226-281 MB the first time; never on the main thread
```

`A21SKT4314` is *warm-clear-professional-presenter*, a bitHuman-owned Essence 2
identity. Measured 2026-09-21 by reading each identity's own Android store
manifest from the door, the six published Essence 2 identities declare
`download_bytes` between **225,916,858** and **280,744,559** — about 226 MB to
281 MB. The per-identity table, with the frame size each one renders at, is on
the [worked example](/examples/kotlin-android-hello#pick-an-identity).

**Frame size is per identity, not per model.** Essence 2 renders whatever canvas
the identity was generated at — the published six include portrait 1080x1920,
landscape 1920x1080 and 1280x720. Read `avatar.width` and `avatar.height` after
`create()`; do not hard-code a size and do not assert on one.

Your own agent's code comes from [Agents](/api/agents) and arrives through the
same door with the same key.

## Minimal code

16 kHz mono audio in, picture frames out, on the phone. The two engines differ
in what they hand you: Expression 2 fills a `Bitmap`, Essence 2 fills a direct
`ByteBuffer` you size from the identity.

### Expression 2 — Bitmap frames

The frame contract is on the class as constants: `FRAME_WIDTH` 416,
`FRAME_HEIGHT` 720, `FRAMES_PER_SECOND` 20, `SAMPLE_RATE` 16000.

```kotlin
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2ModelStore
import ai.bithuman.expression2.Expression2Options
import android.content.Context
import android.graphics.Bitmap

/** [pcm16k] is 16 kHz mono float32 in [-1, 1] — one float per sample, not ShortArray. */
fun render(context: Context, agentCode: String, pcm16k: FloatArray, show: (Bitmap) -> Unit) {
    // Downloads the model the first time (about 160 MB). Never on the main thread.
    val model = Expression2ModelStore(context).fetch(agentCode)

    Expression2Avatar.create(context, model, Expression2Options()).use { avatar ->
        val frame = avatar.newFrameBitmap()   // ARGB_8888, 416 x 720 — allocate once
        avatar.feed(pcm16k)                   // renders each complete 1.6 s chunk
        avatar.flushTail()                    // the padded tail is the last sentence
        while (true) {
            if (avatar.pull(frame) != null) { show(frame); continue }
            if (!avatar.hasPendingTail && avatar.queuedFrames == 0) break
            Thread.sleep(10)                  // null means "not ready yet" — wait, do not re-ask at once
        }
    }
}
```

`pull()` returns `null` when no frame is ready yet: it never renders and never
waits, so asking again immediately just burns a core the engine needs — sleep,
then ask again. That is what the line above does, and it is worth about 10 frames
per second on a Galaxy S25+.

The default `Expression2Options()` uses the handset's accelerator when it has
one and falls back to the CPU instead of throwing.

### Essence 2 — RGBA into a ByteBuffer

Audio goes in as **16-bit little-endian PCM bytes**, exactly as a 16 kHz mono WAV
stores them — not the `FloatArray` Expression 2 takes. `newFrameBuffer()` hands
back a direct buffer of `width * height * 4` bytes, RGBA.

> **Note** **One import names a legacy package, and it has to.** The
> `ai.bithuman.essence2` names are Kotlin type aliases onto `ai.bithuman.elevate`,
> where the real classes live. Kotlin resolves an alias to a class but **not** to
> a class nested inside it, so `Essence2ModelStore.MeteredDoorResolver` does not
> compile through the alias — import that one nested class from its own package.
> [Why these names stay spellable](/concepts/avatars-imx#the-engine-value-is-a-legacy-name).

```kotlin
import ai.bithuman.essence2.Essence2Avatar
import ai.bithuman.essence2.Essence2Metering
import ai.bithuman.essence2.Essence2ModelStore
import ai.bithuman.elevate.Essence2ModelStore.MeteredDoorResolver   // the nested class, see above
import android.content.Context
import java.nio.ByteBuffer

/** [pcm16le] is 16 kHz mono 16-bit little-endian PCM, as read out of a WAV. */
fun render(context: Context, agentCode: String, pcm16le: ByteArray, show: (ByteBuffer, Int, Int) -> Unit) {
    val secret = BuildConfig.BITHUMAN_API_SECRET

    // 1. Arm the meter BEFORE anything opens an engine: create() reads it.
    Essence2Metering.apiSecret = secret

    // 2. Name the resolver. This store has no default; fetch() throws without one.
    val store = Essence2ModelStore(context, urlResolver = MeteredDoorResolver(secret))
    val identity = store.fetch(agentCode)   // 226-281 MB the first time; never on the main thread

    Essence2Avatar.create(identity.dir).use { avatar ->
        val frame = avatar.newFrameBuffer()  // direct, width * height * 4, RGBA
        avatar.feed(pcm16le)                 // 16-bit LE PCM bytes, as read
        avatar.endOfAudio()                  // "that is the whole utterance"
        var idle = 0
        while (idle < 100) {                 // 100 x 10 ms with nothing = drained
            if (avatar.pull(frame)) { show(frame, avatar.width, avatar.height); idle = 0; continue }
            idle++
            Thread.sleep(10)
        }
        avatar.checkRender()                 // throws if the engine refused mid-render
    }
}
```

`create()` takes nothing but the directory the store just filled. The
[worked example](/examples/kotlin-android-hello#essence-2-on-android--the-same-seven-files-three-of-them-changed)
drains against the utterance's own expected frame count instead of a timeout,
which is exact; the loop above is the version that does not need to know how
long the audio was.

`checkRender()` is not optional bookkeeping. A metered session whose credential
the service rejects keeps rendering for a **five-minute grace** behind a
countdown and then refuses; a metering service that cannot be reached never
stops a render.

## Run

```bash
./gradlew :app:installDebug
```

A terminal build needs what Android Studio sets for you: `ANDROID_HOME` (or
`sdk.dir=` in `local.properties`), a JDK 17 launcher, Gradle 8.11.1 and AGP
8.7.3. An Expression 2 run of a published identity spends no credits; an
Essence 2 render is a metered self-hosted session — [pricing](/guides/pricing)
is the authority.

## Performance

Measured frame rates for every platform are on the [performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| `acceleratorNote` = *"no libQnnTFLiteDelegate.so in this APK"* | the Qualcomm artifacts are missing, or `useLegacyPackaging` is off so no `.so` is on disk | add the two `com.qualcomm.qti` lines and `packaging { jniLibs { useLegacyPackaging = true } }` |
| `acceleratorNote` says the accelerator refused the graph | you still get frames, on the CPU | nothing to fix in your app; log it and ship |
| the Expression 2 download is refused with `401` | that agent is private | use a [showcase](/showcase) code, or pass its owner's key: `Expression2ModelStore(context, urlResolver = Expression2ModelStore.MeteredDoorResolver(BuildConfig.BITHUMAN_API_SECRET))` |
| `Essence2StoreException`, naming `MeteredDoorResolver` | `Essence2ModelStore` was built with no resolver; it bakes in no default host | pass `MeteredDoorResolver(secret)`, or `PublicMirrorResolver(base)` if you mirror the members yourself |
| `MeteringRefused` at `Essence2Avatar.create()` | `Essence2Metering.apiSecret` is unset — setting the store's resolver does not arm the meter | assign `Essence2Metering.apiSecret` as well, before `create()` |
| the manifest merge fails on `minSdk` with Essence 2 on the classpath | `essence2-android` declares `minSdk 29`; `expression2-android` declares 26 | raise the module to 29, or give each model its own module |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent) and poll until it is listed |
| *"no android bundle is published for THIS identity"* | that agent has an Essence 2 model but no Android bundle staged | use a code from the [example's table](/examples/kotlin-android-hello#pick-an-identity), or ask for that identity to be staged |
| the first Expression 2 `create()` takes about 45 s | the accelerator compiles the graph once per process | create on a background thread at app start, once |
| `Unresolved reference: BuildConfig` | AGP 8.x defaults `buildConfig` to off | add `buildFeatures { buildConfig = true }` |
| `unresolved reference 'MeteredDoorResolver'` | it is nested, and Kotlin does not resolve a nested class through a type alias | import `ai.bithuman.elevate.Essence2ModelStore.MeteredDoorResolver` |
| `UnsatisfiedLinkError` on an emulator | both AARs are arm64-v8a only; an x86_64 image installs, then cannot load them | run on a physical arm64 handset |
| `SDK location not found` | no `ANDROID_HOME` and no `local.properties` | set one of them |
| AGP fails with `What went wrong: 26.0.2.1` (or another bare version) | `JAVA_HOME` points at a JDK newer than 17 | use a JDK 17 launcher |
| `gradle wrapper` refuses an empty directory | Gradle 9 | write `settings.gradle.kts` and `app/` first, the wrapper last |
| you want `essence-1` on Android | it is the first-generation artifact, `ai.bithuman:sdk:2.3.6` — a `.imx` you push yourself and an API secret, not the model-store route above. The published 2.3.6 **cannot authenticate on a device**: it installs, then throws before its first frame with `be_auth_authenticate: status=11`, because its native library ships with no CA trust store and there is no app-side workaround on this version | use a second-generation model above; the whole first-generation project is on [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello#the-first-generation-artifact--essence-1-aibithumansdk236) |

**Licence.** *Proprietary — bitHuman SDK License*. The full text travels with the
bytes: `META-INF/NOTICE.txt` inside each AAR states which part is under which
licence, and a copy is available from [hello@bithuman.ai](mailto:hello@bithuman.ai).
The bundled LiteRT is Apache-2.0 (notices in the AAR's `META-INF/`); FFmpeg is
linked statically into `essence2-android` under LGPL §6(a) — the relink
materials and the commands that check them are on
[Android FFmpeg / LGPL](/legal/android-ffmpeg-lgpl).

## Examples and source

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — **two**
  complete projects printed in full: the Expression 2 app, then
  [the Essence 2 app](/examples/kotlin-android-hello#essence-2-on-android--the-same-seven-files-three-of-them-changed),
  which is the same seven files with three of them changed.
- [Examples](/examples) — every runnable project, by language.
- [bithuman-examples](https://github.com/bithuman-product/bithuman-examples/tree/main) — the repository behind those pages.

## See also

- [Android API reference](/sdk/android-api) — every public class in both
  artifacts, read back out of the published AARs
- [Downloads](/downloads) — every published version of both artifacts
- [LiveKit](/sdk/livekit) — subscribing to a server-hosted avatar when the
  render is not on the handset
- [Performance](/sdk/performance) — measured frame rates for every platform
- [Where each model runs](/concepts/where-models-run) — which model to ship
- [SDK](/sdk) — every platform on one page
