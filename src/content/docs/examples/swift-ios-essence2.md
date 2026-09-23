---
title: "Swift / iOS — Essence 2 on device"
description: "A complete SwiftUI app that renders a full-resolution Essence 2 avatar on an iPhone, entirely on the device. Every file printed in full, every coordinate and byte count verified against the published package and the live download door on 2026-09-21."
section: examples
group: "Examples"
order: 31
type: example
label: "iOS: Essence 2"
---

This page is the whole app. Copy every block into a new Xcode project and an
Essence 2 identity talks on your own iPhone, rendered on the phone. It is the
Essence 2 counterpart of
[Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2),
which is the same shape for [Expression 2](/concepts/expression-2).

**Read this before you start, because it is the one thing that differs from the
Expression 2 page:** `Essence2` vends a **C interface**, not a Swift type.
There is no `Essence2Engine` class to call. The 17 `be_essence2_*` functions in
the package's `be_essence2.h` are the whole surface — counted 2026-09-21 in the
shipped `be_essence2.h` at `essence2-v1.9.0`, all three published slices
carrying the same one — and the `Renderer` actor in
[step 4](#4-appswift--the-whole-app) is the Swift wrapper you would otherwise
have to write yourself. Everything on this page is public API of the shipped
binary.

## What you get, and what you do not

| | |
|---|---|
| **Renders** | the identity's own canvas at 25 fps — 1080x1920 for the default code — entirely on the device, [measured rates](/performance) |
| **Driven by** | a 16 kHz mono WAV you make on your Mac in one command |
| **Needs** | a physical Apple-Silicon iPhone or iPad, **iOS 26**, and `Essence2` resolved at **v2.14.2 or newer** — see [the floor](#2-the-xcode-project) |
| **Does not need** | an agent of your own, credits to create one, or the device floor and Apple entitlements the `bitHumanKit` umbrella asks for — nothing on this path requests either. **It does need an API secret:** without one `be_essence2_create` returns `-3` — [the key](#the-key-starts-the-session) |
| **Does not include** | speech recognition, a language model or text-to-speech — the audio is yours to supply. For a whole voice agent see [Hello, avatar](/examples/swift-ios-voice-agent) |
| **Costs** | the identity download is anonymous and free. The render is a self-hosted session and is metered — [pricing](/guides/pricing) is the authority |

`Expression2` and `Essence2` may share one target from `2.14.0`; below it a
device build failed its final link on duplicate symbols. On 2026-09-23 a new app
taking both from `2.14.1` built for an iOS device, the Simulator and macOS.
[Details](/sdk/apple#pin-the-version).

## Prerequisites

Everything here is checked before the command that needs it. Work down the list
in order.

| You need | Why | Check it |
|---|---|---|
| **A Mac with Xcode 26 or newer** | the package is built with Swift 6 strict concurrency, and the engine objects are iOS 26 | `xcodebuild -version` |
| **A physical iPhone or iPad**, paired and trusted | this is on-device Apple-Silicon inference; the Simulator is not the supported path ([iOS SDK](/sdk/apple)) | it appears in Xcode's run destination menu |
| **An Apple Developer team** | a device build is a signed build | Xcode → Settings → Accounts lists it |
| **Deployment target iOS 26.0** | 99 of the 367 objects in the published `ios-arm64` slice are built with a minimum OS of 26.0 — a lower target fails at link | set in [step 2](#2-the-xcode-project) |
| **A bitHuman API secret** | the engine will not start a session without one — `be_essence2_create` returns `-3` — [the key](#the-key-starts-the-session) | free at [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys); see [Authentication](/api/authentication) |
| **About 430 MB of free space on the phone** | 155 MB of identity plus 119 MB of engine resources ride in the app bundle, and the engine unpacks the identity once more at first launch — see the note below | — |
| **About 380 MB of free space on the Mac** | `setup.sh` pulls a 155 MB `.imx` and a 105,353,700-byte zip, then unpacks the zip to 119,406,759 bytes beside it — measured 2026-09-21 by running it | `df -h .` where you will run `setup.sh` |
| **`curl`, `unzip`, `shasum`, `python3`, `say`, `afconvert` on the Mac** | `setup.sh` in step 1 uses all six | all six ship with macOS and the Xcode Command Line Tools; `for c in curl unzip shasum python3 say afconvert; do command -v $c \|\| echo "MISSING $c"; done` |

★ **There is no device gate on this path, and that is worth stating because
there is one elsewhere on Apple.** Read out of the published `ios-arm64` slice of
`essence2-v1.9.0` on 2026-09-21, the engine's own refusal sentence says so in as
many words: *"the expression-1 Expression actor (MLX DiT) requires iPhone 16 Pro
or later (A18 Pro+). This gate is expression-1's alone: it is NOT a
bitHuman-SDK-wide device floor, and it does NOT apply to essence-2 or
expression-2, which carry no device gate."* [The performance
page](/performance) is the other half of that: it carries a measured iPhone
15 rate, comfortably above the rate Essence 2 plays at, and it is the only place
that number is written. The **iPhone 16 Pro floor and the two Apple memory
entitlements belong to the `bitHumanKit` umbrella**, which
[Hello, avatar](/examples/swift-ios-voice-agent) uses and this page does not: neither
the `Essence2` package product nor the app below asks for an entitlement, and
the app builds and signs without one. What an entitlement buys is headroom
above the roughly 3 GB an unentitled iOS app may hold, so if your own app grows
past this one and is killed with no crash log, that ceiling is the first thing
to check — [the iOS SDK page](/sdk/apple#apple-entitlements--bithumankit-only) covers requesting
them.

★ **If you read the package's own `Package.swift`, you will find a comment
saying the opposite — it is older than this page.** Up to v2.14.0 the manifest
carried, unqualified, a note dated 2026-09-08 reporting that on an iPhone 15 the
Essence 2 warm-up refused with *"unsupported hardware — iPhone15,4 detected"*,
and concluding that Essence 2 needs an iPhone 16 Pro. That was measured on
`essence2-v1.5.x`; v2.13.8 pins `essence2-v1.9.0`, and the iPhone 15 cell on the
[performance page](/performance) was measured on that engine on 2026-09-20,
rendering far faster than it plays. From v2.14.1 that note is marked
superseded for the iPhone, with the refusal sentence the `essence2-v1.10.0`
slice actually carries quoted above it. **The sentence you can act on is the version check in
[step 2](#2-the-xcode-project)** — if your own phone refuses at warm-up, you are
on an older engine, not an unsupported handset.

### The key starts the session

★ **Essence 2 will not start without a key, and it says so.** The shipped
header's comment still describes an older engine, in which a missing key
rendered unmetered. Measured on 2026-09-23 against `essence2-v1.10.0` (the
engine `2.14.1` pins):

| what you have | what `be_essence2_create` does |
|---|---|
| **no credential at all** | returns **`-3`**; stderr: `refusing to serve: no credential was supplied, so this render cannot be attributed to an account` |
| a key the service **rejects** (401/402/403) | returns **`-3`**; stderr: `refusing to serve: the API secret was rejected — revoked, or from another environment. (401)` |
| a valid key | returns `0` and prints `metering on …`; the session's last beat goes out when you destroy the engine and call `be_essence2_quiesce_all()` |
| a key, but `api.bithuman.ai` is unreachable | returns `0` and prints `could not reach …/v1/auth/validate … PROCEEDING`; beats are retried in the background |

A key the service starts rejecting in the middle of a session renders for a
300 s grace behind a countdown, then `be_essence2_pull_frame` returns `-3` and
no frame follows. Essence 2 reads **`BITHUMAN_API_SECRET`**
(essence2-v1.10.0 does not read BITHUMAN_API_KEY, the deprecated alias other tools accept).

★ **Set your API secret in your Xcode scheme, not in a file.** The app reads
`BITHUMAN_API_SECRET` out of its own process environment and never carries a
literal. In Xcode: *Product → Scheme → Edit Scheme… → Run → Arguments →
Environment Variables*, add `BITHUMAN_API_SECRET` with your API secret. For a
shipped app, fetch your API secret from your own backend (or the Keychain) at
launch and hand it to `be_essence2_set_api_secret` — nothing else in the code
below changes. It takes an API secret only: the engine validates it at
`/v1/auth/validate`, which does not accept a runtime token. The **server** prices usage — no
rate lives in the library ([pricing](/guides/pricing) is the authority).

## Pick an identity

Every one of these is a bitHuman-owned Essence 2 identity that the download door
serves to an anonymous caller. **Verified 2026-09-21**, each fetched with no
credential in the environment at all: the door answered `302` to a one-hour
signed URL, and each file begins `IMX\0` with a version word of 2 — the
container this engine opens.

| Identity | Agent code | `.imx` bytes | Members | Frame size |
|---|---|---|---|---|
| warm-clear-professional-presenter | `A21SKT4314` | 155,139,658 | 31 | 1080x1920 |
| afro-latina-astrophysics-mentor | `A23KSG5258` | 152,346,359 | 31 | 1920x1080 |
| calm-product-specialist-advisor | `A24EKJ8433` | 143,308,173 | 31 | 1280x720 |
| sofia-ramirez | `A52DHS2219` | 155,054,261 | 31 | 1080x1920 |
| kwame-warm-museum-guide | `A62SJB3901` | 155,399,147 | 30 | 1080x1920 |
| executive-coach-for-clear-decisions | `A80HVD8577` | 123,430,460 | 27 | 1280x720 |

Every row above was re-measured on **2026-09-21** by a second reader that did
not write the table: the `.imx` bytes column is the door's own
`content-length` for each signed URL, and the member counts are what the step-1
`python3` check prints when it is run for real against the first 128 KiB of each
container — `31, 31, 31, 31, 30, 27`, `manifest.json` present in all six, index
ending by byte 1,100 so the 64 KiB read is never short. `A21SKT4314`'s
`manifest.json` was pulled out by byte range and reads `W: 1080, H: 1920`.

★ **Frame size and member count are per identity, not per model.** Essence 2
renders whatever canvas the identity was generated at. Read the size back from
`be_essence2_get_info` after `create`, as the app below does; do not hard-code
it. Both columns are each container's own header and `manifest.json`, read from
the door on 2026-09-21.

`setup.sh` below defaults to `A21SKT4314`; pass any other code as its first
argument. Your own agent's code comes from [Agents](/api/agents) and comes
through the same door with your `api-secret` — creating one is a one-time credit
charge that the free tier cannot cover, so [read the pricing
page](/guides/pricing) before you start one.

## 1. The three files your app needs

| file | where it comes from | why you need it |
|---|---|---|
| `agent.imx` | [`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents) — anonymous for the identities above | the identity: the face, its motion and its per-identity graphs |
| the engine resources | one archive attached to the `essence2-v1.10.0` release of the Swift package — the engine `2.14.1` pins — a legacy asset name, spelled out below | ★ the shared audio front end and the Metal libraries. **The `.imx` does not carry them** — read its member index and there is no `w2v_ess_fp16_v1.onnx` in it. The engine refuses to start without one |
| `speech16k.wav` | `say` + `afconvert`, both already on your Mac | something for the avatar to say. 16 kHz, mono, 16-bit PCM |

★ **The resources asset is called `libessence2-resources.zip`, a frozen artifact
path.** That `libessence2` spelling is a legacy name kept for compatibility with
the releases that already carry it, and it is what you type. Unzipped it is
119,406,759 bytes: three loose `.onnx` files and two `.bundle` directories, all
of which must land at your app bundle's **resource root**.

★ **Make the project directory first — the `.xcodeproj` does not exist yet.**
This step runs before [step 2](#2-the-xcode-project) because the downloads are
the long pole, but `setup.sh` writes `Sources/Model` and
`Sources/EngineResources` relative to **itself**, and in step 2 you point Xcode
at those two directories. So:

```bash
mkdir -p IOSEssence2 && cd IOSEssence2
```

and everything from here — `setup.sh`, `Sources/`, and in step 2 either the
`.xcodeproj` Xcode creates *in this directory* or the `project.yml` XcodeGen
reads — lives side by side in that one folder. If you let Xcode make the
project somewhere else, the two `Sources/` directories are not the ones it is
referencing and the app installs with no identity in it.

Save this as `setup.sh` there, `chmod +x setup.sh`, and run it. It needs no
bitHuman account.

```bash
#!/bin/bash
# setup.sh — fetch everything the app needs. No account, no key.
#   ./setup.sh              # warm-clear-professional-presenter
#   ./setup.sh A52DHS2219   # any code from the table on the doc page
set -euo pipefail
cd "$(dirname "$0")"
CODE="${1:-A21SKT4314}"
REL=https://github.com/bithuman-product/homebrew-bithuman/releases/download/essence2-v1.11.0
ASSET=libessence2-resources.zip   # the release asset's frozen legacy name
mkdir -p Sources/Model Sources/EngineResources

# 1 · the identity. One URL, no credential: the door answers 302 to a one-hour
#     signed URL and curl -L follows it.
echo "==> downloading $CODE.imx"
curl -fL --progress-bar \
  "https://api.bithuman.ai/v1/agent/$CODE/model/download?model=essence-2" \
  -o Sources/Model/agent.imx

# 2 · prove it is the container this engine opens BEFORE you open Xcode.
#     An error page and a truncated download both look like a file.
python3 - <<'PY'
import struct, sys
p = "Sources/Model/agent.imx"
b = open(p, "rb")
head = b.read(8)
if head[:4] != b"IMX\0":
    sys.exit(f"{p} does not start with IMX\\0 — got {head[:4]!r}. Re-run ./setup.sh")
ver, n = struct.unpack("<HH", head[4:8])
if ver != 2:
    sys.exit(f"{p} is an IMX v{ver} container; this engine opens v2.")
names, blob = [], b.read(1 << 16)
off = 0
for _ in range(n):
    (ln,) = struct.unpack_from("<H", blob, off); off += 2
    names.append(blob[off:off + ln].decode("utf-8", "replace")); off += ln + 16
if "manifest.json" not in names:
    sys.exit(f"{p} has no manifest.json member — this is not an essence-2 bundle.")
print(f"OK: IMX v2, {n} members, manifest.json present")
PY

# 3 · the shared engine resources, checksum-verified against the sidecar
#     published beside them.
echo "==> downloading the engine resources"
curl -fL --progress-bar -o "$ASSET"        "$REL/$ASSET"
curl -fL                -o "$ASSET.sha256" "$REL/$ASSET.sha256"
shasum -a 256 -c "$ASSET.sha256"
unzip -o -q "$ASSET" -d Sources/EngineResources

# 4 · something for it to say. `say` and `afconvert` ship with macOS.
echo "==> making speech16k.wav"
say -o /tmp/e2-speech.aiff \
  "Hello. Every frame you are watching was rendered on this phone."
afconvert -f WAVE -d LEI16@16000 -c 1 /tmp/e2-speech.aiff Sources/Model/speech16k.wav

echo "==> ready:"
du -sh Sources/Model Sources/EngineResources
```

For the default code a clean run prints `OK: IMX v2, 31 members, manifest.json
present` — the member count is the one in the table above, so two of the six
print 30 and 27. Then comes a line
ending `: OK` from `shasum`, then two sizes. The sha256 that sidecar carries is
`fa9bfc79eca9a7f82da1bd0bdd4fc968c161ae41016eb3fb3000ea2c8cfd9b46`.

Re-fetched and re-hashed on **2026-09-23**: the asset is 105,353,700 bytes on
the wire, its sha256 is that value, and it unzips to 119,406,759 bytes in eight
entries — `audio_encoder_fp16_window_head.onnx`,
`audio_encoder_fp16_window_trunk.onnx`, `w2v_ess_fp16_v1.onnx`, and the two
`.bundle` directories `bithuman-expression-engine_Expression.bundle` and
`mlx-swift_Cmlx.bundle`. Every one of those names is at the top level of the
zip, which is why they must land at the app bundle's resource **root**; the
pre-build check in [step 2](#2-the-xcode-project) asserts the third of them by
name.

★ **Do not skip step 2.** `curl -f` catches an HTTP error, and catches nothing
else: a connection cut part-way through 155 MB leaves a short file and exit 0, and
a captive network can hand you a page instead. Step 2 reads the container's own
header and member index, so a bad download is a failure on your Mac in one
second. The engine's refusal for the same condition is *"the download is
incomplete"* — thrown at first launch, on the phone, long after you would have
caught it here.

## 2. The Xcode project

**File → New → Project → App**, SwiftUI interface, then set exactly this much:

| setting | value | why |
|---|---|---|
| Minimum Deployments | **iOS 26.0** | 99 objects in the shipped `ios-arm64` slice are built with a minimum OS of 26.0; a lower target fails at link |
| Swift Language Version | **6** | the package is built with strict concurrency |
| Signing → Team | your 10-character team id | a device build is a signed build |
| Bundle Identifier | anything you own, e.g. `com.example.ios-essence2` | it appears in the `devicectl` commands below — substitute the one you chose |
| Targeted Device Family | iPhone, iPad | the engine runs on both |

Then **File → Add Package Dependencies…**, paste

```
https://github.com/bithuman-product/homebrew-bithuman.git
```

choose **Up to Next Major Version** from **2.14.2**, and attach the **`Essence2`**
product. (You may also attach `Expression2` alongside it; every tag before
2.14.0 fails an app's final link with 112 duplicate symbols.)

★ **2.14.1, and the digits are the difference between a talking face and a
face that will not speak.** The package tag does not
carry the engine; it *pins* an engine release, and the pin has moved. Read out
of each tag's own `Package.swift` on **2026-09-21**:

| package tag | `essence2Tag` it pins |
|---|---|
| v2.11.0, v2.11.2 | `essence2-v1.4.0` |
| v2.12.1 | `essence2-v1.5.1` |
| v2.13.0 | `essence2-v1.6.0` |
| v2.13.8 | `essence2-v1.9.0` |
| v2.14.0 | `essence2-v1.10.0` |
| v2.14.1 | `essence2-v1.10.0` — the same engine; the `Essence2` product now declares its own linker settings, and the macOS frameworks are ones a Mac app can embed |
| **v2.14.2** | **`essence2-v1.11.0`** — bills talking time only (idle is free); a service unreachable at first contact refuses retryably instead of rendering unverified; after the service accepted the key, an outage renders 300 s of frames then pauses until it answers; `BITHUMAN_API_KEY` is read as a deprecated alias |

Everything this page promises — no iPhone model floor, the measured iPhone rate
on the [performance page](/performance), the `be_essence2.h` surface below —
is **essence2-v1.9.0**. On an engine older than that, an iPhone below a 16 Pro
gets `be_essence2_create` returning 0 and then a warm-up that refuses by name
(*"unsupported hardware — iPhone15,4 detected"*) with the engine "idle-only":
the identity's motion plays and it never speaks, which is the one failure on
this page that looks like nothing at all. SwiftPM keeps whatever your
`Package.resolved` already holds, so a floor of 2.11.0 is a floor on the wrong
thing. Ask for 2.14.2.

Check what you actually resolved, rather than what you asked for:

```bash
# the tag SwiftPM wrote down
grep -A3 '"homebrew-bithuman"' \
  IOSEssence2.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved
# and the engine that tag pins, in the checkout Xcode made
grep essence2Tag ~/Library/Developer/Xcode/DerivedData/*/SourcePackages/\
checkouts/homebrew-bithuman/Package.swift
```

The second line must print `essence2-v1.9.0` or newer. If it does not,
*File → Packages → Update to Latest Package Versions*.

Attaching `Essence2` brings everything its link needs. Read out of the v2.14.1
manifest on 2026-09-23, the product lists four targets: the engine archive; the
ONNX Runtime build its audio head calls; `UnifiedModelHeader`, which the engine
archive references rather than carries; and `Essence2LinkSettings`, which
declares the four Apple libraries the static archive calls (`c++`,
`VideoToolbox`, `Accelerate`, `CoreML`). Below 2.14.1 you had to add those four
by hand — [iOS SDK](/sdk/apple#what-essence-2-needs-at-link).

★ **`ld` will warn once per engine object, and the build is still good.** The
manifest declares `.macOS(.v13), .iOS(.v16)` while these objects are built for
iOS 26 / macOS 26, so the linker says *"object file … was built for newer 'iOS'
version (26.0) than being linked"* once per object, naming whatever floor your
own target declares. That is the manifest's floor meeting the objects' floor.
Building at iOS 26.0, as the table above does, is the fix for the real version
of this problem — a link failure rather than a warning.

Finally, add the two directories `setup.sh` made:

- Drag **`Model`** in and choose **Create folder references** (blue folder). The
  app reads it back as one directory with
  `Bundle.main.url(forResource: "Model", withExtension: nil)`.
- Drag **`EngineResources`** in and choose **Create groups** (yellow folder), so
  each file and each `.bundle` is copied to the app bundle's **root**. That is
  where the engine looks for them; inside a subdirectory they are invisible to it.

If you prefer the project generated rather than clicked, this is the
[XcodeGen](https://github.com/yonaskolb/XcodeGen) spec for exactly the above.
Save it as **`project.yml`** in the `IOSEssence2` directory from step 1 — beside
`setup.sh`, not inside `Sources/` — then:

```bash
brew install xcodegen
xcodegen generate            # writes IOSEssence2.xcodeproj next to project.yml
```

It reads three paths that must already exist, and the generator does **not**
create them: `Sources/App.swift` ([step 4](#4-appswift--the-whole-app)),
`Sources/Info.plist` ([step 3](#3-infoplist)), and the two directories
`setup.sh` filled. Write those three files first; `xcodegen generate` on an
empty `Sources/` produces a project with no code in it and the build failure
comes much later.

```yaml
# project.yml
name: IOSEssence2
options:
  bundleIdPrefix: com.example
  deploymentTarget:
    iOS: "26.0"
packages:
  bithuman:
    url: https://github.com/bithuman-product/homebrew-bithuman.git
    # 2.14.1, not 2.11.0: v2.11.x pins essence2-v1.4.0, whose warm-up refuses
    # any iPhone below a 16 Pro and leaves the engine idle-only. See step 2.
    from: 2.14.2
targets:
  IOSEssence2:
    type: application
    platform: iOS
    sources:
      - path: Sources
        excludes: ["Info.plist", "Model", "EngineResources"]
      # The identity rides as ONE folder reference the app opens by name.
      - path: Sources/Model
        type: folder
        buildPhase: resources
      # The engine resources ride as individual files, so they land at the
      # bundle ROOT — which is the only place the engine looks for them.
      - path: Sources/EngineResources
        type: group
        buildPhase: resources
    dependencies:
      - package: bithuman
        product: Essence2
    preBuildScripts:
      - name: "Sources/Model and Sources/EngineResources must hold real files"
        basedOnDependencyAnalysis: false
        script: |
          # A resource folder copies whatever is there, so without this the app
          # builds, installs, launches and fails on the phone instead of here.
          fail() { echo "error: $1"; exit 1; }
          M="$SRCROOT/Sources/Model"; R="$SRCROOT/Sources/EngineResources"
          [ -f "$M/agent.imx" ] || fail "Sources/Model/agent.imx is missing — run ./setup.sh"
          SZ=$(stat -f%z "$M/agent.imx")
          [ "$SZ" -gt 50000000 ] || fail "Sources/Model/agent.imx is only ${SZ} B — that is an error page or a truncated download. Re-run ./setup.sh"
          [ -f "$M/speech16k.wav" ] || fail "Sources/Model/speech16k.wav is missing — run ./setup.sh"
          [ -f "$R/w2v_ess_fp16_v1.onnx" ] || fail "the shared audio front end is missing — the .imx does not carry it. Re-run ./setup.sh"
          echo "payload OK: agent.imx ${SZ} B, front end present"
    info:
      path: Sources/Info.plist
      properties:
        CFBundleDisplayName: Essence2
        UILaunchScreen: {}
        UISupportedInterfaceOrientations: [UIInterfaceOrientationPortrait]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.example.ios-essence2
        DEVELOPMENT_TEAM: ""
        CODE_SIGN_STYLE: Automatic
        SWIFT_VERSION: "6.0"
        TARGETED_DEVICE_FAMILY: "1,2"
```

## 3. `Info.plist`

No microphone key: this app plays a bundled WAV and asks for no permission at
all.

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
    <string>Essence2</string>
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

Six things happen here and each is marked in the source.

1. **Hand the meter a credential first.** `be_essence2_set_api_secret` sets the
   secret this process's later sessions are billed to, so it is called before
   the engine is created.
2. **Keep the handle inside an `actor`.** `be_essence2_handle` is a raw pointer
   and is not `Sendable`; an actor is what makes this compile under Swift 6 *and*
   keeps the load off the main thread. Only `[UInt8]`, `Int` and `Bool` cross the
   boundary.
3. **Wait for `be_essence2_is_ready`.** `be_essence2_create` returns fast with
   the bundle open, and the heavy model compile runs on a background thread.
   Audio pushed before it is ready is dropped.
4. **Stream, do not collect.** One 1080x1920 frame is 6,220,800 bytes. A five
   second line is 125 frames — 777 MB if you hold them, which iOS will not let
   you do. Pull one frame per display tick and draw it.
5. **Push audio with a retry.** `be_essence2_push_audio` returns `-2` when the
   engine's ring is full. That is not an error: pull frames, then push the same
   samples again.
6. **Draw on an absolute 40 ms grid.** Essence 2 delivers 25 frames a second, so
   the grid is `0.04`. `Task.sleep` overshoots by a couple of milliseconds every
   time; sleeping `0.04 − work` lets that error accumulate until the picture
   falls behind the sound.

```swift
// IOSEssence2 — an Essence 2 avatar on a real iPhone, rendered on the device.
//
// Engine:  essence-2, via the `Essence2` product of the SwiftPM package
//          https://github.com/bithuman-product/homebrew-bithuman.git
// Inputs:  Sources/Model/agent.imx      the identity, from the download door
//          Sources/Model/speech16k.wav  16 kHz mono 16-bit PCM speech
//          the engine resources, at the app bundle's resource root
// Output:  the identity's own canvas at 25 fps, drawn in SwiftUI, beside the audio.
//
// `import Essence2` gives you the engine's C interface and nothing else: there
// is no Swift engine type on this rail, so `Renderer` below IS the wrapper.
// Every call here is public API of the shipped binary.
// See https://docs.bithuman.ai/examples/swift-ios-essence2

import SwiftUI
import AVFoundation
import Accelerate
import Essence2

let FPS = 25.0
let TICK = 1.0 / FPS          // 0.04 s — Essence 2's own rate

func log(_ line: String) { NSLog("[ios-essence2] %@", line) }

// MARK: - 1. Where the two inputs live in the app bundle

enum Payload {
    static var root: URL? { Bundle.main.url(forResource: "Model", withExtension: nil) }
    static var imx: URL? { root?.appendingPathComponent("agent.imx") }
    static var speechWAV: URL? { root?.appendingPathComponent("speech16k.wav") }
}

// MARK: - 2. A 16-bit PCM WAV reader that walks the RIFF chunks
//
// Do NOT assume the samples start at byte 44. macOS `afconvert` writes an FLLR
// padding chunk between the header and the data, so the classic shortcut reads
// padding as audio and the avatar mouths noise.

struct WAVError: LocalizedError {
    let what: String
    var errorDescription: String? { what }
}

func readPCM16MonoWAV(_ url: URL) throws -> [Int16] {
    let d = try Data(contentsOf: url)
    guard d.count > 12, d[0..<4].elementsEqual("RIFF".utf8), d[8..<12].elementsEqual("WAVE".utf8)
    else { throw WAVError(what: "\(url.lastPathComponent) is not a RIFF/WAVE file") }

    func u16(_ i: Int) -> Int { Int(d[i]) | Int(d[i + 1]) << 8 }
    func u32(_ i: Int) -> Int { u16(i) | u16(i + 2) << 16 }

    var i = 12, channels = 0, rate = 0, bits = 0, off = -1, len = 0
    while i + 8 <= d.count {
        let id = String(bytes: d[i..<i + 4], encoding: .ascii) ?? ""
        var sz = u32(i + 4)
        if sz < 0 || i + 8 + sz > d.count { sz = d.count - (i + 8) }
        if id == "fmt " { channels = u16(i + 10); rate = u32(i + 12); bits = u16(i + 22) }
        if id == "data" { off = i + 8; len = sz }
        i += 8 + sz + (sz & 1)
    }
    guard off > 0, len > 1 else { throw WAVError(what: "\(url.lastPathComponent) has no data chunk") }
    guard channels == 1, rate == 16_000, bits == 16 else {
        throw WAVError(what: "need 16 kHz mono 16-bit PCM; \(url.lastPathComponent) is "
                             + "\(rate) Hz, \(channels) ch, \(bits)-bit")
    }
    var out = [Int16](repeating: 0, count: len / 2)
    out.withUnsafeMutableBytes { dst in d.copyBytes(to: dst, from: off..<(off + (len / 2) * 2)) }
    return out
}

// MARK: - 3. The engine lives inside an actor
//
// The handle is a raw pointer and is not Sendable. Keeping it inside an actor is
// what lets this compile under Swift 6 strict concurrency AND keeps the first
// load off the main thread.

enum EngineError: LocalizedError {
    case create(Int32), notReady, noGeometry, refused(String)
    var errorDescription: String? {
        switch self {
        case .create(let rc):
            // The three the header documents. -3 is the one that surprises
            // people: it is only reachable with BITHUMAN_METER_ENFORCE=1 set,
            // and then there is no grace at all — the refusal is before the
            // first frame rather than 300 s into the session.
            let why: String
            switch rc {
            case -1: why = " — bad argument"
            case -2: why = " — the bundle could not be opened"
            case -3: why = " — metering refused before the first frame."
                         + " BITHUMAN_METER_ENFORCE=1 is set in this scheme's"
                         + " environment; unset it, or supply a key the service accepts"
            default: why = ""
            }
            return "be_essence2_create returned \(rc)" + why
        case .notReady: return "the engine never became ready"
        case .noGeometry:
            // Without this the app hangs POLITELY: a zero-byte pull buffer makes
            // be_essence2_pull_frame return 0 ("out too small") for ever, which
            // the draw loop reads as "nothing this tick" and holds a frame that
            // never arrives. A named throw beats a frozen face.
            return "be_essence2_get_info reported a 0-pixel canvas"
        case .refused(let why): return why
        }
    }
}

actor Renderer {
    private var handle: be_essence2_handle?
    private(set) var width = 0
    private(set) var height = 0
    private var buf = [UInt8]()

    /// Open the identity and wait for the engine to warm up.
    ///
    /// `apiSecret` is handed to the meter BEFORE the session exists, because the
    /// secret this process's later sessions are billed to is process state, not
    /// a per-session argument.
    func load(imx: URL, apiSecret: String?) async throws -> String {
        if let s = apiSecret, !s.isEmpty { _ = be_essence2_set_api_secret(s) }

        var h: be_essence2_handle?
        // `motion_dir` NULL and `chunk` 0: the engine owns both. Passing the
        // .imx path straight out of the read-only app bundle is correct: the
        // engine sniffs the container and unpacks it itself, under
        // NSTemporaryDirectory()/essence2-unpacked. Nothing is written beside
        // the .imx, so the bundle being read-only is not a problem — but the
        // unpacked copy does cost about as much disk again. See the note below
        // the code.
        let rc = imx.path.withCString { be_essence2_create($0, nil, 0, &h) }
        guard rc == 0, let h else { throw EngineError.create(rc) }
        handle = h

        // create() returns as soon as the bundle is open; the model compile runs
        // on a background thread and audio pushed before it finishes is dropped.
        var waited = 0.0
        while be_essence2_is_ready(h) == 0 {
            if waited > 120 { throw EngineError.notReady }
            try await Task.sleep(nanoseconds: 100_000_000); waited += 0.1
        }

        var w: Int32 = 0, hgt: Int32 = 0
        be_essence2_get_info(h, &w, &hgt)
        width = Int(w); height = Int(hgt)
        // get_info reports the dims of the most recently produced frame, so it
        // is the one call here that can legitimately answer 0. Refuse loudly:
        // a 0-byte buffer turns every later pull into a silent "out too small".
        guard width > 0, height > 0 else { throw EngineError.noGeometry }
        buf = [UInt8](repeating: 0, count: width * height * 3)   // tightly packed RGB
        return String(format: "%dx%d, ready in %.1f s", width, height, waited)
    }

    /// Push 16 kHz mono int16 audio, retrying while the engine's ring is full.
    /// Returns false only if it stayed full for a second, which means the draw
    /// loop has stopped pulling.
    func push(_ samples: ArraySlice<Int16>) async -> Bool {
        guard let h = handle else { return false }
        let n = Int32(samples.count)
        for _ in 0..<100 {
            let rc = samples.withUnsafeBufferPointer { be_essence2_push_audio(h, $0.baseAddress, n) }
            if rc == 0 { return true }
            if rc != -2 { return false }          // -2 is "ring full, try again"
            try? await Task.sleep(nanoseconds: 10_000_000)
        }
        return false
    }

    /// The next frame, or nil when the engine has nothing this tick.
    ///
    /// Once it is ready this is a CONTINUOUS stream — generated frames at their
    /// scheduled slots, the identity's own motion in between — so a draw loop
    /// needs nothing else. A nil means hold the frame you already have.
    /// Throws once metering has refused the session, which is the `-3` the C
    /// header documents: no frame will follow it.
    func pull() throws -> [UInt8]? {
        guard let h = handle else { return nil }
        let n = buf.withUnsafeMutableBufferPointer {
            be_essence2_pull_frame(h, $0.baseAddress, Int32($0.count))
        }
        if n == -3 { throw EngineError.refused(renderReason(h)) }
        return n > 0 ? buf : nil
    }

    func framesReady() -> Int { handle.map { Int(be_essence2_frames_available($0)) } ?? 0 }

    /// Ask the engine whether its own runtime failed. A dead runtime otherwise
    /// reaches you as an absence: idle frames forever, and a face that will
    /// never speak.
    func renderStatus() -> String? {
        guard let h = handle else { return nil }
        var failures: Int64 = 0
        var reason = [CChar](repeating: 0, count: 512)
        let rc = be_essence2_render_status(h, &reason, Int32(reason.count), &failures)
        return rc == 0 ? nil : reason.withUnsafeBufferPointer { String(cString: $0.baseAddress!) }
    }

    private func renderReason(_ h: be_essence2_handle) -> String {
        var failures: Int64 = 0
        var reason = [CChar](repeating: 0, count: 512)
        _ = be_essence2_render_status(h, &reason, Int32(reason.count), &failures)
        let detail = reason.withUnsafeBufferPointer { String(cString: $0.baseAddress!) }
        return "the engine stopped: metering refused this session"
             + (detail.isEmpty ? "" : " — \(detail)")
    }

    func close() {
        if let h = handle { be_essence2_destroy(h) }
        handle = nil
    }
}

// MARK: - 4. RGB888 -> CGImage. Two vImage passes and no intermediate copy.

func makeCGImage(_ rgb: [UInt8], _ w: Int, _ h: Int) -> CGImage? {
    let n = w * h
    guard w > 0, h > 0, rgb.count >= n * 3, let out = malloc(n * 4) else { return nil }
    rgb.withUnsafeBufferPointer { sBuf in
        guard let s = sBuf.baseAddress else { return }
        var src = vImage_Buffer(data: UnsafeMutableRawPointer(mutating: s),
                                height: vImagePixelCount(h), width: vImagePixelCount(w),
                                rowBytes: w * 3)
        var dst = vImage_Buffer(data: out, height: vImagePixelCount(h),
                                width: vImagePixelCount(w), rowBytes: w * 4)
        // RGB888 -> (255,R,G,B), then permute to (R,G,B,255) for noneSkipLast.
        vImageConvert_RGB888toARGB8888(&src, nil, 255, &dst, false, vImage_Flags(kvImageNoFlags))
        var map: [UInt8] = [1, 2, 3, 0]
        vImagePermuteChannels_ARGB8888(&dst, &dst, &map, vImage_Flags(kvImageNoFlags))
    }
    guard let provider = CGDataProvider(dataInfo: out, data: out, size: n * 4,
                                        releaseData: { info, _, _ in free(info) })
    else { free(out); return nil }
    return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32,
                   bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(),
                   bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue),
                   provider: provider, decode: nil, shouldInterpolate: false,
                   intent: .defaultIntent)
}

// MARK: - 4b. The view we draw into
//
// ★ Do NOT push 25 fps through an `@Published` property. Every assignment
// re-evaluates the SwiftUI body around it. Hand the frame to a CALayer instead;
// SwiftUI never sees it change.

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

// MARK: - 5. The session: load, idle, speak

@MainActor
final class AvatarSession: ObservableObject {
    @Published var status = "opening the identity…"
    @Published var detail = ""
    @Published var ready = false
    @Published var busy = false
    @Published var hasFrame = false
    let sink = FrameSink()

    private let renderer = Renderer()
    private var player: AVAudioPlayer?
    private var w = 0, h = 0
    private var loop: Task<Void, Never>?

    func boot() async {
        guard let imx = Payload.imx,
              FileManager.default.fileExists(atPath: imx.path) else {
            status = "No identity in the bundle."
            detail = "Run ./setup.sh, then build again."
            return
        }
        // The key is read from the process environment. In Xcode:
        // Product -> Scheme -> Edit Scheme… -> Run -> Arguments ->
        // Environment Variables -> BITHUMAN_API_SECRET.
        let secret = ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"]
        if secret?.isEmpty ?? true {
            log("no BITHUMAN_API_SECRET in the environment — this session cannot be "
                + "attributed to an account. See docs.bithuman.ai/guides/pricing")
        }
        do {
            let t0 = Date()
            let line = try await renderer.load(imx: imx, apiSecret: secret)
            w = await renderer.width
            h = await renderer.height
            status = "Ready."
            detail = line + String(format: " · %.1f s to first ready", Date().timeIntervalSince(t0))
            log("engine ready: \(line)")
            ready = true
            startLoop()
            speak()                      // say the bundled line once on launch
        } catch {
            status = "The engine did not start."
            detail = "\(error.localizedDescription)"
            log("FAILED: \(error)")
        }
    }

    /// 5a. The draw loop. One frame per 40 ms tick, on an ABSOLUTE grid, for the
    /// life of the app: generated frames while there is speech, the identity's
    /// own motion between utterances, and the frame already on screen when the
    /// engine has nothing this tick.
    private func startLoop() {
        loop?.cancel()
        loop = Task { [weak self] in
            let start = Date()
            var n = 0
            while !Task.isCancelled {
                guard let self else { return }
                do {
                    // ★ ONE call. Once the engine is ready it emits a continuous
                    // stream through pull(): generated frames while there is
                    // speech, the identity's own motion between utterances. A
                    // nil means HOLD THE FRAME ALREADY ON SCREEN — never
                    // substitute one, and do not reach for be_essence2_idle_frame
                    // here: that call advances the same shared offset and would
                    // step the motion twice.
                    if let f = try await self.renderer.pull(),
                       let cg = makeCGImage(f, self.w, self.h) {
                        self.sink.show(cg)
                        self.hasFrame = true
                    }
                } catch {
                    self.status = "Stopped."
                    self.detail = error.localizedDescription
                    log("STOPPED: \(error)")
                    return
                }
                n += 1
                let wait = start.addingTimeInterval(Double(n) * TICK).timeIntervalSinceNow
                if wait > 0 { try? await Task.sleep(nanoseconds: UInt64(wait * 1e9)) }
            }
        }
    }

    /// 5b. Speak the bundled line. Feed, pre-roll, then start the speaker.
    func speak() {
        guard ready, !busy, let wav = Payload.speechWAV else { return }
        busy = true
        status = "Speaking…"
        Task {
            defer { busy = false }
            let pcm: [Int16]
            do { pcm = try readPCM16MonoWAV(wav) } catch {
                status = "The WAV is not usable."; detail = error.localizedDescription; return
            }
            let seconds = Double(pcm.count) / 16_000.0
            log(String(format: "audio: %d samples, %.2f s", pcm.count, seconds))

            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try? AVAudioSession.sharedInstance().setActive(true)
            player = try? AVAudioPlayer(contentsOf: wav)

            // Feed in 100 ms chunks. push() retries on the engine's "ring full".
            //
            // ★ PRE-ROLL. The engine schedules generated frames a little ahead
            // of the audio, so starting the speaker on the first chunk leaves
            // the mouth behind for the whole utterance. Feed 1.6 s first.
            let preroll = 16 * 1600                  // 1.6 s of 16 kHz mono
            var started = false
            var i = 0
            while i < pcm.count {
                let j = min(i + 1600, pcm.count)
                guard await renderer.push(pcm[i..<j]) else {
                    status = "The engine stopped accepting audio."; return
                }
                i = j
                if !started, i >= preroll {
                    started = true
                    log("pre-roll fed; \(await renderer.framesReady()) frames queued")
                    player?.play()
                }
            }
            if !started { player?.play() }
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1e9))
            if let why = await renderer.renderStatus() { log("render status: \(why)") }
            status = "Ready."
        }
    }

    /// ★ Not optional, and it must be SYNCHRONOUS. Exiting with a Metal
    /// completion handler still in flight crashes inside `__cxa_finalize`.
    /// `be_essence2_quiesce_all` stops every live engine and BLOCKS until their
    /// background GPU work has drained, which is exactly what is needed here —
    /// a `Task` queued at terminate time may never run.
    func shutdown() {
        loop?.cancel()
        _ = be_essence2_quiesce_all(3000)
    }
}

// MARK: - 6. UI

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate {
    // @MainActor on the class is what makes this mutable static concurrency-safe
    // under Swift 6.
    static weak var session: AvatarSession?
    func applicationWillTerminate(_ application: UIApplication) {
        AppDelegate.session?.shutdown()
    }
}

@main
struct IOSEssence2App: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    var body: some Scene { WindowGroup { ContentView() } }
}

struct ContentView: View {
    @StateObject private var session = AvatarSession()

    var body: some View {
        VStack(spacing: 14) {
            Text("bitHuman · Essence 2 on device").font(.headline)
            ZStack {
                FrameView(sink: session.sink)
                if !session.hasFrame { ProgressView().tint(.white) }
            }
            .frame(maxHeight: 560)
            Button(session.busy ? "Speaking…" : "Speak") { session.speak() }
                .buttonStyle(.borderedProminent)
                .disabled(!session.ready || session.busy)
            Text(session.status).font(.subheadline)
            Text(session.detail).font(.caption2).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .task {
            AppDelegate.session = session
            await session.boot()
        }
    }
}
```

★ **Where the identity actually ends up, and what it costs.** `agent.imx` rides
in the app bundle, which is read-only, so the engine does not open it in place:
it sniffs the container, and unpacks the members into
`NSTemporaryDirectory()/essence2-unpacked` before anything reads them. Two
consequences worth planning for, and neither is an error:

- **Disk.** The identity is on the phone twice after first launch — once in the
  app bundle, once unpacked. For `A21SKT4314` that is about 155 MB each.
- **The first launch is the slow one.** The unpack happens once. iOS may
  reclaim the temporary directory when the device is short of space, and the
  next launch then unpacks again and is slow again. If you would rather pay the
  disk than the wait, unpack to a directory you control and hand
  `be_essence2_create` that directory instead of the `.imx` — a directory is
  opened as-is.

## 5. Sign it, and run it on the phone

Nothing here runs in the Simulator, so the first build that proves anything is a
device build.

- In Xcode: pick your **Team** under Signing & Capabilities, add
  `BITHUMAN_API_SECRET` to the Run scheme's environment, select your iPhone,
  press **Run**.
- From the command line, the working shape is **automatic** signing plus
  `-allowProvisioningUpdates`. Manual signing against an Xcode-managed profile
  fails outright.

```bash
xcodebuild -project IOSEssence2.xcodeproj -scheme IOSEssence2 \
  -configuration Debug -destination "id=<YOUR-DEVICE-UDID>" \
  -derivedDataPath build \
  DEVELOPMENT_TEAM=<YOUR-TEAM-ID> CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates build

xcrun devicectl device install app --device <YOUR-DEVICE-UDID> \
  build/Build/Products/Debug-iphoneos/IOSEssence2.app
xcrun devicectl device process launch --device <YOUR-DEVICE-UDID> --console \
  com.example.ios-essence2
```

> ★ **Over SSH the signing identity is not there.** In an SSH session the
> keychain search list holds only the system keychain, so
> `security find-identity -v -p codesigning` reports **0 valid identities** even
> with your certificates installed, and the build either fails outright or
> produces a bundle the phone rejects with `0xe800801c (No code signature
> found.)`. Build from a logged-in graphical session. The full list of signing
> traps is on [the SDK page](/sdk/apple).

## What you'll see

The app opens the identity, waits for the engine to warm up, shows the identity's
own motion, and says the bundled line once by itself. Press **Speak** to hear it
again. The console line to look for is

```text
[ios-essence2] engine ready: 1080x1920, ready in <n> s
```

Essence 2 plays at 25 frames per second, and an iPhone renders it faster than
that — which is why this app streams rather than generating the utterance first.
The [performance page](/performance) is the authority on every measured rate
and the only page that states one.

★ **Why this app streams and the
[Expression 2 one](/examples/swift-ios-expression2) does not.** Arithmetic, not
taste. One Essence 2 frame here is 1080 × 1920 × 3 = 6,220,800 bytes, so a five-second
line held in memory is 777 MB before it becomes a single `CGImage`. Expression 2
frames are 416 × 720 and a whole utterance fits. Hold nothing here: pull one
frame per tick and draw it.

## Troubleshooting

Each row below quotes the shipped engine's own wording where it has one.

| What you see | What it is | Fix |
|---|---|---|
| `no such module 'Essence2'` | the package resolved but the product is not attached to the target, or you named a product this package does not vend | attach `Essence2` — the four products are `bitHumanKit`, `Expression2`, `Essence2`, `BithumanEngineProtocol` |
| a link failure with **116 duplicate symbols** on a device build, while the Simulator is green | a tag below 2.14.0 with `Expression2` and `Essence2` both attached | raise the floor to 2.14.1 and force the resolve |
| `Undefined symbols … _OrtGetApiBase` | something is linking the engine without the ONNX Runtime target that rides with it | attach the `Essence2` **product**, not a bare target |
| the link fails naming a minimum OS newer than your target | 99 objects in the shipped slice are built at iOS 26.0 | set Minimum Deployments to **iOS 26.0** |
| `be_essence2_create returned -2` and a message ending *"the download is incomplete"* | `agent.imx` is truncated or is an error page | re-run `./setup.sh`; the check in step 1 catches this on your Mac |
| `be_essence2_create returned -2` naming *"is neither a bundle directory nor a container the door serves"* | the file you passed is not what the download door hands back | pass the `.imx` exactly as downloaded — do not unzip it |
| a refusal naming *"is a meta.json (.elevatedir) bundle. That reader was removed on 2026-09-15"* | an identity exported before that date | re-download it from the door, which serves the current format |
| *"the shared audio front end is missing"*, or the engine starts and never becomes ready | the engine resources are not at the app bundle's resource root | add `EngineResources` as **groups** (yellow), not as a folder reference |
| **the identity's motion plays, on a phone below an iPhone 16 Pro, and it never speaks** | **check this first**: you resolved an Essence 2 engine older than `essence2-v1.9.0`, whose warm-up refuses the device by name and leaves the engine idle-only. Nothing is thrown | raise the package floor to **2.14.0** and confirm with the two `grep`s in [step 2](#2-the-xcode-project) |
| the identity's motion plays and it never speaks, on a phone at or above that floor | the engine's own runtime failed — this reaches you as an absence, not an error | read `be_essence2_render_status`; the app above logs it after every utterance |
| `be_essence2_create` returns `-3` | no API secret, or one the service rejected — stderr says which (`refusing to serve: …`) | set `BITHUMAN_API_SECRET` in the Run scheme, or pass your API secret to `be_essence2_set_api_secret`; [the API secret](#the-key-starts-the-session) |
| every pull returns `-3` mid-session and the app stops | the service started rejecting the key during the session: 300 s grace, then it stops | check the key; generate a new one if it was revoked |
| `be_essence2_create returned -3` at launch, before any frame | `BITHUMAN_METER_ENFORCE=1` is in the scheme's environment: it turns the startup cases into a refusal with no grace | unset it, or supply a key the service accepts |
| `be_essence2_get_info reported a 0-pixel canvas` | the guard in `load()` firing — `get_info` answered before the engine had produced a frame | re-run; if it repeats, report the agent code. Without the guard this is a face that never moves and no message at all |
| `ld` warns *"built for newer 'iOS' version (26.0) than being linked"*, once per object | the package manifest's `.iOS(.v16)` floor meeting objects built at iOS 26 | expected — not a fault. The error version of this is a link failure, fixed by Minimum Deployments **iOS 26.0** |
| the app builds for the Simulator and then crashes there | expected — this is on-device Apple-Silicon inference | run on a physical device |
| the app disappears mid-render with no crash log | iOS jetsammed it at the roughly 3 GB an unentitled app may hold | this app fits; if yours has grown past it, request the two memory entitlements ([iOS SDK](/sdk/apple#apple-entitlements--bithumankit-only)) |
| the first launch takes minutes, and does again later | the engine unpacks `agent.imx` under `NSTemporaryDirectory()`, which iOS may reclaim | expected; unpack to a directory you control and pass that instead — see the note after the code |

## Next steps

- [iOS & iPadOS SDK](/sdk/apple) — the reference for this package, plus signing and the hardware notes.
- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) — the same shape for Expression 2, which needs no key at all.
- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — the same two models on Android, both projects in full.
- [Essence 2](/concepts/essence-2) — what the model is and where it runs.
- [Performance](/performance) — measured frame rates for every platform.
- [Agents API](/api/agents) — creating an agent and downloading its model.
