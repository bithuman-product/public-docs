---
title: "Run a model on your own hardware"
description: "Self-hosting per platform: install, get a model, render it on your own Linux or macOS machine with the CLI or the Python SDK, and where the Android and iOS SDKs pick up."
section: guides
group: "Deploy"
order: 9
---

## What runs locally

Self-hosting means the render happens on your machine. Each platform has one
supported route; this page walks the Linux and macOS ones and hands off to the
Android and iOS SDK pages for the phones.

| Your platform | What renders locally | Surface |
|---|---|---|
| Linux x86_64, macOS Apple Silicon | [Essence 2](/concepts/essence-2) and [Expression 2](/concepts/expression-2) — live in your browser, or a whole clip to an MP4 | [CLI](/sdk/cli) |
| Linux x86_64 / aarch64, macOS Apple Silicon | Expression 2 live frames, and an Essence 2 clip to an MP4 on the CPU | [Python SDK](/sdk/python) `bithuman` 3.1.3 with the `[offline]` extra |
| Android (`arm64-v8a`) | Expression 2 — on-device in your own app (an Essence 2 coordinate, `essence2-android:0.5.3`, resolves; no walkthrough is published yet) | [Android SDK](/sdk/android) |
| iOS | Expression 2 — on-device in your own app | [Swift SDK](/sdk/ios) |

Two things to settle before you start:

- **A self-hosted render is billed at the self-hosted rate** ([pricing](/guides/pricing)),
  so sign in with `bithuman login` or export `BITHUMAN_API_SECRET` — get a key at
  [Developer → API keys](https://www.bithuman.ai/developer/api-keys). Downloading a model is free.
- **Essence 2 live streaming is not self-hostable.** Only whole-clip rendering
  is; live sessions run through the cloud — see [LiveKit](/guides/deploy-livekit).

## Linux and macOS

Four steps from an empty machine to a rendered MP4. Published for macOS Apple
Silicon and Linux x86_64.

### 1. Install

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

`bithuman render` writes the MP4 through `ffmpeg` — `brew install ffmpeg` on macOS, `sudo apt install -y ffmpeg` on Linux.

On a Mac, `brew install bithuman-product/bithuman/bithuman-cli` installs the
same build. `BITHUMAN_INSTALL_DIR` overrides the default `~/.local/bin`.

### 2. Get a model

A showcase avatar downloads with no account; your own agent needs a sign-in
once, and the render in the next step needs it too:

```bash
bithuman login                    # opens your browser; stores a per-device key on this machine
bithuman pull marmalade           # prints ~/.cache/bithuman/showcase/marmalade.imx
```

For one of your own agents, `bithuman pull <YOUR_AGENT_CODE> --model essence-2`
prints the cached path the same way — the code is on [Agents](/api/agents).

### 3. Render

Audio in, MP4 out. The sample clip is a 16 kHz mono WAV:

```bash
curl -fsSLo speech.wav https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/showcase/demo_sample.wav
bithuman render "$(bithuman pull marmalade)" -a speech.wav -o out.mp4
```

Rendering an Essence 2 file (your own `--model essence-2` pull) also fetches the
shared audio encoder once (~377 MB) and reuses it after that.

### 4. Verify

Play `out.mp4` — it is the length of the audio. To see the same avatar live,
run it and open the printed URL:

```bash
bithuman run "$(bithuman pull marmalade)"     # → http://127.0.0.1:8088/, grant the microphone, talk
```

The full command set is on [the CLI page](/sdk/cli).

### The CLI meters a self-hosted session

`bithuman run <file>` and `bithuman render` are billed at the self-hosted rate
by wall-clock time, one usage row per session, to the account you signed in
with; `bithuman pull` is free. The rate and the definition of a credit minute
are on [pricing](/guides/pricing).

## Python SDK — Essence 2 clip to MP4

The Python route renders a whole Essence 2 clip on the CPU — no GPU. Python
3.10–3.14 on Linux x86_64 / aarch64 and macOS 14+ Apple Silicon.

### Install

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu   # Linux: the CPU build first, or the extra pulls ~2.5 GB of CUDA
pip install "bithuman[offline]"
```

You also need **`ffmpeg` on `PATH`** — the SDK uses it to decode audio and
encode the MP4.

### Get a model

The same file step 2 above prints — `bithuman pull <YOUR_AGENT_CODE> --model
essence-2` — or the signed URL from
[`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model).

