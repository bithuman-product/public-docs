---
title: "Architecture"
description: "How bitHuman is built and shipped — the libessence engine, the language SDKs that wrap it, the SDK-to-engine ABI compatibility matrix, and the per-device hardware matrix."
section: concepts
group: "Architecture"
order: 5
---

## The three layers

bitHuman is one portable engine with thin language bindings on top and apps on top of that. Everything below reads the same [`.imx` model file](/concepts/avatars-imx) and produces byte-equivalent, lip-synced visual frames — on an iPhone, a Raspberry Pi, a MacBook, a browser, or a cloud GPU.

<div class="bh-stack">
  <div class="bh-layer"><div class="bh-l-title">Apps &amp; tools <span class="bh-tag">L3</span></div><div class="bh-l-sub">bitHuman CLI · reference apps (Mac, iPad, iPhone, Flutter) · LiveKit transport for WebRTC</div></div>
  <div class="bh-layer"><div class="bh-l-title">Language SDKs <span class="bh-tag">L2</span></div><div class="bh-l-sub">Python · Swift · Kotlin · JS — thin, idiomatic bindings over the same engine</div></div>
  <div class="bh-layer bh-accent"><div class="bh-l-title">libessence — the engine <span class="bh-tag">L1</span></div><div class="bh-l-sub">Portable C++ avatar renderer behind a stable C ABI. Statically linked into every SDK. macOS · iOS · Android · Linux · Windows · WASM</div></div>
</div>

Every layer drives the same pipeline — audio goes in, lip-synced visual frames come out at a steady 25 FPS:

<div class="bh-flow"><span class="bh-node">16 kHz mono audio</span><span class="bh-sep">→</span><span class="bh-node">libessence engine</span><span class="bh-sep">→</span><span class="bh-node">25 FPS visual frames</span></div>

Most developers integrate at the SDK layer (L2) — you never need to know what's underneath. The engine is statically linked into each SDK distribution, so there are no extra system libraries to install.

## What runs where

bitHuman is shipped as a single cross-platform runtime with idiomatic SDKs in each language. All SDKs and the CLI read the same [`.imx` model file](/concepts/avatars-imx) and produce byte-equivalent frames. Third-party dependencies are bundled inside each distribution — your app's manifest only needs the bithuman dependency, never a transitive `onnxruntime` / `webp` / `livekit-server`.

| Goal | Install | What you get |
|---|---|---|
| Embed in a Python app | `pip install bithuman` | Python SDK (library only, ~5 MB) |
| Embed in a Swift app | SwiftPM `Bithuman` | Swift SDK + bundled libessence XCFramework |
| Embed in an Android app | `ai.bithuman:sdk` (Maven Central) | Kotlin SDK + AAR (`arm64-v8a`) |
| Run from the CLI on Mac | `brew install bithuman-cli` | bithuman CLI (single Rust binary) |
| Run from the CLI in any Python env | `pip install bithuman-cli` | Same Rust binary, inside a Python wheel |
| Cloud LiveKit avatar | `pip install livekit-plugins-bithuman` | Managed avatar session |

## Engine layering

The platform is three owned layers — engine, SDKs, apps — plus an upstream integration layer that wires bithuman into other ecosystems.

```text
L4  Upstream integrations
    livekit-plugins-bithuman (lives in livekit/agents)
        |
        v depends on
L3  Apps (consume the SDKs)
    bithuman CLI · Flutter reference app · Mac + iPad reference apps
        |
        v builds on
L2  bitHuman SDKs (language bindings)
    Python · Swift (Bithuman) · Kotlin (ai.bithuman:sdk) · Rust (in-tree)
        |
        v wraps
L1  bitHuman Engine — libessence (cross-platform C++ behind a C ABI)
    Audio in: 16 kHz mono PCM   ·   Video out: 25 FPS BGR frames
    macOS · iOS · Android · Linux · Windows
```

Most developers integrate at the SDK layer (L2) — you never need to know what's underneath. The engine is statically linked into each SDK distribution, so there are no extra system libraries to install. The bithuman CLI (L3) consumes the Rust SDK the same way any third-party app would.

## Cross-layer contracts

The owned layers ship independently but agree on a small set of stable contracts:

- **Engine ABI (versioned).** `libessence` exposes a C ABI tagged with an explicit version. The current shipping ABI is **v7**, introduced in libessence 1.19.1. New ABI versions are additive — old SDK builds keep working with newer engines until a version is formally retired. `bithuman --version` prints `libessence <ver> ABI <n> / bithuman <ver>`.
- **SDK public API (SemVer-stable).** The public surface in each language is stable across patch and minor releases. Patches never break source compatibility; minors add APIs without removing old ones; majors call out breaks explicitly.
- **One `.imx`, every surface.** A model file packed for one SDK runs identically across all of them — enforced by an in-tree `parity/` contract test suite that streams the same audio through every SDK and asserts byte-equal frames.

## SDK ↔ engine compatibility matrix

Each artifact declares the `libessence` ABI it builds against. Artifacts with a **matching ABI** are interoperable even when their headline versions differ.

