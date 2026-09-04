---
title: "Downloads"
description: "Get the bitHuman SDK: install commands for every surface plus the full device and platform support matrix."
section: resources
group: "Resources"
order: 2
---

## Get the SDK

One engine — the essence engine — drives every surface. Pick the install path that matches what you're building — they all read the same `.imx` avatar file and produce identical frames.

### bitHuman CLI (no code)

The fastest way to see an avatar talk. **macOS arm64 and Linux x86_64.** The
Homebrew formula and the universal installer deliver the same Rust binary, and
as of `cli-v2.5.1` they are **back on the same version on both platforms** —
the 2.5.0 split, where macOS moved ahead and Linux was stuck at `cli-v2.4.2`,
is closed. The PyPI wheel is a macOS-only sibling and still trails at `2.3.25`.

**`cli-v2.5.1` publishes exactly two targets**, and the two it does not publish
have never shipped at all. Measured against the release on 2026-09-03 — the
404s are the control that makes the 200s mean something:

```bash
B=https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.5.1
for t in x86_64-unknown-linux-gnu aarch64-apple-darwin x86_64-apple-darwin aarch64-unknown-linux-gnu; do
  printf '%s  %s\n' "$(curl -sLo /dev/null -w '%{http_code}' "$B/bithuman-$t.tar.gz")" "$t"
done
```

```text
200  x86_64-unknown-linux-gnu
200  aarch64-apple-darwin
404  x86_64-apple-darwin
404  aarch64-unknown-linux-gnu
rc=0
```

| Your machine | Target the installer asks for | `cli-v2.5.1` |
|---|---|---|
| Apple Silicon Mac | `aarch64-apple-darwin` | **published** |
| Linux x86_64 | `x86_64-unknown-linux-gnu` | **published** |
| **Intel Mac** | `x86_64-apple-darwin` | **never published, any release** |
| **Linux ARM (aarch64)** | `aarch64-unknown-linux-gnu` | not in 2.5.1 — `cli-v2.3.27` was the last |

On the bottom two rows `install.sh` resolves a download that does not exist and
exits **1** with `install: error: download failed.`

**"Never published" is measured, not assumed.** Across **all 69 releases** in
the tap, counting tarball assets per target:

| Target | Releases carrying it | Newest |
|---|---|---|
| `aarch64-apple-darwin` | 33 | `cli-v2.5.1` |
| `x86_64-unknown-linux-gnu` | 13 | `cli-v2.5.1` |
| `aarch64-unknown-linux-gnu` | 10 | `cli-v2.3.27` |
| `x86_64-apple-darwin` | **0** | **never** |

So there is no pin that helps on **Intel Mac** — no release has ever built it.
On **Linux ARM**, `BITHUMAN_VERSION=cli-v2.3.27` is the only tarball, and it is
many releases behind. For both, use the Python library
(`pip install bithuman`, which does publish manylinux aarch64) or a cloud
route.

**Homebrew (recommended on Apple Silicon)**

```bash
brew tap bithuman-product/bithuman
brew install bithuman-cli
```

**Universal installer (macOS Apple Silicon + Linux, no Python required)**

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

