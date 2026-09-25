---
title: "Changelog"
description: "Release notes for every bitHuman artifact: CLI, Python, Swift package, Android, API and LiveKit plugin."
section: resources
group: "Resources"
order: 2
type: changelog
label: "Changelog"
---

What changed in each release, newest first. Current versions are on [Downloads & versions](/downloads) and in [/versions.json](/versions.json). Entries before August 2026 are in the [archive](/changelog/archive).

## Breaking changes

| Date | Artifact | Change | What to do |
|---|---|---|---|
| 2026-09-24 | expression2-android 0.5.0 | `Expression2ModelStore.MODEL`, `CANON` and `IDLE` are no longer compile-time constants | read them at runtime; a `when` branch or annotation that used them as constants must change |
| 2026-09-23 | Swift package 2.14.2 | `Expression2Engine.create` refuses without an API secret | call `Expression2Credential.set(_:)` or set `BITHUMAN_API_SECRET` |
| 2026-09-23 | expression2-android 0.4.9 | `Expression2Avatar.create` refuses without an API secret | set `Expression2Metering.apiSecret` |
| 2026-09-22 | CLI 2.7.0 | retired command spellings exit 2; `account --limit` defaults to 10 | use the [current names](/sdk/cli/reference#commands); pass `--limit 50` for the old window |
| 2026-09-16 | bithuman 2.11.0 | the 3.x releases are withdrawn from PyPI | unpin 3.x; `pip install bithuman` |
| 2026-09-16 | expression2-android 0.4.7 | `idleLoop` is an `Expression2IdleLoop`, not a `List<Bitmap>` | call `idleLoop?.next(bitmap)` |
| 2026-09-16 | Swift package 2.13.5 | `Expression2Engine.idleLoop` removed | use `idleNextPixelBuffer()` or `idle(into:)` |
| 2026-09-15 | essence2-android 0.5.7 | the `ElevateFrames` constructor (legacy `ai.bithuman.elevate` package, kept for compatibility) drops its execution-provider argument | delete that argument |
| 2026-09-14 | CLI 2.6.19 | `bithuman auth …` removed | `bithuman login`, `logout`, `account`, `token` |

## September 2026

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
- **Changed:** the `-sources.jar` and `-javadoc.jar` on Maven Central are placeholders; the API reference is [Android API](/sdk/android-api).
- **Deprecated (still works):** `Essence2ModelStore.DEFAULT_MEMBERS`. No replacement is needed.
- **Action:** `implementation("ai.bithuman:essence2-android:0.6.0")`.

### expression2-android 0.5.0 — 2026-09-24

- **Fixed:** lip sync. The mouth moved ahead of the voice; it now lines up. The first frame of each stream is shown twice; a stream still carries the same number of frames.
- **Changed:** a failed download is retried on one budget shared by the whole store.
- **Changed:** the `-sources.jar` and `-javadoc.jar` on Maven Central are placeholders; the API reference is [Android API](/sdk/android-api).
- **Breaking (source only):** `Expression2ModelStore.MODEL`, `CANON` and `IDLE` keep their values but are no longer compile-time constants.
- **Action:** `implementation("ai.bithuman:expression2-android:0.5.0")`.

### Flutter plugin 2.6.16 — 2026-09-24

- **Changed:** Android uses essence2-android 0.6.0 and expression2-android 0.5.0.
- **Action:** pin `ref: flutter-plugin-v2.6.16`.

### Swift package 2.15.0 — 2026-09-24

Essence 2 engine 1.12.1 · Expression 2 engine 2.7.0

- **Fixed:** Expression 2 lip sync. The mouth moved about 65 ms ahead of the voice; it now lines up (about 15 ms). To do this, the first frame of each stream is shown twice; a stream still carries the same number of frames.
- **New:** `Expression2Download.avatar(agentCode:)` and `Essence2Download.identity(agentCode:)` download an avatar file from your app. They fetch the smaller Apple build of the file, check its sha256 and keep it in the app's Caches, so a second call downloads nothing. See [Apple](/sdk/apple#download-an-avatar-in-the-app).
- **Action:** set `from: "2.15.0"`, then `swift package update`.

### Flutter plugin 2.6.15 — 2026-09-24

- **Changed:** iOS and macOS use Expression 2 engine 2.7.0, which fixes lip sync.
- **Action:** pin `ref: flutter-plugin-v2.6.15`.

### `bithuman` 2.11.12 — 2026-09-25

- **Fixed:** a moment of network no longer ends a render. When the service does not answer, or answers that it is busy, `python -m bithuman` asks again, up to three times over a few seconds. When it does give up, the message says what the service did, and the exit code is 69 (service unavailable), as with the `bithuman` CLI. In Python the refusal is still a `bithuman.Failed`.
- **Changed:** a live Essence 2 avatar (`AsyncBithuman`) no longer bills the short transition into and out of speech, which carries none of your audio.
- **Action:** `pip install -U bithuman`.

### `bithuman` 2.11.11 — 2026-09-25

- **Changed:** an offline render — `bithuman.open(...).render(audio)` and `python -m bithuman render` — is billed for the length of the video it produces (frames ÷ frame rate), the same as the `bithuman` CLI and the Video API. It was billed for the time the render took, so a fast machine paid for a fraction of the video. Live avatars (`AsyncBithuman`, the LiveKit plugin) are unchanged: they bill the seconds the avatar talks, and idle is free. Renders made before this release are not billed again.
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
- **Changed:** every old spelling (`-a`, `--offscreen`, `--cloud`, `--allow-public-bind`, `chat`, `info`, `avatars`, …) still works until 2.9.0 and prints one line on stderr naming what to use instead; `--json` output is unchanged. The full list is in [Renamed in 2.7.3](/sdk/cli/reference#renamed-in-273).
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
- **Action:** set `from: "2.14.4"`, then `swift package update`. See [Apple](/sdk/apple).

### Flutter plugin 2.6.14 — 2026-09-23

- **Changed:** iOS and macOS use Essence 2 engine 1.12.1.
- **Action:** pin `ref: flutter-plugin-v2.6.14`.

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
- **Action:** set `from: "2.14.3"` and take the `Essence2Kit` product. See [Apple](/sdk/apple).

### Flutter plugin 2.6.13 — 2026-09-23

- **Changed:** Android uses `essence2-android` 0.5.15 and `expression2-android` 0.4.10. iOS and macOS use Essence 2 engine 1.12.0.
- **Action:** pin `ref: flutter-plugin-v2.6.13`.

### `essence2-android` 0.5.15 — 2026-09-23

- **New:** `Essence2Credential.set(secret)` sets your API secret once. It covers the avatar download and the session, so `Essence2ModelStore(context)` needs no resolver.
- **New:** every type an app uses is in `ai.bithuman.essence2`, including `Essence2Credential` and `Essence2MeteredDoorResolver`.
- **Deprecated:** `Essence2Metering.apiSecret`. It still works and sets the same value.
- **Action:** use `ai.bithuman:essence2-android:0.5.15`, and replace `Essence2Metering.apiSecret = …` with `Essence2Credential.set(…)`. See [Android](/sdk/android).

### `expression2-android` 0.4.10 — 2026-09-23

- **New:** `Expression2Credential.set(secret)` sets your API secret once. It covers the avatar download and the session.
- **Deprecated:** `Expression2Metering.apiSecret`. It still works and sets the same value.
- **Action:** use `ai.bithuman:expression2-android:0.4.10`, and replace `Expression2Metering.apiSecret = …` with `Expression2Credential.set(…)`. See [Android](/sdk/android).

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
- **Action:** set `from: "2.14.2"`, then `swift package update`. See [Apple](/sdk/apple).

### `expression2-android` 0.4.9 — 2026-09-23

- **Changed:** on-device Expression 2 sessions use your API secret and bill talking time; idle is free. `Expression2Avatar.create` throws `Expression2Exception` without a secret.
- **New:** `Expression2Metering` (`apiSecret`, `apiBaseUrl`, `installId`, `stateDir`).
- **New:** after the secret is accepted, a network loss is tolerated for 5 minutes of rendered video; usage that could not be sent is kept and sent at the next start.
- **Action:** set `Expression2Metering.apiSecret` before `create`, then use `ai.bithuman:expression2-android:0.4.9`. See [Android](/sdk/android).

### `essence2-android` 0.5.14 — 2026-09-23

- **Changed:** talking time is billed; idle frames are free.
- **New:** after the secret is accepted, a network loss is tolerated for 5 minutes of rendered video, then render calls throw a retryable `MeteringRefused`.
- **New:** `Essence2Metering.stateDir`; usage that could not be sent is kept for the next session.
- **Action:** use `ai.bithuman:essence2-android:0.5.14`.

### API — 2026-09-23

- **Changed:** revealing a stored API secret is console-only. `GET /v2/{user_id}/api-secrets/{alias}/get-value` with an `api-secret` returns `403 SECRET_REVEAL_CONSOLE_ONLY`. See [API secrets](/api/api-keys#reveal-an-api-secret).
- **Changed:** short legacy-format secrets work only if bitHuman has them on record; create a new secret if an old one returns `401`.
- **New:** `POST /v1/runtime-tokens/mint` takes `"scope": "livekit-cloud"`: a one-hour token that starts one agent's avatar in one room. Pass it to the LiveKit plugin instead of your secret ([LiveKit](/sdk/livekit#authenticate)).

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
- **Removed:** the development-only unmetered variable.

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

Questions and bug reports: [Community & support](/community).
