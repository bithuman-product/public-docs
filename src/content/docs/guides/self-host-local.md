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
into one claim. Verified 2026-09-02.

| Your platform | What renders locally | Surface | State |
|---|---|---|---|
| **Linux x86_64 / aarch64** | [Essence 2](/concepts/essence-2) — offline CPU render of a whole audio clip | [Python SDK](/sdk/python) `bithuman` 2.10.0 | Works, with [one prerequisite you must ask us for](#the-audio-encoder-is-not-in-the-wheel) |
| **Linux x86_64** | [Expression 2](/concepts/expression-2) — live and offline render | [CLI](/sdk/cli/overview) 2.5.1 | Engine ships in the CLI — what renders and what exits non-zero: [what the CLI actually does](/sdk/cli/verified) |
| **macOS Apple Silicon** | Expression 2 — live render, out of the box | CLI 2.5.0 via Homebrew | Works |
| **macOS Apple Silicon** | Essence 2 — offline CPU render | Python SDK 2.10.0 | Works, same prerequisite as Linux |
| **macOS Apple Silicon** | Expression 2 — on-device in your own app | [Swift SDK](/sdk/swift) `Expression2` | Engine only — [no model bundle is published](#ios-and-macos-in-your-own-app) |
| **iOS** | Expression 2 — on-device in your own app | Swift SDK `Expression2` | Builds and runs on a device you sign yourself; no model bundle, so nothing renders yet |
| **Android** | [Essence 1](/concepts/models) — on-device | [Android SDK](/sdk/android) `ai.bithuman:sdk:2.3.6` | Works |
| **Android** | [Expression 2](/concepts/expression-2) — on-device | [Android SDK](/sdk/android) `ai.bithuman:expression2-android:0.3.0` | Resolves anonymously from Maven Central — limits on the [Android SDK page](/sdk/android) |
| **Android** | Essence 2 | — | No artifact you can resolve — [see below](#android) |

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
  [Python SDK → Metering](/sdk/python#7-metering--what-you-see-in-each-credential-state).
- **Essence 2 live streaming is not self-hostable.** Only whole-clip offline
  rendering is. Live sessions run through the cloud — see
  [LiveKit](/guides/deploy-livekit).

---

## Linux

The Python SDK is the verified local-render path on Linux. Everything below was
run end to end on Linux x86_64 with Python 3.14 against the wheel PyPI serves.

### 1. Install the SDK

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install bithuman
```

Python 3.10–3.14, `manylinux_2_28` (glibc), x86_64 and aarch64. On x86_64 with
Python 3.14 this resolves
`bithuman-2.10.0-cp314-cp314-manylinux_2_28_x86_64.whl` (21.7 MB). Confirm:

```bash
python -c "import bithuman; print(bithuman.__version__)"
# 2.10.0
```

> **Check the version, don't assume it.** 2.10.0 was published for macOS on
> 2026-09-01 and for Linux on 2026-09-02. Installs on Linux in that window
> silently resolved 2.9.0, because pip picks the newest release that has a file
> for your platform — not the newest release. If you see 2.9.0, run
> `pip install --upgrade bithuman`.

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
print(stats["frames"], stats["fps"], stats["borrow_state"])
```

A 15-second clip produced 375 frames and a playable MP4. For frame-level
control, `OfflineTesseraRenderer(imx_path, api_secret=...).render(audio,
on_frame=callback)` hands you RGB numpy frames as they are produced.

### 5. Confirm the mouth-interior stage actually ran

Essence 2's sharp mouth interior comes from four **optional** members inside the
artifact. Not every published bundle carries them, and one that does not
**still renders successfully** — it just renders the mouth the earlier,
softer way. Nothing in the output tells you by looking.

**Before you render**, list the members:

```bash
bithuman info A24EKJ8433.lebundle.imx | grep tessera
#     tessera_bank.v1.json
#     tessera_bank.v1.mp4
#     tessera_head.v1.json
#     tessera_head.v1.pt
```

All four must be present. **After you render**, gate on `borrow_state`:

| `borrow_state` | Meaning |
|---|---|
| `borrowed` | The refinement stage ran on every frame. This is the good case. |
| `partial` | It ran on some frames; `stats["tessera"]["unborrowed_rate"]` gives the fraction it did not. |
| `synthesized` | The stage was available but did not run. |
| `absent` | The bundle has no such members — `borrow_reason` reads `no-tessera-members`. |
| `unknown` | The renderer could not determine it. |

★ **A frame count is not a verdict.** A bundle missing the members returns a
perfectly healthy-looking `{"frames": 375}` alongside
`{"borrow_state": "absent", "borrow_reason": "no-tessera-members"}`. Assert on
`borrow_state`, not on the frame count:

```python
assert stats["borrow_state"] == "borrowed", stats["borrow_reason"]
```

If a bundle comes back `absent`, contact us — the artifact needs rebuilding;
there is nothing to configure on your side.

### Tuning

| Env | Default | Purpose |
|---|---|---|
| `BITHUMAN_TESSERA_CPU_TIER` | `fast` | `reference` = the slower fp32 parity tier |
| `BITHUMAN_TESSERA_TORCH_THREADS` | ~half the cores (≤12) | torch intra-op pool; oversubscribing thrashes |
| `BITHUMAN_TESSERA_PIPELINE` | `1` | producer/consumer pipelined render; `0` disables |
| `BITHUMAN_TESSERA_DIRECTOR` | `auto` | `ts`/`onnx` pins the director backend |

### The Linux CLI, alongside the Python route

The CLI installs on Linux x86_64 with the unpinned one-liner — run here on
2026-09-02 it resolved `cli-v2.5.1`, verified the sha256 and exited **0**,
staging the Expression 2 render host beside the binary:

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

Use it for `login`, `list`, `pull` and `info` — `bithuman info <file> | grep
tessera` is the quickest way to read an artifact's members. Which families
`render` can and cannot produce an MP4 for on Linux, with each command's real
exit code, is on [what the CLI actually
does](/sdk/cli/verified); Linux aarch64 is **not** published for `cli-v2.5.1`
— see [installing the CLI](/sdk/cli/install).

**Essence 2 has no offline `render` in the CLI.** Handing `bithuman render` a
`.lebundle.imx` on Linux exits **69** — the CLI ships no `lible_core.so`, the
native runtime that owns the teeth borrow:

```text
error: could not load lible_core.so (the native essence-2 runtime that owns the
TESSERA teeth borrow). Tried: …/.local/bin/lible_core.so; …/.bithuman/lib/lible_core.so
```

That is what the Python route above is for: it is the supported way to get an
Essence 2 MP4 on your own hardware, and it is the only route that reports
whether the mouth interior was
[borrowed](/sdk/python#6-prove-the-borrow-gate-fires).

---

## macOS (Apple Silicon)

### The CLI — the fastest way to see an avatar render

```bash
brew tap bithuman-product/bithuman
brew install bithuman-cli
bithuman doctor
```

macOS 14+ on Apple Silicon (arm64). This installs **CLI 2.5.0**, which is the
first macOS release **signed with a Developer ID certificate under the hardened
runtime** and submitted for Apple notarization. That matters if you download the
tarball directly rather than through Homebrew: every build up to and including
2.4.2 was ad-hoc signed, so a browser-downloaded copy was quarantined and macOS
killed it on launch with no message (exit 137). Homebrew installs were never
affected — it fetches with `curl`, which sets no quarantine flag.

The macOS tarball ships the Expression 2 render engine beside the binary, so the
free Wise Pup avatar renders with no extra download:

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

> **`--model` is 2.5.0 and later, which is macOS only.** The newest CLI carrying
> a Linux binary is 2.4.2, whose `pull` has `--force`, `--dest` and `--manifest`
> and no family flag. On Linux, select a family with `?model=<family>` on the
> [download endpoint](/api/agents#download-an-agents-model) instead.

> **The macOS CLI carries no Essence 2 engine.** That is deliberate, not an
> oversight — the available Essence 2 slices do not meet the mouth-interior bar
> and are refused at packaging time. `bithuman run` on an Essence 2 bundle exits
> `UNSUPPORTED_MODEL_FAMILY` (69). Render Essence 2 on macOS through the Python
> SDK route below.

### Essence 2 offline rendering on macOS

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
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.5.0")
.product(name: "Expression2", package: "homebrew-bithuman")
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

The [increased-memory entitlement is mandatory](/sdk/swift#permissions--entitlements)
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

**Expression 2 is also on Maven Central**, as of 2026-09-02:

```kotlin
dependencies { implementation("ai.bithuman:expression2-android:0.3.0") }
```

`arm64-v8a`, minSdk 26. Both coordinates resolve anonymously — verified here
by fetching them directly, with `ai.bithuman:essence2-android` as the negative
control (**HTTP 404**: it is not published). Coordinates, the resolving Gradle
snippet and the measured limits are on the [Android SDK
page](/sdk/android); the scripts and their controls are on [verifying the
Android SDK](/sdk/android-verify).

**What you cannot resolve:** an Essence 2 AAR. Reach Essence 2 on Android
through the cloud — the [REST API](/api/overview), a
[LiveKit](/sdk/livekit) session, or the agent landing page in a WebView.

---

## Where to go next

- [Python SDK](/sdk/python) — the full streaming and offline API.
- [Self-hosted Expression GPU](/guides/deploy-self-hosted) — the NVIDIA Docker
  path for Expression 1, and the Essence 2 CPU reference.
- [Self-hosted Essence 2 Max](/guides/deploy-essence-2-max) — the hand-delivered
  GPU container.
- [Pricing](/guides/pricing) — self-hosted credit rates and metering.
