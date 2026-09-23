---
title: "Android API reference"
description: "Every public class in essence2-android and expression2-android: Kotlin signatures and what each class is for."
section: sdk
group: "Reference"
order: 83
type: reference
label: "Android API"
---

How to use these classes in an app is on [Android](/sdk/android). Signatures are Kotlin; `name: Type = …` has a default.

<!-- ANDROIDAPI:BEGIN -->
## Essence 2

Generated from `ai.bithuman:essence2-android:0.5.14` as published on Maven Central. `minSdk` 29, ABIs `arm64-v8a`. Classes not listed here are internal and can change.

| Class | Purpose |
| --- | --- |
| `Essence2Avatar` | One Essence 2 session: feed 16-bit PCM, pull RGBA frames, idle, interrupt with `resetAudio`, and `checkRender`. |
| `Essence2ModelStore` | Downloads and caches an avatar by agent code. Needs a `urlResolver`. |
| `Essence2ModelStore.MeteredDoorResolver` | Downloads with your API secret: `MeteredDoorResolver(secret)`. |
| `Essence2ModelStore.PublicMirrorResolver` | Downloads from your own mirror of the avatar files. |
| `Essence2ModelStore.UrlResolver` | The interface both resolvers implement. |
| `Essence2ModelStore.Bundle` | A downloaded avatar; pass `dir` to `Essence2Avatar.create`. |
| `Essence2ModelStore.ProgressListener` | Download progress callback. |
| `Essence2Metering` | Set `apiSecret` before `create()`; `stateDir` keeps usage that could not be sent. |
| `Essence2MeteringRefused` | Thrown when the service refuses the session (no secret, rejected secret, or offline too long). |
| `Essence2StoreException` | Thrown when a download fails. |
| `Essence2RenderFailed` | Thrown by `checkRender()` when the engine stopped. |
| `Essence2RenderStatus` | What `checkRender()` reports. |

### Essence2Avatar

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

### Essence2ModelStore

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

### Essence2ModelStore.MeteredDoorResolver

```kotlin
class Essence2ModelStore.MeteredDoorResolver : Essence2ModelStore.UrlResolver, Essence2ModelStore.RequestHeaders
    constructor(credential: String, base: String = …)
    fun headers(): Map<String, String>
    fun url(code: String, memberName: String): String
```

### Essence2ModelStore.PublicMirrorResolver

```kotlin
class Essence2ModelStore.PublicMirrorResolver : Essence2ModelStore.UrlResolver
    constructor(base: String = …)
    fun url(code: String, memberName: String): String
```

### Essence2ModelStore.UrlResolver

```kotlin
fun interface Essence2ModelStore.UrlResolver
    fun url(code: String, memberName: String): String
```

### Essence2ModelStore.Bundle

```kotlin
class Essence2ModelStore.Bundle
    val code: String
    val dir: File
    fun open(model: String = …, threads: Int = …, pinBigCores: Boolean = …): Essence2Frames
```

### Essence2ModelStore.ProgressListener

```kotlin
fun interface Essence2ModelStore.ProgressListener
    fun onProgress(memberName: String, bytesDone: Long, bytesTotal: Long)
```

### Essence2Metering

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

### Essence2MeteringRefused

```kotlin
class Essence2MeteringRefused : IllegalStateException
```

### Essence2StoreException

```kotlin
class Essence2StoreException : RuntimeException
    constructor(message: String, cause: Throwable? = …)
```

### Essence2RenderFailed

```kotlin
class Essence2RenderFailed : IllegalStateException
    constructor(message: String, detail: String)
    val detail: String
```

### Essence2RenderStatus

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

## Expression 2

Generated from `ai.bithuman:expression2-android:0.4.9` as published on Maven Central. `minSdk` 26, ABIs `arm64-v8a`. Classes not listed here are internal and can change.

| Class | Purpose |
| --- | --- |
| `Expression2Avatar` | One Expression 2 session: `feed`, `pull` frames into a `Bitmap`, `flushTail`, `idleLoop`, `resetState` to interrupt. |
| `Expression2ModelStore` | Downloads and caches an avatar by agent code. |
| `Expression2ModelStore.MeteredDoorResolver` | Downloads a private avatar with your API secret. |
| `Expression2ModelStore.PublicMirrorResolver` | Downloads from your own mirror of the avatar files. |
| `Expression2ModelStore.UrlResolver` | The interface both resolvers implement. |
| `Expression2ModelStore.ProgressListener` | Download progress callback. |
| `Expression2Model` | A downloaded avatar; pass it to `Expression2Avatar.create`. |
| `Expression2Options` | Session options; the defaults use the accelerator when there is one. |
| `Expression2Metering` | Set `apiSecret` before `create()`; `stateDir` keeps usage that could not be sent. |
| `Expression2Frame` | Returned by `pull`: the frame's index, time and whether it is speech. |
| `Expression2IdleLoop` | The avatar's idle clip; `next(bitmap)` draws the next frame. |
| `Expression2Exception` | Thrown when a session cannot start or is refused. |
| `Accelerator` | Which accelerator a session uses. |

### Expression2Avatar

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

### Expression2ModelStore

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

### Expression2ModelStore.MeteredDoorResolver

```kotlin
class Expression2ModelStore.MeteredDoorResolver : Expression2ModelStore.UrlResolver, Expression2ModelStore.RequestHeaders
    constructor(credential: String = …, base: String = …)
    fun headers(): Map<String, String>
    fun url(code: String, memberName: String): String
```

### Expression2ModelStore.PublicMirrorResolver

```kotlin
class Expression2ModelStore.PublicMirrorResolver : Expression2ModelStore.UrlResolver
    constructor(base: String = …)
    fun url(code: String, memberName: String): String
```

### Expression2ModelStore.UrlResolver

```kotlin
fun interface Expression2ModelStore.UrlResolver
    fun url(code: String, memberName: String): String
```

### Expression2ModelStore.ProgressListener

```kotlin
fun interface Expression2ModelStore.ProgressListener
    fun onProgress(memberName: String, bytesDone: Long, bytesTotal: Long)
```

### Expression2Model

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

### Expression2Options

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

### Expression2Metering

```kotlin
object Expression2Metering
    var apiBaseUrl: String?
    var apiSecret: String?
    var installId: String?
    var stateDir: File?
```

### Expression2Frame

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

### Expression2IdleLoop

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

### Expression2Exception

```kotlin
class Expression2Exception : RuntimeException
    constructor(message: String, cause: Throwable? = …)
```

### Accelerator

```kotlin
enum class Accelerator
    AUTO, NPU, CPU
```
<!-- ANDROIDAPI:END -->

## See also

- [Android](/sdk/android) — install it, get a model, render your first frame
- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — the whole project, file by file
- [Pricing](/guides/pricing) — what a render costs, and what refuses without an API secret
- [Performance](/performance) — measured frame rates for every platform
