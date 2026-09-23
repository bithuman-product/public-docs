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
| 2026-09-23 | Swift package 2.14.2 | `Expression2Engine.create` refuses without an API secret | call `Expression2Credential.set(_:)` or set `BITHUMAN_API_SECRET` |
| 2026-09-23 | expression2-android 0.4.9 | `Expression2Avatar.create` refuses without an API secret | set `Expression2Metering.apiSecret` |
| 2026-09-22 | CLI 2.7.0 | retired command spellings exit 2; `account --limit` defaults to 10 | use the [current names](/sdk/cli/reference#commands); pass `--limit 50` for the old window |
| 2026-09-16 | bithuman 2.11.0 | the 3.x releases are withdrawn from PyPI | unpin 3.x; `pip install bithuman` |
| 2026-09-16 | expression2-android 0.4.7 | `idleLoop` is an `Expression2IdleLoop`, not a `List<Bitmap>` | call `idleLoop?.next(bitmap)` |
| 2026-09-16 | Swift package 2.13.5 | `Expression2Engine.idleLoop` removed | use `idleNextPixelBuffer()` or `idle(into:)` |
| 2026-09-15 | essence2-android 0.5.7 | the `ElevateFrames` constructor (legacy `ai.bithuman.elevate` package, kept for compatibility) drops its execution-provider argument | delete that argument |
| 2026-09-14 | CLI 2.6.19 | `bithuman auth …` removed | `bithuman login`, `logout`, `account`, `token` |

## September 2026

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
