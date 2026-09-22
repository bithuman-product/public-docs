---
title: "iOS & iPadOS SDK"
description: "Ship either second-generation model inside your own iOS, iPadOS or macOS app from one SwiftPM package: Expression 2 on any Apple Silicon device at iOS 16, Essence 2 at full resolution on iOS 26. Device floors, download sizes, the Apple entitlements bitHumanKit needs, and a worked example for each — with a first frame from a published identity needing no account, no key and no credits."
section: sdk
group: "Platforms"
order: 40
label: "iOS & iPadOS"
---

The Apple rail is one SwiftPM package. It vends two avatar engines you can
ship — [Expression 2](/concepts/expression-2) and
[Essence 2](/concepts/essence-2) — plus `bitHumanKit`, an umbrella that adds a
whole on-device voice agent around one of them. The three have **different
hardware floors**, so read the requirements before you buy a device or start a
project.

Both models render entirely on the device, and on Apple both reach a first frame
with **no account, no key and no credits**. One dependency line serves all
three products:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.14.0")
```

**Type that floor exactly — `2.14.0`, and nothing lower.** It is the tag that
pins Essence 2 engine `essence2-v1.10.0` and Expression 2 engine `v2.6.3`,
verified against the tags the package repository serves on 2026-09-22, and it
is the first tag on which **one app can take both `Expression2` and `Essence2`
and link on device** — every tag below it fails that link with 112 duplicate
symbols. `from:`
is a *floor*, not a pin, and an existing project stays on the floor it was
resolved against: a lower number here is the one way this page's Essence 2
answer silently stops being true, and it throws nothing when it does. Why, and
how to check what you are actually on:
[The floor is the number that matters](#the-floor-is-the-number-that-matters).

| | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [a whole generated scene](/concepts/expression-2) — head, shoulders and background — at 416x720 | [your own portrait, animated](/concepts/essence-2), at up to 1920x1080, on that identity's own canvas |
| **Product to attach** | `.product(name: "Expression2", package: "homebrew-bithuman")` | `.product(name: "Essence2", package: "homebrew-bithuman")` |
| **Devices** | any Apple Silicon iPhone, iPad or Mac — no hardware gate in the binary | any Apple Silicon iPhone; iPad with M-series; Mac with M3 or newer |
| **OS floor** | iOS 16 / macOS 13 | **iOS 26 / iPadOS 26 / macOS 26** |
| **Credential** | **none** to download or render a published identity | **none** either — the render reports itself unmetered on stderr |
| **First-run download** | about 355 MB — identity, plus the shared engine graphs every identity uses | about 250 MB — identity, plus the engine's runtime resources |
| **What it asks of you** | a Swift API; nothing to stage | you write a small C-interface wrapper and stage the resources yourself |
| **Worked example** | [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) | [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2) |

> **Important** **Attach exactly one engine product per app.** `Expression2` and
> `Essence2` in one target link green on the Simulator and fail at an app's final
> link on a device and on a Mac, with duplicate symbols — the Essence 2 archive
> carries the shared `UnifiedModelHeader` objects that `Expression2` also forces
> into the link. There is no build setting that resolves it; see
> [Choose an engine](#choose-an-engine).

A third product, `bitHumanKit`, wraps a whole on-device voice agent around one
engine. It is not a model: it is the stack, and it carries the only hardware
gate and the only Apple entitlements on this page — **iPhone 16 Pro or newer**
and a **1–3 business day** wait. If you want a rendered frame, you want one of
the two engines above.

## Requirements

Every path needs a Mac with **Xcode 26 or newer**, an Apple Developer team, and
a physical device you have paired and trusted. Beyond that:

| You ship | Product you attach | Device floor | OS floor | Apple entitlements |
|---|---|---|---|---|
| [Expression 2](/concepts/expression-2) | `Expression2` | any Apple Silicon iPhone, iPad or Mac | iOS 16 / macOS 13 | none |
| [Essence 2](/concepts/essence-2) | `Essence2` | any Apple Silicon iPhone; iPad with M-series Apple Silicon; Mac with M3 or newer | iOS 26 / iPadOS 26 / macOS 26 | none |
| A whole voice agent — speech in, LLM, speech out, avatar | `bitHumanKit` | iPhone 16 Pro or newer; iPad Pro M4 or newer (16 GB) | iOS 26 / iPadOS 26 / macOS 26 | **two, 1–3 business days** |

The floors are not advice: each refusal is compiled into the binary that
enforces it and fires at run time. Read with `strings -a` on the published
slices the current tag pins, on 2026-09-21, with a nonsense control at 0 in
every pass:

```text
binary, slice                  refusal sentence it carries                            hits
bitHumanKit  ios-arm64         "bitHuman needs an iPhone 16 Pro or newer."               1
bitHumanKit  ios-arm64         "bitHuman needs an A18 Pro chip (iPhone 16 Pro / …)."     1
bitHumanKit  ios-arm64         "… requires an iPad with M-series Apple Silicon."         3
bitHumanKit  macos-arm64       `unsupportedMacChips`, a chip deny-list                    8
Essence2     ios-arm64         "… requires an iPad with M-series Apple Silicon
                                (iPad Pro 2021 or later, iPad Air 2022 or later)."       4