> ★ **Correction — 2026-09-03. Do not pin on Linux any more.** This page told
> Linux users to run the installer with `BITHUMAN_VERSION=cli-v2.4.2`, because
> `cli-v2.5.0` shipped a macOS tarball only. **`cli-v2.5.1` ships both**, so
> the unpinned command above is now the right one and the pin holds you three
> releases back. Run on a clean Linux x86_64 box on 2026-09-03, unpinned:
>
> ```text
> install: querying latest release...
> install: version: cli-v2.5.1
> install: target:  x86_64-unknown-linux-gnu
> install: downloading https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.5.1/bithuman-x86_64-unknown-linux-gnu.tar.gz
> install: verifying sha256...
> install: sha256 ok
> install: extracting...
> install: installed expression2-model (local realtime render host)
> install: installed engines/ (linux-x64-1.0.0.engine )
> install: installed: libessence 2.3.8 ABI 7
> rc=0
> ```

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
```

```text
libessence 2.3.8 ABI 7
bithuman    2.5.1
rc=0
```

That is the real output of the install transcribed above, on Linux x86_64.
`bithuman version --json` gives the machine-readable form:

```text
{"abi":7,"cli":"2.5.1","libessence":"2.3.8","schema_version":1}
rc=0
```

```bash
bithuman doctor   # full host + key + cache check
```

> **Pick a model family at download time — on Linux too, as of 2.5.1.**
> `bithuman pull <CODE> --model essence-2` asks for a family, and a plain
> `bithuman pull <CODE>` names the families it did *not* hand you. This page
> previously said the Linux binary had no `--model` flag; that was true of
> 2.4.2 and is **false for 2.5.1**. Verified on Linux, with the control that
> tells "flag accepted" apart from "flag unknown":
>
> ```text
> $ bithuman pull planning-nebula --model essence-2
> error: --model applies to YOUR agent codes (e.g. `bithuman pull A24EKJ8433 --model expression-2`),
>        not to the showcase slug 'planning-nebula' — showcase avatars have a single published artifact
> rc=66
>
> $ bithuman pull planning-nebula --zzz-nope
> Usage: bithuman pull <SLUG>
> rc=2
> ```
>
> `rc=66` is the flag being **parsed and refused on its meaning**; `rc=2` is
> what an unrecognised flag actually looks like. A page that only showed the
> first line could not tell you which one you were getting.

> **macOS 2.5.0 is the first Developer ID signed release.** Every build up to
> and including 2.4.2 was ad-hoc signed, so a tarball downloaded in a *browser*
> was quarantined and macOS killed it on launch with no message (exit 137).
> `brew install` was never affected — Homebrew fetches with `curl`, which sets
> no quarantine flag.

> **Note (Linux)** On Linux `bithuman doctor` reports **`✗ not ready`** for
> "Agent worker" and "audio_encoder.onnx" and offers `pip install bithuman-cli`
> as the fix — but that wheel is macOS-arm64-only, so the suggested command
> cannot succeed. The `bithuman` *library* wheel supplies the encoder
> (`pip install bithuman`); the "not ready" verdict does not stop `list`,
> `info`, `pull`, or `engine list` from working.

See the [CLI reference](/sdk/cli/overview) for all subcommands (`run`, `render`, `info`, `pull`, `list`, `doctor`, `init`, `login`/`logout`, and `mcp`).

### Python SDK (library) — GA

`pip install bithuman` is the on-device avatar runtime **library** — `from bithuman import AsyncBithuman`. macOS arm64 + Linux x86_64 / aarch64 (manylinux_2_28, glibc), Python 3.10–3.14. **2.10.0** publishes all three platforms on all five interpreters.

```bash
pip install bithuman
```

> **macOS note** As of 2.8.1 the macOS wheels are tagged for **macOS 14+ (arm64)** (the 2.3.x wheels required macOS 26+). On older macOS versions pip reports `No matching distribution found` — upgrade macOS, or contact [hello@bithuman.ai](mailto:hello@bithuman.ai).

Add the LiveKit agent integration:

```bash
pip install livekit-plugins-bithuman pillow
```

> **Note** The plugin currently imports Pillow without declaring it — install `pillow` alongside (upstream fix pending with LiveKit), or `from livekit.plugins import bithuman` fails with `ModuleNotFoundError: No module named 'PIL'`.

See the [Python SDK guide](/sdk/python).

### Swift / Apple SDK — Preview

On-device real-time avatar for iOS, iPadOS, and macOS via SwiftPM. Apple Silicon only.

In Xcode: **File → Add Package Dependencies…** → paste
`https://github.com/bithuman-product/homebrew-bithuman.git` → pick **2.5.0**
→ attach a product. The package wraps pre-compiled XCFrameworks with all
third-party deps statically linked — zero transitive SwiftPM dependencies.

- **`bitHumanKit`** — the umbrella (Expression 1 + an `.imx` avatar runtime +
  the on-device LLM/TTS stack). `import bitHumanKit`.
