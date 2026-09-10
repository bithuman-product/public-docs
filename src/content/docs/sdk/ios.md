---
title: "iOS, iPadOS & macOS"
description: "A lip-synced avatar rendering on the iPhone you already have — one SwiftPM package, a public showcase identity, no account, no API key and no credits for the first frame. Plus the on-device voice agent, the hardware floors and what essence-2 does not do yet."
section: sdk
group: "Platforms"
order: 40
label: "iOS & iPadOS"
---

## Four steps to a frame on your iPhone

★ **The first frame costs nothing.** It needs **no bitHuman account, no API key
and no credits** — `A08CCD3871` is a bitHuman-owned public showcase identity you
fetch with `curl`. Four surfaces on this site used to tell you an iPhone frame
cost 2000 credits and a 60–100 minute wait first. That was the price of
**creating an identity of your own**, and it was never the price of a first
frame. Corrected 2026-09-10.

What it *does* need is Apple's: **Xcode 26+**, an **Apple Developer team**, and
a **physical iPhone or iPad** — the Simulator cannot run this engine.

1. **Add the package.** In Xcode, *File → Add Package Dependencies…* and paste:

   ```
   https://github.com/bithuman-product/homebrew-bithuman.git
   ```

   Attach the **`Expression2`** product. In `Package.swift` that is:

   ```swift
   .package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")
   ```

2. **Fetch the three things the engine needs** — the identity, the shared engine
   graphs the identity does not carry, and something for it to say. All three
   are anonymous `curl`s, and the `setup.sh` on the example page runs them for
   you:

   ```bash
   PUB=https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web
   curl -fLo agent.avatar "$PUB/showcase/A08CCD3871.avatar"
   curl -fLo mac-arm64.engine "$PUB/engines/expression-2/mac-arm64-1.0.0.engine"
   curl -fLo speech16k.wav \
     "https://api.bithuman.ai/v1/agent/A08CCD3871/model/download?member=demo_speech_16k.wav&model=expression-2"
   ```

   Re-measured 2026-09-10 from Linux with **no credential anywhere in the
   environment**: the identity answers `206` (198,336,868 B, `IMX\0` v2), the
   engine archive `206`, and the third `200` with 650,980 B of real 16 kHz mono
   PCM WAVE. The third one is a *member* of a public agent's bundle, which is
   why it needs no key and no text-to-speech either.

3. **Paste the app.** Every file — `Info.plist`, the Xcode settings, the whole
   of `App.swift`, the script that unpacks the container and fetches the shared
   graphs, and the `xcodebuild` line — is printed in full on
   [**Swift / iOS — a talking avatar on the iPhone you have**](/examples/swift-ios-expression2).

4. **Pick your team under Signing & Capabilities, select your iPhone, press
   Run.**

Measured on **2026-09-09** on an iPhone 15 (iPhone15,4, iOS 26.6.1), built with
Xcode 26.3: **149 frames at 416x720, all distinct, first frame 263 ms** after
the first `feed()`. **Not re-run on 2026-09-10** — this lane had no macOS build
host with the phone attached that day, so treat the 09-09 numbers as the last
measurement rather than as today's.

