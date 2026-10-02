---
title: "Changelog"
description: "Release notes for every bitHuman SDK, the CLI, the API and plugins."
section: overview
group: "Resources"
order: 20
type: changelog
llms: none
---

What changed in each release, newest day first (grouped by artifact within a day). Current versions are on [Downloads & versions](/downloads) and in [/versions.json](/versions.json). Follow new releases with the [RSS feed](/changelog.xml). Entries before August 2026 are in the [archive](/changelog/archive).

```changelog-filter
```

## Highlights

The releases of September 2026 worth a look first.

```highlights
```

## Breaking changes

| Date | Artifact | Change | What to do |
|---|---|---|---|
| CLI 2.9, no earlier than 2026-12-26 (announced 2026-09-27) | CLI | the CLI stops reading the API secret from a `.env` file in the working directory | export `BITHUMAN_API_SECRET`, or run `bithuman login` once |
| 2026-12-26 (announced 2026-09-27) | REST API | `POST /v1/agent/generate` requires `model`; the bare names `essence` / `expression` and the `version` field are refused with a `400` | send `essence-2`, `expression-2`, `auto`, `essence-1` or `expression-1` |
| 2026-12-26 (announced 2026-09-27) | REST API | `GET /v1/usage` rows drop `activity_type` | read `source` (already in every row) or `pricing_code_meaning` |
| 2026-12-26 at the earliest (announced 2026-09-27) | CLI 3.0, bithuman 4.0 | the deprecated alias `BITHUMAN_API_KEY` is no longer read; bithuman 4.0 also drops `bithuman.offline` (use `bithuman.open(path).render(audio, out_mp4=...)`), `token=` and the `AsyncAvatar` alias | rename to `BITHUMAN_API_SECRET`; each old name warns until then |
| 2026-10-01 | REST API | bitHuman's text-to-speech service is retired: `POST /v1/tts`, `POST /v1/audio/speech`, `GET /v1/voices` and `/v1/studio/*` answer `410 ENDPOINT_RETIRED` | send your own audio (from any TTS provider or a recording) to the [talking video API](/build/talking-video); agent conversation voices and `/v1/agent/{code}/speak` are unchanged |
| 2026-10-01 | essence2-android 0.9.0 | `Essence2Metering.basis` is ignored and always reads `"session"`: a file render bills its session time like any other session; `SelfHostMeter.BASIS_OUTPUT` no longer exists | delete any `basis = …` line; call `close()` right after the last frame of a file render |
| 2026-09-27 | API | `POST /v1/realtime/ephemeral-token` is retired (`410 ENDPOINT_RETIRED`) | connect through the [Realtime relay](/api/realtime) (`wss://api.bithuman.ai/v1/realtime`) or `POST /v1/realtime/connect`; CLI 2.8.1+ already does |
| 2026-09-24 | expression2-android 0.5.0 | `Expression2ModelStore.MODEL`, `CANON` and `IDLE` are no longer compile-time constants | read them at runtime; a `when` branch or annotation that used them as constants must change |
| 2026-09-23 | Swift package 2.14.2 | `Expression2Engine.create` refuses without an API secret | call `Expression2Credential.set(_:)` or set `BITHUMAN_API_SECRET` |
| 2026-09-23 | expression2-android 0.4.9 | `Expression2Avatar.create` refuses without an API secret | set `Expression2Metering.apiSecret` |
| 2026-09-22 | CLI 2.7.0 | retired command spellings exit 2; `account --limit` defaults to 10 | use the [current names](/platforms/cli/reference#commands); pass `--limit 50` for the old window |
| 2026-09-16 | bithuman 2.11.0 | the 3.x releases are withdrawn from PyPI | unpin 3.x; `pip install bithuman` |
| 2026-09-16 | expression2-android 0.4.7 | `idleLoop` is an `Expression2IdleLoop`, not a `List<Bitmap>` | call `idleLoop?.next(bitmap)` |
| 2026-09-16 | Swift package 2.13.5 | `Expression2Engine.idleLoop` removed | use `idleNextPixelBuffer()` or `idle(into:)` |
| 2026-09-15 | essence2-android 0.5.7 | the `ElevateFrames` constructor (legacy `ai.bithuman.elevate` package, kept for compatibility) drops its execution-provider argument | delete that argument |
| 2026-09-14 | CLI 2.6.19 | `bithuman auth …` removed | `bithuman login`, `logout`, `account`, `token` |

## October 2026

### Flutter plugin 2.6.33 — 2026-10-02

Tag `flutter-plugin-v2.6.33`.

- **Android, Expression 2:** characters published without an idle clip no longer stay blank. The plugin shows a still frame of the character until its first reply, so it appears and can talk. iOS and macOS were not affected.
- **Action:** pin `ref: flutter-plugin-v2.6.33`.

### Flutter plugin 2.6.32 — 2026-10-02

Tag `flutter-plugin-v2.6.32`. Android Essence 2 engine: `essence2-android` 0.9.2.

- **Android, Essence 2:** on a heat-throttled phone, characters keep moving more smoothly: the engine renders the character's 720p output and scales it up, then returns to full resolution once the phone cools. On a Galaxy Z Flip5 at its deepest throttle, about 75% of the frames the voice needs reached the screen, against 37% with the previous engine. No other change.
- **Action:** pin `ref: flutter-plugin-v2.6.32`.

### Flutter plugin 2.6.31 — 2026-10-02

Tag `flutter-plugin-v2.6.31`. iOS and macOS Essence 2 engine: `essence2-v1.15.3` (Swift package 2.20.0).

- **iOS and macOS, Essence 2:** the default is again the presenter that releases each frame's 40 ms of voice when the frame is shown. A stall guard is new: when a display tick has no frame while the reply's voice is waiting, that tick's voice is released anyway and the picture catches up, so the voice never waits more than 40 ms. Measured on an iPhone 18 Pro: no voice gaps of 40 ms or more, and the voice within about 20 ms of the picture.
- **iOS and macOS, Essence 2:** `BithumanAvatar.load(..., voiceClock: true)` opts in to 2.6.30's presenter. The voice starts 200 ms after the reply's first frame and plays on its own clock, and frames follow it. This corrects 2.6.30, where it was the default.
- **iOS and macOS, Essence 2:** `skipAhead: true` now takes effect with the new engine, together with `voiceClock: true`. Off by default.
- **Action:** pin `ref: flutter-plugin-v2.6.31`.

### Swift package 2.20.0 — 2026-10-02

Tag `v2.20.0`.

- **Essence 2 on iPhone, iPad and Mac:** a new optional `be_essence2_set_playout_position` tells the engine how much of the voice you have played. On a device that renders below real time it skips frames whose sound has already played, so the face keeps moving in step with the voice instead of freezing. An app that does not call it renders exactly as with 2.19.4. Also new: `be_essence2_last_frame_index` and `be_essence2_skipped_frames`.
- **Essence2Kit:** `create` names an avatar file published before the renderer this engine carries with the new error `Essence2KitError.identityOutdated`, and fetches a file that `Essence2Download` downloaded again once. Essence 2 1.15.3 still opens such files, so this does not apply yet.
- **Playing the voice yourself:** Recommended: gate each frame's audio on its display (lowest latency). If your presenter is voice-clocked, open the voice ~200 ms after the first frame to avoid gaps after a barge-in.
- Essence 2 is now 1.15.3. Expression 2 (2.19.2) and the macOS engine core (1.0.2) are unchanged.
- **Action:** `.package(url: …, from: "2.20.0")`. If you `switch` over `Essence2KitError`, add a case for `.identityOutdated`.

### Flutter plugin 2.6.30 — 2026-10-02

Tag `flutter-plugin-v2.6.30`. Engines unchanged.

- **iOS and macOS, Essence 2:** the voice now plays on its own clock and frames follow it, rather than the voice waiting for each frame. It starts 200 ms after the reply's first frame is ready, and each frame is shown as its sound is heard. Measured on an M4 Mac: no breaks in the voice, frames within a few milliseconds of their sound, and the first word about 200 ms later than in 2.6.29.
- **iOS and macOS, Essence 2:** `BithumanAvatar.load(..., skipAhead: true)`, Android's option since 2.6.29, now also reaches Apple. It takes effect with the next Essence 2 engine for Apple. Off by default.
- **`downloadAgentImx`:** fetches today's catalog. It follows the door's redirect to the file and takes `apiSecret:`. It downloads a gallery Essence 2 character without a key, and any character your key's account owns. A file it already has opens at once, and it is refreshed in the background when it changes.
- **Android:** skip-ahead stays off by default; pass `skipAhead: true` to use it.
- **Action:** pin `ref: flutter-plugin-v2.6.30`.

### Flutter plugin 2.6.29 — 2026-10-02

Tag `flutter-plugin-v2.6.29`. Android Essence 2 engine: `essence2-android` 0.9.1.

- **Android, Essence 2:** characters keep moving while they talk on a phone that renders below real time; with 0.9.0 the face could freeze behind the voice. Optional, off by default: `BithumanAvatar.load(..., skipAhead: true)` tells the engine where the voice is, so a slow phone shows fewer frames, each in step with the voice.
- **Errors:** new code `MODEL_REJECTED`. When the on-device engine refuses the model file, `BithumanAvatar.load` throws `BithumanModelRejected`, and a session on that avatar ends on `errorStream` the same way as `PAYWALL`. On iOS and macOS this replaces a still face that never became ready. Custom voice hosts: `VoiceHost` gains `modelRejections`.
- **Android, Expression 2:** a reply's first words start sooner (faster voice start, Expression 2 only).
- **Action:** pin `ref: flutter-plugin-v2.6.29`.

### essence2-android 0.9.2 — 2026-10-02

- **Adaptive 720p while the device is thermally throttled:** when a phone has been busy for a while and caps its GPU, Essence 2 now renders the avatar's 720p output and scales it to the full-size frame, then returns to full resolution once the phone cools. The frames your app receives keep their size, so there is nothing to change in an app. It applies to avatars that publish a 720p output; their SDK download adds about 5 MB, verified like every other file, and an offline launch never needs it.
- **Less GPU work per frame, same pixels:** the avatar renders faster on the GPU with byte-identical frames. On a Galaxy Z Flip5 that has been in calls for a few minutes, bitHuman Live shows about 70 % of the frames its voice needs at the deepest throttle, up from about a third, and a cool phone renders about 14 % faster.
- **New, optional: `Essence2Options(outputHeight = 720)`** opens a session at the avatar's 720p output when it publishes one (the default, `0`, is the full-size output).
- **Action:** `implementation("ai.bithuman:essence2-android:0.9.2")`.

### essence2-android 0.9.1 — 2026-10-02

- **The face keeps up with the voice on phones with little cores:** in an app, the Essence 2 renderer could end up on the phone's slower cores and fall behind its own voice, so the face held one pose while the avatar spoke (seen on a Galaxy Z Flip5). It now runs on the fast cores; on the Flip5 it renders 37–40 frames a second, up from 21–25.
- **New, optional: `setPlayoutPosition(samples16k)`.** Tell the avatar how much of the current utterance's audio your app has sent to the speaker. When a phone cannot keep up (for example once it is warm), the avatar skips the frames whose audio has already played and shows the one that matches the voice, instead of falling behind. `lastFrameIndex` says which part of the audio a pulled frame belongs to, and `skippedFrames` counts the skips. Without the call, frames come out exactly as before.
- **Action:** `implementation("ai.bithuman:essence2-android:0.9.1")`.

### Flutter plugin 2.6.28 — 2026-10-01

Tag `flutter-plugin-v2.6.28`.

- **The character's own voice no longer cuts it off:** on a loudspeaker, short bursts of the character's voice could reach the microphone and end its reply as if the person had spoken. While the character is heard, the session now sends the microphone on only when it is close in level to the voice heard and stays there for 200 ms. A person talking over the character still cuts in, about 100 ms later than before. The level is set per device and can be changed with `BithumanRealtimeSession(bargeFloorDb:)`.
- **Android:** Essence 2 characters already on the phone open at once; the check for an update runs after the character is live, and an update is used from the next open.
- **Errors:** `PAYWALL` (no Live minutes left) now ends the session on `errorStream`. After any such error, the session also turns the microphone and speaker off, ends the captions and closes its streams. Build a new session to try again.
- **Captions:** when a reply is cut short, `spokenTranscriptStream` stops at the words that were spoken.
- **Action:** pin `ref: flutter-plugin-v2.6.28`.

### Flutter plugin 2.6.27 — 2026-10-01

Tag `flutter-plugin-v2.6.27`.

- **Captions:** `BithumanRealtimeSession.spokenTranscriptStream` releases the agent's words as they are heard, so a caption keeps pace with the voice instead of showing the whole reply at once. Each event holds the reply's caption so far; a reply cut by a barge-in or a typed turn ends with only the words heard. `botTranscriptStream` is unchanged. A custom `VoiceHost` gains one member, `speechPlayout`.
- **Android:** closing the app with Back while an avatar is on screen no longer crashes it.
- **iOS and macOS:** the plugin's privacy manifest declares the APIs it uses and ships inside the app.
- **Release builds:** the words of a transcribed turn are no longer written to the device log.
- **Action:** pin `ref: flutter-plugin-v2.6.27`; for captions, listen to `spokenTranscriptStream`.

### `bithuman` 2.11.20 — 2026-10-01

- **Quieter console:** an Essence 2 render no longer prints the engine's per-session diagnostic lines or ONNX Runtime's initializer warnings. Set `BITHUMAN_DEBUG=1` to see them again. Warnings and refusals still print.
- `render(audio, out_mp4=...)` and `python -m bithuman render` write as many frames as the audio lasts, like `bithuman render`: 375 frames for 15.0 s of Essence 2 audio, not 381. The frames after the audio ends are still rendered and metered as before; they are just not written.
- Progress is shown only on a terminal. With `--json`, a failure is one JSON object on stderr in the CLI's shape (`{"error": {"kind", "code", "message", "command", "hint"}}`), with the same exit codes.
- The 2.11 spelling `python -m bithuman <avatar> <audio>` is reported as deprecated (removed in 2.14.0).
- On Apple silicon, Expression 2 renders through the render host that the `bithuman` CLI 2.8.7 ships.
- **Action:** `pip install -U bithuman`.

### Flutter plugin 2.6.26 — 2026-10-01

Tag `flutter-plugin-v2.6.26`.

- **Essence 2:** the mouth blends into the face without the visible edge that could show at the corners of the lips. Android gets it with `essence2-android` 0.9.0; on iOS and macOS it comes with the avatar files and Essence 2 1.15.2.
- **Android:** the engines resolve from maven.bithuman.ai, which the plugin declares itself; a Flutter app adds no repository. Versions already on Maven Central keep resolving from Central.
- **macOS:** an app built for macOS 13 links again (macOS engine core 1.0.2).
- **Action:** pin `ref: flutter-plugin-v2.6.26`.

### essence2-android 0.9.0 — 2026-10-01

- **Essence 2 on Android:** the mouth blends into the face without the visible edge that could show at the corners of the lips. Avatars get this as they are updated on bitHuman; an avatar that has not been updated renders exactly as in 0.8.1.
- **Changed (billing):** every session bills its active session time, talking or idle, from its first frame to `close()`, file renders included. `Essence2Metering.basis` is ignored (deprecated). Idle frames shown before the first reply now start the session clock, as on iOS.
- **Changed:** a refused session says why: the plan does not include SDK access (Creator plan or higher), the account's concurrent sessions are used up, the account is suspended, or it has no credits left.
- **Action:** `implementation("ai.bithuman:essence2-android:0.9.0")`. Delete any `Essence2Metering.basis = …` line, and close a file-render session right after its last frame.

### CLI 2.8.8 — 2026-10-01

Tag `cli-v2.8.8`.

- **Removed:** the `text_to_speech` and `list_voices` tools in `bithuman mcp`. They called bitHuman's text-to-speech service, which is [retired](#text-to-speech-service-retired--2026-10-01). Make the audio with any speech tool and pass it to `bithuman render` ([talking video](/build/talking-video)).
- The bundled Essence 2 engine is the one in `bithuman` 2.11.20. Billing is unchanged from 2.8.7.
- **Action:** `brew upgrade bithuman-cli`, or re-run the installer.

### Text-to-speech service retired — 2026-10-01

- **Removed:** bitHuman's own text-to-speech service. `POST /v1/tts`, `POST /v1/audio/speech` (the OpenAI-compatible endpoint), `GET /v1/voices` and `/v1/studio/*` now answer `410 ENDPOINT_RETIRED`. The voice playground at www.bithuman.ai/voice redirects to the [talking video guide](/build/talking-video), and the `text_to_speech` and `list_voices` tools leave the MCP server in the next CLI release.
- **Unchanged:** an agent's conversation voice (its voice provider, voice cloning, [voices](/build/voices)) and `POST /v1/agent/{code}/speak`, which use third-party voice providers.
- **Action:** if you called these endpoints, generate the audio with any TTS provider (or record it) and send it to the [talking video API](/build/talking-video). bitHuman renders the avatar from your audio.

### CLI 2.8.7 — 2026-10-01

Tag `cli-v2.8.7`.

- **Clearer:** `bithuman --help` and `bithuman run --help` no longer call the Wise Pup sample avatar free; every session bills your credits for active session time ([pricing](/pricing)). `run --help` says where a session renders: a showcase name or a file on your machine (self-hosted rate); an agent code on your machine when it can, otherwise on bitHuman cloud (cloud rate). The line that prints the session URL says which, and a local `--json` `session_started` event carries `"mode":"local"`.
- **Fix:** `bithuman doctor` no longer reports a fresh install as not ready only because the agent worker is not set up yet (the first `bithuman run` sets it up). Its missing-encoder advice says to reinstall the CLI.
- **Fix:** `bithuman render` on Linux names the encoder it uses (`libx264`).
- The rendering engine and billing are unchanged from 2.8.6.
- **Action:** `brew upgrade bithuman-cli`, or re-run the installer.

### Swift package 2.19.4 — 2026-10-01

Tag `v2.19.4`.

- **Mac apps on macOS 13:** the macOS engine core is now built for macOS 13, the package's declared minimum, so an `Expression2` Mac app built for macOS 13 links without the `built for newer 'macOS' version (14.0)` warning and runs there. (`Essence2Kit` and `Essence2` still need macOS 26.)
- The macOS engine core is now 1.0.2. Essence 2 (1.15.2), Expression 2 (2.19.2) and everything on iPhone and iPad are unchanged.
- **Action:** `.package(url: …, from: "2.19.4")`.

## September 2026

### Android packages now come from maven.bithuman.ai — 2026-09-30

- **Changed:** Android packages now come from maven.bithuman.ai, bitHuman's own Maven repository. New versions of `ai.bithuman:essence2-android` and `ai.bithuman:expression2-android` are published there; every earlier version is served there too and stays on Maven Central. The Flutter plugin declares the repository itself.
- **Action:** add `https://maven.bithuman.ai` to `dependencyResolutionManagement.repositories` in `settings.gradle.kts`, as on the [Android page](/platforms/android#install). A Flutter app needs no change.

### Swift package 2.19.3 — 2026-09-30

Tag `v2.19.3`.

- **Essence 2 on iPhone, iPad and Mac:** the mouth blends into the face without the visible edge that could show at the corners of the lips, now also when the engine renders an avatar without its bundled Core ML model. Avatars get this as they are updated on bitHuman; an avatar that has not been updated renders exactly as in 2.19.2.
- Essence 2 is now 1.15.2. Expression 2 (2.19.2) and the macOS engine core (1.0.1) are unchanged.
- **Action:** `.package(url: …, from: "2.19.3")`.

### CLI 2.8.6 — 2026-09-30

Tag `cli-v2.8.6`.

- **Essence 2 on Linux:** the mouth blends into the face without the visible edge that could show at the corners of the lips. Avatars get this as they are updated on bitHuman; `bithuman pull <CODE>` fetches the updated file. An avatar that has not been updated renders exactly as in 2.8.5.
- **Action:** `brew upgrade bithuman-cli`, or re-run the installer.

### Flutter plugin 2.6.25 — 2026-09-30

Tag `flutter-plugin-v2.6.25`.

- **Fix:** a phone call (or Siri, an alarm, or another app taking the audio) now ends the realtime session on iOS and Android, so a paused call is no longer billed. Turn this off with `endOnAudioInterruption: false`.
- **Fix:** a call stays on connected Bluetooth, wired or USB headsets (including AirPods) instead of being forced to the loudspeaker; the loudspeaker is used only when nothing is connected.
- **Fix:** disposing an avatar is safe at any time, including mid-load, and a switched-away download can be cancelled (`BithumanAvatar.cancelLoad`); Android reports load progress (`BithumanAvatar.loadEvents`).
- **Faster:** smoother Android rendering, a quicker reveal, and on iOS/macOS the avatar package is unpacked once instead of on every launch; opening and closing the mic no longer stalls the UI on Android.
- **Action:** pin `ref: flutter-plugin-v2.6.25`.

### `bithuman` 2.11.19 — 2026-09-30

- **Fix:** if the startup credential check is lost in transit, or the service answers 5xx or 429, `bithuman.open()` asks once more before it refuses. A 2xx, 401, 402 or 403 is never repeated.
- On Apple silicon, Expression 2 renders through the render host that the `bithuman` CLI 2.8.5 ships. That host checks your API secret and bills its own session, so each session is still billed once.
- Essence 2: the renderer can apply the mouth structure carried in an avatar's template. Avatars without that structure render as before.
- Pins PyAV below 19 to avoid a thread leak in Expression 2 idle clips.
- **Action:** `pip install -U bithuman`.

### CLI 2.8.5 — 2026-09-30

Tag `cli-v2.8.5`.

- **Fix:** if the startup credential check is lost in transit, or the service answers 5xx or 429, the CLI asks once more before it refuses. A 2xx, 401, 402 or 403 is never repeated.
- **Fix:** a retried stop is billed once.
- **Fix:** a 403 names what to do. A plan limit names the plan and links the plans page.
- On a Mac, the Expression 2 render host checks your API secret and bills its own session. `bithuman run` and `bithuman render` still bill each session once.
- **Security:** a release build ignores the meter's tuning settings.
- **Action:** `brew upgrade bithuman-cli`, or re-run the installer.

### Swift package 2.19.2 · Flutter plugin 2.6.24 — 2026-09-30

- **Security (iPhone, iPad and Mac):** the on-device meter in a release build now ignores its tuning settings, so usage is always billed the way the service defines it. Please update: `.package(url: …, from: "2.19.2")`, or pin `ref: flutter-plugin-v2.6.24` and re-run the plugin's `scripts/bootstrap.sh`.
- **Fix:** if the startup credential check is lost in transit, or the service answers 5xx or 429, the engine asks once more before it refuses the session. A 2xx, 401, 402 or 403 is never repeated.
- Expression 2 is now 2.19.2 and Essence 2 is 1.15.1. The macOS engine core (1.0.1) is unchanged.

### `bithuman` 2.11.18 — 2026-09-29

- **New:** `pip install bithuman` installs on Windows 11 (x86_64, Python 3.10–3.14). Essence 2 and Expression 2 avatars open and render on the machine as on macOS and Linux; Essence 1 renders in the cloud with the Video API. The wheel carries the Visual C++ runtime it needs.
- **New:** `python -m bithuman pull <AVATAR>` gets an avatar onto the machine together with the engine files its model fetches on the first render. While online, pull each avatar once, and `python -m bithuman pack redeem` once for an offline pack; after that, rendering needs no network. The same verb, `--model` and `--force` as the `bithuman` CLI.
- **Changed:** a refusal because of the account's plan says so ("API and SDK access starts at the Creator plan", with one link to the plans) instead of calling the API secret revoked; a plan's session limit and a suspended account have their own sentences, and an account out of credits points to [/billing#credits](https://www.bithuman.ai/billing#credits). What is refused, and the exception raised, are unchanged.
- **Changed:** `render(out_mp4=...)` writes the MP4 with the platform's own H.264 encoder where there is one (VideoToolbox on macOS, Media Foundation on Windows), and with x264 otherwise; `python -m bithuman render --json` carries `wall_seconds`, as the CLI does. On Apple silicon, Expression 2 renders through the same render host CLI 2.8.4 ships.
- **Action:** `pip install -U bithuman`.

### CLI 2.8.4 — 2026-09-28

Tag `cli-v2.8.4`.

- **New:** an offline pack now covers Essence 2 and Expression 2 renders too. Once `bithuman pack redeem` has installed a pack for the model, `bithuman render` of that avatar needs no network and no API secret until the pack is spent. A spent pack, or one that is not for this machine, stops the render with exit 77 and says which; it never falls back to billing the account. Offline packs open platform by platform.
- **New:** `bithuman pull <CODE>` also fetches the engine files the avatar's model needs to render (the Essence 2 audio frontend; the Expression 2 engine on macOS). While online, pull each avatar and redeem once; after that, rendering needs no network.
- **New:** the CLI runs natively on Windows 10 and 11 (x86_64): `irm https://install.bithuman.ai/windows | iex`. Rendering on the machine and offline packs are not in the Windows build yet.
- **Changed:** `bithuman pack status` lists every installed pack, one line per model (`--json`: `packs`).
- **Fixed:** `render --json` `seconds` is the video's length (frames / fps), as in the Python package; the render's wall time is `wall_seconds`.
- **Action:** `brew upgrade bithuman-cli` or `curl -fsSL https://install.bithuman.ai | sh`.

### `bithuman` 2.11.17 — 2026-09-28

- **New:** an installed offline pack now covers Essence 2 and Expression 2 avatars too: `bithuman.open()`, `render()` and `python -m bithuman render` need no network and no API secret when an installed pack covers the avatar, and every frame is metered on the machine against the pack (Expression 2 at its own 20 fps).
- **New:** on macOS (Apple silicon) a pack is kept in the system keychain, sealed by the Secure Enclave where the Mac has one. Offline packs open platform by platform; where one is not available yet, `python -m bithuman pack redeem` says so and nothing is spent.
- **Action:** `pip install -U bithuman`.

### Swift package 2.19.1 · Flutter plugin 2.6.22 — 2026-09-28

- **Security (macOS):** the macOS engine core is rebuilt so that only its public interface is linkable. Please update: `.package(url: …, from: "2.19.1")`, or pin `ref: flutter-plugin-v2.6.22` and re-run the plugin's `scripts/bootstrap.sh`.
- iPhone and iPad are unaffected. Expression 2 (2.19.0) and Essence 2 (1.15.0) are unchanged.

### Swift package 2.19.0 — 2026-09-28

Tag `v2.19.0`.

- **Changed:** the Expression 2 engine moves to 2.19.0 and the Essence 2 engine to 1.15.0. On a Mac, both engines now take their licensing and metering core from a new `EngineCore` binary target. The `Expression2`, `Essence2` and `Essence2Kit` products link it for you, with `Security` and `curl`. iPhone and iPad builds link nothing new.
- **Action:** update to 2.19.0. A Mac app that links the engine archives outside SwiftPM must also link `EngineCore.xcframework` from the [essence2-v1.15.0 release](https://github.com/bithuman-product/homebrew-bithuman/releases/tag/essence2-v1.15.0), plus `Security` and `curl`.

### Flutter plugin 2.6.21 — 2026-09-28

- **Changed:** iOS and macOS link the Swift package 2.19.0 engines (Expression 2 2.19.0, Essence 2 1.15.0), and on macOS the pod also links `EngineCore`. Android is unchanged: `essence2-android` 0.8.1 and `expression2-android` 0.5.2.
- **Action:** pin `ref: flutter-plugin-v2.6.21` and run the plugin's `scripts/bootstrap.sh` again.

### CLI 2.8.3 — 2026-09-28

Tag `cli-v2.8.3`.

- **New:** `bithuman pack redeem` installs a prepaid offline pack (Business and Enterprise) on the machine that runs it; `bithuman pack status` shows the render-seconds left. Afterwards `bithuman render` of an Essence 1 avatar the pack covers needs no network and no API secret until the pack is spent. The MCP server adds the `pack_redeem` tool. Offline packs open platform by platform; where the CLI's support has not opened yet, the redeem says to use `python -m bithuman pack redeem`, and nothing is spent.
- **Changed:** the removals announced for CLI 2.9 (the `./.env` read, the spellings retired in 2.7.3) ship no earlier than 2026-12-26; the notices say so.
- **Action:** `brew upgrade bithuman-cli` or `curl -fsSL https://install.bithuman.ai | sh`.

### `bithuman` 2.11.16 — 2026-09-28

- **New:** `python -m bithuman pack redeem` installs a prepaid offline pack (Business and Enterprise) on the machine that runs it: it binds the account's unredeemed pack to this machine and installs it. `python -m bithuman pack redeem PURCHASE_ID` redeems a named one; `--file PACK` installs a saved pack with no network. Afterwards `python -m bithuman render` of an avatar the pack covers needs no network and no API secret until the pack is spent.
- **Changed:** a refused redeem says in plain words what to do (the plan, the platform, a pack already installed) and that nothing was spent.
- **Action:** `pip install -U bithuman`.

### `bithuman` 2.11.15 — 2026-09-27

- **New:** `bithuman.open(path).render(audio, out_mp4="out.mp4")` writes the MP4 (H.264 with the speech) and returns the number of frames, for every model. It is the one offline route.
- **Fixed:** an Essence 1 file render (`bithuman.open(...).render(...)` or `python -m bithuman render`) billed every frame twice; a render of N seconds of video now bills N seconds. Live `AsyncBithuman` sessions were not affected.
- **Deprecated** (removed in bithuman 4.0, no earlier than 2026-12-26; each prints one warning naming the replacement): `bithuman.offline` (`render_offline`, `OfflineRenderer`), the deprecated alias `BITHUMAN_API_KEY`, `token=` on `AsyncBithuman.create`, and the name `bithuman.AsyncAvatar`. `python -m bithuman` stops reading the API secret from `./.env` in the next release.
- **Action:** `pip install -U bithuman`.

### CLI 2.8.2 — 2026-09-27

Tag `cli-v2.8.2`.

- **Changed:** `bithuman run <CODE>` with a code that is not one of your agents plays the free gallery avatar with that code, the way `pull`, `render` and `open` already did.
- **Changed:** `bithuman open` names the model (for example Essence 2 or Expression 2). Asking `pull` for a model a gallery avatar does not have names the models it does have (`MODEL_NOT_GENERATED`).
- **Changed:** with `BITHUMAN_LOCAL=1`, `run` checks that the on-device voice packages are installed before the session starts, and prints the one command that installs them.
- **Deprecated:** reading the API secret from a `.env` file in the working directory prints a notice; CLI 2.9 stops reading it. Export `BITHUMAN_API_SECRET`, or run `bithuman login` once.
- **Deprecated:** the deprecated alias `BITHUMAN_API_KEY` is read until CLI 3.0 (no earlier than 2026-12-26). Rename it to `BITHUMAN_API_SECRET` (same value).
- **Changed:** `BITHUMAN_API_BASE` is no longer a documented setting; the CLI talks to `https://api.bithuman.ai`.
- **Action:** `brew upgrade bithuman-cli` or `curl -fsSL https://install.bithuman.ai | sh`.

### Flutter plugin 2.6.20 — 2026-09-27

- **Changed:** the realtime voice session takes your bitHuman API secret and connects through bitHuman's [realtime relay](/api/realtime); there is no `ek_…` token to mint. The conversation is billed to your account at 10 credits per minute, the avatar included. A refusal a retry cannot fix (a rejected secret, no credits, the time limit) stops the session once and is reported on `errorStream`.
- **Fixed:** iOS and macOS build from the published tag. They link the published Expression 2 (2.18.0) and Essence 2 (1.14.2) engines.
- **Changed:** Android uses `essence2-android` 0.8.1 (memory stays flat in long sessions) and `expression2-android` 0.5.2.
- **Action:** pin `ref: flutter-plugin-v2.6.20` and pass your API secret to `BithumanRealtimeSession(apiKey:)`.
### expression2-android 0.5.2 — 2026-09-27

- **Changed:** the Hexagon accelerator prepares the decoder once and keeps it. On a Galaxy S25+, `create()` took about 31 s on every launch through 0.5.1; with 0.5.2 the first launch takes about 15 s and later launches 1–2 s. Replies start as fast as before, and frames are unchanged.
- **Added:** read-only `Expression2Backend` fields report whether the prepared decoder was reused and how long it took.
- **Action:** `implementation("ai.bithuman:expression2-android:0.5.2")`.
### Swift package 2.18.0 — 2026-09-27

Essence 2 engine 1.14.2 · Expression 2 engine 2.18.0

- **New:** Expression 2 hands out one stream of frames to show: `frames(audioClock:)` at 20 frames per second, idle motion between replies and each speech frame when your player has played its audio. Each frame says whether it is speech (`isSpeech`) and which one ends the reply (`endsReply`); `events()` reports `.replyStarted` and `.replyEnded` once per reply, and `interrupt()` cuts a reply. `pull()` is unchanged.
- **Fixed:** an Expression 2 session that only shows its idle animation is billed for its active time, like any other session.
- **Action:** set `from: "2.18.0"`, then `swift package update`.

### CLI 2.8.1 — 2026-09-27

Tag `cli-v2.8.1`.

- **Fixed:** opening a `bithuman run` page link no longer starts a billed session in a room nobody joins (a link preview, a prefetch or a reload). A session starts when a person joins; a room nobody joins within 90 seconds ends without starting.
- **Changed:** with the bitHuman brain (no OpenAI key of your own), the voice connects through bitHuman's own service with your API secret, and says in plain words why it stopped (out of credits, the 60-minute session limit, a rejected secret).
- **Fixed:** a long Essence 2 session no longer grows in memory while the avatar talks.
- **Changed:** `--help` examples use the free `wise-pup` avatar; `bithuman list` says rendering needs `bithuman login`; with `--json`, a mistyped command prints one JSON error (`USAGE`, exit 2).
- **Fixed:** a long-running `bithuman run` uses a re-published avatar file for the next session without a restart.
- **Action:** `brew upgrade bithuman-cli` or `curl -fsSL https://install.bithuman.ai | sh`.

### Swift package 2.17.3 — 2026-09-27

Essence 2 engine 1.14.2 · Expression 2 engine 2.7.0

- **Fixed:** memory stays flat in long Essence 2 sessions. Before this release, an app that fed audio without a pause grew by about 1 MB per second of speech. On an iPhone that could end a session after about 35 minutes.
- **Action:** set `from: "2.17.3"`, then `swift package update`.

### essence2-android 0.8.1 — 2026-09-27

- **Fixed:** memory no longer grows while an avatar speaks without pausing. Through 0.8.0 the audio frontend kept every frame of an utterance, about 1 MiB per second of speech, until `endOfAudio()`, `resetAudio()` or a 600 ms pause in `feed()`. Turn-by-turn conversation stayed bounded; an app that fed audio continuously grew for as long as it spoke. On a Galaxy S25+, ten minutes of one continuous utterance now holds at about 920 MiB, where 0.8.0 reached 1,473 MiB. Frames are unchanged.
- **Action:** `implementation("ai.bithuman:essence2-android:0.8.1")`, especially if your app streams audio without pauses.

### Flutter plugin 2.6.19 — 2026-09-26

- **Changed:** on Android, Essence 2 frames reach the screen without a CPU copy. On a Galaxy S25+ this uses about 8% less CPU, and the frames are unchanged.
- **Changed:** Android uses `essence2-android` 0.8.0 and `expression2-android` 0.5.1, which bill correctly whatever the app sets and name each installation on the meter. iOS and macOS are unchanged.
- **Action:** set `ref: flutter-plugin-v2.6.19` in your `pubspec.yaml`.

### expression2-android 0.5.1 — 2026-09-26

- **Fixed:** billing can no longer be changed from app code: the meter's endpoint, whether from `Expression2Metering.apiBaseUrl` or the `BITHUMAN_API_URL` environment variables, is honoured only for an `https://` bitHuman host.
- **Added:** each installation names itself on the meter: a random id is kept in the app's storage. Set `Expression2Metering.installId` or `BITHUMAN_INSTALL_ID` to choose it yourself.
- **Action:** `implementation("ai.bithuman:expression2-android:0.5.1")`.

### essence2-android 0.8.0 — 2026-09-26

- **Fixed:** billing can no longer be changed from app code. `Essence2Metering.fps` is ignored (deprecated, still compiles), and the meter's endpoint, whether from `apiBaseUrl` or the `BITHUMAN_API_URL` environment variables, is honoured only for an `https://` bitHuman host.
- **Added:** each installation names itself on the meter: a random id is kept in the app's storage. Set `Essence2Metering.installId` or `BITHUMAN_INSTALL_ID` to choose it yourself.
- **Added:** `useHardwareBuffers(slots)` accepts up to 32 slots (was 16), for presenters that queue frames ahead.
- **Added:** `Essence2RenderFailed` and `Essence2RenderStatus` resolve from `ai.bithuman.essence2`, so `import ai.bithuman.essence2.*` covers every type an app uses.
- **Changed:** the GPU work per frame falls by about a third; frames are unchanged.
- **Action:** `implementation("ai.bithuman:essence2-android:0.8.0")`.
### CLI 2.8.0 — 2026-09-26

Tag `cli-v2.8.0`.

- **Changed:** avatars download at about half the size. `pull`, `run` and `render` fetch only the parts this computer uses: an Essence 2 avatar is about 70–90 MB instead of 150 MB, and an Expression 2 avatar about 35 MB on a Mac or 65 MB on Linux instead of 200 MB. Every download is checked against its published digest, and the rendered video is the same.
- **Changed:** the bitHuman brain (the voice chat that needs no OpenAI key) and a prepaid offline pack count active session time, talking or idle, the same rule as every bitHuman surface.
- **Changed:** `BITHUMAN_API_BASE` and `--api-base` accept only `https://api.bithuman.ai` or another `https://*.bithuman.ai` address; any other value is ignored with a notice.
- **Fixed:** `bithuman logout` revokes only the secret `bithuman login` stored. A secret from the environment or a `./.env` file is never revoked.
- **Fixed:** the notice that a newer CLI is available always finds the newest CLI release.
- **Action:** `brew upgrade bithuman-cli` or `curl -fsSL https://install.bithuman.ai | sh`.

### `bithuman` 2.11.14 — 2026-09-27

- **Fixed:** `bithuman.open()` with no API secret, offline licence or prepaid pack refuses at once, before it loads the model or downloads anything, and names `BITHUMAN_API_SECRET` and where to get one.
- **Fixed:** a first Essence 2 open on a fresh machine downloads 66 MB instead of 444 MB; the 377 MB audio encoder is fetched only when the avatar uses it. Rendered frames are identical.
- **Fixed:** memory stays flat when an Essence 2 avatar speaks without a pause; it grew about 1 MB per second of speech.
- **Changed:** a live avatar reports its whole active session, talking or idle, as the billing rule says; an idle stretch was billed for at most a few minutes of it.
- **Changed:** usage reports go only to bithuman.ai hosts.
- **Changed:** `AsyncBithuman.sync_to(sink)` shows each picture when its voice plays; with the LiveKit `AvatarRunner`, an Expression 2 mouth led its voice by about 120 ms at a browser viewer and now leads by about 60 ms.
- **Changed:** prepaid offline packs are debited for the whole active session; the CPU runtimes find a CPU quota set on the process's own cgroup; a load failure names the product.
- **Action:** `pip install -U bithuman`.

### `bithuman` 2.11.13 — 2026-09-26

- **Fixed:** an Expression 2 reply through `AsyncBithuman` (and the LiveKit plugin) plays through without the brief pause about a second in, where the face froze and the voice stopped. A reply that is already complete starts sooner, and a reply pushed in a single call starts once its first part is rendered instead of after all of it.
- **Fixed:** the Expression 2 and Essence 2 CPU runtimes size their thread pools to the CPUs a container allows instead of the machine's total core count, so Expression 2 in a CPU-limited container renders at full speed. `BITHUMAN_THREADS` still overrides.
- **Fixed:** a long idle no longer grows the process by dozens of threads.
- **Fixed:** a reply pushed to `AsyncBithuman` in a single call is metered in full; about 80% of it was before.
- **Changed:** a streamed Expression 2 reply renders exactly the frames `bithuman.open()` renders for the same audio.
- **Changed:** the offline renderer raises `FileNotFoundError` naming the path when the avatar file does not exist, and refuses another kind of avatar by its product name.
- **Changed:** usage reports name the installation with a random id kept in `~/.bithuman/install_id`, the same file the `bithuman` CLI uses. Set `BITHUMAN_INSTALL_ID` to choose your own.
- **Action:** `pip install -U bithuman`.

### LiveKit docs and examples — 2026-09-26

- **Changed:** a LiveKit worker keeps your API secret as `BITHUMAN_MASTER_SECRET`, never `BITHUMAN_API_SECRET`. `livekit-plugins-bithuman` 1.8.4 and older reads `BITHUMAN_API_SECRET` by itself whenever `api_secret=` is omitted, and copies it into the avatar's participant attributes, which everyone in the room can read. The [LiveKit page](/platforms/livekit#authenticate) and the LiveKit examples now use the new name and refuse to start while the old one is set.
- **Action:** rename the variable in your worker's environment and mint a room token from it. If a worker ran a cloud avatar with `BITHUMAN_API_SECRET` set and no `api_secret=`, create a new secret and delete the old one in the console.

### Billing — 2026-09-26

- **Changed:** a managed conversational agent bills one all-inclusive rate (10 credits/min, or 30 with the camera on). It covers the avatar, whether it renders in the bitHuman cloud or in the viewer's browser; there is no separate avatar charge. An avatar-only session (your own agent through the plugin or the API) that renders in the browser bills the model's self-hosted rate. Rates are on [pricing](/pricing).
- **Changed:** realtime sessions bill active session time, talking or idle, by the exact second, with no per-session minimum. A session's fraction of a credit carries to your next session. This replaces the talking-only billing announced earlier the same day. Talking-video renders are unchanged: whole minutes of output, minimum one minute. Rates are on [pricing](/pricing).
- **Changed:** Expression 1 avatar sessions are now metered to your account at the standard cloud rate. Rates are on [pricing](/pricing).

### Swift package 2.17.2 — 2026-09-26

Essence 2 engine 1.14.1 · Expression 2 engine 2.7.0

- **Fixed:** Essence 2 sessions are always billed to your API secret. Update from any earlier release.
- **Action:** set `from: "2.17.2"`, then `swift package update`.

### Swift package 2.17.1 — 2026-09-26

Essence 2 engine 1.14.0 · Expression 2 engine 2.7.0

- **Fixed:** reading `width`, `height`, `isReady` or `runtimeFailure` after `shutdown()` no longer crashes the app.

### Swift package 2.17.0 — 2026-09-26

Essence 2 engine 1.14.0 · Expression 2 engine 2.7.0

- **New:** `Essence2Engine.frames(following:)`, an AsyncSequence of frames paced to 25 per second. Each frame carries `isSpeech`, `endsReply` and `audioTime`, and `events()` reports `.replyStarted` / `.replyEnded` once per reply. `frames(following: player)` hands out a reply's frames as your `AVAudioPlayerNode` plays their audio, so lips stay on the voice for the whole reply; `frames(audioClock:)` takes your own clock.
- **New:** `flushTail()` ends a reply's audio at once instead of after 0.6 s of silence; `pacing = .unpaced` renders offline as fast as the device allows.
- **Changed:** `pull()` and `idle(into:)` hand out at most 25 frames a second. A tight loop no longer receives hundreds of idle frames a second; `nil` still means keep the current frame. The 40 ms loop from 2.16.0 keeps working.
- **Changed:** usage reports name the install with a random id kept in the app's Application Support directory (`BITHUMAN_INSTALL_ID` overrides it).
- **Action:** set `from: "2.17.1"`, then `swift package update`. Move a display loop to `frames(following:)`.

### Flutter plugin 2.6.18 — 2026-09-26

- **Changed:** iOS and macOS use Essence 2 engine 1.14.0, whose usage reports name the install. Android is unchanged.
- iOS and macOS do not build from the published tag yet; use the plugin on Android.

### Swift package 2.16.0 — 2026-09-25

Essence 2 engine 1.13.0 · Expression 2 engine 2.7.0

- **Fixed:** an app that links its own `mlx-swift` now links beside Essence 2, also with `-ObjC` or `-all_load`. Essence 2 no longer contains MLX, and its download is 22 MB instead of 171 MB.
- **Action:** set `from: "2.16.0"`, then `swift package update`.

### Flutter plugin 2.6.17 — 2026-09-25

- **Changed:** iOS and macOS use Essence 2 engine 1.13.0, which contains no MLX.
- **Action:** pin `ref: flutter-plugin-v2.6.17`.
- iOS and macOS do not build from the published tag yet; use the plugin on Android.

### Dashboard — 2026-09-25

- **Changed:** Explore opens the V2 gallery of Essence 2 and Expression 2 agents. Switch to V1 for the classic gallery; your choice is remembered.
- **Changed:** a new agent starts on Expression 2. Essence 2, Essence 1 and Expression 1 stay one click away in the model dialog.

### essence2-android 0.7.0 — 2026-09-25

- **Changed:** a long session holds a higher frame rate on the same handset. The held-for-10-minutes figure on a Galaxy S25+ is on [Performance](/performance). Frames are unchanged.
- **Added:** zero-copy frame delivery. After `useHardwareBuffers()`, `pullHardwareBuffer()` and `idleHardwareBuffer()` return an `Essence2HardwareFrame` whose RGBA `HardwareBuffer` your renderer samples directly; close each frame after presenting it. `pull(ByteBuffer)` is unchanged, and nothing changes unless you call `useHardwareBuffers()`.
- **Action:** `implementation("ai.bithuman:essence2-android:0.7.0")`.

### essence2-android 0.6.0 — 2026-09-24

- **Changed:** after a pause in the conversation, the first frame of the next reply arrives sooner (about 1,090 → 242 ms on a Galaxy S25+). The picture is otherwise unchanged: frames are identical to 0.5.15.
- **Changed:** a failed download is retried on one budget shared by the whole store, so a service outage is not met with a burst of retries.
- **Changed:** the `-sources.jar` and `-javadoc.jar` on Maven Central are placeholders; the API reference is [Android API](/platforms/android/reference).
- **Deprecated (still works):** `Essence2ModelStore.DEFAULT_MEMBERS`. No replacement is needed.
- **Action:** `implementation("ai.bithuman:essence2-android:0.6.0")`.

### expression2-android 0.5.0 — 2026-09-24

- **Fixed:** lip sync. The mouth moved ahead of the voice; it now lines up. The first frame of each stream is shown twice; a stream still carries the same number of frames.
- **Changed:** a failed download is retried on one budget shared by the whole store.
- **Changed:** the `-sources.jar` and `-javadoc.jar` on Maven Central are placeholders; the API reference is [Android API](/platforms/android/reference).
- **Breaking (source only):** `Expression2ModelStore.MODEL`, `CANON` and `IDLE` keep their values but are no longer compile-time constants.
- **Action:** `implementation("ai.bithuman:expression2-android:0.5.0")`.

### Flutter plugin 2.6.16 — 2026-09-24

- **Changed:** Android uses essence2-android 0.6.0 and expression2-android 0.5.0.
- **Action:** pin `ref: flutter-plugin-v2.6.16`.

### Swift package 2.15.0 — 2026-09-24

Essence 2 engine 1.12.1 · Expression 2 engine 2.7.0

- **Fixed:** Expression 2 lip sync. The mouth moved about 65 ms ahead of the voice; it now lines up (about 15 ms). To do this, the first frame of each stream is shown twice; a stream still carries the same number of frames.
- **New:** `Expression2Download.avatar(agentCode:)` and `Essence2Download.identity(agentCode:)` download an avatar file from your app. They fetch the smaller Apple build of the file, check its sha256 and keep it in the app's Caches, so a second call downloads nothing. See [Apple](/platforms/swift/app#download-an-avatar-in-the-app).
- **Action:** set `from: "2.15.0"`, then `swift package update`.

### Flutter plugin 2.6.15 — 2026-09-24

- **Changed:** iOS and macOS use Expression 2 engine 2.7.0, which fixes lip sync.
- **Action:** pin `ref: flutter-plugin-v2.6.15`.
- iOS and macOS do not build from the published tag yet; use the plugin on Android.

### `bithuman` 2.11.12 — 2026-09-25

- **Fixed:** a moment of network no longer ends a render. When the service does not answer, or answers that it is busy, `python -m bithuman` asks again, up to three times over a few seconds. When it does give up, the message says what the service did, and the exit code is 69 (service unavailable), as with the `bithuman` CLI. In Python the refusal is still a `bithuman.Failed`.
- **Changed:** a live Essence 2 avatar (`AsyncBithuman`) no longer bills the short transition into and out of speech, which carries none of your audio.
- **Action:** `pip install -U bithuman`.

### `bithuman` 2.11.11 — 2026-09-25

- **Changed:** an offline render — `bithuman.open(...).render(audio)` and `python -m bithuman render` — is billed for the length of the video it produces (frames ÷ frame rate) at the self-hosted rate, the same as `bithuman render` in the CLI. It was billed for the time the render took. Live avatars (`AsyncBithuman`, the LiveKit plugin) are unchanged: they bill the seconds the avatar talks, and idle is free. Renders made before this release are not billed again.
- **Action:** `pip install -U bithuman`.

### `bithuman` 2.11.10 — 2026-09-24

- **Fixed:** Expression 2 lip sync on macOS. The bundled Apple renderer was out of sync by 40–70 ms; it now stays within 25 ms.
- **Fixed:** when a reply is interrupted, `AsyncBithuman` no longer bills the frames the interruption throws away. Before, an interrupted reply could add several seconds of talking time.
- **Changed:** `python -m bithuman render <avatar> <audio>` and `python -m bithuman list` use the same command line as the CLI.
- **Changed:** Expression 2 starts replying about half a second sooner.
- **Action:** `pip install -U bithuman`.

### `bithuman` 2.11.9 — 2026-09-24

- **Fixed:** a rendered MP4's sound starts on its first sample. `python -m bithuman` wrote the audio 64 ms late, so the mouth moved ahead of the voice on every render.
- **Fixed:** Expression 2 lip sync: the mouth no longer leads the voice.
- **Changed:** `AsyncBithuman` streams Expression 2 at a steady 20 frames a second, through replies and interruptions.
- **Changed:** a first render downloads less: the 8-second speech encoder is fetched only when a render needs it.
- **Action:** `pip install -U bithuman`.

### CLI 2.7.8 — 2026-09-26

Tag `cli-v2.7.8`.

- **Fixed:** Expression 2 on Linux runs at full speed in a container limited to fewer CPUs than the machine has (for example `docker run --cpus=4`). It started one thread per machine CPU and ran several times slower than real time; it now sizes its threads to the CPUs it may use.
- **Changed:** each install sends its own stable, random install id with its usage, so two installs that share one API secret are no longer billed as one.
- **Action:** `brew upgrade bithuman-cli` or `curl -fsSL https://install.bithuman.ai | sh`.

### CLI 2.7.7 — 2026-09-26

Tag `cli-v2.7.7`.

- **Fixed:** lip sync in live `bithuman run` sessions. The voice trailed the mouth by about 0.1–0.2 s on macOS and Linux; each frame is now released with its own audio.
- **Changed:** a self-hosted Essence 1 session is billed for the seconds the avatar talks, like Essence 2 and Expression 2. It was billed for every whole minute the session was open, idle included. Idle is free.
- **Changed:** a live Essence 2 reply is no longer billed for the short transition into and out of speech, which carries none of your audio.
- **Changed:** `bithuman list` and showcase names ask again when the service does not answer, and `bithuman list` exits 69 (service unavailable) when it cannot be reached.
- **Action:** `brew upgrade bithuman-cli` or `curl -fsSL https://install.bithuman.ai | sh`.

### CLI 2.7.6 — 2026-09-25

Tag `cli-v2.7.6`.

- **Changed:** a live Essence 1 reply starts about 0.8 s sooner. The CLI measures how much audio the avatar needs before its first frame (about 0.2 s) instead of waiting a fixed second.
- **Fixed:** Essence 1 lip sync in a live session: the mouth moved about 0.1 s ahead of the voice; it is now within 30 ms, and the voice never runs ahead of the mouth.
- **Fixed:** an Expression 2 video rendered on Linux is billed for its length. A 15.0 s video was billed 15.5 s for silent frames past the end of the audio.
- **Action:** `curl -fsSL https://install.bithuman.ai | sh`, or `brew upgrade bithuman-cli`.

### CLI 2.7.5 — 2026-09-25

Tag `cli-v2.7.5`.

- **Fixed:** `bithuman run` again refuses at once when no API secret is set (exit 77), and refuses `--host 0.0.0.0` without `BITHUMAN_ALLOW_PUBLIC_BIND=1` (exit 2), on a machine without ffmpeg too. 2.7.4 answered both with "ffmpeg not found" (exit 69) on such a machine.
- **Action:** `curl -fsSL https://install.bithuman.ai | sh`, or `brew upgrade bithuman-cli`.

### CLI 2.7.4 — 2026-09-25

Tag `cli-v2.7.4`.

- **Fixed:** in a live Expression 2 `bithuman run`, the mouth now moves with the voice. Every audio chunk goes out with the frame rendered from it. On 2.7.3 the voice led the mouth by about 1.6 s on Apple Silicon and 0.55 s on Linux. A reply now starts about 0.5 s after its first audio arrives on an M4.
- **Fixed:** a live Expression 2 session on Linux bills only the frames you saw. Frames rendered and never shown are no longer billed: the rest of a reply you interrupt, the silent padding after each reply, and the warm-up.
- **Fixed:** `bithuman run --host <address>` now works with the built-in conversation. Before, the conversation looked for the server on `127.0.0.1` and every session failed.
- **Fixed:** a local Essence 2 or Expression 2 session without ffmpeg stops before it opens and says how to install ffmpeg. The resting clip between turns works with ffmpeg 9.
- **Changed:** the first frame of an Essence 2 `render` or `run` arrives about 1.3 s sooner.
- **Action:** `curl -fsSL https://install.bithuman.ai | sh`, or `brew upgrade bithuman-cli`.

### CLI 2.7.3 — 2026-09-24

Tag `cli-v2.7.3`.

- **Changed:** one short command line. `bithuman --help` lists 13 commands and 10 flags; `run` takes `--host` and `--port`. `render <avatar> <audio>` takes the audio as its second argument, writes `<avatar>.mp4` unless you pass `-o`, and, like `run` and `open`, accepts an agent code or a sample avatar's name and downloads it on first use.
- **Changed:** every old spelling (`-a`, `--offscreen`, `--cloud`, `--allow-public-bind`, `chat`, `info`, `avatars`, …) still works until 2.9.0 and prints one line on stderr naming what to use instead; `--json` output is unchanged. The full list is in [Renamed in 2.7.3](/resources/renamed#renamed-in-273).
- **Action:** `curl -fsSL https://install.bithuman.ai | sh`, or `brew upgrade bithuman-cli`.

### CLI 2.7.2 — 2026-09-23

Tag `cli-v2.7.2`.

- **Fixed:** an Essence 2 or Expression 2 `bithuman render` no longer opens a second, billed Essence 1 session. Every such render since 2.6.4 was billed 1–2 extra credits.
- **Changed:** you are billed for talking, never for an open room: `bithuman run` no longer bills the silence between turns, and the managed voice bills the agent's speech, not the session's length.
- **Changed:** the reply starts about half a second after you stop talking, and Expression 2 on a Mac answers about 4 seconds sooner. The default voice model is `gpt-realtime-2.1-mini`.
- **Fixed:** `bithuman run` works on a fresh machine. Linux ships `livekit-server`; a missing Python or an old `livekit-server` is refused with the exact install line.
- **Changed:** Essence 2 renders faster on a Linux CPU, and `bithuman render` prints no internal diagnostics.
- **Action:** `curl -fsSL https://install.bithuman.ai | sh`, or `brew upgrade bithuman-cli`.

### Swift package 2.14.4 — 2026-09-23

Essence 2 engine 1.12.1 · Expression 2 engine 2.6.5

- **Fixed:** building a Swift package or command-line tool that uses Essence 2 no longer prints `.pcm: No such file or directory` linker warnings. The engine itself is unchanged.
- **Action:** set `from: "2.14.4"`, then `swift package update`. See [Apple](/platforms/ios).

### Flutter plugin 2.6.14 — 2026-09-23

- **Changed:** iOS and macOS use Essence 2 engine 1.12.1.
- **Action:** pin `ref: flutter-plugin-v2.6.14`.
- iOS and macOS do not build from the published tag yet; use the plugin on Android.

### `bithuman` 2.11.8 — 2026-09-23

- **Fixed:** `AsyncBithuman`, the class the LiveKit plugin uses, loads an Essence 2 avatar on macOS. On 2.11.6 and 2.11.7 it failed with "No module named 'bithuman.bindings'", so a LiveKit agent with an Essence 2 avatar on a Mac could not start.
- **Changed:** Essence 2 on a Linux CPU renders faster.
- **Action:** `pip install -U bithuman`.

### LiveKit plugin 1.8.4 — 2026-09-23

- **Changed:** `model` accepts `essence-2` and `expression-2`. A model you name is the model that renders, or the session is refused; leave it unset and the avatar's own default is used, as before.
- **Fixed:** the plugin no longer imports OpenCV, so it installs beside `opencv-python-headless` without a conflict.
- **Action:** `pip install -U livekit-plugins-bithuman`.

### Swift package 2.14.3 — 2026-09-23

Essence 2 engine 1.12.0 · Expression 2 engine 2.6.5

- **New:** `Essence2Kit`, a Swift API for Essence 2 with the same shape as `Expression2Engine`: `create`, `feed`, `pull`, `idle(into:)`, `interrupt`, `shutdown`. It sets the API secret with `Essence2Credential.set(_:)` and fetches the engine's runtime files for you.
- **Fixed:** apps that link Essence 2 no longer get a `CoreAudioTypes` linker warning.
- **Fixed:** the C header now says what the engine delivers: frames are B, G, R.
- **New:** `be_essence2_last_refusal` returns the reason behind a `-3`.
- **Action:** set `from: "2.14.3"` and take the `Essence2Kit` product. See [Apple](/platforms/ios).

### Flutter plugin 2.6.13 — 2026-09-23

- **Changed:** Android uses `essence2-android` 0.5.15 and `expression2-android` 0.4.10. iOS and macOS use Essence 2 engine 1.12.0.
- **Action:** pin `ref: flutter-plugin-v2.6.13`.
- iOS and macOS do not build from the published tag yet; use the plugin on Android.

### `essence2-android` 0.5.15 — 2026-09-23

- **New:** `Essence2Credential.set(secret)` sets your API secret once. It covers the avatar download and the session, so `Essence2ModelStore(context)` needs no resolver.
- **New:** every type an app uses is in `ai.bithuman.essence2`, including `Essence2Credential` and `Essence2MeteredDoorResolver`.
- **Deprecated:** `Essence2Metering.apiSecret`. It still works and sets the same value.
- **Action:** use `ai.bithuman:essence2-android:0.5.15`, and replace `Essence2Metering.apiSecret = …` with `Essence2Credential.set(…)`. See [Android](/platforms/android).

### `expression2-android` 0.4.10 — 2026-09-23

- **New:** `Expression2Credential.set(secret)` sets your API secret once. It covers the avatar download and the session.
- **Deprecated:** `Expression2Metering.apiSecret`. It still works and sets the same value.
- **Action:** use `ai.bithuman:expression2-android:0.4.10`, and replace `Expression2Metering.apiSecret = …` with `Expression2Credential.set(…)`. See [Android](/platforms/android).

### `bithuman` 2.11.7 — 2026-09-23

- **Fixed:** `AsyncBithuman`, the class the LiveKit plugin uses, renders an Essence 2 avatar with the avatar's own teeth, as `bithuman.open()` does. An avatar file without its teeth is refused when it is opened.
- **Fixed:** on a busy machine (a CI runner, a container with a CPU limit), `render()` no longer refuses with "no frames came out of that render" when the audio has speech in it.
- **Changed:** live sessions bill talking time only. Idle frames are free, an Expression 2 streaming session now reports its usage, and `shutdown()` sends the session's last report.
- **Changed:** Essence 2 on a Linux CPU renders faster and uses less memory.
- **Action:** `pip install -U bithuman`.

### Swift package 2.14.2 — 2026-09-23

Essence 2 engine 1.11.0 · Expression 2 engine 2.6.5

- **Changed:** both engines bill talking time only; idle is free.
- **Changed:** Expression 2 now uses your API secret, like Essence 2 (`Expression2Credential.set(_:)` or `BITHUMAN_API_SECRET`).
- **Changed:** if the service cannot be reached when a session starts, `create` refuses with a retryable error. After the secret is accepted, a network loss is tolerated for 5 minutes of rendered video.
- **New:** `BITHUMAN_API_KEY` is read as a deprecated alias.
- **Action:** set `from: "2.14.2"`, then `swift package update`. See [Apple](/platforms/ios).

### `expression2-android` 0.4.9 — 2026-09-23

- **Changed:** on-device Expression 2 sessions use your API secret and bill talking time; idle is free. `Expression2Avatar.create` throws `Expression2Exception` without a secret.
- **New:** `Expression2Metering` (`apiSecret`, `apiBaseUrl`, `installId`, `stateDir`).
- **New:** after the secret is accepted, a network loss is tolerated for 5 minutes of rendered video; usage that could not be sent is kept and sent at the next start.
- **Action:** set `Expression2Metering.apiSecret` before `create`, then use `ai.bithuman:expression2-android:0.4.9`. See [Android](/platforms/android).

### `essence2-android` 0.5.14 — 2026-09-23

- **Changed:** talking time is billed; idle frames are free.
- **New:** after the secret is accepted, a network loss is tolerated for 5 minutes of rendered video, then render calls throw a retryable `MeteringRefused`.
- **New:** `Essence2Metering.stateDir`; usage that could not be sent is kept for the next session.
- **Action:** use `ai.bithuman:essence2-android:0.5.14`.

### API — 2026-09-23

- **Changed:** revealing a stored API secret is console-only. `GET /v2/{user_id}/api-secrets/{alias}/get-value` with an `api-secret` returns `403 SECRET_REVEAL_CONSOLE_ONLY`. See [API secrets](/api/api-keys#reveal-an-api-secret).
- **Changed:** short legacy-format secrets work only if bitHuman has them on record; create a new secret if an old one returns `401`.
- **New:** `POST /v1/runtime-tokens/mint` takes `"scope": "livekit-cloud"`: a one-hour token that starts one agent's avatar in one room. Pass it to the LiveKit plugin instead of your secret ([LiveKit](/platforms/livekit#authenticate)).

### `essence2-android` 0.5.13 — 2026-09-23

- **Fixed:** the AAR ships its own keep rule for its native bridge, so a release build with `isMinifyEnabled = true` works whatever `proguardFiles(...)` you use.
- **Action:** use `ai.bithuman:essence2-android:0.5.13` or newer.

### CLI 2.7.1 — 2026-09-23

Tag `cli-v2.7.1`.

- **New:** Linux arm64 binary (Graviton, Ampere, arm64 VMs and containers).
- **Fixed:** `login --with-token` checks the secret before storing it (exit 77 `TOKEN_REJECTED`, 69 `TOKEN_UNVERIFIED`).
- **Fixed:** a secret revoked during an Essence 1 session stops the session.
- **Changed:** `account --json` names the config file as the credential `source` when `login` stored it.
- **Action:** `curl -fsSL https://install.bithuman.ai | sh`.

### Swift package 2.14.1 — 2026-09-23

- **Fixed:** a macOS app built in Xcode can embed the frameworks.
- **Fixed:** `Essence2` declares its own linker settings; no manual `c++`, `VideoToolbox`, `Accelerate` or `CoreML`.
- **Fixed:** release builds of `Expression2` no longer write files to `/tmp`.

### CLI 2.7.0 — 2026-09-22

- **Breaking:** retired spellings exit 2: `talk`, `inspect`, `download`, `get`, `ls`, `browse`, `gallery`, `credits`, `agents-md`, `whoami`, `usage`, `init`, `__man`, `engine update`.
- **Breaking:** `account` replaces `whoami` and `usage`; its `--limit` defaults to 10 rows (was 50).
- **Fixed:** `login --json` prints one JSON object; the rest goes to stderr.
- **Changed:** offline-licence messages say "offline license" for both licence kinds.

### `expression2-android` 0.4.8 — 2026-09-22

- **Changed:** the AAR declares the Qualcomm accelerator runtime, so Gradle adds it; remove any hand-typed `com.qualcomm.qti` lines. Exclude it to render on the CPU and save about 70 MB.

### Swift package 2.14.0 — 2026-09-22

- **Fixed:** one app can link both `Expression2` and `Essence2`.

### `bithuman` 2.11.6 — 2026-09-20

- **Changed:** the Python package no longer pulls `torch`; the `bithuman[offline]` and `bithuman[tessera]` extras are removed (a pin on them still installs the base package).
- **Fixed:** `python -m bithuman <CODE>` downloads a re-published model again instead of reusing the cached copy.

### CLI 2.6.26 — 2026-09-20

- **Fixed:** a live session's local video server no longer shows its credentials on the process list.

### CLI 2.6.25 — 2026-09-20

- **Fixed:** usage reporting when a live Linux session is ended with Ctrl-C; upgrade recommended.

### Swift package 2.13.8 — 2026-09-20

Essence 2 engine 1.9.0

- **Changed:** the inside of an Essence 2 avatar's mouth comes from the identity's own footage; the Flutter plugin (2.6.7) moves to the same engine.
- **Action:** update to the current package.

### `bithuman` 2.11.5 — 2026-09-19

- **Changed:** `bithuman.offline` renders through the same engine session as `bithuman.open()`, so a file render matches a live render, on macOS too. The offline route needs no extra.

### `essence2-android` 0.5.12 — 2026-09-19

- **Changed:** the mouth follows the identity's own lip contour.

### CLI 2.6.24 — 2026-09-19

- **Fixed:** Essence 2 identities run on Linux again.
- **Changed:** the mouth follows the identity's own lip contour.

### `bithuman` 2.11.4 — 2026-09-19

- **Changed:** the mouth follows the identity's own lip contour.

### CLI 2.6.23 — 2026-09-19

- **Changed:** `bithuman run` with no argument runs `wise-pup`.
- **Fixed:** an offline render on Linux needs a credential, as on macOS; usage reporting fixed. Upgrade recommended.
- **New:** `render` reports why the video encoder stopped; MCP tool refusals carry an error code.

### `bithuman` 2.11.3 — 2026-09-18

- **Fixed:** the inside of the mouth comes entirely from the identity's own video again; the offline renderer no longer unpacks an extra copy of the model.

### `essence2-android` 0.5.11 — 2026-09-19

- **Fixed:** the inside of the mouth comes entirely from the identity's own video again.

### `bithuman` 2.11.2 — 2026-09-17

- **Changed:** a maintenance release, superseded the next day by 2.11.3.
- **Action:** `pip install -U bithuman`.

### CLI 2.6.22 — 2026-09-17

- **Changed:** a warm `bithuman run` reuses avatar files already on disk and fetches only what is missing.

### `essence2-android` 0.5.10 — 2026-09-16

- **Fixed:** an interruption continues from the current frame instead of restarting the motion.

### Swift package 2.13.7 — 2026-09-16

Essence 2 engine 1.8.0

- **Fixed:** an interruption continues from the current frame.

### CLI 2.6.21 — 2026-09-16

- **Changed:** `bithuman run` on an Expression 2 avatar opens a live conversation with your microphone.

### Swift package 2.13.6 — 2026-09-16

Essence 2 engine 1.7.0

- **Fixed:** long audio returns every frame.
- **Changed:** the source video is decoded as it plays (much less memory), and the idle animation plays whole.

### `essence2-android` 0.5.8 — 2026-09-16

- **Fixed:** every frame of a reply is delivered when audio arrives faster than real time.
- **Changed:** the source video is decoded as it plays, with much less memory.

### `expression2-android` 0.4.7 — 2026-09-16

- **Breaking:** `Expression2Avatar.idleLoop` is an `Expression2IdleLoop`; `next(bitmap)` draws the next idle frame.
- **Changed:** the idle clip plays whole and wraps at its end.

### `bithuman` 2.11.0 — 2026-09-16

- **Breaking:** the 3.x releases are withdrawn from PyPI; 2.11.0 carries the same engine with the 2.x import surface (`AsyncBithuman`) beside `open()` and `render()`. Withdrawn — do not pin: 3.0.0 to 3.1.10.

### Swift package 2.13.5 — 2026-09-16

Expression 2 engine 2.6.3

- **Breaking:** `idleLoop` is removed; use `idleNextPixelBuffer()` or `idle(into:)`.
- **Changed:** the idle clip plays whole.

### Swift package 2.13.4 — 2026-09-16

- **Changed:** an utterance delivers exactly the frames its audio covers; `pullPos()` returns each frame's audio position; `isSpeech` is per-frame voice activity.

### `expression2-android` 0.4.6 — 2026-09-16

- **New:** `Expression2Avatar.idleLoop`; `Expression2Frame.isSpeech` and `audioSample`.
- **Changed:** an utterance delivers exactly the frames its audio covers.

### `essence2-android` 0.5.7 — 2026-09-15

- **Breaking:** the `ElevateFrames` constructor (legacy `ai.bithuman.elevate` package, kept for compatibility) drops its execution-provider argument.

### CLI 2.6.20 — 2026-09-14

- **Changed:** `bithuman run` refuses without a credential on Linux too (exit 77), as on macOS.
- **Changed:** `--host 0.0.0.0` needs `--allow-public-bind` (exit 2 `PUBLIC_BIND_REFUSED`).

### CLI 2.6.19 — 2026-09-14

- **Changed:** `bithuman render` needs a credential (exit 77 `NOT_SIGNED_IN`).
- **Breaking:** `bithuman auth …` is removed.
- **New:** `--json` errors carry a `hint`.

### `essence2-android` 0.5.6 — 2026-09-14

- **Changed:** rendering uses the phone's GPU with its CPU; an interruption stops the avatar immediately.
- **New:** `Essence2ModelStore.fetch()` picks up a changed model on the next session and keeps the verified copy when offline.

### CLI 2.6.13 to 2.6.18 — 2026-09-13 to 2026-09-14

- **Changed:** faster Essence 2 and Expression 2 renders on Linux and macOS, hardware video encoding on macOS (`BITHUMAN_FORCE_X264=1` selects the CPU encoder), and `render --json` reports `render_fps`. Frames are unchanged.

### Swift package 2.13.3 — 2026-09-14

- **Changed:** Essence 2 engine 1.6.3: a faster audio step.

### `essence2-android` 0.5.5 — 2026-09-13

- **Changed:** the default settings are the fast ones. There is no 0.5.4.

### API — 2026-09-13

- **Changed:** the cloud Apple-tier slugs are `essence-2-apple` and `expression-2-apple`; `essence-2-ane` and `expression-2-ane` remain accepted.

### CLI 2.6.8 — 2026-09-12

- **Changed:** `render` opens avatars the same way `run` does: faster, same output. The first render downloads the shared audio model once. 2.6.7 was not published.

### CLI 2.6.6 — 2026-09-11

- **New:** `bithuman pull <CODE>` downloads any sample avatar without an account.
- **Fixed:** `render` no longer adds warm-up frames before the first spoken frame.

### CLI 2.6.1 to 2.6.4 — 2026-09-07

- **New:** Essence 2 renders locally on macOS and Linux (`bithuman pull <CODE> --model essence-2`, then `render` or `run`).
- **Changed:** self-hosted sessions are metered. A secret the service rejects gets 5 minutes, then the session stops.

### Swift package 2.11.0 to 2.13.2 — 2026-09-09 to 2026-09-13

Essence 2 engine 1.5.1 to 1.6.2

- **Fixed:** the Essence 2 engine's resources archive is complete again (1.5.1), and a downloaded Essence 2 model opens in the iOS engine (1.6.0 to 1.6.2).
- **Changed:** the binary targets carry a `Binary` suffix; `import Essence2` and `import Expression2` are unchanged.
- **Action:** update to the current package.

### Swift package 2.8.0 to 2.10.0 — 2026-09-07

- **New:** the `Essence2` product. A rejected secret gets 5 minutes, then frames stop.

### `essence2-android` 0.5.1 — 2026-09-07

- **New:** metered Essence 2 on Android. Withdrawn — do not pin: 0.2.0 to 0.5.0.

### Swift package 2.6.0 — 2026-09-06

- **New:** `Expression2Engine.create(avatarContainer:…)` opens the downloaded container directly.

### `expression2-android` 0.3.1 — 2026-09-04

- **Changed:** resolves from `mavenCentral()` alone.

### CLI 2.5.0 and 2.5.1 — 2026-09-02 to 2026-09-03

- **New:** `bithuman pull <CODE> --model <MODEL>`; the first signed and notarized macOS build; macOS and Linux on one version again.

### API — 2026-09-02

- **Changed:** the cloud "Apple Neural Engine" tier is named **Apple**; it runs on the Mac's GPU.

## August 2026

### API — 2026-08-17

- **Changed:** every `409 MODEL_NOT_GENERATED` names the fix: the [model-add](/api/agents#add-a-model-to-an-existing-agent) call and its cost.

### `bithuman` 2.9.0 — 2026-08-02

- **New:** Essence 2 renders on your own Linux CPU, to frames or an MP4, with your API secret.

Questions and bug reports: [Community & support](/support).