Essence2     macos-arm64       "bitHuman requires Apple M3 or later on macOS."           2
Expression2  all three slices  any of the sentences above, and `unsupported hardware`     0
Expression2  all three slices  control: `CoreML`, which must be present                 24-26
```

**`Expression2` carries no hardware gate at all** — 0 in all three slices,
against a live control in the same read. `bitHumanKit`'s gate is its own and
unconditional: that is the iPhone 16 Pro floor, and `HardwareCheck.evaluate()`
is where you meet it.

The Essence 2 archive also carries an iPhone-16-Pro sentence, and it is worth
reading in full before you conclude anything from it, because it scopes itself:

```text
… the expression-1 Expression actor (MLX DiT) requires iPhone 16 Pro or later
(A18 Pro+). This gate is expression-1's alone: it is NOT a bitHuman-SDK-wide
device floor, and it does NOT apply to essence-2 or expression-2, which carry
no device gate.
```

So an Essence 2 app is not held to the iPhone 16 Pro floor — the measured
iPhone rate on the [performance page](/sdk/performance) is the other half of
that.

The iPad and macOS sentences are not all scoped the same way, and the
difference is worth reading rather than summarising. Counted in the `ios-arm64`
slice on 2026-09-21: of the four M-series hits, **two scope themselves**
(*"…requires an iPad with M-series Apple Silicon or an iPhone 16 Pro+.
expression-1 only: essence-2 and expression-2 carry no device gate."*) and
**two do not** (*"bitHuman iOS SDK requires an iPad with M-series Apple Silicon
(iPad Pro 2021 or later, iPad Air 2022 or later)."*). The unscoped pair is why
M-series on iPad and M3 on macOS are still listed as real floors in
[Requirements](#requirements) — treat them as real until an unscoped sentence
stops shipping.

### Apple entitlements

`bitHumanKit`'s avatar mode holds a working set above the ~3 GB default ceiling
iOS gives an app, so without these two entitlements iOS terminates the app
mid-conversation — typically half a minute into a live turn, with no crash you
can read:

```text
com.apple.developer.kernel.increased-memory-limit
com.apple.developer.kernel.extended-virtual-addressing
```

**Request them before you write any code.** developer.apple.com → Account →
Membership → *Request Additional Capabilities*, ask for both, and wait: Apple
replies by email and has taken **1–3 business days**. The provisioning profile
updates itself once they are granted. A working `Info.plist` that declares them,
beside the two privacy strings, is in the example repository:
[`swift/ios-avatar/Sources/Info.plist`](https://github.com/bithuman-product/bithuman-examples/blob/main/swift/ios-avatar/Sources/Info.plist).

Neither engine product needs an entitlement to build, link or render. If your
own app is killed mid-conversation with no crash log, this ceiling is the first
thing to check.

### Deployment target

Set your app's deployment target to **iOS 26 / macOS 26** when you link
`Essence2`. The package's own floor is lower (`iOS 16`, `macOS 13`) because a
source-only product needs it, but the Essence 2 objects are built for 26.0 and
linking them lower makes `ld` warn on every object.

### The Simulator is not a test of the device

Both engines publish an `ios-arm64-simulator` slice, so a Simulator build is
useful for layout and wiring. **It proves nothing about the phone**, and it is
not the same thing on every product. Measured with `strings -a` on the published
slices on 2026-09-21:

| Product | Device-model refusals in `ios-arm64` | …in `ios-arm64-simulator` |
|---|---|---|
| `Essence2` (`essence2-v1.9.0`) | iPhone 16 Pro 6, A18 Pro 4, M-series 4 | **0, 0, 0** |
| `bitHumanKit` (`v2.4.0`) | iPhone 16 Pro 2, A18 Pro 1, M-series 3 | **the same 2, 1, 3** |
| `Expression2` (`v2.6.3`) | none — not gated by `HardwareCheck` | none |

So the Essence 2 engine really does drop its device gate in the Simulator, while
`bitHumanKit` carries the identical strings into the simulator slice. Neither
means the gate *fires* there: it reads `hw.machine`, which in a Simulator is not
your phone's. The generic `unsupported hardware` prefix is in all three
`Essence2` slices and in none of `Expression2`'s. Use a device for anything that
renders.

★ **A Simulator build of Essence 2 does not merely under-test — it aborts.** The
package manifest records it, measured 2026-09-08 on the iOS 26.4 simulator:
`be_essence2_create` returns 0 and the process then raises
`NSInvalidArgumentException … object cannot be nil` inside
`+[MPSGraphDevice deviceWithMTLDevice:]`, reached from the warm-up. The call
chain hits MPSGraph before the actor's own simulator guard. Build Essence 2 on a
device.

One more Simulator fact, because the error it produces reads like a broken
package: **every bitHuman simulator slice is arm64 only.** The Expression 2
engine, the Essence 2 engine and the two shared interface binaries all publish
`ios-arm64-simulator` and nothing else. (The one exception is not ours: the
ONNX Runtime build that ships inside the `Essence2` product publishes
`ios-arm64_x86_64-simulator`. It does not rescue you — the bitHuman half still
has no x86_64 slice.) A default
`xcodebuild -destination 'generic/platform=iOS Simulator'` also builds x86_64,
finds no slice, and fails with
`error: unable to resolve module dependency: 'Expression2'`. Pass `ARCHS=arm64`.

## Choose an engine

| Take | When |
|---|---|
| `Expression2` | you want a rendered frame on the iPhone or iPad you already own, with no device floor, no entitlement and a Swift API |
| `Essence2` | you want the 1080p photoreal renderer, your app targets OS 26, and you are willing to write a small C-interface wrapper |
| `bitHumanKit` | you want the whole conversation — recognition, a language model, speech and the avatar — and can meet its floor and its entitlements |

Do not attach two of them. `Expression2` and `Essence2` in one app **link**
green on the Simulator and fail at an app's final link on a device or a Mac,
with duplicate symbols: the Essence 2 archive carries the shared
`UnifiedModelHeader` objects that `Expression2` also forces into the link.

### Can I ship Essence 2 on iPhone?

**Yes — on any Apple Silicon iPhone, at iOS 26, from `essence2-v1.9.0`.** The
package vends an `Essence2` product whose xcframework carries `ios-arm64`,
`ios-arm64-simulator` and `macos-arm64` slices, and it opens the same `.imx`
file the download endpoint serves for your agent. Frame rates measured on a
phone are on the [performance page](/sdk/performance).

★ **If you read the package manifest, you will find a note saying the opposite —
it is older than this answer.** `Package.swift` at `v2.13.8` carries a comment
dated 2026-09-08 reporting that on an iPhone 15 the Essence 2 warm-up refused
with *"unsupported hardware — iPhone15,4 detected"* and the engine "stays
idle-only", concluding that Essence 2 needs an iPhone 16 Pro. That was measured
on an earlier engine; the current answer rests on a later run of the same
hardware — the iPhone 15 Essence 2 cell on the
[performance page](/sdk/performance), measured 2026-09-20 on `essence2-v1.9.0`,
which renders faster than it plays and so is not idle-only. The comment has not
been updated. If your own iPhone 15 refuses at warm-up, you are on an engine
older than 1.9.0 — check the tag your `Package.resolved` pinned before buying a
phone, and tell us.

Four things it asks of you that `Expression2` does not, all of them verifiable
from the published bytes:

1. **iOS 26, and an M-series iPad or M3 Mac if that is your target** — see
   [Requirements](#requirements). From `essence2-v1.9.0` there is no iPhone
   model floor for this engine — see the note above if you meet one.
2. **You write the Swift.** The product vends a C interface — 17
   `be_essence2_*` functions in `Headers/be_essence2.h` — under two module
   spellings, `import Essence2` and `import CLibEssence2`. There is no Swift
   engine class on this rail; see [Minimal code](#minimal-code).
3. **You stage the engine's runtime resources yourself.** They ship as a
   separate archive on the same release, not through SwiftPM: linking succeeds
   without them, starting a session does not. The [Get a model](#get-a-model)
   block fetches it.
4. **You link it alone** — see the duplicate-symbol note above.

A complete Essence 2 app, every file printed, is on
[Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2).

If any of those four is a problem for your app, ship Expression 2 instead: no
extra staging, a Swift API, and a complete worked example in
[Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2).

## Install

In Xcode: *File → Add Package Dependencies…* and paste
`https://github.com/bithuman-product/homebrew-bithuman.git`. In a
`Package.swift`, the whole dependency is:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.14.0")
// then attach exactly ONE engine product to your target:
//   .product(name: "Expression2", package: "homebrew-bithuman")
//   .product(name: "Essence2",    package: "homebrew-bithuman")
//   .product(name: "bitHumanKit", package: "homebrew-bithuman")
```

| Product | You write | What it is | Slices |
|---|---|---|---|
| `Expression2` | `import Expression2` | the Expression 2 engine, pre-compiled, plus the two binaries its interface needs | `ios-arm64`, `ios-arm64-simulator`, `macos-arm64` |
| `Essence2` | `import Essence2` | the Essence 2 engine as a static C library, plus the ONNX Runtime build its audio head needs at link | `ios-arm64`, `ios-arm64-simulator`, `macos-arm64` |
| `bitHumanKit` | `import bitHumanKit` | the voice-agent umbrella: recognition, LLM, speech, avatar, renderer views | `ios-arm64`, `ios-arm64-simulator`, `macos-arm64` |
| `BithumanEngineProtocol` | `import BithumanEngineProtocol` | the source-only common engine interface. Do **not** take it beside `Expression2`, which already carries a binary copy | source |

There is no `Expression` product and no `Bithuman` product — those names are
older spellings and `swift build`, not `swift package resolve`, is what tells
you so.

Want to know the answer before Xcode does? The resolve, the assets and their
checksums can be checked from any operating system:
[Apple — check before you ship](/examples/apple-swiftpm-check).

### The floor is the number that matters

**Write `2.14.0` and nothing lower.** A *fresh* resolve of `from:` does take the
newest tag in the same major — so on a brand-new project any 2.x floor lands on
v2.14.0 today. That is not the case a reader is in. `from:` is satisfied by the
floor itself, and SwiftPM **keeps whatever `Package.resolved` already holds**, so
an existing project — one you cloned, one a colleague resolved last month, one
Xcode resolved before you edited the manifest — sits on the floor that was
written, not on the newest tag.

The tags do not carry the engine, they **pin** one, and the pin moved. Read out
of each tag's own `Package.swift` on 2026-09-21:

| Tag a floor can leave you on | Essence 2 engine it pins | What you get on an iPhone under a 16 Pro |
|---|---|---|
| v2.11.0, v2.11.2 | `essence2-v1.4.0` | warm-up refuses by name, engine stays **idle-only** |
| v2.12.1 | `essence2-v1.5.1` | the same silent refusal |
| v2.13.0 | `essence2-v1.6.0` | the same silent refusal |
| v2.13.2 | `essence2-v1.6.2` | the same silent refusal |
| v2.13.8 | `essence2-v1.9.0` | speaks — but `Expression2` + `Essence2` in one app **fails to link on device**, 112 duplicate symbols |
| **v2.14.0** | **`essence2-v1.10.0`** | **speaks, and both products link in one app — the behaviour this page describes** |

"Idle-only" is the whole failure: `be_essence2_create` returns 0, the identity's
motion plays, the avatar never speaks, **nothing is thrown and nothing is logged
where you are looking.** There is no error to search for. The only symptom is a
face that moves and does not talk.

So if you inherited a project, do both halves:

1. Raise the floor in the manifest to `from: "2.14.0"`.
2. **Force the resolve** — `Package.resolved` does not move on its own. In
   Xcode: *File → Packages → Update to Latest Package Versions*. From the
   command line: `swift package update`.

Then read back what you are actually on, which is the only answer that counts:

```bash
# in your project directory, after resolving
grep -A3 'homebrew-bithuman' Package.resolved
# the "version" it prints must be 2.13.8 or newer
```

[Apple — check before you ship](/examples/apple-swiftpm-check) does the same
check for you, from any operating system, including which engine that tag pins.

## Authentication and configuration

One credential drives every surface; only the environment-variable name differs
by platform convention. The Swift SDK reads **`BITHUMAN_API_KEY`**; every other
surface reads `BITHUMAN_API_SECRET`, and the value is the same. Keys are free at
[your API keys](https://www.bithuman.ai/developer/api-keys).

What needs one, and what does not:

| Action | Credential |
|---|---|
| Download a showcase identity, or the shared engine artifacts | none — anonymous, no account, no credits |
| Download **your own** agent's model | your key, as `-H "api-secret: $BITHUMAN_API_SECRET"` |
| Render in an app you ship | your key, in the app's environment |
| Create an agent in the first place | an account with credits — [pricing](/guides/pricing) is the authority |

Set it in Xcode under *Product → Scheme → Edit Scheme → Run → Arguments →
Environment Variables*. Never hard-code it; for production, fetch it from your
backend or the Keychain.

## Get a model

No engine ships weights. You fetch an identity, and — for Expression 2 — the
shared engine graphs every identity uses. Every file below is an anonymous
download over plain `curl`: no account, no key, no credits. The Expression 2 set
is about **355 MB**, the Essence 2 set about **250 MB**. Verified on 2026-09-21
with no credential in the environment.

Every size on this page is a **binary** megabyte. Re-measured 2026-09-21 by
range-requesting each URL anonymously and reading the total back off
`Content-Range`, so the byte counts are exact and the unit is not in doubt:
Expression 2 is 197,741,350 + 173,440,528 + 650,980 bytes, Essence 2 is
155,399,147 + 105,353,700. The [Android SDK](/sdk/android) quotes the door's own
`download_bytes` and so counts in decimal megabytes — the same file is a larger
number there.

**Expression 2** — three files. `A23WJF0199` is *Wise Pup*, a bitHuman-owned
identity in the free showcase; any code on the [showcase](/showcase) works the
same way, and so does your own agent once you add
`-H "api-secret: $BITHUMAN_API_SECRET"`:

```bash
# 1. the identity (188 MB). The endpoint answers 302 to a 1-hour signed URL;
#    -L follows it, and the file it serves is named <CODE>.imx.
curl -fL -o A23WJF0199.imx \
  "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"

