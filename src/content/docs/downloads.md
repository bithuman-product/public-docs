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
brew install bithuman-cli
```

**Universal installer (macOS + Linux, no Python required)**

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

**PyPI sibling wheel (same Rust binary, Python-friendly)**

```bash
pip install bithuman-cli
```

Verify the install:

```bash
bithuman --version
# libessence 1.19.1 ABI 7
# bithuman    2.3.6
bithuman doctor   # full host + key + cache check
```

See the [CLI reference](/cli) for all seven subcommands (`init`, `run`, `render`, `info`, `pull`, `list`, `doctor`).

### Python SDK (library) — GA

`pip install bithuman` is the on-device avatar runtime **library** — `from bithuman import AsyncBithuman`. macOS arm64 + Linux x86_64 / aarch64, Python 3.10–3.14.

```bash
pip install bithuman
```

Add the LiveKit agent integration:

```bash
pip install livekit-plugins-bithuman
```

See the [Python SDK guide](/sdk/python).

### Swift / Apple SDK — Preview

On-device real-time avatar for iOS, iPadOS, and macOS via SwiftPM. Apple Silicon only. The install path links native ORT / ffmpeg / hdf5 (not zero-dependency).

> **Note** The SwiftPM package is **`Bithuman`** — it binds directly onto the `libessence` streaming engine (`Fixture` / `Runtime` / `Avatar`). The app-layer renderer is **AvatarUIKit** (`bithuman-apps/avatar-ui-kit`). The earlier `bitHumanKit` package (`createRuntime` / `EssenceRuntime.frames()`) has been **removed**. See the [Swift SDK guide](/sdk/swift) for current status.

The product import is `import Bithuman`. See the [Swift SDK guide](/sdk/swift).

### Android / Kotlin SDK — Beta

Self-contained Android AAR via Maven Central. `arm64-v8a`, Android 10+.

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("ai.bithuman:sdk:2.3.6")
}
```

See the [Kotlin SDK guide](/sdk/android).

### JavaScript / TypeScript — Preview

A cloud client for browser and Node apps. Preview status — APIs may change.

> **Note** `@bithuman/sdk` is **not yet published to npm** — `npm install @bithuman/sdk` will 404 today. Install from source while it's in preview; the command below is the form the published package will take.

```bash
npm install @bithuman/sdk
```

### REST API

No install required. Authenticate with the `api-secret` header against `https://api.bithuman.ai`. See the [API reference](/api/reference) and the [quickstart](/api/quickstart).

> **Note** Flutter is currently a **reference app only** (in `bithuman-apps`), not a published code SDK. See [community](/community) for how to follow its progress.

## What ships in 2.3

2.3.0 is the first **split-wheel** release: the Python library (`pip install bithuman`) and the CLI binary (`pip install bithuman-cli` or `brew install bithuman-cli`) are now separate packages. Pre-2.3 PyPI bundled both — 2.2.x with the bundled CLI is still on PyPI and works, but consider it legacy; pin to 2.3+ for new projects.

| Platform | CLI binary | Python wheel | Swift SDK | Kotlin SDK |
|---|---|---|---|---|
| **macOS arm64 (M-series)** | Homebrew + `bithuman-cli` wheel | `bithuman` (3.10–3.14) | SwiftPM | — |
| **macOS x86_64 (Intel)** | Pending | Pending (1.x was last) | — | — |
| **Linux x86_64** | Tarball + `bithuman-cli` wheel | `bithuman` (manylinux) | — | — |
| **Linux aarch64** | Tarball + `bithuman-cli` wheel | `bithuman` (manylinux) | — | — |
| **Windows** | Not shipping (use WSL2) | Not shipping (1.9.0 was last) | — | — |
| **iOS / iPadOS** | — | — | SwiftPM | — |
| **Android** | — | — | — | Maven Central `ai.bithuman:sdk` |

macOS-Intel and Windows are tracked but not part of the 2.3 cut. If you're stuck on either, the 1.x line still has Windows wheels and a macOS-Intel build — pin the whole Python stack there until those targets graduate into the 2.x distribution.

## Current shipping versions

