---
title: "Downloads"
description: "Get the bitHuman SDK: install commands for every surface plus the full device and platform support matrix."
section: resources
group: "Resources"
order: 2
---

## Get the SDK

One install line per platform. Each row links to the page that owns everything
after it — a model to fetch with no account, the minimal code, the run command,
measured performance and the exact refusals with their fixes. The
[SDK page](/sdk) shows all six side by side.

| Platform | Install | Then |
|---|---|---|
| [CLI](/sdk/cli) — macOS Apple Silicon, Linux x86_64 | `curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh \| sh` | `bithuman run` — a free avatar, no account |
| [Python](/sdk/python) — 3.10–3.14, macOS arm64, Linux | `pip install "bithuman[expression-2]"` | `bithuman.open(...)` / `avatar.render(...)` |
| [Android](/sdk/android) — arm64-v8a, minSdk 26 | `implementation("ai.bithuman:expression2-android:0.4.1")` | `Expression2ModelStore(context).fetch(code)`, anonymous |
| [iOS & iPadOS](/sdk/ios) — a physical device, Xcode 26+ | `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")`, product `Expression2` | three anonymous `curl`s for a showcase identity |
| [macOS](/sdk/macos) — Apple Silicon | `brew install bithuman-product/bithuman/bithuman-cli` | `bithuman run` — CoreML on the Neural Engine |
| [Web](/sdk/web) — any modern browser | nothing | one URL or one `<iframe>`; no JavaScript package is published today |

`expression-1` is GPU-only by design and serves through the
[cloud API](/api/overview); every REST call is on the [API reference](/api/reference).

## The two packages

The Python library and the CLI binary are separate things and have been since 2.3.0: `pip install bithuman` is the library, and the CLI comes from the universal installer or from Homebrew — **not** from PyPI. The `bithuman-cli` wheel that briefly carried it is no longer published; `pip install bithuman-cli` finds no distribution.

| Platform | CLI binary | Python wheel | Swift SDK |
|---|---|---|---|
| **macOS arm64 (M-series)** | Homebrew or the universal installer | `bithuman` (3.10–3.14) | SwiftPM |
| **macOS x86_64 (Intel)** | **Never published** — no `x86_64-apple-darwin` tarball has ever shipped | Pending (1.x was last) | — |
| **Linux x86_64** | Universal installer (tarball), `cli-v2.6.6` | `bithuman` (manylinux) | — |
| **Linux aarch64** | **Not in 2.6.6** — `cli-v2.3.27` was the last release with an `aarch64-unknown-linux-gnu` tarball | `bithuman` (manylinux) | — |
| **Windows** | WSL2 today | WSL2 today (1.9.0 was the last native wheel) | — |
| **iOS / iPadOS** | — | — | SwiftPM |

macOS-Intel and Windows are tracked but not part of the 2.3 cut. If you're stuck on either, the 1.x line still has Windows wheels and a macOS-Intel build — pin the whole Python stack there until those targets graduate into the 2.x distribution.

## Current shipping versions