# 2. the shared engine graphs (165 MB) — one artifact per platform, not per
#    identity, from the public channel `bithuman engine install` reads. The
#    `mac` build is the right one for an iPhone app: its graphs are CoreML
#    packages compiled on the device at first launch, and the name says which
#    machine downloads it, not which one runs it.
curl -fLO \
  "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/engines/expression-2/mac-arm64-1.0.0.engine"

# 3. 16 kHz mono speech to drive it (636 KB) — the identity's own bundle has one
curl -fL -o speech16k.wav \
  "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2&member=demo_speech_16k.wav"
```

**Essence 2** — the identity, plus the engine's runtime resources:

```bash
# 1. the identity (148 MB). A62SJB3901 is Kwame, an Essence 2 showcase identity.
curl -fL -o A62SJB3901.imx \
  "https://api.bithuman.ai/v1/agent/A62SJB3901/model/download?model=essence-2"

# 2. the engine's runtime resources (100 MB): its Metal libraries, the idle
#    audio and the audio encoder. SwiftPM cannot ship these, so you place them
#    yourself — unzip at your app bundle's Resources root, keeping the two
#    .bundle directories intact.
curl -fLO \
  "https://github.com/bithuman-product/homebrew-bithuman/releases/download/essence2-v1.9.0/libessence2-resources.zip"