> **Which product for which job.** `Expression2` renders your agent's identity
> and is the rail above. `bitHumanKit` is the umbrella — a whole on-device voice
> agent, speech recognition and a language model and text-to-speech, with an
> optional avatar — and it asks for much more hardware and two Apple
> entitlements that take 1–3 business days to approve. `Essence2` builds and
> **renders on no iPhone today**; see [Essence 2 on-device](#essence-2-on-device)
> before you spend an afternoon on it.

## Install

Paste the package URL in Xcode, or write it in `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git",
         from: "2.11.0")
```

**This is the only pin on this site.** `from:` means "up to next major", so the
number is a floor, not a choice — measured 2026-09-09 it resolves **2.11.2**,
the newest 2.x tag. If a `Package.resolved` in your repo names a higher 2.x,
nothing is wrong. What each tag changed is in the
[changelog](/changelog), not here: one page with two pin instructions is how a
page starts contradicting itself.

Then attach the product you want:

| Product | `import` | What it is |
|---|---|---|
| **`Expression2`** | `import Expression2` | The [`expression-2`](/concepts/expression-2) engine alone. `macos-arm64`, `ios-arm64`, `ios-arm64-simulator`. **The rail that renders on a phone.** |
| **`bitHumanKit`** | `import bitHumanKit` | The umbrella: on-device voice agent + an `.imx` avatar runtime. `Bithuman` is a **type** it vends, not a module. |
| **`Essence2`** | `import Essence2` | The [`essence-2`](/concepts/essence-2) engine's C interface. Builds; see below for what it does not do. |
| `BithumanEngineProtocol` | — | A source-only Layer-0 interface. |

★ **Taking `Expression2` and `Essence2` in the same app does not link on a
device.** Measured on the published archives: **116 duplicate symbols, rc 1** at
an app's final link on `ios-arm64` and on `macos-arm64`, against a control arm
at rc 0 — and a Simulator arm that is **green**, which is why a
Simulator-only CI never saw it. A library target is compiled, never linked, so
`swift build` and `xcodebuild … build` are green too. The collision fires at
*your app's* final link.

The older standalone products `Expression` and `Bithuman` are **not** published;
naming one fails with `product 'Expression' … not found in package
'homebrew-bithuman'`, rc 1. Note *when*: `swift package resolve` returns **0**
on a manifest naming `Expression`, because resolve settles the dependency graph
and does not check product names. The failure lands on `swift build` — so a
resolve-only preflight passes you straight through.

The package wraps pre-compiled xcframeworks with every third-party dependency
statically linked, so you take **zero transitive Swift Package dependencies**.

> **Before you open Xcode, preflight from any machine.**
> [Apple — check before you ship](/examples/apple-swiftpm-check) resolves the
> manifest at the tag you would pin, fetches every `binaryTarget` and checks its
> sha256 against the pinned checksum, and shows you the two control arms that
> fail. It takes about a minute and it is the difference between "SwiftPM is
> broken" and "I pinned the wrong number".

**Maturity: preview.** This rail is not GA.

## Auth

Only a **metered avatar render** needs a key — not resolving the package, not
compiling, not audio-only voice chat, and not the showcase identity above.

> **The Swift SDK reads `BITHUMAN_API_KEY`; every other surface — Python, the
> CLI, the REST API — reads `BITHUMAN_API_SECRET`.** Same value, two names.
> Export both if you move between rails. Get one at
> [Developer → API Keys](https://www.bithuman.ai/developer/api-keys).

## Quick start: voice agent

The highest-level surface is `VoiceChat` — STT, LLM, and TTS all on-device.
No API key needed without an avatar:

```swift
import bitHumanKit

// `VoiceChat` is main-actor-isolated, so under Swift 6 language mode the code
// that builds one has to be too. Without `@MainActor` this is a compile error,
// not a warning: "main actor-isolated initializer 'init(config:)' cannot be
// called from outside of the actor".
@MainActor
func startVoiceAgent() async throws {
    var config = VoiceChatConfig()
    config.localeIdentifier = "en-US"
    config.systemPrompt = "You are a helpful assistant. One sentence per turn."

    let chat = VoiceChat(config: config)
    try await chat.start()
    // Speak into the mic. The agent listens, thinks, and replies aloud.
}
```

Add the lip-synced avatar by pointing the config at the Expression weights and
a portrait, and supplying your key:

```swift
import Foundation      // ProcessInfo, URL — bitHumanKit does not re-export them
import bitHumanKit

@MainActor
func startVoiceAgentWithAvatar(portraitURL: URL) async throws {
    let weights = try await ExpressionWeights.ensureAvailable()  // ~1.6 GB, cached

    var config = VoiceChatConfig()
    config.avatar = AvatarConfig(modelPath: weights, portraitPath: portraitURL)
    config.apiKey = ProcessInfo.processInfo.environment["BITHUMAN_API_KEY"]

    let chat = VoiceChat(config: config)
    try await chat.start()   // throws .missingAPIKey / .authenticationFailed
}
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

**New in v2.5.0, and given a model-path API in v2.6.0.**
[`expression-2`](/concepts/expression-2) is a SwiftPM product of its own — the
first second-generation engine on this rail. It is a pure Swift + CoreML talking
head; Apple Silicon only, `macos-arm64`, `ios-arm64`, `ios-arm64-simulator`.

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
an iPhone gets the same `isReady=false` described below. *Your own* agent's
`<code>.avatar` does render on a phone, but only through the hand-staging
recipe in [what the download endpoint gives you](#what-v260-added-as-the-module-declares-it)
below — the documented one-call path does not open it.
Treat iOS as proven-capable and unshipped, not as ready to build a product on.

> **There is a complete, runnable app for this.**
> [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2)
> prints every file — the Xcode settings, `Info.plist`, the whole of
> `App.swift`, the script that fetches your model, the signing flags and the
> `xcodebuild` line — and ends with frames on a real handset. The sections below
> are the reference for the calls it makes.

```swift
.product(name: "Expression2", package: "homebrew-bithuman")
```

```swift
import Expression2

// Hand the engine an unpacked avatar directory and the shared engine directory.
let engine = try Expression2Engine.create(modelPath: avatarDirectory,
                                          sharedEngineDir: sharedEngineDirectory)
engine.feed(samples)                       // [Float] PCM, 16 kHz mono
engine.flushTail()                         // at end of utterance

// ★ Generation is ASYNCHRONOUS. `pull()` returns nil until a chunk lands, so a
// bare `while let` on the line after `feed()` drains NOTHING and your view stays
// empty — the app builds, starts, reports no error, and shows no avatar. Poll.
var idleTicks = 0
while idleTicks < 100 {                    // 100 x 50 ms with nothing = done
    var got = false
    while let (frame, speech) = engine.pull() {
        got = true
        // frame: [UInt8], BGR, engine.width * engine.height * 3 bytes
    }
    if got { idleTicks = 0 }
    else { idleTicks += 1; try await Task.sleep(nanoseconds: 50_000_000) }
}
```

Measured on an iPhone 15 (iOS 26.6.1) on 2026-09-09: the synchronous form this
snippet used to show returned **0 frames** from 7.90 s of speech and printed no
error. The polling form above returned **149 frames at 416x720, all 149
distinct**, first frame **263 ms** after the first `feed()`.

`Expression2Engine()` + `warmUp()` still works and still searches
`$BITHUMAN_EXPRESSION2_DIR` or your app bundle — nothing was removed. `create`
is the addition: it takes the location as an argument instead of making you
arrange the environment around the engine.

### What v2.6.0 added, as the module declares it

Read out of the shipped `Expression2.swiftinterface` at v2.6.0, not from the
release notes:

```swift
// Point the engine at an unpacked avatar directory.
public static func create(modelPath: URL, sharedEngineDir: URL? = nil,
                          warmSpeech: [Float]? = nil) throws -> Expression2Engine
public func load(modelPath: URL, sharedEngineDir: URL? = nil,
                 warmSpeech: [Float]? = nil) throws

// Or hand it the packed <CODE>.avatar the download endpoint gives you.
public static func create(avatarContainer: URL, sharedEngineContainer: URL? = nil,
                          sharedEngineDir: URL? = nil, stagingDir: URL,
                          warmSpeech: [Float]? = nil) throws -> Expression2Engine

// Ask what a directory is missing before you try to start.
public static var requiredAvatarMembers: [String] { get }
public static func missingMembers(avatarDir: URL, sharedEngineDir: URL? = nil) -> [String]

// Open the container yourself.
public enum Expression2Container {
    public static func isContainer(_ url: URL) -> Bool
    public static func members(of url: URL) throws -> [Member]
    public static func read(_ name: String, from url: URL) throws -> Data
    public static func readManifest(_ url: URL) throws -> Data
    @discardableResult
    public static func unpack(_ url: URL, to dir: URL) throws -> [String]
}
```

Two error types come with it, and the distinction is worth knowing before you
write a `catch`: **`Expression2ContainerError`** is about the *file* — not a
container, wrong engine's container, a legacy ZIP container, truncated,
unsupported version — while **`Expression2LoadError`** is about the *contents*:
`notAnAvatarDirectory(path:)`, `missingMembers(avatarDir:sharedEngineDir:missing:)`
and `warmUpRefused(…)`. (The v2.6.0 release notes file `notAnAvatarDirectory`
under the container error; the shipped interface puts it on the load error.
Catch the one the compiler shows you.)

> ### Corrected 2026-09-06 — `Expression2` can now be handed the file you download
>
> Until v2.6.0 this section said, correctly for the release it described:
> *"What is missing is not the weights, it is a supported way to hand them to
> this product … no unpacking route is published or supported. Do not build on
> prising one open."* **v2.6.0 published that route**, so the paragraph is
> replaced rather than softened.
>
> **What the download endpoint gives you.** For an `expression-2` agent,
> [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
> returns a `<code>.avatar`: a container whose members include
> `dec_p2_v3_all.mlpackage`, `audiotokenizer_cpuAndNE.mlpackage` and
> `student_v4_forward_frame_cpuAndNE.mlpackage` — the same member names the
> shipped `Expression2.xcframework` carries in its own strings.
>
> ★ **Corrected again 2026-09-09 — on a phone, that one call does not open it.**
> This block used to say `create(avatarContainer:…:stagingDir:)` "opens that
> container, stages the members, and starts the engine". Followed literally in a
> fresh app on an iPhone 15 (iOS 26.6.1, Xcode 26.3), against a live agent's own
> `<code>.avatar`, it does not — and **two separate things** are in the way,
> neither of which you can fix in your own code.
>
> **1. The published binary refuses every `.avatar` by member NAME, on iOS only.**
>
> ```text
> refusing member name "audiotokenizer_cpuAndNE.mlpackage/Data/com.apple.CoreML/model.mlmodel"
>   — it would write outside the destination directory
> ```
>
> That name escapes nothing. The unpacker proves containment by comparing two
> filesystem paths, and on iOS they standardize differently for the same
> directory — logged on the device, unpacking into the app's own `tmp`:
> the destination read `/var/mobile/…/stage` and the member path read
> `/private/var/mobile/…/stage/…`, so the prefix test was false. Every published
> `<code>.avatar` carries nested member names (9 of 14 on each of the other two
> live agents sampled the same day), so this refuses the artifact the endpoint
> vends. It is invisible off-device: **the same container unpacks 15/15 members
> on macOS**, against the same published 2.11.2 binary. Fixed on the SDK's `main`
> on 2026-09-09 — and **not** in any published `Expression2.xcframework`, so it
> reaches you only when that binary is rebuilt and a tap tag is cut.
>
> **2. The artifact does not carry the shared speech front-end.** The engine
> resolves three shared graphs — `Expression2Engine.sharedResolvableMembers`
> reads `student_v4_forward_frame_cpuAndNE.mlpackage`,
> `audiotokenizer_cpuAndNE.mlpackage`, `w2v_frontend_cpuAndNE.mlpackage` — and
> the download carries the first two and **not** `w2v_frontend_cpuAndNE.mlpackage`.
> With the members staged, `missingMembers(avatarDir:)` names exactly that one
> and `create` refuses:
>
> ```text
> expression-2 avatar is missing w2v_frontend_cpuAndNE.mlpackage — re-provision
> the member(s) …, or pass `sharedEngineDir:` if the shared graphs live in a
> second directory
> ```
>
> **What works today, end to end, measured on the phone.** Get the shared half
> from the CLI — a published verb that needs no login — and hand it to `create`
> as `sharedEngineDir:`, staging the avatar's members yourself:
>
> ```bash
> # once, on your Mac: the shared graphs (~91 MB). Copy the resulting
> # ~/.bithuman/engines/mac-1.0.0 directory into your app's resources.
> bithuman engine install mac
> ```
>
> ```swift
> // Stage the avatar's members by hand — `read` accepts the nested names the
> // published unpacker refuses.
> let dir = stagingDir.appendingPathComponent("avatar", isDirectory: true)
> try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
> for m in try Expression2Container.members(of: avatarContainer) {
>     let dst = dir.appendingPathComponent(m.name)
>     try FileManager.default.createDirectory(at: dst.deletingLastPathComponent(),
>                                             withIntermediateDirectories: true)
>     try Expression2Container.read(m.name, from: avatarContainer).write(to: dst)
> }
>
> let shared = Bundle.main.url(forResource: "mac-1.0.0", withExtension: nil)!
> // <none> — with the shared directory the census is complete
> print(Expression2Engine.missingMembers(avatarDir: dir, sharedEngineDir: shared))
> let engine = try Expression2Engine.create(modelPath: dir, sharedEngineDir: shared)
> ```
>
> That is the arm that rendered on an iPhone 15: engine ready in **7.2 s**
> (CoreML compile included), then **149 frames at 416x720, every one distinct**,
> from 7.90 s of 16 kHz mono speech — beside a forced-black control buffer that
> the same picture check called `FLAT_OR_BLACK` in the same run. The engine
> reports 111-127 fps generation per chunk. It is a real integration path for a
> build you control; it is **not** something to ship to customers, because step
> one copies a shared engine directory out of a CLI install by hand.
>
> **`Expression2Engine()` alone still gets you nothing.** The no-argument
> initializer searches `$BITHUMAN_EXPRESSION2_DIR` or your app bundle for a
> **directory of `.mlpackage` members** and leaves **`isReady` `false`** when it
> finds none. On a clean machine that is the expected result, not a
> misconfiguration — it is the reason `create(modelPath:)` was added.
>
> ★ **Two things are still true and still block a shipping app.** There is
> **no published per-identity bundle you can download without an agent of your
> own** — the route above starts from *your* agent's `<code>.avatar`, so it
> gets you your identity and nobody else's. And an agent whose model has never
> been generated has nothing to download. For anything beyond that, email
> [hello@bithuman.ai](mailto:hello@bithuman.ai) with the identity you want.
>
> **Check before you start, rather than catching a throw.**
> `Expression2Engine.missingMembers(avatarDir:sharedEngineDir:)` returns the
> member names a directory is short of, and `requiredAvatarMembers` is the list
> it grades against.
>
> **An `.imx` for another engine is still not the missing piece.**
> `bithuman pull <code>` on an Essence agent returns an artifact for the Essence
> runtime, and this engine refuses it by design: the shipped refusal says it
> reads its own container only and tells you to *"open it with the product its
> unified `engine` header names"*. Pointing `$BITHUMAN_EXPRESSION2_DIR` at one
> will not start the engine.

> **Depend on `Expression2` alone.** Adding both `Expression2` and the
> `BithumanEngineProtocol` product pulls the Layer-0 module in twice and fails to
> link. Attaching the `Expression2` product is also how you get
> `UnifiedModelHeader`, the third binary target v2.6.0 added — you never import
> it, but the engine's interface does, and a hand-rolled dependency on the two
> older targets fails with `no such module 'UnifiedModelHeader'`.

## Compute units are a measured choice

**We do not promise you a particular silicon unit, and you should not plan
around one.** Which unit runs the work is a per-model decision we make by
measurement, and the answer is genuinely different for different models and
different hosts. What we do promise is Apple Silicon. Apple's own API
identifiers — `MLComputeUnits.cpuAndNeuralEngine`, `.cpuAndGPU`, `cpuAndNE` —
are Apple's spellings and are used verbatim below.

`Expression2` exposes the choice per graph through three environment variables.
Measured against the shipped `Expression2.xcframework` at **v2.6.0** — the exact
asset the manifest pins, re-read 2026-09-06 —
[transcript](/examples/apple-swiftpm-check#check-3--what-is-actually-inside-the-shipped-expression2-binary):

| Variable | Selects the compute units for | Engine default |
|---|---|---|
| `EXPRESSION2_W2V_CU` | the 46 MB speech front-end | `cpuAndNE` |
| `EXPRESSION2_ATOK_CU` | the audio tokenizer | `cpuAndNE` |
| `EXPRESSION2_STUDENT_CU` | the per-frame student | `cpuAndNE` |

```bash
export EXPRESSION2_W2V_CU=cpuOnly     # tokens in the v2.6.0 binary: cpuAndNE | cpuOnly
```

Three things worth knowing before you tune any of these:

- **`cpuAndNE` and `cpuOnly` are the only compute-unit tokens the published
  v2.6.0 binary carries.** `cpuAndGPU` does not appear in it — `strings -a` on
  the `macos-arm64` slice counts `cpuAndNE` **7**, `cpuOnly` **1**, `cpuAndGPU`
  **0**, with a token in neither reading **0** as the control (re-measured
  2026-09-06; v2.5.0 read 4 / 1 / 0 on the same three). On device the
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
- **A different model gets a different answer again.** Essence 2 on Apple is
  FP32 and reaches the Neural Engine on 0% of its operations; it serves on
  `cpuAndGPU`, where it measured **2.2× faster** than `cpuAndNE` *and* closer to
  the reference picture. Three Apple paths, three different units — which is why
  the unit is ours to pick and not yours to configure.

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

## Essence 2 on-device

**`Essence2` is a product of this package as of v2.7.0 (2026-09-06), and
`import Essence2` compiles as of v2.8.0 (2026-09-07).** Until then this
section said Essence 2 was *not available in an iOS app*, with *no Swift
product and no supported way to build one*. That was true on the day it was
written and is false now, so it is replaced rather than softened.

> ### ★ Read this before you plan a feature on it: `Essence2` builds, and it does not yet render on a phone
>
> The product resolves, links and starts. **Two separate things still stop an
> iPhone app from showing an essence-2 avatar**, and neither is something you
> can work around in your own code:
>
> 1. **The model you can download is not a package this engine opens** — it is
>    the package the bitHuman cloud renders from. This applies on **every**
>    Apple target, macOS included. [Details below](#the-model-you-can-download-is-not-the-package-this-engine-opens).
> 2. **The engine refuses every iPhone below an iPhone 16 Pro, by device
>    name** — see [Hardware floor](#hardware-floor).
>
> **So today, on iPhone and iPad, treat `Essence2` as not yet consumable.** For
> an on-device avatar on a phone now, use
> [`expression-2`](#expression-2-on-device), which has rendered on an
> iPhone 15. For essence-2 on a phone now, run it as a
> [cloud session](/api/runtime-sessions). On a **Mac**, the self-serve path that works
> end to end today is the Python wheel —
> [Essence 2 on a Mac, without Swift](#essence-2-on-a-mac-without-swift).
>
> This page is the single source for the state of this rail. The package
> manifest points here rather than keeping its own copy.

```swift
// Package.swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0"),
// ...
.product(name: "Essence2", package: "homebrew-bithuman")
```

```swift
import Essence2          // v2.8.0 and later
import CLibEssence2      // the original module name — still works, same declarations
```

**What the product is.** The engine's C interface — fifteen `be_essence2_*`
functions declared in one header: `be_essence2_create`, `push_audio`,
`pull_frame`, `frames_available`, `idle_frame`, `is_ready`, `reset`, `destroy`
and the rest — with no Swift type on top. `Essence2Engine` is not vended here;
write your own wrapper over the C calls. **Two binary targets ride under the
one product** — the engine archive and an ONNX Runtime build — and both are
needed: the engine leaves the ONNX Runtime symbols undefined and they resolve
at your app's final link (the engine target alone fails at link on
`_OrtGetApiBase`). Attach the product and you get both.

**Metering.** A self-hosted Essence 2 session is billed at the published rate
([pricing](/guides/pricing)) as of `essence2-v1.3.0` (tap `v2.9.0`): call
`be_essence2_set_api_secret` once at launch (or set `BITHUMAN_API_SECRET`)
with the API secret of the account the session bills to; with no credential
the engine renders and prints `★ UNMETERED RENDER` on stderr. The engine
checks the key when a session is created and once a minute while it runs, and
`essence2-v1.4.0` (tap `v2.10.0`) applies the one rule every runtime follows
when that check does not come back clean. If the service **cannot be
reached**, the engine renders on, says so, and keeps trying — never a refusal,
however long it lasts. If the service **rejects the key** (HTTP 401, 402 or
403), the engine renders for a **grace of 300 seconds** from the first
rejection, prints a line once a minute naming the seconds left and the fix,
and re-checks the key every minute; a key accepted again clears the clock, and
a key still rejected at 300 seconds ends the session — `be_essence2_pull_frame`
and `be_essence2_idle_frame` return `-3` from then on and the engine has
stopped, so destroy it and fix the key. `BITHUMAN_METER_ENFORCE=1` makes
`be_essence2_create` return `-3` for a missing or rejected key before the
first frame instead.

**Where it builds.** iOS device, iOS simulator and macOS, all Apple Silicon:
the engine archive carries `ios-arm64`, `ios-arm64-simulator` and
`macos-arm64` slices. bitHuman's release notes for v2.8.0 record a scratch
consumer outside any bitHuman repository — cold cache, no credentials —
resolving the package at `exact: "2.8.0"`, building and running an executable
on macOS, and `xcodebuild` reporting `BUILD SUCCEEDED` for the iOS device and
the iOS simulator destinations, beside three arms that fail on purpose: a
flipped checksum digit refused at resolve, the engine target alone refused at
link, and `import Essence2` refused at `v2.7.0` with `no such module`.

**What this page verified itself on 2026-09-09, anonymously:** all **six**
binary targets the `v2.11.0` manifest declares fetch 200 and hash to exactly
the checksums it pins — `bitHumanKit`, `Expression2`,
`BithumanEngineProtocol`, `UnifiedModelHeader`, the engine archive and the
ONNX Runtime archive — with a flipped-digit control arm that fails as it
should. The manifest declares four products, and its executable half is
byte-identical to `v2.10.0`'s. (The earlier reading, on 2026-09-07 at
`v2.8.0`, checked the same six targets against `essence2-v1.2.0` and is kept
in the [preflight](/examples/apple-swiftpm-check#arm-4--re-run-2026-09-07-at-v280)
as the record of that day.)

**The engine release is one coordinate, complete.** `essence2-v1.2.0` carries
three archives: the engine, the ONNX Runtime build, and a resources archive
(231,597,193 B) holding what the engine loads at start — its Metal library,
the idle audio and the shared audio encoder. The resources are **not** a
binary target, because SwiftPM cannot ship loose resource bundles through a
product: linking succeeds without them and starting a session does not, so
your app places them in its own resources. The archive names keep the
engine's legacy library spelling, kept for compatibility —
`libessence2.xcframework.zip` and `libessence2-resources.zip`, beside
`onnxruntime.xcframework.zip` — names you download, never type in code.

**What it does with a model.** The engine applies the same rule as every
other bitHuman runtime: a model package carrying all four of its
recorded-mouth files renders; a package missing any of them is refused before
the first frame, and the refusal names the file. (This sentence used to end
"…renders, on iOS and macOS exactly as on the server". That reads as a promise
that the model you can fetch will play on a phone, and measured, it will not —
see the block below. The rule is about a *complete* package, not about which
packages you can obtain.) (v1.1.0, cut the same day, read a descriptive block in the
package's manifest instead and refused complete packages that lacked it —
which is why v1.2.0 exists.) When the engine cannot render a mouth from the
avatar's own recording it stops the session and says why, rather than drawing
one and letting the video play on.

### The model you can download is not the package this engine opens

★ **This is the limit that decides whether essence-2 on Apple hardware is
usable today, and it is not a repack you can do in your app.** It used to be
stated here as "there is no in-app model download yet" — a credentials
problem, and one a runtime token would solve. Measured on both sides on
**2026-09-09**, it is not that. It is a format problem, and it sits on
bitHuman's side of the line.

**What the endpoint returns.**
[`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model)
returned, for one live identity, a single `IMX\0` v2 container **file** of
**99,536,068 B**. Read out of the container's own member index: **27 members**
— `manifest.json`, four `.onnx` graphs, the image and motion data — and
**zero** CoreML `.mlpackage` members. That artifact is the one the bitHuman
cloud renders from.

**What the Apple engine accepts.** A **directory** of CoreML packages, and it
refuses anything else before the first frame, naming in the refusal both the
format it wanted and the CoreML members it expects. Measured the same day by
reading the strings of the `ios-arm64` slice of the published engine archive
(158,661,991 B, downloaded with no credentials and re-hashed to exactly the
checksum the manifest pins), with a nonsense token reading 0 in the same pass.

**What that looks like from your own app, run on a phone.** A fresh SwiftUI app
attaching only the `Essence2` product built for the device, installed on an
iPhone 15 (iOS 26.6.1) on 2026-09-09, and handed the artifact above
(101,895,441 B for the identity used) exactly as the header says:

```text
be_essence2_create(<the downloaded artifact>, nil, 0, &handle) -> rc = -2

[be_essence2_create] Essence2SyncEngine: missing asset: Essence2Bundle:
  …/DevWalkE2.app/e2model.imx is not a .elevatedir/.essence2dir bundle
  (need a directory with meta.json {"format":"elevatedir-v*" | "essence2-light-dir-v*"})
```

Three things a reader should take from that run. The product really does
build, link, install and run on `ios-arm64` — nothing about the SDK is in the
way. The refusal arrives at `create`, **before** the [hardware
floor](#hardware-floor) is ever consulted, so it is what you see on *any*
Apple device, an iPhone 16 Pro included. And `rc` alone does not tell you what
went wrong: a control arm in the same run, `be_essence2_create` on a path that
does not exist, returns **the same `-2`** — read the stderr line, not the
return code. The engine also prints `★ UNMETERED RENDER` on stderr when no
API secret is set, exactly as [Metering](#essence-2-on-device) describes.

**So they are two runtimes, not two spellings of one.** Nothing a consumer
writes converts one into the other, and the credential is not what is in your
way: even with the account API secret in hand — which you must not ship inside
an app — the bytes you receive are the wrong shape for this engine. Publishing
an on-device package per identity is a change on bitHuman's side, and it is
not shipped.

**What you can do today.** Build, link and start `Essence2` against a package
you hold yourself. That is a real integration path for a private build; it is
not a route to a customer-installable app. On a Mac, the self-serve path that
works end to end is the Python wheel below.

One SwiftPM lesson worth a sentence: `swift package resolve` returns 0 for a
product that does not exist — only `swift build` proves the product. Preflight
with a build, not a resolve.

## Essence 2 on a Mac, without Swift

[Essence 2 on-device](#essence-2-on-device) above is a C interface you wrap
yourself. On **macOS** there is a self-serve path that does not involve Xcode at
all — the `bithuman` Python wheel, which carries the same engine
(`lible_core.dylib`, a retired spelling) and vendors its own ONNX Runtime beside
it. Verified on macOS 26.6.2 arm64 on 2026-09-10. The install line, the
platform floor and the API are on the [Python SDK](/sdk/python) page; the
two-command route is on [macOS](/sdk/macos).

> **On an Intel Mac `pip install bithuman` succeeds and gives you the wrong
> thing.** There is no macOS x86_64 wheel for 2.x or 3.x, so pip silently
> resolves **1.10.7** — a different generation — and exits 0. Pin
> `bithuman>=3` so the resolver has to say no out loud. The
> [transcript of both arms](/examples/apple-swiftpm-check#check-2--which-bithuman-wheel-will-pip-pick-on-a-mac)
> shows exactly what each prints.

## Signing, before any of the above runs on a phone

Nothing on this rail runs in the Simulator — the engines are Apple-Silicon
on-device inference — so the first build that matters is a **device** build, and
a device build is signed. The page used to skip this; here is the whole of what
you need, in the order you hit it.

- **An Apple Developer team.** The build needs a `DEVELOPMENT_TEAM` (the
  10-character team id) and a development signing certificate in your keychain.
- **A provisioning profile that lists your iPhone's UDID.** Xcode's automatic
  signing creates one the first time you build to a device you have paired and
  trusted; there is no way to install a development build on a phone that is not
  in the profile.
- **Automatic signing, not manual, unless you manage profiles yourself.**
  Setting `PROVISIONING_PROFILE_SPECIFIER` to an Xcode-managed profile fails the
  build outright with `Provisioning profile "…" is Xcode managed, but signing
  settings require a manually managed profile`. From the command line the working
  shape is `CODE_SIGN_STYLE=Automatic` + `DEVELOPMENT_TEAM=<team>` +
  `xcodebuild … -allowProvisioningUpdates`.
- **Headless builds need the login keychain unlocked in a GUI session.** Over
  SSH, `security find-identity -v -p codesigning` reports **0 valid identities**
  even when the certificates are installed, because the SSH session's keychain
  search list holds only the system keychain. The install then fails at the
  phone with `0xe800801c (No code signature found.)`. Build from a logged-in
  session, or arrange for one.
- **What you do *not* need for these two engines.** Neither `Expression2` nor
  `Essence2` requires the increased-memory entitlements below — those belong to
  the `bitHumanKit` umbrella path. A plain development profile is enough.

Measured 2026-09-09 on macOS 26.6.2 / Xcode 26.3, installing to an iPhone 15
over `xcrun devicectl device install app`.

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

| | `bitHumanKit`: Essence | `bitHumanKit`: Expression | **`Essence2`** (essence-2) | `Expression2` (expression-2) |
|---|---|---|---|---|
| **macOS** | M3+, macOS 26 | M3+, macOS 26 | **Apple Silicon, M3 or later** | no device gate in the shipped binary |
| **iPadOS** | iPad Pro M4+, iPadOS 26 | iPad Pro M4+, 16 GB, iPadOS 26 | **an iPad with M-series Apple Silicon** (iPad Pro 2021+, iPad Air 2022+) | no device gate in the shipped binary |
| **iPhone** | iPhone 16 Pro+ (A18 Pro) | iPhone 16 Pro+ (A18 Pro) | **iPhone 16 Pro / Pro Max (A18 Pro) or later** | no device gate; has rendered on an iPhone 15 |

**Where each `Essence2` number comes from.** Every one is a sentence inside the
published engine archive, counted per slice with a nonsense control reading 0
in the same pass:

| refusal, verbatim | `ios-arm64` | `macos-arm64` | simulator |
|---|---|---|---|
| *"bitHuman requires Apple M3 or later on macOS."* | 0 | **2** | 0 |
| *"bitHuman requires Apple Silicon (M3 or later)."* | 0 | **2** | 0 |
| *"…requires an iPad with M-series Apple Silicon (iPad Pro 2021 or later, iPad Air 2022 or later)."* | **2** | 0 | 0 |
| *"…requires iPhone 16 Pro or later (A18 Pro+)."* | **2** | 0 | 0 |
| *"…requires an A18 Pro chip (iPhone 16 Pro / Pro Max)…"* | **2** | 0 | 0 |
| nonsense control | 0 | 0 | 0 |

Each slice carries only the refusals that can fire on it. **The Simulator
carries none of them**, which is the practical warning: a Simulator run will
not tell you your device is under-spec.

The `Expression2` column was measured the same way, on its own published
archive: **0** hits for `unsupported hardware`, `HardwareCheck`, `A18` and
`iPhone 16` in all three slices, against positive controls that fire in the
same read (`Expression2` 1,106–1,108, `CoreML` 24–26) and a nonsense token
at 0. It carries no device gate at all.

★ **The iPhone floor applies to `Essence2` too, and you should know it before
you build rather than from a runtime refusal.** Until 2026-09-08 both this page
and the package manifest said the floor graded `bitHumanKit` only. It does not:
the essence-2 engine starts the same check, because it starts the same avatar
actor. On an under-spec phone `be_essence2_create` **returns 0** — the engine
looks fine — and the *warm-up* is what refuses, with this message:

```
Bithuman.create: unsupported hardware — iPhone15,4 detected —
bitHuman iOS SDK requires iPhone 16 Pro or later (A18 Pro+).
— engine stays idle-only
```

**There is no environment override.** Measured on an iPhone 15 running
iOS 26.6.1 on 2026-09-08, and confirmed on 2026-09-09 by reading the strings of
the published engine archive itself — see the per-slice table above for the
counts and their control.

★ **A standard A18 is not enough.** The same binary carries the reason
verbatim: *"bitHuman iOS SDK requires an A18 Pro chip (iPhone 16 Pro / Pro
Max). The standard A18 lacks the GPU cores + thermal envelope for sustained
25 FPS."* An iPhone 16 or 16 Plus is refused.

**The `Expression2` column is a separate engine and is not gated by
`HardwareCheck`.** It has no published device floor: measured, it renders on an
**iPhone 15** — two generations below this table's iPhone row — so do not read
any other column as an `Expression2` requirement. See
[Expression 2 on-device](#expression-2-on-device) for what that run was.

Requires Xcode 26+ (older Xcodes reject the Swift 6 concurrency syntax).
Expression on Apple Silicon auto-spawns a `bithuman-expression-daemon`
subprocess; on unsupported hardware it raises `ExpressionModelNotSupported` — not
a crash. See [models](/concepts/models).

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

- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) — the complete `Expression2` app, every file, measured on an iPhone 15
- [Apple — check before you ship](/examples/apple-swiftpm-check) — three preflights you can run from any OS, with control arms and real exit codes
- [Failure states on a phone](/examples/failure-states) — what the on-device SDK throws with no network, a half-finished download, or a wrong agent code
- [Runnable Swift examples](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/swift) — voice, avatar, and benchmark apps
- [SDK](/sdk) — which SDK to pick
- [LiveKit (Apple)](/sdk/livekit) — connect a native app to a cloud-hosted avatar
- [Models](/concepts/models) — Essence vs Expression
- [macOS](/sdk/macos) — two commands to an avatar on a Mac, no Xcode
- [CLI](/sdk/cli) — the same engine, no code
