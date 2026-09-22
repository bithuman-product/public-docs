---
title: "iOS & iPadOS SDK"
description: "Ship either second-generation model inside your own iOS, iPadOS or macOS app from one SwiftPM package: Expression 2 on any Apple Silicon device at iOS 16, Essence 2 at full resolution on iOS 26. Device floors, download sizes and a worked example for each — with a first frame from a published identity needing no account, no key and no credits."
section: sdk
group: "Platforms"
order: 40
label: "iOS & iPadOS"
---

One SwiftPM package vends both second-generation models —
[Expression 2](/concepts/expression-2) and [Essence 2](/concepts/essence-2) —
plus `bitHumanKit`, a whole on-device voice agent built around one of them.

Both models render entirely on the device, and on Apple both reach a first frame
with **no account, no key and no credits**.

| | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [a whole generated scene](/concepts/expression-2) — head, shoulders and background — at 416x720 | [your own portrait, animated](/concepts/essence-2), at up to 1920x1080, on that identity's own canvas |
| **Product to attach** | `.product(name: "Expression2", package: "homebrew-bithuman")` | `.product(name: "Essence2", package: "homebrew-bithuman")` |
| **Devices** | any Apple Silicon iPhone, iPad or Mac | any Apple Silicon iPhone; iPad with M-series; Mac with M3 or newer |
| **OS floor** | iOS 16 / macOS 13 | **iOS 26 / iPadOS 26 / macOS 26** |
| **Credential** | **none** to download or render a published identity | **none** either — the render reports itself unmetered on stderr |
| **First-run download** | about 355 MB — identity, plus the shared engine graphs every identity uses | about 250 MB — identity, plus the engine's runtime resources |
| **What it asks of you** | a Swift API; nothing to stage | you call a small C interface and stage the engine's resources yourself |
| **Worked example** | [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) | [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2) |

