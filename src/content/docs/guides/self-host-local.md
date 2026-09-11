---
title: "Run a model on your own hardware"
description: "Per-platform self-hosting: install the SDK, download a model artifact, and render it locally on Linux, macOS, Android, or iOS — with the real prerequisites and the exact errors you hit when one is missing."
section: guides
group: "Deploy"
order: 9
---

## What actually runs locally

Self-hosting means the render happens on your machine. Not every platform is at
the same place, and this page says which is which rather than averaging them
into one claim. Verified 2026-09-02; the CLI rows re-verified 2026-09-10 on the release
current that day — [the CLI page](/sdk/cli) is the one writer for the CLI
version and the install line.

| Your platform | What renders locally | Surface | State |
|---|---|---|---|
| **Linux x86_64 / aarch64** | [Essence 2](/concepts/essence-2) — offline CPU render of a whole audio clip | [Python SDK](/sdk/python) `bithuman` 3.0.0 | Works; the shared audio encoder is [fetched for you](/sdk/python#run) as of 3.0.0 (the 2.10.0 transcript below still asks you for it) |
| **Linux x86_64** | [Expression 2](/concepts/expression-2) and, as of 2.6.1, [Essence 2](/concepts/essence-2) — live and offline render | [CLI](/sdk/cli) | Both runtimes ship in the CLI — what renders and what exits non-zero: [what the CLI actually does](/sdk/cli/reference). Sessions are [metered](#the-cli-meters-a-self-hosted-session) |
| **macOS Apple Silicon** | Expression 2 and, as of 2.6.1, Essence 2 — live and offline render | CLI via Homebrew | Works; the Essence 2 flow was run from the published tarball on a Mac on 2026-09-07. Sessions are [metered](#the-cli-meters-a-self-hosted-session) as of 2.6.2, on wall-clock as of 2.6.3 |
| **macOS Apple Silicon** | Essence 2 — offline CPU render | Python SDK 3.0.0 | Works; same note as Linux |
| **macOS Apple Silicon** | Expression 2 — on-device in your own app | [Swift SDK](/sdk/ios) `Expression2` | Engine only — [no model bundle is published](#ios-and-macos-in-your-own-app) |
| **iOS** | Expression 2 — on-device in your own app | Swift SDK `Expression2` | Builds and runs on a device you sign yourself; no model bundle, so nothing renders yet |
| **Android** | [Essence 1](/concepts/models) — on-device | [Android SDK](/sdk/android) `ai.bithuman:sdk:2.3.6` | Works |
| **Android** | [Expression 2](/concepts/expression-2) — on-device | [Android SDK](/sdk/android) `ai.bithuman:expression2-android:0.4.1` | Resolves anonymously from Maven Central — `arm64-v8a` only ([emulators](#android)); limits on the [Android SDK page](/sdk/android) |
| **Android** | [Essence 2](/concepts/essence-2) — on-device | [Android SDK](/sdk/android) `ai.bithuman:essence2-android:0.5.2` | Resolves anonymously from Maven Central — `arm64-v8a` only ([emulators](#android)); ships a model store; plays the avatar's recorded sequence, no audio-in entry point yet ([Android SDK](/sdk/android#get-a-model)) |
| **iOS / macOS** | Essence 2 — on-device in your own app | [Swift SDK](/sdk/ios#install) `Essence2` (package 2.11.0) | A C interface that builds for iOS device, iOS simulator and macOS; resources published. ★ **Not consumable on a phone yet:** the model the download endpoint returns is not a package this engine opens (measured 2026-09-09), and the engine refuses every iPhone below an iPhone 16 Pro. On a Mac, use the Python wheel below |

Two things to settle before you pick a platform:

- **Self-hosted rendering is billed, and you should set
  `BITHUMAN_API_SECRET`.** Every self-host runtime authenticates it and sends
  a once-per-minute billing heartbeat at the self-hosted rate
  ([pricing](/guides/pricing)). Get a key at
  [Developer → API](https://www.bithuman.ai/#developer). **What happens
  without one differs by model, and the two defaults are opposites**:
  Essence 2's offline route is **fail-closed** — it raises
  `MeteringNotArmedError` at the first frame and renders nothing — while the
  Expression 2 Linux render host is **fail-open** as of the 2026-09-02 engine
  rebuild: it renders, behind a `★ UNMETERED RENDER` banner on stderr, and the
  usage may never reach the ledger. Both states, verbatim, with the exit codes:
  [Python SDK → Metering](/sdk/python#run). The CLI's own
  meter, on both platforms, is described just below.
- **Essence 2 live streaming is not self-hostable.** Only whole-clip offline
  rendering is. Live sessions run through the cloud — see
  [LiveKit](/guides/deploy-livekit).

### The CLI meters a self-hosted session

A self-hosted Essence 2 or Expression 2 session in the CLI — `bithuman run
<code>.imx` and `bithuman render` — is billed at the published self-hosted
rate, **2 credits per minute** ([pricing](/guides/pricing)), on **macOS and
Linux alike** as of `cli-v2.6.2`. Before 2.6.2 only an Expression 2 session
on Linux was metered: an Essence 2 session was not metered on either
platform, and no session was metered on macOS. Downloading a model with
`bithuman pull` is free.

- **A credit minute is what the pricing page says it is** — "wall-clock time
  a session is live and the engine is rendering", idle animation included —
  and an offline `bithuman render` bills the duration of the clip it writes
  ([the definition](/guides/pricing#serving--credits-per-live-minute)). Each
  session writes one usage row; the CLI logs `[selfhost-meter] beat seq=N
  served=…s product=<family> delivered` once a minute and once at the end.
- **`cli-v2.6.3` bills a live session on wall-clock**, which is what the
  pricing page has always defined. `cli-v2.6.2` counted frames delivered ÷
  fps instead, so it under-counted a `bithuman run` preview on a machine
  whose engine paints below nominal fps. Measured on 2026-09-07 on an Apple
  Silicon Mac, the published 2.6.2 macOS tarball held a 92 s Essence 2
  session and claimed **8.0 s** of it — one usage row, **0 credits**. The
  published 2.6.3 tarball, same machine, same clip, same key, claimed
  **92.1 s**. Upgrade if you are self-hosting.
- **When the key check does not come back clean — one rule, on every
  runtime, as of `cli-v2.6.4`.** The CLI checks your key with the service
  when a session starts and once a minute while it runs.
  - If the service **cannot be reached** (no network, a timeout, or a 5xx on
    our side), the session renders, prints a loud `★ UNMETERED RENDER` line
    on stderr saying why, and keeps trying. It never stops for this, however
    long it lasts.
  - If the service **rejects the key** (HTTP 401, 402 or 403 — revoked, from
    another environment, or out of credits), the session keeps rendering for
    a **grace of 300 seconds** from the first rejection, prints a line once a
    minute naming the seconds of grace left and the fix, and re-checks the key
    every minute. A key the service accepts again clears the clock. A key
    still rejected at 300 seconds **stops the session**: `run` closes the
    preview and `render` exits `METERING_REFUSED` (77) with no output file.
  - A missing key is unchanged: the session renders and says so.
    `BITHUMAN_METER_ENFORCE=1` refuses a missing or rejected key before the
    first frame instead.

  Before 2.6.4 a rejected key rendered on indefinitely behind the loud line.
  The same rule and the same number apply to the
  [Python package](/sdk/python#run), the
  [Apple engine](/sdk/ios#install) and the
  [Android SDK](/sdk/android#troubleshooting); the [pricing page](/guides/pricing)
  is the authority for what is billed.
- Sign in with `bithuman login` or set `BITHUMAN_API_SECRET` so the session
  is billed to your account.

Verified on the published `cli-v2.6.3` tarballs on 2026-09-07, downloaded
anonymously and run from a fresh home directory on a Linux x86_64 box and on
an Apple Silicon Mac. Each 90 s session landed as exactly one row in the
account's usage ledger, and the seconds the row records are the seconds the
session was live:

| Platform | Session | Held | Recorded |
|---|---|---|---|
| Linux x86_64 | Essence 2 `run` | 92 s | 92.2 s |
| Linux x86_64 | Expression 2 `run` | 92 s | 91.9 s |
| macOS arm64 | Essence 2 `run` | 92 s | 92.1 s |
| macOS arm64 | Expression 2 `run` | 91 s | 91.0 s |
| either | Essence 2 `render`, 5 s clip | — | 5.0 s (0 credits) |
| either | `pull` | — | no row, no meter line |

The published **2.6.2** macOS binary on the same 92 s hold is the control: it
recorded 8.0 s and 0 credits. Credits are charged per whole minute and the
remainder carries to your next session, so a single 92 s session bills 2 and a
5 s render bills 0.

---

## Linux

> **3.0.0 note.** The transcript below was taken on `bithuman` **2.10.0** and
> is kept as it ran. On **3.0.0** the same route is spelled `bithuman.offline`
> with the `bithuman[offline]` extra — the 2.x spellings below still work with
> a `DeprecationWarning` until 4.0.0 — and the audio encoder step is no
> longer yours: it is [fetched and digest-checked for you](/sdk/python#run).
> The two-call surface (`bithuman.open` / `avatar.render`) is on the
> [Python SDK page](/sdk/python).

The Python SDK is the verified local-render path on Linux. Everything below was
run end to end on Linux x86_64 with Python 3.14 against the wheel PyPI serves.

### 1. Install the SDK

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install bithuman
```

Python 3.10–3.14, `manylinux_2_28` (glibc), x86_64 and aarch64. On x86_64 with
Python 3.14 this resolves
`bithuman-3.1.2-cp314-cp314-manylinux_2_28_x86_64.whl` (20.9 MB). Confirm:

```bash
python -c "import bithuman; print(bithuman.__version__)"
# 3.1.2
```

> **Check the version, don't assume it.** pip picks the newest release that has
> a file for *your* platform, which is not always the newest release — so read
> the number back rather than assuming the upgrade happened.

### 2. Get a model artifact

An Essence 2 artifact is a `<code>.lebundle.imx` file tied to one agent
(`lebundle` is a [legacy name kept for compatibility](/concepts/avatars-imx#second-generation-artifacts), not a product name —
the model is `essence-2`). Two ways to get one:

```bash
# CLI (see the installer note below):
bithuman login
bithuman pull A17ZTB0222          # prints the cached path on stdout
```

or the authenticated REST endpoint
[`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model),
which returns a signed URL. The file carries licensed weights — keep it.

### 3. Install the render extras

```bash
pip install "bithuman[tessera]"   # torch + onnx + onnxruntime
```

You also need **`ffmpeg` on `PATH`** — the SDK shells out to it to decode audio
and to encode the MP4.

> **This pulls a CUDA build of PyTorch (~2.5 GB) you do not need.** The extra
> asks for `torch`, and on Linux the default PyPI `torch` drags in the whole
> `nvidia-*` CUDA stack even though this route is CPU-only. To keep the
> environment small, install the CPU build first:
>
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> pip install "bithuman[tessera]"
> ```

### The audio encoder is not in the wheel

★ **This is the prerequisite that will stop you.** The render calls a shared
speech encoder — a ~377 MB ONNX file — that is **not inside the model artifact
and not inside the wheel**, and **the SDK will not download it for you**. On a
machine that does not already have it, the render fails at construction:

```text
bithuman.tessera_offline.TesseraOfflineError: shared audio encoder
(wav2vec2 fp32 8s, ~377MB) not found — set BITHUMAN_W2V_ONNX, or provision
the dependency store (~/.bithuman/deps, asset id audio-encoder-fp32).
```

The SDK looks in two places, in this order:

1. `$BITHUMAN_W2V_ONNX` (or `$W2V_ONNX`) — a path to the file.
2. The per-host dependency store `~/.bithuman/deps` (override with
   `$BITHUMAN_DEPS_DIR`), matching asset id `audio-encoder-fp32` in its
   `index.json`.

**There is no self-serve download for this asset.** No CLI subcommand fetches
it, no public URL is published, and no install step provisions it. Until one
exists, ask us for it: email
[hello@bithuman.ai](mailto:hello@bithuman.ai) and say you are self-hosting
Essence 2 on CPU. Then point the SDK at the file:

```bash
export BITHUMAN_W2V_ONNX=/path/to/audio-encoder-fp32.onnx
```

The encoder is identity-agnostic — one copy serves every agent on the host.

### 4. Render

```python
import os
from bithuman.tessera_offline import render_offline

stats = render_offline(
    "A24EKJ8433.lebundle.imx",   # the downloaded Essence 2 artifact
    "speech.wav",                # any format ffmpeg reads; resampled to 16 kHz
    out_mp4="rendered.mp4",
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
print(stats["frames"], stats["fps"])
```

A 15-second clip produced 375 frames and a playable MP4. For frame-level
control, `OfflineTesseraRenderer(imx_path, api_secret=...).render(audio,
on_frame=callback)` hands you RGB numpy frames as they are produced.

### 5. What a successful render does and does not tell you

If `render_offline` returns you have a complete, playable MP4: `stats["frames"]`
is the frame count, and the file is the length you asked for.

What it does not tell you is which mouth interior you got. Not every published
Essence 2 artifact was built with the current, sharper one. An older bundle
still renders, and it renders the earlier, softer mouth at the **same frame
count, same resolution and same duration, with no warning and no error** —
nothing in the numbers separates the two.

If a render comes back softer around the mouth than the samples on
[Essence 2](/concepts/essence-2), the artifact needs rebuilding on our side:
send us the agent code at [hello@bithuman.ai](mailto:hello@bithuman.ai). There
is nothing to configure on yours.

### Tuning

| Env | Default | Purpose |
|---|---|---|
| `BITHUMAN_TESSERA_CPU_TIER` | `fast` | `reference` = the slower fp32 parity tier |
| `BITHUMAN_TESSERA_TORCH_THREADS` | ~half the cores (≤12) | torch intra-op pool; oversubscribing thrashes |
| `BITHUMAN_TESSERA_PIPELINE` | `1` | producer/consumer pipelined render; `0` disables |
| `BITHUMAN_TESSERA_DIRECTOR` | `auto` | `ts`/`onnx` pins the inference backend |

### The Linux CLI, alongside the Python route

The CLI installs on Linux x86_64 with the unpinned one-liner — run here on
2026-09-07 it resolved `cli-v2.6.3`, verified the sha256 and exited **0**,
staging the Expression 2 render host beside the binary and, since 2.6.1, the
Essence 2 runtime with it:

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

**Essence 2 renders offline in the CLI as of 2.6.1**, on Linux x86_64 and on
macOS Apple Silicon — so the Python route above is one of two ways to get an
Essence 2 MP4 on your own hardware, not the only one:

```bash
bithuman login                                              # the first play checks the licence with the cloud
MODEL=$(bithuman pull <YOUR_AGENT_CODE> --model essence-2)  # → <code>.imx, path on stdout
bithuman render "$MODEL" -a speech.wav -o out.mp4           # exit 0; 5 s of audio → 125 frames at 25 fps
```

The first Essence 2 render on a machine downloads the shared audio encoder
(~377 MB, once, checked by content digest) into
`~/.bithuman/engines/essence-2/` — the same encoder the Python route fetches,
kept separately under `~/.bithuman/deps` — and reuses it after that. No
environment variable, nothing staged by hand. An incomplete model file (a
required member missing) is refused with **exit 69** and no output file; the
CLI never substitutes a generated mouth. `bithuman info <file>` lists an
artifact's members if you want to see what you were handed. Each command's
real exit code is on [what the CLI actually does](/sdk/cli/reference); Linux
aarch64 is **not** published for `cli-v2.6.3` — see
[installing the CLI](/sdk/cli).

---

## macOS (Apple Silicon)

### The CLI — the fastest way to see an avatar render

```bash
brew tap bithuman-product/bithuman
brew install bithuman-cli
bithuman doctor
```

macOS 14+ on Apple Silicon (arm64). This installs the current CLI release
([which version that is](/sdk/cli/reference#version)), **signed with a
Developer ID certificate under the hardened runtime** and notarized by Apple,
as every macOS release since 2.5.0 has been. That matters if you download the
tarball directly rather than through Homebrew: every build up to and including
2.4.2 was ad-hoc signed, so a browser-downloaded copy was quarantined and macOS
killed it on launch with no message (exit 137). Homebrew installs were never
affected — it fetches with `curl`, which sets no quarantine flag.

The macOS tarball ships the Expression 2 render engine beside the binary, so the
free Wise Pup avatar renders with no extra download — and, since 2.6.1, the
Essence 2 runtime as well:

```bash
bithuman run
```

**Choosing a model family — new in 2.5.0:**

```bash
bithuman pull <CODE>                    # the server's default family
bithuman pull <CODE> --model essence-2  # ask for a specific family
```

Plain `pull` also names the families it did **not** hand you, and why you got
the one you got. Before 2.5.0 `pull` could only return an agent's *birth* model,
so an agent born Essence 1 and later given another family was unreachable from
the CLI.

> **`--model` is 2.5.0 and later — and as of `cli-v2.5.1` that includes Linux.**
> This note previously said the flag was macOS-only because the newest CLI with
> a Linux binary was 2.4.2. **2.5.1 publishes both targets**, and `--model` is
> present in the Linux build: `bithuman pull <slug> --model essence-2` is parsed
> and refused on its meaning (`rc=66`), where an unknown flag exits `rc=2`.
> The `?model=<family>` form on the
> [download endpoint](/api/agents#download-an-agents-model) still works and is
> the right route from anything that is not the CLI.

> **The macOS CLI carries the Essence 2 runtime as of 2.6.1.** Until 2.6.0 it
> did not, and `bithuman run` on an Essence 2 file exited 69. Now the same
> three commands work on a Mac as on Linux — run from the published tarball on
> an Apple Silicon Mac with a fresh home directory on 2026-09-07:
>
> ```bash
> MODEL=$(bithuman pull <YOUR_AGENT_CODE> --model essence-2)   # → <code>.imx
> bithuman render "$MODEL" -a speech.wav -o out.mp4            # exit 0; 5 s → 125 frames at 25 fps
> bithuman run "$MODEL"                                        # local server, HTTP 200
> ```
>
> The first render fetches the shared audio encoder (~377 MB, once) into
> `~/.bithuman/engines/essence-2/`; the first play checks the licence with the
> cloud, so sign in first. An incomplete model file is refused with exit 69
> and no output. As of 2.6.2 the session is
> [metered](#the-cli-meters-a-self-hosted-session) on macOS as on Linux —
> before 2.6.2 no Essence 2 session was metered on either platform — at the
> self-hosted rate by wall-clock, and the download is free.

### Essence 2 offline rendering on macOS, with the Python SDK

Identical to [the Linux route](#4-render), including the
[audio-encoder prerequisite](#the-audio-encoder-is-not-in-the-wheel).

> **Use 2.10.0 or later on macOS.** This route calls a native library,
> `lible_core`, that macOS wheels did not ship until 2.10.0 — every macOS wheel
> up to and including 2.9.0 carried the Python half alone and raised
> `lible_core.so not found` at the first frame. The Linux wheels have carried it
> since 2.8.1. macOS wheels are arm64 and macOS 14+; there is no Intel wheel.

---

## iOS and macOS, in your own app

The Swift package is public and resolves anonymously:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")
.product(name: "Expression2", package: "homebrew-bithuman")   // or "Essence2" — see the Swift SDK page
// ★ not both: Expression2 + Essence2 in one app is 116 duplicate symbols at an
//   app's final link on a device. Measured; see the Swift SDK page.
```

`Expression2` ships `macos-arm64`, `ios-arm64` and `ios-arm64-simulator` slices.
Depend on `Expression2` **alone** — also declaring the source
`BithumanEngineProtocol` product fails to link.

**What you can do on iOS:** build the package into your own app and run it on
your own device with your own development signing. The `ios-arm64` slice has
been exercised end to end — a consumer app using only the public API rendered
117 frames at 416×720 on an iPhone 15, every frame distinct, with a forced-black
control arm failing beside it.

**What you cannot do yet:** get a picture out of it without a model. `Expression2`
is the **engine only — it ships no weights**. `Expression2Engine()` takes no
model path; it looks for a per-identity CoreML bundle as a directory of
`.mlpackage` members in `$BITHUMAN_EXPRESSION2_DIR` or your app bundle, and
`isReady` stays `false` until it finds one. **No bundle in that form is
published**, and the `<code>.avatar` you can download is a packed container on a
different rail with no supported way to convert it. Ask us:
[hello@bithuman.ai](mailto:hello@bithuman.ai).

**There is no TestFlight or App Store build**, and iOS support is not promoted
past compiles-only. Treat iOS as proven-capable and unshipped.

The [increased-memory entitlement is mandatory](/sdk/ios#run)
on iOS — without it the OS kills your app mid-conversation. Request it before
you start; Apple takes 1–3 business days.

---

## Android

**What you can resolve today** is the Essence 1 on-device runtime, from Maven
Central:

```kotlin
dependencies { implementation("ai.bithuman:sdk:2.3.6") }
```

`arm64-v8a` only, minSdk 29. It runs a single self-contained `<code>.imx` and
bundles its own audio encoder, so a stock Essence 1 model needs no extra assets.
Full setup on the [Android SDK page](/sdk/android).

**Expression 2 is also on Maven Central**, published 2026-09-02 and **currently
`0.4.1`**:

```kotlin
dependencies { implementation("ai.bithuman:expression2-android:0.4.1") }
```

**Essence 2 is on Maven Central too** — since 2026-09-03, and **currently `0.5.2`**:

```kotlin
dependencies { implementation("ai.bithuman:essence2-android:0.5.2") }   // 0.2.0 through 0.5.1 resolve too — use none of them
```

`arm64-v8a`, minSdk 29.

> ### ★ Every bitHuman AAR is `arm64-v8a` only — the default emulator will not run it
>
> All three coordinates ship **one** ABI slice. `essence2-android:0.5.2` carries
> `lible_jni.so`, `libonnxruntime.so` and `libc++_shared.so` under
> `jni/arm64-v8a/` and **nothing else**; `expression2-android:0.4.1` carries
> `libexpr2jni.so` and `libLiteRt.so`, also `arm64-v8a` only. Both read out of
> the published AARs on 2026-09-11.
>
> An AVD created from an **x86_64** system image resolves the dependency, builds
> and installs — the failure is not at resolve time — and then throws
> **`java.lang.UnsatisfiedLinkError`** the first time the SDK calls
> `System.loadLibrary`, because there is no slice in the APK for that ABI.
>
> Use a **physical arm64 device**, or an emulator created from an **`arm64-v8a`
> system image** (native on an Apple Silicon Mac; slow under full emulation on
> x86_64 hosts). There is no x86_64 slice to fall back to, so
> `abiFilters += "arm64-v8a"` in your `defaultConfig` only makes the failure
> arrive at build time instead of at run time — it does not create one.

All three coordinates resolve anonymously — verified
here by fetching them directly, with `ai.bithuman:libelevate-android` as the
negative control (**HTTP 404**: it was never published). ★Older revisions of
this page used `essence2-android` as that negative control; it now returns
**200**, so a probe still expecting 404 there will read as broken. Coordinates,
the resolving Gradle snippet and the measured limits are on the [Android SDK
page](/sdk/android); the scripts and their controls are on [verifying the
Android SDK](/sdk/android).

**What is not verified for Essence 2:** no outside Gradle project has been
compiled against the AAR and no on-device figure has been taken — only the
coordinate, bytes, checksum and native payload.

---

## Where to go next

- [Python SDK](/sdk/python) — the full streaming and offline API.
- [Self-hosted Expression GPU](/guides/deploy-self-hosted) — the NVIDIA Docker
  path for Expression 1, and the Essence 2 CPU reference.
- [Pricing](/guides/pricing) — self-hosted credit rates and metering.