| Artifact | Latest version | Channel | libessence ABI |
|---|---|---|---|
| Python SDK (`bithuman`) | **2.3.6** | [PyPI](https://pypi.org/project/bithuman/) | v7 |
| Swift SDK (`Bithuman`) | 2.3.6 | [SwiftPM](https://github.com/bithuman-product/bithuman-sdk-public) | v7 |
| Kotlin SDK (`ai.bithuman:sdk`) | 2.3.6 | [Maven Central](https://central.sonatype.com/artifact/ai.bithuman/sdk) | v7 |
| bithuman CLI (`bithuman-cli`) | **2.3.6** | [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (macOS) · [PyPI `bithuman-cli`](https://pypi.org/project/bithuman-cli/) (macOS Apple Silicon only) · universal installer (macOS + Linux) | v7 |

Artifacts with **matching ABI** are interoperable even if their headline versions differ. Mixing surfaces in one project — for example the Swift SDK on iOS plus the Python `bithuman` 2.3.6 wheel on the backend — is supported and tested as long as the ABI columns line up.

## Device and platform support

Two avatar models, different hardware floors. For a side-by-side feature comparison, see [models](/concepts/models). At a glance, by device:

| Device | Essence? | Expression? | SDKs |
|---|---|---|---|
| **iPhone 17 Pro+** | Yes | No (use Essence) | Swift |
| **iPad Pro M4+** | Yes | Yes | Swift |
| **Mac (Apple Silicon)** | Yes | Yes (M3+) | Swift, Python, CLI |
| **Mac (Intel)** | Pending in 2.3 | No | — (use 1.x wheel) |
| **Android (`arm64-v8a`)** | Yes | No | Kotlin |
| **Browser (WASM)** | Yes | No | JavaScript / TS |
| **Linux x86_64 / aarch64** | Yes (CPU) | Yes (NVIDIA GPU) | Python, CLI |
| **Windows** | Pending (WSL2 today) | No | — |
| **Raspberry Pi 4B / 5** | Near real-time | No | Python, CLI |
| **bitHuman Cloud** | Managed | Managed | JS / TS, LiveKit |

All hosts that run a given model produce identical, lip-synced visual frames — your device choice is about form factor, memory, and latency budget, not visual quality. The detailed per-model hardware floors follow.

### Essence

The default avatar model. Runs on virtually every supported platform — the right choice for mobile, edge, and any deployment without a discrete GPU.

| Host | Status | Notes |
|---|---|---|
| **Apple M-series Mac** | Real-time, large memory headroom | Any Apple Silicon (arm64) |
| **iPhone 17 Pro+** | Real-time, smallest memory footprint | iOS 26 |
| **iPad Pro M4+** | Real-time | Pairs comfortably with an on-device LLM |
| **Android (`arm64-v8a`)** | Real-time | Snapdragon 8 Gen 2+, Android 10+ |
| **Linux x86_64 / aarch64** | Real-time | Python SDK, modern CPU + 4 GB RAM |
| **Intel Mac** | Pending in 2.3 | Use 1.x wheel or run via Linux x86_64 |
| **Windows x86_64** | Not shipping in 2.3 | Use WSL2 today; native wheels on the roadmap |
| **Raspberry Pi 4B / 5** | Near real-time | Adequate for kiosks at modest FPS |
| **Apple Watch / wearables** | Not supported | Insufficient memory |

All hosts produce identical frames — your device decision is about form factor, memory, and latency budget, not visual quality.

### Expression

Heavier high-fidelity model. Runs on Apple Silicon on-device (demo apps) or on NVIDIA GPUs server-side.

| Host | Status | Notes |
|---|---|---|
| **Mac M3+ (arm64)** | On-device | Demo app target |
| **iPad Pro M4+** | On-device | Sized for 16 GB+ devices |
| **iPhone 17 Pro+** | Not supported | Exceeds iOS per-app memory budget. Use Essence on iPhone. |
| **Android** | Not supported | Use Essence. |
| **Linux + NVIDIA GPU** | Server | 8 GB+ VRAM via the self-hosted Docker container |
| **Mac Intel / Linux CPU / Windows** | Not supported | Requires Apple Silicon or NVIDIA GPU |
| **Raspberry Pi** | Not supported | Use Essence |

If you're deploying to iPhone today, choose **Essence**. The iPhone reference app is built around Essence and stays well inside Apple's per-app memory cap.

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
