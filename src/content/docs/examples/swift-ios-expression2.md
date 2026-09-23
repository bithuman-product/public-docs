---
title: "Swift / iOS — a talking avatar on the iPhone you have"
description: "A complete SwiftUI app that renders a lip-synced expression-2 avatar on-device at 416x720, 20 fps. No device floor, no Apple entitlement, no account and no credits — the free-gallery identity A23WJF0199 (Wise Pup) downloads with no credential. Every file printed in full."
section: examples
group: "Examples"
order: 12
---

This page is the whole app. Copy every block on it into a new Xcode project and
you get a bitHuman avatar talking on your own iPhone, rendered on the phone,
with nothing in the loop but the phone. It was written by building it, on an
**iPhone 15 (iPhone15,4), iOS 26.6.1**, with Xcode 26.3 on macOS 26.6.2.

> **Why this page exists beside [Swift / iOS — Hello, avatar](/examples/swift-ios-hello).**
> That one uses the `bitHumanKit` umbrella and gives you far more — on-device
> speech recognition, a language model and text-to-speech, a whole voice agent.
> It also asks for an **iPhone 16 Pro or later**, **two Apple entitlements that
> take 1–3 business days to approve**, and a **~1.6 GB** first-launch download.
> This page asks for none of those three. If you want a rendered frame on the
> phone in your pocket today, start here; move to the umbrella when you want the
> conversation.

## What you get, and what you do not

| | |
|---|---|
| **Renders** | your own agent's identity, 416x720, 20 fps, entirely on the device |
| **Driven by** | a bundled 16 kHz WAV, or live microphone input |
| **Needs** | a physical Apple-Silicon iPhone or iPad — the Simulator cannot run this engine |
| **Does not need** | an iPhone 16 Pro, an Apple entitlement, a network connection at run time, or an API secret inside the app |
| **Does not include** | speech recognition, a language model or text-to-speech — the audio is yours to supply. For those, use [Hello, avatar](/examples/swift-ios-hello) or a [cloud session](/api/runtime-sessions) |
| **Costs** | nothing at run time. The download is metered at 0; on-device rendering here is not a hosted session. See [pricing](/guides/pricing) |