| Artifact | Latest version | Channel | libessence ABI |
|---|---|---|---|
| Python SDK (`bithuman`) | 2.3.3 | PyPI | v7 |
| Swift SDK (`bitHumanKit`) | 0.8.2 | SwiftPM | v7 |
| Kotlin SDK (`ai.bithuman:sdk`) | 2.3.6 | Maven Central | v7 |
| Rust SDK (`bithuman`) | in-tree crate, versioned with the CLI | source-only (not on crates.io) | v7 |
| bithuman CLI | 2.3.25 | Homebrew · PyPI `bithuman-cli` · universal installer | v7 |

### Engine ABI history

| ABI | Introduced | Notes |
|---|---|---|
| **v7** | libessence 1.19.1 | Adds `be_runtime_tick_compose_from_mel` — composing a tick directly from a mel feed. Current production baseline; covers every shipping SDK. Backwards-compatible with v6 callers. (`be_set_default_audio_encoder` is an additive, ABI-unchanged entry point — it did not bump the ABI.) |
| **v6** | libessence 1.16.0 | Streaming push-audio / pull-frame API. |
| v5 and earlier | pre-1.16 | Retired — synchronous compose only, no streaming. |

### Skew policy

- **Patch skew within a minor** (`2.3.0` ↔ `2.3.1`) is always safe.
- **Minor skew** (`2.2.x` ↔ `2.3.x`) is safe — minors only add APIs.
- **SDK / engine skew is safe across ABI versions that share a major.** A 1.17.1 Kotlin AAR (ABI v6) talks to a 2.3.0 engine because v7 is additive on v6 — you simply can't call v7-only entry points from the older binding.
- **Major skew on the Python side** (`1.x` ↔ `2.x` PyPI) is **not** supported — the 2.0 streaming API reshaped the surface. Pin the whole Python stack to one major.

## Platform / device matrix

### What ships in 2.3

| Platform | CLI binary | Python wheel | Swift SDK | Kotlin SDK |
|---|---|---|---|---|
| **macOS arm64 (M-series)** | Homebrew + `bithuman-cli` wheel | `bithuman` (3.10–3.14) | SwiftPM | — |
| **macOS x86_64 (Intel)** | Pending | Pending (1.x was last) | — | — |
| **Linux x86_64** | Tarball + `bithuman-cli` wheel | `bithuman` (manylinux) | — | — |
| **Linux aarch64** | Tarball + `bithuman-cli` wheel | `bithuman` (manylinux) | — | — |
| **Windows** | Not shipping (use WSL2) | Not shipping (1.9.0 was last) | — | — |
| **iOS / iPadOS** | — | — | SwiftPM | — |
| **Android** | — | — | — | Maven Central `ai.bithuman:sdk` |

macOS-Intel and Windows are tracked but not part of the 2.3 cut. The 1.x line still has Windows wheels and a macOS-Intel build if you're stuck on either target.

### Essence hardware floor

| Host | Status | Notes |
|---|---|---|
| **Apple M-series Mac** | Real-time, large headroom | Any Apple Silicon (arm64) |
| **iPhone 17 Pro+** | Real-time, smallest footprint | iOS 26 |
| **iPad Pro M4+** | Real-time | Pairs well with an on-device LLM |
| **Android (`arm64-v8a`)** | Real-time | Snapdragon 8 Gen 2+, Android 10+ |
| **Linux x86_64 / aarch64** | Real-time | Modern CPU + 4 GB RAM |
| **Raspberry Pi 4B / 5** | Near real-time | Adequate for kiosks at modest FPS |
| **Intel Mac / Windows** | Pending | Use WSL2 or the 1.x wheel today |

### Expression hardware floor

| Host | Status | Notes |
|---|---|---|
| **Mac M3+ (arm64)** | On-device | Demo app target |
| **iPad Pro M4+** | On-device | Sized for 16 GB+ devices |
| **iPhone** | Not supported | Exceeds the iOS per-app memory budget — use Essence |
| **Android** | Not supported | Use Essence |
| **Linux + NVIDIA GPU** | Server | 8 GB+ VRAM via the [Docker container](/guides/deploy-self-hosted) |
| **Mac Intel / Linux CPU / Windows / Raspberry Pi** | Not supported | Requires Apple Silicon or NVIDIA GPU |

### Avatar resolutions

| Resolution | Best for |
|---|---|
| **384×384** | Mobile and edge — the default sweet spot |
| **512×512** | Mac and iPad Pro — comfortable on M-series |
| **1280×720** | Desktop and cloud streaming — default for the CLI and LiveKit plugin |

Frames are delivered at 1280×720 by every SDK; smaller avatars are letterboxed into that frame. All hosts produce identical frames — your device decision is about form factor, memory, and latency budget, not visual quality.

## Authentication and billing

One credential drives every surface; only the env-var name differs by platform convention:

```text
BITHUMAN_API_SECRET    # Python, Kotlin, REST API, CLI
BITHUMAN_API_KEY       # Swift (Apple convention)
```

The SDK never holds the long-lived secret in process memory — it exchanges the secret for a short-lived runtime token at startup, auto-renewing on the billing heartbeat. Failed heartbeats trigger a 5-minute offline grace window before the avatar pauses. Audio-only mode (no attached avatar) is fully offline and bills nothing. See [Pricing](/guides/pricing).

## Where to go next

- [Models](/concepts/models) — Essence vs Expression in depth.
- [Avatars and the `.imx` format](/concepts/avatars-imx) — how avatars are packaged.
- [Quickstart](/api/quickstart) — your first avatar in ~2 minutes.
- [Python SDK](/sdk/python) — the easiest surface to script from.