- **`Expression2`** — the [`expression-2`](/concepts/expression-2) engine on its
  own, new in 2.5.0. `import Expression2`. Ships a `macos-arm64` **and** an
  `ios-arm64` slice, and both have rendered on real hardware (including an
  iPhone). But it is **engine only: it ships no model weights**, and `isReady`
  stays `false` until a per-identity CoreML bundle is present as a directory of
  `.mlpackage` members. **No bundle in that form is published**, and there is no
  self-serve way to get one — email
  [hello@bithuman.ai](mailto:hello@bithuman.ai). The `<code>.avatar` you can
  download is a **different rail**: it feeds the CLI's local renderer and the
  cloud engines, and although it does carry CoreML members, it is a packed
  container rather than the directory this product reads, with no supported way
  to convert one into the other. See the
  [Swift SDK guide](/sdk/swift#expression-2-on-device).

`essence-2` is **not** on this rail. See the [Swift SDK guide](/sdk/swift).

### Android / Kotlin — Beta

Three on-device AARs on Maven Central under the `ai.bithuman` group, all
resolvable anonymously with no credential. As of 2026-09-03 **both second-
generation families have a published Android artifact**.

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("ai.bithuman:expression2-android:0.3.0")  // expression-2
    implementation("ai.bithuman:essence2-android:0.2.0")     // essence-2
}
```

| Coordinate | Model | `minSdk` | ABI |
|---|---|---|---|
| `ai.bithuman:expression2-android:0.3.0` | [expression-2](/concepts/expression-2) | 26 | `arm64-v8a` |
| `ai.bithuman:essence2-android:0.2.0` | [essence-2](/concepts/essence-2) | 29 | `arm64-v8a` |
| `ai.bithuman:sdk:2.3.6` | essence-1 | 29 | `arm64-v8a` |

Check the group listing yourself — the third line is the control that shows a
404 is really a 404:

```bash
for c in essence2-android/0.2.0 expression2-android/0.3.0 zzz-none/0.2.0; do
  a=${c%%/*}; v=${c##*/}
  printf '%s  %s\n' "$(curl -sLo /dev/null -w '%{http_code}' \
    "https://repo1.maven.org/maven2/ai/bithuman/$a/$v/$a-$v.pom")" "$c"
