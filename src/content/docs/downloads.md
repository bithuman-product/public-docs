---
title: "Downloads"
description: "Install bitHuman on every surface: one install line per platform, the current shipping versions, which operating systems each artifact supports, and how to verify a download."
section: resources
group: "Resources"
order: 2
---

## Get the SDK

One install line per platform. Each row links to the page that owns everything
after it — a model to fetch, the minimal code, and the fixes for every refusal.

| Platform | Install |
|---|---|
| [CLI](/sdk/cli) — macOS Apple Silicon, Linux x86_64 and arm64 | `curl -fsSL https://install.bithuman.ai \| sh` |
| [Python](/sdk/python) — 3.10–3.14 | `pip install "bithuman[expression-2]"` |
| [Apple](/sdk/ios) — iPhone, iPad, Mac | `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.14.1")` |
| [Android](/sdk/android) — arm64-v8a | `implementation("ai.bithuman:expression2-android:0.4.8")` · `implementation("ai.bithuman:essence2-android:0.5.13")` |
| [Web](/sdk/web) — any modern browser | nothing — one URL or one `<iframe>` |

Which model runs on which platform is on [Models](/concepts/models#where-each-model-runs);
measured frame rates are on [performance](/sdk/performance).

## Current shipping versions

| Artifact | Latest version | Where it comes from |
|---|---|---|
| Python SDK (`bithuman`) | **2.11.6** — what `pip install bithuman` resolves, and what a `bithuman<3` pin resolves too | [PyPI](https://pypi.org/project/bithuman/) |
| Swift package | pin **2.14.1** or newer — it ships Essence 2 engine **1.10.0** beside `Expression2` 2.6.4, one app can take both products, and it is the first tag a macOS **app** can embed and whose `Essence2` declares its own linker settings | [SwiftPM](https://github.com/bithuman-product/homebrew-bithuman) |
| bitHuman CLI | the newest release — the installer always fetches it; `bithuman --version` shows yours | [install.bithuman.ai](https://install.bithuman.ai) · [Homebrew](https://github.com/bithuman-product/homebrew-bithuman) (Apple Silicon) |
| Android AAR (`ai.bithuman:expression2-android`) | **0.4.8** — the first that brings the Qualcomm accelerator runtime itself | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/expression2-android/) |
| Android AAR (`ai.bithuman:essence2-android`) | **0.5.13** | [Maven Central](https://repo1.maven.org/maven2/ai/bithuman/essence2-android/) |
| bitHuman MCP server | ships inside the CLI — [`bithuman mcp`](/guides/mcp-server) | the CLI |

What each release changed is in the [changelog](/changelog).

## Supported operating systems

| Platform | CLI | Python wheel | Swift package |
|---|---|---|---|
| **macOS, Apple Silicon** | yes | yes (macOS 14+) | yes |
| **macOS, Intel** | no | no | — |
| **Linux x86_64** | yes | yes | — |
| **Linux aarch64** | yes (from 2.7.1) | yes | — |
| **Windows** | under WSL2 | under WSL2 | — |
| **iOS / iPadOS** | — | — | yes |

On an unsupported platform, the CLI installer names the platform and stops, and
`pip install bithuman` stops with `bithuman 2.11.6 has NO WHEEL for this
platform.` — neither installs anything.

**The CLI is not on PyPI.** `bithuman` is the only bitHuman package there: the
Python library, which installs no command. The CLI comes from the installer, or
from the Homebrew formula `bithuman-cli`. A package on PyPI with a bitHuman-like
name that is not `bithuman` is not ours.

## Verify a download

`install.sh` checks each tarball against the `.sha256` sidecar published beside
it on the [releases page](https://github.com/bithuman-product/homebrew-bithuman/releases),
prints `sha256 ok`, and stops on a mismatch. For a tarball you fetched by hand,
put the sidecar next to it and run
`sha256sum -c bithuman-x86_64-unknown-linux-gnu.tar.gz.sha256` (macOS:
`shasum -a 256 -c bithuman-aarch64-apple-darwin.tar.gz.sha256`). pip verifies
the Python wheel against the digest PyPI publishes.
