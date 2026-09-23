---
title: "Android API reference"
description: "Every public class in the two Android artifacts — Kotlin signatures, nullability, defaults and constants — read back out of the AARs Maven Central serves, not out of a source tree."
section: sdk
group: "Reference"
order: 76
label: "Android API"
---

The [Android SDK](/sdk/android) has a small surface: fetch a model, open an
avatar, feed it audio, pull frames. This page is the full list for both
published artifacts — every public class, the Kotlin signature each member
actually has, and what is in the AAR that is *not* that surface.

**Nobody types this page.** A script resolves the newest published version of
each artifact from Maven Central, downloads that exact `.aar`, verifies it
against the digests Central publishes beside it, and reads the surface back out
of the bytes: the Kotlin metadata the compiler stamped on every class, and the
class files themselves. It never reads our source tree, and it never reads the
`-sources.jar` or `-javadoc.jar` either — those are the source tree in another
box.

**Why two readings, and why that is the whole point.** The Kotlin metadata is
what the Kotlin compiler believes when it compiles your app: visibility as
Kotlin means it, nullability, default arguments. The class files are what the
class loader binds to. They disagree in both directions — a member the
metadata marks `internal` that is `public` in the class file and callable from
Java, or a package that exists only as typealiases in the metadata and has no
class file at all. Where they disagree this page says so rather than quietly
picking one: [In the class files, not the surface](#in-the-class-files-not-the-surface).
A symbol is listed as the API only where both agree.

**It is re-checked against the registry, not against itself.** A scheduled job
re-runs the extraction against whatever Maven Central serves that morning and
fails if what is on this page no longer matches the shipped surface. The thing
that changes is the registry, not the page.

Signatures are Kotlin. A parameter written `name: Type = …` has a default;
the metadata records that it has one, not what it is. There is no prose here
because the artifacts ship none: Kotlin metadata carries no documentation.

<!-- ANDROIDAPI:BEGIN -->
Each artifact below is one section: the bytes it was read from, the packages it declares, every public class with its members as Kotlin spells them, and then everything in the class files that is NOT that surface.

## Essence 2 — ai.bithuman:essence2-android

| Field | Value |
| --- | --- |
| Registry | maven-central |
| Coordinate | ai.bithuman:essence2-android |
| Version | 0.5.14 |
| File | `essence2-android-0.5.14.aar` |
| Digest | `sha256:b4912bdb016b8bfd6a3b4591ce398df08954614ed944465c99ea4afe0d86717c` |
| Resolved on | 2026-09-23 |

| What the artifact declares | Value |
| --- | --- |
| `minSdk` | 29 |
| ABIs | `arm64-v8a` |
| Native libraries | `libc++_shared.so`, `lible_jni.so`, `libonnxruntime.so` |
| Permissions merged into your app | `android.permission.INTERNET` |
| Kotlin metadata | version 2.0.0 |

34 public classes on the package `ai.bithuman.elevate` — a legacy package name kept for compatibility, which a developer still types in an import; `ai.bithuman.essence2` below aliases 8 of them under product names, and a nested class is reached through the legacy package only.

### ai.bithuman.essence2

8 typealiases, declared by the package's Kotlin metadata and present in no class file: a Kotlin caller imports these names, a Java caller cannot see them.

| Alias | Declared as | Both sides agree |
| --- | --- | --- |
| `Essence2ArmLayout` | a class whose own name is withheld — it names an internal mechanism | yes |
| `Essence2Avatar` | `Essence2Avatar` | yes |
| `Essence2BorrowRefused` | a class whose own name is withheld — it names an internal mechanism | yes |
| `Essence2Frames` | a class whose own name is withheld — it names an internal mechanism | yes |
| `Essence2Metering` | `Essence2Metering` | yes |
| `Essence2MeteringRefused` | `MeteringRefused` | yes |
| `Essence2ModelStore` | `Essence2ModelStore` | yes |
| `Essence2StoreException` | `Essence2StoreException` | yes |

### Classes

34 public classes, each declared public by the Kotlin metadata and public in its class file. 4 of them are not listed here: their names describe an internal mechanism, and they are not part of opening an avatar and rendering audio through it.

#### Avatar

```kotlin
class Avatar
    fun render(audio: ByteArray): Sequence<ByteArray>
    fun render(audio: Sequence<ByteArray>): Sequence<ByteArray>
```

#### AvatarError

```kotlin
sealed class AvatarError : Exception
    // sealed: AvatarError.Failed, AvatarError.InvalidAvatar, AvatarError.NotAuthorised, AvatarError.NotSupported
```

#### AvatarError.Failed

```kotlin
class AvatarError.Failed : AvatarError
    constructor(message: String)
```

#### AvatarError.InvalidAvatar

```kotlin
class AvatarError.InvalidAvatar : AvatarError
    constructor(message: String)
```

#### AvatarError.NotAuthorised

```kotlin
class AvatarError.NotAuthorised : AvatarError
    constructor(message: String)
```

#### AvatarError.NotSupported

```kotlin
class AvatarError.NotSupported : AvatarError
    constructor(message: String)
```

#### Bhci

```kotlin
object Bhci
    const val NOT_APPLICABLE_WHY: String  // value withheld: it names an internal mechanism
    const val SURFACE: String = "android-essence-2"
    const val VERSION: String = "1"
    val CLOUD_ONLY_MODELS: List<String>
    val ENGINE_TO_MODEL: Map<String, String>
    val MODELS: List<String>
    val TARGETS: List<String>
    fun bhciAttachAudio(h: Bhci.Artifact, nSamples: Int): Int
    fun bhciCapability(model: String, target: String): Bhci.Capability
    fun bhciDescribe(): Map<String, Any?>
    fun bhciOpen(source: String, declaredEngine: String?): Bhci.Artifact
    fun bhciPull(h: Bhci.Artifact): Any?
    fun bhciState(h: Bhci.Artifact, evidence: List<Any>? = …): Bhci.State
```

3 members are withheld: the name describes an internal mechanism.

#### Bhci.Artifact

```kotlin
data class Bhci.Artifact
    constructor(source: String, model: String, locality: String, declaredEngine: String, audioSamples: Int = …, framesPulled: Int = …)
    val declaredEngine: String
    val locality: String
    val model: String
    val source: String
    var audioSamples: Int
    var framesPulled: Int
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Bhci.BhciException

```kotlin
class Bhci.BhciException : RuntimeException
    constructor(code: String, subject: String, detail: String)
    val code: String
    val detail: String
    val exit: Int
    val legacyCode: String?
    val subject: String
```

#### Bhci.Capability

```kotlin
data class Bhci.Capability
    constructor(…)  // 5 parameters; the signature names an internal mechanism and is withheld
    val locality: String
    val model: String
    val scope: String
    val target: String
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

1 member is withheld: the name describes an internal mechanism.

#### Bhci.Conditions

```kotlin
data class Bhci.Conditions
    constructor(membersPresent: Int?, unifiedComposeW0Tap: String?, piDeriverInputs: String?)
    val membersPresent: Int?
    val piDeriverInputs: String?
    val unifiedComposeW0Tap: String?
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Bhci.State

```kotlin
data class Bhci.State
    constructor(…)  // 5 parameters; the signature names an internal mechanism and is withheld
    val framesPulled: Int
    val locality: String
    val model: String
    val target: String?
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

1 member is withheld: the name describes an internal mechanism.

#### BitHuman

```kotlin
object BitHuman
    fun open(avatar: String): Avatar
```

#### Essence2ArmLayout

```kotlin
object Essence2ArmLayout
    fun bytes(frames: Int, side: Int): Long
    fun frameBytes(side: Int): Long
    fun isComplete(actualBytes: Long, frames: Int, side: Int): Boolean
    fun refusal(actualBytes: Long, frames: Int, side: Int): String?
```

#### Essence2Avatar

```kotlin
class Essence2Avatar : AutoCloseable
    val height: Int
    val targetFrames: Int
    val width: Int
    fun available(): Int
    fun checkRender()
    fun close()
    fun endOfAudio()
    fun feed(pcm16le: ByteArray, offset: Int = …, count: Int = …)
    fun feed(samples: FloatArray, offset: Int = …, count: Int = …)
    fun idle(dst: ByteBuffer): Boolean
    fun newFrameBuffer(): ByteBuffer
    fun pull(dst: ByteBuffer): Boolean
    fun resetAudio(startFrame: Int = …, forward: Boolean = …, wrap: Boolean = …)
    companion object
        const val W2V_MEMBER: String = "w2v_ess_fp16_v1.onnx"
        const val W2V_MEMBER_TEACHER: String = "wav2vec2_fp32_8s.onnx"
        fun create(bundleDir: File, w2v: File? = …, threads: Int = …, frames: Essence2Frames? = …): Essence2Avatar
        fun frontendIn(bundleDir: File): File
```

#### Essence2BorrowRefused

```kotlin
class Essence2BorrowRefused : IllegalStateException
    constructor(message: String)
```

#### Essence2Frames

```kotlin
class Essence2Frames : AutoCloseable
    constructor(bundleDir: String, model: String = …, threads: Int = …, pinBigCores: Boolean = …)
    val batch: Int
    val cropSide: Int
    val driveFrames: Int
    val height: Int
    val targetCount: Int
    val width: Int
    fun checkRender()
    fun chunkFrame(cacheIdx: Int, j: Int, out: ByteBuffer): Boolean
    fun close()
    fun flushBorrow(out: ByteBuffer): Int
    fun idleFrame(out: ByteBuffer): Int
    fun newFrameBuffer(): ByteBuffer
    fun renderChunk(cacheIdx: Int, driveIndices: IntArray): Boolean
    fun renderDrive(i: Int, out: ByteBuffer): Boolean
    fun renderDriveBorrow(i: Int, out: ByteBuffer): Int
```

7 members are withheld: the name describes an internal mechanism.

#### Essence2Metering

```kotlin
object Essence2Metering
    var apiBaseUrl: String?
    var apiSecret: String?
    var basis: String
    @Deprecated("Enforcement is unconditional since 0.5.7; this property is ignored.")
    var enforce: Boolean?
    var flushBudgetMs: Long
    var fps: Double
    var installId: String?
    var lastBeatsDelivered: Int
    var lastBeatsFailed: Int
    var lastServedAckedSeconds: Double
    var lastSessionId: String?
    var stateDir: File?
    @Deprecated("The unmetered escape was removed in 0.5.7; this property is ignored.")
    var unmetered: Boolean?
```

#### Essence2MeteringRefused

```kotlin
class Essence2MeteringRefused : IllegalStateException
```

#### Essence2ModelStore

```kotlin
class Essence2ModelStore
    constructor(context: Context, rootDir: File = …, cacheBudgetBytes: Long = …, urlResolver: Essence2ModelStore.UrlResolver = …)
    val cacheBudgetBytes: Long
    val rootDir: File
    val urlResolver: Essence2ModelStore.UrlResolver
    fun bytesOnDisk(): Long
    fun cached(code: String): Essence2ModelStore.Bundle?
    fun evict(code: String): Boolean
    fun fetch(code: String, force: Boolean = …, cancelled: AtomicBoolean? = …, progress: Essence2ModelStore.ProgressListener? = …): Essence2ModelStore.Bundle
    fun listCached(): List<Essence2ModelStore.CachedIdentity>
    fun verifyDeep(code: String): Boolean
    companion object
        const val BUNDLE_MANIFEST: String = "manifest.json"
        const val DEFAULT_DOOR_URL: String = "https://api.bithuman.ai"
        const val DONOR_CAP: Int = 1024
        const val STORE_FORMAT: String = "essence2_android_store.v1"
        const val STORE_MANIFEST: String = "android_store.v1.json"
        val DEFAULT_MEMBERS: Map<String, String>
        val SLOT_KEYS: List<String>
```

1 member is withheld: the name describes an internal mechanism.

#### Essence2ModelStore.Bundle

```kotlin
class Essence2ModelStore.Bundle
    val code: String
    val dir: File
    fun open(model: String = …, threads: Int = …, pinBigCores: Boolean = …): Essence2Frames
```

1 member is withheld: the name describes an internal mechanism.

#### Essence2ModelStore.CachedIdentity

```kotlin
data class Essence2ModelStore.CachedIdentity
    constructor(code: String, dir: File, bytesOnDisk: Long, lastUsedEpochMs: Long)
    val bytesOnDisk: Long
    val code: String
    val dir: File
    val lastUsedEpochMs: Long
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Essence2ModelStore.MeteredDoorResolver

```kotlin
class Essence2ModelStore.MeteredDoorResolver : Essence2ModelStore.UrlResolver, Essence2ModelStore.RequestHeaders
    constructor(credential: String, base: String = …)
    fun headers(): Map<String, String>
    fun url(code: String, memberName: String): String
```

#### Essence2ModelStore.ProgressListener

```kotlin
fun interface Essence2ModelStore.ProgressListener
    fun onProgress(memberName: String, bytesDone: Long, bytesTotal: Long)
```

#### Essence2ModelStore.PublicMirrorResolver

```kotlin
class Essence2ModelStore.PublicMirrorResolver : Essence2ModelStore.UrlResolver
    constructor(base: String = …)
    fun url(code: String, memberName: String): String
```

#### Essence2ModelStore.RequestHeaders

```kotlin
interface Essence2ModelStore.RequestHeaders
    fun headers(): Map<String, String>
```

#### Essence2ModelStore.UrlResolver

```kotlin
fun interface Essence2ModelStore.UrlResolver
    fun url(code: String, memberName: String): String
```

#### Essence2RenderFailed

```kotlin
class Essence2RenderFailed : IllegalStateException
    constructor(message: String, detail: String)
    val detail: String
```

#### Essence2RenderStatus

```kotlin
class Essence2RenderStatus
    constructor()
    fun check(status: Int, failures: Long, reason: String)
    fun checkDelivery(queueEmpty: Boolean, detail: String)
    fun delivered(): Long
    fun noteDelivered()
    fun noteEndOfAudio()
    fun noteFed()
    fun startUtterance()
```

#### Essence2StoreException

```kotlin
class Essence2StoreException : RuntimeException
    constructor(message: String, cause: Throwable? = …)
```

### In the class files, not the surface

A reference generated from `javap` would have listed each of these. They are in the AAR and public to the class loader, and a Kotlin caller either cannot name them or never needs to.

| What | Why it is not the surface | What it is |
| --- | --- | --- |
| 23 classes declared `internal` | `public` in the class file; the Kotlin compiler refuses them from outside the artifact, Java does not | `BeatSink`, `BithumanCode`, `BithumanCodes`, `CoreThreads`, `Devices`, `Essence2ModelStore.Fetch`, `Essence2ModelStore.Member`, `Essence2ModelStore.MemberChanged`, `Essence2ModelStore.Retry`, `Essence2ModelStore.Revalidated`, `Essence2ModelStore.Revalidation`, `Frames`, `HttpBeatSink`, `MeterHost`, `MeterLedger`, `MeterLedger.Companion`, `MeterLedger.Record`, `MotionQueue`, `NativeBridge`, `Opener`, `SelfHostMeter`, `SelfHostMeter.Companion`, `Wiring` |
| 59 members declared `internal` on 9 classes | `public` in the class file — a function under a mangled name (`name$module`), a field or a constructor as is; a Java caller can call them | `Essence2ModelStore.Companion` (18), `Essence2Metering` (13), `Essence2ModelStore` (13), `Essence2RenderStatus` (6), `Essence2Frames` (5), `Avatar` (1), `Essence2MeteringRefused` (1), `Essence2ModelStore.Bundle` (1), a class whose name is withheld (1) |
| 27 `$default` bridges and marker constructors | generated by the Kotlin compiler for Java callers | how a default argument is supplied when the caller omits it; Kotlin resolves them for you |
| 19 overloads for Java callers | generated by the Kotlin compiler for Java callers | the same function or constructor with trailing defaulted parameters dropped (`@JvmOverloads`, or the no-argument constructor of an all-defaults class) |
| 5 static copies of companion functions | generated by the Kotlin compiler for Java callers | `@JvmStatic`: the companion's function again, as a static of the outer class |
| 6 `INSTANCE` and `Companion` fields | generated by the Kotlin compiler for Java callers | how Java reaches a Kotlin `object`; a Kotlin caller names the object |
| 19 synthetic accessors and annotation holders | generated by the Kotlin compiler for Java callers | compiler plumbing: `access$…`, `…$annotations`, bridge methods |
| 5 synthetic classes | lambdas and `when` tables the compiler emitted | not nameable from source |

## Expression 2 — ai.bithuman:expression2-android

| Field | Value |
| --- | --- |
| Registry | maven-central |
| Coordinate | ai.bithuman:expression2-android |
| Version | 0.4.9 |
| File | `expression2-android-0.4.9.aar` |
| Digest | `sha256:f01e1be683df5ebcd61d42646495355d7606a1b8ec5918bebbf52f085c20fd19` |
| Resolved on | 2026-09-23 |

| What the artifact declares | Value |
| --- | --- |
| `minSdk` | 26 |
| ABIs | `arm64-v8a` |
| Native libraries | `libLiteRt.so`, `libexpr2jni.so` |
| Permissions merged into your app | `android.permission.INTERNET` |
| Kotlin metadata | version 2.0.0 |

37 public classes on the package `ai.bithuman.expression2`.

### Classes

37 public classes, each declared public by the Kotlin metadata and public in its class file. 3 of them are not listed here: their names describe an internal mechanism, and they are not part of opening an avatar and rendering audio through it.

#### Accelerator

```kotlin
enum class Accelerator
    AUTO, NPU, CPU
```

#### Avatar

```kotlin
class Avatar
    fun render(audio: ByteArray): Sequence<ByteArray>
    fun render(audio: Sequence<ByteArray>): Sequence<ByteArray>
```

#### AvatarError

```kotlin
sealed class AvatarError : Exception
    // sealed: AvatarError.Failed, AvatarError.InvalidAvatar, AvatarError.NotAuthorised, AvatarError.NotSupported
```

#### AvatarError.Failed

```kotlin
class AvatarError.Failed : AvatarError
    constructor(message: String)
```

#### AvatarError.InvalidAvatar

```kotlin
class AvatarError.InvalidAvatar : AvatarError
    constructor(message: String)
```

#### AvatarError.NotAuthorised

```kotlin
class AvatarError.NotAuthorised : AvatarError
    constructor(message: String)
```

#### AvatarError.NotSupported

```kotlin
class AvatarError.NotSupported : AvatarError
    constructor(message: String)
```

#### Bhci

```kotlin
object Bhci
    const val NOT_APPLICABLE_WHY: String  // value withheld: it names an internal mechanism
    const val SURFACE: String = "android-expression-2"
    const val VERSION: String = "1"
    val CLOUD_ONLY_MODELS: List<String>
    val ENGINE_TO_MODEL: Map<String, String>
    val MODELS: List<String>
    val TARGETS: List<String>
    fun bhciAttachAudio(h: Bhci.Artifact, nSamples: Int): Int
    fun bhciCapability(model: String, target: String): Bhci.Capability
    fun bhciDescribe(): Map<String, Any?>
    fun bhciOpen(source: String, declaredEngine: String?): Bhci.Artifact
    fun bhciPull(h: Bhci.Artifact): Any?
    fun bhciState(h: Bhci.Artifact, evidence: List<Any>? = …): Bhci.State
```

3 members are withheld: the name describes an internal mechanism.

#### Bhci.Artifact

```kotlin
data class Bhci.Artifact
    constructor(source: String, model: String, locality: String, declaredEngine: String, audioSamples: Int = …, framesPulled: Int = …)
    val declaredEngine: String
    val locality: String
    val model: String
    val source: String
    var audioSamples: Int
    var framesPulled: Int
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Bhci.BhciException

```kotlin
class Bhci.BhciException : RuntimeException
    constructor(code: String, subject: String, detail: String)
    val code: String
    val detail: String
    val exit: Int
    val legacyCode: String?
    val subject: String
```

#### Bhci.Capability

```kotlin
data class Bhci.Capability
    constructor(…)  // 5 parameters; the signature names an internal mechanism and is withheld
    val locality: String
    val model: String
    val scope: String
    val target: String
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

1 member is withheld: the name describes an internal mechanism.

#### Bhci.Conditions

```kotlin
data class Bhci.Conditions
    constructor(membersPresent: Int?, unifiedComposeW0Tap: String?, piDeriverInputs: String?)
    val membersPresent: Int?
    val piDeriverInputs: String?
    val unifiedComposeW0Tap: String?
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Bhci.State

```kotlin
data class Bhci.State
    constructor(…)  // 5 parameters; the signature names an internal mechanism and is withheld
    val framesPulled: Int
    val locality: String
    val model: String
    val target: String?
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

1 member is withheld: the name describes an internal mechanism.

#### BitHuman

```kotlin
object BitHuman
    fun open(avatar: String): Avatar
```

#### Device

```kotlin
enum class Device
    CPU, NPU, REFERENCE
```

#### Expression2

```kotlin
object Expression2
    fun open(context: Context, code: String, credential: String = …, progress: Expression2ModelStore.ProgressListener? = …): Expression2Avatar
    fun render(context: Context, code: String, wav: File, credential: String, progress: Expression2ModelStore.ProgressListener?, onFrame: Expression2.FrameSink): Int
    fun render(context: Context, code: String, wav: File, onFrame: Expression2.FrameSink): Int
```

#### Expression2.FrameSink

```kotlin
fun interface Expression2.FrameSink
    fun onFrame(bitmap: Bitmap, frame: Expression2Frame): Boolean
```

#### Expression2Avatar

```kotlin
class Expression2Avatar : AutoCloseable
    val accelerator: Accelerator
    val acceleratorNote: String
    val backends: List<Expression2Backend>
    val frameBytes: Int
    val hasPendingTail: Boolean
    val height: Int
    val idleLoop: Expression2IdleLoop?
    val initMs: Double
    val isReady: Boolean
    val model: Expression2Model
    val options: Expression2Options
    val overlapActive: Boolean
    val pendingAudioSlices: Int
    val queuedFrames: Int
    val routing: Routing
    val stepHistoryInputIndex: Int
    val width: Int
    var idleLoopUnavailableReason: String?
    fun beginSegment()
    fun close()
    fun feed(samples: FloatArray, offset: Int = …, count: Int = …)
    fun flushTail(trimSamples: Long = …)
    fun newFrameBitmap(): Bitmap
    fun newFrameBuffer(): ByteBuffer
    fun pull(dst: Bitmap): Expression2Frame?
    fun pull(dst: ByteBuffer): Expression2Frame?
    fun pump()
    fun resetState(clearFrames: Boolean = …)
    fun stats(): Expression2Stats
    companion object
        const val FRAMES_PER_SECOND: Int = 20
        const val FRAME_HEIGHT: Int = 720
        const val FRAME_WIDTH: Int = 416
        const val SAMPLE_RATE: Int = 16000
        fun create(context: Context, model: Expression2Model, options: Expression2Options = …): Expression2Avatar
        fun warmUp(context: Context, model: Expression2Model, options: Expression2Options = …): Expression2Avatar
```

#### Expression2Backend

```kotlin
data class Expression2Backend
    constructor(modelPath: String, device: Device, modelLoadMs: Double, interpreterCreateMs: Double, qnnContextCacheWasWarm: Boolean, qnnContextCacheBytesBefore: Long, qnnContextCacheBytesAfter: Long)
    val device: Device
    val interpreterCreateMs: Double
    val modelLoadMs: Double
    val modelPath: String
    val qnnContextCacheBytesAfter: Long
    val qnnContextCacheBytesBefore: Long
    val qnnContextCacheWasWarm: Boolean
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Expression2Exception

```kotlin
class Expression2Exception : RuntimeException
    constructor(message: String, cause: Throwable? = …)
```

#### Expression2Frame

```kotlin
data class Expression2Frame
    constructor(index: Long, presentationTimeUs: Long, audioSample: Long = …, isSpeech: Boolean = …)
    val audioSample: Long
    val index: Long
    val isSpeech: Boolean
    val presentationTimeSeconds: Double
    val presentationTimeUs: Long
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Expression2IdleLoop

```kotlin
class Expression2IdleLoop : AutoCloseable
    val height: Int
    val width: Int
    var frameCount: Int
    var lastIndex: Int
    var wraps: Int
    fun close()
    fun next(dst: Bitmap): Int
```

#### Expression2Metering

```kotlin
object Expression2Metering
    var apiBaseUrl: String?
    var apiSecret: String?
    var installId: String?
    var stateDir: File?
```

#### Expression2Model

```kotlin
class Expression2Model
    val canon: File
    val code: String?
    val combinedModel: File?
    val contextCacheDir: File?
    val identityModel: File?
    val idleClip: File?
    val isSplit: Boolean
    val modelBytes: Long
    val sharedEncModel: File?
    fun toString(): String
    companion object
        const val CANON_BYTES: Long = 299520
        fun combined(modelPath: File, canonPath: File, code: String? = …, contextCacheDir: File? = …, idleClipPath: File? = …): Expression2Model
        fun split(sharedEncPath: File, identityPath: File, canonPath: File, code: String? = …, contextCacheDir: File? = …): Expression2Model
```

#### Expression2ModelStore

```kotlin
class Expression2ModelStore
    constructor(context: Context, rootDir: File = …, cacheBudgetBytes: Long = …, urlResolver: Expression2ModelStore.UrlResolver = …, preferAndroidMember: Boolean = …)
    val cacheBudgetBytes: Long
    val preferAndroidMember: Boolean
    val rootDir: File
    val urlResolver: Expression2ModelStore.UrlResolver
    fun bytesOnDisk(): Long
    fun cached(code: String): Expression2Model?
    fun evict(code: String): Boolean
    fun fetch(code: String, force: Boolean = …, cancelled: AtomicBoolean? = …, progress: Expression2ModelStore.ProgressListener? = …): Expression2Model
    fun listCached(): List<Expression2ModelStore.CachedIdentity>
    fun verifyDeep(code: String): Boolean
    companion object
        const val ANDROID_BLOCK: String = "android"
        const val CANON: String = "canon.bin"
        const val DEFAULT_DOOR_URL: String = "https://api.bithuman.ai"
        const val IDLE: String = "idle.mp4"
        const val MANIFEST: String = "web_manifest.json"
        const val MODEL: String = "combined_fp32.tflite"
        val REQUIRED: List<String>
```

#### Expression2ModelStore.CachedIdentity

```kotlin
data class Expression2ModelStore.CachedIdentity
    constructor(code: String, dir: File, bytesOnDisk: Long, lastUsedEpochMs: Long)
    val bytesOnDisk: Long
    val code: String
    val dir: File
    val lastUsedEpochMs: Long
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Expression2ModelStore.MeteredDoorResolver

```kotlin
class Expression2ModelStore.MeteredDoorResolver : Expression2ModelStore.UrlResolver, Expression2ModelStore.RequestHeaders
    constructor(credential: String = …, base: String = …)
    fun headers(): Map<String, String>
    fun url(code: String, memberName: String): String
```

#### Expression2ModelStore.ProgressListener

```kotlin
fun interface Expression2ModelStore.ProgressListener
    fun onProgress(memberName: String, bytesDone: Long, bytesTotal: Long)
```

#### Expression2ModelStore.PublicMirrorResolver

```kotlin
class Expression2ModelStore.PublicMirrorResolver : Expression2ModelStore.UrlResolver
    constructor(base: String = …)
    fun url(code: String, memberName: String): String
```

#### Expression2ModelStore.RequestHeaders

```kotlin
interface Expression2ModelStore.RequestHeaders
    fun headers(): Map<String, String>
```

#### Expression2ModelStore.UrlResolver

```kotlin
fun interface Expression2ModelStore.UrlResolver
    fun url(code: String, memberName: String): String
```

#### Expression2Options

```kotlin
data class Expression2Options
    constructor(accelerator: Accelerator = …, routing: Routing? = …, threads: Int = …, qnnOptions: String = …, contextCacheDir: File? = …, disableContextCache: Boolean = …, maxQueuedFrames: Int = …, extraDspSearchPaths: List<String> = …, overlapDecoder: Boolean? = …)
    val accelerator: Accelerator
    val contextCacheDir: File?
    val disableContextCache: Boolean
    val extraDspSearchPaths: List<String>
    val maxQueuedFrames: Int
    val overlapDecoder: Boolean?
    val qnnOptions: String
    val routing: Routing?
    val threads: Int
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
    companion object
        const val DEFAULT_QNN_OPTIONS: String = "backend_type:htp;htp_precision:1;htp_performance_mode:6"
        const val QNN_DELEGATE_SO: String = "libQnnTFLiteDelegate.so"
        const val QNN_OPTIONS_ADRENO_FP32: String = "backend_type:gpu;gpu_precision:0"
        const val QNN_OPTIONS_HEXAGON_BURST: String = "backend_type:htp;htp_precision:1;htp_performance_mode:6;htp_optimization_strategy:1"
```

#### Expression2Stats

```kotlin
data class Expression2Stats
    constructor(tempoMs: Double, encMs: Double, tokMs: Double, stepMs: Double, decMs: Double, u8Ms: Double, wallMs: Double, frames: Long, chunks: Long, steadyWallMs: Double, steadyFrames: Long, steadyChunks: Long, decWaitMs: Double = …)
    val chunks: Long
    val decMs: Double
    val decWaitMs: Double
    val encMs: Double
    val frames: Long
    val framesPerSecond: Double
    val realTimeFactor: Double
    val steadyChunks: Long
    val steadyFrames: Long
    val steadyRealTimeFactor: Double
    val steadyWallMs: Double
    val stepMs: Double
    val tempoMs: Double
    val tokMs: Double
    val u8Ms: Double
    val wallMs: Double
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
```

#### Routing

```kotlin
data class Routing
    constructor(enc: Device = …, tok14: Device = …, step: Device = …, dec: Device = …)
    val dec: Device
    val enc: Device
    val step: Device
    val tok14: Device
    // data class: copy, componentN, equals, hashCode and toString as Kotlin generates them
    companion object
        val ALL_CPU: Routing
        val ALL_NPU: Routing
        val GPU_DECODER: Routing
        val HTP_DECODER: Routing
        val MIXED: Routing
```

### In the class files, not the surface

A reference generated from `javap` would have listed each of these. They are in the AAR and public to the class loader, and a Kotlin caller either cannot name them or never needs to.

| What | Why it is not the surface | What it is |
| --- | --- | --- |
| 18 classes declared `internal` | `public` in the class file; the Kotlin compiler refuses them from outside the artifact, Java does not | `BeatSink`, `Devices`, `Expression2Backend.Companion`, `Expression2ModelStore.Bundle`, `Expression2ModelStore.Member`, `Expression2ModelStore.Retry`, `Expression2Stats.Companion`, `Frames`, `HttpBeatSink`, `MeterHost`, `MeterLedger`, `MeterLedger.Companion`, `MeterLedger.Record`, `Native`, `Opener`, `SelfHostMeter`, `SelfHostMeter.Companion`, `Wiring` |
| 47 members declared `internal` on 10 classes | `public` in the class file — a function under a mangled name (`name$module`), a field or a constructor as is; a Java caller can call them | `Expression2Metering` (19), `Expression2ModelStore.Companion` (10), `Expression2ModelStore` (6), `Expression2` (3), `Expression2IdleLoop` (3), `Expression2Options` (2), `Avatar` (1), `Device` (1), `Routing` (1), `the package ai.bithuman.expression2` (1) |
| 41 `$default` bridges and marker constructors | generated by the Kotlin compiler for Java callers | how a default argument is supplied when the caller omits it; Kotlin resolves them for you |
| 6 enum entry fields | generated by the Kotlin compiler for Java callers | the entries listed above, as static fields |
| 6 `values()`, `valueOf()`, `getEntries()` | generated by the Kotlin compiler for Java callers | the enum statics Kotlin generates |
| 25 overloads for Java callers | generated by the Kotlin compiler for Java callers | the same function or constructor with trailing defaulted parameters dropped (`@JvmOverloads`, or the no-argument constructor of an all-defaults class) |
| 11 static copies of companion functions | generated by the Kotlin compiler for Java callers | `@JvmStatic`: the companion's function again, as a static of the outer class |
| 11 `INSTANCE` and `Companion` fields | generated by the Kotlin compiler for Java callers | how Java reaches a Kotlin `object`; a Kotlin caller names the object |
| 9 synthetic accessors and annotation holders | generated by the Kotlin compiler for Java callers | compiler plumbing: `access$…`, `…$annotations`, bridge methods |
| 5 synthetic classes | lambdas and `when` tables the compiler emitted | not nameable from source |
<!-- ANDROIDAPI:END -->

## See also

- [Android](/sdk/android) — install it, get a model, render your first frame
- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — the whole project, file by file
- [Pricing](/guides/pricing) — what a render costs, and what refuses without an API secret
- [Performance](/sdk/performance) — measured frame rates for every platform
