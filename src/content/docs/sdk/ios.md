---
title: "Apple SDK — iOS, iPadOS and macOS"
description: "Ship either second-generation model inside your own iPhone, iPad or Mac app from one SwiftPM package: Expression 2 on any Apple Silicon device at iOS 16, Essence 2 at full resolution on iOS 26. Device floors, download sizes, what a Mac app needs, the key Essence 2 reads, and a worked example for each — Expression 2 reaches a first frame from a published identity with no account, no key and no credits."
section: sdk
group: "Platforms"
order: 40
label: "iOS, iPadOS & macOS"
---

One SwiftPM package vends both second-generation models —
[Expression 2](/concepts/expression-2) and [Essence 2](/concepts/essence-2) —
plus `bitHumanKit`, a whole on-device voice agent built around one of them.

Both models render entirely on the device. Expression 2 reaches a first frame
with **no account, no API secret and no credits**. Essence 2 needs an API secret before
it will start a session — [Authentication](#authentication).

Starting on a Mac rather than a phone? Go to [On a Mac](#on-a-mac) —
everything here ships a `macos-arm64` slice, and the Mac path asks for no
device, no profile and no entitlement.

| | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [a whole generated scene](/concepts/expression-2) — head, shoulders and background — at 416x720 | [your own portrait, animated](/concepts/essence-2), at up to 1920x1080, on that identity's own canvas |
| **Product to attach** | `.product(name: "Expression2", package: "homebrew-bithuman")` | `.product(name: "Essence2", package: "homebrew-bithuman")` |
| **Devices** | any Apple Silicon iPhone, iPad or Mac | any Apple Silicon iPhone; iPad with M-series; Mac with M3 or newer |
| **OS floor** | iOS 16 / macOS 13 | **iOS 26 / iPadOS 26 / macOS 26** |
| **Credential** | **none** to download or render a published identity | **none** to download; **an API secret to render** — `BITHUMAN_API_SECRET` or `be_essence2_set_api_secret()`. With neither, `be_essence2_create` returns `-3` |
| **First-run download** | about 355 MB — identity, plus the shared engine graphs every identity uses | about 250 MB — identity, plus the engine's runtime resources |
| **What it asks of you** | a Swift API; nothing to stage | you call a small C interface and stage the engine's resources yourself |
| **Worked example** | [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) | [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2) |

From `2.14.1` a new app on either platform can attach **both** engine
products, with no linker settings added by hand. Earlier tags fail in three
different ways, and none of them throws, so the version you resolve matters —
see [Pin the version](#pin-the-version).

## Install

In Xcode: *File → Add Package Dependencies…* and paste
`https://github.com/bithuman-product/homebrew-bithuman.git`. In a
`Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.14.1")
// then attach the engine product(s) your app uses:
//   .product(name: "Expression2", package: "homebrew-bithuman")
//   .product(name: "Essence2",    package: "homebrew-bithuman")
//   .product(name: "bitHumanKit", package: "homebrew-bithuman")
```

**Write `2.14.1`, and nothing lower.** A lower floor can leave a Mac app that
Xcode refuses to build, an Essence 2 app that fails its final link, or an
engine that never speaks, and nothing is thrown in the last case —
[why, and how to check](#pin-the-version).

| Product | You write | What it is |
|---|---|---|
| `Expression2` | `import Expression2` | the Expression 2 engine, pre-compiled, with a Swift API |
| `Essence2` | `import Essence2` | the Essence 2 engine as a static C library, plus the ONNX Runtime build its audio head needs at link |
| `bitHumanKit` | `import bitHumanKit` | the voice-agent umbrella: recognition, LLM, speech, avatar, renderer views |
| `BithumanEngineProtocol` | `import BithumanEngineProtocol` | the source-only common engine interface. Do **not** take it beside `Expression2`, which already carries a binary copy — the module arrives twice and the app fails to link |

Every slice is `ios-arm64`, `ios-arm64-simulator` and `macos-arm64`. There is no
`Expression` product and no `Bithuman` product — those are older spellings, and
`swift build`, not `swift package resolve`, is what tells you so.

Set your app's deployment target to **iOS 26 / macOS 26** when you link
`Essence2`. The package's own floor is lower (iOS 16, macOS 13) because
`Expression2` needs it, but the Essence 2 objects are built for 26.0 and linking
them lower makes `ld` warn on every object.

## What Essence 2 needs at link

**From `2.14.1`: nothing.** The `Essence2` product declares the four Apple
libraries itself, so attaching it is the whole step. On 2026-09-23 a new
App-template project on macOS and on iOS, taking `Essence2` and `Expression2`
from `2.14.1` with no linker settings of its own, built for macOS, the iOS
Simulator and an iOS device, and rendered on the Mac.

**On `2.14.0` or earlier** you add them yourself. `Essence2` is a **static C
library**, so nothing in it tells your target what Apple libraries it calls.
Attaching the product compiles fine and then fails at the link with hundreds of
undefined symbols. Four settings fix it, and all four are required — measured
on 2026-09-22 against the artifacts the `2.14.0` tag carries, on macOS 26.5
with Xcode 26.5:

```swift
// in the target that links Essence2 — only needed below 2.14.1
linkerSettings: [
    .linkedLibrary("c++"),
    .linkedFramework("VideoToolbox"),
    .linkedFramework("Accelerate"),
    .linkedFramework("CoreML"),
]
```

In Xcode the same four go under your app target's *Build Phases → Link Binary
With Libraries*: `libc++.tbd`, `VideoToolbox.framework`,
`Accelerate.framework`, `CoreML.framework`.

Each one was dropped on its own from a working link to see what it is for, so
the symbol you are looking at names the setting you are missing:

| Missing | Undefined symbols | What they are |
|---|---|---|
| `libc++` | 316, starting `___cxa_allocate_exception`, `operator new`, `std::__1::…` | the C++ standard library the engine is written against |
| `VideoToolbox` | 5 — `_VTDecompressionSessionCreate`, `…DecodeFrame`, `…Invalidate`, `…FinishDelayedFrames`, `…WaitForAsynchronousFrames` | the hardware video decoder that unpacks the identity's motion |
| `Accelerate` | 27 — `_BNNSFilter*`, `_cblas_sgemm$NEWLAPACK`, and the LAPACK entry points | the CPU matrix routines |
| `CoreML` | 5 — `_OBJC_CLASS_$_MLModel`, `MLMultiArray`, `MLModelConfiguration`, `MLDictionaryFeatureProvider`, `MLPredictionOptions` | the on-device model runner |

With all four, a plain SwiftPM executable that calls
`be_essence2_quiesce_all()` links and runs. Nothing else is needed: Metal and
its graph framework arrive through CoreML and Accelerate.

> **Note** Every `Essence2` link also prints `ld: warning: Could not find or use
> auto-linked framework 'CoreAudioTypes'`. `CoreAudioTypes` is not a standalone
> framework on any current Apple platform — the reference is baked into
> the Essence 2 static library as a linker option. It is a warning, the link succeeds, and
> there is nothing to add.

`Expression2` and `bitHumanKit` need none of this. They are Swift frameworks
and record what they link.


## Minimal code

### Expression 2

`Expression2Engine` opens the container you downloaded directly — you do not
unpack it yourself. `stagingDir:` is a writable directory the engine unpacks the
members into once; keep it between launches and the second start is faster.

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
still takes it: `Expression2Engine.create(modelPath:sharedEngineDir:)`. That is
the one the worked example uses, because its `setup.sh` unpacks first. Both are
current; the container form above saves you the unpack step.

### Essence 2

`Essence2` vends a C interface, not a Swift class. These are the calls a minimal
app makes, copied from the shipped `Headers/be_essence2.h` and identical in all
three slices — read from the `essence2-v1.10.0` xcframework on 2026-09-22, which
is the engine `2.14.0` pins:

```c
int32_t be_essence2_create(const char* lab_path, const char* motion_dir,
                           int32_t chunk, be_essence2_handle* out_handle);
int32_t be_essence2_is_ready(be_essence2_handle handle);
void    be_essence2_get_info(be_essence2_handle handle,
                             int32_t* width, int32_t* height);
int32_t be_essence2_push_audio(be_essence2_handle handle,
                               const int16_t* samples, int32_t count);
int32_t be_essence2_frames_available(be_essence2_handle handle);
int32_t be_essence2_pull_frame(be_essence2_handle handle,
                               uint8_t* out, int32_t capacity);
void    be_essence2_destroy(be_essence2_handle handle);
int32_t be_essence2_quiesce_all(int32_t timeout_ms);
```

The call order: `create` with the path to the `.imx` you downloaded (pass `NULL`
for `motion_dir`, `0` for `chunk`), then poll `is_ready` — `create` returns long
before the engine can render, and until `is_ready` returns 1 you get idle frames
only. Then `get_info` to size a frame buffer, push 16 kHz mono **int16** audio,
and pull `height * width * 3` RGB frames until `frames_available` returns 0.
`push_audio` returning `-2` means nothing was queued: pull frames and push the
same samples again. `destroy` at the end.

> **Warning** **`be_essence2_quiesce_all()` is not optional, and leaving it out
> crashes your app on exit.** Call it from the host app's
> `applicationWillTerminate` **before** process exit: exiting with a GPU
> evaluation or a Metal completion handler still in flight crashes in
> `__cxa_finalize`. It stops every live engine, blocks until their background
> work has drained — bounded by the `timeout_ms` you pass — and returns how many
> it stopped. An app that renders perfectly and dies as the user closes it is
> this call missing.

The engine also refuses the *older* bundle-directory format its own header
comment still describes. Pass the `.imx` exactly as the download endpoint serves
it; those older spellings are legacy names kept for compatibility
([what the names mean](/concepts/avatars-imx#the-engine-value-is-a-legacy-name)).

The nine other functions the header declares — barge-in, display modes, idle
frames, render status and the playout counters — are on the
[iOS API reference](/sdk/ios-api).

## Get a model

No engine ships weights. You fetch an identity and — for Expression 2 — the
shared engine graphs every identity uses. Every file below is an anonymous
download over plain `curl`: no account, no API secret, no credits, verified 2026-09-21
with no credential in the environment.

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
#    identity. The `mac` build is the right one for an iPhone app: its graphs
#    are CoreML packages compiled on the device at first launch, and the name
#    says which machine downloads it, not which one runs it.
curl -fLO \
  "https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/engines/expression-2/mac-arm64-1.0.0.engine"

# 3. 16 kHz mono speech to drive it (636 KB) — the identity's own bundle has one
curl -fL -o speech16k.wav \
  "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2&member=demo_speech_16k.wav"
```

**Essence 2** — the identity, plus the engine's runtime resources. SwiftPM cannot
ship the second file, so you place it yourself: unzip it at your app bundle's
`Resources` root, keeping the two `.bundle` directories intact. Linking succeeds
without it; starting a session does not.

```bash
# 1. the identity (148 MB). A62SJB3901 is Kwame, an Essence 2 showcase identity.
curl -fL -o A62SJB3901.imx \
  "https://api.bithuman.ai/v1/agent/A62SJB3901/model/download?model=essence-2"

# 2. the engine's runtime resources (100 MB): its Metal libraries, the idle
#    audio and the audio encoder.
curl -fLO \
  "https://github.com/bithuman-product/homebrew-bithuman/releases/download/essence2-v1.10.0/libessence2-resources.zip"
```

Both identity files and the shared engine artifact are `IMX\0` containers, and
the first four bytes say so — `xxd -l 4 A23WJF0199.imx` prints
`494d 5800   IMX.` (the fourth byte is a NUL, which is why `xxd` prints a dot).
A file that fails that check is a truncated or redirected download.

The CLI fetches the same bytes with no account if you would rather not write
URLs: `bithuman pull wise-pup`, `bithuman pull kwame-warm-museum-guide`, or
`bithuman pull <YOUR_AGENT_CODE>` — see the [CLI](/sdk/cli). Your own agent's
file comes from
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
with your API secret.

### Showcase identities you can download right now

Verified anonymously on 2026-09-21 — every row answered a signed URL with no
credential. Sizes here are binary megabytes.

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

## Authentication

One credential drives every surface: your API secret, free at
[your API secrets](https://www.bithuman.ai/developer/api-keys). The environment
variable is `BITHUMAN_API_SECRET`; `bitHumanKit` 2.4.0 takes it through
`config.apiKey`, a field that keeps its published name.

| Product | Reads | Without it |
|---|---|---|
| `Essence2` | **`BITHUMAN_API_SECRET`**, or the API secret you pass to `be_essence2_set_api_secret()` before `be_essence2_create` | `be_essence2_create` returns `-3` and prints `refusing to serve: no credential was supplied` on stderr |
| `bitHumanKit` | `config.apiKey` — set it to your API secret (read `BITHUMAN_API_SECRET` into it) | avatar mode fails with `VoiceChatError.missingAPIKey`; audio-only runs without one |
| `Expression2` | nothing — it has no metering of its own | renders |

| Action | Credential |
|---|---|
| Download a showcase identity, or the shared engine artifacts | none — anonymous, no account, no credits |
| Download **your own** agent's model | your API secret, as `-H "api-secret: $BITHUMAN_API_SECRET"` |
| Render in an app you ship | your API secret, in the app's environment |
| Create an agent in the first place | an account with credits — [pricing](/guides/pricing) is the authority |

Set it in Xcode under *Product → Scheme → Edit Scheme → Run → Arguments →
Environment Variables*. Never hard-code it; for production, fetch it from your
backend or the Keychain.

Essence 2 checks the API secret when the session starts, and a definite answer is
final. Measured on 2026-09-23 with `essence2-v1.10.0` (what `2.14.1` pins) in a
new Mac app:

| At `be_essence2_create` | Result |
|---|---|
| no credential | `-3`, `refusing to serve: no credential was supplied, so this render cannot be attributed to an account` |
| an API secret the service rejects | `-3`, `refusing to serve: the API secret was rejected — revoked, or from another environment. (401)` |
| a valid API secret | `0`; stderr prints `metering on …`, and the session's last beat is delivered when you destroy it and call `be_essence2_quiesce_all()` |
| an API secret, but `api.bithuman.ai` cannot be reached | `0`, and stderr says `could not reach …/v1/auth/validate … PROCEEDING`. In a sandboxed Mac app that is what a missing **Outgoing Connections (Client)** entitlement looks like — see [On a Mac](#on-a-mac) |

A key the service starts rejecting in the middle of a session renders for a
300-second grace behind a countdown and then refuses, after which `pull_frame`
returns `-3` and the engine should be destroyed.

## Run

In Xcode: *Signing & Capabilities* → your team → select your iPhone → **Run**.
Automatic signing creates a development profile for a paired, trusted phone the
first time. `Info.plist` needs `NSMicrophoneUsageDescription` to hear the user,
and `NSSpeechRecognitionUsageDescription` as well if you use `bitHumanKit`'s
recognition.

From the command line, on a logged-in GUI session (an SSH session has no keychain
identity, and signing needs one):

```bash
xcodebuild -scheme <YourScheme> -destination 'generic/platform=iOS' \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=<YOUR_TEAM_ID> \
  -allowProvisioningUpdates build
```

The showcase identities above render without an API secret. A render of your own agent is
metered — [pricing](/guides/pricing) is the authority.

## On a Mac

Every product on this page ships a `macos-arm64` slice, so a Mac is not a
second-class target here — it is the easiest one. There is no device to pair,
no provisioning profile, no entitlement to request and no Simulator caveat, and
`swift run` is the whole build step.

Pick the first row that is true of you:

| You want | Take this | Account? |
|---|---|---|
| to see it work, without writing code | `brew install bithuman-product/bithuman/bithuman-cli` then `bithuman run` — the [CLI](/sdk/cli) | none |
| an avatar inside your own Mac app, in Swift | this package: `import Expression2` (or `Essence2`), exactly as below — and [A Mac app](#a-mac-app) if it is an Xcode app rather than a `swift run` executable | none for Expression 2 with a showcase identity; a key for Essence 2 |
| an avatar from a Python script on the Mac | the macOS arm64 wheel — [Python SDK](/sdk/python) | an API secret |
| a whole on-device voice agent in a Mac app | `import bitHumanKit`. Apple Silicon M3 or newer, macOS 26 | an API secret for avatar mode |

The shortest native path is one file. Measured on a MacBook Pro (Apple M4 Max,
macOS 26.5, Xcode 26.5, Swift 6.3.2) on 2026-09-22, against the free showcase
identity `A23WJF0199`, with the machine busy with other work:

```text
engine ready: 416x720, isReady=true
audio: 325451 samples, 20.34 s
generated 407 frames in 13.02 s (31.3 FPS, 1.56x real time) -> out/first-frame.png
```

That frame reads 416x720, min 0, max 255, mean 102.91 — a picture, not an empty
buffer. The whole program is
[`swift/macos-expression2`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-expression2):
its `setup.sh` fetches the identity, the shared engine graphs and a WAV with no
credential in the environment, and `swift run -c release MacOSExpression2`
renders. First run spends most of its time compiling the engine's graphs for
your machine; keep the staging directory and the next start is much faster.

> **Note** Linking `Expression2` on a Mac prints ten linker warnings naming
> `/Users/…/Build/Intermediates.noindex/…` — directories on the machine that
> built the framework, not yours. The published framework carries debug paths
> whose object files are not in the archive. The link succeeds and the binary
> runs; there is nothing for you to do.

### A Mac app

An Xcode **app** (*File → New → Project → macOS → App*) differs from a
`swift run` executable in three ways that matter here. Each was measured on
2026-09-23 with a new App-template project on Xcode 26.4.1, taking
`Expression2` and `Essence2` from `2.14.1`:

1. **Resolve `2.14.1` or newer.** Xcode copies each framework of the package
   into *Contents/Frameworks* and then validates the app. Through `2.14.0`
   the macOS frameworks had the iPhone bundle layout, and validation stops the
   build: `Framework …/Expression2.framework contains Info.plist, expected
   Versions/Current/Resources/Info.plist since the platform does not use
   shallow bundles`. This happens with `Essence2` alone too, because it
   carries `UnifiedModelHeader`. A `swift run` executable never sees it,
   because it embeds no framework.
2. **The template turns on App Sandbox, so give the app a network client.**
   Under *Signing & Capabilities → App Sandbox*, tick **Outgoing Connections
   (Client)** (`com.apple.security.network.client`). Without it Essence 2
   still starts, but its key check and its metering beats cannot leave the
   machine: stderr says `could not reach https://api.bithuman.ai/v1/auth/validate`.
   With it the session validates and its final beat is delivered.
3. **Ship the models and the engine resources inside the app.** A sandboxed
   app reads its own bundle and its own container, and nothing else by
   default. Add the `.imx` files (and, for Expression 2, the shared engine
   file) as a folder reference, and unzip the Essence 2 engine resources from
   [Get a model](#get-a-model) into the target as a group so each file lands
   in *Contents/Resources*. The
   engines write their staging and compiled-model caches into the app's
   container on their own.

What that app did on an Apple M5 (macOS 26.6.2), using the same 20.34 s WAV for
both models:

| | Expression 2 (`A23WJF0199`) | Essence 2 (`A62SJB3901`) |
|---|---|---|
| open → ready | 0.98 s | 2.19 s |
| speech frames for 20.34 s of audio | 407 (20 fps × 20.34 s) | 509 (25 fps × 20.34 s) |
| idle | the 149-frame clip plays through to frame 148, then wraps to 0 | the driver video plays on; no frame jumps larger than idle's own |
| barge-in mid-sentence (`resetState(clearFrames: true)` / `be_essence2_reset`) | 0 speech frames after the cut | 0 speech frames after the cut |
| next utterance after the cut (3 s) | 60 frames | 75 frames |

## Requirements

Every path needs a Mac with **Xcode 26 or newer**, an Apple Developer team, and a
physical device you have paired and trusted. The three products do **not** share
a floor:

| You ship | Device floor | OS floor | Apple entitlements |
|---|---|---|---|
| [Expression 2](/concepts/expression-2) | any Apple Silicon iPhone, iPad or Mac | iOS 16 / macOS 13 | none |
| [Essence 2](/concepts/essence-2) | any Apple Silicon iPhone; iPad with M-series; Mac with M3 or newer | iOS 26 / iPadOS 26 / macOS 26 | none |
| A whole voice agent (`bitHumanKit`) | iPhone 16 Pro or newer; iPad Pro M4 or newer (16 GB) | iOS 26 / iPadOS 26 / macOS 26 | **two, 1–3 business days** |

These are enforced at run time, not advice — but **only `bitHumanKit` carries the
iPhone 16 Pro floor.** Neither engine product is held to it: `Expression2` has no
hardware gate at all, and from `essence2-v1.9.0` Essence 2 renders on any Apple
Silicon iPhone — an iPhone 15 was measured rendering Essence 2 at 1920x1080
faster than the rate it plays at, and that cell is on the
[performance page](/sdk/performance).

> **Note** If you read `Package.swift` you will find a comment saying Essence 2
> needs an iPhone 16 Pro. It is dated 2026-09-08 and was measured on an earlier
> engine; the iPhone 15 measurement above is twelve days newer and stands. If
> your own iPhone 15 refuses at warm-up, you are on an engine older than
> `essence2-v1.9.0` — check what you resolved before buying a phone.

### Apple entitlements — `bitHumanKit` only

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

Neither engine product needs an entitlement to build, link or render.

### Build on a device, not the Simulator

A Simulator build is useful for layout and wiring, and proves nothing about the
phone: the hardware checks read `hw.machine`, which in a Simulator is not your
phone's.

**Essence 2 does not run in the Simulator.** Measured 2026-09-23 on the iOS 26.4
simulator with `essence2-v1.10.0`: `be_essence2_create` returns `-2` — the
engine cannot decode the identity's mouth-interior video there — after stderr
prints `MpsGraph backend validation on incompatible OS`. It is a clean refusal now.
On `essence2-v1.4.0`–`v1.5.x` (2026-09-08) the process aborted instead. The
same app's Expression 2 path renders in the Simulator: 407 speech frames for
20.34 s of audio.

Every bitHuman simulator slice is **arm64 only**, so a default
`xcodebuild -destination 'generic/platform=iOS Simulator'` also builds x86_64,
finds no slice, and fails with `error: unable to resolve module dependency:
'Expression2'` — which reads like a broken package. Pass `ARCHS=arm64`.

## Pin the version

`from:` is a **floor, not a pin.** A fresh resolve takes the newest tag in the
same major, so a brand-new project lands on `v2.14.1` today. That is not the case
most readers are in: `from:` is satisfied by the floor itself, and SwiftPM
**keeps whatever `Package.resolved` already holds** — so a project you cloned, or
one a colleague resolved last month, sits on the floor that was written, not on
the newest tag.

The tags do not carry the engine, they pin one, and the pin moved:

| Tag a floor can leave you on | Essence 2 engine it pins | What you get |
|---|---|---|
| v2.11.0 – v2.13.2 | essence2-v1.4.0 – v1.6.2 | the warm-up refuses by name on an iPhone under a 16 Pro; the engine stays idle-only |
| v2.13.8 | essence2-v1.9.0 | speaks — but `Expression2` + `Essence2` in one app fails an app's final link, 112 duplicate symbols |
| v2.14.0 | essence2-v1.10.0 | speaks, and both products link in one app — but a macOS **app** fails Xcode's validation (the macOS frameworks are shallow bundles), and `Essence2` needs four linker settings added by hand |
| **v2.14.1** | **essence2-v1.10.0** | **all of the above fixed: `Expression2` v2.6.4 ships versioned macOS frameworks, and `Essence2` declares its own linker settings — the behaviour this page describes** |

"Idle-only" is the whole failure: the identity's motion plays, the avatar never
speaks, **nothing is thrown and nothing is logged where you are looking.** There
is no error to search for.

The duplicate-symbol failure is just as quiet in CI: a library target is
*compiled*, never *linked*, so `swift build` and a package-level `xcodebuild`
both exit 0 on a project that cannot link as an app.

So if you inherited a project, do both halves:

1. Raise the floor in the manifest to `from: "2.14.1"`.
2. **Force the resolve** — `Package.resolved` does not move on its own. In
   Xcode: *File → Packages → Update to Latest Package Versions*. From the
   command line: `swift package update`.

Then read back what you are actually on, which is the only answer that counts:

```bash
# in your project directory, after resolving
grep -A3 'homebrew-bithuman' Package.resolved
# the "version" it prints must be 2.14.1 or newer
```

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the avatar's face moves but never speaks, and nothing is thrown | an engine older than `essence2-v1.9.0` refused the hardware at warm-up | raise the floor to `2.14.1` and force the resolve — [Pin the version](#pin-the-version) |
| duplicate symbols at an app's final link, while `swift build` is green | a tag below v2.14.0 with both engine products attached | raise the floor to `2.14.1`; a library target is compiled, never linked, so `swift build` cannot see this |
| `401 MISSING_AUTH` from `/v1/agent/<CODE>/model/download`, anonymously | the code and `model=` family are not a free-showcase pair. A typo'd code and the wrong family both land here | check the pair against the table above or the [showcase](/showcase); drop `model=` to take the identity's own family; for your own agent send `-H "api-secret: $BITHUMAN_API_SECRET"` |
| `404 MODEL_ARTIFACT_NOT_READY` on a `member=` request | that member name is not in the container. The same code also means "trained, not published yet" for a whole model | check the member name first; poll only if you are downloading a model you just created ([error codes](/api/errors#error-codes)) |
| `409 MODEL_NOT_GENERATED`, with your API secret | your agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll `GET /v1/agent/<CODE>` until it is listed |
| the app runs, no error, no avatar; `pull()` keeps returning `nil` | you drained synchronously on the line after `feed()` — frames arrive asynchronously | poll, as in [Minimal code](#minimal-code) |
| the app crashes in `__cxa_finalize` as the user closes it | `be_essence2_quiesce_all()` was never called | call it from `applicationWillTerminate` |
| hundreds of undefined symbols at an app's final link — `___cxa_…`, `std::__1::…`, `_VTDecompressionSession…`, `_BNNSFilter…`, `_OBJC_CLASS_$_MLModel` | a tag below `2.14.1`: `Essence2` is a static C library, and before 2.14.1 the product declared none of the Apple libraries it calls | raise the floor to `2.14.1` and force the resolve; or, on an older tag, add all four link settings — [What Essence 2 needs at link](#what-essence-2-needs-at-link) |
| `Framework …/Contents/Frameworks/Expression2.framework contains Info.plist, expected Versions/Current/Resources/Info.plist since the platform does not use shallow bundles` (or `UnifiedModelHeader` / `BithumanEngineProtocol`) building a **Mac app** | a tag below `2.14.1`: its macOS frameworks were iPhone-shaped bundles | raise the floor to `2.14.1` and force the resolve — [A Mac app](#a-mac-app) |
| `be_essence2_create` returns `-3`; stderr: `refusing to serve: no credential was supplied` | Essence 2 got no API secret. It reads `BITHUMAN_API_SECRET` (essence2-v1.10.0 does not read BITHUMAN_API_KEY, the deprecated alias) | set `BITHUMAN_API_SECRET` in the scheme's environment, or call `be_essence2_set_api_secret()` before `be_essence2_create` — [Authentication](#authentication) |
| `be_essence2_create` returns `-3`; stderr: `refusing to serve: the API secret was rejected … (401)` | the API secret is revoked, mistyped or from another environment | create a new one at [your API secrets](https://www.bithuman.ai/developer/api-keys) |
| a sandboxed Mac app renders Essence 2 but stderr says `could not reach https://api.bithuman.ai/v1/auth/validate` | App Sandbox without the network-client entitlement: the API secret cannot be checked and no beat leaves the machine | *Signing & Capabilities → App Sandbox → Outgoing Connections (Client)* — [A Mac app](#a-mac-app) |
| `ld: warning: Could not find or use auto-linked framework 'CoreAudioTypes'` | a linker option baked into the Essence 2 static library naming a framework that does not exist on its own | nothing — the link succeeds |
| ten linker warnings naming `/Users/…/Build/Intermediates.noindex/…`, a path not on your Mac | the published `Expression2` framework carries debug paths whose object files are not in the archive | nothing — the build completes and the binary runs |
| `product 'Expression' … not found in package 'homebrew-bithuman'` | an older product name; `swift package resolve` does not check product names, `swift build` does | name the product `Expression2` |
| `error: unable to resolve module dependency: 'Expression2'` on a Simulator build | the default Simulator destination also builds x86_64, and no slice carries it | add `ARCHS=arm64` |
| a link failure naming `BithumanEngineProtocol` | you took that product beside `Expression2`, which already carries a binary copy | depend on `Expression2` alone |
| *Xcode managed … manually managed profile*, or `0xe800801c (No code signature found.)` at install | signing needs an automatic profile and a keychain with your identity — over SSH the keychain has none | run the `xcodebuild` line above from a logged-in GUI session |
| the app is killed mid-conversation, no crash log | the ~3 GB memory ceiling, on the `bitHumanKit` path | request both [Apple entitlements](#apple-entitlements--bithumankit-only) and declare them in `Info.plist` |
| `bitHuman needs an iPhone 16 Pro or newer` at launch | `bitHumanKit`'s own device floor. There is no override | ship `Expression2` or `Essence2` on that device, or move above the floor |
| mic or speech start fails silently | missing `Info.plist` privacy strings; the OS caches the denial | add `NSMicrophoneUsageDescription` |
| you are looking for `essence-1` and cannot find a product for it | there is no first-generation product in the Swift package | on a Mac, render it with the [CLI](/sdk/cli) or the [Python SDK](/sdk/python); in an app, serve it from the [cloud API](/api/overview). The model itself is described on [essence-1](/concepts/essence-1) |
| avatar disappears on re-render | a fresh renderer view on every SwiftUI update | return the same instance from `makeUIView` and `updateUIView` |
| `bitHumanKit` avatar mode refuses with a key error | `config.apiKey` is empty | set `config.apiKey` to your API secret — read `BITHUMAN_API_SECRET` into it, as [the hello example](/examples/swift-ios-hello) does |

## Examples and source

- **Expression 2** — [iOS app, end to end](/examples/swift-ios-expression2), the
  whole project printed on one page, and
  [`swift/ios-expression2`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-expression2)
  to clone, with a `setup.sh` that fetches the model.
- **Essence 2** — [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2),
  every file printed. **The page is the source**: there is no
  `swift/ios-essence2` directory to clone, and the page is complete without one.
- **`bitHumanKit`** — [Swift / iOS — Hello, avatar](/examples/swift-ios-hello),
  the on-device voice agent, and
  [`swift/ios-avatar`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-avatar)
  to clone. This is the path with the iPhone 16 Pro floor and the two Apple
  entitlements — start with Expression 2 unless you need the whole stack.
- [iOS API reference](/sdk/ios-api) — the full C interface, its return codes, and
  the Swift entry points.
- **On a Mac** —
  [`swift/macos-expression2`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-expression2),
  one file: a WAV in, lip-synced frames out, no account — the run measured under
  [On a Mac](#on-a-mac); and
  [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — voice only, on device, no API secret.
- [Homebrew tap](https://github.com/bithuman-product/homebrew-bithuman) — the Swift package itself.

> **Note** Until 2026-09-22 that repository's `swift/README.md` described
> products named `Expression` and `Bithuman`, which have never existed in this
> package, beside six harnesses that could not build against it. The harnesses
> are gone and the README now names the four real products. If you are reading a
> clone from before that date, the table under [Install](#install) is the
> authority.

## See also

- [LiveKit](/sdk/livekit) — subscribing to a server-hosted avatar from a native
  app, when the render is not on the device
- [CLI](/sdk/cli) — the same engines on an Apple Silicon Mac, with no Xcode
- [Performance](/sdk/performance) — measured frame rates for every platform
- [Where each model runs](/concepts/models#where-each-model-runs) — which model to ship
- [SDK](/sdk) — every platform on one page
