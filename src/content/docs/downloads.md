---
title: "Downloads & versions"
description: "The current version and install line of every bitHuman artifact, the operating systems each one supports, and how to verify a download."
section: resources
group: "Resources"
order: 1
type: reference
label: "Downloads & versions"
---

Every bitHuman artifact at its current release. The same data is published as JSON for scripts and agents at [/versions.json](/versions.json).

## Current versions

<!-- VERSIONS:TABLE -->
| Artifact | Version | Runs on | Install | Published at |
|---|---|---|---|---|
| [CLI](/sdk/cli) | **2.7.8** | macOS (Apple silicon), Linux x86_64 and arm64 | `curl -fsSL https://install.bithuman.ai \| sh` | [GitHub release cli-v2.7.8](https://github.com/bithuman-product/homebrew-bithuman/releases) |
| [`bithuman` (Python)](/sdk/python) | **2.11.12** | Python 3.10–3.14 on macOS (Apple silicon), Linux x86_64 and arm64 | `pip install "bithuman[expression-2]"` | [PyPI](https://pypi.org/project/bithuman/) |
| [Swift package](/sdk/apple) | **2.16.0** (Essence 2 engine **1.13.0** · Expression 2 engine 2.7.0) | iOS, iPadOS and macOS on Apple silicon | `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.16.0")` | [GitHub tag v2.16.0](https://github.com/bithuman-product/homebrew-bithuman) |
| [`ai.bithuman:expression2-android`](/sdk/android) | **0.5.0** | Android, arm64-v8a | `implementation("ai.bithuman:expression2-android:0.5.0")` | [Maven Central](https://central.sonatype.com/artifact/ai.bithuman/expression2-android) |
| [`ai.bithuman:essence2-android`](/sdk/android) | **0.7.0** | Android, arm64-v8a | `implementation("ai.bithuman:essence2-android:0.7.0")` | [Maven Central](https://central.sonatype.com/artifact/ai.bithuman/essence2-android) |
| [`livekit-plugins-bithuman`](/sdk/livekit) | **1.8.4** | Python 3.10–3.14 | `pip install livekit-plugins-bithuman` | [PyPI](https://pypi.org/project/livekit-plugins-bithuman/) |
| [Flutter plugin](/sdk/android) | **2.6.17** | Android (iOS and macOS do not build from the published tag yet; a fix is coming) | `bithuman: {git: {url: https://github.com/bithuman-product/homebrew-bithuman.git, path: packages/flutter-plugin, ref: flutter-plugin-v2.6.17}}` | [GitHub tag flutter-plugin-v2.6.17](https://github.com/bithuman-product/homebrew-bithuman) |
<!-- /VERSIONS:TABLE -->

The web embed needs no install: one URL or one `<iframe>` ([Web](/sdk/web)). The MCP server ships inside the CLI as `bithuman mcp` ([MCP server](/sdk/mcp)). What changed in each release is in the [changelog](/changelog).

## Supported operating systems

| Platform | CLI | Python | Swift package | Android |
|---|---|---|---|---|
| macOS, Apple silicon | yes | yes (macOS 14+) | yes | — |
| macOS, Intel | no | no | no | — |
| Linux x86_64 | yes | yes | — | — |
| Linux arm64 | yes | yes | — | — |
| Windows | under WSL2 | under WSL2 | — | — |
| iOS / iPadOS | — | — | yes | — |
| Android (arm64-v8a) | — | — | — | yes |

On an unsupported platform the CLI installer names the platform and stops, and `pip install bithuman` finds no wheel. Neither installs anything.

The CLI is not on PyPI. The only bitHuman package on PyPI with the `bithuman` name is the Python library, and it installs no command. Get the CLI from the installer or the Homebrew formula `bithuman-cli`.

## Verify a download

The installer checks each tarball against the `.sha256` file published beside it on the [releases page](https://github.com/bithuman-product/homebrew-bithuman/releases), prints `sha256 ok`, and stops on a mismatch. To check a tarball you downloaded yourself, put the `.sha256` file next to it and run:

```bash
# Linux
sha256sum -c bithuman-x86_64-unknown-linux-gnu.tar.gz.sha256
# macOS
shasum -a 256 -c bithuman-aarch64-apple-darwin.tar.gz.sha256
```

pip verifies the Python wheel against the digest PyPI publishes.
