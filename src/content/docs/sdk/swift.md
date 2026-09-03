---
title: "Swift SDK"
description: "On-device, real-time, lip-synced avatars for iOS, iPadOS, and macOS. Apple Silicon only. Preview maturity."
section: sdk
group: "Languages"
order: 11
---

## Overview

On Apple platforms, bitHuman ships as **`bitHumanKit`** — a single SwiftPM
package that drops a real-time voice agent, with an optional lip-synced avatar,
into your Mac, iPad, or iPhone app. The umbrella framework carries two
on-device engines:

- **Expression** — animates any portrait image at runtime (speech encoder →
  animator → face decoder, through CoreML on Apple Silicon). Home of `VoiceChat` /
  `VoiceChatConfig` / `AvatarConfig`.
- **Essence** — an `.imx` avatar runtime that renders a pre-built avatar (audio
  in, composed BGR frames out). Reached via `Bithuman.create(modelPath:)`.
  (This page used to call it "the portable `libessence` C++ runtime". It is not:
  the published `bitHumanKit.xcframework` binary is a static archive of 28
  objects — `bitHumanKit.o`, MLX, HuggingFace, Tokenizers, Crypto, yyjson — and
  `libessence` is not among them.)

Audio in (16 kHz mono PCM), `CGImage` / BGR frames out at 25 FPS. All inference
runs **on-device**; a once-per-minute billing heartbeat meters avatar mode
(audio-only is unmetered).

> **Maturity** This rail is **preview**, not GA. The package vends three
> products: **`bitHumanKit`** (`import bitHumanKit`), the binary umbrella;
> **`Expression2`** (`import Expression2`), the second-generation avatar engine,
> new in **v2.5.0**; and `BithumanEngineProtocol`, a source-only Layer-0 engine
> interface. The older standalone Layer-1 products (`Expression`, `Bithuman`) are
> **not** published — naming one fails with
> `product 'Expression' ... not found in package 'homebrew-bithuman'`, rc 1.
> Note **when** it fails: `swift package resolve` returns **0** on a manifest
> naming `Expression`, because resolve settles the dependency graph and does not
> check product names. The failure lands on `swift build`. If you are scripting a
> preflight, resolve alone will pass you through.

