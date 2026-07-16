---
title: "Downloads"
description: "Get the bitHuman SDK: install commands for every surface plus the full device and platform support matrix."
section: resources
group: "Resources"
order: 2
---

## Get the SDK

One engine (`libessence`) drives every surface. Pick the install path that matches what you're building — they all read the same `.imx` avatar file and produce identical frames.

### bitHuman CLI (no code)

The fastest way to see an avatar talk. The same Rust binary ships through all three channels — byte-identical. macOS arm64 and Linux (x86_64 + aarch64).

**Homebrew (recommended on Apple Silicon)**

```bash
brew install bithuman-product/bithuman/bithuman-cli
```

**Universal installer (macOS Apple Silicon + Linux, no Python required)**

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

**PyPI sibling wheel (same Rust binary, Python-friendly) — macOS Apple Silicon only**

```bash
pip install bithuman-cli
```

> **Note** The `bithuman-cli` PyPI wheel is published for **macOS Apple
> Silicon (arm64) only**. On Linux there is no `bithuman-cli` wheel — use the
> universal installer above (it drops the same byte-identical binary).

Verify the install:

```bash
bithuman --version
# libessence 1.19.1 ABI 7
# bithuman    2.3.25
bithuman doctor   # full host + key + cache check
```

See the [CLI reference](/sdk/cli/overview) for all subcommands (`run`, `render`, `info`, `pull`, `list`, `doctor`, `init`, `login`/`logout`, and `mcp`).

### Python SDK (library) — GA

`pip install bithuman` is the on-device avatar runtime **library** — `from bithuman import AsyncBithuman`. macOS arm64 + Linux x86_64 / aarch64 (manylinux_2_28, glibc), Python 3.11–3.13.

```bash
pip install bithuman
```

> **macOS note** The 2.3.x macOS wheels are tagged for **macOS 26+ (arm64)**. On older macOS versions pip reports `No matching distribution found` — upgrade to macOS 26+, or build from source / contact [hello@bithuman.ai](mailto:hello@bithuman.ai).

Add the LiveKit agent integration:

```bash
pip install livekit-plugins-bithuman pillow
```

> **Note** The plugin currently imports Pillow without declaring it — install `pillow` alongside (upstream fix pending with LiveKit), or `from livekit.plugins import bithuman` fails with `ModuleNotFoundError: No module named 'PIL'`.

See the [Python SDK guide](/sdk/python).

### Swift / Apple SDK — Preview

On-device real-time avatar for iOS, iPadOS, and macOS via SwiftPM. Apple Silicon only.

In Xcode: **File → Add Package Dependencies…** → paste
`https://github.com/bithuman-product/homebrew-bithuman.git` → pick **0.8.2**
→ attach the **`bitHumanKit`** product. The package wraps a pre-compiled
XCFramework with all third-party deps statically linked — zero transitive
SwiftPM dependencies.

The product import is `import bitHumanKit`. See the [Swift SDK guide](/sdk/swift).

### JavaScript / TypeScript — Preview

A cloud client for browser and Node apps. Preview status — APIs may change.

> **Note — not yet available.** `@bithuman/sdk` is **not published to npm**
> (`npm install @bithuman/sdk` 404s today) and has **no public source package**
> yet. For a browser/Node integration today, drive a cloud avatar over
> [LiveKit](/sdk/livekit). Track the [changelog](/changelog) for the release;
> the command below is the form it will take.

```bash
npm install @bithuman/sdk   # not available yet
```

### REST API

No install required. Authenticate with the `api-secret` header against `https://api.bithuman.ai`. See the [API reference](/api/reference) and the [quickstart](/api/quickstart).

> **Note** Flutter is currently a **reference app only**, not a published code SDK. See [community](/community) for how to follow its progress.

## What ships in 2.3

2.3.0 is the first **split-wheel** release: the Python library (`pip install bithuman`) and the CLI binary (`pip install bithuman-cli` or `brew install bithuman-product/bithuman/bithuman-cli`) are now separate packages. Pre-2.3 PyPI bundled both — 2.2.x with the bundled CLI is still on PyPI and works, but consider it legacy; pin to 2.3+ for new projects.

| Platform | CLI binary | Python wheel | Swift SDK |
|---|---|---|---|
| **macOS arm64 (M-series)** | Homebrew + `bithuman-cli` wheel | `bithuman` (3.11–3.13) | SwiftPM |
| **macOS x86_64 (Intel)** | Pending | Pending (1.x was last) | — |
| **Linux x86_64** | Universal installer (tarball) | `bithuman` (manylinux) | — |
| **Linux aarch64** | Universal installer (tarball) | `bithuman` (manylinux) | — |
| **Windows** | WSL2 today | WSL2 today (1.9.0 was the last native wheel) | — |
| **iOS / iPadOS** | — | — | SwiftPM |