From `2.14.0` you may attach **both** engine products to one app. Every earlier
tag fails an app's final link with 112 duplicate symbols, so the version you
resolve is load-bearing — see [Pin the version](#pin-the-version).

## Install

In Xcode: *File → Add Package Dependencies…* and paste
`https://github.com/bithuman-product/homebrew-bithuman.git`. In a
`Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.14.0")
// then attach the engine product(s) your app uses:
//   .product(name: "Expression2", package: "homebrew-bithuman")
//   .product(name: "Essence2",    package: "homebrew-bithuman")
//   .product(name: "bitHumanKit", package: "homebrew-bithuman")
```

**Write `2.14.0`, and nothing lower.** A lower floor leaves an existing project
on an engine that never speaks, and nothing is thrown when it does —
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
download over plain `curl`: no account, no key, no credits, verified 2026-09-21
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
with your key.

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

One credential drives every surface; only the environment-variable name differs
by platform convention. The Swift SDK reads **`BITHUMAN_API_KEY`**; every other
surface reads `BITHUMAN_API_SECRET`, and the value is the same. Keys are free at
[your API keys](https://www.bithuman.ai/developer/api-keys).

| Action | Credential |
|---|---|
| Download a showcase identity, or the shared engine artifacts | none — anonymous, no account, no credits |
| Download **your own** agent's model | your key, as `-H "api-secret: $BITHUMAN_API_SECRET"` |
| Render in an app you ship | your key, in the app's environment |
| Create an agent in the first place | an account with credits — [pricing](/guides/pricing) is the authority |

Set it in Xcode under *Product → Scheme → Edit Scheme → Run → Arguments →
Environment Variables*. Never hard-code it; for production, fetch it from your
backend or the Keychain.

Metering is not silent. With no credential the session renders and says on
stderr that the render is unmetered. A credential the service rejects renders
for a 300-second grace behind a countdown and then refuses, after which
`pull_frame` returns `-3` and the engine should be destroyed.

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

The showcase identities above render without a key. A render of your own agent is
metered — [pricing](/guides/pricing) is the authority.

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

**Essence 2 does not merely under-test in the Simulator — it aborts.** Measured
2026-09-08 on the iOS 26.4 simulator: `be_essence2_create` returns 0 and the
process then raises `NSInvalidArgumentException … object cannot be nil` inside
`+[MPSGraphDevice deviceWithMTLDevice:]`, reached from the warm-up.

Every bitHuman simulator slice is **arm64 only**, so a default
`xcodebuild -destination 'generic/platform=iOS Simulator'` also builds x86_64,
finds no slice, and fails with `error: unable to resolve module dependency:
'Expression2'` — which reads like a broken package. Pass `ARCHS=arm64`.

## Pin the version

`from:` is a **floor, not a pin.** A fresh resolve takes the newest tag in the
same major, so a brand-new project lands on `v2.14.0` today. That is not the case
most readers are in: `from:` is satisfied by the floor itself, and SwiftPM
**keeps whatever `Package.resolved` already holds** — so a project you cloned, or
one a colleague resolved last month, sits on the floor that was written, not on
the newest tag.

The tags do not carry the engine, they pin one, and the pin moved:

| Tag a floor can leave you on | Essence 2 engine it pins | What you get |
|---|---|---|
| v2.11.0 – v2.13.2 | essence2-v1.4.0 – v1.6.2 | the warm-up refuses by name on an iPhone under a 16 Pro; the engine stays idle-only |
| v2.13.8 | essence2-v1.9.0 | speaks — but `Expression2` + `Essence2` in one app fails an app's final link, 112 duplicate symbols |
| **v2.14.0** | **essence2-v1.10.0** | **speaks, and both products link in one app — the behaviour this page describes** |

"Idle-only" is the whole failure: the identity's motion plays, the avatar never
speaks, **nothing is thrown and nothing is logged where you are looking.** There
is no error to search for.

The duplicate-symbol failure is just as quiet in CI: a library target is
*compiled*, never *linked*, so `swift build` and a package-level `xcodebuild`
both exit 0 on a project that cannot link as an app.

So if you inherited a project, do both halves:

1. Raise the floor in the manifest to `from: "2.14.0"`.
2. **Force the resolve** — `Package.resolved` does not move on its own. In
   Xcode: *File → Packages → Update to Latest Package Versions*. From the
   command line: `swift package update`.

Then read back what you are actually on, which is the only answer that counts:

```bash
# in your project directory, after resolving
grep -A3 'homebrew-bithuman' Package.resolved
# the "version" it prints must be 2.14.0 or newer
```

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the avatar's face moves but never speaks, and nothing is thrown | an engine older than `essence2-v1.9.0` refused the hardware at warm-up | raise the floor to `2.14.0` and force the resolve — [Pin the version](#pin-the-version) |
| duplicate symbols at an app's final link, while `swift build` is green | a tag below v2.14.0 with both engine products attached | raise the floor to `2.14.0`; a library target is compiled, never linked, so `swift build` cannot see this |
| `401 MISSING_AUTH` from `/v1/agent/<CODE>/model/download`, anonymously | the code and `model=` family are not a free-showcase pair. A typo'd code and the wrong family both land here | check the pair against the table above or the [showcase](/showcase); drop `model=` to take the identity's own family; for your own agent send `-H "api-secret: $BITHUMAN_API_SECRET"` |
| `404 MODEL_ARTIFACT_NOT_READY` on a `member=` request | that member name is not in the container. The same code also means "trained, not published yet" for a whole model | check the member name first; poll only if you are downloading a model you just created ([error codes](/api/errors#error-codes)) |
| `409 MODEL_NOT_GENERATED`, with your key | your agent has no model of that family yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then poll `GET /v1/agent/<CODE>` until it is listed |
| the app runs, no error, no avatar; `pull()` keeps returning `nil` | you drained synchronously on the line after `feed()` — frames arrive asynchronously | poll, as in [Minimal code](#minimal-code) |
| the app crashes in `__cxa_finalize` as the user closes it | `be_essence2_quiesce_all()` was never called | call it from `applicationWillTerminate` |
| `product 'Expression' … not found in package 'homebrew-bithuman'` | an older product name; `swift package resolve` does not check product names, `swift build` does | name the product `Expression2` |
| `error: unable to resolve module dependency: 'Expression2'` on a Simulator build | the default Simulator destination also builds x86_64, and no slice carries it | add `ARCHS=arm64` |
| a link failure naming `BithumanEngineProtocol` | you took that product beside `Expression2`, which already carries a binary copy | depend on `Expression2` alone |
| *Xcode managed … manually managed profile*, or `0xe800801c (No code signature found.)` at install | signing needs an automatic profile and a keychain with your identity — over SSH the keychain has none | run the `xcodebuild` line above from a logged-in GUI session |
| the app is killed mid-conversation, no crash log | the ~3 GB memory ceiling, on the `bitHumanKit` path | request both [Apple entitlements](#apple-entitlements--bithumankit-only) and declare them in `Info.plist` |
| `bitHuman needs an iPhone 16 Pro or newer` at launch | `bitHumanKit`'s own device floor. There is no override | ship `Expression2` or `Essence2` on that device, or move above the floor |
| mic or speech start fails silently | missing `Info.plist` privacy strings; the OS caches the denial | add `NSMicrophoneUsageDescription` |
| you are looking for `essence-1` and cannot find a product for it | there is no first-generation product in the Swift package | on a Mac, render it with the [CLI](/sdk/cli) or the [Python SDK](/sdk/python); in an app, serve it from the [cloud API](/api/overview). The model itself is described on [essence-1](/concepts/essence-1) |
| avatar disappears on re-render | a fresh renderer view on every SwiftUI update | return the same instance from `makeUIView` and `updateUIView` |
| a metered render refuses | `BITHUMAN_API_KEY` unset in the app's environment | set it — the Swift SDK reads that name (same value as `BITHUMAN_API_SECRET`) |

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
- [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — voice only, on device, no key.
- [Homebrew tap](https://github.com/bithuman-product/homebrew-bithuman) — the Swift package itself.

> **Note** The `bithuman-examples` repository also carries older Swift harnesses,
> and its `swift/README.md` still describes products named `Expression` and
> `Bithuman`. **Those products do not exist in the package this page pins** — the
> four it vends are in the table under [Install](#install).

## See also

- [LiveKit](/sdk/livekit) — subscribing to a server-hosted avatar from a native
  app, when the render is not on the device
- [CLI](/sdk/cli) — the same engines on an Apple Silicon Mac, with no Xcode
- [Performance](/sdk/performance) — measured frame rates for every platform
- [Where each model runs](/concepts/where-models-run) — which model to ship
- [SDK](/sdk) — every platform on one page
