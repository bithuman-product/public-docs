---
title: "Companion app"
description: "An AI companion in your iPhone, iPad or Android app: a photoreal Essence 2 avatar that renders on the phone and speaks the replies your own voice stack produces."
section: build
group: "Recipes"
order: 15
type: recipe
time: "45 min"
availability: "creator"
renders: ["device"]
needs: ["Physical device", "API secret"]
platforms: ["ios", "android"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S10", "S24", "S30", "S32"]
next: ["/platforms/ios", "/platforms/android", "/deploy/on-device"]
---

## What you'll build

<div class="lead">
<div class="lead-text">

A companion screen in your own app: an avatar that idles while the user talks, then speaks your app's reply with its lips in sync. The avatar renders on the phone; your app keeps its own speech recognition, language model and voice.

You need:

- Xcode 26 and a physical iPhone or iPad, or Android Studio and a physical arm64 Android phone;
- an [API secret](/start/api-secret) on the Creator plan or higher;
- the speech recognition, language model and voice your app already uses.

</div>

```figure
android-essence-2 eager
```

</div>

## Steps

The code in each step is from two example apps that bithuman-examples builds in CI: [iOS Essence 2](/examples/ios-essence-2) (Swift) and [Android Essence 2](/examples/android-essence-2) (Kotlin). Expression 2, for a character instead of a person, has the same shape.

### Pick the avatar

Use the `sofia-ramirez` sample (agent code `A52DHS2219`) while you build, or [create your own](/build/create-avatar) from one portrait.

```expected
An agent code for an Essence 2 avatar.
```

### Add the SDK

- **iPhone and iPad:** the Swift package, product `Essence2Kit` ([install](/platforms/ios#install)).
- **Android:** the Android SDK, `essence2-android` ([install](/platforms/android#install)).

```expected
Your app builds with `import Essence2Kit`, or with `ai.bithuman.essence2` on the classpath.
```

### Set your API secret

One call covers the avatar's download and the session. A shipped app holds the secret on the device, so give each app its own secret that you can rotate or revoke; a build you ship fetches it from your own backend at startup.

```swift tab="Swift"
// excerpt: swift/ios-essence2/Sources/App.swift
Essence2Credential.set(ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"])
```

```kotlin tab="Kotlin"
// excerpt: android/essence2-hello/app/src/main/java/com/example/e2hello/MainActivity.kt
// 1. The CREDENTIAL, once, before anything downloads or opens an engine.
//    One setter covers the store's download and the engine's meter;
//    create() refuses without it.
Essence2Credential.set(secret)
```

```expected
No refusal when the avatar opens in the next step. Without a secret, opening it fails and says why.
```

### Open the avatar

```swift tab="Swift"
// excerpt: swift/ios-essence2/Sources/App.swift
let e = try await Essence2Engine.create(identity: imx, resourcesDirectory: Payload.resources)
```

```kotlin tab="Kotlin"
// excerpt: android/essence2-hello/app/src/main/java/com/example/e2hello/MainActivity.kt
// 2. The STORE downloads with the credential set above.
//    Blocks on the network the first time; that is why this is a worker thread.
val store = Essence2ModelStore(this)
val identity = store.fetch(agentCode, progress = { member, done, total ->
    if (done == total) Log.i(TAG, "fetched $member ($total B)")
})
// …
Essence2Avatar.create(identity.dir).use { avatar ->
```

```expected
The first run downloads the avatar once, then it stays on the device. The avatar shows idle motion before it says anything.
```

### Speak a reply

Your speech recognition hears the user, your language model writes the reply, and your voice turns it into audio. Feed that audio as 16 kHz mono, say where the reply ends, and draw the frames the avatar hands back:

```swift tab="Swift"
// excerpt: swift/ios-essence2/Sources/App.swift
private func startLoop(_ e: Essence2Engine) {
    loop?.cancel()
    let frames = e.frames(following: player)
    loop = Task { [weak self] in
        for await f in frames {
            guard let self else { return }
            if f.audioTime == 0, let r = self.reply {
                self.player.stop()
                self.player.scheduleBuffer(r)
                self.player.play()
            }
            if let cg = makeCGImage(bgr: f.bgr, f.width, f.height) {
                self.sink.show(cg)
                self.hasFrame = true
            }
    // …
    e.feed(samples)
    e.flushTail()
```

```kotlin tab="Kotlin"
// excerpt: android/essence2-hello/app/src/main/java/com/example/e2hello/MainActivity.kt
Essence2Avatar.create(identity.dir).use { avatar ->
    // …
    val frame = avatar.newFrameBuffer()   // direct, width * height * 4, RGBA
    // …
    avatar.feed(pcm)                      // 16-bit little-endian PCM bytes, as read
    avatar.endOfAudio()                   // "that is the whole utterance"
    // …
    var quietMs = 0
    while (quietMs < 5_000) {             // 5 s with no frame at all = finished
        frame.clear()
        if (avatar.pull(frame)) {         // true = a frame was written
            quietMs = 0
            frame.rewind()
```

```expected
The lips follow the reply's audio from its first word, and idle motion returns when the reply ends.
```

### Let the user interrupt

When your speech recognition hears the user start talking over the avatar, stop your audio player and drop the rest of the reply: `interrupt()` in Swift, `resetAudio()` in Kotlin. Idle motion continues from the current frame. The full list of calls is under *Integrate into your app* on [iOS & iPadOS](/platforms/ios#integrate-into-your-app) and [Android](/platforms/android#integrate-into-your-app).

```expected
The mouth stops with the voice, and the next reply starts cleanly.
```

### Run it on a phone

Build to a physical iPhone or iPad (iOS 26), or to a physical arm64 Android phone. The iOS Simulator and Android emulators cannot run the engine.

```expected
The companion idles, answers and can be interrupted, rendered on the phone.
```

## How it works

```diagram
topology device
```

The avatar renders inside your app, from 16 kHz mono speech to picture frames. When you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text. A session checks your API secret when it starts and keeps rendering through a network drop of up to 5 minutes.

## Make it your own

- **A character instead of a person:** Expression 2 renders any character from one portrait, with the same calls ([iOS & iPadOS](/platforms/ios), [Android](/platforms/android)).
- **One codebase:** the [Flutter plugin](/platforms/flutter) wraps both engines.
- **Its personality:** it lives in your language model's prompt. The avatar only renders the speech it is given.

What it costs on the device:

```price
device
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Opening the avatar fails with a metering refusal | Set the API secret before the download and the first `create`, on the Creator plan or higher. |
| It works on a phone but not in the Simulator or an emulator | Expected: the engine needs a physical device. |
| The lips run ahead of the voice | Start the reply's audio with its first speech frame (`audioTime == 0` in Swift), not when you feed it. |
| The reply is cut short | Mark the end of each reply once: `flushTail()` in Swift, `endOfAudio()` in Kotlin. |
| The first start is slow | The first run downloads the avatar; later starts open it from the device. |
