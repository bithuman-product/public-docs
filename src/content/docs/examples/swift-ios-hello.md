---
title: "Swift / iOS — Hello, avatar"
description: "A complete on-device voice agent on iPhone or iPad — speech in, a language model, speech out and a lip-synced avatar — built on the bitHumanKit SwiftPM package. Needs an iPhone 16 Pro or newer and two Apple entitlements, so read the requirements first."
section: examples
group: "Examples"
order: 32
type: example
slug: examples/swift-ios-voice-agent
label: "iOS: voice agent"
---

This example is the **whole conversation**: on-device speech recognition, a
language model, speech synthesis and a lip-synced avatar, from one SwiftPM
product (`bitHumanKit`). It is also the most demanding Apple path bitHuman has —
it needs recent hardware and two Apple entitlements that take days to be
granted, so check the requirements before you clone anything.

Want only *a rendered avatar frame on the iPhone in your pocket*? Take
[Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2)
instead: no device floor, no entitlement, no large download.

## Before you start

Work down this list in order. Step 1 is first because Apple's reply is the long
pole — everything else takes minutes.

1. **Request two Apple entitlements.** developer.apple.com → Account →
   Membership → *Request Additional Capabilities*, and ask for both:

   ```text
   com.apple.developer.kernel.increased-memory-limit
   com.apple.developer.kernel.extended-virtual-addressing
   ```

   Apple replies by email; it has taken **1–3 business days**. Without them iOS
   terminates the app mid-conversation, about half a minute into a live turn,
   when memory passes the ~3 GB default ceiling. The provisioning profile
   updates itself once they are granted. Full detail:
   [Apple entitlements](/sdk/apple#platform-notes).

   ★ These are **entitlements**, so they are embedded in the code signature from
   the file `CODE_SIGN_ENTITLEMENTS` names. They are not `Info.plist` keys and
   putting them in an `Info.plist` grants nothing — see step 3 of
   [Run it](#run-it), which is the one place on this page where that distinction
   costs you an app that is killed mid-turn after Apple has already said yes.
2. **Check your device is above the floor.** This example needs an **iPhone 16
   Pro or later** (A18 Pro), or an **iPad Pro M4 or later** (16 GB), on **iOS /
   iPadOS 26 or newer**. `HardwareCheck.evaluate()` refuses anything else at
   launch and you get the unsupported screen, not an avatar. Explicitly refused:
   iPhone 15 Pro and earlier, iPhone 16 / 16 Plus (non-Pro A18), iPad Air M2 and
   M3, iPad Pro M1 and M2. The Simulator cannot stand in for the device.
3. **Install Xcode 26 or newer** on a Mac, and join an Apple Developer team.
   Older Xcodes reject the Swift 6 concurrency syntax the package is built with.
4. **Get an API secret** — free at
   [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys). The app
   below reads it from `BITHUMAN_API_SECRET` and hands it to `bitHumanKit` as
   `config.apiKey` — that field keeps its published name
   ([authentication](/api/authentication)).
   Avatar mode is metered ([pricing](/guides/pricing)); audio-only voice is not.
5. **Leave room for the weights.** On first launch the app downloads the
   on-device model — about **1.6 GB**, cached afterwards.

## Which example should I take?

| You want | Take | Floor |
|---|---|---|
| a rendered avatar frame on the phone you already own | [Expression 2 on the iPhone you have](/examples/swift-ios-expression2) | any Apple Silicon iPhone or iPad |
| the whole voice conversation, avatar included | this page (`bitHumanKit`) | iPhone 16 Pro / iPad Pro M4, iOS 26, two entitlements |
| the 1080p photoreal renderer in your own app | the `Essence2` product — [Swift SDK](/sdk/apple#install) | any Apple Silicon iPhone, M-series iPad or M3 Mac, OS 26 |

This page uses the **`bitHumanKit`** umbrella product (`import bitHumanKit`):
an on-device avatar engine, an `.imx` avatar runtime and the renderer views in
one framework, with every third-party dependency statically linked and zero
transitive SwiftPM dependencies. It is a **preview** rail.

`bitHumanKit` bundles its own engine. It is not an Apple build of
[`expression-1`](/concepts/expression-1), which is GPU-only and has no Apple
build at all ([where each model runs](/concepts/models#where-each-model-runs)). The two
engine products in the same package — `Expression2` and `Essence2` — are
separate products with their own APIs, and this example uses neither: see
[Swift SDK](/sdk/apple#install).

## Run it

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-avatar
```

★ **What you just cloned is a SwiftPM package, not an Xcode app project — the
app target is yours to make.** Read back out of the repository's `main` on
**2026-09-21**: `swift/ios-avatar` holds exactly four files —
`Package.swift`, `README.md`, `Sources/IOSAvatarApp.swift`,
`Sources/Info.plist` — and **no `.xcodeproj`**. Its manifest declares one
`.executableTarget`, which builds a bare Mach-O rather than a `.app` bundle, so
there is nothing for `devicectl` to install; a package has no target and
therefore no *Signing & Capabilities* tab; and `Sources/Info.plist` sits inside
that target's source path, where SwiftPM does not consume it — it never becomes
an app's `Info.plist` and no key in it reaches a built product. The sibling
example `swift/ios-expression2` ships a real `IOSExpression2.xcodeproj` and a
`project.yml`; this one does not. **UNVERIFIED-BY-EXECUTION:** the file
inventory and the manifest above are read from the repository; no Xcode ran in
this lane, so the consequences are argued from the manifest, not from a build.

Six steps, and the package becomes a dependency rather than the app.

**1. Make the app.** Xcode → *File → New → Project → App*, SwiftUI interface,
Minimum Deployments **iOS 26.0**, Swift Language Version **6**, your team under
*Signing & Capabilities*.

**2. Add the package.** *File → Add Package Dependencies…*, paste

```
https://github.com/bithuman-product/homebrew-bithuman.git
```

choose **Up to Next Major Version** from **2.14.2** — the same floor
`swift/ios-avatar/Package.swift` declares — and attach the **`bitHumanKit`**
product, only that one. Verified 2026-09-23 by listing the package's tags:
`from: "2.14.2"` resolves **v2.14.2**, the newest 2.x tag, and `bitHumanKit`'s
own binary has ridden on tag `v2.4.0` unchanged since v2.11.0, so any floor in
that range gives you the same framework.

`bitHumanKit` bundles its own engine and needs neither `Expression2` nor
`Essence2`. (Those two may share one target from 2.14.0; below it an app's
final link failed with **116 duplicate symbols** on `ios-arm64` and
`macos-arm64` while the Simulator was green.)

**3. Put the entitlements in a `.entitlements` file.** Under *Signing &
Capabilities* press **+ Capability** and add *Increased Memory Limit* and
*Extended Virtual Addressing*; Xcode writes the file and points
`CODE_SIGN_ENTITLEMENTS` at it. By hand it is:

```xml
<!-- IOSAvatar.entitlements — the app target's CODE_SIGN_ENTITLEMENTS -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.kernel.increased-memory-limit</key><true/>
    <key>com.apple.developer.kernel.extended-virtual-addressing</key><true/>
</dict>
</plist>
```

★ **The copy of these two keys in `swift/ios-avatar/Sources/Info.plist` does
nothing, and that file is the trap on this page.** An `Info.plist` is not an
entitlements file — an entitlement reaches the kernel through the code
signature — and this particular `Info.plist` is unreachable anyway, for the
reason above. What you *do* want out of it is the pair of **privacy strings**,
`NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`:
copy those into your app target's real `Info.plist`, where they belong. Without
them the microphone never opens, and iOS caches the denial.

**4. Take the source.** Copy `Sources/IOSAvatarApp.swift` into the app target —
it is the whole app, 192 lines, `@main` included — and delete the `ContentView`
Xcode generated, so there is exactly one `@main`.

**5. The API secret.** *Product → Scheme → Edit Scheme → Run → Arguments →
Environment Variables* → add `BITHUMAN_API_SECRET` with your API secret. Never
hard-code it in source.

**6. Run** on a physical iPhone 16 Pro or iPad Pro M4+.

★ **`ld` warns on every object of the engine, and the build is still good.**
The package manifest declares `.iOS(.v16)` while the binaries it vends are built
for iOS 26, so the linker says *"object file … was built for newer 'iOS' version
(26.0) than being linked"* once per object. It is the manifest's floor meeting
the objects' floor, not a fault in your project; building at iOS 26.0, as step 1
does, is what the engines actually require.

To compile-check the example's sources without making an app — useful in CI,
useless on a phone, because it produces no installable bundle:

```bash
cd bithuman-examples/swift/ios-avatar      # the manifest is resolved from the cwd
xcodebuild -scheme IOSAvatar -destination 'generic/platform=iOS' \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=<YOUR_TEAM_ID> \
  -allowProvisioningUpdates build
```

Signing needs a keychain identity, so run that from a logged-in graphical
session: over SSH the keychain search list holds only the system keychain and
`security find-identity -v -p codesigning` reports **0 valid identities**.

If you cloned this repository before 2026-09-09, `git pull`: until then every
Swift example pinned a 0.x tag that carries no `Package.swift`, and Xcode failed
at resolve with `error: the package manifest at '/Package.swift' cannot be
accessed`.

## What you'll see

On first launch the app downloads the on-device weights (~1.6 GB, cached), warms
the model, then shows a live circular avatar that says "live — talk to me".
Speak, and the avatar answers and lip-syncs the reply entirely on the device.
Under-spec devices show an "unsupported device" screen instead — that is
`HardwareCheck.evaluate()` doing its job, not a failure.

## The code

The minimal shape: a `HardwareCheck` gate, then a `VoiceChat` that boots the
avatar. It is an excerpt, not the file to build — the app you copy in step 4 of
[Run it](#run-it) is `Sources/IOSAvatarApp.swift`, which adds the render-host
wiring (`AvatarHost`), the `FramePump`, the `AvatarCoordinator`, the barge-in
hook and a `.downloading(Double)` phase this excerpt leaves out.

```swift
// IOSAvatarApp.swift — iOS voice agent with a lip-synced avatar
import SwiftUI
import UIKit
import bitHumanKit

@main
struct IOSAvatarApp: App {
    var body: some Scene {
        WindowGroup {
            switch HardwareCheck.evaluate() {
            case .supported:                 AvatarRootView()
            case .unsupported(let reason):   UnsupportedDeviceView(reason: reason)
            // Required. Without it the switch does not compile against the
            // shipped binary: "switch covers known cases, but
            // 'DeviceCapability' may have additional unknown values".
            @unknown default:                UnsupportedDeviceView(reason: "This device is not supported.")
            }
        }
    }
}

@MainActor
final class AvatarLifecycle: ObservableObject {
    @Published var phase: Phase = .idle
    @Published private(set) var renderer: AvatarRendererView?
    private var chat: VoiceChat?

    enum Phase: Equatable { case idle, warming, live, error(String) }

    func start() async {
        do {
            // 1. Download / verify the on-device weights (~1.6 GB, cached).
            let weights = try await ExpressionWeights.ensureAvailable { _ in }
            phase = .warming

            // 2. Configure a voice chat with an avatar.
            let agent = AgentCatalog.defaultAgent
            // thumbnailURL returns URL? and portraitPath takes URL, so the
            // unwrap is not decoration: without it this line does not compile.
            guard let portrait = AgentCatalog.thumbnailURL(for: agent) else {
                phase = .error("no portrait for \(agent.code)"); return
            }
            var config = VoiceChatConfig()
            config.systemPrompt = agent.systemPrompt
            config.avatar = AvatarConfig(modelPath: weights, portraitPath: portrait)
            // your API secret; bitHumanKit's field keeps its published name, apiKey
            let env = ProcessInfo.processInfo.environment
            config.apiKey = env["BITHUMAN_API_SECRET"] ?? env["BITHUMAN_API_KEY"] // BITHUMAN_API_KEY: the deprecated alias an older scheme may still set

            // 3. Start it and render frames into a view.
            let chat = VoiceChat(config: config)
            try await chat.start()
            self.chat = chat
            self.renderer = AvatarRendererView(frame: .zero,
                                               idleFrame: chat.initialIdleFrame,
                                               clipMode: .circle)
            self.phase = .live
        } catch {
            phase = .error(error.localizedDescription)
        }
    }
}
```

Full source:
[`swift/ios-avatar`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-avatar).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| Xcode offers no *Signing & Capabilities* tab, or **Run** is greyed out, after opening `swift/ios-avatar/Package.swift` | you opened a SwiftPM package; it has no app target and its `.executableTarget` builds no `.app` | make an app project that depends on the package — [Run it](#run-it) |
| the app is killed mid-turn **after** Apple granted the entitlements | the keys are in an `Info.plist`, which grants nothing; an entitlement is signed in from `CODE_SIGN_ENTITLEMENTS` | step 3 of [Run it](#run-it) |
| the microphone never opens and no permission sheet appears | the privacy strings never reached your app target's real `Info.plist` | step 3 of [Run it](#run-it) — copy `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` across |
| hundreds of `ld` lines: *"object file … was built for newer 'iOS' version (26.0) than being linked"* | the package manifest declares `.iOS(.v16)`; the engine objects are iOS 26 | expected, not a fault — build at iOS 26.0 |
| a device link fails with **116 duplicate symbols** while the Simulator is green | `Expression2` and `Essence2` both attached on a tag below 2.14.0 | raise the floor to 2.14.1, or drop both — `bitHumanKit` needs neither |
| the "unsupported device" screen at launch | the device is below the floor — the refusal names the model it detected | use an iPhone 16 Pro / iPad Pro M4+, or ship [`Expression2`](/examples/swift-ios-expression2) on that device |
| the app is killed mid-conversation, no crash log | the ~3 GB memory ceiling: the entitlements are not granted yet, or not in the profile | check Apple's reply, then rebuild so the profile picks them up ([entitlements](/sdk/apple#platform-notes)) |
| `error: the package manifest at '/Package.swift' cannot be accessed` | a clone from before 2026-09-09, pinning a 0.x tag | `git pull` |
| the avatar never starts and the error mentions a key | `BITHUMAN_API_SECRET` is not in the scheme's environment | add it under *Edit Scheme → Run → Arguments* |
| the microphone never opens | missing privacy strings; the OS caches the denial | keep `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` in `Info.plist` |
| a Simulator build succeeds and proves nothing | the hardware gate reads `hw.machine`, which in a Simulator is not your phone's | test on the device ([why](/sdk/apple#platform-notes)) |

## Next steps

- [Swift / iOS — a talking avatar on the iPhone you have](/examples/swift-ios-expression2) — the same goal without the device floor, the entitlements or the 1.6 GB download.
- [Swift / iOS — Essence 2 on device](/examples/swift-ios-essence2) — the 1080p renderer in an app you build yourself, every file printed; no entitlement, no device gate.
- [Swift SDK](/sdk/apple) — the full Apple reference: requirements, products, models, errors.
- [LiveKit integration](/sdk/livekit) — connect to a server-hosted agent instead.
- [AI voice chat](/examples/ai-conversation) — add a conversational brain in Python.
- [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — offline macOS voice agent: no avatar, no API secret.
- [Where each model runs](/concepts/models#where-each-model-runs) — which model to ship, and which platforms it runs on.
