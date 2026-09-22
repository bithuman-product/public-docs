---
title: "Downloads"
description: "Get the bitHuman SDK: install commands for every surface, the current shipping versions, and where each second-generation model runs."
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
| [Android](/sdk/android) — arm64-v8a, minSdk 26 | `implementation("ai.bithuman:expression2-android:0.4.8")` | `Expression2ModelStore(context).fetch(code)`, anonymous |
| [iOS & iPadOS](/sdk/ios) — a physical device, Xcode 26+ | `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.14.0")`, product `Expression2` | three anonymous `curl`s for a showcase identity |
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

**The Python wheel ships for Python 3.10–3.14 on Linux x86_64, Linux aarch64, and Apple-silicon macOS (14 or newer).** That is the whole set. Anywhere else — Windows, an Intel Mac — `pip install bithuman` stops at `bithuman 2.11.6 has NO WHEEL for this platform.`, prints that set, and installs nothing: since 2026-09-20 the release also carries a source distribution that exists only to refuse, so pip cannot fall back to an older wheel (before that date an Intel Mac quietly received a 1.x release). On Windows, run it under WSL2, which is a supported Linux.

**Verify what you downloaded.** Every CLI release publishes a `.sha256` sidecar
beside each tarball on the
[releases page](https://github.com/bithuman-product/homebrew-bithuman/releases)
— `bithuman-aarch64-apple-darwin.tar.gz.sha256` and
`bithuman-x86_64-unknown-linux-gnu.tar.gz.sha256` — and `install.sh` checks the
tarball against it before installing anything: it prints `sha256 ok`, and it
stops on a mismatch or when the machine has neither `shasum` nor `sha256sum`.
For a tarball you fetched by hand, put the sidecar next to it and run
`sha256sum -c bithuman-x86_64-unknown-linux-gnu.tar.gz.sha256` (macOS:
`shasum -a 256 -c bithuman-aarch64-apple-darwin.tar.gz.sha256`). The Python
wheel is verified by pip against the digest PyPI publishes; the current wheel's
digest is on the [Python API page](/sdk/python-api).

## Current shipping versions

| Artifact | Latest version | Where it comes from |
|---|---|---|
| Python SDK (`bithuman`) | **2.11.6** — `pip install bithuman`, unconstrained, resolves it, and so does a `bithuman<3` pin (`livekit-plugins-bithuman` declares one); the 3.x line was withdrawn from PyPI on 2026-09-16, and 2.11.6 is its engine with the 2.x import surface carried alongside. It pulls no `torch`: the legacy `bithuman[offline]` and `bithuman[tessera]` extras were removed on 2026-09-20 | [PyPI](https://pypi.org/project/bithuman/) |
| Swift SDK (`bitHumanKit`) | binary **2.4.0** — the package version to pin is on [Install](/sdk/ios#install), the only page that states it | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) |
| Swift SDK (`Expression2`) | **2.6.3** (the package tag to pin is on [Install](/sdk/ios#install) — `from:` resolves it; `idleLoop` left the public surface in 2.6.3, see the [changelog](/changelog)) | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) |
| Swift SDK (`Essence2`) | ships with the package — pin the package version on [Install](/sdk/ios#install) and the engine comes with it. Pin **2.14.0**: it ships Essence 2 engine **1.10.0**, opens the `.imx` you download here, and is the first tag on which one app can take **both** `Expression2` and `Essence2` and link on device. | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) |
| bitHuman CLI | the current release, named on [/sdk/cli](/sdk/cli#install) — macOS arm64 **and** Linux x86_64, same version, no pin needed; what each release changed is in the [changelog](/changelog) | [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (macOS) · universal installer (macOS Apple Silicon + Linux) |
| Android AAR (`ai.bithuman:expression2-android`) | **0.4.8** (`0.4.7` and earlier stay on Central and are superseded — only `0.4.8` declares the Qualcomm accelerator runtime itself, so an older pin renders on the CPU unless you add it by hand, see the [changelog](/changelog)) | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/expression2-android/) |
| Android AAR (`ai.bithuman:essence2-android`) | **0.5.12** (`0.2.0` through `0.5.11` stay on Central and are superseded — `0.5.1` and `0.5.2` cannot install a model on a handset; `0.5.7` delivers 72–77 % of a reply's frames under an un-paced feed, see the [changelog](/changelog)) | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/essence2-android/) |
| bitHuman MCP server | ships **inside the CLI** — [`bithuman mcp`](/guides/mcp-server) | [install.bithuman.ai](https://install.bithuman.ai) |

> **`lible_core.so not found` at the first frame** means an old wheel that
> shipped without the native half of the Essence 2 offline render route. Current
> wheels carry it on both macOS and Linux: `pip install --upgrade bithuman`,
> then confirm with `python -c "from importlib.metadata import version; print(version('bithuman'))"`.

Surfaces are meant to be mixed — the Swift SDK on iOS with the Python wheel on your backend, for example. Keep each one current and they stay compatible; we handle the versioning underneath.

## Device and platform support

Which model runs on which device — and how fast — is on two pages, and only
there: [the SDK page](/sdk) for what each platform ships and
[performance](/sdk/performance) for the measured frame rates.
`expression-1` is GPU-only by design: it has no Apple, Android or browser
build, and self-hosting it is the [NVIDIA container](/guides/deploy-self-hosted).

### Essence 2 / Expression 2 (second generation)

The [second-generation models](/concepts/models-v2) resolve their runtime tier
for you at session launch. Each model also produces one downloadable
per-identity artifact — where that artifact can run **locally today** differs
by model. For the file each family hands you by name, and what opens it, see
[what you get, per family](/sdk/cli/reference#what-you-get-per-family).

| Runtime | `essence-2` | `expression-2` |
|---|---|---|
| bitHuman cloud (GPU · Apple Silicon · CPU chain) | Yes | Yes |
| Self-hosted CPU (your servers) | Local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) — `render` and `run` — on macOS Apple Silicon and Linux x86_64 (**2.6.1**); frames and whole clips through the current `bithuman` wheel on Linux and macOS ([quickstart](/guides/deploy-self-hosted#essence-2-on-your-own-cpu)), metered | Local rendering via the [CLI](/sdk/cli#what-renders-locally-and-where) (macOS Apple Silicon, Linux x86_64) and the `bithuman[expression-2]` wheel |
| On-device Apple Silicon (Mac / iOS) | The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `.imx` locally on macOS Apple Silicon (2.6.1; macOS only — there is no iOS CLI). In your own app: the [Swift](/sdk/ios#install) `Essence2` product renders the downloaded `.imx` on iPhone and Mac from **2.13.2** — you fetch the file yourself, there is **no in-app download route** | The [Swift](/sdk/ios) `Expression2` product ships both a Mac and an iPhone slice and has rendered on both. It is **engine only**, but it [takes a model path and opens the downloaded container](/sdk/ios#minimal-code), so an app with its own agent can hand it one. The [CLI](/sdk/cli#what-renders-locally-and-where) renders a downloaded `.avatar` locally on macOS Apple Silicon (macOS only — there is no iOS CLI) |
| Android (`arm64-v8a`) | In your own app: the `ai.bithuman:essence2-android` library ([coordinate](/sdk/android#troubleshooting), [API](/sdk/android-api#essence2avatar)) | In your own app: the `ai.bithuman:expression2-android` library ([Android SDK](/sdk/android)) |
| Browser-local (WebGPU / WASM) | Rolling out (`?render=local`) | Rolling out (`?render=local`, LiteRT.js / WebGPU, WASM fallback) |

Full details, force-tier slugs, and rollout status:
[Where each model runs](/concepts/models-v2#where-each-model-runs).

### Avatar resolutions

Each family renders at its own native size — Essence 2 animates the identity
at 1080p, Expression 2 generates a 416×720 scene — so there is no one frame
size "every SDK" delivers. The [Video API](/api/video) states the output size
per model; the [model comparison](/concepts/models-v2) states each family's
native resolution.
