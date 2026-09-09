---
title: "Swift SDK (iOS, iPadOS, macOS)"
description: "The iOS SDK. On-device, real-time, lip-synced avatars for iPhone, iPad and Mac — one SwiftPM package, bitHumanKit. Apple Silicon only. Preview maturity."
section: sdk
group: "Mobile — iOS & Android"
label: "Swift — iOS & macOS"
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
  in, BGR frames out). Reached via `Bithuman.create(modelPath:)`.
  (This page used to call it "the portable `libessence` C++ runtime", using the
  engine's legacy name. It is not: the published `bitHumanKit.xcframework`
  binary is a static archive of 28 objects — `bitHumanKit.o`, MLX, HuggingFace,
  Tokenizers, Crypto, yyjson — and no legacy `libessence` object is among them.)

Audio in (16 kHz mono PCM), `CGImage` / BGR frames out at 25 FPS. All inference
runs **on-device**; a once-per-minute billing heartbeat meters avatar mode
(audio-only is unmetered).

> **Maturity** This rail is **preview**, not GA. The package vends four
> products: **`bitHumanKit`** (`import bitHumanKit`), the binary umbrella;
> **`Expression2`** (`import Expression2`), the second-generation avatar engine,
> new in **v2.5.0** and **given a model-path API in v2.6.0**; **`Essence2`**
> (`import Essence2`), the essence-2 engine's C interface, new in **v2.7.0**
> and importable under its own name since **v2.8.0**; and
> `BithumanEngineProtocol`, a source-only Layer-0 engine interface. The older standalone Layer-1 products (`Expression`, `Bithuman`) are
> **not** published — naming one fails with
> `product 'Expression' ... not found in package 'homebrew-bithuman'`, rc 1.
> Note **when** it fails: `swift package resolve` returns **0** on a manifest
> naming `Expression`, because resolve settles the dependency graph and does not
> check product names. The failure lands on `swift build`. If you are scripting a
> preflight, resolve alone will pass you through.

