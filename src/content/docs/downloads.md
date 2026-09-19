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
[SDK page](/sdk) shows them side by side.

| Platform | Install | Then |
|---|---|---|
| [CLI](/sdk/cli) — macOS Apple Silicon, Linux x86_64 | `curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh \| sh` | `bithuman login`, then `bithuman run` — both `run` and `render` need a credential |
| [Python](/sdk/python) — 3.10–3.14, macOS arm64, Linux | `pip install "bithuman[expression-2]"` | `bithuman.open(...)` / `avatar.render(...)` |
| [Android](/sdk/android) — arm64-v8a, minSdk 26 | `implementation("ai.bithuman:expression2-android:0.4.7")` | `Expression2ModelStore(context).fetch(code)`, anonymous |
| [iOS & iPadOS](/sdk/ios) — a physical device, Xcode 26+ | `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.11.0")`, product `Expression2` | three anonymous `curl`s for a showcase identity |
| [Web](/sdk/web) — any modern browser | nothing | one URL or one `<iframe>`; no JavaScript package is published today |

`expression-1` is GPU-only by design and serves through the
[cloud API](/api/overview); every REST call is on the [API reference](/api/reference).

## The two packages

The Python library and the CLI binary are separate things and have been since 2.3.0: `pip install bithuman` is the library, and the CLI comes from `install.bithuman.ai` or from Homebrew — **not** from PyPI.

**`bithuman` is the only bitHuman package on PyPI.** A `bithuman-cli` wheel was published there once and was removed on 2026-09-15, so installing that name from PyPI now fails outright — and it was never the way to get the `bithuman` command. The Homebrew *formula* is also called `bithuman-cli` — that one is real and is the supported route. If you find any other package on PyPI with a bitHuman-like name, it is not ours.