★ **Essence 2 is not on this page, and that is deliberate.** It is a different
engine on a different product, with its own requirements and its own walkthrough:
[Essence 2 on iPhone](/examples/swift-ios-essence2), a complete app of the same
shape. This page is `expression-2`, which needs no iOS 26 and no separate
resources archive. Do not attach both products to one app — they fail at link
with duplicate symbols ([why](/sdk/ios#install)).

## Prerequisites

- **A Mac with Xcode 26 or newer.** Older Xcodes reject the Swift 6 concurrency
  syntax the package is built with.
- **An Apple Developer team**, and an iPhone or iPad you have paired and
  trusted. Everything here is a *device* build — see
  [Signing](#5-sign-it-and-run-it-on-the-phone) below, and the fuller
  [signing section](/sdk/ios#run)
  on the SDK page.
- **An identity to render.** You have two routes, and only one of them costs
  anything:

  ★ **Route A — a free-gallery identity, no account, no key, no credits, no
  wait.** `A23WJF0199` ("Wise Pup") is a bitHuman-owned `expression-2` identity
  in the **free gallery**, and the download endpoint serves every gallery
  identity to anyone. Fetch it with `curl` and nothing else:

  ```bash
  curl -fLo agent.avatar \
    "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
  ```

  It is served with **no credential in the environment at all** — the endpoint
  answers `302` to a one-hour signed URL, which `curl -L` follows. `bithuman
  list` prints every identity this works for; pick a different face and only the
  code changes.

  ★ **Route B — your own identity**, in `ready` state, with your API secret.
  Do this when you want *your* face on the phone. Create one at
  [bitHuman](https://www.bithuman.ai) and note its `<CODE>`; the API side is
  [Agents](/api/agents). Budget **about 2–2.5 hours and 2000 credits** — see
  below.

  ★ **Why an Android agent code does not work here.** [The Android SDK
  page](/sdk/android#get-a-model) points `Expression2ModelStore` at a mirror that
  answers *anonymously*, and [the Android example](/examples/kotlin-android-hello)
  renders `A02HCY0444` with no key and no agent of your own. The reason it does
  not carry over is the **form**, not the permission. That mirror vends the
  Android and web member tree — `combined_fp32.tflite`, `combined_hexagon.tflite`,
  `enc_exp.onnx` — and **no `.avatar` container at all**, which is the only thing
  `Expression2` on Apple opens. The container comes from
  `GET /v1/agent/{code}/model/download`, which is what Route A calls.

  ★ **And that endpoint still answers `401` for most codes — deliberately.** A
  container is somebody's face, and weights cannot be recalled once handed out,
  so being *visible* in the gallery is a different permission from being
  *downloadable*. The endpoint serves the identities whose owner has authorised
  anonymous distribution — `bithuman list` is exactly that set — and refuses
  every other code with the same `401 MISSING_AUTH` an unknown code gets, so the
  door discloses nothing. Route A is inside that set; your own agent (Route B)
  is not, and needs your `api-secret`.

  ★ **Route B only — budget for this before you open Xcode: creating one takes
  about 2–2.5 hours and costs 2000 credits** — an `expression-2` creation trains a
  per-identity model on an H100-class GPU. See
  [model-specific inputs and creation times](/api/agents#model-specific-inputs-and-creation-times). Nothing on this
  page can start until that finishes, so start the creation first and read the
  rest while it trains.

  ★ **`ready` is not the same as downloadable, and the app needs downloadable.**
  The agent flips to `status: "ready"` when the identity is built; the
  `.avatar` this app bundles is *published* separately, and until it lands the
  download endpoint answers `404 MODEL_ARTIFACT_NOT_READY` — "typically within
  the hour". Usually it is minutes. It is not guaranteed, and no field on
  `GET /v1/agent/{code}` distinguishes the two, so ask the endpoint itself
  before you commit an afternoon:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  "https://api.bithuman.ai/v1/agent/<CODE>/model/download?model=expression-2"
# 302 → the artifact is there, `setup.sh` below will work
# 404 → MODEL_ARTIFACT_NOT_READY; retry, and open a ticket if it outlives the day
```
- **Nothing else.** The shared engine graphs the artifact does not carry are a
  public object too — one `curl`, no Homebrew, no CLI, no login. `setup.sh`
  below fetches them. (If you already have the CLI,
  `bithuman engine install mac` downloads that same object into
  `~/.bithuman/engines/mac-1.0.0` and works just as well.)

- About **280 MB of app**: the identity is ~190 MB and the shared graphs are
  ~91 MB, and both ship inside the app bundle.

## Run it

**Copy this page.** Everything below is the whole app — the Xcode settings,
`Info.plist`, all of `App.swift`, and the `setup.sh` that fetches the three
files the engine needs. Create an empty SwiftUI project, paste them in, and
press Run.

There is a directory in the package repository with the same Xcode target in
it, and you can clone it for the project file:

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-expression2
open IOSExpression2.xcodeproj
```

★ **But use the `setup.sh` printed on this page, not the one in that
directory.** The repository's copy is still the Route B
script — it requires `BITHUMAN_API_SECRET` and an agent code of your own and
exits 2 without them, so a keyless reader who clones and runs it gets a
usage error rather than a frame. The version below needs neither. Paste it over
the file in the clone, or just run its three commands by hand; there is nothing
else in it.

Pick your team under **Signing & Capabilities**, select your iPhone, and press
Run. Everything below is that same app, file by file, for building it yourself.

## 1. The three files your app needs

The engine needs three things at run time, and only one of them comes from the
download endpoint. This script fetches all three into `Sources/Model/`:

The second and third are the ones a reader loses time to, so read the table
before the script:

| file | where it comes from | why you need it |
|---|---|---|
| `agent.avatar` | [`GET /v1/agent/{code}/model/download?model=expression-2`](/api/agents#download-an-agents-model) — **Route A:** `A23WJF0199`, anonymous. **Route B:** your code with your `api-secret`. One endpoint, both routes | the identity — the face, the motion and the per-identity graphs |
| `shared_engine/` | `bithuman engine install mac` — the [CLI](/sdk/cli#install) fetches it from the public channel (anonymous, no login) into `~/.bithuman/engines/` | ★ the artifact does **not** carry `w2v_frontend_cpuAndNE.mlpackage`, and the engine will not start without it. The shared engine has it |
| `speech16k.wav` | [`…/model/download?member=demo_speech_16k.wav`](/api/agents#download-an-agents-model) — the same door, the same anonymous route, one file out of the identity's own bundle instead of the whole container | something for the avatar to say. 16 kHz, mono, 16-bit PCM |

★ **Why the `mac` engine, for an iOS app.** The graphs inside it are CoreML
packages, compiled on the device at first launch; they are not Mac-only code.
The engine is named for the machine that downloads it. It needs no login.
This is a real seam and it is bitHuman's to close — until then, one 91 MB
directory rides in your app bundle.

★ **Step 2 needs the [`bithuman` CLI](/sdk/cli#install) on your Mac** — one
installer line on that page; it needs no account for this. The `.avatar` and
the shared engine are opaque bitHuman model files, and `bithuman engine
install` is the shipped tool that unpacks the engine for you. Nothing on this
page, and nothing in your app, has to know what is inside one.

```bash
#!/bin/bash
# setup.sh — fetch the three things the app needs into Sources/Model/
#
# Route A (default) — no account, no key, no credits, no wait:
#     ./setup.sh
# Route B — your own identity:
#     BITHUMAN_API_SECRET=... ./setup.sh <AGENT_CODE>
set -euo pipefail
cd "$(dirname "$0")"
SHOWCASE=A23WJF0199          # "Wise Pup" — in the free gallery; `bithuman list` shows the rest
CODE="${1:-$SHOWCASE}"
mkdir -p Sources/Model

# 1. the identity.
#
#    ONE URL FOR BOTH ROUTES. The gallery identity and your own agent come
#    through the SAME door; the only difference is whether a credential rides
#    along. It answers 302 to a 1-hour signed URL (curl -L follows), rate-limits
#    the anonymous arm, and re-asks permission on every fetch.
if [ -n "${BITHUMAN_API_SECRET:-}" ] && [ "$CODE" != "$SHOWCASE" ]; then
  echo "==> downloading $CODE.avatar (your identity)"
  AUTH=(-H "api-secret: $BITHUMAN_API_SECRET")
else
  echo "==> downloading the free-gallery identity $SHOWCASE (no account needed)"
  AUTH=()
fi
curl -fL --progress-bar "${AUTH[@]+"${AUTH[@]}"}" \
  "https://api.bithuman.ai/v1/agent/$CODE/model/download?model=expression-2" \
  -o Sources/Model/agent.avatar
ls -l Sources/Model/agent.avatar

# 2. the shared speech front-end the artifact does not carry.
#    `bithuman engine install` fetches it from the public channel and lays it
#    out ready to copy — no login, no key, sha-verified on the way in.
echo "==> installing the shared engine graphs"
bithuman engine install mac
ENGINE_DIR=$(bithuman engine list --json | python3 -c '
import json, sys
print(next(e["cache_dir"] for e in json.load(sys.stdin)["engines"]
           if e["platform"] == "mac" and e["installed"]))')
rm -rf Sources/Model/shared_engine
mkdir -p Sources/Model/shared_engine
cp -R "$ENGINE_DIR"/. Sources/Model/shared_engine/

# 3. something for it to say. The identity's own bundle already carries a
#    16 kHz mono clip, so this needs no key and no TTS either — `member=`
#    asks the SAME door for ONE file out of the bundle instead of the whole
#    container, and takes the same credential (none, here) as step 1.
echo "==> downloading speech16k.wav"
curl -fL --progress-bar "${AUTH[@]+"${AUTH[@]}"}" \
  "https://api.bithuman.ai/v1/agent/$CODE/model/download?member=demo_speech_16k.wav&model=expression-2" \
  -o Sources/Model/speech16k.wav

echo "==> Sources/Model is ready:"
du -sh Sources/Model/*
```

Run with **no `BITHUMAN_API_SECRET` in the environment at all** (Route A), it
needs no account and no wait: two `curl`s, one `bithuman engine install`, and
`Sources/Model` is ready. `shared_engine/` is the 91 MB the CLI leaves in
`~/.bithuman/engines/mac-<version>/`, copied into the project. Route B, with a
key and your own `<CODE>`, prints the same three lines with your identity in
place of the first.

Sizes vary widely by identity, so read `Content-Length` rather than budgeting
from a number on this page.

> **Downloading needs no key on Route A — rendering does, from `2.14.2`.** On
> Route B, `BITHUMAN_API_SECRET` is used on your Mac to fetch a file. From package
> `2.14.2` (`Expression2` v2.6.5) the engine **bills the session it serves** (talking
> time only; idle is free) and refuses to start without your API secret:
> `Expression2Engine.create` throws `Expression2LoadError.meteringRefused` —
> *"refusing to serve: no API secret was found, …"*. While developing, set
> `BITHUMAN_API_SECRET` under *Product → Scheme → Edit Scheme → Run → Environment
> Variables* (Xcode passes it to the app on the phone when you Run); in an app you
> ship, fetch the key from your backend or the Keychain and call
> `Expression2Credential.set(key)` before `create`. Never compile a key into the
> app. See [Authentication](/sdk/ios#authentication).

## 2. The Xcode project

Two routes. **If you cloned**, `IOSExpression2.xcodeproj` is already there — open
it, set your team, skip to [step 5](#5-sign-it-and-run-it-on-the-phone).

> ### ★ A green build is not a working app, so the project refuses to build without the model
>
> `Sources/Model` is a resource **folder**, which copies whatever happens to be
> in it, so an untouched checkout builds, installs, launches, and shows you a
> blank view. The app does say `no Model/agent.avatar in the bundle — run
> ./setup.sh`, but it says it into a log, which is not where somebody who just
> watched a build succeed is looking.
>
> The `preBuildScripts` entry below refuses instead, and names the missing thing
> and the command that produces it. It checks the seam that actually catches
> people, too: the `.avatar` does **not** carry
> `w2v_frontend_cpuAndNE.mlpackage`, so `shared_engine/` has to be there
> separately.

**If you are building it yourself:** File → New → Project → **App**, SwiftUI
interface, then set exactly this much:

| setting | value | why |
|---|---|---|
| Minimum Deployments | **iOS 17.0** | measured to build and run at this floor |
| Swift Language Version | **6** | the package is built with strict concurrency |
| Signing → Team | your 10-character team id | a device build is a signed build |
| Bundle Identifier | anything you own, e.g. `com.example.ios-expression2` | it appears in the `devicectl` commands below — **substitute the one you chose**; the cloned project uses `ai.bithuman.example.ios-expression2` |
| Targeted Device Family | iPhone, iPad | the engine runs on both |

Then **File → Add Package Dependencies…**, paste

```
https://github.com/bithuman-product/homebrew-bithuman.git
```

choose **Up to Next Major Version** from **2.14.2**, and attach the
**`Expression2`** product — *not* `bitHumanKit`, and not both. Attaching
`Expression2` also brings the two binary targets its module interface needs.

> **`Expression2` and `Essence2` may share one app from 2.14.0.** Below it they
> carried overlapping objects and a device build failed its final link with
> **116 duplicate symbols**, while the Simulator was green — which is how a
> Simulator-only CI missed it. On 2026-09-23 a new app taking both from 2.14.1
> built for an iOS device, the Simulator and macOS. [Details](/sdk/ios#pin-the-version).

Finally, drag the `Model` folder from step 1 into the project and choose
**Create folder references** (blue folder, not yellow group). The app reads it
back as one directory:

```swift
Bundle.main.url(forResource: "Model", withExtension: nil)
```

If you prefer the project generated rather than clicked, this is the
[XcodeGen](https://github.com/yonaskolb/XcodeGen) spec the committed project was
made from:

```yaml
name: IOSExpression2
options:
  bundleIdPrefix: ai.bithuman.example
  deploymentTarget:
    iOS: "17.0"
packages:
  bithuman:
    url: https://github.com/bithuman-product/homebrew-bithuman.git
    from: 2.14.2
targets:
  IOSExpression2:
    type: application
    platform: iOS
    sources:
      - path: Sources
        excludes: ["Info.plist", "Model"]
      - path: Sources/Model
        type: folder
        buildPhase: resources
    dependencies:
      - package: bithuman
        product: Expression2
    preBuildScripts:
      - name: "Sources/Model must hold a real model, not the placeholder"
        basedOnDependencyAnalysis: false
        script: |
          # A resource FOLDER copies whatever is there, so without this the app
          # builds, installs and launches with no model at all and says so only
          # in a log line nobody is reading. Fail here instead, where the
          # message is unmissable.
          M="$SRCROOT/Sources/Model"
          fail() { echo "error: $1"; exit 1; }
          [ -f "$M/agent.avatar" ] || fail "Sources/Model/agent.avatar is missing — run  ./setup.sh   (or BITHUMAN_API_SECRET=... ./setup.sh <YOUR_AGENT_CODE> for your own identity)"
          SZ=$(stat -f%z "$M/agent.avatar")
          [ "$SZ" -gt 1000000 ] || fail "Sources/Model/agent.avatar is only ${SZ} B — that is an error page or a truncated download, not an avatar. Re-run ./setup.sh"
          W="$M/shared_engine/w2v_frontend_cpuAndNE.mlpackage"
          [ -d "$W" ] || fail "Sources/Model/shared_engine/w2v_frontend_cpuAndNE.mlpackage is missing — the .avatar does not carry it. Run  bithuman engine install mac  and re-run ./setup.sh"
          echo "Sources/Model OK: agent.avatar ${SZ} B, shared_engine has w2v_frontend_cpuAndNE.mlpackage"
    info:
      path: Sources/Info.plist
      properties:
        CFBundleDisplayName: Expression2
        UILaunchScreen: {}
        NSMicrophoneUsageDescription: Drive the avatar with your own voice, on-device.
        UISupportedInterfaceOrientations: [UIInterfaceOrientationPortrait]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: ai.bithuman.example.ios-expression2
        DEVELOPMENT_TEAM: ""
        CODE_SIGN_STYLE: Automatic
        SWIFT_VERSION: "6.0"
        TARGETED_DEVICE_FAMILY: "1,2"
```

## 3. `Info.plist`

The bundle keys every iOS app needs, plus one for the microphone button. The
bundled-speech demo needs no permission at all, and **neither engine on this
rail needs the increased-memory entitlements** that
[Hello, avatar](/examples/swift-ios-hello) requires — those belong to the
`bitHumanKit` umbrella.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Without CFBundleIdentifier the app builds fine and then
         `devicectl device install app` refuses the bundle with
         "Failed to get the identifier for the app to be installed". -->
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundleDisplayName</key>
    <string>Expression2</string>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>

    <!-- Only needed for the "Talk to it" button. The bundled-speech demo
         renders without any permission at all. -->
    <key>NSMicrophoneUsageDescription</key>
    <string>Drive the avatar with your own voice, on-device.</string>

    <key>UILaunchScreen</key>
    <dict/>

    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
</dict>
</plist>
```

## 4. `App.swift` — the whole app

Five things happen here and each is marked in the source:

1. **Stage the container's members by hand**, then `create(modelPath:sharedEngineDir:)`.
   The one-call form, `create(avatarContainer:…:stagingDir:)`, **works on iOS**
   from `Expression2` 2.6.3 — driven on an iPhone 15 against the package tag a
   `from: "2.14.0"` dependency resolves, it opened a published `.avatar`
   and reached `isReady` in 7.5 s (2026-09-20). Either is correct; the loop
   below is nine lines of public API and shows you every member as it lands.
2. **Keep the engine inside an `actor`.** `Expression2Engine` is a plain class
   and not `Sendable`; an actor is what makes this compile under Swift 6 *and*
   keeps the load off the main thread. Only `[UInt8]`, `Int` and `Bool` cross
   the boundary.
3. **Poll `pull()`.** Generation is asynchronous: `pull()` returns `nil` until a
   chunk lands, so a bare `while let (frame, _) = engine.pull()` on the line
   after `feed()` drains nothing, throws nothing, logs nothing and shows you an
   empty view. Feed and drain must also run **at the same time**.
4. **Pre-roll before you start the speaker.** The engine generates in chunks of
   a little over a second of audio, so feeding less than one chunk and then
   waiting produces nothing. Feed ~1.6 s first, wait for frames, and only
   then start playback — otherwise the mouth trails the sound for the whole
   utterance.
5. **Draw on an absolute 50 ms grid.** Expression 2 delivers a frame every
   50 ms — 20 fps — so the grid is `0.05`. `Task.sleep` overshoots by a couple
   of milliseconds every time; sleeping `0.05 − work` lets that error accumulate
   until playback falls behind the audio.

```swift
// IOSExpression2 — a talking bitHuman avatar on a real iPhone, on-device.
//
// Engine:  expression-2, via the `Expression2` product of the SwiftPM package
//          https://github.com/bithuman-product/homebrew-bithuman.git
// Inputs:  Sources/Model/agent.avatar        your agent's <CODE>.avatar
//          Sources/Model/shared_engine/      from `bithuman engine install mac`
//          Sources/Model/speech16k.wav       16 kHz mono PCM speech
// Output:  20 FPS lip-synced frames, drawn in SwiftUI, in sync with the audio.
//
// Nothing here is bitHuman-internal: every call is public API of the shipped
// binary. See https://docs.bithuman.ai/examples/swift-ios-expression2

import SwiftUI
import AVFoundation
import Accelerate
import Expression2

/// Everything this app prints is prefixed, so you can filter the Xcode console
/// (or `xcrun devicectl device process launch --console`) down to just this app.
func log(_ line: String) {
    NSLog("[ios-expression2] %@", line)
    // The same lines are appended to Documents/session.log, so you can read them
    // off the phone without keeping a console attached:
    //   xcrun devicectl device copy from --device <udid> \
    //     --domain-type appDataContainer \
    //     --domain-identifier ai.bithuman.example.ios-expression2 \
    //     --source Documents/session.log --destination ./session.log
    guard let docs = FileManager.default.urls(for: .documentDirectory,
                                              in: .userDomainMask).first else { return }
    let entry = Data((ISO8601DateFormatter().string(from: Date()) + "  " + line + "\n").utf8)
    let p = docs.appendingPathComponent("session.log")
    if let h = try? FileHandle(forWritingTo: p) {
        h.seekToEndOfFile(); h.write(entry); try? h.close()
    } else {
        try? entry.write(to: p)
    }
}

// MARK: - 1. Where the three inputs live in the app bundle

enum Payload {
    static var root: URL? { Bundle.main.url(forResource: "Model", withExtension: nil) }
    static var avatarContainer: URL? { root?.appendingPathComponent("agent.avatar") }
    static var sharedEngineDir: URL? { root?.appendingPathComponent("shared_engine") }
    static var speechWAV: URL? { root?.appendingPathComponent("speech16k.wav") }
}

// MARK: - 2. A 16-bit PCM WAV reader (no AVFoundation decode needed)

func readPCM16MonoWAV(_ url: URL) -> [Float] {
    guard let d = try? Data(contentsOf: url), d.count > 44 else { return [] }
    var i = 12, off = -1, len = 0
    while i + 8 <= d.count {
        let id = String(bytes: d[i..<i+4], encoding: .ascii) ?? ""
        let sz = Int(d[i+4]) | Int(d[i+5]) << 8 | Int(d[i+6]) << 16 | Int(d[i+7]) << 24
        if id == "data" { off = i + 8; len = min(sz, d.count - off); break }
        if sz <= 0 { break }
        i += 8 + sz + (sz & 1)
    }
    guard off > 0, len > 1 else { return [] }
    var out = [Float](repeating: 0, count: len / 2)
    d.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
        let base = raw.baseAddress!.advanced(by: off)
        out.withUnsafeMutableBufferPointer { o in
            for k in 0..<(len / 2) {
                let lo = UInt16(base.load(fromByteOffset: k * 2, as: UInt8.self))
                let hi = UInt16(base.load(fromByteOffset: k * 2 + 1, as: UInt8.self))
                o[k] = Float(Int16(bitPattern: lo | (hi << 8))) / 32768.0
            }
        }
    }
    return out
}

// MARK: - 3. The engine lives inside an actor
//
// `Expression2Engine` is a plain class and is not Sendable. Keeping it inside an
// actor is what lets this compile under Swift 6 strict concurrency AND keeps the
// ~7 s first load off the main thread. Only Sendable values ([UInt8], Int, Bool)
// ever cross the boundary.

actor Renderer {
    private var engine: Expression2Engine?
    private(set) var width = 0
    private(set) var height = 0

    /// Stage the container's members to disk, then start the engine.
    ///
    /// `create(avatarContainer:…:stagingDir:)` does all of this in one call and
    /// works on iOS from Expression2 2.6.3. Doing it by hand costs nine lines and
    /// gives you the member list to show progress against. See the doc page.
    func load(avatar: URL, sharedEngine: URL, staging: URL) throws -> String {
        let fm = FileManager.default
        let dir = staging.appendingPathComponent("avatar", isDirectory: true)
        try? fm.removeItem(at: dir)
        try fm.createDirectory(at: dir, withIntermediateDirectories: true)

        let members = try Expression2Container.members(of: avatar)
        for m in members {
            let dst = dir.appendingPathComponent(m.name)
            try fm.createDirectory(at: dst.deletingLastPathComponent(),
                                   withIntermediateDirectories: true)
            try Expression2Container.read(m.name, from: avatar).write(to: dst)
        }

        // Ask before you start, rather than catching a throw.
        let missing = Expression2Engine.missingMembers(avatarDir: dir,
                                                       sharedEngineDir: sharedEngine)
        guard missing.isEmpty else {
            throw NSError(domain: "IOSExpression2", code: 1, userInfo: [
                NSLocalizedDescriptionKey:
                    "missing member(s): \(missing.joined(separator: ", "))"])
        }

        // From 2.14.2 the engine bills the session and needs your API secret. This reads
        // BITHUMAN_API_SECRET (the scheme's Run environment) — which the SDK would also
        // read on its own; an app you ship sets the key it fetched from your backend.
        if let key = ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"], !key.isEmpty {
            Expression2Credential.set(key)
        }
        let e = try Expression2Engine.create(modelPath: dir, sharedEngineDir: sharedEngine)
        engine = e
        width = e.width
        height = e.height
        return "\(members.count) members staged · \(e.width)x\(e.height) · isReady=\(e.isReady)"
    }

    func idleFrame() -> [UInt8]? { engine?.idle }
    func feed(_ samples: [Float]) { engine?.feed(samples) }
    func flushTail() { engine?.flushTail() }
    func reset() { engine?.resetState(clearFrames: true) }

    /// Generation is ASYNCHRONOUS: `pull()` returns nil until a chunk of frames
    /// lands, so a bare `while let` right after `feed()` drains nothing. The
    /// engine buffers what it has produced, so you do not need a queue of your
    /// own — ask it for one frame per display tick and read `queuedFrames` to
    /// see how far ahead it is.
    func pullOne() -> [UInt8]? { engine?.pull()?.frame }
    func queued() -> Int { engine?.queuedFrames ?? 0 }
}

// MARK: - 4. BGR888 → CGImage. Two vImage passes and no intermediate copy, so
// this keeps up with 20 FPS even in a Debug build.

func makeCGImage(_ bgr: [UInt8], _ w: Int, _ h: Int) -> CGImage? {
    let n = w * h
    guard w > 0, h > 0, bgr.count >= n * 3 else { return nil }
    let bytes = n * 4
    guard let out = malloc(bytes) else { return nil }
    bgr.withUnsafeBufferPointer { sBuf in
        guard let s = sBuf.baseAddress else { return }
        var src = vImage_Buffer(data: UnsafeMutableRawPointer(mutating: s),
                                height: vImagePixelCount(h), width: vImagePixelCount(w),
                                rowBytes: w * 3)
        var dst = vImage_Buffer(data: out, height: vImagePixelCount(h),
                                width: vImagePixelCount(w), rowBytes: w * 4)
        // BGR888 -> (255,B,G,R), then permute to (R,G,B,255).
        vImageConvert_RGB888toARGB8888(&src, nil, 255, &dst, false, vImage_Flags(kvImageNoFlags))
        var map: [UInt8] = [3, 2, 1, 0]
        vImagePermuteChannels_ARGB8888(&dst, &dst, &map, vImage_Flags(kvImageNoFlags))
    }
    guard let provider = CGDataProvider(dataInfo: out, data: out, size: bytes,
                                        releaseData: { info, _, _ in free(info) }) else {
        free(out); return nil
    }
    return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32,
                   bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(),
                   bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue),
                   provider: provider, decode: nil, shouldInterpolate: false,
                   intent: .defaultIntent)
}

// MARK: - 4b. The view we draw into
//
// ★ Do NOT push 20 FPS through an `@Published` property. Every assignment
// re-evaluates the SwiftUI body around it, and measured on an iPhone 15 that
// alone dropped playback to 19.3 FPS. Hand the frame to a CALayer
// instead; SwiftUI never sees it change.

@MainActor
final class FrameSink {
    fileprivate weak var layer: CALayer?
    func show(_ cg: CGImage) { layer?.contents = cg }
}

struct FrameView: UIViewRepresentable {
    let sink: FrameSink
    func makeUIView(context: Context) -> UIView {
        let v = UIView()
        v.backgroundColor = UIColor(white: 0.12, alpha: 1)
        v.layer.contentsGravity = .resizeAspect
        v.layer.masksToBounds = true
        v.layer.cornerRadius = 16
        sink.layer = v.layer
        return v
    }
    func updateUIView(_ v: UIView, context: Context) { sink.layer = v.layer }
}

// MARK: - 5. The session: load, then speak (file) or listen (mic)

@MainActor
final class AvatarSession: ObservableObject {
    @Published var status = "loading the engine…"
    @Published var detail = ""
    let sink = FrameSink()
    @Published var hasFrame = false
    @Published var ready = false
    @Published var busy = false
    @Published var listening = false

    fileprivate let renderer = Renderer()
    private var player: AVAudioPlayer?
    private var micEngine: AVAudioEngine?
    private var w = 0, h = 0
    private var shown = 0
    private var firstFrameAt: Date?
    private var lastFrameAt: Date?
    private var feedDone = false
    private var displayTask: Task<Void, Never>?

    // 5a. Boot: stage the members and start the engine.
    func boot() async {
        guard let avatar = Payload.avatarContainer,
              let shared = Payload.sharedEngineDir,
              FileManager.default.fileExists(atPath: avatar.path) else {
            status = "No model in the bundle."
            detail = "Run ./setup.sh — see README.md."
            log("no Model/agent.avatar in the bundle — run ./setup.sh")
            return
        }
        let staging = FileManager.default.temporaryDirectory
            .appendingPathComponent("expression2-stage", isDirectory: true)
        let t0 = Date()
        do {
            let line = try await renderer.load(avatar: avatar, sharedEngine: shared, staging: staging)
            w = await renderer.width
            h = await renderer.height
            if let idle = await renderer.idleFrame(), let cg = makeCGImage(idle, w, h) {
                sink.show(cg); hasFrame = true
            }
            status = "Ready."
            detail = line + String(format: " · loaded in %.1f s", Date().timeIntervalSince(t0))
            log("engine ready: \(line) in \(String(format: "%.1f", Date().timeIntervalSince(t0)))s")
            ready = true
            speak()          // say the bundled line once, so launching proves it
        } catch {
            status = "Engine did not start."
            detail = "\(error)"
            log("FAILED to start: \(error)")
        }
    }

    // 5b. Speak: generate the whole utterance, then play it in sync.
    //
    // ★ Why generate first rather than stream. Measured on an iPhone 15, this
    // engine delivers about 20 FPS — its own full rate, so a stream has no
    // headroom above playback. A frame lost to a hiccup is never made up, and
    // the mouth drifts behind the sound; generate the utterance first and the
    // two are locked together. On faster silicon you can stream (the microphone
    // button below does), and the shape is the same: feed, poll, draw.
    func speak() {
        guard ready, !busy, let wav = Payload.speechWAV else { return }
        let pcm = readPCM16MonoWAV(wav)
        guard !pcm.isEmpty else { status = "speech16k.wav is not 16-bit PCM."; return }
        let seconds = Double(pcm.count) / 16000.0
        log(String(format: "audio 16 kHz mono: %d samples, %.2f s", pcm.count, seconds))
        busy = true
        shown = 0
        status = "Generating…"

        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
        player = try? AVAudioPlayer(contentsOf: wav)

        Task {
            let t0 = Date()
            let chunk = 1600                       // 100 ms of 16 kHz mono
            var i = 0
            while i < pcm.count {
                let j = min(i + chunk, pcm.count)
                await renderer.feed(Array(pcm[i..<j]))
                i = j
            }
            await renderer.flushTail()

            // ★ Generation is ASYNCHRONOUS. `pull()` returns nil until a chunk of
            // frames lands, so a bare `while let` right after `feed()` collects
            // NOTHING: the app builds, starts, throws nothing and shows an empty
            // view. Poll until the engine has been quiet for a moment.
            var frames: [CGImage] = []
            var quiet = 0
            while quiet < 30 {                     // 30 x 50 ms of silence = done
                if let f = await renderer.pullOne() {
                    quiet = 0
                    if let cg = makeCGImage(f, w, h) { frames.append(cg) }
                } else {
                    quiet += 1
                    try? await Task.sleep(nanoseconds: 50_000_000)
                }
            }
            let gen = Date().timeIntervalSince(t0)
            log(String(format: "generated %d frames at %dx%d in %.2f s (%.1f FPS, %.2fx real time)",
                       frames.count, w, h, gen,
                       Double(frames.count) / max(gen, 0.001), seconds / max(gen, 0.001)))
            guard !frames.isEmpty else {
                status = "The engine returned no frames."; busy = false; return
            }

            // Play the sound and step the frames on the same clock.
            status = "Speaking…"
            let start = Date()
            player?.play()
            for (n, cg) in frames.enumerated() {
                sink.show(cg)
                hasFrame = true
                shown += 1
                if shown == 1 { recordFirstFrame(cg) }
                let wait = start.addingTimeInterval(Double(n + 1) * 0.05).timeIntervalSinceNow
                if wait > 0 { try? await Task.sleep(nanoseconds: UInt64(wait * 1e9)) }
            }
            let played = Date().timeIntervalSince(start)
            log(String(format: "played %d frames in %.2f s (%.1f FPS) beside %.2f s of audio",
                       shown, played, Double(shown) / max(played, 0.001), seconds))
            // The engine trims trailing silence, so the video can be a little
            // shorter than the sound. Hold the last frame until the audio ends
            // rather than cutting the speaker off mid-word.
            let remaining = seconds - played
            if remaining > 0 { try? await Task.sleep(nanoseconds: UInt64(remaining * 1e9)) }
            player?.stop()
            status = "Done — \(shown) frames at \(w)x\(h)."
            busy = false
            if let idle = await renderer.idleFrame(), let cg = makeCGImage(idle, w, h) { sink.show(cg) }
        }
    }

    // 5c. Listen: drive the avatar from the microphone, live.
    func toggleMic() {
        if listening { stopMic(); return }
        guard ready, !busy else { return }
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playAndRecord, mode: .default,
                                 options: [.defaultToSpeaker, .allowBluetooth])
        try? session.setActive(true)
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            Task { @MainActor in
                guard let self else { return }
                guard granted else { self.status = "Microphone permission denied."; return }
                self.startMic()
            }
        }
    }

    private func startMic() {
        let ae = AVAudioEngine()
        let input = ae.inputNode
        let inFormat = input.outputFormat(forBus: 0)
        guard let target = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16_000,
                                         channels: 1, interleaved: false),
              let converter = AVAudioConverter(from: inFormat, to: target) else {
            status = "Cannot open the microphone."; return
        }
        let renderer = self.renderer
        input.installTap(onBus: 0, bufferSize: 1600, format: inFormat) { buffer, _ in
            let capacity = AVAudioFrameCount(Double(buffer.frameLength)
                                             * 16_000.0 / inFormat.sampleRate + 64)
            guard let out = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: capacity)
            else { return }
            var err: NSError?
            var fed = false
            converter.convert(to: out, error: &err) { _, status in
                if fed { status.pointee = .noDataNow; return nil }
                fed = true; status.pointee = .haveData; return buffer
            }
            guard err == nil, out.frameLength > 0, let ch = out.floatChannelData?[0] else { return }
            let samples = Array(UnsafeBufferPointer(start: ch, count: Int(out.frameLength)))
            Task { await renderer.feed(samples) }
        }
        do { try ae.start() } catch { status = "Microphone failed: \(error)"; return }
        micEngine = ae
        listening = true
        shown = 0
        status = "Listening — talk to it."
        startDisplayLoop()
    }

    private func stopMic() {
        micEngine?.inputNode.removeTap(onBus: 0)
        micEngine?.stop()
        micEngine = nil
        listening = false
        stopDisplayLoop()
        Task { await renderer.reset() }
        status = "Stopped — \(shown) frames at \(w)x\(h)."
    }

    // 5d. Display: pop one frame every 50 ms — 20 FPS, the engine's own rate.
    /// The streaming draw loop, used by the microphone button. It shows whatever
    /// the engine has produced, 25 times a second.
    private func startDisplayLoop() {
        displayTask?.cancel()
        displayTask = Task { [weak self] in
            // ★ An ABSOLUTE grid, not `sleep(0.05 - work)`. Task.sleep overshoots
            // a little every time, and subtracting the work from a fixed delay
            // lets that error accumulate — which is the video sliding behind the
            // audio in front of you.
            let start = Date()
            var n = 0
            while !Task.isCancelled {
                if let self, let f = await self.renderer.pullOne(),
                   let cg = makeCGImage(f, self.w, self.h) {
                    self.sink.show(cg)
                    self.hasFrame = true
                    self.shown += 1
                    self.lastFrameAt = Date()
                    if self.shown == 1 { self.recordFirstFrame(cg) }
                }
                n += 1
                let wait = start.addingTimeInterval(Double(n) * 0.05).timeIntervalSinceNow
                if wait > 0 { try? await Task.sleep(nanoseconds: UInt64(wait * 1e9)) }
            }
        }
    }

    private func stopDisplayLoop() { displayTask?.cancel(); displayTask = nil }

    /// Save frame 1 so you can look at it off the phone:
    ///   xcrun devicectl device copy from --device <udid> \
    ///     --domain-type appDataContainer \
    ///     --domain-identifier ai.bithuman.example.ios-expression2 \
    ///     --source Documents/first-frame.png --destination ./first-frame.png
    private func recordFirstFrame(_ cg: CGImage) {
        firstFrameAt = Date()
        guard let png = UIImage(cgImage: cg).pngData(),
              let docs = FileManager.default.urls(for: .documentDirectory,
                                                  in: .userDomainMask).first else { return }
        let p = docs.appendingPathComponent("first-frame.png")
        try? png.write(to: p)
        log("first frame \(w)x\(h) written to Documents/first-frame.png (\(png.count) B)")
    }
}

// MARK: - 6. UI

@main
struct IOSExpression2App: App {
    var body: some Scene { WindowGroup { ContentView() } }
}

struct ContentView: View {
    @StateObject private var session = AvatarSession()

    var body: some View {
        VStack(spacing: 14) {
            Text("bitHuman · expression-2 on-device").font(.headline)

            ZStack {
                FrameView(sink: session.sink)
                if !session.hasFrame { ProgressView().tint(.white) }
            }
            .frame(maxHeight: 520)

            HStack(spacing: 12) {
                Button(session.busy ? "Speaking…" : "Speak") { session.speak() }
                    .buttonStyle(.borderedProminent)
                    .disabled(!session.ready || session.busy || session.listening)
                Button(session.listening ? "Stop mic" : "Talk to it") { session.toggleMic() }
                    .buttonStyle(.bordered)
                    .disabled(!session.ready || session.busy)
            }

            Text(session.status).font(.subheadline)
            Text(session.detail).font(.caption2).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .task { await session.boot() }
    }
}
```

## 5. Sign it, and run it on the phone

Nothing here runs in the Simulator, so the first build that proves anything is a
device build.

- In Xcode: pick your **Team** under Signing & Capabilities, select your iPhone
  in the toolbar, press Run. That is the whole of it.
- From the command line, the working shape is **automatic** signing plus
  `-allowProvisioningUpdates`. Manual signing against an Xcode-managed profile
  fails outright with *"Provisioning profile … is Xcode managed, but signing
  settings require a manually managed profile."*

```bash
xcodebuild -project IOSExpression2.xcodeproj -scheme IOSExpression2 \
  -configuration Debug -destination "id=<YOUR-DEVICE-UDID>" \
  -derivedDataPath build \
  DEVELOPMENT_TEAM=<YOUR-TEAM-ID> CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates build

xcrun devicectl device install app --device <YOUR-DEVICE-UDID> \
  build/Build/Products/Debug-iphoneos/IOSExpression2.app
xcrun devicectl device process launch --device <YOUR-DEVICE-UDID> --console \
  ai.bithuman.example.ios-expression2
```

> ★ **Over SSH the signing identity is not there, and it fails in two different
> ways.** In an SSH session the keychain search list holds only the system
> keychain, so `security find-identity -v -p codesigning` reports **0 valid
> identities** even with your certificates installed. What happens next depends
> on what else is cached: with a usable provisioning profile already in place the
> build *succeeds* and the phone rejects the result with
> `0xe800801c (No code signature found.)`; with the login keychain locked, the
> build fails outright with `No signing certificate "iOS Development" found`.
>
> Both have the same cause and the same fix: **build from a logged-in graphical
> session**, where the login keychain is unlocked and Xcode's account is
> readable. `security show-keychain-info ~/Library/Keychains/login.keychain-db`
> tells you which state you are in — `User interaction is not allowed.` means
> locked. The full list of signing traps is on
> [the SDK page](/sdk/ios#run).

## What you'll see

The app loads, shows the avatar's rest pose, and says the bundled line once by
itself. Press **Speak** to hear it again, or **Talk to it** to drive the mouth
from your own microphone in real time.

> **Honesty about the microphone button.** The **Speak** path is the one this
> page was built and checked on. The **Talk to it** path compiles into the same
> build and installs with it, but it was **not** driven by a human voice on a
> device while this page was written. It is here because it is fifteen lines and
> it is the shape you want for a live agent; treat it as a starting point. It
> also streams rather than generating first, so expect the mouth to sit behind
> you by about a chunk.

It also writes what it did to `Documents/session.log` and its first frame to
`Documents/first-frame.png`, both of which you can pull off the phone without
keeping a console attached:

```bash
xcrun devicectl device copy from --device <YOUR-DEVICE-UDID> \
  --domain-type appDataContainer \
  --domain-identifier ai.bithuman.example.ios-expression2 \
  --source Documents/first-frame.png --destination ./first-frame.png
```

★ Give `devicectl` the destination **file**, not a directory: a bare `.` comes
back as `Cannot open destination file …: Is a directory` with nothing written.

### What it costs on the device

On an iPhone 15 the app generates faster than real time — 5.24 s of speech in
2.62 s — and then plays the frames back in sync with the audio. First launch
takes a few seconds longer than later ones, because that is where CoreML compiles
the graphs on the device.

**An iPhone 15 is two generations below the floor
[Hello, avatar](/examples/swift-ios-hello) refuses at launch.** `Expression2` has
no device gate at all.

★ **Why this example generates the whole utterance before it plays it.** The
engine emits frames in chunks of a little over a second of audio. Streaming
them — feed at real time, draw what has arrived — works, and on this handset the
mouth drifted behind the sound because the chunk boundary is longer than any
sensible buffer. Generating first costs you the 2.62 s above and buys exact sync.
A 5-second line is about 140 MB of frames held in memory, so for anything long,
stream it (the microphone button does) or draw straight into a video writer.

## What this path does not give you

Stated plainly, so nobody spends an afternoon finding out.

- **This project is Expression 2 only.** Essence 2 on an iPhone is the
  package's `Essence2` product, which opens the `.imx` you download from
  **2.13.2** — see [Essence 2 on-device](/sdk/ios#install). A walkthrough
  shaped like this one is
  [Essence 2 on iPhone](/examples/swift-ios-essence2).
- **The one-call container opener works again** (was broken through `Expression2`
  2.11.2, which refused every published `.avatar` by member name on iOS while
  unpacking the same file happily on macOS). Measured on an iPhone 15 on
  2026-09-20 against the package tag a `from: "2.14.0"` dependency resolves:
  `create(avatarContainer:…:stagingDir:)` opened the container, staged 34 files
  and reached `isReady` at 416x720. `Renderer.load` above stages by hand, which
  is still correct and still only public API.
- **The shared graphs are copied out of a CLI install by hand.** That is fine
  for a build you control and it is not something to ship to customers. The fix
  is on bitHuman's side: either the `.avatar` carries
  `w2v_frontend_cpuAndNE.mlpackage`, or the shared bundle becomes a downloadable
  asset.
- **No conversation.** There is no speech recognition, no language model and no
  text-to-speech here — you supply the audio. For the full voice agent see
  [Hello, avatar](/examples/swift-ios-hello); for a server-driven avatar see
  [LiveKit (Apple)](/sdk/livekit).
- **Your identity only.** The app renders the agent whose `<CODE>` you passed to
  `setup.sh`. There is no published identity you can point it at without an
  agent of your own.

## Troubleshooting

### The view stays empty and nothing throws

The classic. Either `pull()` is being drained synchronously right after `feed()`
— it returns `nil` until a chunk lands — or feeding and draining are running in
sequence rather than at the same time. Both are step 3 above.

### `missing w2v_frontend_cpuAndNE.mlpackage`

`Sources/Model/shared_engine` is missing or was added as a *group* rather than a
folder reference. Check `Expression2Engine.missingMembers(avatarDir:sharedEngineDir:)`
before you call `create` — the app above does.

### `refusing member name "…/Data/com.apple.CoreML/model.mlmodel"`

You called `create(avatarContainer:…:stagingDir:)`. Use the hand-staging loop in
`Renderer.load`. See above.

### `Failed to get the identifier for the app to be installed`

`devicectl` refused the bundle, before signing was consulted. Your `Info.plist`
has no `CFBundleIdentifier` — see [step 3](#3-infoplist). This is not a signing
problem and `-allowProvisioningUpdates` will not help.

### `install app … no such file or directory: build/Debug-iphoneos/…`

`xcodebuild` writes to DerivedData unless you tell it otherwise. Add
`-derivedDataPath build` and install from
`build/Build/Products/Debug-iphoneos/IOSExpression2.app` — see
[step 5](#5-sign-it-and-run-it-on-the-phone).

### The app installs and then the phone refuses to launch it

`0xe800801c (No code signature found.)` — the build was made in a session that
could not see your signing identities. See step 5.

### It builds for the Simulator and crashes there

Expected. The engine is on-device Apple-Silicon inference; there is no Simulator
path. Use a physical device.

### Link failure with 116 duplicate symbols

You attached both `Expression2` and `Essence2` on a tag below 2.14.0. Raise the
floor to 2.14.2 and force the resolve ([Pin the version](/sdk/ios#pin-the-version)).

## Next steps

- [Swift SDK](/sdk/ios) — the reference for every call this page makes, plus signing, compute units and the hardware floor.
- [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) — the full on-device voice agent, when you are ready for the device floor and the entitlements.
- [Pin the version](/sdk/ios#pin-the-version) — which package tag to write, and how to check what you resolved.
- [Expression 2](/concepts/expression-2) — what the model is and where it runs.
- [Agents API](/api/agents) — creating an agent and downloading its model.
