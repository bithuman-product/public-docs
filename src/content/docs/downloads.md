---
title: "Downloads & versions"
description: "The current version and install line of every bitHuman artifact, the operating systems each one supports, and how to verify a download."
section: resources
group: "Resources"
order: 10
type: reference
---

Every bitHuman artifact at its current release. The same data is published as JSON for scripts and agents at [/versions.json](/versions.json).

## Current versions

<!-- VERSIONS:TABLE -->
| Artifact | Version | Runs on | Install | Published at |
|---|---|---|---|---|
| [CLI](/platforms/cli) | **2.8.4** | macOS (Apple silicon), Linux x86_64 and arm64 | `curl -fsSL https://install.bithuman.ai \| sh` | [GitHub release cli-v2.8.4](https://github.com/bithuman-product/homebrew-bithuman/releases) |
| [`bithuman` (Python)](/platforms/python) | **2.11.18** | Python 3.10–3.14 on macOS (Apple silicon), Linux x86_64 and arm64, Windows 10/11 x86_64 | `pip install "bithuman[expression-2]"` | [PyPI](https://pypi.org/project/bithuman/) |
| [Swift package](/platforms/ios) | **2.19.1** (Essence 2 engine **1.15.0** · Expression 2 engine 2.19.0) | iOS, iPadOS and macOS on Apple silicon | `.package(url: "https://github.com/bithuman-product/homebrew-bithuman.git", from: "2.19.1")` | [GitHub tag v2.19.1](https://github.com/bithuman-product/homebrew-bithuman) |
| [`ai.bithuman:expression2-android`](/platforms/android) | **0.5.2** | Android, arm64-v8a | `implementation("ai.bithuman:expression2-android:0.5.2")` | [Maven Central](https://central.sonatype.com/artifact/ai.bithuman/expression2-android) |
| [`ai.bithuman:essence2-android`](/platforms/android) | **0.8.1** | Android, arm64-v8a | `implementation("ai.bithuman:essence2-android:0.8.1")` | [Maven Central](https://central.sonatype.com/artifact/ai.bithuman/essence2-android) |
| [`livekit-plugins-bithuman`](/platforms/livekit) | **1.8.4** | Python 3.10–3.14 | `pip install livekit-plugins-bithuman` | [PyPI](https://pypi.org/project/livekit-plugins-bithuman/) |
| [Flutter plugin](/platforms/flutter) | **2.6.22** | Android (arm64-v8a); iOS and macOS build from the published tag | `bithuman: {git: {url: https://github.com/bithuman-product/homebrew-bithuman.git, path: packages/flutter-plugin, ref: flutter-plugin-v2.6.22}}` | [GitHub tag flutter-plugin-v2.6.22](https://github.com/bithuman-product/homebrew-bithuman) |
<!-- /VERSIONS:TABLE -->

The web embed needs no install: one URL or one `<iframe>` ([Web](/platforms/web)). The MCP server ships inside the CLI as `bithuman mcp` ([MCP server](/build/mcp)). What changed in each release is in the [changelog](/changelog).

## Supported operating systems

| Platform | CLI | Python | Swift package | Android |
|---|---|---|---|---|
| macOS, Apple silicon | yes | yes (macOS 14+) | yes | — |
| macOS, Intel | no | no | no | — |
| Linux x86_64 | yes | yes | — | — |
| Linux arm64 | yes | yes | — | — |
| Windows 10/11, x86_64 | yes: cloud sessions and MCP (on-machine rendering under WSL2) | under WSL2 | — | — |
| iOS / iPadOS | — | — | yes | — |
| Android (arm64-v8a) | — | — | — | yes |

On Windows, install the CLI from PowerShell with `irm https://install.bithuman.ai/windows | iex`: it checks the download against its published SHA256, installs `bithuman.exe` into `%LOCALAPPDATA%\bithuman\bin` and adds that folder to your `PATH`.

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

```powershell
# Windows (PowerShell): compare with the hash in the .sha256 file
(Get-FileHash bithuman-x86_64-pc-windows-msvc.zip -Algorithm SHA256).Hash
```

The Windows build isn't code-signed. If you download the .zip from the browser, SmartScreen may ask you to confirm (More info → Run anyway). The install script avoids this. Verify with the published SHA256.

pip verifies the Python wheel against the digest PyPI publishes.
