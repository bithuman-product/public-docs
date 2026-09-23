---
title: "iOS API reference"
description: "The full C interface the Essence 2 product vends on Apple — every function, its arguments and its return codes, and the credential it reads — plus the Expression 2 Swift entry points, read out of the xcframework the Swift package pins, not out of a source tree."
section: sdk
group: "Reference"
order: 82
type: reference
slug: sdk/apple-api
label: "Apple API"
---

The [iOS SDK](/sdk/apple) page carries the calls a working app makes. This page is
the full list.

Everything below was read on **2026-09-22** from the `essence2-v1.10.0`
xcframework's shipped `Headers/be_essence2.h`, which is byte-identical in all
three slices (`ios-arm64`, `ios-arm64-simulator`, `macos-arm64`), and the
package manifest at tag `v2.14.0`. `v2.14.1` (2026-09-23) pins the same engine,
so the C interface is unchanged; what moved is in
[What each product needs at link](#what-each-product-needs-at-link).

## Products

| Product | Module you import | What it is |
|---|---|---|
| `Expression2` | `Expression2` | the Expression 2 engine, pre-compiled, with a Swift API |
| `Essence2` | `Essence2`, or `CLibEssence2` | the Essence 2 engine as a static C library, plus the ONNX Runtime build its audio head needs at link |
| `bitHumanKit` | `bitHumanKit` | the on-device voice agent: recognition, a language model, speech, avatar and renderer views |
| `BithumanEngineProtocol` | `BithumanEngineProtocol` | the source-only common engine interface |

All four publish `ios-arm64`, `ios-arm64-simulator` and `macos-arm64`. Every
simulator slice is **arm64 only**.

Two combinations fail to link, and both are quiet until an app's final link:

- `Expression2` **+** the `BithumanEngineProtocol` product — `Expression2`
  already carries a binary copy, so the module arrives twice.
- A Swift module of your own also named `Essence2`.

`Expression2` **+** `Essence2` in one app is supported from `2.14.0`, and fails
below it with 112 duplicate symbols. In a **Mac app** built with Xcode, use
`2.14.1` or newer: below it Xcode's validation refuses the macOS frameworks
(`… since the platform does not use shallow bundles`).

### What each product needs at link

**From `2.14.1`, none of them asks anything of your target.** `Essence2` is a
static C library, so it cannot declare the Apple libraries it calls; from
`2.14.1` the product carries them itself. On `2.14.0` and earlier an app that
attaches it compiles and then fails its final link unless you add:

```swift
linkerSettings: [   // only below 2.14.1
    .linkedLibrary("c++"),
    .linkedFramework("VideoToolbox"),
    .linkedFramework("Accelerate"),
    .linkedFramework("CoreML"),
]
```

All four are required. Measured 2026-09-22 on macOS 26.5 with Xcode 26.5,
against the artifacts `from: "2.14.0"` resolves, by dropping each one from a
working link: without `libc++` 316 symbols are undefined, without
`VideoToolbox` 5 (`_VTDecompressionSession*`), without `Accelerate` 27
(`_BNNSFilter*` and the BLAS/LAPACK `$NEWLAPACK` entry points), without
`CoreML` 5 (`_OBJC_CLASS_$_ML*`). With all four a plain SwiftPM executable
calling `be_essence2_quiesce_all()` links and runs. Metal and its graph
framework need no entry of their own — they arrive through CoreML and
Accelerate.

Every `Essence2` link also prints `ld: warning: Could not find or use
auto-linked framework 'CoreAudioTypes'`. That name is a linker option baked
into the Essence 2 static library and is not a standalone framework on any current Apple
platform; the link succeeds and there is nothing to add.

`Expression2`, `bitHumanKit` and `BithumanEngineProtocol` are Swift modules and
record their own dependencies — you add nothing. More detail, with the Xcode
equivalent, is on the [Apple SDK page](/sdk/apple#what-essence-2-needs-at-link).

## Expression 2 — Swift

```swift
import Expression2

// Opens the .imx container and the shared engine container directly.
// stagingDir is a writable directory the engine unpacks members into once.
static func Expression2Engine.create(
    avatarContainer: URL,
    sharedEngineContainer: URL,
    stagingDir: URL) throws -> Expression2Engine

// The older entry point, for a container you have already unpacked yourself.
static func Expression2Engine.create(
    modelPath: URL,
    sharedEngineDir: URL) throws -> Expression2Engine

func feed(_ samples: [Float])          // 16 kHz mono PCM
func flushTail()                       // end of an utterance
func pull() -> ([UInt8], Int)?         // BGR888, width * height * 3 — nil until ready

var width: Int
var height: Int
```

`pull()` returns `nil` while generation is still running; it never blocks and
never renders on the calling thread, so poll rather than spin.

The module is `Expression2` and the type is `Expression2Engine`. They are
deliberately not the same name — the distribution interface cannot be verified
if they are.

## Essence 2 — the C interface

`Essence2` vends **17** `be_essence2_*` functions. Frames are tightly packed
`height * width * 3` RGB `uint8`. Audio is 16 kHz mono `int16`. `push_audio`,
`frames_available` and `pull_frame` never block.

### Lifecycle

```c
// Create a runtime from the .imx the download endpoint serves.
// motion_dir: NULL uses the default cache path. chunk: accepted and ignored.
// Returns 0, or -1 bad argument, -2 the bundle could not be opened,
// -3 metering refused the session.
int32_t be_essence2_create(const char* lab_path, const char* motion_dir,
                           int32_t chunk, be_essence2_handle* out_handle);

// 1 once warm-up has finished and speech frames can flow, 0 while idle-only.
// create() returns fast with the identity loaded; the heavy model compile runs
// on a background thread, and push_audio is dropped until this returns 1.
int32_t be_essence2_is_ready(be_essence2_handle handle);

// Release one runtime. Returns immediately; a background thread keeps the
// engine alive until its work has drained, so destroy never frees state
// underneath an in-flight evaluation.
void be_essence2_destroy(be_essence2_handle handle);

// Stop EVERY live engine and block until their background GPU work has
// drained, bounded by timeout_ms in total. Returns how many were stopped.
int32_t be_essence2_quiesce_all(int32_t timeout_ms);
```

> **Warning** **Call `be_essence2_quiesce_all()` from `applicationWillTerminate`,
> before process exit.** Exiting with a GPU evaluation or a Metal completion
> handler still in flight crashes in `__cxa_finalize`. The session's final
> billing beat is flushed on the same background thread, so skipping this call
> also drops it.

### Audio and frames

```c
// Push 16 kHz mono int16 audio. Returns 0, or -2 when NOTHING was queued
// (the audio ring is full, or the engine is not ready): pull frames, then
// push the same samples again.
int32_t be_essence2_push_audio(be_essence2_handle handle,
                               const int16_t* samples, int32_t count);

// How many finished frames are ready to pull.
int32_t be_essence2_frames_available(be_essence2_handle handle);

// Pop the oldest queued frame into `out`. Returns bytes written, 0 if none is
// ready or `out` is too small, or -3 once metering has refused the session —
// after -3 no frame will follow and the engine should be destroyed.
int32_t be_essence2_pull_frame(be_essence2_handle handle,
                               uint8_t* out, int32_t capacity);

// Frame geometry for the current mode. Size pull buffers for the full canvas
// and infer per-frame dimensions from pull_frame's returned byte count.
void be_essence2_get_info(be_essence2_handle handle,
                          int32_t* width, int32_t* height);

// Emit the next looping idle frame. Returns bytes written, 0 when there is
// nothing this tick or `out` is too small, or -3 once metering has refused.
int32_t be_essence2_idle_frame(be_essence2_handle handle,
                               uint8_t* out, int32_t capacity);

// Drop queued audio and frames and reset streaming state — this is barge-in.
void be_essence2_reset(be_essence2_handle handle);
```

**A `0` from `be_essence2_idle_frame` means keep showing the frame you already
have.** It never means "show something else". Substituting a frame of your own
here — the identity's first frame, a placeholder — splices a visible jump into
the middle of the motion on every interruption.

### Display modes

```c
#define BE_ESSENCE2_MODE_FULL 0   // the whole assembled canvas
#define BE_ESSENCE2_MODE_HEAD 1   // the square talking-head frame only (cheap)

// Switch between them on a running engine. Returns 0, -1 bad handle,
// -2 bad mode. Frames already queued drain at their original dimensions.
int32_t be_essence2_set_mode(be_essence2_handle handle, int32_t mode);
```

The engine starts in `FULL`. Switching `FULL → HEAD` happens immediately at a
frame boundary, so a mid-utterance switch keeps its lip sync; `HEAD → FULL`
resumes the full canvas at once and generated frames rejoin shortly after. A
request made before the engine is ready is recorded and applied at warm-up.

### Status and counters

```c
// Did this engine's own runtime fail? Returns 0 when nothing has failed, -1
// when the engine stopped rather than hand back silence. `reason` (optional)
// receives the runtime's own status message; `failures` (optional) receives
// the count this session, including failures that cost no delivered frame.
int32_t be_essence2_render_status(be_essence2_handle handle, char* reason,
                                  int32_t reasonlen, int64_t* failures);

// Monotonic count of GENERATED (speech) frames returned by pull_frame. Read
// the per-pull delta to tell a speech frame from an idle one.
int32_t be_essence2_pulled_speech_frames(be_essence2_handle handle);

// Monotonic count of display slots skipped by mid-utterance recovery, when
// sustained host load drives frame production below the display rate.
int32_t be_essence2_reanchor_slots(be_essence2_handle handle);

// Monotonic sum of the utterance-onset offsets the playout anchor skipped.
int32_t be_essence2_anchor_slots(be_essence2_handle handle);

// Playout anchor on/off. Returns 0, or -1 bad handle.
int32_t be_essence2_set_playout_anchor(be_essence2_handle handle, int32_t on);
```

`be_essence2_render_status` exists because a dead runtime used to reach the
caller as an *absence*: `create` returned 0, `is_ready` never went true, and
`pull_frame` handed back idle frames forever — a face that looks alive and will
never speak. Poll it if your app must tell that state from a quiet user.

**The playout anchor is off by default, and should stay off unless your speaker
plays audio the moment it arrives.** With it on, each utterance joins near the
live audio position instead of replaying the lead the engine renders ahead. If
your app holds audio back until the first frame is displayed, leave it off.

## Metering and credentials

```c
// Set the API secret this process's LATER sessions are billed to. Pass NULL to
// clear it. Optional: an app that sets BITHUMAN_API_SECRET in its environment
// need not call this. Returns 0.
int32_t be_essence2_set_api_secret(const char* api_secret);
```

The credential is taken from `be_essence2_set_api_secret()` if it was called,
otherwise from the environment variable `BITHUMAN_API_SECRET` — your API
secret. essence2-v1.10.0 does not read BITHUMAN_API_KEY, the deprecated alias.

★ **The header's own comment is older than the engine it ships in.** It says a
missing credential renders unmetered and that `be_essence2_create` returns `-3`
only under `BITHUMAN_METER_ENFORCE=1`. The shipped `essence2-v1.10.0` refuses at
create instead. Measured 2026-09-23 in a new Mac app:

| Situation | What happens |
|---|---|
| No credential | `be_essence2_create` returns **`-3`**; stderr: `refusing to serve: no credential was supplied, so this render cannot be attributed to an account` |
| A credential the service **rejects** at start (401 / 402 / 403) | `be_essence2_create` returns **`-3`**; stderr: `refusing to serve: the API secret was rejected — revoked, or from another environment. (401)` |
| A credential, but the endpoint cannot be reached | the session **starts** and stderr says `could not reach …/v1/auth/validate … PROCEEDING`; beats are retried in the background |
| A credential the service starts rejecting mid-session | renders for a **300-second grace** behind a countdown while it is re-checked; still rejected at 300 s, `pull_frame` and `idle_frame` return `-3` from then on and the engine should be destroyed |

Rates are priced by the service, not by the library — [pricing](/guides/pricing)
is the authority.

## The older bundle format

The header's own comment above `be_essence2_create` still describes a
bundle-*directory* format. The shipped engine refuses it and says so. Pass the
`.imx` file exactly as the download endpoint serves it. Those older spellings
are legacy names kept for compatibility —
[what the names mean](/concepts/avatars-imx#the-engine-value-is-a-legacy-name).

## See also

- [Apple SDK](/sdk/apple) — install, a worked minimal app, device floors, and the Mac path
- [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2) — a complete
  app, every file printed
- [Android API reference](/sdk/android-api) — the same surface on the handsets
- [Performance](/performance) — measured frame rates for every platform