> **Which second-generation engines are on this rail.** Both.
> [`expression-2`](/concepts/expression-2) since **v2.5.0** — see
> [Expression 2 on-device](#expression-2-on-device).
> [`essence-2`](/concepts/essence-2) since **v2.7.0** (2026-09-06), as the
> `Essence2` product — see [Essence 2 on-device](#essence-2-on-device),
> including the one thing it does not give you yet. Neither engine is inside
> `bitHumanKit`: that binary is still the `v2.4.0` asset, and `strings -a` on
> its `ios-arm64` slice counts `essence` **0** against `ImxContainer` **141**
> in the same read — attach the product you want, not the umbrella.
> [`essence-2-max`](/concepts/essence-2-max) is cloud-only by design.

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

Pick **2.11.0** ("Up to Next Major Version" from 2.11.0) and attach the product
you want — **`bitHumanKit`** for the umbrella, **`Expression2`** or
**`Essence2`** for one second-generation engine alone. Or in `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git",
         from: "2.11.0")
```

> ### 2.11.0 — published 2026-09-09, and it is the tag that stops the manifest misleading you
>
> **What to do:** move your pin to `2.11.0`. **Nothing you build changes** —
> strip the comments from the `2.10.0` and `2.11.0` manifests and the diff is
> empty, so every product, asset URL and checksum is byte-for-byte what
> `2.10.0` declared. What changes is what Xcode shows you when you open the
> package, and two of those sentences were **false through `2.10.0`**:
>
> * ★ **"Depend on it alongside either of the others"** — taking `Expression2`
>   **and** `Essence2` in one app does **not** link on a device. Measured on
>   the published archives: **116 duplicate symbols and rc 1** at an app's
>   final link on `ios-arm64` and on `macos-arm64`, against a control arm
>   without the shared framework at rc 0, and a Simulator arm that is **green**
>   — which is why a Simulator-only CI never saw it. A library target is
>   compiled, never linked, so `swift build` and `xcodebuild … build` are green
>   too. The collision fires at *your app's* final link.
> * ★ **"That floor grades `bitHumanKit` ONLY"** — the iPhone floor also grades
>   `Essence2`. See [Hardware floor](#hardware-floor).
>
> Both were corrected on the repository's `main` on 2026-09-08 — and **no tag
> carried the correction**, so every version-pinned consumer kept resolving the
> false pair. Verified anonymously on 2026-09-09 before this tag was cut: the
> corrected sentences read **0** in `v2.7.0`, `v2.8.0`, `v2.9.0` and `v2.10.0`,
> and **1** in `main`. They read **1** at `v2.11.0`, and the old sentences read
> **0**, with a nonsense token at 0 in the same read. The lesson is worth one
> line: **`main` is not what Xcode reads.** SwiftPM resolves the tag your
> version rule picks and reads the manifest it finds *there*.

> ### 2.7.0 and 2.8.0 — essence-2 becomes a product (2026-09-06 and 2026-09-07)
>
> **What to do:** nothing — **the pin to use is `2.11.0`**, above. This note is
> kept as the record of how `essence-2` arrived on this rail, not as an
> instruction; it used to read "pin `from: "2.8.0"`" and two pin instructions on
> one page is how a page starts contradicting itself. Both were manifest-only
> tags: nothing that `bitHumanKit` or `Expression2` downloads changed — their
> asset URLs and checksums are byte-for-byte what `v2.6.0` declared.
>
> * **v2.7.0** (2026-09-06T16:42Z) added the **`Essence2`** library product,
>   pointing at the engine archives on release `essence2-v1.1.0`. Its only
>   module was `CLibEssence2`; `import Essence2` failed with `no such module`.
> * **v2.8.0** (2026-09-07T01:30Z) points the product at `essence2-v1.2.0`,
>   whose module map declares **`Essence2` beside `CLibEssence2`** over the
>   same header, so the product name and the import finally agree. The engine
>   it carries also changed one rule — see
>   [Essence 2 on-device](#essence-2-on-device).
>
> Measured on 2026-09-07, anonymously: the manifest at `v2.8.0` is
> byte-identical to `main`, it declares six binary targets, and the
> [preflight](/examples/apple-swiftpm-check#arm-4--re-run-2026-09-07-at-v280)
> fetches all six and matches every checksum.

> ### 2.6.0 — published 2026-09-06, and it is the first one that changes `Expression2`'s API
>
> **What to do:** nothing, if you took the `2.11.0` pin above — it includes
> this. This note explains what changed for anyone reading older code: if you
> are on `from: "2.5.0"` or `from: "2.5.1"` you pick 2.6.0 up automatically and
> **nothing you have written stops compiling** — the whole change is additive.
> If you pin an *exact* version and you use `Expression2`, 2.6.0 is the release
> that lets you hand the engine a model.
>
> * ★ **`Expression2` can now be given a model path.** Through 2.5.1 the only
>   initializer was `Expression2Engine()`, which searched an environment
>   variable or the app bundle. 2.6.0 adds
>   `Expression2Engine.create(modelPath:sharedEngineDir:warmSpeech:)`, the
>   instance `load(modelPath:…)`, and a container opener. See
>   [Expression 2 on-device](#expression-2-on-device).
> * ★ **`Expression2` now rides a third binary target**, `UnifiedModelHeader`.
>   You never import it — it is a `binaryTarget`, not a product — but the
>   engine's own module interface does (`import UnifiedModelHeader`, line 14),
>   so it must be resolvable. Depending on the two 2.5.0 targets by hand fails
>   at import with `no such module 'UnifiedModelHeader'`. Attaching the
>   **`Expression2` product**, as above, brings all three.
> * **`bitHumanKit` did not change.** Its binary is still the `v2.4.0` asset,
>   same URL and same checksum `5c536e37…e9db`.
>
> Measured on the published zips themselves rather than taken from the release
> notes — the `ios-arm64` slice, aggregated over all nine emitted
> `.swiftinterface` files, with `public init()` and `func pull` as controls that
> read the same on both, and a nonsense token as the negative control:
>
> | token | v2.5.0 | v2.6.0 |
> |---|---|---|
> | `create(modelPath` | 0 | **9** |
> | `Expression2Container` | 0 | **45** |
> | `notAnAvatarDirectory` | 0 | **9** |
> | `public init()` *(control)* | 9 | 9 |
> | a token in neither *(control)* | 0 | 0 |
>
> Both zips were re-downloaded anonymously on 2026-09-06 and re-hashed against
> the checksum the manifest pins; both match.

> **2.5.1 was a manifest correction and downloaded nothing new.** Every
> `binaryTarget` URL and checksum was byte-identical to 2.5.0. What changed was
> the manifest's own commentary, which had gone false in two ways worth knowing
> about if you read it in Xcode: it recorded that the umbrella does **not**
> contain the essence engine and then, ninety lines lower, that the umbrella
> "re-exports both engines"; and it told you to `import Expression` /
> `import Bithuman` for "the lower-level engine products", neither of which this
> package has ever vended. Asking for one is not a deprecation warning, it is a
> build failure — `product 'Expression' ... not found in package
> 'homebrew-bithuman'`, rc 1. `Bithuman` is a **type** vended by `bitHumanKit`,
> not a module you can import.

> **One package, three release tags — by design.** `2.8.0` is the version you
> pin; it is the manifest that declares every product. The umbrella's binary
> still downloads from the **`v2.4.0`** release, the three Expression 2
> binaries from **`v2.6.0`**, and the two Essence 2 binaries from
> **`essence2-v1.2.0`**, because a single shared tag would have re-pointed
> `bitHumanKit.xcframework.zip` at a release that does not carry it — a hard
> 404 for every existing consumer. SwiftPM reads absolute asset URLs out of the
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
yourself. On **macOS** specifically there is also a self-serve path that does
not involve Xcode at all: the `bithuman` Python wheel.

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

## Performance

Measured on an M5 MacBook Pro against the essence engine (1.19.1, single
conversation). Treat them as indicative of the runtime, not as a measurement of
the shipped `bitHumanKit` binary, which does not contain the essence engine:

| Metric | Value |
|---|---|
| Per-tick mean | 1.43 ms |
| Per-tick p99 | 1.51 ms |
| Sustained (tight loop) | 698 FPS |
| Cold start | ~290 ms |
| Peak RSS | ~84 MB |
| Wrapper overhead vs the raw engine | +1.7 % |

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
