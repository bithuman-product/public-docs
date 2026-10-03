---
title: "Give an app's voice assistant a face"
description: "Feed your assistant's speech to the SDK and draw the lip-synced frames."
section: build
group: "How-to"
order: 30
type: recipe
llms: apps
searchTitle: "Give an app's voice assistant a face (any speech-to-speech stack)"
availability: "creator"
renders: ["device"]
needs: ["API secret"]
platforms: ["ios", "android", "python"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S10", "S24", "S30", "S32"]
next: ["/build/companion-app", "/platforms/ios", "/platforms/android"]
artifacts: ["swift", "expression2_android", "essence2_android"]
---

## What you'll build

The Swift and Android SDKs render: your app passes in 16 kHz mono speech from any voice stack and draws the frames, so the persona, the voice and the language model are yours to choose. Keep the speech-to-speech stack your assistant already uses, resample its reply audio to 16 kHz mono if it returns another rate, and feed it to the avatar. The avatar renders on the device, inside your app.

You need:

- an app with a voice assistant that produces reply audio (any speech recognition, language model and voice);
- Xcode 26 and an iPhone or iPad, or Android Studio and a physical arm64 Android phone;
- an [API secret](/start/api-secret) (Creator plan or higher).

## Steps

The code in these steps is from [Companion app](/build/companion-app) and [Android: Run your first avatar](/platforms/android#run-your-first-avatar).

### Choose where the face renders

| Where | Use | The conversation |
|---|---|---|
| In your app, on the device | the [Swift package](/platforms/ios) (iPhone, iPad, Mac) or the [Android SDK](/platforms/android) (arm64) | stays with your app and the services it uses |
| In your own Python code, on a Mac or a Linux machine | the [Python SDK](/platforms/python): `render` takes 16 kHz mono audio | stays with your code and the services it uses |
| In the bitHuman cloud or a browser tab | the [web embed](/platforms/web) or a [LiveKit](/platforms/livekit) agent with a bitHuman cloud avatar | runs on bitHuman's servers with the web embed |

This page follows the first row. Android, and Essence 2 on iPhone and iPad, need a physical device, not an emulator or the Simulator.

```expected
One SDK: the Swift package or the Android SDK.
```

### Pick the avatar

Use the `wise-pup` sample (Expression 2, agent code `A23WJF0199`) for a character, or the `sofia-ramirez` sample (Essence 2, agent code `A52DHS2219`) for a photoreal person, while you build. Or [create your own](/build/create-avatar) from one portrait.

```expected
An agent code.
```

### Add the SDK and set your API secret

- **iPhone and iPad:** the Swift package, product `Expression2` or `Essence2Kit` ([install](/platforms/ios#install)).
- **Android:** the Android SDK, `expression2-android` or `essence2-android` ([install](/platforms/android#install)).

One call covers the avatar's download and the session. Set it before anything downloads:

```swift tab="Swift"
Expression2Credential.set(ProcessInfo.processInfo.environment["BITHUMAN_API_SECRET"] ?? "")
```

```kotlin tab="Kotlin"
Expression2Credential.set(BuildConfig.BITHUMAN_API_SECRET)        // before fetch() and create()
```

On Android, `BuildConfig.BITHUMAN_API_SECRET` comes from your app's `build.gradle.kts` (set `BITHUMAN_API_SECRET` in the environment before you build, or read `local.properties` as on [the Android page](/platforms/android#install)):

```kotlin
android {
    buildFeatures { buildConfig = true }
    defaultConfig {
        buildConfigField("String", "BITHUMAN_API_SECRET", "\"${System.getenv("BITHUMAN_API_SECRET") ?: ""}\"")
    }
}
```

That field compiles the secret into the APK, so use it for local builds only. Keep the secret out of the app bundle you ship: fetch it from your backend at runtime ([What a shipped app holds](/start/api-secret#what-a-shipped-app-holds)).

```expected
No refusal when the avatar opens. Without a secret, opening it fails and says why.
```

### Resample speech to 16 kHz

The engines take 16 kHz mono speech. A voice service that returns another rate needs one conversion first; a service that returns 24 kHz 16-bit PCM, for example, needs a 24 kHz to 16 kHz converter. Keep one converter for the whole reply and pass each chunk through it before you feed the avatar:

```swift tab="Swift"
// Add to your app: 24 kHz 16-bit mono PCM in, the 16 kHz [Float] that feed(_:) takes out.
import AVFoundation

final class To16k {
    private let from = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 24_000, channels: 1, interleaved: false)!
    private let to = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16_000, channels: 1, interleaved: false)!
    private lazy var converter = AVAudioConverter(from: from, to: to)!

    func convert(_ pcm24k: Data) -> [Float] {
        let n = AVAudioFrameCount(pcm24k.count / 2)
        guard n > 0, let input = AVAudioPCMBuffer(pcmFormat: from, frameCapacity: n),
              let output = AVAudioPCMBuffer(pcmFormat: to, frameCapacity: n) else { return [] }
        input.frameLength = n
        pcm24k.withUnsafeBytes { input.int16ChannelData![0].update(from: $0.bindMemory(to: Int16.self).baseAddress!, count: Int(n)) }
        var given = false
        _ = converter.convert(to: output, error: nil) { _, status in
            if given { status.pointee = .noDataNow; return nil }
            given = true
            status.pointee = .haveData
            return input
        }
        return Array(UnsafeBufferPointer(start: output.floatChannelData![0], count: Int(output.frameLength)))
    }
}
```

```kotlin tab="Kotlin"
// Add to your app: 24 kHz 16-bit mono PCM in; floats() for Expression 2, pcm16() for Essence 2.
import java.nio.ByteBuffer
import java.nio.ByteOrder

class To16k {
    private var rest = FloatArray(0)   // input not used yet
    private var pos = 0.0              // read position in the input, in samples

    fun floats(pcm24k: ByteArray): FloatArray {
        val s = ByteBuffer.wrap(pcm24k).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
        val input = rest + FloatArray(s.remaining()) { s.get() / 32768f }
        val out = ArrayList<Float>()
        while (pos + 1 < input.size) {
            val i = pos.toInt()
            val f = (pos - i).toFloat()
            out.add(input[i] * (1 - f) + input[i + 1] * f)
            pos += 1.5                   // 24 000 / 16 000
        }
        rest = input.copyOfRange(pos.toInt(), input.size)
        pos -= pos.toInt()
        return out.toFloatArray()
    }

    fun pcm16(pcm24k: ByteArray): ByteArray {
        val f = floats(pcm24k)
        val b = ByteBuffer.allocate(f.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        for (x in f) b.putShort((x.coerceIn(-1f, 1f) * 32767).toInt().toShort())
        return b.array()
    }
}
```

```expected
Each 24 kHz chunk comes out as two thirds as many 16 kHz samples, and the lips keep pace with the voice. Speech fed at the wrong rate makes the mouth run slow and long.
```

### Feed the reply and draw the frames

Your speech recognition hears the user, your language model writes the reply, and your voice turns it into audio. Feed that audio as 16 kHz mono, say where the reply ends, and draw the frames the avatar hands back. On Android, with Expression 2 and the `wise-pup` sample (call `render` off the main thread):

```kotlin
import ai.bithuman.expression2.Expression2Avatar
import ai.bithuman.expression2.Expression2Credential
import ai.bithuman.expression2.Expression2ModelStore
import ai.bithuman.expression2.Expression2Options
import android.content.Context
import android.graphics.Bitmap

/** [pcm16k] is 16 kHz mono float32 in [-1, 1]. */
fun render(context: Context, pcm16k: FloatArray, show: (Bitmap) -> Unit) {
    Expression2Credential.set(BuildConfig.BITHUMAN_API_SECRET)        // before fetch() and create()
    val model = Expression2ModelStore(context).fetch("A23WJF0199")     // ~160 MB, first run only

    Expression2Avatar.create(context, model, Expression2Options()).use { avatar ->
        val frame = avatar.newFrameBitmap()   // 416 x 720, allocate once
        avatar.feed(pcm16k)
        avatar.flushTail()                    // end of the utterance
        while (true) {
            if (avatar.pull(frame) != null) { show(frame); continue }
            if (!avatar.hasPendingTail && avatar.queuedFrames == 0) break
            Thread.sleep(10)                  // null means "not ready yet"
        }
    }
}
```

Pass `To16k().floats(chunk)` as `pcm16k`. In Swift, `feed(samples)` and `flushTail()` do the same, and the reply's audio starts on its first frame (`audioTime == 0`): the complete loop is in [iOS & iPadOS: First frame](/platforms/ios#run-your-first-avatar), and an Essence 2 version is in [Companion app: Speak a reply](/build/companion-app#speak-a-reply).

```expected
The lips follow the reply's audio from its first word, and idle motion returns when the reply ends.
```

### Let the user interrupt

When your speech recognition hears the user start talking over the avatar, stop your audio player and drop the rest of the reply: `interrupt()` in Swift; in Kotlin, `resetState(true)` for Expression 2 or `resetAudio()` for Essence 2 ([Android: Integrate into your app](/platforms/android/app#integrate-into-your-app)). Idle motion continues from the current frame.

```expected
The mouth stops with the voice, and the next reply starts cleanly.
```

## How it works

The avatar renders inside your app, from 16 kHz mono speech to picture frames; it does not listen, think or speak on its own. When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text. A session bills active session time, talking or idle, for as long as the avatar is open ([pricing](/pricing)).

## Make it your own

- **A full companion screen:** closing the avatar with the screen and an Essence 2 version of every step are on [Companion app](/build/companion-app).
- **A character from your own art:** [Turn a drawing, mascot or pet photo into a talking character](/build/how-to/drawing-to-character).
- **One codebase:** the [Flutter plugin](/platforms/flutter) wraps both engines.
- **The conversation on bitHuman's servers instead:** the [web embed](/platforms/web) runs a managed agent with your persona; with the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Opening the avatar fails with a metering refusal | Set the API secret before the download and the first `create`, on the Creator plan or higher. |
| It works on a phone but not in the Simulator or an emulator | Expected: Essence 2 and the Android SDK need a physical device; Expression 2 also runs in the iOS Simulator. |
| The mouth runs slow and the reply lasts too long | The speech is not 16 kHz: [resample it](#resample-speech-to-16-khz) before you feed it. |
| The lips run ahead of the voice | Start the reply's audio with its first speech frame (`audioTime == 0` in Swift), not when you feed it. |
| The reply is cut short | Mark the end of each reply once: `flushTail()`, or `endOfAudio()` for Essence 2 on Android. |