```

Check what you got before you build an app around it. Both identity files and
the shared engine artifact are `IMX\0` containers, and the first four bytes say
so:

```bash
xxd -l 4 A23WJF0199.imx          # 00000000: 494d 5800    IMX.
xxd -l 4 A62SJB3901.imx          # 00000000: 494d 5800    IMX.
xxd -l 4 mac-arm64-1.0.0.engine  # 00000000: 494d 5800    IMX.
```

The fourth byte is a NUL, which is why `xxd` prints a dot for it.

The CLI fetches the same bytes with no account if you would rather not write
URLs: `bithuman pull wise-pup`, `bithuman pull kwame-warm-museum-guide`, or
`bithuman pull <YOUR_AGENT_CODE>` — see the [CLI](/sdk/cli). Your own agent's
file comes from
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
with your key.

### Showcase identities you can download right now

Verified anonymously on 2026-09-21 — every row answered a signed URL with no
credential:

| Code | Name | Model | Size |
|---|---|---|---|
| `A23WJF0199` | wise-pup | `expression-2` | 188 MB |
| `A02HCY0444` | shelly-tidewater | `expression-2` | 189 MB |
| `A74NWD9723` | energetic-audio-story-buddy | `expression-2` | 189 MB |
| `A21SKT4314` | warm-clear-professional-presenter | `essence-2` | 148 MB |
| `A23KSG5258` | afro-latina-astrophysics-mentor | `essence-2` | 145 MB |
| `A24EKJ8433` | calm-product-specialist-advisor | `essence-2` | 137 MB |
| `A52DHS2219` | sofia-ramirez | `essence-2` | 148 MB |
| `A62SJB3901` | kwame-warm-museum-guide | `essence-2` | 148 MB |
| `A80HVD8577` | executive-coach-for-clear-decisions | `essence-2` | 118 MB |

## Minimal code

### Expression 2

`Expression2Engine` opens the container you downloaded directly — you do not
unpack it yourself. `stagingDir:` is a writable directory the engine unpacks
the members into once; keep it between launches and the second start is faster.

```swift
import Expression2