| Platform | CLI binary | Python wheel | Swift SDK |
|---|---|---|---|
| **macOS arm64 (M-series)** | Homebrew or the universal installer | `bithuman` (3.10–3.14) | SwiftPM |
| **macOS x86_64 (Intel)** | **Never published** — no `x86_64-apple-darwin` tarball has ever shipped | **Not supported** — no wheel | — |
| **Linux x86_64** | Universal installer (tarball) — the current release is named on [/sdk/cli](/sdk/cli#install) | `bithuman` (manylinux) | — |
| **Linux aarch64** | **Not in the current release** — `cli-v2.3.27` was the last release with an `aarch64-unknown-linux-gnu` tarball | `bithuman` (manylinux) | — |
| **Windows** | WSL2 today | **Not supported** — no wheel; run under WSL2 | — |
| **iOS / iPadOS** | — | — | SwiftPM |

**The Python wheel ships for Python 3.10–3.14 on Linux x86_64, Linux aarch64, and Apple-silicon macOS (14 or newer).** That is the whole set. On Windows or an Intel Mac `pip install bithuman` reports *no matching distribution found* — that is an unsupported platform, not a broken package. On Windows, run it under WSL2, which is a supported Linux.

## Current shipping versions

| Artifact | Latest version | Where it comes from |
|---|---|---|
| Python SDK (`bithuman`) | **2.11.5** — `pip install bithuman`, unconstrained, resolves it, and so does a `bithuman<3` pin (`livekit-plugins-bithuman` declares one); the 3.x line was withdrawn from PyPI on 2026-09-16, and 2.11.5 is its engine with the 2.x import surface carried alongside | [PyPI](https://pypi.org/project/bithuman/) |
| Swift SDK (`bitHumanKit`) | binary **2.4.0** — the package version to pin is on [Install](/sdk/ios#install), the only page that states it | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) |
| Swift SDK (`Expression2`) | **2.6.3** (package tag **2.13.5** — `from:` resolves it; `idleLoop` left the public surface in 2.6.3, see the [changelog](/changelog)) | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) |
| Swift SDK (`Essence2`) | ships with the package — pin the package version on [Install](/sdk/ios#install) and the engine comes with it. Essence 2 in your own iOS or macOS app works from **2.13.2** — it opens the `.imx` you download here. The newest package tag, **2.13.7**, ships Essence 2 engine **1.8.0**. | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) |
| bitHuman CLI | the current release, named on [/sdk/cli](/sdk/cli#install) — macOS arm64 **and** Linux x86_64, same version, no pin needed; what each release changed is in the [changelog](/changelog) | [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (macOS) · universal installer (macOS Apple Silicon + Linux) |
| Android AAR (`ai.bithuman:expression2-android`) | **0.4.7** (`0.4.6` and earlier stay on Central and are superseded; `idleLoop` changed type in `0.4.7`, see the [changelog](/changelog); a bare `Expression2Options()` asks for the accelerator since `0.4.1`) | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/expression2-android/) |
| Android AAR (`ai.bithuman:essence2-android`) | **0.5.12** (`0.2.0` through `0.5.11` stay on Central and are superseded — `0.5.1` and `0.5.2` cannot install a model on a handset; `0.5.7` delivers 72–77 % of a reply's frames under an un-paced feed, see the [changelog](/changelog)) | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/essence2-android/) |
| bitHuman MCP server | ships **inside the CLI** — [`bithuman mcp`](/guides/mcp-server) | [install.bithuman.ai](https://install.bithuman.ai) |

> **`lible_core.so not found` at the first frame** means an old wheel that
> shipped without the native half of the Essence 2 offline render route. Current
> wheels carry it on both macOS and Linux: `pip install --upgrade bithuman`,
> then confirm with `python -c "from importlib.metadata import version; print(version('bithuman'))"`.

Surfaces are meant to be mixed — the Swift SDK on iOS with the Python wheel on your backend, for example. Keep each one current and they stay compatible; we handle the versioning underneath.

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

The default avatar model, and this table is the **first-generation** floor —
the same scope as the Expression table below it, and the one the Raspberry Pi
row belongs to. Runs on virtually every supported platform — the right choice
for mobile, edge, and any deployment without a discrete GPU. The measured
second-generation frame rates on [performance](/sdk/performance) are a
different set of numbers on different hardware; a host graded here and absent
there is not a retracted claim, it is a floor this page states and that table
does not measure.

| Host | Status | Notes |
|---|---|---|
| **Apple M-series Mac** | Real-time, large memory headroom | Any Apple Silicon (arm64) |
| **iPhone 16 Pro+** | Real-time, smallest memory footprint | iOS 26 |
| **iPad Pro M4+** | Real-time | Pairs comfortably with an on-device LLM |
| **Linux x86_64 / aarch64** | Real-time | Python SDK, modern CPU + 4 GB RAM |
| **Intel Mac** | Pending in 2.3 | Use 1.x wheel or run via Linux x86_64 |
| **Windows x86_64** | WSL2 today | Run under WSL2; native wheels on the roadmap |
| **Raspberry Pi 4B / 5** | Near real-time | Adequate for kiosks at modest fps |
| **Apple Watch / wearables** | Not yet | Too memory-constrained for on-device rendering today |

Every host renders the same avatar, so your device decision is about form factor, memory, and latency budget. We do not claim the frames are bit-for-bit identical across hosts: on macOS, rendering the same input twice can produce slightly different pixel values ([changelog](/changelog)).

### Expression

Heavier high-fidelity model, and this table is the **first-generation** floor:
**Expression 1 is GPU-only.** It runs server-side on NVIDIA GPUs and there is
**no Apple on-device build of it** — see
[where each model runs](/concepts/where-models-run).

| Host | Status | Notes |
|---|---|---|
| **Linux + NVIDIA GPU** | Server | 8 GB+ VRAM via the self-hosted Docker container |
| **Mac M3+ (arm64)** | Not applicable | No Apple build of Expression 1 — see the correction below |
| **iPad Pro M4+** | Not applicable | Same — GPU-only by design, not a pending port |
| **iPhone 16 Pro+** | Not applicable | Same. ([Expression 2](/sdk/ios#minimal-code) is a **different engine**, has rendered on an iPhone, and publishes no model bundle yet.) |
| **Mac Intel / Linux CPU / Windows** | Needs a GPU — or use Essence | Expression 1 needs an NVIDIA GPU; Essence runs on CPU-only hosts |
| **Raspberry Pi** | Use Essence | Essence runs near real-time on Pi 4B / 5 |

> **There is no Apple build of `expression-1`, and none is coming** — it is
> GPU-only by design. To self-host it, use the
> [NVIDIA container](/guides/deploy-self-hosted).
>
> The published Swift package
> ([`homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman))
> vends `bitHumanKit`, `BithumanEngineProtocol`, `Expression2` and `Essence2`.
> There is **no `Expression` product** — asking for one fails at resolve time
> with `product 'Expression' ... not found in package 'homebrew-bithuman'`.

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
| Self-hosted CPU (your servers) | Offline rendering, metered — the current `bithuman` wheel on Linux and macOS ([quickstart](/guides/deploy-self-hosted#essence-2-on-your-own-cpu)); local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) — `render` and `run` — on macOS Apple Silicon and Linux x86_64 (**2.6.1**); live streaming via cloud | Local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) (macOS Apple Silicon, Linux x86_64) |
| On-device Apple Silicon (Mac / iOS) | The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `.imx` locally on macOS Apple Silicon (2.6.1; macOS only — there is no iOS CLI). In your own app: the [Swift](/sdk/ios#install) `Essence2` product renders the downloaded `.imx` on iPhone and Mac from **2.13.2** — you fetch the file yourself, there is **no in-app download route** | The [Swift](/sdk/ios) `Expression2` product ships both a Mac and an iPhone slice and has rendered on both. It is **engine only**, but it [takes a model path and opens the downloaded container](/sdk/ios#minimal-code), so an app with its own agent can hand it one. The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `.avatar` locally on macOS Apple Silicon (macOS only — there is no iOS CLI) |
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