| Artifact | Latest version | Channel | Engine ABI |
|---|---|---|---|
| Python SDK (`bithuman`) | **3.1.2** (2026-09-11) — the 2.x line ends at 2.9.0 on PyPI, so a `bithuman<3` pin is a downgrade, not a hold | [PyPI](https://pypi.org/project/bithuman/) | v7 |
| Swift SDK (`bitHumanKit`) | binary **2.4.0** — the package version to pin is on [Install](/sdk/ios#install), the only page that states it | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | v7 |
| Swift SDK (`Expression2`) | **2.6.0** | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | — (CoreML; no engine ABI) |
| Swift SDK (`Essence2`) | engine release **`essence2-v1.5.1`** — what the tap's `Package.swift` points at on its current tag, `v2.12.1`. Its `libessence2-resources.zip` (44,392,223 B) carries the shared audio encoder; the one on `essence2-v1.5.0` does not, and that engine refuses to start without it | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | — (C interface; ONNX Runtime 1.26.0 rides with it) |
| bitHuman CLI | **2.6.6** (2026-09-11) — macOS arm64 **and** Linux x86_64, same version, no pin needed, engine core `libessence` 3.1.2 (the engine's legacy spelling), a rendered clip's mouth is in sync with its audio, an avatar file you downloaded yourself runs on Linux, self-hosted sessions metered on both and billed on wall-clock, a rejected key gets 300 s and then the session stops | [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (macOS) · universal installer (macOS Apple Silicon + Linux) | v7 |
| Android AAR (`ai.bithuman:expression2-android`) | **0.4.1** (a bare `Expression2Options()` asks for the accelerator; on `0.3.1` it stayed on the CPU) | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/expression2-android/) | — (LiteRT) |
| Android AAR (`ai.bithuman:essence2-android`) | **0.5.2** (`0.2.0` through `0.5.1` are permanent on Central and superseded — `0.5.0` renders a rejected key for ever) | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/essence2-android/) | — (ONNX Runtime 1.26.0) |
| bitHuman MCP server (`bithuman-mcp`) | **0.3.5** (also built into the CLI — [`bithuman mcp`](/guides/mcp-server)) | [PyPI](https://pypi.org/project/bithuman-mcp/) | — (API client, no engine) |

> **The macOS wheel carries `lible_core`** — the native half of the Essence 2
> offline render route — from 2.10.0 on; every macOS wheel up to and including
> 2.9.0 shipped the Python half alone and raised `lible_core.so not found` at
> the first frame. Linux wheels have carried it since 2.8.1. On the current
> release neither is a question: `pip install --upgrade bithuman`, and confirm
> with `python -c "import bithuman; print(bithuman.__version__)"`.

Artifacts with **matching ABI** are interoperable even if their headline versions differ. Mixing surfaces in one project — for example the Swift SDK on iOS plus the Python `bithuman` 3.1.2 wheel on the backend — is supported and tested as long as the ABI columns line up.

## Device and platform support

Two avatar models, different hardware floors. For a side-by-side feature comparison, see [models](/concepts/models). At a glance, by device:

| Device | Essence? | Expression? | SDKs |
|---|---|---|---|
| **iPhone 16 Pro+** | Yes | **No** — GPU-only&nbsp;‡ | Swift |
| **iPad Pro M4+** | Yes | **No** — GPU-only&nbsp;‡ | Swift |
| **Mac (Apple Silicon)** | Yes | **No** — GPU-only&nbsp;‡ | Swift, Python, CLI |
| **Mac (Intel)** | Pending in 2.3 | No | — (use 1.x wheel) |
| **Browser (WASM)** | Yes | No | JavaScript / TS&nbsp;† |
| **Linux x86_64 / aarch64** | Yes (CPU) | Yes (NVIDIA GPU) | Python, CLI |
| **Windows** | Pending (WSL2 today) | No | — |
| **Raspberry Pi 4B / 5** | Near real-time | No | Python, CLI |
| **bitHuman Cloud** | Managed | Managed | LiveKit · JS / TS&nbsp;† |

All hosts that run a given model produce identical, lip-synced visual frames — your device choice is about form factor, memory, and latency budget, not visual quality. The detailed per-model hardware floors follow.

> **‡ Corrected 2026-09-06.** These three cells read *Preview (prefer Essence)*, *Yes* and *Yes (M3+)*. **Expression 1 has no Apple build at all** — the published Swift package vends `bitHumanKit`, `BithumanEngineProtocol` and `Expression2` and no `Expression` product; see [the correction under Expression](#expression) below.

> **†** The **JavaScript / TypeScript** client is **Preview — not yet released** (no npm package or public source yet; see the [JavaScript / TypeScript](/sdk/web) section). For browser/Node today, drive a cloud avatar over [LiveKit](/sdk/livekit).

### Essence

The default avatar model. Runs on virtually every supported platform — the right choice for mobile, edge, and any deployment without a discrete GPU.

| Host | Status | Notes |
|---|---|---|
| **Apple M-series Mac** | Real-time, large memory headroom | Any Apple Silicon (arm64) |
| **iPhone 16 Pro+** | Real-time, smallest memory footprint | iOS 26 |
| **iPad Pro M4+** | Real-time | Pairs comfortably with an on-device LLM |
| **Linux x86_64 / aarch64** | Real-time | Python SDK, modern CPU + 4 GB RAM |
| **Intel Mac** | Pending in 2.3 | Use 1.x wheel or run via Linux x86_64 |
| **Windows x86_64** | WSL2 today | Run under WSL2; native wheels on the roadmap |
| **Raspberry Pi 4B / 5** | Near real-time | Adequate for kiosks at modest FPS |
| **Apple Watch / wearables** | Not yet | Too memory-constrained for on-device rendering today |

All hosts produce identical frames — your device decision is about form factor, memory, and latency budget, not visual quality.

### Expression

Heavier high-fidelity model, and this table is the **first-generation** floor:
**Expression 1 is GPU-only.** It runs server-side on NVIDIA GPUs and there is
**no Apple on-device build of it** — see
[where each model runs](/concepts/where-models-run).

| Host | Status | Notes |
|---|---|---|
| **Linux + NVIDIA GPU** | Server | 8 GB+ VRAM via the self-hosted Docker container |
| **Mac M3+ (arm64)** | Not applicable | No Apple build of Expression 1 — see the correction below |
| **iPad Pro M4+** | Not applicable | Same — GPU-only by scope ruling, not a pending port |
| **iPhone 16 Pro+** | Not applicable | Same. ([Expression 2](/sdk/ios#minimal-code) is a **different engine**, has rendered on an iPhone, and publishes no model bundle yet.) |
| **Mac Intel / Linux CPU / Windows** | Needs a GPU — or use Essence | Expression 1 needs an NVIDIA GPU; Essence runs on CPU-only hosts |
| **Raspberry Pi** | Use Essence | Essence runs near real-time on Pi 4B / 5 |

> ### Correction — 2026-09-06: the three Apple rows above said **On-device** and **Preview**
>
> They read *"Mac M3+ — On-device — Demo app target"*, *"iPad Pro M4+ —
> On-device"* and *"iPhone 16 Pro+ — Preview — on-device validation of
> Expression 1 is in progress"*, and the section opened *"Runs on Apple Silicon
> on-device (demo apps) or on NVIDIA GPUs server-side"*. **All of that was
> false and is removed rather than softened.** The published Swift package
> ([`homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman))
> vends **exactly three products** — `bitHumanKit`, `BithumanEngineProtocol`
> and `Expression2`. There is **no `Expression` product**, and asking for one
> fails at resolve time with
> `product 'Expression' ... not found in package 'homebrew-bithuman'`. Nothing
> was in progress: there is no macOS, iPadOS or iOS build of `expression-1`,
> and none is coming — it is GPU-only by scope ruling. To self-host it, use the
> [NVIDIA container](/guides/deploy-self-hosted).

If you're deploying to iPhone today, choose **Essence**. The iPhone reference app is built around Essence and stays well inside Apple's per-app memory cap.

### Essence 2 / Expression 2 (second generation)

The tables above are the first-generation floors. The
[second-generation models](/concepts/models-v2) resolve their runtime tier for
you at session launch. Each model also produces one downloadable per-identity
artifact — where that artifact can run **locally today** differs by model.
For the file each family hands you by name, and what opens it, see
[what you get, per family](/sdk/cli/reference#what-you-get-per-family).

| Runtime | `essence-2` | `expression-2` |
|---|---|---|
| bitHuman cloud (GPU · Apple Silicon · CPU chain) | Yes | Yes |
| Self-hosted CPU (your servers) | Offline rendering, metered — **SDK 2.9.0+ on Linux, 2.10.0+ on macOS** ([quickstart](/guides/deploy-self-hosted#essence-2-self-hosted--cpu-offline-rendering-sdk-290)); local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) — `render` and `run` — on macOS Apple Silicon and Linux x86_64 (**2.6.1**); live streaming via cloud | Local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) (macOS Apple Silicon, Linux x86_64) |
| On-device Apple Silicon (Mac / iOS) | The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `<code>.imx` locally on macOS Apple Silicon (2.6.1; macOS only — there is no iOS CLI). In your own app: the [Swift](/sdk/ios#install) `Essence2` product, package **2.8.0** — the engine's C interface, builds for iOS device, iOS simulator and macOS; resources published; **no in-app model download route yet** | [Swift](/sdk/ios) `Expression2` 2.6.0 ships **both** a `macos-arm64` and an `ios-arm64` slice and has rendered on **Mac and iPhone**. It is **engine only**, but as of 2.6.0 it [takes a model path and opens the downloaded container](/sdk/ios#minimal-code), so an app with its own agent can hand it one. The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `<code>.avatar` locally on macOS Apple Silicon (macOS only — there is no iOS CLI) |
| Browser-local (WebGPU / WASM) | Rolling out (`?render=local`) | Rolling out (`?render=local`, LiteRT.js / WebGPU, WASM fallback) |

Full details, force-tier slugs, and rollout status:
[Where each model runs](/concepts/models-v2#where-each-model-runs).

### Avatar resolutions

Resolution interacts with both model and host:

| Resolution | Best for |
|---|---|
| **384×384** | Mobile and edge — the default sweet spot |
| **512×512** | Mac and iPad Pro — comfortable on M-series |
| **1280×720** | Desktop and cloud streaming — default for the CLI and LiveKit plugin |

Frames are delivered at 1280×720 by every SDK; smaller avatars are letterboxed / pillarboxed into that frame.

## Engine ABI history

The engine ABI is the C surface `libessence` exposes to its language wrappers. New ABI versions are additive — old SDK builds that target an earlier ABI keep working against newer engines until a version is formally retired.

| ABI | Introduced | Notes |
|---|---|---|
| **v7** | libessence 1.19.1 | Adds `be_runtime_tick_compose_from_mel` — composing a tick directly from a mel feed. Current production baseline; covers every shipping SDK above. Backwards-compatible with v6 callers. (`be_set_default_audio_encoder` is an additive, ABI-unchanged entry point — it did not bump the ABI.) |
| **v6** | libessence 1.16.0 | Streaming push-audio / pull-frame API. |
| v5 and earlier | pre-1.16 | Retired in production builds — synchronous only, no streaming. |

Confirm the ABI tag on a live host with `bithuman doctor`.