// avatarContainer: the A23WJF0199.imx you downloaded
// sharedEngineContainer: the mac-arm64-1.0.0.engine you downloaded
// stagingDir: any writable directory of your own, e.g. Application Support
let engine = try Expression2Engine.create(
    avatarContainer: avatarURL,
    sharedEngineContainer: sharedEngineURL,
    stagingDir: stagingURL)

engine.feed(samples)   // [Float] PCM, 16 kHz mono
engine.flushTail()     // at the end of an utterance

// Generation is asynchronous: pull() returns nil until a chunk lands, so poll.
// 100 x 50 ms with nothing = done.
var idleTicks = 0
while idleTicks < 100 {
    var got = false
    // frame: [UInt8], BGR888, engine.width * engine.height * 3 bytes.
    // The worked example converts it to a CGImage in two vImage passes.
    while let (frame, _) = engine.pull() {
        got = true
        show(frame)
    }
    if got { idleTicks = 0 } else {
        idleTicks += 1
        try await Task.sleep(nanoseconds: 50_000_000)
    }
}
```

If you have already unpacked a container into a directory, the older entry point
still takes it: `Expression2Engine.create(modelPath:sharedEngineDir:)`. **That
is the one the worked example uses**, because its `setup.sh` unpacks first — so
do not expect the two to be spelled the same way. Both are current; the
container form above saves you the unpack step.

Every file of a working app — `Info.plist`, the Xcode settings, the whole of
`App.swift`, the unpack script — is printed on
[Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2).

### Essence 2

`Essence2` vends a C interface, not a Swift class. The shipped
`Headers/be_essence2.h` declares **17** `be_essence2_*` functions; these nine
are the ones a minimal app calls, copied from that header (verified byte-for-byte
against the `essence2-v1.9.0` xcframework on 2026-09-21, identical in all three
slices):

```c
int32_t be_essence2_set_api_secret(const char* api_secret);
int32_t be_essence2_create(const char* lab_path, const char* motion_dir,
                           int32_t chunk, be_essence2_handle* out_handle);
