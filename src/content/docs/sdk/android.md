---
title: "Android SDK"
description: "Both second-generation models on an arm64 Android handset, each from one Maven coordinate: ai.bithuman:expression2-android:0.4.9 renders a generated scene from an anonymous download, and ai.bithuman:essence2-android:0.5.14 renders your own identity at full resolution; both bill talking time only and need a bitHuman API secret to render. Device floors, download sizes and a worked example for each."
section: sdk
group: "Platforms"
order: 30
label: "Android"
---

Both second-generation models render **on the handset**. You feed 16 kHz mono
speech in and pull picture frames out; nothing is streamed, and the only network
traffic is the one-time model download.

Pick a model from this table, then follow the page straight down — install, code,
model, key.

| | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [a whole generated scene](/concepts/expression-2) — head, shoulders and background — at 416x720, 20 fps | [your own portrait, animated](/concepts/essence-2), at 25 fps, on the canvas that identity was generated at |
| **Devices** | `arm64-v8a` handset, `minSdk 26` | `arm64-v8a` handset, `minSdk 29` |
| **Dependency line** | `implementation("ai.bithuman:expression2-android:0.4.9")` | `implementation("ai.bithuman:essence2-android:0.5.14")` |
| **Credential** | a bitHuman **API secret** to render (from 0.4.9); a published identity downloads with none | a bitHuman **API secret**, in two places — [API secrets are free](https://www.bithuman.ai/developer/api-keys) |
| **First-run download** | about 160 MB, into app-private storage | 226–281 MB, into app-private storage |
| **Adds to your app** | 2.8 MB AAR, plus a 70 MB accelerator runtime you can opt out of | 12.1 MB AAR — 32.1 MB of `arm64-v8a` libraries |
| **Worked example** | [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) | [the same page, second half](/examples/kotlin-android-hello#essence-2-on-android--the-same-seven-files-three-of-them-changed) |

**Both need an API secret to render** — from `expression2-android` 0.4.9 and
`essence2-android` 0.5.14 every on-device session is billed for its **talking time
only** (idle is free). Expression 2 downloads a published identity anonymously and
reads the key once, before `create()`; Essence 2 needs it in two places, and
setting one does not cover the other — see [Authentication](#authentication).

## Install

Both artifacts are `arm64-v8a` only, and both need `useLegacyPackaging`: the SDKs
load their native libraries as real files on disk, and without it no `.so` is
extracted.

`mavenCentral()` is required — the `ai.bithuman` group is served by Maven Central
and is not mirrored on Google's Maven, so a build with only `google()` resolves
nothing. Keep `google()` too: the Android Gradle Plugin fetches its own `aapt2`
from there, and without it the build dies at `:app:processDebugResources`.

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
        minSdk = 26
        ndk { abiFilters += "arm64-v8a" }
    }
    packaging { jniLibs { useLegacyPackaging = true } }   // required
}
dependencies {
    implementation("ai.bithuman:expression2-android:0.4.9")
}
```

That one line is the whole dependency. `0.4.8` declares the Qualcomm accelerator
runtime itself, so Gradle brings in `com.qualcomm.qti:qnn-litert-delegate:2.49.0`
and `com.qualcomm.qti:qnn-runtime:2.49.0` for you — you no longer type them.

**Know what the accelerator costs, because it is most of your APK.** Measured by
building the same app with and without those two artifacts: the APK goes from
**3,508,289 B to 73,881,473 B**, a delta of **70,373,184 B**. On the *device* it
is larger, because `useLegacyPackaging = true` extracts every `.so` as a real
file: the two artifacts contribute **22 libraries totalling 201,207,300 B** of
`arm64-v8a` on disk. There is also a one-time cost at runtime — the first
`create()` in a process compiles the graph for the handset and takes about 45
seconds, so do it on a background thread at app start.

If that storage is not acceptable, drop the accelerator and the engine renders on
the CPU instead. Nothing throws, and the avatar still speaks — it is just slower:

```kotlin
dependencies {
    implementation("ai.bithuman:expression2-android:0.4.9") {
        exclude(group = "com.qualcomm.qti")
    }
}
```

### Essence 2

Three differences from the block above, and each one is silent when it is missing:
the floor is `minSdk 29`, `buildConfig` has to be switched on, and the API secret has to
reach the code.

```kotlin
// app/build.gradle.kts — AGP 8.x generates no BuildConfig unless you ask
android {
    buildFeatures { buildConfig = true }
    defaultConfig {
        minSdk = 29
        ndk { abiFilters += "arm64-v8a" }
        buildConfigField(
            "String", "BITHUMAN_API_SECRET",
            "\"${providers.gradleProperty("bithumanApiSecret").getOrElse("")}\"",
        )
    }
    packaging { jniLibs { useLegacyPackaging = true } }
}
dependencies {
    implementation("ai.bithuman:essence2-android:0.5.14")
}
```

Essence 2 takes no Qualcomm artifacts and needs none. Its AAR declares
`<uses-native-library android:name="libOpenCL.so" android:required="false" />`,
which merges into your manifest, so the engine reaches the handset's GPU without
you adding a line — and the app still installs on a device that ships no OpenCL.

**Do not lower the floor to share one module with Expression 2.** `minSdk 26` with
`essence2-android` on the classpath fails the manifest merge. Give each model its
own module, or raise the whole app to 29.

> **Important** **Type these versions exactly, and nothing lower.** An older
> coordinate still resolves, still compiles and renders **differently**, with no
> exception and no log — `essence2-android` 0.5.11, 0.5.12 and 0.5.13 ship a
> byte-identical `classes.jar`, so a compiler, an IDE and the
> [API reference](/sdk/android-api) all see three indistinguishable releases. Only
> the picture differs. See [Pin the version](#pin-the-version).

## Minimal code

16 kHz mono audio in, picture frames out, on the phone. The two engines differ in
what they hand you: Expression 2 fills a `Bitmap`, Essence 2 fills a direct
`ByteBuffer` you size from the identity.

### Expression 2

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

`pull()` returns `null` when no frame is ready: it never renders and never waits,
so asking again immediately just burns a core the engine needs. Sleeping first, as
above, is worth about 10 frames per second on a Galaxy S25+.

The default `Expression2Options()` uses the handset's accelerator when it has one
and falls back to the CPU instead of throwing.

### Essence 2

Audio goes in as **16-bit little-endian PCM bytes**, exactly as a 16 kHz mono WAV
stores them — not the `FloatArray` Expression 2 takes. `newFrameBuffer()` hands
back a direct buffer of `width * height * 4` bytes, RGBA.

```kotlin
import ai.bithuman.essence2.Essence2Avatar
import ai.bithuman.essence2.Essence2Metering
import ai.bithuman.essence2.Essence2ModelStore
import ai.bithuman.elevate.Essence2ModelStore.MeteredDoorResolver   // nested — see below
import android.content.Context
import java.nio.ByteBuffer

/** [pcm16le] is 16 kHz mono 16-bit little-endian PCM, as read out of a WAV. */
fun render(context: Context, agentCode: String, pcm16le: ByteArray, show: (ByteBuffer, Int, Int) -> Unit) {
    val secret = BuildConfig.BITHUMAN_API_SECRET

    // 1. Set the metering key BEFORE anything opens an engine: create() reads it.
    Essence2Metering.apiSecret = secret

    // 2. Name the resolver. This store has no default; fetch() throws without one.
    val store = Essence2ModelStore(context, urlResolver = MeteredDoorResolver(secret))
    val identity = store.fetch(agentCode)   // 226-281 MB the first time; not on the main thread

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

Two things about that block are easy to get wrong:

- **One import names a legacy package, and it has to.** The `ai.bithuman.essence2`
  names are Kotlin type aliases onto `ai.bithuman.elevate`, where the real classes
  live. Kotlin resolves an alias to a class but **not** to a class nested inside
  it, so `Essence2ModelStore.MeteredDoorResolver` does not compile through the
  alias — import that one nested class from its own package.
  [Why these names stay spellable](/concepts/avatars-imx#the-engine-value-is-a-legacy-name).
- **`checkRender()` is not optional bookkeeping.** A key the service rejects is
  refused; a service that cannot be reached at the first contact renders nothing
  (retryable); once the service has accepted the key, an outage renders for 300 s
  of frames and then refuses retryably until it answers, and the outage is claimed
  then (from 0.5.14).

`create()` takes nothing but the directory the store filled. The
[worked example](/examples/kotlin-android-hello#essence-2-on-android--the-same-seven-files-three-of-them-changed)
drains against the utterance's own expected frame count instead of a timeout,
which is exact; the loop above is the version that does not need to know how long
the audio was.

## Get a model

Neither AAR ships weights. Each model store downloads an identity by agent code
into app-private storage, once, and keeps it there — so the download figure is
also roughly what the installed app grows by.

**Expression 2 — an anonymous download.** `A02HCY0444` is a published identity, and so is
every Expression 2 identity in the [showcase](/showcase). The download needs no
credential; rendering it does (next section):

```kotlin
val model = Expression2ModelStore(context).fetch("A02HCY0444")   // not on the main thread
```

About **160 MB** on first run: measured 2026-09-21 from each identity's own
`web_manifest.json` at the download endpoint, summing the three members this store
requests — 160.3 MB for `A02HCY0444`, 159.4 MB for `A23WJF0199`, 159.5 MB for
`A74NWD9723`. Almost all of it is one graph file.

**Essence 2 — a credential.** `A21SKT4314` is *warm-clear-professional-presenter*,
a bitHuman-owned identity:

```kotlin
val secret = BuildConfig.BITHUMAN_API_SECRET
val store  = Essence2ModelStore(context, urlResolver = MeteredDoorResolver(secret))
val identity = store.fetch("A21SKT4314")   // 226-281 MB the first time
```

Measured 2026-09-21 by reading each identity's own Android store manifest, the six
published Essence 2 identities declare `download_bytes` between **225,916,858** and
**280,744,559** — about 226 MB to 281 MB. The per-identity table, with the frame
size each one renders at, is on the
[worked example](/examples/kotlin-android-hello#pick-an-identity).

**Frame size is per identity, not per model.** Essence 2 renders whatever canvas
the identity was generated at — the published six include portrait 1080x1920,
landscape 1920x1080 and 1280x720. Read `avatar.width` and `avatar.height` after
`create()`; do not hard-code a size and do not assert on one.

Your own agent's code comes from [Agents](/api/agents) and arrives through the same
endpoint with the same key.

## Authentication

Both engines bill the session they serve — **talking time only**; idle is free —
and refuse to render without an API secret.

**Expression 2 (from 0.4.9)** reads it once, before `create()`, in this order:
`Expression2Metering.apiSecret`, then the `BITHUMAN_API_SECRET` environment
variable, then the secret the model was fetched with through
`Expression2ModelStore.MeteredDoorResolver`. Without one, `Expression2Avatar.create()`
throws: *"refusing to serve: no API secret was found, so this render cannot be
attributed to an account."* A published identity still downloads anonymously.
Below 0.4.9 Expression 2 on Android metered nothing.

**Essence 2** asks for it **twice**, in two places that fail differently:

| Where | Why | Without it |
|---|---|---|
| `Essence2ModelStore` | a download is 0 credits but is recorded | the first `fetch()` throws `Essence2StoreException` |
| `Essence2Metering.apiSecret` | the render is a metered self-hosted session | the render throws `MeteringRefused` |

**Setting one does not cover the other.** Both take the same api-secret. Set
`Essence2Metering.apiSecret` **before** `create()` — that is the call that reads
it — even though the refusal surfaces later, on the first `pull()`.

Put the API secret where Gradle can read it and your source tree cannot: in
`~/.gradle/gradle.properties` as `bithumanApiSecret=…`, or passed as
`-PbithumanApiSecret=…`. The `buildConfigField` in the Essence 2 block turns it
into `BuildConfig.BITHUMAN_API_SECRET`. API secrets are free at
[your API secrets](https://www.bithuman.ai/developer/api-keys); what a session costs
is on [pricing](/guides/pricing).

> **Warning** **A `buildConfigField` bakes the API secret into the APK**, which is
> fine for a local hello-world and wrong for anything you ship — a string
> constant is readable by anyone who has the file. For a real app, fetch your
> API secret from **your** backend at startup and pass it to
> `Essence2Metering.apiSecret` and `MeteredDoorResolver` instead of the
> `BuildConfig` constant. `Essence2Metering.apiSecret` takes an API secret only:
> the meter validates it at `/v1/auth/validate`, which does not accept a runtime
> token. Nothing else in the code changes. See [Authentication](/api/authentication).

A **private** Expression 2 agent needs its owner's key too, through the same kind
of resolver — without one it answers `401`:

```kotlin
Expression2ModelStore(context, urlResolver =
    Expression2ModelStore.MeteredDoorResolver(BuildConfig.BITHUMAN_API_SECRET))
```

## Run

```bash
./gradlew :app:installDebug
```

A terminal build needs what Android Studio sets for you: `ANDROID_HOME` (or
`sdk.dir=` in `local.properties`), a JDK 17 launcher, Gradle 8.11.1 and AGP 8.7.3.
An Expression 2 run of a published identity spends no credits; an Essence 2 render
is a metered self-hosted session — [pricing](/guides/pricing) is the authority.

## Shrink the release build

Turn on `isMinifyEnabled` and there is **nothing to add**, whatever your
`proguardFiles(...)` line says. Each engine reaches its native code by name
through JNI, and each AAR now ships its own keep rule for that boundary
(`proguard.txt` inside the AAR, which Gradle applies to your R8 run
automatically) — `expression2-android` since before 0.4.8, `essence2-android`
from **0.5.13**.

```kotlin
// app/build.gradle.kts — either line works; the AARs protect themselves
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // or: proguardFiles("proguard-rules.pro")
        }
    }
}
```

**Measured 2026-09-23** on a Galaxy S25+ with this site's own
[Essence 2 project](/examples/kotlin-android-hello#essence-2-on-android--the-same-seven-files-three-of-them-changed),
resolved from Maven Central with `isMinifyEnabled = true` and
`proguardFiles("proguard-rules.pro")` **only** — the default file left out:

| `essence2-android` | What R8 did to the engine's JNI bridge | On the handset |
|---|---|---|
| 0.5.12 | renamed it — `ai.bithuman.elevate.NativeBridge -> a.P` in the build's `mapping.txt` | the identity downloads, then the first `create()` throws `UnsatisfiedLinkError: No implementation found for long a.P.l(…)` |
| **0.5.13** | kept it, and the 19 native methods the app reaches, by name | renders and plays, with its audio |

The rename is the dangerous kind: the APK is complete, installs, and only a
release build fails — a debug build never shrinks, so it renders fine.
`expression2-android` 0.4.8 came through the same R8 run untouched.

**Pinned to `essence2-android` 0.5.12 or older?** Keep
`getDefaultProguardFile("proguard-android-optimize.txt")` in the list, or, if
you replace the default file, carry its one native-methods rule into your own:

```proguard
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}
```

Beyond that, neither artifact asks anything of your `proguard-rules.pro`.

## Pin the version

`0.5.13` and `0.4.8` are not "a recent version" — they are the versions this page
describes, and every number and behaviour on it was measured on them. Older
coordinates on Maven Central still resolve, still compile and still render. They
render **differently**, and almost none of the differences throws.

That is the whole hazard: **there is no exception to catch and no API change to
notice.** What an older pin actually gives you:

| If you pin | What silently changes |
|---|---|
| `expression2-android` 0.4.7 or older | the Qualcomm accelerator runtime is not declared, so unless you add it by hand the engine renders on the CPU at a fraction of the frame rate |
| `expression2-android` 0.4.6 or older | the idle clip is cut to its first 48 decoded frames of a 200-frame, 10-second loop, so the avatar wraps at 2.4 s on a seam it was never authored to have. Code naming `Expression2IdleLoop` also fails to compile — there the failure is loud; the cut idle clip is not |
| `essence2-android` 0.5.12 or older | the AAR carries no keep rule for its own JNI bridge, so a **release** build whose `proguardFiles(...)` leaves out `getDefaultProguardFile(...)` renames it and throws `UnsatisfiedLinkError` at the first `create()` — debug builds are unaffected, which is why it reaches a store build unnoticed. See [Shrink the release build](#shrink-the-release-build) |
| `essence2-android` 0.5.11 or older | the mouth is shaped by a coarse oval rather than by the speaker's own lip outline, so speech reads as less precise. No exception, and no log a caller can see |
| `essence2-android` 0.5.10 or older | the mouth interior is partly invented rather than reproduced from the identity's own footage, so teeth can look generic on frames where the real ones were available |
| `essence2-android` 0.5.9 or older | every interruption rewinds the identity's motion to its first frame, so each new utterance restarts the whole gesture instead of continuing |
| `essence2-android` 0.5.8 or older | a slower, heavier start: `create()` takes ~891 ms instead of ~164 ms, resident memory is ~1,019 MB instead of ~683 MB, and 394,788,864 B is written to app storage per identity instead of nothing |
| `essence2-android` 0.5.6 or older | **every render throws `MeteringRefused` on a valid, funded credential.** Fixed in 0.5.7 |

Gradle never quietly moves you *down* — an exact version is an exact version — so
the only way to land on one of these is to type it. Check what you actually have
before you debug anything else:

```bash
./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep ai.bithuman
# must print essence2-android:0.5.13 and/or expression2-android:0.4.8
```

Every published version of both artifacts is listed on [Downloads](/downloads), and
[`repo1.maven.org/maven2/ai/bithuman/`](https://repo1.maven.org/maven2/ai/bithuman/)
is the registry's own answer. Searching for the artifact will not find it —
`search.maven.org` returns no results for this group, verified 2026-09-15 against a
control query that does return results, so a web search saying "not found" is not
evidence the artifact is missing.

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the avatar renders, but slowly, and `acceleratorNote` says *"no libQnnTFLiteDelegate.so in this APK"* | the Qualcomm runtime is missing, or `useLegacyPackaging` is off so no `.so` is on disk | use `0.4.8`, which declares it, and set `packaging { jniLibs { useLegacyPackaging = true } }` |
| `acceleratorNote` says the accelerator refused the graph | you still get frames, on the CPU | nothing to fix in your app; log it and ship |
| the first Expression 2 `create()` takes about 45 s | the accelerator compiles the graph once per process | create on a background thread at app start, once |
| the Expression 2 download is refused with `401` | that agent is private | use a [showcase](/showcase) code, or pass its owner's key through `Expression2ModelStore.MeteredDoorResolver` |
| `Essence2StoreException`, naming `MeteredDoorResolver` | `Essence2ModelStore` was built with no resolver; it has no default credential | pass `MeteredDoorResolver(secret)`, or `PublicMirrorResolver(base)` if you mirror the members yourself |
| `MeteringRefused` on the first `pull()`, after a `create()` that looked fine | `Essence2Metering.apiSecret` is unset — setting the store's resolver does not cover the meter, and the refusal surfaces on the render path | assign `Essence2Metering.apiSecret` as well, **before** `create()` |
| the manifest merge fails on `minSdk` with Essence 2 on the classpath | `essence2-android` declares `minSdk 29`; `expression2-android` declares 26 | raise the module to 29, or give each model its own module |
| `409 MODEL_NOT_GENERATED` from the download | the agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent) and poll until it is listed |
| *"no android bundle is published for THIS identity"* | that agent has an Essence 2 model but no Android bundle staged | use a code from the [example's table](/examples/kotlin-android-hello#pick-an-identity), or ask for that identity to be staged |
| `Unresolved reference: BuildConfig` | AGP 8.x defaults `buildConfig` to off | add `buildFeatures { buildConfig = true }` |
| `unresolved reference 'MeteredDoorResolver'` | it is nested, and Kotlin does not resolve a nested class through a type alias | import `ai.bithuman.elevate.Essence2ModelStore.MeteredDoorResolver` |
| `UnsatisfiedLinkError` on an emulator | both AARs are arm64-v8a only; an x86_64 image installs, then cannot load them | run on a physical arm64 handset |
| `UnsatisfiedLinkError` in a **release** build only, on a handset the debug build renders on fine | you are on `essence2-android` 0.5.12 or older, and R8 renamed the engine's JNI bridge class because the release build's `proguardFiles(...)` dropped `getDefaultProguardFile("proguard-android-optimize.txt")`. The APK is complete and installs; the name the native library binds to is gone | move to `0.5.13`, which keeps its own bridge — or put the default file back — see [Shrink the release build](#shrink-the-release-build) |
| `SDK location not found` | no `ANDROID_HOME` and no `local.properties` | set one of them |
| AGP fails with `What went wrong: 26.0.2.1` (or another bare version) | `JAVA_HOME` points at a JDK newer than 17 | use a JDK 17 launcher |
| `gradle wrapper` refuses an empty directory | Gradle 9 | write `settings.gradle.kts` and `app/` first, the wrapper last |
| you want `essence-1` on Android | it is the first-generation artifact, `ai.bithuman:sdk:2.3.6` — a `.imx` you push yourself and an API secret, not the model-store route above. The published 2.3.6 **cannot authenticate on a device**: it installs, then throws before its first frame with `be_auth_authenticate: status=11`, because its native library ships with no CA trust store and there is no app-side workaround on this version | use a second-generation model above; the whole first-generation project is on [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello#the-first-generation-artifact--essence-1-aibithumansdk236) |

## Examples and source

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — **two**
  complete projects printed in full: the Expression 2 app, then
  [the Essence 2 app](/examples/kotlin-android-hello#essence-2-on-android--the-same-seven-files-three-of-them-changed),
  which is the same seven files with three of them changed.
- **The one app you can clone and run today** —
  [`app/avatar_chat`](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat),
  a Flutter app that is the same code on Android, iOS and macOS. **On Android it
  builds from a clone with no private access at all**: every engine it needs is a
  public Maven Central coordinate, so `flutter build apk` is the whole story. Its
  plugin is pinned (`ref: flutter-plugin-v2.6.11`), so a clone builds the same
  bytes on every machine.
  > ★ The same app does **not** build for iOS or macOS from a clone — the
  > plugin's Apple half stages its engines from a private repository. The app's
  > own README says so in a table rather than letting the build fail at a
  > dependency you would have to guess at. For Apple, use the Swift package on
  > [iOS / macOS](/sdk/ios) instead, which resolves from the public tap.
- [Android API reference](/sdk/android-api) — every public class and member of
  both artifacts, with the Kotlin signature each one actually has, read back out
  of the published AARs rather than typed.
- [Examples](/examples) — every runnable project, by language.

> **Note** **There is nothing to `git clone` for a bare Gradle consumer, and that
> is deliberate.** The two coordinates at the top of this page are the entire
> integration, and the example page above is the source: every file of both
> projects is printed on it, and both are compiled from the **published page** on
> every release — so the page cannot drift from a checked-in copy, because there
> is no copy. The `bithuman-examples` repository's `android/` directory holds
> notes only — coordinates, repositories and what a release build needs — and it
> points here for the project itself.

## Licence

*Proprietary — bitHuman SDK License*. The full text travels with the bytes:
`META-INF/NOTICE.txt` inside each AAR states which part is under which licence,
and a copy is available from [hello@bithuman.ai](mailto:hello@bithuman.ai). The
bundled LiteRT is Apache-2.0; FFmpeg is linked statically into
`essence2-android` under LGPL §6(a) — the relink materials are on
[Android FFmpeg / LGPL](/legal/android-ffmpeg-lgpl).

## See also

- [Downloads](/downloads) — every published version of both artifacts
- [LiveKit](/sdk/livekit) — subscribing to a server-hosted avatar when the render
  is not on the handset
- [Performance](/sdk/performance) — measured frame rates for every platform
- [Where each model runs](/concepts/models#where-each-model-runs) — which model to ship
- [SDK](/sdk) — every platform on one page