done
```

```text
200  essence2-android/0.2.0
200  expression2-android/0.3.0
404  zzz-none/0.2.0
rc=0
```

> ★ **Read the limits before you plan around this.** The essence-2 AAR ships
> knowingly under the "base offering first" ruling: it **fails the `PARITY_U8`
> gate at 2 levels** and sustained throughput is **1.63x short of the accepted
> bar**. `google()` is a required repository and `useLegacyPackaging = true` is
> not optional — leaving either out fails in a confusing place, or silently.
> The measured numbers and both negative controls are on the
> [Android SDK page](/sdk/android).

> **FFmpeg / LGPL.** `essence2-android` links FFmpeg 7.1 statically, and the
> LGPL-2.1 §6(a) relink materials are published beside the AAR on Maven
> Central. See [FFmpeg / LGPL — the Android relink
> offer](/legal/android-ffmpeg-lgpl). `expression2-android` carries no FFmpeg
> and needs no such offer.

`expression-1` and `essence-2-max` are **GPU-only** by the 2026-09-02 scope
ruling — their absence from Android is deliberate, not a gap.

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
| **macOS arm64 (M-series)** | Homebrew + `bithuman-cli` wheel | `bithuman` (3.10–3.14) | SwiftPM |
| **macOS x86_64 (Intel)** | **Never published** — no `x86_64-apple-darwin` tarball has ever shipped | Pending (1.x was last) | — |
| **Linux x86_64** | Universal installer (tarball), `cli-v2.5.1` | `bithuman` (manylinux) | — |
| **Linux aarch64** | **Not in 2.5.1** — `cli-v2.3.27` was the last release with an `aarch64-unknown-linux-gnu` tarball | `bithuman` (manylinux) | — |
| **Windows** | WSL2 today | WSL2 today (1.9.0 was the last native wheel) | — |
| **iOS / iPadOS** | — | — | SwiftPM |

macOS-Intel and Windows are tracked but not part of the 2.3 cut. If you're stuck on either, the 1.x line still has Windows wheels and a macOS-Intel build — pin the whole Python stack there until those targets graduate into the 2.x distribution.

## Current shipping versions

| Artifact | Latest version | Channel | Engine ABI |
|---|---|---|---|
| Python SDK (`bithuman`) | **2.10.0** | [PyPI](https://pypi.org/project/bithuman/) | v7 |
| Swift SDK (`bitHumanKit`) | **2.4.0** (pin the package at **2.5.0**) | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | v7 |
| Swift SDK (`Expression2`) | **2.5.0** | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | — (CoreML; no engine ABI) |
| bitHuman CLI (`bithuman-cli`) | **2.5.1** — macOS arm64 **and** Linux x86_64, same version, no pin needed · 2.3.25 (PyPI wheel) | [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (macOS) · [PyPI `bithuman-cli`](https://pypi.org/project/bithuman-cli/) (macOS Apple Silicon only) · universal installer (macOS Apple Silicon + Linux) | v7 |
| Android AAR (`ai.bithuman:expression2-android`) | **0.3.0** | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/expression2-android/) | — (LiteRT) |
| Android AAR (`ai.bithuman:essence2-android`) | **0.2.0** | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/essence2-android/) | — (ONNX Runtime 1.26.0) |
| bitHuman MCP server (`bithuman-mcp`) | **0.3.5** (also built into the CLI — [`bithuman mcp`](/guides/mcp-server)) | [PyPI](https://pypi.org/project/bithuman-mcp/) | — (API client, no engine) |

> **2.10.0, and why the macOS number matters.** 2.10.0 is the first release
> whose **macOS** wheel carries `lible_core` — the native half of the Essence 2
> offline render route. Every macOS wheel up to and including 2.9.0 shipped the
> Python half alone and raised `lible_core.so not found` at the first frame; the
> Linux wheels have carried it since 2.8.1. If you self-host on a Mac, upgrade.
>
> **Linux users who installed between 2026-09-01 and 2026-09-02 got 2.9.0.**
> 2.10.0 was published for macOS first and had no Linux files for about a day,
> so `pip install bithuman` on Linux silently resolved to the previous release.
> All ten Linux wheels (cp310–cp314 × x86_64/aarch64) are on PyPI now — run
> `pip install --upgrade bithuman` and confirm with
> `python -c "import bithuman; print(bithuman.__version__)"`.

Artifacts with **matching ABI** are interoperable even if their headline versions differ. Mixing surfaces in one project — for example the Swift SDK on iOS plus the Python `bithuman` 2.10.0 wheel on the backend — is supported and tested as long as the ABI columns line up.

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
| **iPhone 16 Pro+** | Preview | Expression **1** only — this table is the first-generation floor. Needs the increased-memory entitlement; on-device validation of Expression 1 is in progress. Prefer Essence for production. ([Expression 2](/sdk/swift#expression-2-on-device) is a different engine and has rendered on an iPhone, but publishes no model bundle yet.) |
| **Linux + NVIDIA GPU** | Server | 8 GB+ VRAM via the self-hosted Docker container |
| **Mac Intel / Linux CPU / Windows** | Needs a GPU — or use Essence | Expression needs Apple Silicon or an NVIDIA GPU; Essence runs on CPU-only hosts |
| **Raspberry Pi** | Use Essence | Essence runs near real-time on Pi 4B / 5 |

If you're deploying to iPhone today, choose **Essence**. The iPhone reference app is built around Essence and stays well inside Apple's per-app memory cap.

### Essence 2 / Expression 2 (second generation)

The tables above are the first-generation floors. The
[second-generation models](/concepts/models-v2) resolve their runtime tier for
you at session launch. Each model also produces one downloadable per-identity
artifact — where that artifact can run **locally today** differs by model.
For the file each family hands you by name, and what opens it, see
[what you get, per family](/sdk/cli/commands#what-you-get-per-family).

| Runtime | `essence-2` | `essence-2-max` | `expression-2` |
|---|---|---|---|
| bitHuman cloud (GPU · Apple Silicon · CPU chain) | Yes | GPU-only | Yes |
| Self-hosted CPU (your servers) | Offline rendering, metered — **SDK 2.9.0+ on Linux, 2.10.0+ on macOS** ([quickstart](/guides/deploy-self-hosted#essence-2-self-hosted--cpu-offline-rendering-sdk-290)); live streaming via cloud | — | Local rendering via the [CLI](/sdk/cli/overview#local-rendering-by-platform) (macOS Apple Silicon, Linux x86_64) |
| On-device Apple Silicon (Mac / iOS) | — not published ([Swift SDK](/sdk/swift) does not carry Essence 2) | — (cloud-only) | [Swift](/sdk/swift) `Expression2` 2.5.0+ ships **both** a `macos-arm64` and an `ios-arm64` slice and has rendered on **Mac and iPhone** — but it is **engine only, [with no model bundle published](/sdk/swift#expression-2-on-device)**, so neither is self-serve yet. The [CLI](/sdk/cli/overview#local-rendering-by-platform) renders a downloaded `<code>.avatar` locally on macOS Apple Silicon (macOS only — there is no iOS CLI) |
| Browser-local (WebGPU / WASM) | Rolling out (`?render=local`) | — | Rolling out (`?render=local`, LiteRT.js / WebGPU, WASM fallback) |

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