int32_t be_essence2_push_audio(be_essence2_handle handle,
                               const int16_t* samples, int32_t count);
int32_t be_essence2_is_ready(be_essence2_handle handle);
int32_t be_essence2_frames_available(be_essence2_handle handle);
int32_t be_essence2_pull_frame(be_essence2_handle handle,
                               uint8_t* out, int32_t capacity);
void    be_essence2_get_info(be_essence2_handle handle,
                             int32_t* width, int32_t* height);
void    be_essence2_destroy(be_essence2_handle handle);
void    be_essence2_quiesce_all(void);
```

The call order: `create` with the path to the `.imx` you downloaded (pass `NULL`
for `motion_dir`, `0` for `chunk`), then `get_info` to size a frame buffer,
then push 16 kHz mono **int16** audio and pull `height * width * 3` RGB frames
until `frames_available` returns 0. `push_audio` returning `-2` means nothing
was queued — pull frames and push the same samples again. `destroy` at the end.

> **Warning** **`be_essence2_quiesce_all()` is not optional, and leaving it out
> crashes your app on exit.** The header's own words: call it from the host
> app's `applicationWillTerminate` **before** process exit — exiting with an MLX
> eval or a Metal completion handler still in flight crashes in
> `__cxa_finalize`. It takes no arguments and quiets every live engine. An app
> that renders perfectly and dies as the user closes it is this call missing.

The other eight the header declares, which a minimal app does not need but a
real one will: `be_essence2_reset` (barge-in — drop what is queued and start the
next utterance), `be_essence2_set_mode`, `be_essence2_idle_frame`,
`be_essence2_pulled_speech_frames`, `be_essence2_render_status`,
`be_essence2_reanchor_slots` / `be_essence2_set_playout_anchor` /
`be_essence2_anchor_slots`. Read the header for those — it is the authority, and
a comment in `Package.swift` that says "15 functions" and one in the shipped
`Essence2.h` that says "16" are both stale; the count is 17.

Two more traps, both real:

- The header's comment above `be_essence2_create` still describes the **older**
  bundle-directory format (`.elevatedir`). The shipped binary refuses that
  format and says so: *"… is a meta.json (.elevatedir) bundle. That reader was
  removed on 2026-09-15; the download door serves le-bundle-v0
  (manifest.json)…"*. Pass the `.imx` as served. Those spellings are legacy
  names kept for compatibility — [what the names mean](/concepts/avatars-imx#the-engine-value-is-a-legacy-name).
- `create` succeeds long before the engine can render. Poll
  `be_essence2_is_ready` — until it returns 1 you get idle frames only.

`be_essence2_set_api_secret` is optional and metering is not silent: with no
credential the session renders and says on stderr that the render is unmetered;
a credential the service rejects renders for a 300-second grace behind a
countdown and then refuses, after which `pull_frame` returns `-3` and the engine
should be destroyed.

## Run

In Xcode: *Signing & Capabilities* → your team → select your iPhone → **Run**.
Automatic signing creates a development profile for a paired, trusted phone the
first time. `Info.plist` needs `NSMicrophoneUsageDescription` to hear the user,
and `NSSpeechRecognitionUsageDescription` as well if you use `bitHumanKit`'s
recognition.

From the command line, on a logged-in GUI session (an SSH session has no
keychain identity, and signing needs one):

```bash
xcodebuild -scheme <YourScheme> -destination 'generic/platform=iOS' \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=<YOUR_TEAM_ID> \
  -allowProvisioningUpdates build
