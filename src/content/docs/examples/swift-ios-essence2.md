---
title: "iOS example: Essence 2"
description: "A complete SwiftUI app that renders a photoreal Essence 2 avatar at full resolution on an iPhone or iPad, on the device: four files, one setup script."
section: examples
group: "Examples"
order: 31
type: example
label: "iOS: Essence 2"
---

A SwiftUI app that opens an Essence 2 avatar, shows its idle motion, and speaks a line with the lips in sync, all rendered on the phone at the avatar's own resolution (up to 1920×1080) at 25 fps. **Speak** plays the line again.

`Essence2` is a C library: the `be_essence2_*` functions in `be_essence2.h` are the whole API, and the `Renderer` actor in `App.swift` is the Swift wrapper you would otherwise write yourself.

## Requirements

| You need | Notes |
|---|---|
| A Mac with Xcode 26 or newer, and an Apple Developer team | a device build is a signed build |
| A physical iPhone or iPad with Apple silicon, on iOS 26 | the Simulator cannot run the engine; no Apple entitlement is needed |
| Swift package **2.14.2** or newer, `Essence2` product | the project already depends on it |
| An [API secret](/start/api-secret) | the engine bills talking time; idle is free |
| About 430 MB free on the phone and 380 MB on the Mac | the avatar and the engine resources ride in the app bundle |

## Get the code

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/swift/ios-essence2
./setup.sh
```

`setup.sh` downloads the default avatar into `Sources/Model/` and the engine resources into `Sources/EngineResources/` (both git-ignored), checks both, and makes a speech clip. `./setup.sh <AGENT_CODE>` fetches another avatar.

## Set your API secret

In Xcode: **Product → Scheme → Edit Scheme → Run → Environment Variables**, add `BITHUMAN_API_SECRET`. The app reads it at launch and passes it to `be_essence2_set_api_secret`.

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

1. **Credential first:** `be_essence2_set_api_secret` is called before the engine is created.
2. **One actor owns the engine:** the handle is a raw pointer, so an actor keeps it off the main thread and makes the app compile under Swift 6.
3. **Wait for ready:** `be_essence2_create` returns quickly and the engine prepares in the background; poll `be_essence2_is_ready` before pushing audio.
4. **Stream, don't collect:** one 1080×1920 frame is 6.2 MB, so the app pulls one frame per display tick and draws it.
5. **Push with retry:** `be_essence2_push_audio` returns `-2` when its buffer is full; pull frames, then push the same samples again.
6. **Draw on a 40 ms grid:** 25 fps, scheduled against absolute times so small sleep errors do not add up.

`Sources/App.swift` is the whole app. The full C API is on [Apple](/sdk/apple#integrate-into-your-app) and [Apple API reference](/sdk/apple-api).

## Make it your own

- **Another sample avatar:** `./setup.sh <AGENT_CODE>` with any of these; the app reads the frame size back from the engine.

  | Avatar | Agent code | Frame |
  |---|---|---|
  | warm-clear-professional-presenter (default) | `A21SKT4314` | 1080×1920 |
  | sofia-ramirez | `A52DHS2219` | 1080×1920 |
  | kwame-warm-museum-guide | `A62SJB3901` | 1080×1920 |
  | afro-latina-astrophysics-mentor | `A23KSG5258` | 1920×1080 |
  | calm-product-specialist-advisor | `A24EKJ8433` | 1280×720 |

- **Your own avatar:** create one with the [Agents API](/api/agents) (`"model": "essence-2"`), then run `setup.sh` with its code and `BITHUMAN_API_SECRET` set.
- **Ship it:** fetch the secret from your backend or the Keychain at launch and pass it to `be_essence2_set_api_secret`; never put it in the app bundle.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `be_essence2_create` returns `-3` | no API secret, or the service rejected it (stderr says which): set `BITHUMAN_API_SECRET` in the Run scheme |
| `be_essence2_create` returns `-2`, *"the download is incomplete"* | re-run `./setup.sh`; it checks the download |
| *"the shared audio front end is missing"*, or the engine never becomes ready | add `Sources/EngineResources` as a **group**, not a folder reference |
| The avatar moves but never speaks | resolve Swift package **2.14.2** or newer (*File → Packages → Update to Latest Package Versions*) |
| The link fails naming a newer minimum OS | set Minimum Deployments to **iOS 26.0** |
| `no such module 'Essence2'` | attach the `Essence2` product to the app target |
| `ld` warns *"built for newer 'iOS' version (26.0)"* once per object | expected; the build is good |
| It builds for the Simulator and crashes there | run on a physical device |

More on [Apple: Troubleshooting](/sdk/apple#troubleshooting).

## Next

- [iOS example: Expression 2](/examples/swift-ios-expression2) · [Android example: Essence 2](/examples/android-essence2) · [Apple SDK](/sdk/apple) · [source on GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-essence2)
