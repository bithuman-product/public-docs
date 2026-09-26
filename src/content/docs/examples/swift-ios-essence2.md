---
title: "iOS example: Essence 2"
description: "A complete SwiftUI app that renders a photoreal Essence 2 avatar at full resolution on an iPhone or iPad, on the device: four files, one setup script."
section: examples
group: "Examples"
order: 31
type: example
label: "iOS: Essence 2"
---

A SwiftUI app that opens an Essence 2 avatar, shows its idle motion, and speaks a line with the lips in sync, all rendered on the phone at the avatar's own resolution (up to 1080p) at 25 fps. **Speak** plays the line again.

`Sources/App.swift` uses `Essence2Kit` ([Apple](/sdk/apple)): `Essence2Engine.create(identity:resourcesDirectory:)` opens the bundled avatar, and `frames(following:)` paces the picture to the audio player.

## Requirements

| You need | Notes |
|---|---|
| A Mac with Xcode 26 or newer, and an Apple Developer team | a device build is a signed build |
| A physical iPhone, or an M-series iPad, on iOS 26 | the Simulator cannot run the engine; no Apple entitlement is needed |
| Swift package **2.17.2** or newer, `Essence2Kit` product | the project already depends on it |
| An [API secret](/start/api-secret) | the engine bills session time, talking or idle |
| About 430 MB free on the phone and 380 MB on the Mac | the avatar and the engine resources ride in the app bundle |

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-essence2
./setup.sh
```

`setup.sh` downloads the default avatar into `Sources/Model/` and the engine resources into `Sources/EngineResources/` (both git-ignored), checks both, and makes a speech clip. `./setup.sh <AGENT_CODE>` fetches another avatar.

## Set your API secret

In Xcode: **Product → Scheme → Edit Scheme → Run → Environment Variables**, add `BITHUMAN_API_SECRET`. The app reads it at launch and passes it to `Essence2Credential.set(_:)`.

## Run it

```bash
open IOSEssence2.xcodeproj
```

Pick your team under **Signing & Capabilities**, choose your iPhone as the run destination, and press **Run**.

## Expected output

The avatar appears in its idle motion, then says the bundled line once. The console prints:

```text
[ios-essence2] engine ready: 1080x1920, ready in <n> s
```

The first launch unpacks the avatar and prepares the engine, so it is slower than later launches.

## How it works

1. **Credential first:** `Essence2Credential.set(_:)` is called before the engine is created.
2. **Open the avatar:** `Essence2Engine.create(identity:resourcesDirectory:)` opens the bundled `.imx` with the engine's runtime files from `Sources/EngineResources`.
3. **One draw loop:** `frames(following: player)` hands out 25 frames a second for the life of the app: idle motion between replies, and a reply's frames as the player plays their audio.
4. **Speak:** `feed(_:)` the reply's 16 kHz samples, then `flushTail()`; the draw loop starts the reply's audio with its first speech frame, so the lips stay on the voice.
5. **Stream, don't collect:** one 1080×1920 frame is 6.2 MB, so the app draws each frame as it arrives.

`Sources/App.swift` is the whole app. The full API is on [Apple](/sdk/apple#integrate-into-your-app) and [Apple API reference](/sdk/apple-api).

## Make it your own

- **Another sample avatar:** `./setup.sh <AGENT_CODE>` with any of these; the app reads the frame size back from the engine.

  | Avatar | Agent code | Frame |
  |---|---|---|
  | warm-clear-professional-presenter (default) | `A21SKT4314` | 1080×1920 |
  | sofia-ramirez | `A52DHS2219` | 1080×1920 |
  | kwame-warm-museum-guide | `A62SJB3901` | 1080×1920 |
  | afro-latina-astrophysics-mentor | `A23KSG5258` | 1920×1080 |
  | calm-product-specialist-advisor | `A24EKJ8433` | 1280×720 |

- **Your own avatar:** create one with the [Agents API](/api/agents) (`"model": "essence-2"`), then run `BITHUMAN_API_SECRET=… ./setup.sh <AGENT_CODE>`.
- **Ship it:** fetch the secret from your backend or the Keychain at launch and pass it to `Essence2Credential.set(_:)`; never put it in the app bundle.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `create` throws `Essence2KitError.meteringRefused(reason:)` | no API secret, or the service rejected it (`reason` says which): set `BITHUMAN_API_SECRET` in the Run scheme |
| `create` throws `.identityUnreadable` | re-run `./setup.sh`; it checks the download |
| *"the shared audio front end is missing"*, or the engine never becomes ready | add `Sources/EngineResources` as a **group**, not a folder reference |
| The avatar moves but never speaks | resolve Swift package **2.17.2** or newer (*File → Packages → Update to Latest Package Versions*) |
| The link fails naming a newer minimum OS | set Minimum Deployments to **iOS 26.0** |
| `no such module 'Essence2Kit'` | attach the `Essence2Kit` product to the app target |
| `ld` warns *"built for newer 'iOS' version (26.0)"* once per object | expected; the build is good |
| It builds for the Simulator and crashes there | run on a physical device |

More on [Apple: Troubleshooting](/sdk/apple#troubleshooting).

## Next

- [iOS example: Expression 2](/examples/swift-ios-expression2) · [Android example: Essence 2](/examples/android-essence2) · [Apple SDK](/sdk/apple) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-essence2)