```

The showcase identities above render without a key. A render of your own agent
is metered — [pricing](/guides/pricing) is the authority.

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| `401 MISSING_AUTH` from `/v1/agent/<CODE>/model/download`, anonymously | the code and `model=` family are not a free-showcase pair. A typo'd code and the wrong family both land here, before any "not found" check | check the pair against the table above or the [showcase](/showcase); drop `model=` to take the identity's own family; for your own agent send `-H "api-secret: $BITHUMAN_API_SECRET"` |
| `404 MODEL_ARTIFACT_NOT_READY` on a `member=` request | that member name is not in the container. The same code also means "trained, not published yet" for a whole model | check the member name first; poll only if you are downloading a model you just created ([error codes](/api/errors#error-codes)) |
| `409 MODEL_NOT_GENERATED`, with your key | your agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll `GET /v1/agent/<CODE>` until it is listed |
| duplicate symbols at the device link, while a Simulator build is green | `Expression2` and `Essence2` in one target | take one of them — see [Choose an engine](#choose-an-engine) |
| the app runs, no error, no avatar; `pull()` keeps returning `nil` | you drained synchronously on the line after `feed()` — frames arrive asynchronously | poll as in the snippet above |
| `product 'Expression' … not found in package 'homebrew-bithuman'` | an older product name; `swift package resolve` does not check product names, `swift build` does | name the product `Expression2` |
| `error: unable to resolve module dependency: 'Expression2'` on a Simulator build | the default Simulator destination also builds x86_64, and no slice carries it | add `ARCHS=arm64` |
| *Xcode managed … manually managed profile*, or `0xe800801c (No code signature found.)` at install | signing needs an automatic profile and a keychain with your identity — over SSH the keychain has none | run the `xcodebuild` line above from a logged-in GUI session |
| the app is killed mid-conversation, no crash log | the ~3 GB memory ceiling, on the `bitHumanKit` path | request both [Apple entitlements](#apple-entitlements) and declare them in `Info.plist` |
| `bitHuman needs an iPhone 16 Pro or newer` at launch | `bitHumanKit`'s own device floor, from `HardwareCheck.evaluate()`. There is no override | ship `Expression2` or `Essence2` on that device, or move above the floor |
| mic or speech start fails silently | missing `Info.plist` privacy strings; the OS caches the denial | add `NSMicrophoneUsageDescription` |
| you are looking for `essence-1` and cannot find a product for it | there is no first-generation product in the Swift package | on a Mac, render it with the [CLI](/sdk/cli) or the [Python SDK](/sdk/python); in an app, serve it from the [cloud API](/api/overview). The model itself is described on [essence-1](/concepts/essence-1) |
| avatar disappears on re-render | a fresh renderer view on every SwiftUI update | return the same instance from `makeUIView` and `updateUIView` |
| a metered render refuses | `BITHUMAN_API_KEY` unset in the app's environment | set it — the Swift SDK reads that name (same value as `BITHUMAN_API_SECRET`) |

## Examples and source

- **Expression 2** — [iOS app, end to end](/examples/swift-ios-expression2), the
  whole project printed on one page, and [`swift/ios-expression2`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-expression2)
  to clone, with a `setup.sh` that fetches the model.
- **Essence 2** — [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2),
  every file printed. **The page is the source**: there is no
  `swift/ios-essence2` directory to clone, and the page is complete without one.
- **`bitHumanKit`** — [Swift / iOS — Hello, avatar](/examples/swift-ios-hello),
  the on-device voice agent, and [`swift/ios-avatar`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-avatar)
  to clone. This is the path with the iPhone 16 Pro floor and the two Apple
  entitlements — start with Expression 2 unless you need the whole stack.
- [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — voice only, on device, no key.
- [Apple — check before you ship](/examples/apple-swiftpm-check) — verify the
  resolve, the assets and their checksums from any operating system.
- [Homebrew tap](https://github.com/bithuman-product/homebrew-bithuman) — the Swift package itself.

> **Note** The `bithuman-examples` repository also carries older Swift
> harnesses, and its `swift/README.md` still describes products named
> `Expression` and `Bithuman`. **Those products do not exist in the package this
> page pins** — the four it vends are in the table under
> [Install](#install). Where the repository README and this page disagree, this
> page is read from the tag `from: "2.14.0"` resolves.

## See also

- [LiveKit](/sdk/livekit) — subscribing to a server-hosted avatar from a native
  app, when the render is not on the device
- [CLI](/sdk/cli) — the same engines on an Apple Silicon Mac, with no Xcode
- [Performance](/sdk/performance) — measured frame rates for every platform
- [Where each model runs](/concepts/where-models-run) — which model to ship
- [SDK](/sdk) — every platform on one page