> **Which second-generation engines are on this rail.**
> [`expression-2`](/concepts/expression-2) **is**, as of **v2.5.0** — see
> [Expression 2 on-device](#expression-2-on-device) below, including what that
> release does and does not include.
> [`essence-2`](/concepts/essence-2) **is not**: it is not a SwiftPM product and
> it is not bundled inside `bitHumanKit`. That is measured against the shipped
> binary, not assumed — `strings -a` on the `ios-arm64` slice of
> `bitHumanKit.xcframework` @ `v2.4.0` counts `essence` **0**, `libessence`
> **0**, `tessera` **0**, against `ImxContainer` **141** and `mlx` **104937** in
> the same read, and its public interface declares no Essence 2 type.
> [`essence-2-max`](/concepts/essence-2-max) is cloud-only by
> design. To reach Essence 2 from an Apple app today, call the
> [REST API](/api/overview) or join a [LiveKit](/sdk/livekit) session — or, on a
> Mac specifically, drive the Python wheel: see
> [Essence 2 on a Mac, without Swift](#essence-2-on-a-mac-without-swift).
> Essence 2 **has** rendered on an iPhone, in a lab, and
> [what that proved and what it did not](#essence-2-on-iphone-proven-not-shipped)
> is written out below rather than left as a roadmap hint.

> **Before you open Xcode, preflight the package from any machine.**
> [Apple — check before you ship](/examples/apple-swiftpm-check) resolves the
> manifest at the tag you would pin, fetches every `binaryTarget` and checks its
> sha256 against the pinned checksum, and shows you the two control arms that
> fail. It takes about a minute and it is the difference between "SwiftPM is
> broken" and "I pinned the wrong number".

## Install

In Xcode: **File → Add Package Dependencies…** → paste the package URL:

```
https://github.com/bithuman-product/homebrew-bithuman.git
```

Pick **2.5.1** ("Up to Next Major Version" from 2.5.1) and attach the product
you want — **`bitHumanKit`** for the umbrella, **`Expression2`** for the
second-generation engine alone. Or in `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git",
         from: "2.5.1")
```

> **2.5.1 is a manifest correction and downloads nothing new.** Every
> `binaryTarget` URL and checksum is byte-identical to 2.5.0 — 45 code lines in,
> 45 code lines out. What changed is the manifest's own commentary, which had
> gone false in two ways worth knowing about if you read it in Xcode: it recorded
> that the umbrella does **not** contain `libessence` and then, ninety lines
> lower, that the umbrella "re-exports both engines"; and it told you to
> `import Expression` / `import Bithuman` for "the lower-level engine products",
> neither of which this package has ever vended. Asking for one is not a
> deprecation warning, it is a build failure —
> `product 'Expression' ... not found in package 'homebrew-bithuman'`, rc 1.
> `Bithuman` is a **type** vended by `bitHumanKit`, not a module you can import.
> If you are already on `from: "2.5.0"` you pick 2.5.1 up automatically and
> nothing about your build changes.

> **One package, two release tags — by design.** `2.5.0` is the version you pin;
> it is the manifest that declares every product. The umbrella's binary still
> downloads from the **`v2.4.0`** release and the Expression 2 binaries from
> **`v2.5.0`**, because a single shared tag would have re-pointed
> `bitHumanKit.xcframework.zip` at a release that does not carry it — a hard 404
> for every existing consumer. SwiftPM reads absolute asset URLs out of the
> manifest it resolves, so the assets do not have to live on the resolved tag.

> **Do not pin `0.8.x` here.** This repo has no `0.8.2` tag, and no `v0.x` tag
> carries a `Package.swift` — those tags hold Homebrew formula files. Resolving
> `from: "0.8.1"` fails with
> `error: the package manifest at '/Package.swift' cannot be accessed`. The
> `0.8.x` numbers belong to the retired `bithuman-sdk-public` repo, archived when
> the SwiftPM distribution moved here.
>
> **And the old URL still works, which is the part that can fool you.**
> `bithuman-product/bithuman-sdk-public` has not been deleted: it 301-redirects
> to `bithuman-archive/bithuman-sdk-public`, which is public and flagged
> `archived: true`. A consumer pinned to that URL at `from: "0.8.1"` resolves —
> SwiftPM picks tag `0.8.2` — and the binary it pins is not stale: it is the
> **same 55,588,107 bytes, sha256 `5c536e37…e9db`**, as the umbrella this repo
> ships at `v2.4.0`. So nothing breaks and nothing warns you. What you lose is
> everything added since: that manifest vends only `bitHumanKit`, so no
> `Expression2`, no `BithumanEngineProtocol`, and no future release, because the
> repo is frozen. Move the URL, not just the version.

The package wraps a pre-compiled `bitHumanKit.xcframework`; every third-party
dependency (MLX, HuggingFace, Tokenizers, …) is statically linked, so consumers
have **zero transitive Swift Package dependencies**. Just `import bitHumanKit`.

Auth: export `BITHUMAN_API_KEY` or set `VoiceChatConfig.apiKey` before
starting avatar mode. Get a key at
[Developer → API Keys](https://www.bithuman.ai/developer/api-keys). Audio-only voice
runs keyless and unmetered.

> **Note** The Swift SDK reads **`BITHUMAN_API_KEY`**; every other surface
> (Python, CLI, REST API) reads **`BITHUMAN_API_SECRET`**. Same value, two
> names — export both if you move between rails.

## Quick start: voice agent

The highest-level surface is `VoiceChat` — STT, LLM, and TTS all on-device.
No API key needed without an avatar:

```swift
import bitHumanKit

var config = VoiceChatConfig()
config.localeIdentifier = "en-US"
config.systemPrompt = "You are a helpful assistant. One sentence per turn."

let chat = VoiceChat(config: config)
try await chat.start()
// Speak into the mic. The agent listens, thinks, and replies aloud.
```

Add the lip-synced avatar by pointing the config at the Expression weights and
a portrait, and supplying your key:

```swift
import bitHumanKit

let weights = try await ExpressionWeights.ensureAvailable()  // ~1.6 GB, cached

var config = VoiceChatConfig()
config.avatar = AvatarConfig(modelPath: weights, portraitPath: portraitURL)
config.apiKey = ProcessInfo.processInfo.environment["BITHUMAN_API_KEY"]

let chat = VoiceChat(config: config)
try await chat.start()   // throws .missingAPIKey / .authenticationFailed
```

## The Essence runtime

For a pre-built `.imx` avatar (branded characters, 720p+, lowest credit rate),
drive the runtime directly — push PCM in, drain frames out:

```swift
import bitHumanKit
import CoreGraphics

let result = try Bithuman.create(modelPath: modelURL)
let runtime = result.bithuman        // result.staticIdleImage is the rest pose
try await runtime.start()

// Push audio as it arrives — 24 kHz for playback, 16 kHz for the encoder.
try await runtime.pushAudio(audio24k: samples24, audio16k: samples16)

// Drain rendered chunks; each carries its frames and the audio they pair with.
while let chunk = runtime.tryDequeueChunk() {
    let frames: [CGImage] = chunk.frames   // 25 FPS
    // hand the frames to your view layer
}

await runtime.interrupt()            // at end-of-utterance
await runtime.shutdown()
```

This is the Apple expression of the [audio-streaming push/drain
loop](/concepts/audio-streaming). The entry point is `Bithuman.create` — there
is no `createRuntime` on the published module. Verified to compile against
`bitHumanKit` 2.4.0 with Xcode 26.5.

## Expression 2 on-device

**New in v2.5.0.** [`expression-2`](/concepts/expression-2) is now a SwiftPM
product of its own — the first second-generation engine on this rail. It is a
pure Swift + CoreML talking head; Apple Silicon only, `macos-arm64`,
`ios-arm64`, `ios-arm64-simulator`.

**The `ios-arm64` slice is real, and it has rendered on an iPhone.** This page
used to describe only macOS, which read as if iOS were a build target nobody
had exercised. It has been: a consumer app declaring `Expression2` as a SwiftPM
binary target, using only the public API, selected the `ios-arm64` slice and
rendered **117 frames at 416×720 on an iPhone 15 running iOS 26.6.1** — every
frame distinct, full 256-level picture, with a forced-black control arm going
red beside it. The same engine on the same phone then sustained **36,021 frames
— 1,801.6 s of speech in 338.01 s of wall clock, 106.57 fps (RTF 0.19)** at
100 % talk duty in one process, with the worst ten-second bucket of that run
still at 99.90 fps. CoreML's own per-operation compute plan for that run
placed the work on the **Neural Engine** and none of it on the GPU — and for
the per-identity decoder the GPU was *eligible* and CoreML chose the Neural
Engine anyway.

**What that does and does not buy you.** It establishes that the engine runs on
iOS silicon and is fast there. It is deliberately **not** a support statement:
the SDK's own iOS support level is still **compiles-only** and has not been
promoted, those runs used development provisioning rather than a distribution
profile, and — the part that actually blocks you — **there is still no
published per-identity model bundle**, so an app that resolves this product on
an iPhone gets the same `isReady=false` described below. Treat iOS as
proven-capable and unshipped, not as ready to build a product on.

```swift
.product(name: "Expression2", package: "homebrew-bithuman")
```

```swift
import Expression2

let engine = Expression2Engine()
engine.warmUp()
engine.feed(samples)                       // [Float] PCM
while let (frame, speech) = engine.pull() {
    // frame: [UInt8], the composed image; engine.width x engine.height
}
```

> **Read this before you plan around it — `Expression2` ships the engine, not a
> runnable avatar.** `Expression2Engine()` takes no model path. The engine looks
> for a per-identity CoreML bundle as a **directory of `.mlpackage` members** in
> `$BITHUMAN_EXPRESSION2_DIR` or in your app bundle, and **`isReady` stays
> `false` until it finds one**. No bundle in that form is published, so
> resolving this product does not by itself get you a rendering avatar. On a
> clean machine the engine constructs and reports `isReady=false` — that is the
> expected result today, not a misconfiguration.
>
> **How you get a bundle: ask us — there is no self-serve path.** No download
> page or CLI command hands you one in the layout this product reads, and it is
> not gated behind a plan you can buy. Email
> [hello@bithuman.ai](mailto:hello@bithuman.ai) with the identity you want.
>
> **What the download endpoint gives you instead, stated precisely.** For an
> `expression-2` agent,
> [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
> returns a `<code>.avatar`. That file is **not** empty of CoreML: measured on a
> downloaded one, it is an `IMX\0` v2 container whose members include
> `dec_p2_v3_all.mlpackage`, `audiotokenizer_cpuAndNE.mlpackage` and
> `student_v4_forward_frame_cpuAndNE.mlpackage` — and `dec_p2_v3_all` is exactly
> the member name the shipped `Expression2.xcframework` (macos-arm64, v2.5.0)
> carries in its strings. **What is missing is not the weights, it is a
> supported way to hand them to this product**: the engine reads a directory,
> the artifact is a packed container, and no unpacking route is published or
> supported. Do not build on prising one open — there is no contract behind it,
> and nothing about that file's layout is promised to stay put.
>
> **An `.imx` is definitely not the missing piece.** `bithuman pull <code>` on
> an Essence agent returns an `.imx` for the Essence runtime. `Expression2`
> cannot read one: measured against the same xcframework, `strings` finds
> **zero** occurrences of `imx`. Pointing `$BITHUMAN_EXPRESSION2_DIR` at an
> unpacked `.imx` will not start the engine.

> **Depend on `Expression2` alone.** Adding both `Expression2` and the
> `BithumanEngineProtocol` product pulls the Layer-0 module in twice and fails to
> link.

## Compute units are a measured choice

**The hardware plane is called Apple, not "ANE".** Which silicon unit runs a
graph is a per-model decision made by measurement, and the answer is genuinely
different for different graphs and different hosts — so naming the plane after
one unit describes it wrongly. Apple's own API identifiers are a separate
matter: `MLComputeUnits.cpuAndNeuralEngine`, `.cpuAndGPU`, `cpuAndNE` are
**Apple's** spellings and keep them. Ours is *Apple*; theirs is theirs.

`Expression2` exposes the choice per graph through three environment variables.
Measured against the shipped `Expression2.xcframework` at v2.5.0 — the exact
asset the manifest pins —
[transcript](/examples/apple-swiftpm-check#check-3--what-is-actually-inside-the-shipped-expression2-binary):

| Variable | Selects the compute units for | Engine default |
|---|---|---|
| `EXPRESSION2_W2V_CU` | the 46 MB speech front-end | `cpuAndNE` |
| `EXPRESSION2_ATOK_CU` | the audio tokenizer | `cpuAndNE` |
| `EXPRESSION2_STUDENT_CU` | the per-frame student | `cpuAndNE` |

```bash
export EXPRESSION2_W2V_CU=cpuOnly     # tokens in the v2.5.0 binary: cpuAndNE | cpuOnly
```

Three things worth knowing before you tune any of these:

- **`cpuAndNE` and `cpuOnly` are the only compute-unit tokens the published
  v2.5.0 binary carries.** `cpuAndGPU` does not appear in it. On device the
  Neural Engine really does carry this engine: on a real iPhone 15 run, 577 of
  611 operations landed there.
- **Do not copy our server's settings onto a device.** Our own Apple serve host
  runs a *different* mix — the per-frame work on the Metal GPU, the audio
  tokenizer on the Neural Engine, and the speech front-end on `cpuOnly` since
  2026-09-02. That last one is not a latency win: the front-end is the 46 MB
  member and `ANECompilerService` serialises machine-wide, so cold session
  activations queued behind each other. Moving it to `cpuOnly` filled all 18
  concurrent seats in **11.1 s** at 29.7 fps per session, against a measured
  **425 s for a single** `cpuAndNE` load. That is a **concurrency** fix on a host
  serving 18 sessions, and it has no bearing on one app on one phone.
- **A different engine gets a different answer again.** Essence 2's Apple
  director is FP32 and reaches the Neural Engine on 0% of its operations; it
  serves on `cpuAndGPU`, where it measured **2.2× faster** than `cpuAndNE` *and*
  closer to the reference picture. Three Apple paths, three different units, one
  plane name.

### Names you will see that we no longer write

The engine predates the current naming and its own strings still carry the old
one. You need these to grep your logs, so here they are:

| You will meet | Current name | Notes |
|---|---|---|
| `[embody]` log prefix | Expression 2 | every engine log line; grep for this, not `[expression2]` |
| `BITHUMAN_EMBODY_DIR` | `BITHUMAN_EXPRESSION2_DIR` | both strings are in the binary — **set the `EXPRESSION2` one** |
| `w2v_frontend_cpuAndNE.mlpackage` | (unchanged) | a CoreML member filename; `cpuAndNE` here is Apple's token, frozen into the name |
| `lible_core.dylib` | Essence 2 engine | inside the Python wheel, below |

`embody` and `elevate` are [deprecated names](/concepts/models-v2). They are
shown here because you have to type or grep them; they are not names to write.

## Essence 2 on a Mac, without Swift

`Expression2` is the second-generation engine on the SwiftPM rail, and
[Essence 2](/concepts/essence-2) is not on it at all. But on **macOS**
specifically there is a self-serve path that does not involve Xcode: the
`bithuman` Python wheel.

```bash
pip install "bithuman>=2.10"
```

**Apple Silicon, macOS 14 or newer.** The current wheels are
`macosx_14_0_arm64` for CPython 3.10–3.14 (plus manylinux). Inspecting the
resolved macOS wheel shows the engine and its runtime travelling together:

```text
resolved: bithuman-2.10.0-cp312-cp312-macosx_14_0_arm64.whl
engines inside it:
  bithuman/_core.cpython-312-darwin.so                   2338.9 KB
  bithuman/.dylibs/libonnxruntime.1.27.0.dylib          18786.3 KB
  bithuman/lib/lible_core.dylib                           814.9 KB
```

`lible_core.dylib` is the Essence 2 engine under a retired spelling, and the
wheel vendors its own ONNX Runtime beside it rather than using whatever is on
the machine.

> **On an Intel Mac this command succeeds and gives you the wrong thing.** There
> is no macOS x86_64 wheel for 2.x, so pip silently resolves **1.10.7** — a
> different generation, with none of those libraries in it — and exits 0. Pin
> `bithuman>=2.10` so the resolver has to say no out loud. The
> [transcript of both arms](/examples/apple-swiftpm-check#check-2--which-bithuman-wheel-will-pip-pick-on-a-mac)
> shows exactly what each one prints.

**UNVERIFIED on macOS.** The command above was resolved, downloaded and
inspected on Linux; the macOS wheel was **not executed**, because no Mac was
involved in producing this page. See [Python SDK](/sdk/python) for the API once
it is installed.

## Essence 2 on iPhone: proven, not shipped

Essence 2 has rendered on an iPhone with its teeth borrowed, and it is still not
something you can build. Both halves of that are true and the gap between them is
the honest answer to "when is Essence 2 on iOS".

**What ran.** On 2026-09-02, one process on an iPhone 15 (iOS 26.6.1) rendered
Essence 2 and composed the teeth borrow inline, through the same shipped seam the
Apple runtime uses — not a replay of vectors recorded on a host. Graded against
the offline borrow reference on its own operands, in one pixel domain, no resize
and no zoom:

| Arm | L1 vs the offline borrow reference |
| --- | --- |
| On-device borrow, whole 512×512 crop | **0.002295 u8** |
| Borrow **off** (the twin, same director crops) | 0.100359 u8 |
| Gap closed | **97.71 %** — 43.7× better |
| Null control (candidate vs itself) | 0.000000 u8 — required to be exactly 0 |
| Different-operand control (frame *i* vs reference *i+1*) | 1.492498 u8 — 650× the grade |

Inside the stamped teeth window the same three arms read 0.026703 / 1.167819 /
2.978286. The borrow changed 322,097 bytes inside that window and **0 bytes
outside it**. The device's borrow-off crop is byte-identical to its pre-borrow
crop, so the only difference between the two arms is the borrow itself.

**Why that is not a lane.** It took a hand-assembled app side-loaded from a lab
host, a payload copied into the app's Documents container by `devicectl`, a
bundle trimmed to 64 target frames because the full one is killed on the device,
a recorded provenance breach in the bundle's own metadata, and a 46 MB fp16
speech front-end standing in for the 377 MB production one — which the phone
`SIGKILL`s about a second after launch. No customer traffic touched it and no
customer could reproduce it.

**And it is not real-time.** The borrow costs 11.3× throughput: 1.56 fps armed
against 17.67 fps on identical crops with the pass off — roughly 570 ms per frame
in the compositor, not in the renderer. That is RTF 16.06 against a 25 fps
target.

**What has to land before this is a product, and who owns it.**

1. **An m4 (v3) export of a tessera-carrying identity.** Everything trimmed
   above exists because the identity used is a v2 bundle that holds its whole
   frame volume resident. v3 deletes that volume and is the device format. A
   bake, owned by the model side.
2. **A co-built a2x and keypoint chain.** The GPU bake and the Apple
   re-extraction disagree by 0.0127 against a 1e-3 bar — a cross-plane keypoint
   delta, not a corrupt file. Until both come out of one source, no Apple bundle
   satisfies its own exporter's gate.
3. **Real-time.** See the 570 ms/frame above. This is a compositor problem.
4. **A passthrough counter on the shipped path.** The shipped runtime keeps its
   stream private and logs only to the console, so a shipped-path arm cannot yet
   state its own teeth verdict. A small engine change.

Until all four land, the honest label is **capability-proven, not armed**, and
the supported ways to reach Essence 2 from an Apple app remain the
[REST API](/api/overview), a [LiveKit](/sdk/livekit) session, or the Python wheel
on a Mac.

## Permissions + entitlements

`Info.plist` (all platforms):

```xml
<key>NSMicrophoneUsageDescription</key><string>Talk to your assistant.</string>
<key>NSSpeechRecognitionUsageDescription</key><string>Recognise what you say.</string>
```

Without these, mic / speech start fails silently (the OS denies and remembers).
Sandboxed Mac apps also need `com.apple.security.device.audio-input` in
`.entitlements`.

> **Warning** **The iOS increased-memory entitlement is mandatory.** Without it,
> iOS kills your app mid-conversation (~30 s into a turn) when memory exceeds the
> default ~3 GB ceiling. Request approval **before** development — Apple takes
> 1–3 business days.
>
> ```xml
> <key>com.apple.developer.kernel.increased-memory-limit</key><true/>
> <key>com.apple.developer.kernel.extended-virtual-addressing</key><true/>
> ```
>
> Request at developer.apple.com → **Account → Membership → Request Additional
> Capabilities**.

## Audio-only keyless mode

On-device voice chat (no lip-synced avatar) **needs no API key** — STT, LLM, and
TTS all run locally and audio-only mode is unmetered. You only need a key (and the
billing heartbeat fires) once you add the lip-synced avatar.

## Hardware floor

Gate this at runtime — on under-spec devices, guide people to a friendly fallback
rather than a half-loaded engine. Use `HardwareCheck.evaluate()` to branch your
SwiftUI root and show your own `UnsupportedDeviceView` for `.unsupported(reason)`.

| | Essence | Expression |
|---|---|---|
| **macOS** | M3+, macOS 26 | M3+, macOS 26 |
| **iPadOS** | iPad Pro M4+, iPadOS 26 | iPad Pro M4+, 16 GB, iPadOS 26 |
| **iPhone** | iPhone 16 Pro+ (A18 Pro) | iPhone 16 Pro+ (A18 Pro) — **preview**; on-device validation of *this* engine is in progress |

**This table grades the two `bitHumanKit` engines — Essence and Expression 1.
It is not Expression 2's floor.** The `Expression2` product is a separate
CoreML engine with its own characteristics; the iPhone measurement above was
taken on an **iPhone 15**, two generations below this table's iPhone row, so
do not read the Expression column as an Expression 2 requirement. Expression 2
has no published device floor yet, because it has no published model bundle to
gate one on.

Requires Xcode 26+ (older Xcodes reject the Swift 6 concurrency syntax).
Expression on Apple Silicon auto-spawns a `bithuman-expression-daemon`
subprocess; on unsupported hardware it raises `ExpressionModelNotSupported` — not
a crash. See [models](/concepts/models).

## Performance

Measured on an M5 MacBook Pro against the `libessence` engine (1.19.1, single
conversation). Treat them as indicative of the runtime, not as a measurement of
the shipped `bitHumanKit` binary, which does not contain `libessence`:

| Metric | Value |
|---|---|
| Per-tick mean | 1.43 ms |
| Per-tick p99 | 1.51 ms |
| Sustained (tight loop) | 698 FPS |
| Cold start | ~290 ms |
| Peak RSS | ~84 MB |
| Wrapper overhead vs raw libessence | +1.7 % |

Comfortable headroom over the 25 FPS / 40 ms tick budget.

## Troubleshooting

### Mic / speech start fails silently

Missing `Info.plist` privacy strings — the OS denies mic / speech and caches the
denial for the session.

### App killed ~30 s into a conversation (iOS)

Missing the increased-memory-limit entitlement. See the warning above — it must
be approved by Apple before it takes effect.

### Avatar disappears on re-render

When hosting `AvatarRendererView` in SwiftUI, return the **same** renderer view
instance from both `makeXxxView` and `updateXxxView`. SwiftUI rebuilds the
parent constantly; a fresh renderer each time means a vanishing avatar.

### Under-spec device shows a friendly fallback

Working as intended. Branch on `HardwareCheck.evaluate()`.

## See also

- [Apple — check before you ship](/examples/apple-swiftpm-check) — three preflights you can run from any OS, with control arms and real exit codes
- [Runnable Swift examples](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/swift) — voice, avatar, and benchmark apps
- [SDK overview](/sdk) — which SDK to pick
- [LiveKit (Apple)](/sdk/livekit) — connect a native app to a cloud-hosted avatar
- [Models](/concepts/models) — Essence vs Expression
- [CLI](/sdk/cli/overview) — no-code Mac terminal tool, same engine
