---
title: "Changelog"
description: "Release notes and version history for the bitHuman platform."
section: resources
group: "Resources"
order: 2
type: changelog
label: "Changelog"
---

> **Note** Product-level changes only. For per-version notes, see the [Python SDK release history](https://pypi.org/project/bithuman/#history) and the [SDK releases](https://github.com/bithuman-product/homebrew-bithuman/releases). Entries from July 2026 and earlier are on the [changelog archive](/changelog/archive).

## September 2026

### `expression2-android` 0.4.9 — 2026-09-23

`implementation("ai.bithuman:expression2-android:0.4.9")`

- **Changed:** on-device Expression 2 sessions now use your API secret and bill talking time; idle is free. `Expression2Avatar.create` throws `Expression2Exception` when no API secret is set.
- **New:** `Expression2Metering` (`apiSecret`, `apiBaseUrl`, `installId`, `stateDir`). The secret resolves from `Expression2Metering.apiSecret`, then `BITHUMAN_API_SECRET`.
- **New:** after your API secret is accepted, a network outage is tolerated for 5 minutes of rendered video; then `pull` throws a retryable `Expression2Exception` until the connection returns. Usage that could not be sent is kept and sent at the next start.
- **Action:** set `Expression2Metering.apiSecret` before `create`, then update the dependency. See [Android](/sdk/android).

### `essence2-android` 0.5.14 — 2026-09-23

`implementation("ai.bithuman:essence2-android:0.5.14")`

- **Changed:** talking time is billed; idle frames are free.
- **New:** after your API secret is accepted, a network outage is tolerated for 5 minutes of rendered video; then render calls and `idleFrame` throw a retryable `MeteringRefused` until the connection returns.
- **New:** `Essence2Metering.stateDir`. Usage that could not be sent is kept and sent at the next session.
- **Action:** update the dependency. See [Android](/sdk/android).

### An API secret can no longer read your other API secrets (2026-09-23)

`GET /v2/{user_id}/api-secrets/{alias}/get-value` now returns `403`
`SECRET_REVEAL_CONSOLE_ONLY` when called with an `api-secret`. Revealing a
stored secret is a console action, available only to the signed-in owner under
[Developer → API Secrets](https://www.bithuman.ai/developer/api-keys). Until
now, anyone holding one of your secrets could read the rest. Creating, listing
(masked) and deleting secrets with an `api-secret` work as before. See
[Reveal an API secret](/api/api-keys#reveal-an-api-secret).

Legacy-format API secrets (the short keys issued before the current 65-character
format) are now accepted only if bitHuman has them on record. Keys in active
use were recorded automatically. If an old legacy key now returns `401`, create
a new secret in the console.

### LiveKit: keep your API secret out of the room (2026-09-23)

`livekit-plugins-bithuman` 1.8.2 writes whatever it is given as `api_secret`
into LiveKit room attributes. Every participant in the room can read those.
`POST /v1/runtime-tokens/mint` now takes `"scope": "livekit-cloud"`. It returns
a one-hour token that can only start that agent's avatar, in that room, and
the plugin carries it unchanged in place of your secret. It cannot download
the model or call any other endpoint. See
[Keep your API secret out of the room](/sdk/livekit#keep-your-api-secret-out-of-the-room).
If you have passed your API secret to the plugin, switch to the token. Then
create a new secret and delete the old one under
[Developer → API Secrets](https://www.bithuman.ai/developer/api-keys).

### A release build that brings its own ProGuard file keeps Essence 2 working — `essence2-android` 0.5.13 (2026-09-23)

`ai.bithuman:essence2-android:0.5.13` on Maven Central. The AAR now ships its
own keep rule for the engine's JNI bridge, as `expression2-android` already did,
so `isMinifyEnabled = true` works with any `proguardFiles(...)` line. On
`0.5.12` and older, a release build that replaced Android's default ProGuard
file instead of adding to it had the bridge renamed and threw
`UnsatisfiedLinkError` at the first `create()` — measured on a Galaxy S25+, and
only in release builds. Nothing else a caller can see changes: the Kotlin
surface is byte-identical to `0.5.12`, and the picture is the same — the lip
contour, and a mouth taken entirely from the identity's own footage (generated
share **0.000000 mean / 0.000000 max** over 62 frames). See
[Shrink the release build](/sdk/android#platform-notes).

### ARM Linux can install the CLI again — `cli-v2.7.1` (2026-09-23)

`curl -fsSL https://install.bithuman.ai | sh` to install or upgrade; `bithuman --version`
to confirm (`bithuman 2.7.1`). Three downloads from one commit: macOS Apple Silicon, Linux
x86_64 and, for the first time since `cli-v2.3.27`, **Linux arm64** (Graviton, Ampere, an
arm64 VM or container).

- **Linux arm64 renders both local model families.** Measured on the published arm64
  download in a clean Ubuntu 24.04 arm64 container: the installer, `login`, then
  `render` of an Essence 2 identity (75 frames, 1080×1920) and an Expression 2 identity
  (60 frames, 416×720), with the same mouth interior as the other two platforms.
- **`login --with-token` checks the key before storing it.** A made-up key used to be
  stored and reported as signed in; it now exits **77** with `TOKEN_REJECTED` and nothing
  is written. An unreachable service is exit **69** `TOKEN_UNVERIFIED`. A good key is
  stored and the success object carries the account's `email`.
- **`account --json` names the config file** as the `source` of a key `login` stored,
  instead of `env BITHUMAN_API_SECRET`.
- **A key revoked while an Essence 1 session runs now stops it**, instead of rendering on
  unmetered.
- **Known issue, unchanged from 2.7.0:** `bithuman render` of an Essence 1 model exits
  **69** before rendering on every platform; `bithuman.open("model.imx").render(...)` in
  the [Python library](/sdk/python) renders it. The fix is planned for 2.7.2.

### A new Mac app builds, and Essence 2 needs no linker flags from you — Swift package `2.14.1` (2026-09-23)

Raise your floor to `from: "2.14.1"` and force the resolve (*File → Packages →
Update to Latest Package Versions*, or `swift package update`). It pins
`Expression2` **2.6.4** and the same Essence 2 engine as `2.14.0`,
`essence2-v1.10.0`. Nothing you call changes: every public `.swiftinterface`
in 2.6.4 is identical to 2.6.3's.

- **A macOS app can embed the frameworks.** Through `2.14.0` the macOS
  frameworks had the iPhone bundle layout. `swift build` links them. An Xcode
  **app** copies them into *Contents/Frameworks*, and its validation step
  stopped the build: `… contains Info.plist, expected
  Versions/Current/Resources/Info.plist since the platform does not use
  shallow bundles`. That hit `Essence2` alone too, because it carries
  `UnifiedModelHeader`. Measured 2026-09-23 with a new App-template project
  (Xcode 26.4.1): `** BUILD FAILED **` on 2.14.0, and on 2.14.1 `** BUILD
  SUCCEEDED **` for macOS, the iOS Simulator and an iOS device. It then
  rendered both models on the Mac.
- **`Essence2` declares its own linker settings.** Before, attaching it
  compiled and then failed the final link with hundreds of undefined symbols
  until you added `c++`, `VideoToolbox`, `Accelerate` and `CoreML` by hand.
  From 2.14.1 the product carries them.
- **Release builds of `Expression2` stop writing to `/tmp`.** The published
  macOS example on 2.14.0 wrote `/tmp/expression2_canon0.bgr` (898,560 bytes)
  and 18 lines to `/tmp/expression2_gen.txt` on every run, and honoured a
  fault-injection environment variable. On 2.14.1 the same program writes
  nothing.

Also corrected on [iOS SDK](/sdk/apple#authentication) while measuring this:
Essence 2 **needs an API secret** to start a session. It reads `BITHUMAN_API_SECRET`
(essence2-v1.10.0 does not read BITHUMAN_API_KEY, the deprecated alias); with none, or a rejected one, `be_essence2_create`
returns `-3` and says why. A sandboxed Mac app also needs **Outgoing
Connections (Client)**, or the check cannot reach the service.

### Five commands and nine aliases are gone, and one default changed quietly — `cli-v2.7.0` (2026-09-22)

`curl -fsSL https://install.bithuman.ai | sh` to upgrade; `bithuman --version`
to confirm (`bithuman 2.7.0`). macOS arm64 and Linux x86_64, built from one
commit. **This is a minor bump, not a patch, because a script written against
`2.6.26` can stop working. Read the first two bullets before you upgrade.**

- **BREAKING — retired spellings now exit 2.** `talk`, `inspect`, `download`,
  `get`, `ls`, `browse`, `gallery`, `credits`, `agents-md`, `whoami`, `usage`,
  `init`, `__man` and `engine update` no longer resolve. Measured on the
  published `2.7.0` bytes from a fresh install: `bithuman whoami` prints
  `error: unrecognized subcommand 'whoami'` and exits **2**. That is
  deliberate — a script that used one fails loudly on its first run instead of
  drifting — but it fails on the first run. Type `run` for `talk`, `open` for
  `inspect`, `pull` for `download`/`get`, `list` for `ls`/`browse`/`gallery`,
  `account` for `credits`/`whoami`/`usage`, `__agents` for `agents-md`,
  `login` then `run` for `init`, `engine install` for `engine update`, and
  `--help` for `__man`.
- **BREAKING, and this one is quiet — `usage` → `account` also changes the
  default row count, 50 → 10.** `usage --limit` returned up to **50** history
  rows by default; its replacement `account --limit` defaults to **10**
  (`--limit <LIMIT>  Max history rows to show (default 10)` on the published
  binary). A script that parsed the default output and expected fifty rows
  silently sees ten, with no error. Pass `--limit 50` to keep the old window.
- **One name per task, and the binary finally agrees with itself about what
  they are.** Counting aliases, `2.6.26` answered to **32** names for 17 jobs
  and its three self-descriptions disagreed — `--help` listed 22, `completion
  bash` 26, `__schema` 22, and `__schema` reported **0** hidden commands while
  carrying three. `2.7.0` answers to **19**, and `--help` (17, the 19 minus the
  two hidden), `completion bash` (19) and `__schema` (19) now agree. Both
  counts were taken by executing every candidate name against the published
  tarballs rather than by reading a source file.
- **`bithuman account` answers the whole account question in one command** —
  who the credential belongs to, the plan, the balance and the spend behind it
  — with one exit contract: 0 when the account could be read, **77** when no
  credential resolves (re-measured on the published bytes). `whoami`'s
  signed-out exit 1 with a success-shaped body on stdout was the odd one out.
  `usage`'s `--limit`, `--start`, `--end` and `--agent` are `account`'s now,
  and its rows are in `account --json` under `usage`.
- **`login --json` emits JSON.** On `2.6.26` both sign-in routes printed human
  chrome to stdout — colour escapes included — and no object, so
  `bithuman login --json | jq` failed to parse. Both routes now emit one
  success object (`logged_in`, `email`, `alias`, `stored`), with `email` and
  `alias` null where the route does not learn them.
- **Offline licence messages no longer say "annual".** Two different things
  arrive through the same `BITHUMAN_LICENSE` variable: an annual licence, and a
  prepaid usage pack metered by render seconds, which is neither annual nor
  unlimited. Both messages now say "offline license" and leave the term to the
  licence. No behaviour changes — only what the CLI tells you it is doing.
- **The engine moves to `2.11.6`, ABI 7** (`2.6.26` shipped `2.11.5`). A show
  running on a prepaid offline pack is no longer cut off the moment the pack
  runs out: there is a **5 minute grace** from exhaustion, anchored in the same
  sealed record that carries the spent budget, so restarting does not hand out
  a fresh five minutes. An Essence 2 identity also opens faster — the render
  session is now built by whoever renders, 223 ms → 72 ms on the same identity.
- **If you run Essence 1 self-hosted, nothing about your metering changes**, and
  there is no time limit on a box that cannot reach the meter. Credits are the
  gate.

### Expression 2 on Android brings its own accelerator — `ai.bithuman:expression2-android:0.4.8` (2026-09-22)

Through `0.4.7` the AAR named the Qualcomm accelerator runtime in the docs and
nowhere else: its published POM declared only `kotlin-stdlib`, so an app that
took the coordinate and nothing else got no delegate on disk and the engine fell
back to the CPU. It still rendered, and it still said nothing — the only symptom
was a frame rate several times lower than the page quoted.

`0.4.8` declares `com.qualcomm.qti:qnn-litert-delegate:2.49.0` and
`com.qualcomm.qti:qnn-runtime:2.49.0` itself, at runtime scope, so Gradle brings
them in. The dependency block is now one line, and the two hand-typed
`com.qualcomm.qti` lines older instructions carry are no longer needed.

Know what it costs, because it is most of the APK: those two artifacts take a
build from **3,508,289 B to 73,881,473 B**, and `useLegacyPackaging = true`
extracts **22 libraries totalling 201,207,300 B** onto the device. If that is
too much, `exclude(group = "com.qualcomm.qti")` and the engine renders on the
CPU — [Android SDK](/sdk/android#install).

### One app can take both Expression 2 and Essence 2 — Swift package `2.14.0` (2026-09-22)

Every package tag through `v2.13.8` made `Expression2` + `Essence2` in one app a
**link failure on device**: 112 duplicate symbols, because the Essence 2 engine
archive was built from a library closure that also defined the
`UnifiedModelHeader` objects the `Expression2` product already forces every
consumer to link.

A green `swift build` never saw it — a library target is compiled, never linked,
so the collision only fires at an app's final link. The Simulator is not a safe
check either.

`v2.14.0` pins Essence 2 engine `essence2-v1.10.0`, which no longer defines
those objects, and its `Essence2` product now links `UnifiedModelHeader`
directly so an Essence 2-only app still resolves. Measured on the published
archives, all three slices: `UnifiedModelHeader` defined **0**, colliding **0**,
unmet **0**.

Raise your floor to `from: "2.14.0"`. `from:` is a floor, not a pin, and an
existing project keeps whatever `Package.resolved` already holds.

### `pip install bithuman` no longer pulls `torch` — `bithuman` 2.11.6 (2026-09-20)

`pip install --upgrade bithuman`. The wheel's `bithuman[offline]` and
`bithuman[tessera]` extras are **gone**. They existed to add `torch`, `onnx`
and `onnxruntime` for the clip-to-file route, which has not used them since 2.11.5 — the route runs
the same engine `bithuman.open()` runs. Read off the published metadata, the
extras `bithuman` 2.11.6 declares are `expression-2` and `test`, and it
declares seven runtime dependencies with no `torch` among them.

- **Nothing you import or call moves.** `bithuman.offline`
  (`OfflineRenderer`, `render_offline`, `unfold_imx`) and the legacy
  `bithuman.tessera_offline` spelling both still import, unchanged — read back
  out of the published 2.11.6 wheel in a virtualenv with nothing else in it.
  `ffmpeg` on `PATH` is still what writes the MP4.
- **A requirements file that pins a removed extra still installs.** A pin
  written as `bithuman[offline]` or `bithuman[tessera]` does not fail: pip
  warns that the wheel does not provide that extra and installs the base
  package, which is the whole install. Drop the brackets when you next touch
  your requirements — there is nothing left for them to add.
- **A re-published identity is fetched again instead of being served from the
  cache.** `python -m bithuman <CODE> <audio>` caches the container it
  downloads under `~/.cache/bithuman/downloads`, and on 2.11.5 it kept serving
  that copy after the same code had been re-published. From 2.11.6 it compares
  the cached file with the published one and fetches again when they differ;
  when the published file cannot be asked about, the cached copy is used as
  before. The matching CLI fix rides `cli-v2.6.26`.
- **A process that had `torch` in its environment starts faster.** Measured on
  the published wheels, `bithuman.open()` is ready in **158 ms**, against
  **1,196 ms** in the same environment with `torch` present for the import to
  find.
- **No API change**, and the same platforms: Python 3.10–3.14 on macOS arm64,
  Linux x86_64 and Linux aarch64. Anywhere else the release still refuses by
  name rather than installing something older.

### A live session's local video server no longer shows its key on the process list — `cli-v2.6.26` (2026-09-20)

`curl -fsSL https://install.bithuman.ai | sh` to upgrade; `bithuman --version`
to confirm (`bithuman 2.6.26`). macOS arm64 and Linux x86_64, built from one
commit. **Upgrade if you run live sessions on a machine other people can log
in to.**

- **The key pair for the local video server is no longer on its command line.**
  A live `bithuman run` starts a local video server with a
  freshly minted key and secret, and those were passed as command-line
  arguments — which every user on the same machine can read with `ps`, for as
  long as the session runs. They are now passed in the server's environment,
  which only your own user can read, and nothing is written to disk. Measured
  on the published `2.6.26` bytes: a live session's 13 processes carry no
  credential on any command line.
- **Nothing else changes for you.** No machine `code`, no `--json` key and no
  exit code is added or renamed; a script that parsed `2.6.25` parses `2.6.26`.
  The engine inside is the same build `2.6.25` shipped (`2.11.5`, ABI 7).
  Ctrl-C on a live session still delivers the final meter beat — re-measured on
  the published `2.6.26` bytes from a fresh install: `served=30.8s … delivered
  (final)`, exit 0.

### On Linux, a live session ended with Ctrl-C was billed 0 s for its last interval — `cli-v2.6.25` (2026-09-20)

`curl -fsSL https://install.bithuman.ai | sh` to upgrade; `bithuman --version`
to confirm (`bithuman 2.6.25`). macOS arm64 and Linux x86_64, built from one
commit. **Upgrade if you run live sessions on Linux.**

- **The last meter beat of a live session survives Ctrl-C.** On `2.6.24` Linux,
  a `bithuman run` session ended with Ctrl-C (or SIGTERM) was billed nothing for
  the time since its last beat — up to 60 s, the whole session when shorter —
  because the terminal's signal reached the render host before the CLI could
  close it. Measured on the published `2.6.24` bytes: Ctrl-C after 32 s, no
  beat, 3 of 3 runs. The host now runs in its own process group, like the CLI's
  other helpers; the CLI closes it as before and the host reports the last
  interval itself. Measured on the published `2.6.25` bytes: Ctrl-C after 30 s
  delivers `[selfhost-meter] beat seq=1 served=30.6s … delivered (final)` about
  1.5 s after the signal, 3 of 3 runs; SIGTERM 1 of 1; a session the platform
  ends is unchanged.
- **Exit codes are unchanged.** A live session ended by Ctrl-C still exits
  **0** after its short drain — the [reference](/sdk/cli/reference#exit-codes)
  now says so beside the `130` a local Essence 2 preview returns. No machine
  `code` or `--json` key is added or renamed; a script that parsed `2.6.24`
  parses `2.6.25`. The engine inside moves to **2.11.5** (ABI 7); an identity
  file replaced under the same name is unpacked again once instead of the older
  unpacked copy being used forever.

### An offline render is the same render as a streaming one, on macOS too — `bithuman` 2.11.5 (2026-09-19)

`pip install --upgrade bithuman`. `bithuman.offline` (`OfflineRenderer`,
`render_offline`) no longer drives a second, Python-side copy of the render:
it opens the same engine session `bithuman.open()` opens and pushes the clip
through it. So a clip rendered to a file now gets the same picture a live
session gets — including the identity's own lip contour, which 2.11.4 brought
to the streaming route only. Measured on the published wheels: the same avatar
and audio through both routes give **299 of 299 frames byte-identical** on
Linux and on macOS, with 0.0 generated mouth texture on both. The offline
route needs no extra any more (`torch` and `onnxruntime` are not pulled in);
`ffmpeg` is still needed on `PATH` to write the MP4.

On Apple Silicon the four combinations of "the identity carries a contour"
and "its CoreML model declares the contour input" are each named at open,
and the one that used to draw the older elliptical mask silently — a model
without the input under an identity with a contour — now falls back to the
onnxruntime path and draws the contour. A missing `api_secret` on a public
wheel now says so plainly instead of refusing every frame. No API change;
Python 3.10–3.14 on macOS arm64, Linux x86_64 and Linux aarch64.

### The mouth follows the identity's own lip contour on Android — `essence2-android` 0.5.12 (2026-09-19)

`ai.bithuman:essence2-android:0.5.12` on Maven Central. When an Essence 2
identity carries its lip contour (`lip_template.v1.json` — the door serves it
for most identities today), the mouth on the handset is now drawn within that
contour instead of the generic elliptical region it used before. **This is the
first Android release where that happens at all:** `0.5.11` and everything
before it drew the ellipse whatever the identity carried, so the shape of the
mouth on a phone was never the identity's own. An identity without the member
renders exactly as `0.5.11` did.

The mouth's own texture is unchanged and still entirely the identity's own:
measured on a Galaxy S25+ across 62 frames, the generated share of the mouth
read **0.000000 mean / 0.000000 max**, as `0.5.11` did.

No Kotlin or Java surface change — the public surface read from the published
AAR is identical to `0.5.11`'s, down to the member ([API
reference](/sdk/android-api), which is generated from these bytes). Bump the
coordinate and rebuild.

### Essence 2 runs on Linux again, and the mouth follows the identity's own lip contour — `cli-v2.6.24` (2026-09-19)

`curl -fsSL https://install.bithuman.ai | sh` to upgrade; `bithuman --version`
to confirm (`bithuman 2.6.24`). macOS arm64 and Linux
x86_64, built from one commit. **Upgrade if you are on Linux**, whichever model
you run.

- **On Linux, `cli-v2.6.23` could not run an Essence 2 identity at all.** Live
  or `--offscreen`, it stopped about three seconds in with exit **134** and no
  error envelope — the video library bundled in that one tarball had been built
  without HEVC, which is what an Essence 2 identity's own video is encoded in.
  There is no workaround on `2.6.23`; `2.6.24` ships a library that reads it,
  and the build now refuses a video library that cannot open what an identity
  ships, so a tarball with this hole cannot be packed again. **Expression 2
  identities — Wise Pup, and everything `bithuman run` offers by default — and
  every macOS build were unaffected throughout.**
- **The mouth follows the identity's own lip contour.** An identity carrying
  `lip_template.v1.json` now has its mouth drawn within that contour instead of
  the generic elliptical region, the same change the Python wheel got in
  `bithuman` 2.11.4. An identity without the member renders exactly as before.
- **Nothing renamed.** No machine `code`, `--json` key or exit code is added or
  renamed; a script that parsed `2.6.23` parses `2.6.24`, and everything
  `2.6.23` fixed ships unchanged. The engine inside moves to **2.11.4** (ABI 7).

### The mouth follows the identity's own lip contour — `bithuman` 2.11.4 (2026-09-19)

`pip install --upgrade bithuman`. When an Essence 2 avatar carries its lip
contour (`lip_template.v1.json` — the door serves it for most identities today),
the engine now draws the mouth within that contour instead of the generic
elliptical region it used before, so less of the picture around the lips is
redrawn per frame. An avatar without the member renders exactly as 2.11.3
did. The mouth's own texture is unchanged: it stays the identity's own on both
CPU tiers, as 2.11.3 made it. No API change; Python 3.10–3.14 on macOS arm64,
Linux x86_64 and Linux aarch64.

### `bithuman run` with no argument runs Wise Pup, and a Linux offline render is metered — `cli-v2.6.23` (2026-09-19)

`curl -fsSL https://install.bithuman.ai | sh` to upgrade; `bithuman --version`
to confirm (`bithuman 2.6.23`). macOS arm64 and Linux x86_64, built from one
commit.

- **The bare `bithuman run` is `bithuman run wise-pup` now.** On `cli-v2.6.22`
  the first command the binary's own help offers exited 66 `MODEL_NOT_FOUND`:
  it fetched the Wise Pup identity through a second resolver that wrote loose
  members into a *directory* and handed that directory to a loader that wants
  one `.imx` *file*, while `bithuman run wise-pup` worked. The no-argument
  branch now takes exactly the by-name route — one resolver, one cache
  (`~/.cache/bithuman/showcase/`), the same exit code and the same `--json`
  envelope. The divergent resolver is deleted along with the four variables
  only it read: `BITHUMAN_DEFAULT_AVATAR`, `BITHUMAN_DEFAULT_AVATAR_URL`,
  `BITHUMAN_DEFAULT_AVATAR_LEGACY` and `BITHUMAN_DEFAULT_IMX_URL` do nothing
  from this release; `bithuman run <name-or-url>` picks a different identity.
- **On Linux an offline render needs a credential, and is metered.** The
  published 2.6.22 rendered `bithuman run <model> --offscreen` on Linux with
  **no credential** (macOS refused), and — because the Linux render host was
  packed without the module its own meter imports — rendered *unmetered even
  with one*. Both are closed: a credential-less offline render exits **77**
  `METERING_REFUSED` on both platforms (measured on the published Linux tarball,
  fresh `$HOME`: refused before the first frame, nothing written), the host
  beats the meter, and the pixels are unchanged. The Linux build now refuses to
  ship a host that cannot import its meter. [Pricing](/guides/pricing) is the
  authority on what a render costs.
- **`bithuman render` says why the encoder died.** A dead ffmpeg used to
  surface only as *"write frame to ffmpeg: Broken pipe (os error 32) (encoder
  died?)"*. The encoder's exit status — or the signal that killed it — and its
  stderr are now on the same error line.
- **MCP tool refusals carry a code.** A refused tool call answered with a
  prose string and no code. Every refusal now carries the CLI's own error
  envelope — `INVALID_ARGUMENTS`, `NOT_SIGNED_IN`, and the child's own code for
  `render` — so a client can branch on it.
- **Nothing renamed.** No machine `code`, `--json` key or exit code is added or
  renamed; a script that parsed 2.6.22 parses 2.6.23. The engine pin moves to
  `essence1-v3.1.3-e2.26` (bithuman-models `b8252b09d`): the essence-1 engine
  linked is source-identical to 2.6.22's and only its version number moved
  (2.11.1 → 2.11.3); the essence-2 core inside is built from that same commit
  and so carries the mouth fix described in the entry below.

### The mouth is the identity's own again, everywhere — `bithuman` 2.11.3, `essence2-android` 0.5.11 (2026-09-18/19)

One defect, two coordinates, and worth a paragraph because nothing in the output
announced it. When an avatar speaks, the inside of the mouth is meant to come
from the identity's own recording. On the affected releases part of it was
generated instead — on every frame — and the render's own quality counter read
clean throughout, because that counter grades whole frames and the effect was
partial on every one of them. The fix removes the generated part entirely.

- **Python SDK — `bithuman` 2.11.3.** `pip install --upgrade bithuman`. Fixed on
  both CPU tiers, including the default one. The same release stops the offline
  renderer unpacking ~432 MB per renderer that the engine already reads without
  it — **and that unpacking was changing your picture**, because it re-encoded a
  frame the renderer then preferred over the original. Renders now use the
  original. No API change.
- **Android — `ai.bithuman:essence2-android:0.5.11`.** Measured on a handset
  across the same 62 frames as the release before it: the generated share of the
  mouth went from **0.1107 mean / 0.8371 max to 0.000000 / 0.000000**. No Kotlin
  or Java surface change — bump the coordinate and rebuild.

### A warm `bithuman run` stops re-downloading the avatar it already has — `cli-v2.6.22` (2026-09-17)

- The CLI now checks the avatar files already on disk — by declared length, then
  by digest — and fetches only what is missing or wrong, so a warm launch starts
  sooner.
- Anything short, corrupt or undeclared still gets a full fetch. Upgrade the CLI
  to pick it up.

### Every frame of a reply survives a barge-in — `essence2-android` 0.5.10 (2026-09-16)

- An interruption no longer cuts the picture back to the first frame of the
  source video; it carries on from the current frame.
- No Kotlin API change — bump the coordinate. `0.5.9` and earlier are
  superseded.

### An interruption rides on the current frame — Swift SDK 2.13.7 / `Essence2` engine 1.8.0 (2026-09-16)

- The same barge-in fix as `essence2-android` 0.5.10: an interruption holds the
  current frame instead of cutting back to the top of the source video.
- Ships Essence 2 engine 1.8.0 and Expression 2 engine 2.6.3. No Swift API
  change; `from:` resolves it.

### The warp prior reaches Android — `essence2-android` 0.5.9 (2026-09-16)

- `0.5.8` plus one picture-quality change that missed that release. No Kotlin
  API change.
- Superseded the same evening — upgrade straight to `0.5.10`.

### `bithuman run` on an Expression 2 identity opens a real conversation — `cli-v2.6.21` (2026-09-16)

- `bithuman run` on an Expression 2 avatar now joins a live room the way
  `essence-1` does: video and audio, your microphone, and replies you can
  interrupt. Before, it showed a silent preview page.
- `--offscreen` and the cloud handoff are unchanged.

### The avatar's source video plays in place, and long audio stops being cut short — Swift SDK 2.13.6 / `Essence2` engine 1.7.0 (2026-09-16)

- **Long audio is no longer cut short.** Driving long audio through Essence 2 in
  one call returned too few frames while reporting success; engine 1.7.0 returns
  every frame. Shorter clips are unaffected.
- The source video is decoded a frame ahead instead of loaded into memory (much
  less memory on a 1080p identity), and the idle animation plays whole.
- No Swift API change; `from:` resolves it.

### Every frame of a reply comes out, and the driver video plays in place — `essence2-android` 0.5.8 (2026-09-16)

- **Every frame of a reply comes out**, even when your app feeds audio faster
  than real time — 0.5.7 played the end of a reply under a frozen frame. Feed
  audio as it arrives; no code change.
- The driver video is decoded in place by the hardware decoder rather than
  expanded into memory, using far less memory.
- No Kotlin API change; `0.5.7` and earlier are superseded.

### The idle clip plays whole, decoded in place — `expression2-android` 0.4.7 (2026-09-16)

- The idle clip plays from its first frame to its last and wraps at its end,
  decoded in place with `MediaCodec`.
- **Breaking:** `Expression2Avatar.idleLoop` is no longer a `List<Bitmap>`. Use
  `Expression2IdleLoop` — `next(bitmap)` draws the next frame into your bitmap
  and reports the wrap.

### `pip install bithuman` resolves 2.11.0 — the 3.x line is withdrawn from PyPI, and a `bithuman<3` pin gets the same engine (2026-09-16)

- PyPI serves `bithuman` 2.11.0 to every resolver — unpinned, `bithuman<3`, and
  `livekit-plugins-bithuman`. The 3.x releases were deleted; a pin on any of
  them no longer resolves.
- 2.11.0 is the 3.x engine with the whole 2.x import surface (`AsyncBithuman`,
  `Bithuman`, …) beside `open()` / `render()`. `Avatar` is what `open()`
  returns; the 2.x synchronous class is `Bithuman`. See
  [the Python reference](/sdk/python-api).

### The idle clip plays whole, decoded in place, on iPhone and Mac — Swift SDK 2.13.5 / `Expression2` 2.6.3 (2026-09-16)

- The idle clip plays whole, decoded in place by the hardware decoder, and
  wraps at the file's own end.
- **Breaking:** `idleLoop` is removed. Use `idleNextPixelBuffer()` or
  `idle(into:)`; `idleFrameCount`, `idleIndex`, `idleWraps` and
  `idleUnavailableReason` report the loop's state.
- `BithumanEngineProtocol` drops `idleLoop` and gains `idleNextPixelBuffer()`,
  defaulting to `nil`.

### An utterance is exactly as long as its audio, and every frame says where it belongs — Swift SDK 2.13.4 / `Expression2` 2.6.2 (2026-09-16)

- An utterance delivers exactly the frames its audio covers — no extra tail.
  `pullPos()` returns `(frame, speech, isSpeech, pos)`, where `pos` is the
  frame's audio position in 16 kHz samples.
- When your app stops pulling, the engine waits instead of discarding frames.
- `isSpeech` is per-frame voice activity; `speech` keeps its legacy meaning.

### The idle clip is an SDK member, the tail is 0, and `isSpeech` means one thing — `expression2-android` 0.4.6 (2026-09-16)

- New `Expression2Avatar.idleLoop`: the identity's own idle clip (a
  `List<Bitmap>` here; 0.4.7 changes its type).
- A segment delivers exactly the frames its audio covers — no extra tail.
- `Expression2Frame.isSpeech` is per-frame voice activity, defined as on Apple;
  `audioSample` is the frame's 16 kHz position.

### Renders longer than 48 seconds — `bithuman` 3.1.10 (2026-09-15)

- Essence 2 renders are no longer capped at 48 seconds; longer audio renders
  instead of being refused. Renders under the old limit are unchanged.
- No public API change — see [the Python reference](/sdk/python-api).

### `BITHUMAN_UNMETERED` is gone from the Android SDK, and a frame-source constructor loses an argument — `essence2-android` 0.5.7 (2026-09-15)

- The unmetered development variable is removed: no shipping surface has an
  environment variable that renders free. See [pricing](/guides/pricing).
- **Breaking:** the `ElevateFrames` constructor (legacy `ai.bithuman.elevate` package, kept for compatibility)
  no longer takes the execution-provider string — it is now
  `(String, String, int, boolean)`. Delete that argument.

### Every render path needs a credential, on both platforms — `cli-v2.6.20` (2026-09-14)

- **`bithuman run` now refuses without a credential on Linux too** — exit 77,
  `METERING_REFUSED`, before any frame. `bithuman render` still exits 77
  `NOT_SIGNED_IN`. Run `bithuman login` or set `BITHUMAN_API_SECRET`.
- The CLI ignores `BITHUMAN_UNMETERED=1`.
- `--host 0.0.0.0` exits 2 (`PUBLIC_BIND_REFUSED`) unless you pass
  `--allow-public-bind`; an unparseable `--host` exits 2 (`BAD_HOST`).

### `bithuman render` needs a credential, and on macOS so does `bithuman run` — `cli-v2.6.19` (2026-09-14)

- **Every `bithuman render` needs a credential** — without one it exits 77
  `NOT_SIGNED_IN`. On macOS `bithuman run` refuses the same way (Linux followed
  in 2.6.20). `bithuman login` (or `--device` over SSH) gets a free key.
- **Breaking:** `bithuman auth …` is removed — use `login`, `logout` and
  `whoami`, and `bithuman token` in place of `auth token`.
- `init` outside a terminal exits 2 (`INTERACTIVE_ONLY`) instead of 64; Ctrl-C
  is 130. `--json` errors carry a `hint`.

### `bithuman` 3.1.8: on a Mac, Expression 2 stops waiting at the end of each utterance (2026-09-14)

- On macOS the last frames of an utterance arrive as soon as they are ready
  instead of after a fixed pause. Output is unchanged; Linux is unchanged.

### Expression 2 renders much faster on a Mac, and every frame is what 2.6.17 produced — `cli-v2.6.18` (2026-09-14)

- On macOS the end of a render no longer waits on fixed timers. Output is
  unchanged and Linux is unchanged — a drop-in upgrade. Rates are on the
  [performance page](/performance).

### `bithuman` 3.1.7: Expression 2 on a Mac renders on the same CoreML engine as the macOS CLI (2026-09-14)

- On macOS, Expression 2 renders on the same CoreML host and engine as the
  macOS CLI; nothing you call changes. Linux is unchanged.
- An avatar packed without the Apple Silicon decoder now says so and renders on
  the CPU.

### Expression 2 renders faster on a Mac, and every frame is what 2.6.16 produced — `cli-v2.6.17` (2026-09-14)

- On Apple Silicon an Expression 2 render now overlaps producing, finishing and
  encoding its frames. Output is unchanged and Linux is unchanged — a drop-in
  upgrade.

### `bithuman` 3.1.6: Essence 2 uses more of your machine's cores (2026-09-14)

- Essence 2's thread setting now reaches the main render stage; the default is
  the smaller of your core count and 16. The thread count never changes a frame.
- On a Mac, if you got 3.1.5 while the Mac wheels were still publishing, run
  `pip install --upgrade bithuman`.

### Essence 2 renders faster again on Linux, and every frame is what 2.6.15 produced — `cli-v2.6.16` (2026-09-14)

- On Linux, building each output frame is spread across the renderer's threads.
  Output is unchanged and macOS is unchanged — a drop-in upgrade.

### Essence 2 on Android delivers frames sooner, and a model file that changed is picked up — `essence2-android` 0.5.6 (2026-09-14)

- Rendering uses the phone's GPU alongside its CPU, so frames arrive sooner
  (unchanged in content), and an interruption stops the avatar immediately.
- `Essence2ModelStore.fetch()` now installs a changed model file on the next
  session and keeps the verified copy when offline. New types:
  `Essence2ModelStore.Revalidated` and `MemberChanged`.
- Code written against 0.5.5 compiles unchanged.

### Essence 2 renders faster on Linux, and Linux video encoding costs far less processor time — `cli-v2.6.15` (2026-09-14)

- On Linux, Essence 2 frame assembly uses more cores, and `bithuman render`
  encodes with the bitHuman cloud's settings: far less CPU time, the same or a
  better picture, somewhat larger files.
- macOS is unchanged. Rates are on the [performance page](/performance).

### Essence 2's audio step does less work on iPhone and Mac — Swift SDK 2.13.3 (2026-09-14)

- Ships Essence 2 engine 1.6.3, whose audio step computes only the part of each
  audio window the renderer reads — faster on iPhone.
- Nothing else in the package changes; `from:` resolves it.

### Essence 2 on Android is fast at its default settings — `essence2-android` 0.5.5 (2026-09-13)

- The defaults are now the fast settings: a corrected thread default, and output
  frames assembled on the GPU of Snapdragon (Adreno) handsets.
- From 0.5.3, change the version and nothing else. There is no 0.5.4.

### `bithuman` 3.1.5: Essence 2's audio step does less work, and a render that stops early raises (2026-09-13)

- Essence 2's audio step computes only what the renderer reads; frames are
  unchanged. The new audio files are fetched once, on first use.
- `avatar.render(...)` raises `Failed` when a render delivers fewer frames than
  its audio calls for, instead of returning a short video.
- If you pinned 3.1.4, move the pin.

### `bithuman render` on a Mac compresses video on the Mac's own hardware encoder — `cli-v2.6.14` (2026-09-13)

- On macOS, `bithuman render` encodes on the hardware video encoder: faster, and
  the Mac stays usable. Without that encoder you get the CPU encoder;
  `BITHUMAN_FORCE_X264=1` pins it.
- Linux is unchanged. Known issue: two macOS renders of the same input can
  differ slightly in pixel values.

### Essence 2's audio step does less than half the work — upgrade to `cli-v2.6.13` (2026-09-13)

- Essence 2's audio step runs only over the part of each window the renderer
  reads; delivered frames are identical.
- **Upgrade from any earlier 2.6.x:** 2.6.13 replaces stale audio files already
  on your machine on the first render, so the speed-up reaches you. Nothing to
  configure.
- Known issue: two macOS renders of the same input can differ slightly in pixel
  values.

### `bithuman render --json` reports its own steady-state rate (2026-09-13)

- `cli-v2.6.9`: `render --json` adds `render_fps`, measured from the first audio
  pushed to the last frame delivered, excluding start-up. `fps` still means the
  output video's frame rate; both are `null` when unmeasurable.

### The Apple tier's force slugs are `essence-2-apple` and `expression-2-apple` (2026-09-13)

- The `?model=` slugs that pin the cloud's Apple tier are now `essence-2-apple`
  and `expression-2-apple`. The older `essence-2-ane` and `expression-2-ane`
  stay accepted, so saved links keep working. See
  [tier pinning](/concepts/models#advanced-pin-a-serving-tier).

### `bithuman render` is about 1.5x faster on Apple Silicon and 1.3x on Linux (2026-09-12)

- `cli-v2.6.8`: `render` now opens an avatar on the same render model as `run`,
  so it is faster with the same output. `cli-v2.6.7` was never published.
- Your first render is slower, once: it fetches the shared audio model and
  builds the accelerator's cache.
- `bithuman render` still refuses `essence-1` avatars.

### The CLI's Essence 2 engine is BUILT again, and its ffmpeg libraries travel with it (2026-09-11)

- `cli-v2.6.7` was withdrawn before publishing; these fixes ship in
  `cli-v2.6.8`.
- The engine core is built from source again, so an offline `essence-2` render
  is much faster.
- The Linux tarball bundles the ffmpeg libraries its engine needs, so
  `essence-2` renders without a system ffmpeg 7 instead of exiting 69.

### A free avatar by CODE, a clip that is in sync, and an Android default that is fast (2026-09-11)

- `cli-v2.6.6`: `bithuman pull <CODE>` fetches any gallery avatar with no
  account, and an avatar file you downloaded yourself renders on Linux.
- `bithuman render` no longer adds warm-up frames before the first spoken frame.
  If you shifted audio to compensate, undo it. `render --json` adds
  `lead_in_frames_dropped`.
- `expression2-android:0.4.1`: a bare `Expression2Options()` uses the
  accelerator. Also released: `essence2-android:0.5.2`, `bithuman` 3.1.2.

### Android — the Kotlin example is a whole project, and essence-1 `2.3.6` cannot authenticate on a phone (2026-09-09)

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) is a
  complete project; the `ANDROID_HOME` and JDK 17 steps are in the Android
  install section.
- `ai.bithuman:sdk:2.3.6` (essence-1) cannot authenticate on a device (an SSL
  certificate error with no app-side workaround). Use expression-2 on Android.

### CLI `2.6.4` — a rejected key gets 300 seconds, then the session stops (2026-09-07)

- A key the service rejects (HTTP 401, 402 or 403) keeps rendering for 300
  seconds behind a countdown; still rejected then, the session stops (`render`
  exits 77 `METERING_REFUSED`). An unreachable service never stops a render.
- Billing is unchanged. The same rule applies to the Python package (3.0.4) and
  the Apple engine.

### Apple engine `essence2-v1.4.0` / Swift package `2.10.0` — the same 300-second rule (2026-09-07)

- A rejected key renders for 300 seconds of grace; after that
  `be_essence2_pull_frame` and `be_essence2_idle_frame` return `-3`. An
  unreachable meter never stops a render. Billing is unchanged. See
  [the Swift page](/sdk/apple#install).

### CLI `2.6.3` — a live self-hosted session is billed on wall-clock (2026-09-07)

- A live self-hosted `bithuman run` session bills wall-clock time; 2.6.2
  under-counted a preview that ran below its nominal frame rate. `render` bills
  the clip it writes; `pull` is free. See [pricing](/guides/pricing).
- The live preview paces on an absolute clock and no longer adds delay of its
  own.

### CLI `2.6.2` — self-hosted sessions on macOS are metered, and the help tells the truth (2026-09-07)

- Self-hosted essence-2 and expression-2 sessions are metered at the
  self-hosted rate on macOS and Linux ([pricing](/guides/pricing)).
  `BITHUMAN_METER_ENFORCE=1` refuses a missing, rejected or depleted key.
- `bithuman run --help` now says correctly where a model renders, and
  `bithuman doctor` on macOS no longer tells you to pip-install the CLI — the
  first `bithuman run` sets up the conversation worker.

### CLI `2.6.1` — essence-2 renders locally, on Linux and on macOS (2026-09-07)

- The essence-2 runtime ships inside the CLI: `bithuman pull <AGENT_CODE> --model essence-2`,
  then `bithuman render` or `bithuman run` on the `.imx`.
- The shared audio encoder downloads once, on the first essence-2 render; the
  first play needs sign-in.
- An incomplete essence-2 file is refused with exit 69 and no output.

### essence-2 reaches Apple and Android as public coordinates, and the CLI moves to 2.6.0 (2026-09-07)

- **Apple:** Swift SDK `v2.8.0` adds the `Essence2` product on engine
  `essence2-v1.2.0` — pin `from: "2.8.0"`.
- **Android:** use `ai.bithuman:essence2-android:0.5.1` — metered, with the
  300-second grace for a rejected key. Do not use `0.2.0` through `0.5.0`.
- **CLI `cli-v2.6.0`** and **Python `bithuman` 3.0.0** (a breaking API reset;
  the offline extra is `bithuman[offline]`). See [Python SDK](/sdk/python#troubleshooting).

### Swift SDK `2.6.0` — Expression 2 can be handed a model (2026-09-06)

- New: `Expression2Engine.create(modelPath:sharedEngineDir:warmSpeech:)`,
  `create(avatarContainer:…)` for the `.avatar` that
  [the model download](/api/agents#download-an-agents-model) returns, and
  `Expression2Container`. Additive — pin `from: "2.6.0"`.
- The `Expression2` product now brings three binary targets, including
  `UnifiedModelHeader.xcframework`. Depend on the product, not on individual
  targets.

### expression-2 Android is `0.3.1`, and `google()` is no longer required (2026-09-04)

- `ai.bithuman:expression2-android:0.3.1` resolves from `mavenCentral()` alone;
  a build pinned to `0.3.0` still needs `google()`. The engine is unchanged.
- Still `arm64-v8a` only: use a physical arm64 device or an `arm64-v8a` system
  image.

### Essence 2's head upsample reaches the Android path, and the phone figure is measured (2026-09-03)

- Correction to the 2026-09-02 entry: that rebuild reached only the batched
  renderer graph, which Android does not run. The single-frame graph Android
  uses was rebuilt on 2026-09-03, on one identity so far.
- Essence 2 still does not render in real time on a flagship phone. See
  [Performance](/performance).

### essence-2 lands on Maven Central — both families now have a public Android SDK (2026-09-03)

- `ai.bithuman:essence2-android:0.2.0` is on Maven Central (minSdk 29,
  arm64-v8a), so every Android model has a coordinate.
- It shipped knowingly below the parity and sustained-throughput bar.
- It links FFmpeg statically; the relink materials are on
  [FFmpeg / LGPL](/legal/android-ffmpeg-lgpl).

### CLI `2.5.1` — macOS and Linux back on one version (2026-09-03)

- `cli-v2.5.1` ships macOS arm64 and Linux x86_64 again: drop any
  `BITHUMAN_VERSION=cli-v2.4.2` pin on Linux. `pull --model` works on Linux too.
- Intel Mac and Linux ARM builds are not published.
- `bithuman render` in this release works for expression-2 only (essence-2
  exits 69, essence-1 exits 70).

### CLI `2.5.0` — `bithuman pull --model`, and the first signed macOS tarball (2026-09-02)

- `bithuman pull <CODE> --model <FAMILY>` downloads a specific model family;
  without it, `pull` names the families it did not fetch (`--json` adds
  `other_models` and `model_source`). `--model` on a showcase slug exits 66.
- The first Developer ID signed and notarized macOS tarball; macOS only (Linux
  followed in 2.5.1).

### Expression 2 self-hosting on Linux is fail-open, by owner ruling (2026-09-02)

- The Linux engine in CLI 2.5.1 renders expression-2 with no credential, behind
  a `★ UNMETERED RENDER` banner; the meter still runs where a credential exists.
  Treat it as a grace period — enforcement is expected to return.
- essence-2 stays fail-closed: no credential raises `MeteringNotArmedError`.

### Essence 2's head upsample is rebuilt — a CPU-tier speedup, same picture (2026-09-02)

- An internal change to Essence 2's head-upsampling step: faster on the CPU
  tier, no gain on GPU or Apple, the same picture. API, tiers and price are
  unchanged.
- It rolls out per identity as each bundle is rebuilt. See
  [the renderer](/concepts/essence-2#what-it-is).

### The "Apple Neural Engine" tier is renamed **Apple**, and a false performance claim is withdrawn (2026-09-02)

- Essence 2's cloud "Apple Neural Engine" tier is now called **Apple**: it runs
  through CoreML on the Mac's GPU. The throughput figure attributed to the
  Neural Engine is withdrawn, with no replacement.
- Nothing you write changes — `essence-2-ane`, `expression-2-ane` and saved
  links keep working. See [Serving tiers](/concepts/essence-2#serving-tiers).

### Linux wheels restored for `bithuman` 2.10.0 (2026-09-02)

- All Linux wheels for 2.10.0 are on PyPI. Between 2026-09-01 and 2026-09-02 a
  Linux install silently got 2.9.0 — if you installed then, run
  `pip install -U bithuman`.

## August 2026

### `409 MODEL_NOT_GENERATED` now tells you how to fix it (2026-08-17)

- Every `409 MODEL_NOT_GENERATED` now names the remedy: the
  [model-add](/api/agents#add-a-model-to-an-existing-agent) call and its cost,
  or the missing asset. Only the message changed.
- Any agent with an image and a voice can enable `expression-1` with one free,
  instant call.

### Essence 2 self-hosted — offline CPU rendering ships in Python SDK 2.9.0 (2026-08-02)

- Python SDK 2.9.0 (Linux) renders a downloaded `essence-2` model to frames or
  an mp4 on your own CPU, via the `bithuman[tessera]` extra.
- It needs a valid `BITHUMAN_API_SECRET` and bills at the self-hosted rate;
  with no key it renders nothing. Live streaming still runs through the cloud.
  See [Python SDK](/sdk/python).

Earlier entries — July 2026 back to January 2026 — are on the [changelog archive](/changelog/archive).

> **Note** Feature requests and bugs: [GitHub](https://github.com/bithuman-product/homebrew-bithuman/issues) and [Discord](https://discord.gg/ES953n7bPA). See the full [community guide](/community).