### Render

Export `BITHUMAN_API_SECRET` first — the render is billed at the self-hosted
rate — then:

```python
from bithuman.offline import render_offline

render_offline("agent.imx", "speech.wav", out_mp4="rendered.mp4")
```

`agent.imx` is the path `bithuman pull` printed; `speech.wav` is any format
ffmpeg reads. The first render downloads the shared audio encoder once (~377 MB,
checked by content digest) into `~/.bithuman/deps`. Frame-level control and the
live streaming API are on the [Python SDK page](/sdk/python); upgrading from a
2.x wheel, read the
[migration note](/guides/deploy-self-hosted#essence-2-on-your-own-cpu).

## Android

Both second-generation models are on Maven Central and resolve with no account:

```kotlin
dependencies {
    implementation("ai.bithuman:expression2-android:0.4.1")
    implementation("ai.bithuman:essence2-android:0.5.3")
}
```

`arm64-v8a` only, so use a physical device or an `arm64-v8a` emulator image.
Install, model download, minimal code and a running app: the
[Android SDK page](/sdk/android), or the whole project on
[Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello).

### Legacy 2.x names still accepted

Nothing below is needed for a new integration; each is kept so an existing one keeps working, spelled exactly as it was:

| Legacy name | Status on `bithuman` 3.1.3 | Use instead |
|---|---|---|
| `pip install "bithuman[tessera]"` | still resolves; installs the same render extras | `bithuman[offline]` |
| `bithuman.tessera_offline` (module path) | still importable | `bithuman.offline` |
| `OfflineTesseraRenderer`, `TesseraOfflineError` (exported names) | still exported | `OfflineRenderer`, `render_offline`, `OfflineRenderError` |
| `BITHUMAN_TESSERA_DIRECTOR` and the other `BITHUMAN_TESSERA_*` variables | still read | no variable — the defaults are the fast path |

## iOS and macOS, in your own app

The Swift package resolves anonymously:

```swift
.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")
// product: .product(name: "Expression2", package: "homebrew-bithuman")
```

You need Xcode 26+, an Apple Developer team and a physical iPhone — the
Simulator cannot run the engine. Install, model download, minimal code and a
running app: the [Swift SDK page](/sdk/ios), or the whole app on
[Swift — a talking avatar on the iPhone you have](/examples/swift-ios-expression2).

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman render` refuses with `NOT_SIGNED_IN`, no output file | a render is billed, so it needs a credential | `bithuman login`, or `export BITHUMAN_API_SECRET=…` |
| `OfflineRenderError` naming the audio encoder | the first render could not download it | allow the machine network access once; it is cached in `~/.bithuman/deps` afterwards |
| `pip install "bithuman[offline]"` downloads gigabytes of `nvidia-*` packages | the default Linux `torch` is a CUDA build | install `torch` from the CPU index first (step above) |
| `ffmpeg: command not found` | the SDK shells out to ffmpeg | install ffmpeg and put it on `PATH` |
| `lible_core.so not found` at the first frame on macOS | a wheel older than 2.10.0 | `pip install -U bithuman` |
| `java.lang.UnsatisfiedLinkError` on an Android emulator | an x86_64 system image; the AARs are `arm64-v8a` only | a physical device, or an `arm64-v8a` emulator image |
| a render comes back softer around the mouth than the [samples](/concepts/essence-2) | an older artifact | send us the agent code at [hello@bithuman.ai](mailto:hello@bithuman.ai); nothing to configure on your side |

## Where to go next

- [Python SDK](/sdk/python) — the full streaming and offline API.
- [Self-hosted Expression GPU](/guides/deploy-self-hosted) — the NVIDIA Docker
  path for Expression 1, and the Essence 2 CPU reference.
- [Pricing](/guides/pricing) — self-hosted credit rates and metering.
