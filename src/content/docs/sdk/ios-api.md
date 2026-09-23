---
title: "Apple API reference"
description: "Every entry point in the Swift package: the Expression2 Swift API, the Essence2 C interface, credentials and return codes."
section: sdk
group: "Reference"
order: 82
type: reference
slug: sdk/apple-api
label: "Apple API"
---

Covers the Swift package at the version on [Downloads & versions](/downloads). How to use these calls in an app is on [Apple](/sdk/apple).

## Products

| Product | Import | What it is |
|---|---|---|
| `Expression2` | `Expression2` | the Expression 2 engine, Swift API |
| `Essence2` | `Essence2` (or `CLibEssence2`) | the Essence 2 engine, C interface |
| `bitHumanKit` | `bitHumanKit` | the on-device voice agent |
| `BithumanEngineProtocol` | `BithumanEngineProtocol` | the shared engine protocol. `Expression2` already contains it; do not add both |

All products ship `ios-arm64`, `ios-arm64-simulator` (arm64 only) and `macos-arm64`.

## Expression 2 (Swift)

```swift
import Expression2

Expression2Credential.set(_ apiSecret: String)          // before create; else BITHUMAN_API_SECRET

static func Expression2Engine.create(
    avatarContainer: URL,          // the .imx you downloaded
    sharedEngineContainer: URL,    // the shared .engine file
    stagingDir: URL) throws -> Expression2Engine

static func Expression2Engine.create(   // for containers you already unpacked
    modelPath: URL,
    sharedEngineDir: URL) throws -> Expression2Engine

func feed(_ samples: [Float])            // 16 kHz mono PCM
func flushTail()                         // end of an utterance
func pull() -> ([UInt8], Int)?           // BGR, width * height * 3; nil until a frame is ready
var idle: [UInt8]?                       // the next idle frame
func resetState(clearFrames: Bool)       // interrupt: drop queued audio and frames
var width: Int
var height: Int
```

`create` throws `Expression2LoadError.meteringRefused` when the API secret is missing or rejected, or when the service cannot be reached at the start; `meteringRefusal` carries the message. `pull()` never blocks; poll it.

## Essence 2 (C)

Audio is 16 kHz mono `int16`. Frames are packed `height * width * 3` RGB bytes. Nothing blocks except `be_essence2_quiesce_all`.

### Credentials

| Function | Purpose |
|---|---|
| `int32_t be_essence2_set_api_secret(const char* secret)` | Sets the API secret for later sessions (`NULL` clears it). Without it the engine reads `BITHUMAN_API_SECRET`. Swift: `Essence2Credential.set(_:)` |

### Lifecycle

| Function | Purpose | Returns |
|---|---|---|
| `be_essence2_create(const char* imx_path, const char* motion_dir, int32_t chunk, be_essence2_handle* out)` | Opens an avatar. Pass `NULL` and `0` for the last-but-one arguments | `0`; `-1` bad argument; `-2` the file could not be opened; `-3` the session was refused (no secret, rejected secret, or no network at the start) |
| `be_essence2_is_ready(h)` | Warm-up finished; speech frames can flow | `1` or `0` |
| `be_essence2_destroy(h)` | Releases one engine; background work drains on its own | — |
| `be_essence2_quiesce_all(int32_t timeout_ms)` | Stops every engine and waits for GPU work. Call from `applicationWillTerminate` | engines stopped |

### Audio and frames

| Function | Purpose | Returns |
|---|---|---|
| `be_essence2_push_audio(h, const int16_t* samples, int32_t count)` | Queues speech | `0`; `-2` nothing queued (pull frames, then push again) |
| `be_essence2_frames_available(h)` | Frames ready to pull | count |
| `be_essence2_pull_frame(h, uint8_t* out, int32_t capacity)` | Takes the oldest frame | bytes written; `0` none ready; `-3` the session was refused (destroy the engine) |
| `be_essence2_get_info(h, int32_t* width, int32_t* height)` | Frame size for the current mode | — |
| `be_essence2_idle_frame(h, uint8_t* out, int32_t capacity)` | Next idle frame | bytes written; `0` keep the current frame; `-3` refused |
| `be_essence2_reset(h)` | Interrupt: drops queued audio and frames | — |

### Display and status

| Function | Purpose | Returns |
|---|---|---|
| `be_essence2_set_mode(h, int32_t mode)` | `BE_ESSENCE2_MODE_FULL` (0, default) or `BE_ESSENCE2_MODE_HEAD` (1, the square head frame) | `0`; `-1` bad handle; `-2` bad mode |
| `be_essence2_render_status(h, char* reason, int32_t len, int64_t* failures)` | Whether the engine's runtime failed | `0` healthy; `-1` failed, with `reason` |
| `be_essence2_pulled_speech_frames(h)` | Speech frames returned so far (tells speech from idle) | count |
| `be_essence2_set_playout_anchor(h, int32_t on)` | Start each reply at the live audio position. Leave off if your app holds audio until the first frame | `0`; `-1` bad handle |
| `be_essence2_reanchor_slots(h)`, `be_essence2_anchor_slots(h)` | Counters for frames skipped to keep sync under load | count |

## Sessions and billing

A session checks the API secret when it starts and reports talking time; idle time is free. If the network drops after the secret is accepted, frames continue for 5 minutes of rendered video, then `pull_frame` and `idle_frame` return `-3` (Essence 2) or `pull()` returns `nil` (Expression 2) until the connection returns. A secret rejected mid-session is final: destroy the engine. Prices are on [pricing](/guides/pricing).
