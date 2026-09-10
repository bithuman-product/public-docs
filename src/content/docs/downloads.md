---
title: "Downloads"
description: "Get the bitHuman SDK: install commands for every surface plus the full device and platform support matrix."
section: resources
group: "Resources"
order: 2
---

## Get the SDK

> **Note** **Twenty Essence 2 and Expression 2 models are free to download —
> no api-secret, no account.** `curl -s https://api.bithuman.ai/v1/models/showcase`
> lists them, `bithuman list --manifest https://api.bithuman.ai/v1/models/showcase`
> browses them, and `curl -L "https://api.bithuman.ai/v1/agent/X03BOLT/model/download" -o avatar.imx`
> fetches one. Running one locally is a self-hosted session and is
> [metered](/guides/pricing) — the free tier covers it. See
> [CLI — Hello, avatar](/examples/cli-hello#essence-2-and-expression-2-without-an-agent-of-your-own).


One engine — the essence engine — drives every surface. Pick the install path that matches what you're building — they all read the same `.imx` avatar file and produce identical frames.

### bitHuman CLI (no code)

The fastest way to see an avatar talk. **macOS arm64 and Linux x86_64.** The
Homebrew formula and the universal installer deliver the same Rust binary, on
the same version on both platforms. The PyPI wheel is a macOS-only sibling and
still trails at `2.3.25`.

**`cli-v2.6.5` (2026-09-10) is the current release**, on the same two targets
and built from one commit (`98fa0b4`). It carries essence engine
**3.1.0** (printed under the engine's legacy spelling), and it removes a five-minute ceiling on an `essence-2`
`bithuman render`: the budget the render spent was a *start-up* timeout of
300 s that was never moved, so the longest clip the command could finish was
whatever the machine rendered in five minutes. The Essence 2 runtime has shipped
**inside the tarball on both platforms** since 2.6.1, so `bithuman render` and
`bithuman run` handle a downloaded Essence 2 `<code>.imx` locally, the way they
already handled Expression 2. A self-hosted session has been metered on both
platforms since 2.6.2; 2.6.3 bills it on **wall-clock time while the session is
live**, which is what the [pricing page](/guides/pricing) defines — 2.6.2
counted frames delivered ÷ fps and under-counted a preview on a machine whose
engine paints slowly (the download stays free — [self-host
guide](/guides/self-host-local#the-cli-meters-a-self-hosted-session)). The live
preview also holds its nominal frame rate now. Tarballs and digests, from the
release's own `.sha256` sidecars:

| Target | Tarball | sha256 |
|---|---|---|
| Linux x86_64 | `bithuman-x86_64-unknown-linux-gnu.tar.gz` | `fc3690f0690f81e40975b9a1a4cdbb69f517434502f2bd77eb36f449525b0825` |
| macOS arm64 (Developer ID signed, notarized) | `bithuman-aarch64-apple-darwin.tar.gz` | `b95594119a12f54a3748b21a4b51efb230da002941ec8954cea5e3e072476a56` |

What changed, release by release, is in the [changelog](/changelog).

**`cli-v2.6.5` publishes exactly two targets**, and one of the two it does not
publish has never shipped at all. Re-measured against the release on
2026-09-10 — the 404s are the control that makes the 200s mean something:

```bash
B=https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.6.5
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

| Your machine | Target the installer asks for | `cli-v2.6.5` |
|---|---|---|
| Apple Silicon Mac | `aarch64-apple-darwin` | **published** |
| Linux x86_64 | `x86_64-unknown-linux-gnu` | **published** |
| **Intel Mac** | `x86_64-apple-darwin` | **never published, any release** |
| **Linux ARM (aarch64)** | `aarch64-unknown-linux-gnu` | not in 2.6.5 — `cli-v2.3.27` was the last |

On the bottom two rows `install.sh` reads the release's asset list, finds no
tarball for the target, names the two it does carry, and exits **1** before
downloading anything.

**"Never published" is measured, not assumed.** Across **all 84 releases** in
the tap on 2026-09-10, counting tarball assets per target:

| Target | Releases carrying it | Newest |
|---|---|---|
| `aarch64-apple-darwin` | 39 | `cli-v2.6.5` |
| `x86_64-unknown-linux-gnu` | 19 | `cli-v2.6.5` |
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

> ★ **Do not pin on Linux.** This page once told Linux users to run the
> installer with `BITHUMAN_VERSION=cli-v2.4.2`, because `cli-v2.5.0` shipped a
> macOS tarball only. Every release since `cli-v2.5.1` ships both, so the
> unpinned command above is the right one and a pin only holds you back. Run
> on a clean Linux x86_64 box on 2026-09-07, unpinned, into a fresh home
> directory:
>
> ```text
> install: querying latest release...
> install: version: cli-v2.6.5
> install: target:  x86_64-unknown-linux-gnu
> install: install dir: /home/you/.local/bin
> install: downloading https://github.com/bithuman-product/homebrew-bithuman/releases/download/cli-v2.6.5/bithuman-x86_64-unknown-linux-gnu.tar.gz
> install: verifying sha256...
> install: sha256 ok
> install: extracting...
> install: installed expression2-model (local realtime render host)
> install: installed engines/ (linux-x64-1.0.0.engine )
> install:
> install: installed: libessence 2.3.8 ABI 7
> install:   -> /home/you/.local/bin/bithuman
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
libessence 3.1.0 ABI 7
bithuman    2.6.5
build       98fa0b448b9a x86_64-unknown-linux-gnu/release 2026-09-10T11:54:59Z 8dad1d3c09bd
engine      linux 1.0.0 adc2a18da787
rc=0
```

That is the real output of the install transcribed above, on Linux x86_64.
`bithuman version --json` gives the machine-readable form (the `build` and
`engine` objects — the commit, target and the shipped Expression 2 engine's
digest — are elided here):

```text
{"abi":7,"build":{…},"cli":"2.6.5","engine":{…},"libessence":"3.1.0","schema_version":1}
rc=0
```

```bash
bithuman doctor   # full host + key + cache check
```

> **Pick a model family at download time — on both platforms.**
> `bithuman pull <CODE> --model essence-2` asks for a family (and as of 2.6.1
> the Essence 2 file it hands you renders locally), and a plain
> `bithuman pull <CODE>` names the families it did *not* hand you. This page
> once said the Linux binary had no `--model` flag; that was true of 2.4.2
> and has been false since 2.5.1. Re-run on 2.6.1 on 2026-09-07, with the
> control that tells "flag accepted" apart from "flag unknown":
>
> ```text
> $ bithuman pull planning-nebula --model essence-2
> error: --model applies to YOUR agent codes (e.g. `bithuman pull A24EKJ8433 --model expression-2`), not to the showcase slug 'planning-nebula' — showcase avatars have a single published artifact
> rc=66
>
> $ bithuman pull planning-nebula --zzz-nope
> error: unexpected argument '--zzz-nope' found
>
>   tip: to pass '--zzz-nope' as a value, use '-- --zzz-nope'
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

See the [CLI reference](/sdk/cli) for all subcommands (`run`, `render`, `info`, `pull`, `list`, `doctor`, `init`, `login`/`logout`, and `mcp`).

### Python SDK (library) — GA

`pip install bithuman` is the on-device avatar runtime **library** — `import bithuman`, then `bithuman.open(...)` and `avatar.render(...)`. macOS arm64 + Linux x86_64 / aarch64 (manylinux_2_28, glibc), Python 3.10–3.14. **3.0.0** is a clean break from 2.x — eight names, four refusals, RGB frames, and essence-2 **and** expression-2 through the same two calls; `pip install "bithuman<3"` keeps you on 2.10.0, which stays on PyPI.

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
`https://github.com/bithuman-product/homebrew-bithuman.git` → attach a product.
**The version rule lives in exactly one place — [Install](/sdk/ios#install) on
the Apple page** — because this page carried a second, older one until
2026-09-10 and the two disagreed. The package wraps pre-compiled XCFrameworks
with all third-party deps statically linked, so you take zero transitive SwiftPM
dependencies.

- **`bitHumanKit`** — the umbrella: an on-device avatar engine, an `.imx`
  avatar runtime and the on-device LLM/TTS stack. `import bitHumanKit`.
  ★ It is **not** an Apple build of [`expression-1`](/concepts/expression-1),
  which is [GPU-only](/concepts/where-models-run) and has no Apple artifact.
- **`Expression2`** — the [`expression-2`](/concepts/expression-2) engine on its
  own, new in 2.5.0. `import Expression2`. Ships a `macos-arm64` **and** an
  `ios-arm64` slice, and both have rendered on real hardware (including an
  iPhone). It is **engine only: it ships no model weights**, and `isReady`
  stays `false` until it is given a per-identity CoreML bundle.
  ★ **2.6.0 (2026-09-06) is the release that lets you give it one.** It adds
  `Expression2Engine.create(modelPath:…)`, a
  `create(avatarContainer:…:stagingDir:)` that opens the `<code>.avatar` the
  [download endpoint](/api/agents#download-an-agents-model) returns, and the
  `Expression2Container` reader — all three read **0** in 2.5.0's shipped module
  interface and are present in 2.6.0's. It also adds a third binary target,
  `UnifiedModelHeader`, which rides under the `Expression2` product; attach the
  product and you get it. This supersedes the sentence this page carried until
  today, that there was "no supported way to convert one into the other". See
  the [Swift SDK guide](/sdk/ios#expression-2-on-device).
- **`Essence2`** — the [`essence-2`](/concepts/essence-2) engine, a product
  since **2.7.0** (2026-09-06) and importable as `import Essence2` since
  **2.8.0** (2026-09-07). A C interface with no Swift type on top, two binary
  targets under one product (the engine and an ONNX Runtime build), built for
  iOS device, iOS simulator and macOS. The engine's resources are published on
  the same release; **no in-app model download route exists yet** — the
  download endpoint takes the account secret, not a runtime token. See
  [Essence 2 on-device](/sdk/ios#essence-2-on-device).

This page said until 2026-09-07 that `essence-2` was **not** on this rail.
That was true when written and is false now.

### Android / Kotlin — Beta

Three on-device AARs on Maven Central under the `ai.bithuman` group, all
resolvable anonymously with no credential. **Both second-generation families
have a published Android artifact**; `expression2-android` moved to
**`0.3.1`** on 2026-09-04 and `essence2-android` to **`0.5.1`** on 2026-09-08,
and the versions below are Central's own `<release>` values, re-read
anonymously on 2026-09-09.

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("ai.bithuman:expression2-android:0.3.1")  // expression-2
    implementation("ai.bithuman:essence2-android:0.5.1")     // essence-2 — 0.2.0 through 0.5.0 resolve too; use none of them
}
```

| Coordinate | Model | `minSdk` | ABI |
|---|---|---|---|
| `ai.bithuman:expression2-android:0.3.1` | [expression-2](/concepts/expression-2) | 26 | `arm64-v8a` |
| `ai.bithuman:essence2-android:0.5.1` | [essence-2](/concepts/essence-2) | 29 | `arm64-v8a` |
| `ai.bithuman:sdk:2.3.6` | essence-1 — ★ resolves and compiles, but **cannot authenticate on a device**: [why](/sdk/android#essence-1--aibithumansdk236) | 29 | `arm64-v8a` |

★ **`arm64-v8a` is the only ABI in any of the three.** An x86_64 emulator
resolves and installs, then throws `UnsatisfiedLinkError` at the first
`System.loadLibrary` — there is no slice to fall back to. Use a physical arm64
device or an `arm64-v8a` system image.

Check the group listing yourself — the third line is the control that shows a
404 is really a 404:

```bash
for c in essence2-android/0.5.1 expression2-android/0.3.1 zzz-none/0.2.0; do
  a=${c%%/*}; v=${c##*/}
  printf '%s  %s\n' "$(curl -sLo /dev/null -w '%{http_code}' \
    "https://repo1.maven.org/maven2/ai/bithuman/$a/$v/$a-$v.pom")" "$c"
done
```

```text
200  essence2-android/0.5.1
200  expression2-android/0.3.1
404  zzz-none/0.2.0
rc=0
```

Re-run 2026-09-09. 

> ★ **Read the limits before you plan around this.** Both second-generation
> AARs ship under the "base offering first" ruling: the measured frame rates,
> the parity figure, and — for essence-2 — the fact that it plays the avatar's
> recorded sequence with no audio-in entry point yet **and that no public host
> serves the bundle its model store fetches**, are on the
> [Android SDK page](/sdk/android). An audio-driven talking head on Android
> today is **expression-2**; the whole project is on
> [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello).
> For expression-2, `useLegacyPackaging = true` is not optional — leaving it out
> fails silently.
>
> ★**Keep `google()` in `dependencyResolutionManagement`.** What changed with
> `expression2-android` `0.3.1` is narrower than "you can drop it": its POM
> declares only `org.jetbrains.kotlin:kotlin-stdlib:2.0.21`, where `0.3.0`'s
> also declared `com.google.ai.edge.litert:litert:2.2.0`, which is 404 on
> Central — so the **SDK's own dependency** no longer needs Google's Maven.
> AGP still does: it resolves its own `aapt2` out of the *dependency*
> repositories, and `aapt2` is published only there. Measured 2026-09-09 with
> `mavenCentral()` alone, the build compiles Kotlin and then dies at
> `:app:processDebugResources` with
> `Could not find com.android.tools.build:aapt2:8.7.3-12006047`. A build
> **pinned to `0.3.0` fails earlier still**, at `checkReleaseAarMetadata` — a
> published POM cannot be replaced. The measured numbers and both negative
> controls are on the [Android SDK page](/sdk/android).

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

> **Note** Flutter is a **reference app only**, not a published code SDK — it is not on pub.dev, so do not add `bithuman: ^X.Y.Z` to a `pubspec.yaml`. Build Flutter apps on the [Swift SDK](/sdk/ios) via platform channels until it ships. This is the one page that states Flutter's status. See [community](/community) for how to follow it.

## What ships in 2.3

2.3.0 is the first **split-wheel** release: the Python library (`pip install bithuman`) and the CLI binary (`pip install bithuman-cli` or `brew install bithuman-product/bithuman/bithuman-cli`) are now separate packages. Pre-2.3 PyPI bundled both — 2.2.x with the bundled CLI is still on PyPI and works, but consider it legacy; pin to 2.3+ for new projects.

| Platform | CLI binary | Python wheel | Swift SDK |
|---|---|---|---|
| **macOS arm64 (M-series)** | Homebrew + `bithuman-cli` wheel | `bithuman` (3.10–3.14) | SwiftPM |
| **macOS x86_64 (Intel)** | **Never published** — no `x86_64-apple-darwin` tarball has ever shipped | Pending (1.x was last) | — |
| **Linux x86_64** | Universal installer (tarball), `cli-v2.6.5` | `bithuman` (manylinux) | — |
| **Linux aarch64** | **Not in 2.6.5** — `cli-v2.3.27` was the last release with an `aarch64-unknown-linux-gnu` tarball | `bithuman` (manylinux) | — |
| **Windows** | WSL2 today | WSL2 today (1.9.0 was the last native wheel) | — |
| **iOS / iPadOS** | — | — | SwiftPM |

macOS-Intel and Windows are tracked but not part of the 2.3 cut. If you're stuck on either, the 1.x line still has Windows wheels and a macOS-Intel build — pin the whole Python stack there until those targets graduate into the 2.x distribution.

## Current shipping versions

| Artifact | Latest version | Channel | Engine ABI |
|---|---|---|---|
| Python SDK (`bithuman`) | **3.1.0** (2026-09-10; 2.10.0 stays on PyPI, pin `bithuman<3` to stay) | [PyPI](https://pypi.org/project/bithuman/) | v7 |
| Swift SDK (`bitHumanKit`) | binary **2.4.0** — the package version to pin is on [Install](/sdk/ios#install), the only page that states it | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | v7 |
| Swift SDK (`Expression2`) | **2.6.0** | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | — (CoreML; no engine ABI) |
| Swift SDK (`Essence2`) | engine release **`essence2-v1.4.0`**, declared by the package at **2.10.0** | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) | — (C interface; ONNX Runtime 1.26.0 rides with it) |
| bitHuman CLI (`bithuman-cli`) | **2.6.5** (2026-09-10) — macOS arm64 **and** Linux x86_64, same version, no pin needed, engine core `libessence` 3.1.0, an `essence-2` render no longer stops after five minutes of work, Essence 2 runtime inside both tarballs, self-hosted sessions metered on both and billed on wall-clock, a rejected key gets 300 s and then the session stops · 2.3.25 (PyPI wheel) | [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (macOS) · [PyPI `bithuman-cli`](https://pypi.org/project/bithuman-cli/) (macOS Apple Silicon only) · universal installer (macOS Apple Silicon + Linux) | v7 |
| Android AAR (`ai.bithuman:expression2-android`) | **0.3.1** | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/expression2-android/) | — (LiteRT) |
| Android AAR (`ai.bithuman:essence2-android`) | **0.5.1** (2026-09-08; `0.2.0`, `0.3.0`, `0.4.0` and `0.5.0` are permanent on Central and superseded — `0.5.0` renders a rejected key for ever) | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/essence2-android/) | — (ONNX Runtime 1.26.0) |
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

Heavier high-fidelity model, and this table is the **first-generation** floor:
**Expression 1 is GPU-only.** It runs server-side on NVIDIA GPUs and there is
**no Apple on-device build of it** — see
[where each model runs](/concepts/where-models-run).

| Host | Status | Notes |
|---|---|---|
| **Linux + NVIDIA GPU** | Server | 8 GB+ VRAM via the self-hosted Docker container |
| **Mac M3+ (arm64)** | Not applicable | No Apple build of Expression 1 — see the correction below |
| **iPad Pro M4+** | Not applicable | Same — GPU-only by scope ruling, not a pending port |
| **iPhone 16 Pro+** | Not applicable | Same. ([Expression 2](/sdk/ios#expression-2-on-device) is a **different engine**, has rendered on an iPhone, and publishes no model bundle yet.) |
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

| Runtime | `essence-2` | `essence-2-max` | `expression-2` |
|---|---|---|---|
| bitHuman cloud (GPU · Apple Silicon · CPU chain) | Yes | GPU-only | Yes |
| Self-hosted CPU (your servers) | Offline rendering, metered — **SDK 2.9.0+ on Linux, 2.10.0+ on macOS** ([quickstart](/guides/deploy-self-hosted#essence-2-self-hosted--cpu-offline-rendering-sdk-290)); local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) — `render` and `run` — on macOS Apple Silicon and Linux x86_64 (**2.6.1**); live streaming via cloud | — | Local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) (macOS Apple Silicon, Linux x86_64) |
| On-device Apple Silicon (Mac / iOS) | The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `<code>.imx` locally on macOS Apple Silicon (2.6.1; macOS only — there is no iOS CLI). In your own app: the [Swift](/sdk/ios#essence-2-on-device) `Essence2` product, package **2.8.0** — the engine's C interface, builds for iOS device, iOS simulator and macOS; resources published; **no in-app model download route yet** | — (cloud-only) | [Swift](/sdk/ios) `Expression2` 2.6.0 ships **both** a `macos-arm64` and an `ios-arm64` slice and has rendered on **Mac and iPhone**. It is **engine only**, but as of 2.6.0 it [takes a model path and opens the downloaded container](/sdk/ios#expression-2-on-device), so an app with its own agent can hand it one. The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `<code>.avatar` locally on macOS Apple Silicon (macOS only — there is no iOS CLI) |
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
| v5 and earlier | pre-1.16 | Retired in production builds — synchronous only, no streaming. |

Confirm the ABI tag on a live host with `bithuman doctor`.
