---
title: "Changelog"
description: "Release notes and version history for the bitHuman platform."
section: resources
group: "Resources"
order: 1
---

> **Note** Product-level changes only. For per-version notes, see the [Python SDK release history](https://pypi.org/project/bithuman/#history) and the [SDK releases](https://github.com/bithuman-product/homebrew-bithuman/releases). Entries from July 2026 and earlier are on the [changelog archive](/changelog/archive).

## September 2026

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

Also corrected on [iOS SDK](/sdk/ios#authentication) while measuring this:
Essence 2 **needs a key** to start a session. It reads `BITHUMAN_API_SECRET`
(not `BITHUMAN_API_KEY`); with no key, or a rejected one, `be_essence2_create`
returns `-3` and says why. A sandboxed Mac app also needs **Outgoing
Connections (Client)**, or the key check cannot reach the service.

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

`curl -fsSL https://install.bithuman.ai | sh` to upgrade; `bithuman --version`
to confirm.

Every launch re-fetched every piece of the identity and wrote it over the
byte-identical file already on disk — warm or cold. The CLI now checks what is
already there, by declared length and then by digest, and fetches only what is
missing or wrong. Measured on the default identity on Linux:

| | bytes moved | stage wall |
|---|---|---|
| before, every launch | 76,239,355 B | 1.09–1.33 s |
| after, warm launch | 12,620,302 B | 0.30–0.38 s |

**−83.4% of the transfer, 3.6x off the line** — and strictly *more* checking than
before, because the old path never read what was on disk, it assumed the
overwrite. Anything short, long, corrupt or undeclared still falls through to a
full fetch.

### Every frame of a reply survives a barge-in — `essence2-android` 0.5.10 (2026-09-16)

`ai.bithuman:essence2-android:0.5.10` on Maven Central. No Kotlin surface change —
`api/essence2-android.api` is byte-identical to `0.5.9` — so nothing in your code
moves. **Read this if your users interrupt the avatar.**

- **An interruption no longer rewinds the driver video to its first frame.**
  Interrupting purges the frame ring by design, and the empty ring used to be
  filled with the identity's frame 0 — so every barge-in cut back to the top of
  the source video for about 150 ms, and up to ~1 s at the start of an utterance.
  The picture now rides on the frame it already has and keeps playing forward.
- **`0.5.9` and earlier stay on Central** and are superseded.

### An interruption rides on the current frame — Swift SDK 2.13.7 / `Essence2` engine 1.8.0 (2026-09-16)

Package tag **2.13.7** on the [SwiftPM package](https://github.com/bithuman-product/homebrew-bithuman);
it ships Essence 2 engine **1.8.0** and Expression 2 engine **2.6.3**. No Swift
surface change — `from:` resolves it and nothing in your code moves. Tags
**2.13.6** and earlier stay published and keep resolving to the engine versions
they always did.

- **The same barge-in fix as `essence2-android` 0.5.10, on Apple.** Interrupting
  purges the frame ring, and the engine used to fill the empty ring with the
  identity's frame 0 — a visible cut back to the top of the source video on every
  interruption. 1.8.0 holds the frame it already delivered and continues forward.
- **Not claimed:** no iPhone or Mac run was made for this engine release. The
  change was verified by reading the published slices themselves, on all three
  (`macos-arm64`, `ios-arm64`, `ios-arm64-simulator`), against the same read of
  1.7.0.

### The warp prior reaches Android — `essence2-android` 0.5.9 (2026-09-16)

`ai.bithuman:essence2-android:0.5.9` on Maven Central. No Kotlin surface change.
Superseded by `0.5.10` the same evening; upgrade straight to `0.5.10`.

- **The picture-quality work that missed the `0.5.8` press by three and a half
  hours.** `0.5.8` shipped without it; `0.5.9` is `0.5.8` plus that change and
  nothing else.

### `bithuman run` on an Expression 2 identity opens a real conversation — `cli-v2.6.21` (2026-09-16)

CLI `cli-v2.6.21`, macOS arm64 and Linux x86_64 built from one commit. **Read this
if you have ever run `bithuman run` on an Expression 2 agent.**

- **It was a silent picture; it is a session now.** Until this release `run` stood
  up a live conversation only for an `essence-1` `.imx` — and `bithuman list`
  returns no essence-1 models, so the local path this site described could not be
  walked with any avatar you can actually obtain. An Expression 2 `run` went
  somewhere else entirely: a page on localhost showing the avatar fed one
  hardcoded silent sample, with no microphone and no way to interrupt.
- **It joins a room the way `essence-1` does.** The session publishes video *and*
  audio, takes your microphone, answers, and can be interrupted, because the reply
  is a live track rather than a rendered file.
- **Nothing that worked before refuses now.** `--offscreen` still gives the
  deterministic benchmark, unchanged, and if the render host is not installed
  beside the binary the cloud handoff is unchanged.

### The avatar's source video plays in place, and long audio stops being cut short — Swift SDK 2.13.6 / `Essence2` engine 1.7.0 (2026-09-16)

Package tag **2.13.6** on the [SwiftPM package](https://github.com/bithuman-product/homebrew-bithuman);
it ships Essence 2 engine **1.7.0**. No Swift surface change — `from:` resolves it and
nothing in your code moves. Tags **2.13.3** and earlier stay published and keep resolving
to the engine versions they always did.

- **Long audio stops being cut short, and this is the one to read.** Driving 75 seconds of
  audio through Essence 2 in one call previously returned **1209 of the 1875 frames** the
  audio entitles you to — **and returned success while doing it**. If you were driving long
  audio in a single call, you were losing the end of it with nothing to tell you. 1.7.0
  returns **1885**: every frame, plus the short tail the engine has always added. Shorter
  clips are unaffected and return exactly the frame counts they did before.
- **About 1.5 GB less memory on a 1080p identity.** Earlier releases expanded the
  identity's whole source video into memory before the avatar could speak, and drew the
  face onto that copy. 1.7.0 decodes one frame ahead of what it is drawing and draws onto
  the decoded frame directly, in idle and in speech. Measured against the copy previous
  releases drew onto, the result reads 45 dB PSNR — the difference is not visible, and it
  was reviewed on a side-by-side before it shipped.
- **The idle animation plays whole.** It runs from the first frame to the last and wraps
  only at the authored end, where the clip is designed to be seamless, instead of cutting
  early.
- **A frame-buffer correctness fix.** A buffer could hand a reader the slot still being
  written — a torn frame carrying a valid label, about one walk in ten thousand where two
  readers are active. Apple's path has a single reader and could not reach it; fixed anyway.

The measured iPhone 15 rate is on the [performance page](/sdk/performance); it did not
regress with the memory saving.

### Every frame of a reply comes out, and the driver video plays in place — `essence2-android` 0.5.8 (2026-09-16)

`ai.bithuman:essence2-android:0.5.8` on Maven Central. No Kotlin surface change;
`0.5.7` and earlier stay on Central and are superseded. **Read this if your app
feeds audio faster than real time, or if it has ever run 0.5.7 on the same device.**

- **Every frame of a reply comes out.** In 0.5.7 the motion frontier advanced only
  behind `feed()` / `endOfAudio()`, one block per call: an app that pushed more
  than 320 ms of audio per call fell behind its own audio by the difference, and
  after `endOfAudio` exactly one more block ever came out. Measured on a Galaxy
  S25+ through an un-paced transport, 0.5.7 delivered **72–77 % of every reply's
  frames** — the rest of the audio played under a frozen last frame. 0.5.8 extends
  the frontier on a thread of the SDK's own, woken by a feed and by a pull that
  finds the queue low; the same handset and script deliver **1828 of 1827 expected
  frames** over 8 replies, hold 0, stale 0, speaker under-runs 0. Nothing to change
  in your code; feed as the audio arrives.
- **The driver video plays in place — resident memory 2969 → 1613 MB on the same
  identity.** 0.5.7 expanded `target_frames.mp4` to 251 JPEG files at the first
  session and decoded the whole clip into memory at every open (1.56 GB for a 1080p
  identity). 0.5.8 plays it through a decode cursor — the phone's hardware H.264
  decoder (`MediaCodec`) one frame ahead of the paste — and writes nothing into the
  bundle directory. The principle every bitHuman surface now follows: play video in
  place rather than loading it into memory.
- **A device that ran 0.5.7 keeps its JPEG files, and 0.5.8 walks them; a fresh
  install decodes the mp4.** Both are correct. On the mp4 path the first frame of a
  reply arrives a little later and less evenly than on the JPEG path (same script,
  same handset: time-to-first-audio +26 to +284 ms across takes, up to 12 stale
  frames and 2 speaker under-runs per take against 0 / 0) — the reply's first block
  waits on a seek to the clip's keyframe and the decoder's warm-up. The next
  release pre-seeks that block when an utterance opens.
- **The picture moves by one lossy generation.** The paste now lands on the decoded
  frame itself rather than on 0.5.7's JPEG re-encode of it: 45 dB PSNR against the
  old canvas on the region the paste leaves untouched; the mouth region is unchanged.
- **A torn-frame race in the driver cursor is fixed before it shipped.** Two
  consumers reading the cursor 13 frames apart could receive a frame the decoder
  was still writing, under the right label, about once in 10,000 reads. No published
  Android artifact carried it (0.5.7 has no cursor); 0.5.8 does not either.

### The idle clip plays whole, decoded in place — `expression2-android` 0.4.7 (2026-09-16)

`ai.bithuman:expression2-android:0.4.7` on Maven Central. **Read this before
upgrading if your app reads `Expression2Avatar.idleLoop`.**

- **The idle clip plays from its first frame to its last and wraps there.** 0.4.6
  held the clip's first 48 frames as a `List<Bitmap>` and wrapped at 2.4 s — a cut
  the clip's author never made. 0.4.7 decodes the clip in place with `MediaCodec`,
  one frame at a time, and wraps where the file ends; resident memory is independent
  of the clip's length.
- **`idleLoop` changes type.** It is no longer a `List<Bitmap>`; take
  `Expression2IdleLoop` (`next(bitmap)` draws the next frame into your bitmap and
  reports the wrap). Code that indexed the old list does not compile against 0.4.7.
- **`0.4.6` and earlier stay on Central** and are superseded, not withdrawn.

### `pip install bithuman` resolves 2.11.0 — the 3.x line is withdrawn from PyPI, and a `bithuman<3` pin gets the same engine (2026-09-16)

`bithuman` **2.11.0** is what PyPI serves now, to every resolver: an unconstrained
`pip install bithuman`, a `bithuman<3` pin, and `pip install livekit-plugins-bithuman`
(whose own pin is `bithuman<3,>=0.5.25`) all resolve it, on Python 3.11, 3.12 and 3.13
from a fresh environment, and `pip check` is clean on each. The 3.x releases
(3.0.0 through 3.1.10) were deleted from PyPI on 2026-09-16; a pin on any of them no
longer resolves.

**Why the number goes backwards.** 3.0.0 cut the exported surface from 32 names to 7 and
announced the break with a major bump — so a `bithuman<3` pin never received it, and
resolved 2.3.4 instead: an old engine, but a working one. 2.11.0 is the 3.x engine
(every native half byte-identical to 3.1.10's, on all three platforms) published where
that pin can reach it, **with the whole 2.x import surface carried alongside**: every name
the published 2.10.0 wheel exported — `AsyncBithuman`, `Bithuman`, `AsyncAvatar`,
`AudioChunk`, `VideoControl`, `VideoFrame`, `Emotion`, the 2.x exception kinds and the
rest — imports and works, at package level, next to the `open()` / `render()` surface
[the Python reference](/sdk/python-api) documents. Nothing is a stub: `AsyncBithuman` is
the streaming class our own serving binds to.

One name changed meaning and is said out loud: `Avatar` is what `open()` returns
(`.render()`), as in 3.x; the 2.x synchronous class stays reachable as `Bithuman`, and
`bithuman.Avatar.load(...)` raises rather than pretending. The default picture is the 2.x
one again — `AsyncBithuman` yields 1280x720 unless told otherwise — and Essence 2 opens on
the streaming class too.

[The Python reference](/sdk/python-api) is regenerated from the 2.11.0 wheel. This is the
Python library; the CLI, the Apple and Android SDKs and the browser build ship their own
engine and are not covered by this note.

### The idle clip plays whole, decoded in place, on iPhone and Mac — Swift SDK 2.13.5 / `Expression2` 2.6.3 (2026-09-16)

Package tag **2.13.5** on the [SwiftPM package](https://github.com/bithuman-product/homebrew-bithuman);
`from:` resolves it. It ships the `Expression2` engine at **2.6.3**. **Read this before
upgrading if your app reads `engine.idleLoop`.**

- **The idle clip plays from its first frame to its last and wraps there.** The
  identity's `idle.mp4` is a 10 s, 200-frame loop authored so that its last frame
  leads into its first. 2.6.2 held the first 48 frames and wrapped at 2.4 s — a cut
  the clip's author never made, visible as a jump every few seconds. 2.6.3 plays
  the video in place: one hardware decoder runs a few frames ahead of the display
  and the wrap is the file's own end. The principle is the one every bitHuman surface
  now follows: play video in place rather than loading it into memory — efficient
  compute and efficient memory management, which only requires the right
  implementation. Measured on the published bytes on an M4 Mac: the loop wraps at frame 199 → 0 every
  200 frames with a seam smaller than the step between two ordinary frames, a 60 s
  clip costs the same resident memory as the 10 s one (within 3 MB), and an idle
  frame costs about 0.3 ms.
- **`idleLoop` is gone from the public surface.** `idleLoop: [[UInt8]]` — the list
  that invited the cap — does not exist in 2.6.3; code that reads it does not compile.
  Take `idleNextPixelBuffer()` (the decoder's own `CVPixelBuffer`, no copy — hand it
  to a texture or a sample-buffer layer) or `idle(into:)` (the same frame as BGR bytes).
  `idleFrameCount`, `idleIndex` and `idleWraps` say where the loop is;
  `idleUnavailableReason` says why no clip plays when it does not.
- `pullPos()` is unchanged from 2.6.2: `(frame, speech, isSpeech, pos)`.
- The `BithumanEngineProtocol` product drops its `idleLoop` requirement and gains
  `idleNextPixelBuffer()` with a default of `nil`.

### An utterance is exactly as long as its audio, and every frame says where it belongs — Swift SDK 2.13.4 / `Expression2` 2.6.2 (2026-09-16)

`Expression2` **2.6.2** was the first release since 2.6.0 whose engine bytes moved
(2.6.1 re-hosted 2.6.0's archive byte-for-byte). What changed for an app:

- **Tail 0 and head 0.** A fed utterance is delivered as exactly `round(seconds × 20)`
  frames — no invented frames after the audio ends — and the first frame is the
  first audio frame. `pullPos()` reaches the shipped interface for the first time:
  `(frame, speech, isSpeech, pos)`, where `pos` is the frame's own audio position in
  16 kHz samples, so a presenter pairs a frame with its sound by arithmetic instead of
  by counting.
- **Back-pressure instead of silent discard.** When the app stops pulling, the engine
  parks its producer at 64 queued frames rather than dropping the oldest; the
  shipped 2.6.1 binary destroyed 455 of 565 frames on a paced consumer.
- **`isSpeech`** is per-frame voice activity — this frame's own 40 ms of fed audio
  has energy — with one definition on every platform; `speech` beside it is the
  legacy flag and keeps its old meaning.

### The idle clip is an SDK member, the tail is 0, and `isSpeech` means one thing — `expression2-android` 0.4.6 (2026-09-16)

`ai.bithuman:expression2-android:0.4.6` on Maven Central (`0.4.1` and earlier stay
and are superseded; `0.4.5` was never published).

- **`Expression2Avatar.idleLoop`** — the identity's own idle clip, from the same store
  and manifest as the weights (`idle.mp4`). Read from the published AAR, in 0.4.6 it
  is a `List<Bitmap>` of the clip's first **48** frames (`IDLE_LOOP_FRAMES`) — a cap
  copied from the Apple SDK's old premise, which wraps a 10 s clip at 2.4 s. The
  next release replaces it with a cursor that plays the whole clip in place, decoded
  by `MediaCodec` one frame at a time; that changes the member's type, and the note
  for it will say so.
- **Tail 0**: a segment of *n* fed samples is delivered as `round(n / 800)` frames and
  not one more; before, the last chunk always yielded 21 frames.
- **`Expression2Frame.isSpeech`** is per-frame voice activity with the same
  definition as the Apple SDK's; `audioSample` is the frame's own 16 kHz position.

### Renders longer than 48 seconds — `bithuman` 3.1.10 (2026-09-15)

`bithuman` 3.1.10 on PyPI. Essence 2 had a per-render maximum of 48.0 s / 1200
frames: the positional table has a fixed row count, an utterance has as many
frames as its audio, and the first bounded the second. Longer audio was
refused, with the remedy in the message — split it into parts of 48 s or less.

That bound is gone. Past the table the second half of the rows repeats, and the
first 1200 frames read the table exactly as before, so a render that fit under
the old ceiling is unchanged. Read from the published wheels: the refusal text
appears nowhere in 3.1.10, and `_offline.py` is byte-identical across the macOS
arm64 and Linux x86_64 builds.

**The public API did not change.** Every name, signature and exception on
[the Python reference](/sdk/python-api) is the same as the release before it;
only the behaviour on long audio moved. That page is regenerated from these
bytes.

This is the Python library. The CLI, the Apple and Android SDKs and the browser
build ship their own engine and are not covered by this note.

### `BITHUMAN_UNMETERED` is gone from the Android SDK, and a frame-source constructor loses an argument — `essence2-android` 0.5.7 (2026-09-15)

`ai.bithuman:essence2-android:0.5.7` on Maven Central. **Read this before
upgrading if you construct the frame source yourself.**

- **The unmetered development variable is gone.** Read from the published AAR,
  `BITHUMAN_UNMETERED`, `UNMETERED_ENV` and the unmetered banner appear zero
  times in 0.5.7; the same search finds the variable in 0.5.6, and finds
  `SelfHostMeter` and `MeteringRefused` in both. With the CLI ignoring it from
  2.6.20 and the public Python wheels refusing with or without it, **no shipping
  surface now has an environment variable that renders free** — see
  [pricing](/guides/pricing).
- **`ElevateFrames` takes one argument fewer.** The class sits on the
  `ai.bithuman.elevate` package — a legacy name kept for compatibility, which
  a developer still types. Its constructor was
  `(String, String, int, String, boolean)` in 0.5.6 and is
  `(String, String, int, boolean)` in 0.5.7 — the execution-provider string is
  no longer accepted. Code that passed it will not compile against 0.5.7;
  delete the argument. Nothing on this site taught that parameter.
- **The `0.2.0` through `0.5.6` artifacts stay on Central** and are superseded,
  not withdrawn.

### Every render path needs a credential, on both platforms — `cli-v2.6.20` (2026-09-14)

CLI `cli-v2.6.20`, macOS arm64 and Linux x86_64 built from one commit.
**Read this before upgrading if anything you run renders without signing in.**

- **`bithuman run` now refuses without a credential on Linux too.** It stops
  before serving a frame — exit **77**, `METERING_REFUSED`, in about two
  seconds — where 2.6.19 on Linux rendered indefinitely. macOS behaves as it
  did in 2.6.19. The platforms word it differently and ask for the same two
  things: Linux says *"the render host refused this session: its credential was
  rejected. Run `bithuman login`, or set BITHUMAN_API_SECRET to the account
  this session should be billed to."*; macOS says *"refusing to serve: no
  api-secret is available, so this session cannot be attributed to an account …
  run `bithuman login` or set BITHUMAN_API_SECRET to the API secret of the
  account this session should be billed to."*
- **No environment variable renders for free any more.** The CLI ignores
  `BITHUMAN_UNMETERED=1` completely: with it set, `run` still exits **77** on
  both platforms, and no session prints an unmetered or not-being-billed
  banner. In 2.6.19 it still bought an unmetered Linux `run`. The Python SDK,
  the Docker container and the Swift SDK are unchanged — see
  [pricing](/guides/pricing).
- **`bithuman render` is unchanged** — exit **77**, `NOT_SIGNED_IN`, no output
  file written, on both platforms, as in 2.6.19.
- **`--host 0.0.0.0` is refused unless you say you meant it.** It exits **2**
  with `PUBLIC_BIND_REFUSED` and leaves nothing listening — *"--host 0.0.0.0
  binds every interface, which would expose this session to your whole
  network."* On 2.6.19 the same command bound the wildcard and served.
  `--allow-public-bind` still opts in, and it still binds: with a credential
  and the flag, `run` listens on `0.0.0.0` — checked against the kernel's
  socket table, with the same credential and no flag refusing and listening on
  nothing. The refusal is a gate on one flag, not a blanket ban on exposing a
  session. An unparseable `--host` now exits **2** with `BAD_HOST`, where
  2.6.19 exited 1.
- **`bithuman mcp tools` still lists 28 tools**, and the engine inside is still
  **3.1.8** (ABI 7).

### `bithuman render` needs a credential, and on macOS so does `bithuman run` — `cli-v2.6.19` (2026-09-14)

CLI `cli-v2.6.19`, macOS arm64 and Linux x86_64 built from one commit.
**Read this before upgrading if anything you run renders without signing in.**

- **Every render needs a credential.** A render stops before the first frame
  with exit code **77**, reported as `NOT_SIGNED_IN`, and says *"not signed in,
  or the credential is not valid — run `bithuman login`, or set
  BITHUMAN_API_SECRET"*. That is what you get for all three cases: no
  credential, one this machine cannot use, and one the service rejects. Until
  now a rejected credential kept rendering for 300 seconds behind a countdown,
  and no credential at all rendered while saying it was not charging you.
  Getting a key is free and takes a moment: `bithuman login` opens your
  browser, or `bithuman login --device` prints a code for an SSH session.
- **`bithuman run` refuses on macOS, and is not yet covered on Linux.** Which
  half of the product meters the session differs by platform: the CLI does it
  on macOS arm64, the engine does it on Linux, and this release fixed the CLI
  half only.
  - **macOS.** No credential, or one the service rejects, ends the session in
    a few seconds with exit **77** and `METERING_REFUSED` — *"refusing to
    serve: no api-secret is available, so this session cannot be attributed to
    an account"*, or *"refusing to serve: the API secret was rejected —
    revoked, or from another environment. (401)"*. Nothing is served and no
    output is written.
  - **Linux.** It renders, and with **no credential at all it keeps
    rendering** — *"★ UNMETERED RENDER: no BITHUMAN_API_SECRET is set, so this
    render cannot be attributed to an account. Proceeding anyway — metering is
    FAIL-OPEN"* — with no countdown and no refusal. The 300-second grace
    applies only to a credential the service actively **rejects**: that logs
    *"★ UNMETERED RENDER — CREDENTIAL REJECTED (401) … Rendering continues for
    another 300 s of grace"*, renders through four once-a-minute beats, and on
    the fifth logs *"REFUSED: the credential has been rejected (401) for
    300 s"* — the session then ends and the process exits **70**, not 77.
    Treat a Linux `run` as unenforced until a release says otherwise.
- **`BITHUMAN_UNMETERED=1` is gone wherever the CLI is the meter** — that is
  `render` on both platforms and `run` on macOS, where setting it changes
  nothing. The engine meter that serves `run` on Linux still honours it: that
  session prints *"★ BITHUMAN_UNMETERED is set — THIS RENDER IS NOT BEING
  BILLED. No usage will reach the ledger. This must never be set in
  production."* and renders.
- **An unreachable meter still renders, and is never refused.** If our service
  cannot be reached, the render continues and says so — being unable to ask is
  not the same as being told no. An operator who wants a validated credential
  before any frame sets `BITHUMAN_METER_ENFORCE=1`, which refuses that case too.
- **Downloading is unchanged:** `bithuman pull <slug>` of a showcase avatar
  still needs no account.
- **`bithuman auth …` is gone.** `auth login`, `auth logout` and `auth status`
  duplicated the top-level `login`, `logout` and `whoami` — use those — and
  `auth token` is now **`bithuman token`**. If a script calls `bithuman auth`,
  change it.
- **Failures that returned 64 start returning documented exit codes.** `init`
  outside a terminal returns **2** (`INTERACTIVE_ONLY`); a script matching on
  64 needs updating. **Ctrl-C is now published as 130**, which it always
  returned. *Correction: this entry also named a bad host and a refused public
  bind here. Checked against the published binary, neither changed in 2.6.19 —
  a bad `--host` still exited 1 and `--host 0.0.0.0` still bound the wildcard.
  Both landed in 2.6.20, above.*
- **`--json` errors carry a `hint`** beside the cause when there is a next step.
- **`bithuman mcp tools` lists 28 tools**, adding local `pull` and `render`.
- The engine inside moves to **3.1.8** (ABI 7).

### `bithuman` 3.1.8: on a Mac, Expression 2 stops waiting at the end of each utterance (2026-09-14)

`bithuman` 3.1.8 on PyPI, for Apple Silicon macOS (14 or newer), Linux x86_64
and Linux aarch64 (CPython 3.10–3.14).

- **The last frames of an utterance arrive as soon as they are ready.** The Mac
  wheels carry the render host `cli-v2.6.18` ships, byte for byte, and that host
  no longer waits out a fixed pause before handing over the end of an utterance.
- **The output does not change.** The frames are byte for byte what 3.1.7's host
  delivered, checked frame by frame with a determinism control.
- **Linux is unchanged.**

### Expression 2 renders much faster on a Mac, and every frame is what 2.6.17 produced — `cli-v2.6.18` (2026-09-14)

CLI `cli-v2.6.18`, macOS arm64 and Linux x86_64 built from one commit. **If you
installed 2.6.17, this is a drop-in upgrade** with nothing to change on your
side.

- **The end of a render no longer waits on a timer.** On a Mac the renderer
  paused on fixed timers before handing over the last frames of a render, and
  under load those pauses grew past a second. It now hands them over as soon as
  they are ready. Measured frame rates are on the
  [performance page](/sdk/performance).
- **The output does not change.** With the same avatar and the same audio,
  2.6.17 and 2.6.18 deliver the same frames byte for byte — checked frame by
  frame over a full 28-second clip, with repeated runs of 2.6.17 agreeing with
  each other as the control.
- **Linux renders are unchanged.** The engine inside moves to 3.1.7 (ABI 7);
  `bithuman --version` prints it beside the CLI's own version.

Earlier versions stay resolvable; a `BITHUMAN_VERSION=cli-v2.6.17` pin keeps
working.

### `bithuman` 3.1.7: Expression 2 on a Mac renders on the same CoreML engine as the macOS CLI (2026-09-14)

`bithuman` 3.1.7 on PyPI, for Apple Silicon macOS (14 or newer), Linux x86_64
and Linux aarch64 (CPython 3.10–3.14).

- **On a Mac, Expression 2 renders on the same CoreML host and engine as the
  macOS CLI.** The Mac wheels carry the host `cli-v2.6.17` ships, byte for byte,
  and a clean install renders the quickstart avatar on it: with logging at
  `INFO` the library says *"expression-2 on the CoreML host … the same host and
  engine as the macOS CLI"*. Nothing you call changes. Linux is unchanged.
- **An avatar that cannot use CoreML now says why.** If an avatar was packed
  without the Apple Silicon decoder, the library says so first and renders on
  the CPU instead, where the warning used to end in a cut-off host log.
- **To see which version you have,** run
  `python -c "from importlib.metadata import version; print(version('bithuman'))"`.

### Expression 2 renders faster on a Mac, and every frame is what 2.6.16 produced — `cli-v2.6.17` (2026-09-14)

CLI `cli-v2.6.17`, macOS arm64 and Linux x86_64 built from one commit. **If you
installed 2.6.16, this is a drop-in upgrade** with nothing to change on your
side.

- **On Apple Silicon, an Expression 2 render now overlaps its steps.** For each
  short stretch of video it used to produce the frames, finish them into
  pictures and hand them to the video encoder one after another. The next
  stretch is now produced while the previous one is finished and encoded.
- **The output does not change.** With the same avatar and the same audio,
  2.6.16 and 2.6.17 deliver the same frames byte for byte — checked frame by
  frame over a full 28-second clip, with repeated runs of 2.6.16 agreeing with
  each other as the control.
- **Linux renders are unchanged.** The engine inside moves to 3.1.6 (ABI 7);
  `bithuman --version` prints it beside the CLI's own version.

Earlier versions stay resolvable; a `BITHUMAN_VERSION=cli-v2.6.16` pin keeps
working.

### `bithuman` 3.1.6: Essence 2 uses more of your machine's cores (2026-09-14)

`bithuman` 3.1.6 on PyPI, for Apple Silicon macOS (14 or newer), Linux x86_64
and Linux aarch64 (CPython 3.10–3.14). The Linux wheels published first and the
Mac wheels about half an hour later; if `pip install bithuman` on a Mac gave you
3.1.5 in that window, run `pip install --upgrade bithuman`.

- **Essence 2 uses more of your machine's cores.** The thread count reaches the
  part of the renderer that does most of the work, which until now stayed at
  four whatever you asked for. The default becomes the smaller of your core
  count and 16.
- **The thread count does not change a single frame.** The release was tested
  at four, eight and sixteen threads, and every frame matched.

### Essence 2 renders faster again on Linux, and every frame is what 2.6.15 produced — `cli-v2.6.16` (2026-09-14)

CLI `cli-v2.6.16`, macOS arm64 and Linux x86_64 built from one commit. **If you
installed 2.6.15 in the last hour, this is a drop-in upgrade** with nothing to
change on your side.

- **Building each finished frame now spreads across the threads the renderer
  already had.** It was doing most of that work on one thread while the rest of
  the machine waited. On a 24-thread Intel desktop, building a frame drops from
  about 36 ms to about 26 ms at the old thread count, and from about 29 ms to
  about 17 ms at the thread count 2.6.15 introduced.
- **The output does not change at all.** Every frame is byte-for-byte what
  2.6.15 produced — checked at four thread counts on three avatars, and over a
  200-frame render where ten runs produced one identical result.
- **macOS is unchanged**, and so is the engine inside: `bithuman --version`
  still reports 3.1.5 (ABI 7) beside the CLI's own version.

Earlier versions stay resolvable; a `BITHUMAN_VERSION=cli-v2.6.15` pin keeps
working.

### Essence 2 on Android delivers frames sooner, and a model file that changed is picked up — `essence2-android` 0.5.6 (2026-09-14)

`ai.bithuman:essence2-android:0.5.6` on Maven Central. **Code written against
0.5.5 compiles unchanged** — nothing was removed or re-typed, and the two
additions below are new types you can ignore until you want them.

- **Frames arrive sooner, and the frames themselves are unchanged.** The render
  now uses the phone's GPU alongside its CPU, and a step that ran as several
  operations runs as one. The measured rate on a Galaxy S25+ is on the
  [performance page](/sdk/performance).
- **Interrupting the avatar stops it immediately.** Until now, a barge-in
  delivered one more frame of the sentence it was already speaking.
- **A model file that changes is picked up on the next session.** When
  `Essence2ModelStore.fetch()` finds an identity already on the device, it now
  asks the download service whether any member of it changed: if one has, the
  device installs the new file; if the service cannot be reached, it opens the
  copy it had already verified, so an app with no network keeps working. That
  costs one small request on a cache hit. Two new types report the outcome:
  `Essence2ModelStore.Revalidated` (`UNCHANGED`, `UPDATED`, `KEPT_UNREACHABLE`,
  `KEPT_REFUSED`, `KEPT_FAILED`) and `MemberChanged`.
- `0.2.0` through `0.5.5` stay on Central; `0.5.1` and `0.5.2` cannot install a
  model on a handset. The FFmpeg relink materials for this version are on
  [FFmpeg / LGPL](/legal/android-ffmpeg-lgpl), re-measured on the published
  `0.5.6` artifacts.

### Essence 2 renders faster on Linux, and Linux video encoding costs far less processor time — `cli-v2.6.15` (2026-09-14)

CLI `cli-v2.6.15`, macOS arm64 and Linux x86_64 built from one commit; it is
what Homebrew and the universal installer give you. Both changes are on Linux,
and the picture is the same.

- **An Essence 2 render on Linux is about 1.5x faster.** The frame-assembly
  work ran on four cores no matter what your machine had; it now uses more of
  them. Measured on a 24-thread Intel desktop at 1080p, under load. Frame
  rates for every platform are on the [performance page](/sdk/performance).
- **Video encoding on Linux takes about 60% less processor time.**
  `bithuman render` now compresses with the same encoder settings the bitHuman
  cloud uses. Both settings were measured on the same frames against an
  uncompressed reference: the picture is equal or slightly better, and files
  are about a fifth larger.
- **macOS is unchanged** — it keeps the hardware video encoder 2.6.14
  introduced.
- **The engine inside moves to 3.1.5** (ABI 7). `bithuman --version` prints it
  beside the CLI's own version, and the [CLI page](/sdk/cli#install) shows
  what that output looks like.

A second Linux speedup is already built and will arrive as its own release,
with its own entry here. Nothing you install today needs changing for it.

Earlier versions stay resolvable; a `BITHUMAN_VERSION=cli-v2.6.14` pin keeps
working.

### Essence 2's audio step does less work on iPhone and Mac — Swift SDK 2.13.3 (2026-09-14)

Swift package tag **2.13.3** ships Essence 2 engine **1.6.3**. If you depend on
the package with `from:`, you already resolve it, and nothing in your code
changes.

- **Essence 2's audio step computes only the part of each audio window the
  renderer reads** — the same change the CLI took in 2.6.13 and the Python
  library in 3.1.5. An Essence 2 render on an iPhone is substantially faster
  for it. The measured rate for each platform is on the
  [performance page](/sdk/performance).
- **Nothing else in the package changes.** The `bitHumanKit` and `Expression2`
  products are the same binaries 2.13.2 shipped; 2.13.2 shipped Essence 2
  engine 1.6.2.
- Essence 2 in your own iOS or macOS app still works from **2.13.2** — the
  [install section](/sdk/ios#install) has the pin.

### Essence 2 on Android is fast at its default settings — `essence2-android` 0.5.5 (2026-09-13)

`ai.bithuman:essence2-android:0.5.5` on Maven Central. **If you are on 0.5.3,
change the version and nothing else** — every class and method your code calls
is the same in 0.5.5.

- **The default settings are now the fast ones.** 0.5.3 left speed on the
  table unless you overrode its settings: its default thread count was too low
  for a current handset, and it assembled every 1080p output frame on the CPU.
  0.5.5 corrects the thread default and assembles each output frame on the GPU
  of a Snapdragon (Adreno) handset by default. The frame rate a Galaxy S25+ reaches at those
  defaults, measured on the published library, is on the
  [performance page](/sdk/performance).
- **There is no 0.5.4** — it was never published, so 0.5.3 is followed by 0.5.5.
- `0.2.0` through `0.5.3` stay on Central; `0.5.1` and `0.5.2` cannot install a
  model on a handset. The coordinate and the troubleshooting table are on the
  [Android SDK](/sdk/android#troubleshooting) page, and the FFmpeg relink kit
  for this version is on [FFmpeg / LGPL](/legal/android-ffmpeg-lgpl).

### `bithuman` 3.1.5: Essence 2's audio step does less work, and a render that stops early raises (2026-09-13)

`bithuman` 3.1.5 on PyPI: `pip install --upgrade bithuman`. The same wheels as
3.1.4 — CPython 3.10–3.14 on macOS arm64 (14 or newer), Linux x86_64 and Linux
aarch64.

- **Essence 2's audio step computes only what the renderer reads.** Each audio
  window is now processed only as far as the part the renderer actually uses,
  so the audio side of a render does less work than on 3.1.4. Delivered frames
  are unchanged — compared frame by frame against 3.1.4's
  audio step on Linux before publishing. The library fetches the new audio
  files once, on first use, and checks them by digest.
- **A render that stops early raises instead of returning a short video.**
  `avatar.render(...)` now checks that it delivered the frames your audio calls
  for, and raises `Failed` naming both counts — *"that render stopped early —
  N frames came out of the M this audio should produce"* — so you can render
  again rather than ship a clip that ends before its audio does. On 3.1.4 such
  a render returned normally. A live stream has no fixed length and is never
  flagged.
- **If you pinned 3.1.4, move the pin.** 3.1.4 keeps working and keeps
  fetching the audio files it was built for, but it runs the larger audio step.

### `bithuman render` on a Mac compresses video on the Mac's own hardware encoder — `cli-v2.6.14` (2026-09-13)

CLI `cli-v2.6.14`, macOS arm64 and Linux x86_64 built from one commit; it is
what Homebrew and the universal installer give you. **One change, and it is on
macOS:** `bithuman render` compresses the output video on your Mac's hardware
video encoder instead of on the CPU.

- **Renders are faster, and your Mac stays usable while they run.** The CPU was
  spending more time compressing the video than rendering it. On an Apple M4
  the same render runs about 1.7x faster, and compressing it takes about half
  of one core instead of about five. Measured frame rates are on the
  [performance page](/sdk/performance).
- **The picture quality is the same.** The encoder setting was chosen to match
  what 2.6.13 produced, measured frame by frame against an uncompressed
  reference — not to make the file smaller.
- **Speed is steadier from run to run.** Two identical renders used to differ
  by up to 1.67x in speed depending on what else the Mac was doing; now they
  differ by about 1%.
- **Nothing fails without the hardware encoder.** If your `ffmpeg` does not
  have Apple's hardware encoder — a custom build, say — you get the CPU encoder
  as before. Every render prints which encoder it used, and
  `BITHUMAN_FORCE_X264=1` pins the CPU encoder.
- **Linux is unchanged:** same encoder, same settings, same bytes. The engine
  inside is the same one 2.6.13 carried; only the CLI's own version moves.

**Known issue, and it is not new:** on macOS, rendering the same input twice can
produce slightly different output — every frame stays in its place, but some
pixel values can differ slightly between runs. `2.6.11` through `2.6.13` behave
the same way. A fix is in progress.

Earlier versions stay resolvable; a `BITHUMAN_VERSION=cli-v2.6.13` pin keeps
working.

### Essence 2's audio step does less than half the work — upgrade to `cli-v2.6.13` (2026-09-13)

CLI `cli-v2.6.13`, macOS arm64 and Linux x86_64 built from one commit. **If you
are on any earlier 2.6.x, this is the one to install:** the speed-up below
reached almost nobody until it landed.

Rendering an avatar turns your audio into motion in short steps. Those steps now
run over only the part of each audio window the renderer actually reads, so the
audio side of a render costs less than half what it did. **Every delivered frame
is identical** — we compared full renders frame by frame on macOS and on Linux
before publishing.

Getting it onto developers' machines took three tries, and the first two are why
`2.6.13` exists:

- **`cli-v2.6.10`** started fetching the faster audio files alongside the shared
  audio model, in the same download, verified by checksum. On Linux the files as
  first published could not be read by the runtime the CLI ships, so Linux kept
  the slower path; they were re-published in a form every runtime reads.
- **`cli-v2.6.11`** looked for those files beside whichever audio model the CLI
  actually resolves, so machines that already had the model — most machines —
  stopped being skipped.
- **`cli-v2.6.12`** made the step itself do less than half the work, but only
  replaced the files on a machine with an empty cache. If you had rendered
  before, you kept the older files and the older speed.
- **`cli-v2.6.13`** checks the files already on your machine against the ones it
  expects and replaces any that differ, on the first render. Nothing to
  configure.

**Known issue, and it is not new:** on macOS, rendering the same input twice can
produce slightly different output — every frame stays in its place, but some
pixel values can differ slightly between runs. `2.6.11` and `2.6.12` behave the
same way. A fix is in progress.

Earlier versions stay resolvable; a `BITHUMAN_VERSION=cli-v2.6.12` pin keeps
working. Measured frame rates are on the [performance page](/sdk/performance).

### `bithuman render --json` reports its own steady-state rate (2026-09-13)

CLI `cli-v2.6.9`. `render --json` now includes **`render_fps`** beside
`render_seconds`: frames per second measured from the first audio pushed to the
last frame delivered, with model load and start-up excluded. It is the number
the [performance page](/sdk/performance) publishes, so you can reproduce that
figure on your own machine instead of timing the whole process yourself.

`fps` in the same object is unchanged and still means the **output video's**
frame rate. Both fields are `null` rather than `0` when they cannot be measured.

### The Apple tier's force slugs are `essence-2-apple` and `expression-2-apple` (2026-09-13)

The `?model=` slug that pins a session to the cloud's Apple tier is now spelled
after the tier — `essence-2-apple` and `expression-2-apple` — on
[embed](/api/embedding), viewer and share URLs, and in the
[tier tables](/concepts/models#advanced-pin-a-serving-tier). **Nothing you
already have breaks:** the older `essence-2-ane` and `expression-2-ane`
spellings stay accepted forever, so saved links, embeds and share tokens keep
routing to the same tier.

### `bithuman render` is about 1.5x faster on Apple Silicon and 1.3x on Linux (2026-09-12)

CLI `cli-v2.6.8`, macOS arm64 and Linux x86_64 built from one commit, published
2026-09-12. The version installed before it is 2.6.6 — `cli-v2.6.7` was built
and withdrawn before it was ever published, so the entry below first reaches
developers here. From the release notes:

- **`render` was opening your avatar on the wrong render model.** `bithuman
  render` and `bithuman run` are the same engine on the same avatar, and they
  asked it for different render models: `run` the one-frame model, `render` the
  multi-frame one driven a frame at a time, which is the shape it is worst at.
  The model is now chosen once, in one place, for both commands, and a check
  outside both refuses any future build that reintroduces the split. Against
  2.6.6, end to end, `render` is about **1.5x faster on Apple Silicon** and
  about **1.3x faster on Linux**; the delivered MP4 is bit-identical.
- **Your very first render is slower, and only your first** — it fetches the
  shared audio model and builds the accelerator's compiled-model cache. On a
  short clip most of the Mac wall is one-time work, so longer clips converge
  on the faster render-loop rate.
- **The last CPU step of the renderer moved to the GPU on Macs.** Writing each
  face region back into the delivered frame now runs as a Metal compute pass,
  byte-exact against the CPU path, with the on/off switch deleted rather than
  defaulted.
- **What did not change:** the bundled engine core stays at 3.1.3 (ABI 7), so
  there is no new Python wheel; `bithuman render` still refuses `essence-1`
  avatars on both platforms, naming the Python package to use instead. The
  macOS tarball is Developer ID signed and notarized.

`cli-v2.6.6` stays resolvable; a `BITHUMAN_VERSION=cli-v2.6.6` pin keeps
working. Measured frame rates are on the [performance page](/sdk/performance).

### The CLI's Essence 2 engine is BUILT again, and its ffmpeg libraries travel with it (2026-09-11)

> `cli-v2.6.7` was built and withdrawn before it was published; everything in
> this entry ships in `cli-v2.6.8` (above).

CLI `cli-v2.6.7`, macOS arm64 and Linux x86_64 from one commit
(`66613942f5f0`). The essence engine core moves to **3.1.3** (ABI 7).

- **An offline `essence-2` render is 3.2x faster.** The engine core inside the
  2.6.6 tarball (`lib/lible_core.*`) was a hand-pinned build that carried none
  of the engine's vector routines — measured on the published 2.6.6 asset
  itself: 885,304 bytes, zero vector targets. 2.6.7 builds that core from the
  same commit the release pins: 1,137,920 bytes, eight vector targets. Same
  machine, same avatar, same held-out human voice, 100 frames of 1920x1080,
  unpaced: **1.08 fps → 3.48–3.77 fps on Linux x86_64**, and **8.59–8.71 fps
  on an Apple M4**. `essence-2` through the CLI is still slower than realtime;
  this release is a correctness fix, not the end of that work.
- **The Linux tarball now carries the ffmpeg libraries its own engine links.**
  It shipped `libavutil.so.59` alone; the engine also needs
  `libavcodec.so.61` and `libavformat.so.61`, so on a machine without a system
  ffmpeg 7 an `essence-2` render exited 69 rather than rendering. All three now
  travel in the tarball. The release script's dependency walk had been running
  with the vendor directory off the loader path — it saw "not found", copied
  nothing, and reported success; it now refuses to build a tarball with any
  unresolved library.
- **`expression-2` on macOS, re-measured on the published arm64 tarball
  itself:** 300 frames of 1280x720 at 25 fps, **30.5 fps**, mouth-to-audio lag
  **0 frames**, and the receipt's `frames` equals the frame count in the file.

`cli-v2.6.6` is marked superseded; its assets stay downloadable, and a
`BITHUMAN_VERSION=cli-v2.6.6` pin keeps working.

### A free avatar by CODE, a clip that is in sync, and an Android default that is fast (2026-09-11)

CLI `cli-v2.6.6`, `ai.bithuman:expression2-android:0.4.1` and
`ai.bithuman:essence2-android:0.5.2` on Maven Central, and `bithuman` 3.1.2 on
PyPI.

- **`bithuman pull <CODE>` gets you any avatar in the gallery, with no account,
  no key and no credits.** Every row `bithuman list` prints carries the CODE to
  pull — `pull` takes it directly, writes the `.imx` and tells you whether your
  machine can render it (`"runnable_locally": true`). The [CLI
  page](/sdk/cli) is two commands from nothing to a talking face.
- **A rendered clip's mouth is in sync with its audio.** Before this release
  `bithuman render` put ten warm-up frames — 400 ms of a closed, still face — in
  front of the first spoken frame, one constant offset for the whole file, on
  every platform, and the receipt reported every frame as good. If you trimmed
  400 ms of audio or nudged a track in an editor to compensate, undo it. The
  finished file also holds every frame the receipt counts, and `render --json`
  names what it left out: `lead_in_frames_dropped`.
- **An avatar file you downloaded yourself renders on Linux.** `render` and
  `run` on a file fetched with a browser or `curl` used to exit 69 naming a
  shared engine file as missing — a file the installer had already put beside
  the binary. They take the copy that ships in the tarball now, and it never
  reaches the network to do it. And `bithuman run <CODE>` on Linux x86_64 no
  longer opens a cloud session for an avatar that same machine renders in
  seconds: `run` asks the question `render` asks, so the two cannot disagree.
- **On Android, a bare `Expression2Options()` is the fast one.** Depend on
  `expression2-android:0.4.1` and the defaults ask for the accelerator — the
  measured frame rate on a current handset is on the [Android
  SDK](/sdk/android) page. On `0.3.1` the same bare options stayed on the CPU
  and you had to name a routing to get off it. `essence2-android` is `0.5.2`.
- **`pip install bithuman` is 3.1.2.** The CLI is not on PyPI: install it with
  Homebrew or the universal installer ([the CLI page](/sdk/cli)).

### Android — the Kotlin example is a whole project, and essence-1 `2.3.6` cannot authenticate on a phone (2026-09-09)

Two Android findings from a walk of the published pages on a Galaxy S25+
(`SM-S936U1`, Snapdragon 8 Elite, Android 16).

- **[Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) is now a
  complete project rather than fragments** — every file in full, in the order you
  create them, plus the audio reader and the playback clock. Parsed back out of
  the served page into an empty directory and run: `app-debug.apk` 3,474,583 B,
  5.72 s of speech → **117 frames** of 416×720, `acc=CPU`. Two toolchain steps the
  site never wrote down (`ANDROID_HOME` / `local.properties`, and a JDK 17
  launcher — AGP 8.7.3 rejects a newer one with an error whose whole body is the
  string `26.0.2.1`) are now in [Install](/sdk/android#install).
- **`ai.bithuman:sdk:2.3.6` (essence-1) resolves, compiles and installs, and then
  cannot authenticate on a device.** `Avatar.load` throws
  `be_auth_authenticate: status=11 … SSL peer certificate … was not OK`: the
  published native library carries no CA trust store. It is not your network and
  not your key — the same handset reached that exact endpoint over a public Google
  Trust Services chain in the same minute — and there is no app-side workaround on
  this version. Use
  [expression-2](/sdk/android#install) on
  Android, which needs no key. [The measurement](/sdk/android#troubleshooting).

### CLI `2.6.4` — a rejected key gets 300 seconds, then the session stops (2026-09-07)

`cli-v2.6.4` (published 2026-09-07 23:30Z on the Homebrew tap; the formula
pins it) — `bithuman-x86_64-unknown-linux-gnu.tar.gz` (sha256
`42094b2c912b3b3b4be364aed18893892d247d1e1070c9bb82225fa5e7f26f1a`) and
`bithuman-aarch64-apple-darwin.tar.gz` (sha256
`ed827aaa0b3918100e6c6776ca0527d7b7cabb8e4618f3ce91ef437f205f1bbc`, Developer
ID signed and notarized, verified quarantined), both from one commit
(`01325a3`). Engine core unchanged.

- **A key the service rejects gets a grace of 300 seconds, then the session
  stops.** The CLI checks your key with the service when a self-hosted
  session starts and once a minute while it runs. If the service **cannot be
  reached** (no network, a timeout, a 5xx on our side) the session renders,
  prints a loud `★ UNMETERED RENDER` line saying why, and keeps trying — it
  never stops for this, however long it lasts. If the service **rejects the
  key** (HTTP 401, 402 or 403 — revoked, from another environment, or out of
  credits) the session keeps rendering for **300 seconds** from the first
  rejection, prints a line once a minute naming the seconds of grace left and
  the fix, and re-checks the key every minute; a key accepted again clears
  the clock, and a key still rejected at 300 seconds **stops the session** —
  `run` closes the preview and `render` exits `METERING_REFUSED` (77) with no
  output. Before 2.6.4 a rejected key rendered on indefinitely behind the loud
  line. Measured on the published tarballs from a fresh home directory, on
  Linux x86_64 and on an Apple Silicon Mac, three sessions each: with an
  invented key the session printed five countdown lines and ended by itself
  **306 s** (Linux) / **305 s** (macOS) after it came up; with a good key
  revoked once the session was up, the first rejected check started the clock
  and the session stopped **300 s** after it, exit 77, on both; with the
  metering service unreachable the session was still rendering **345 s**
  later with no rejection and no refusal. The published 2.6.3 tarball, same
  invented-key arm, was still rendering after 420 s — the control.
- **Billing is unchanged.** A live session bills wall-clock, a render bills
  the clip it writes, a download is free — as in 2.6.3. On the published
  2.6.4 Linux tarball a 92 s Essence 2 session recorded **91.8 s** in two
  acknowledged beats.
- The same rule, with the same number, applies to the
  [Python package](/sdk/python#run) (3.0.4) and to the Apple
  engine below; for the Android SDK it is landed in the source and ships in
  the next coordinate ([details](/sdk/android#troubleshooting)).

### Apple engine `essence2-v1.4.0` / Swift package `2.10.0` — the same 300-second rule (2026-09-07)

`essence2-v1.4.0` (published 2026-09-07 23:37Z; `Package.swift` at tag
`v2.10.0` pins the engine archive at checksum
`75b1919b848a0a8e13bdfe51999739813b610a42dad25d9fc5a3a4e408e29808`; ONNX
Runtime and the resources archive carried forward byte-identical from
`essence2-v1.3.0`). A key the service rejects renders for a grace of 300
seconds from the first rejection behind a line once a minute, re-checked every
minute; still rejected at 300 seconds the engine stops —
`be_essence2_pull_frame` and `be_essence2_idle_frame` return `-3` from then on.
A meter that cannot be reached still never stops a render. Billing is
unchanged from `essence2-v1.3.0`. Details on [the Swift page](/sdk/ios#install).

### CLI `2.6.3` — a live self-hosted session is billed on wall-clock (2026-09-07)

`cli-v2.6.3` (published 2026-09-07 12:59Z on the Homebrew tap; superseded by
[2.6.4](#cli-264--a-rejected-key-gets-300-seconds-then-the-session-stops-2026-09-07)) — `bithuman-x86_64-unknown-linux-gnu.tar.gz` (sha256
`bf2c7b6414ed9d2fe8e00db929471ce82f405159c58c051733f3de6fdb94ecd6`) and
`bithuman-aarch64-apple-darwin.tar.gz` (sha256
`14ee0490a6bec87f26357bcdeb77160834ffdad6434200d77fdc3c806d043506`, Developer
ID signed and notarized), both from one commit (`b7a1005`). Engine core
unchanged.

- **A live self-hosted session bills wall-clock, which is what the pricing
  page defines.** `bithuman run <CODE>.imx` on an Essence 2 or Expression 2
  avatar bills the seconds the session was live, idle animation included, at
  2 credits per minute ([pricing](/guides/pricing)); an offline `bithuman
  render` still bills the duration of the clip it writes; `bithuman pull` is
  still free. 2.6.2 counted **frames delivered ÷ fps** instead, so a preview
  on a machine whose engine paints below nominal fps under-claimed — measured
  on an Apple Silicon Mac, the published 2.6.2 binary held a 92 s Essence 2
  session and recorded **8.0 s of it, for 0 credits**. On the published 2.6.3
  tarball, same machine and clip, the same session records **92.1 s**.
  Verified on the published bytes from a fresh home directory on Linux
  x86_64 and on an Apple Silicon Mac, both families, with the 2.6.2 macOS
  binary as the control —
  [the self-host guide](/guides/self-hosting#how-self-hosting-is-billed).
- **The live preview holds its nominal frame rate.** On some Macs 2.6.2's
  preview settled at about a third of nominal with no viewers and an idle
  engine, because it trusted `sleep` to return on time and never made up a
  late wake. The preview now paces on an absolute clock: measured on the Mac
  that had it, Expression 2 settles at **20.0 fps against a 20 fps target**
  where it previously ran at 5.8. Where the engine itself is the limit the
  preview still runs below nominal — the pacer cannot invent frames — but it
  no longer adds delay of its own.
- **The Linux tarball's `PROVENANCE.json` says whether its tree was clean**
  (`dirty:false`) and names the engine SDK revision, as the macOS half
  already did, plus the source revision of the Expression 2 render host it
  carries.
- The release lane is tracked in the CLI repository, so the release and the
  proof that drives it can be re-run by someone other than the person who
  cut it.

### CLI `2.6.2` — self-hosted sessions on macOS are metered, and the help tells the truth (2026-09-07)

`cli-v2.6.2` (published 2026-09-07 08:49Z on the Homebrew tap; superseded by
[2.6.3](#cli-263--a-live-self-hosted-session-is-billed-on-wall-clock-2026-09-07)) — `bithuman-x86_64-unknown-linux-gnu.tar.gz` (sha256
`1248f34feea05c8f3adab0312376e3704643296ce8012718c7a75aba032db03f`) and
`bithuman-aarch64-apple-darwin.tar.gz` (sha256
`0dab98763ecf7b25414abfbfecfc9071edcbda859eb88616e6dc1942b6373025`, Developer
ID signed and notarized), both from one commit (`679b9a6`). Engine core
unchanged.

- **A self-hosted essence-2 or expression-2 session is billed at the
  published self-hosted rate on macOS and Linux alike** — 2 credits per minute
  ([pricing](/guides/pricing)). Before 2.6.2 only expression-2 on Linux was
  metered: `bithuman run <CODE>.imx` and `bithuman render` on an essence-2
  model were not metered on any platform, and on a Mac no session was. A
  credit minute is the pricing page's — "wall-clock time a session is live
  and the engine is rendering", idle animation included — and an offline
  `bithuman render` bills the duration of the clip it writes
  ([the definition](/guides/pricing#serving--credits-per-live-minute)); one
  usage row per session; downloading a model is free. Known gap, fixed in
  [2.6.3](#cli-263--a-live-self-hosted-session-is-billed-on-wall-clock-2026-09-07):
  cli-v2.6.2 counts frames delivered ÷ fps as the served time, which
  under-counts a preview that paints below nominal fps. Metering never
  stops a render: with no sign-in, or a rejected or depleted key, the session renders
  behind a loud `★ UNMETERED RENDER` line, and `BITHUMAN_METER_ENFORCE=1`
  turns those three cases into a refusal. Proven on the published tarballs
  from a fresh home on Linux and on an Apple Silicon Mac, with the 2.6.1
  macOS binary as the silent control — [the self-host guide](/guides/self-hosting#how-self-hosting-is-billed).
- **`bithuman run --help` says where a model renders.** It no longer claims
  essence-2 / expression-2 have "no local runtime yet" (false since 2.6.1): a
  local `.imx` renders on this machine for essence-1, essence-2 and
  expression-2 (`bithuman pull <CODE>` fetches one); an agent code for
  essence-2 / expression-2 opens a live cloud session, as before; `--cloud`
  forces one. The routing did not change; the words did.
- **`bithuman doctor` on macOS no longer tells you to `pip install
  bithuman-cli`** when the conversation worker is not set up yet — the first
  `bithuman run` sets it up.
- **The Linux tarball's build time is no longer in the future.** 2.6.1's
  `PROVENANCE.json` said 2026-09-08; `built_at` is now the commit's time on
  both platforms, and a tarball stamped ahead of the clock is refused before
  it can be published.
- A live preview ends its session cleanly on the first Ctrl-C.

### CLI `2.6.1` — essence-2 renders locally, on Linux and on macOS (2026-09-07)

`cli-v2.6.1` (published 2026-09-07 05:04Z on the Homebrew tap; superseded by
[2.6.2](#cli-262--self-hosted-sessions-on-macos-are-metered-and-the-help-tells-the-truth-2026-09-07)) ships the **essence-2 runtime inside the CLI tarball on both
platforms** — `bithuman-x86_64-unknown-linux-gnu.tar.gz` (sha256
`5aef085a0686fc4f05b83ee50a26262a522f0f232c8f8717d157d29a5b18c1d6`) and
`bithuman-aarch64-apple-darwin.tar.gz` (sha256
`0fb359a8b709e2606af1f7e26b1df1ac705c8dc1da6f954131641b012d4f953c`, Developer
ID signed and notarized). A downloaded essence-2 avatar now renders on your
own machine, offline, exactly the way expression-2 already did:

```bash
bithuman pull <AGENT_CODE> --model essence-2              # → <AGENT_CODE>.imx
bithuman render <AGENT_CODE>.imx -a speech.wav -o out.mp4   # exit 0; 5 s of audio → 125 frames at 25 fps
bithuman run <AGENT_CODE>.imx                             # local server
```

- **The shared audio encoder is fetched on the first essence-2 render** —
  about 377 MB, once per machine, from the public release coordinate, checked
  by content digest, into `~/.bithuman/engines/essence-2/` — and reused after
  that. Nothing to stage by hand, no environment variable, no extra install
  step. The first play performs a licence check with the cloud, so it needs
  the sign-in `pull <AGENT_CODE>` already needs.
- **Fail-closed.** An essence-2 model file that is incomplete — a required
  model member missing — is refused with **exit 69** and **no output file**.
  The CLI never substitutes a generated mouth for the one the avatar recorded.
- **expression-2 is unchanged.** The 2.6.0 line below — "essence-2 does not
  render locally from these tarballs" — is closed, and so is every earlier
  note about a runtime to stage beside the binary.
- Proven from the published tarball alone — fresh home directory, empty
  environment — on Linux x86_64 and on an Apple Silicon Mac:
  [Verified transcript](/sdk/cli/reference).

### essence-2 reaches Apple and Android as public coordinates, and the CLI moves to 2.6.0 (2026-09-07)

One line per release, each dated from the release itself and each checked
anonymously on 2026-09-07 before it was written here:

- **2026-09-06 16:12Z — essence-2 Apple engine `essence2-v1.1.0`.** The first public release of the on-device essence-2 engine for iOS and macOS: an engine archive and an ONNX Runtime archive, each with a `.sha256` sidecar, fetchable with no credential. It refuses rather than drawing a mouth the avatar never recorded.
- **2026-09-06 16:42Z — Swift SDK `v2.7.0`.** Adds the **`Essence2`** product (manifest only), pointing at `essence2-v1.1.0`. Its only module was `CLibEssence2`.
- **2026-09-06 18:50Z — the essence-2 shared audio encoder is published** on a public release coordinate (377,625,424 B, SHA-256 `95c35c86…`), so the CLI and the Python package fetch it themselves instead of asking you to find it.
- **2026-09-06 21:32Z — CLI `cli-v2.6.0`**, macOS arm64 and Linux x86_64 from one commit, with a `PROVENANCE.json` in each tarball. Fixed: `bithuman run` and `bithuman pull` agree on a container's name; `bithuman render` on macOS no longer truncates a clip; a refused render leaves no file behind. Added: the shared audio encoder is fetched once per machine and digest-checked on every use. Known and stated in the release: **essence-2 does not render locally from these tarballs** (`render` exits 69 for it) — closed the same day by [`cli-v2.6.1`](#cli-261--essence-2-renders-locally-on-linux-and-on-macos-2026-09-07); expression-2 renders locally on both platforms. The Python extra for offline rendering is now spelled `bithuman[offline]`.
- **2026-09-06 — Android `ai.bithuman:essence2-android:0.3.0`.** The first essence-2 AAR whose engine refuses, with a thrown exception, rather than drawing a mouth of its own — but it judged a bundle by a descriptive list in its manifest and refused complete bundles. Superseded the same night; do not build against it.
- **2026-09-08 02:17Z — Android `ai.bithuman:essence2-android:0.5.1`.** The version to use. A self-hosted session is metered at the published rate — `0.5.0` (2026-09-07 15:21Z) was the first Android version to meter at all; every version through `0.4.0` rendered free — and `0.5.1` adds the one rule every bitHuman runtime follows when the key check does not come back clean: a rejected key renders for a **five-minute grace** behind a countdown line, then every render call throws `MeteringRefused`; a metering service that cannot be reached never stops a render. Driven on a Galaxy S25+ through the exact bytes uploaded, before the press: five arms green, including the invented key refused at 300 s and the unreachable service still rendering at 345 s; the same arm on `0.5.0` went red. `0.2.0` through `0.5.0` still resolve — use none of them. [Android SDK](/sdk/android#troubleshooting).
- **2026-09-07 01:20Z — essence-2 Apple engine `essence2-v1.2.0`.** One rule for when a model renders — all four recorded-mouth files present, or a refusal naming the missing one — on every platform; `import Essence2` compiles; the resources archive rides on the same release, so the coordinate is complete on its own.
- **2026-09-07 01:30Z — Swift SDK `v2.8.0`.** `Essence2` points at `essence2-v1.2.0`. Pin `from: "2.8.0"`. Resolves and builds for iOS device, iOS simulator and macOS from a consumer outside any bitHuman repository. Still missing: an in-app model download route that accepts a runtime token — [Essence 2 on-device](/sdk/ios#install).
- **2026-09-07 01:45Z — Android `ai.bithuman:essence2-android:0.4.0`.** The version to use. The same one rule as the Apple engine; an in-SDK **model store** (`Essence2ModelStore` — no default host yet, you pass the mirror); the product-named Kotlin package `ai.bithuman.essence2` beside the legacy `ai.bithuman.elevate`, kept for compatibility; `INTERNET` merged into your app. Driven on a Galaxy S25+ through the published bytes, 11 of 11 tests green. `0.2.0` can show a mouth the avatar never recorded without telling you and `0.3.0` refuses complete bundles — use neither. [Android SDK](/sdk/android#troubleshooting).
- **2026-09-07 — Python `bithuman` 3.0.0.** A clean break: thirty-two public names become eight (`bithuman.open`, `Avatar`, `Avatar.render`, `AvatarError`, `InvalidAvatar`, `NotSupported`, `NotAuthorised`, `Failed`), frames are **RGB**, the key comes from `BITHUMAN_API_SECRET` only, and essence-2 **and** expression-2 open through the same call on macOS and Linux (`bithuman[expression-2]` for the latter). An essence-2 avatar missing its recorded-mouth data is refused at `open`. The offline route is `bithuman.offline` / `bithuman[offline]` (the 2.x spellings warn until 4.0.0), and the shared audio encoder is fetched and digest-checked for you. `pip install "bithuman<3"` stays on 2.9.0. [Python SDK](/sdk/python#troubleshooting).
- **`ai.bithuman:expression2-android:0.3.1`** (2026-09-04) is unchanged and current — see [its entry](#expression-2-android-is-031-and-google-is-no-longer-required-2026-09-04). The Kotlin hello page now carries an expression-2 and an essence-2 example, both compiled against the published AARs: [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) (rewritten on 2026-09-09 as a complete project).

Also corrected on 2026-09-07: the scope matrix on [where each model runs](/concepts/models#where-each-model-runs) no longer carries a "Not ruled" column — the cloud CPU serving tier is **in scope** for essence-2 and expression-2 by the 2026-09-04 dispatch ruling, and essence-1 is served from the cloud's Apple tier only (2026-09-05).

### Swift SDK `2.6.0` — Expression 2 can be handed a model (2026-09-06)

Tag `v2.6.0` on the SwiftPM package. Pin **`from: "2.6.0"`**. Everything in it
is additive: if you are on `from: "2.5.0"` or `from: "2.5.1"` you pick it up
automatically and nothing you have written stops compiling.

★ **The engine can now be given a model.** Through 2.5.1 the only initializer
was `Expression2Engine()`, which searched an environment variable or the app
bundle and left `isReady == false` when it found nothing — so an app that had
**downloaded** its own avatar had no way to point the engine at it. 2.6.0 adds:

- `Expression2Engine.create(modelPath:sharedEngineDir:warmSpeech:)` and the
  instance `load(modelPath:…)`;
- `Expression2Engine.create(avatarContainer:sharedEngineContainer:sharedEngineDir:stagingDir:warmSpeech:)`,
  which opens the `.avatar` that
  [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
  returns;
- `Expression2Container` — `isContainer`, `members(of:)`, `read(_:from:)`,
  `readManifest(_:)`, `unpack(_:to:)` — plus `Expression2ContainerError` (the
  file is wrong) and `Expression2LoadError` (the contents are wrong, including
  `notAnAvatarDirectory(path:)`).

**This withdraws a sentence this site published.** The Swift SDK page said there
was *"no supported way to hand them to this product … no unpacking route is
published or supported"*. True of 2.5.x; **false as of 2.6.0**, and the page has
been rewritten rather than softened.

★ **Three binary targets now, not two.** `UnifiedModelHeader.xcframework` ships
with this release because the engine's own module interface imports it. You
never write that import — attach the **`Expression2` product** and all three
targets come with it. A hand-rolled dependency on only the two 2.5.0 targets
fails at import with `no such module 'UnifiedModelHeader'`.

**`bitHumanKit` is untouched**: still the `v2.4.0` asset, same URL, same
checksum. `Expression2` still ships **no model weights**, so resolving it does
not by itself get you a rendering avatar — what changed is that you can now hand
it one.

Measured on the published zips, downloaded anonymously and re-hashed against the
checksums the manifest pins (all match) — `ios-arm64` slice, aggregated over the
nine emitted `.swiftinterface` files, with two unchanged symbols and a nonsense
token as controls:

```text
token                      v2.5.0   v2.6.0
create(modelPath                0        9
Expression2Container            0       45
notAnAvatarDirectory            0        9
public init()   (control)       9        9
a token in neither (control)    0        0
```

### expression-2 Android is `0.3.1`, and `google()` is no longer required (2026-09-04)

`ai.bithuman:expression2-android:0.3.1` reached Maven Central at
**2026-09-04T11:47:17Z** (`maven-metadata.xml` `latest`/`release` = `0.3.1`),
**2,742,085 B**. It supersedes `0.3.0` as the version this site documents.

**What changed for a consumer.** `0.3.1`'s POM declares only
`org.jetbrains.kotlin:kotlin-stdlib:2.0.21`. `0.3.0`'s also declared
`com.google.ai.edge.litert:litert:2.2.0`, which is **404 on Maven Central**, so
a `0.3.0` build needed `google()` in its repositories and failed at
`checkReleaseAarMetadata` without it. **`mavenCentral()` alone now resolves it.**
A build pinned to `0.3.0` still needs `google()` — Central never replaces a
published POM.

**What did not change.** The engine is the same binary: `libexpr2jni.so` is
446,200 B in both and differs in exactly **20 bytes at offsets 736–755** (the
GNU build-id), and the bundled `libLiteRt.so` (5,508,376 B) is **byte-identical**.
`classes.jar` goes from 32 to 41 entries, adding nine `Bhci*` classes and
removing none — so every measurement this site published against `0.3.0` still
describes `0.3.1`.

★ **Still `arm64-v8a` only**, as are all three `ai.bithuman` Android artifacts.
An x86_64 emulator resolves and installs and then throws
`UnsatisfiedLinkError` at the first `System.loadLibrary`; use a physical arm64
device or an `arm64-v8a` system image.

### Essence 2's head upsample reaches the Android path, and the phone figure is measured (2026-09-03)

★ **Correction to the 2026-09-02 entry below.** That entry announced a rebuilt
head-upsampling step and published a **3.00×** CPU speedup. Both statements
stand, but the entry let a reader infer something that was not true: that an
**Android** device got the win. It did not.

**Why not.** An identity's renderer ships as **two** graphs — a **batched** one
and a **single-frame** one — and they are rewritten independently. The
2026-09-02 rollout rewrote **only the batched graph**. **Android runs the
single-frame graph** (its batched path is unavailable while the sharp
mouth-interior pass is attached, and that pass is always attached), so the
change reached nothing a phone executes. The single-frame graph was rewritten
and deployed on **2026-09-03**, on the same single identity. **The rewrite is
now on 1 of 52 published identities, in both graphs; the other 51 have it in
neither.**

**And now it is measured on a phone.** Both graphs, benchmarked head to head on
a **Galaxy S25+ (`SM-S936U1`, Snapdragon 8 Elite / SM8750)**, ONNX Runtime
**1.26.0** CPU execution provider, **batch 1** (the shape Android runs), 4
intra-op threads pinned to the four big cores, screen held awake, 8 interleaved
and rotated repeats, medians, 80 of 80 samples passing the clock and contention
guards. This is an **offline benchmark of the renderer graph** — not a live
session, and not a run through the published Android SDK's own API.

| Renderer graph | Cooled ms/frame | fps | RTF | Sustained ms/frame | fps | RTF |
|---|---:|---:|---:|---:|---:|---:|
| Previous step (cubic resize) | **109.23** | 9.15 | 2.73 | **160.04** | 6.25 | 4.00 |
| Rebuilt step | **49.00** | 20.41 | 1.23 | **83.38** | 11.99 | 2.08 |

**2.23× cooled, 1.92× sustained.** The deployed identity, benchmarked as
itself, agrees to 0.27% / 0.30%. Both controls fired: a byte-identical duplicate
measured 1.003× / 1.016×, inside the floor; a deliberately 33.8%-heavier arm
measured **slower**, 0.968× / 0.938×. The sustained figure is a **lower bound** —
the burn preceding it is fixed *work*, not fixed *time*, so the faster arm
enters its window hotter (50.7 °C vs 47.8 °C) and against a lower clock ceiling
(1.958 vs 2.438 GHz).

★ **Essence 2 still does not render in real time on a flagship phone.** Even
cooled and rebuilt, 20.41 fps is below the 25 fps a session consumes (RTF 1.22);
sustained it is 11.99 fps. Against the internal real-time bar (RTF ≤ 0.50,
≥ 40 fps) the rebuilt graph is 2.45× short cooled and 4.17× short sustained.

★ **The 7.54 → 23.87 fps figure is not an Android figure.** It is a **developer
workstation** — Threadripper PRO 5955WX, x86-64, batch 24 — and it is neither a
phone nor the deployed CPU worker. The handset rows above supersede it for every
on-device claim. The share of the forward pass taken by the replaced step is
**68.6%** on that x86 part but **57.9%** on the Snapdragon, which is why the same
rewrite is worth 3.00× there and 2.23× here; shares and speedups do not carry
across silicon.

**Unchanged, and stated again so it is not read as a general speedup:** on the
**GPU** tier the rewrite is **0.971× — about 3% slower**, and no GPU speedup
should be expected or quoted. On the **Apple** tier there is nothing to gain:
that build's converter has expressed this step the rewritten way since
2026-08-30, and the step is 6.06% of that tier's forward pass, which caps any
work on it at **1.06×**.

**No other Android device has been measured** and no figure is projected for
one. See [Performance](/sdk/performance)
and the [Android SDK page](/sdk/android#performance).

### essence-2 lands on Maven Central — both families now have a public Android SDK (2026-09-03)

`ai.bithuman:essence2-android:0.2.0` is published to Maven Central and resolves
anonymously, with no credential. With
`ai.bithuman:expression2-android:0.3.0` (2026-09-02) and
`ai.bithuman:sdk:2.3.6` (essence-1), **the `ai.bithuman` group now lists three
artifacts** and every model the scope ruling puts on the Android lane has a
coordinate that resolves.

```kotlin
implementation("ai.bithuman:essence2-android:0.2.0")   // essence-2, minSdk 29, arm64-v8a
```

**Ship-state, stated plainly.** This artifact ships knowingly under the
2026-08-30 "base offering first" ruling, and two things are below bar:

- it **fails the `PARITY_U8` gate at 2 levels**;
- sustained throughput is **1.63x short of the accepted bar** — a 1,000-second
  Hexagon run reads RTF 0.9959 / 20.08 fps against an accepted RTF 0.61 /
  32.7 fps.

No Gradle project outside bitHuman has been compiled against it yet, and no
render through this artifact's own API has been taken — what is established is
the coordinate, the bytes, the checksum, the declared `minSdk` and the native
payload. **Updated the same day:** the renderer graph it carries has since been
benchmarked on a Snapdragon 8 Elite handset — see the entry above. The [Android SDK page](/sdk/android) carries the
measurements and both negative controls.

**FFmpeg / LGPL.** The AAR links FFmpeg 7.1 statically, so LGPL-2.1 **§6(a)**
applies, and the relink materials are published beside the AAR at a
`repo1.maven.org` URL baked into the shipped `META-INF/NOTICE.txt`. The kit has
15 entries — the object archive, the real link command, and FFmpeg's complete
corresponding source. Every claim about it is checkable from the published
bytes: [FFmpeg / LGPL — the Android relink offer](/legal/android-ffmpeg-lgpl).
`expression2-android` carries no FFmpeg and needs no such offer.

### CLI `2.5.1` — macOS and Linux back on one version (2026-09-03)

`cli-v2.5.1` publishes **both** `aarch64-apple-darwin` and
`x86_64-unknown-linux-gnu`. The 2.5.0 split — where macOS moved ahead and
Linux was stuck three releases back on `cli-v2.4.2` — is closed, and **the
`BITHUMAN_VERSION=cli-v2.4.2` pin this site used to recommend on Linux should
be dropped**. The unpinned universal installer is now correct on both.

`pull --model <family>` is in the Linux build too; the note saying it was
macOS-only is withdrawn.

**Still not published, and never has been:** `x86_64-apple-darwin` (Intel Mac)
and, since `cli-v2.3.27`, `aarch64-unknown-linux-gnu` (Linux ARM). On those two
targets `install.sh` resolves a download that 404s and exits 1. See
[Downloads](/sdk/cli) for the four-target probe.

**`bithuman render` is unchanged and still limited**: `rc=0` for expression-2,
**`rc=69` for essence-2** — the shipped `lib/libonnxruntime.so.1` is built at
`VERS_1.20.1` while every `lible_core.so` requires `VERS_1.26.0`, so **copying
a file in does not fix it** — and `rc=70` for essence-1. Details and the
controls: [what the CLI actually does](/sdk/cli/reference).

### CLI `2.5.0` — `bithuman pull --model`, and the first signed macOS tarball (2026-09-02)

`bithuman pull <CODE> --model <FAMILY>` gives the CLI a door to something the
download endpoint has always had. Before it, `bithuman pull <CODE>` could only
hand you the agent's **birth** model, so an agent created as one family and
later given another returned the first one silently, with nothing saying another
family existed.

- **`--model <FAMILY>`** is forwarded verbatim; the endpoint owns the vocabulary
  and answers an unknown name with a `400` naming the accepted set.
- **The no-flag path now names the families it did not hand you**, read off the
  download response's own headers — no second request. `--json` gains
  `other_models` and `model_source`; a missing header leaves `other_models`
  **absent**, never `[]`.
- `--model` on a showcase slug is **refused** (exit 66) rather than silently
  ignored.
- `bithuman list --mine` and `bithuman auth status` verify against the platform
  API, and `serve` tells the brain when audio finishes **playing**, not only
  when it is cut off.

`cli-v2.5.0` was also the first Developer ID signed and notarized macOS tarball.
It shipped **macOS only**; Linux caught up a day later in
[`cli-v2.5.1`](#cli-251--macos-and-linux-back-on-one-version-2026-09-03).

### Expression 2 self-hosting on Linux is fail-open, by owner ruling (2026-09-02)

The rebuilt Linux engine that ships inside CLI 2.5.1
(`engines/linux-x64-1.0.0.engine`) has metering **enforcement off**. A render
with no credential **proceeds**, behind a `★ UNMETERED RENDER` banner on
stderr; the meter is still running and still beats wherever a credential exists.

This was deliberate. The engine's own source carries the ruling: shipping the
LGPL remediation fail-closed *"would have switched billing on for every
existing self-hoster at the moment they upgraded, with no notice — a pricing
change riding in on a licence fix."* Both switches (`ENFORCE_DEFAULT` and its
twin `METER_ENFORCE_DEFAULT`) read `False` in the shipped bytes.

**Scope: expression-2 only.** The engine declares `PRODUCT = "expression-2"`,
and essence-2's `bithuman.tessera_offline` **stays fail-closed** — no
credential there still raises `MeteringNotArmedError` and produces no frames.
Enforcement is expected to return; treat unmetered rendering as a grace period,
not a price.

### Essence 2's head upsample is rebuilt — a CPU-tier speedup, same picture (2026-09-02)

> **Corrected 2026-09-02.** The first version of this entry said the Apple tier
> serves the *previous* head upsample. It does not: that tier's CoreML build
> already expressed the step the rewritten way. The Apple row below is the
> measured replacement.

Essence 2's **head-upsampling step** has been rebuilt. It is an internal graph
change: the API, the session contract, the `?model=` tier slugs and the price
are unchanged, there is nothing to opt into, and the picture is the same — the
new and previous builds agree to **167.85 dB** PSNR on the same identity and the
same frames, below one step of an 8-bit pixel, and the change was reviewed side
by side on video before it was accepted.

It **rolls out per identity**, the way the 2026-07-27 renderer change did: an
identity picks it up when its bundle is rebuilt, and serves the previous build
until then. **The first identity was served on 2026-09-02.** One identity is not
a fleet: most identities are still on the previous build.

**The speedup is a CPU-tier speedup, and only a CPU-tier speedup.** The step it
replaces is **68.6%** of the forward pass under the ONNX Runtime **CPU**
execution provider and **0.48%** of it on **CUDA**, so the gain does not
transfer:

- **CPU** (Threadripper PRO 5955WX, ORT CPU provider, batch 24, 4 threads,
  sustained, no throttling): **3.00×** on the model step; the full delivered
  path goes **7.54 → 23.87 fps**. Still short of 25 fps — that tier remains an
  offline and last-resort tier.
- **GPU** (RTX 4090, ORT CUDA provider, batch 24, as the deployed worker is
  configured): **0.971×, about 3% slower**, against a 0.083% noise floor. No
  gain, and none should be expected. The absolute cost there — 1075 fps before,
  1044 fps after on that step — is far enough above a session's 25 fps that the
  difference is not observable.
- **Apple** (M4 Max on the serving host, CoreML, GPU compute, batch 1, fp32,
  cooled and unthrottled): **no gain — the step was already built this way
  there.** The rebuilt graph is genuinely not shipped to that tier, but its
  CoreML converter has expressed this step as the same padded 5×5 depthwise
  convolution plus pixel shuffle since before the rollout began, so the change
  is not a change there. That step costs **6.06%** of the forward pass on that
  tier (renderer model 1.834 ms/frame, 545 fps, 0.36% noise floor), which caps
  any further work on it at **1.06×**. Batch 1, so not comparable with the
  batch-24 rows above.
- **Browser-local**: not measured.

See
[The renderer](/concepts/essence-2#what-it-is).

### The "Apple Neural Engine" tier is renamed **Apple**, and a false performance claim is withdrawn (2026-09-02)

Essence 2's cloud Apple tier was documented as the **Apple Neural Engine**
tier, with a per-frame throughput figure attached and attributed to every
operation in the graph running on the Neural Engine. That attribution was
wrong, so the number went with it.

**What is true.** The tier runs on Apple Silicon Macs through **CoreML**, and
every serving worker on those hosts binds the **GPU** compute unit — verified
on the production hosts on 2026-09-02. The Neural Engine is not off-limits: on
a minority of identities the renderer resolves to a half-precision graph the
Neural Engine accepts and runs there. Measured head to head, it was about
**2.2× slower** than the Metal GPU *and* slightly further from the reference
picture, so the GPU is not a fallback — it is the fastest and most faithful
unit on that machine. Both "it runs on the Neural Engine" and "it can never
touch the Neural Engine" are false; the page now says the measured thing.

**No replacement number is published.** The withdrawn figure was a
model-in-isolation reading that a live session never sees, and the per-model,
per-compute-unit protocol used for Essence 2's CPU table has not been run for
the Apple or GPU tiers. Picking one of the figures in circulation is what
produced the error, so the page says so instead. See
[Serving tiers](/concepts/essence-2#serving-tiers).

**Expression 2 is the opposite case, and is now documented separately.** Its
Apple members are exported at half precision and CoreML's own per-operation
compute plan places **84–100%** of their operations on the Neural Engine — none
on the GPU. The two models share the word "Apple" and the historical `-ane`
slug and nothing else. See
[Serving tiers](/concepts/expression-2#serving-tiers).

**Nothing you can write changed.** `essence-2-ane`, `expression-2-ane`, the
`?model=` force slugs, saved links and every API field keep working exactly as
before. Only the prose name of the tier changed, from "Apple Neural Engine" to
"Apple".

### Linux wheels restored for `bithuman` 2.10.0 (2026-09-02)

2.10.0 was published for macOS first and carried **no Linux files for about a
day**, so between 2026-09-01 and 2026-09-02 `pip install bithuman` on Linux
silently resolved to the previous release, **2.9.0**. All ten Linux wheels
(cp310–cp314 × `manylinux_2_28` x86_64 and aarch64) are on PyPI now, published
from the same measured build as the macOS wheels. If you installed in that
window, run `pip install -U bithuman` and check `bithuman.__version__`. See
[Downloads](/downloads).

## August 2026

### `409 MODEL_NOT_GENERATED` now tells you how to fix it (2026-08-17)

The model gate used to state the problem and stop — `"agent <code>'s
expression-1 model hasn't been generated yet"` — which read as *"this agent
can't do that model"*. It can. Every 409 now names the remedy: the exact
[model-add](/api/agents#add-a-model-to-an-existing-agent) call and its cost when
the agent qualifies, or the missing asset when it doesn't. `expression-1` is the
clearest case and got its own wording (*"isn't enabled on this agent yet"*):
nothing is ever trained for it, so **any** agent with an image and a voice —
including an Essence 1 agent — enables it with one free, instant call and can
then render Expression 1 talking videos immediately. See
[Using Expression 1 on an existing agent](/api/agents#using-expression-1-on-an-existing-agent).
Same gate, same 409, same "before any charge" guarantee — only the message
changed.

### Essence 2 self-hosted — offline CPU rendering ships in Python SDK 2.9.0 (2026-08-02)

The `essence-2` model now **self-hosts on your own CPU servers**. Python SDK
**2.9.0** (Linux x86_64 and aarch64, Python 3.10–3.14) adds
`bithuman.tessera_offline` — install the **`bithuman[tessera]`** extra and
render the downloaded `.lebundle.imx` to frames or an mp4 entirely on
your hardware, no GPU required, teeth-refinement stage included. Measured
end-to-end: **~22–31 FPS on a 16-core desktop** (the higher band when the
bundle carries the CPU acceleration member). The runtime ships **together with
its metering**: a valid `BITHUMAN_API_SECRET` is required, sessions bill at
the self-hosted rate (2 credits/min), and without a key the renderer is
fail-closed — zero frames. Live streaming from your own server still runs
through the cloud. Quickstart:
[Self-hosted → Essence 2](/sdk/python).

Earlier entries — July 2026 back to January 2026 — are on the [changelog archive](/changelog/archive).

> **Note** Feature requests and bugs: [GitHub](https://github.com/bithuman-product/homebrew-bithuman/issues) and [Discord](https://discord.gg/ES953n7bPA). See the full [community guide](/community).