macOS-Intel and Windows are tracked but not part of the 2.3 cut. If you're stuck on either, the 1.x line still has Windows wheels and a macOS-Intel build — pin the whole Python stack there until those targets graduate into the 2.x distribution.

## Current shipping versions

| Artifact | Latest version | Channel | libessence ABI |
|---|---|---|---|
| Python SDK (`bithuman`) | **2.6.0** | [PyPI](https://pypi.org/project/bithuman/) | v7 |
| Swift SDK (`bitHumanKit`) | 0.8.2 | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | v7 |
| bitHuman CLI (`bithuman-cli`) | **2.3.25** | [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (macOS) · [PyPI `bithuman-cli`](https://pypi.org/project/bithuman-cli/) (macOS Apple Silicon only) · universal installer (macOS Apple Silicon + Linux) | v7 |

Artifacts with **matching ABI** are interoperable even if their headline versions differ. Mixing surfaces in one project — for example the Swift SDK on iOS plus the Python `bithuman` 2.6.0 wheel on the backend — is supported and tested as long as the ABI columns line up.

## Device and platform support

Two avatar models, different hardware floors. For a side-by-side feature comparison, see [models](/concepts/models). At a glance, by device:

| Device | Essence? | Expression? | SDKs |
|---|---|---|---|
| **iPhone 16 Pro+** | Yes | Preview (prefer Essence) | Swift |
| **iPad Pro M4+** | Yes | Yes | Swift |
| **Mac (Apple Silicon)** | Yes | Yes (M3+) | Swift, Python, CLI |
| **Mac (Intel)** | Pending in 2.3 | No | — (use 1.x wheel) |
| **Browser (WASM)** | Yes | No | JavaScript / TS&nbsp;† |
| **Linux x86_64 / aarch64** | Yes (CPU) | Yes (NVIDIA GPU) | Python, CLI |
| **Windows** | Pending (WSL2 today) | No | — |
| **Raspberry Pi 4B / 5** | Near real-time | No | Python, CLI |
| **bitHuman Cloud** | Managed | Managed | LiveKit · JS / TS&nbsp;† |

All hosts that run a given model produce identical, lip-synced visual frames — your device choice is about form factor, memory, and latency budget, not visual quality. The detailed per-model hardware floors follow.

> **†** The **JavaScript / TypeScript** client is **Preview — not yet released** (no npm package or public source yet; see the [JavaScript / TypeScript](#javascript--typescript--preview) section). For browser/Node today, drive a cloud avatar over [LiveKit](/sdk/livekit).

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

Heavier high-fidelity model. Runs on Apple Silicon on-device (demo apps) or on NVIDIA GPUs server-side.

| Host | Status | Notes |
|---|---|---|
| **Mac M3+ (arm64)** | On-device | Demo app target |
| **iPad Pro M4+** | On-device | Sized for 16 GB+ devices |
| **iPhone 16 Pro+** | Preview | Needs the increased-memory entitlement; on-device validation in progress. Prefer Essence for production. |
| **Linux + NVIDIA GPU** | Server | 8 GB+ VRAM via the self-hosted Docker container |
| **Mac Intel / Linux CPU / Windows** | Needs a GPU — or use Essence | Expression needs Apple Silicon or an NVIDIA GPU; Essence runs on CPU-only hosts |
| **Raspberry Pi** | Use Essence | Essence runs near real-time on Pi 4B / 5 |

If you're deploying to iPhone today, choose **Essence**. The iPhone reference app is built around Essence and stays well inside Apple's per-app memory cap.

### Essence 2 / Expression 2 (second generation)

The tables above are the first-generation floors. The
[second-generation models](/concepts/models-v2) resolve their runtime tier for
you at session launch, and the same downloaded artifact serves on-device or
self-hosted:

| Runtime | `essence-2` | `essence-2-max` | `expression-2` |
|---|---|---|---|
| bitHuman cloud (GPU · Neural Engine · CPU chain) | Yes | GPU-only | Yes |
| Self-hosted CPU (your servers) | Yes ([SDK](/sdk/overview)) | — | Yes (AVX-512-class CPUs) |
| On-device Apple Silicon (Mac / iOS) | Yes ([Swift](/sdk/swift)) | — (cloud-only) | Yes ([Swift](/sdk/swift)) |
| Browser-local (WebGPU / WASM) | Rolling out (`?render=local`) | — | Planned (WebGPU) |

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
| v5 and earlier | pre-1.16 | Retired in production builds — synchronous tick-compose only, no streaming. |

Confirm the ABI tag on a live host with `bithuman doctor`.
