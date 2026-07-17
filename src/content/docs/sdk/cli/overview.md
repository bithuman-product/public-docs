---
title: "bitHuman CLI"
description: "One Rust binary that runs the whole avatar stack — live browser avatar, offline render, model introspection — from a single command."
section: sdk
group: "Command line"
order: 30
label: "CLI"
---

## One binary, the same engine as the libraries

`bithuman` is the command-line member of the [SDK](/sdk) family — a single
binary that runs the entire avatar stack without writing any code. It is built
on `libessence` — the same engine that powers the [Python](/sdk/python) and
[Swift](/sdk/swift) libraries and the [cloud REST API](/api/reference). They all
read the same `.imx` avatar file and produce identical frames, so anything you
prove out with the CLI ports straight into your application.

The CLI runs on macOS arm64 and Linux (x86_64 and aarch64).

> **Which models?** The CLI **recognizes every bitHuman model artifact** — it
> sniffs the file and tells you what it is. Its local runtime plays
> **`essence-1`** `.imx` avatars and **`expression-2`** avatars — including the
> free **Wise Pup** avatar that `bithuman run` fetches and renders out of the
> box (see [Local rendering by platform](#local-rendering-by-platform) for where
> Expression 2 renders locally). Essence 2 Max's `essence-2-quality` `.pkl` and
> the standard Essence 2's `essence-2-light` `.lebundle.imx` are recognized by
> `run` / `info` / `pull` with honest guidance and serve through the cloud
> surfaces (the [REST API](/api/agents), the
> [embed widget](/guides/deploy-embed), and the dashboard). See the
> [launch matrix](/sdk/cli/commands#which-model-files-run-locally).

## Quickstart

Install, then run with no arguments. The CLI fetches the free **Wise Pup**
avatar — a showcase `expression-2` identity — and renders it live on your own
hardware. No sign-in, no API key, no file to point at:

```bash
brew install bithuman-product/bithuman/bithuman-cli   # macOS (Apple Silicon)
bithuman run
# → the Wise Pup avatar downloads once, then renders in real time
```

That is the whole out-of-the-box experience: one command from a clean install
to a bitHuman avatar running natively on your machine. `bithuman run` renders
Expression 2 locally on macOS (Apple Silicon) and Linux x86_64 — see
[Local rendering by platform](#local-rendering-by-platform). On Linux, install
with the [universal installer](/sdk/cli/install) first.

### Give it a voice

To make an avatar listen and talk back, point `bithuman run` at an avatar file
and give it a conversation brain — a cloud model or a fully on-device stack:

```bash
bithuman login            # opens your browser, signs you in — done
export OPENAI_API_KEY=sk-...
bithuman run avatar.imx
# → open the printed http://127.0.0.1:8088/<CODE> URL, grant mic, talk
```

`bithuman login` stores a per-device credential in your OS keychain so every
other command authenticates automatically — no `export BITHUMAN_API_SECRET`.
(That manual path still works for CI and automation; see
[Configuration](/sdk/cli/configuration).) Under the hood `bithuman run` stands
up an embedded `livekit-server`, a `libessence` avatar runtime, a conversation
brain (cloud or [on-device](/sdk/cli/local-mode)), and a browser landing page.
Beyond live chat, the CLI can render an MP4 offline, inspect a model file,
browse and download showcase avatars, and run a full host sanity check.

## The subcommands

| Command | What it does |
| --- | --- |
| `bithuman login` | Sign in via the browser; store a per-device key in the OS keychain |
| `bithuman logout` | Revoke this device's key and clear the local store |
| `bithuman auth status` | Show who you're signed in as and where the credential lives |
| `bithuman init` | Credential wizard: save `BITHUMAN_API_SECRET`, pick a brain, pull a showcase avatar |
| `bithuman run [avatar]` | Start the live avatar. No argument fetches + renders the free Wise Pup avatar out of the box; pass an avatar file to run your own |
| `bithuman render <path.imx>` | Offline lipsync: model + WAV → MP4 (Linux-only) |
| `bithuman info <model-file>` | Print model metadata — engine + family for any recognized artifact |
| `bithuman pull <slug \| AGENT_CODE>` | Download a showcase avatar, or **your own agent's generated model** by code |
| `bithuman list` | Browse the showcase avatar catalog |
| `bithuman engine list \| install \| update` | Inspect, install, or update the per-platform local render engine (shipped in the CLI, auto-managed) |
| `bithuman doctor` | Host + auth + cache sanity check |

`bithuman --version` prints the `libessence` engine, ABI tag, and CLI
versions. Every subcommand accepts `--help`. See
[Commands](/sdk/cli/commands) for the full flag reference.

## Two ways to talk to the avatar

The conversation brain is pluggable. Both paths go through the same
`bithuman run` command — one environment variable is the only difference.

> **Precondition.** The native brew binary serves the avatar on its own,
> but the conversational brain runs as a Python agent the binary launches.
> Install that bundle first: `pip install bithuman-cli` for the cloud
> brain, or `pip install 'bithuman-cli[local]'` for the on-device brain.
> Without it the avatar renders but cannot talk back.

| Brain | Requires | Use when |
| --- | --- | --- |
| **Cloud** (OpenAI Realtime) | `OPENAI_API_KEY` | Fast warm-up, lowest first-token latency, hosted reliability |
| **On-device** (whisper.cpp + llama.cpp + Supertonic + Silero) | `pip install 'bithuman-cli[local]'` + `BITHUMAN_LOCAL=1` | Zero outbound network, private audio, kiosks / offline / mobile |

> **Note** The `bithuman` package on PyPI is the Python SDK / library
> (`from bithuman import AsyncBithuman`). The CLI ships separately as
> `bithuman-cli` — which bundles the Rust CLI binary, the conversation
> brain, and the `[local]` on-device brain extra
> (`pip install 'bithuman-cli[local]'`). Install the CLI via Homebrew or the
> universal installer on macOS (Apple Silicon) and Linux; `pip install
> bithuman-cli` is **macOS Apple Silicon only**. See [Install](/sdk/cli/install).

## Local rendering by platform

`bithuman run` renders `expression-2` avatars — including the Wise Pup default —
natively on your own hardware. Which runtime does the work is a per-platform
packaging detail the CLI handles for you:

| Platform | Local render | Status |
| --- | --- | --- |
| **macOS (Apple Silicon)** | Apple Neural Engine via CoreML | Real time |
| **Linux x86_64** | LiteRT (CPU) | Real time |
| **Windows** | LiteRT (CPU) | Coming |

macOS renders through the same CoreML / Apple Neural Engine path the desktop app
uses; Linux x86_64 renders in real time on a modern multi-core CPU. Windows
support is on the way. For the full picture of where every model runs — cloud
tiers, self-hosted, and on-device — see the
[device matrix](/concepts/architecture).

### One `.imx` per avatar, engine included

An `expression-2` avatar is a single self-contained
[`.imx` file](/concepts/avatars-imx). The render engine ships **inside the CLI**
and is managed for you, so a fresh install needs no extra download to run its
first avatar. When the CLI fetches an avatar it pulls only the slice your
platform needs — about **26 MB on macOS** and about **63 MB on Linux** — rather
than the full cross-platform bundle.

`bithuman engine` is the manual channel for that runtime: inspect it, install it
for a cross-platform build, or update it when a newer avatar needs a newer
engine.

```bash
bithuman engine list                 # show engines and which are installed
bithuman engine install              # fetch this platform's engine into the cache
bithuman engine update               # update to the newest pinned engine
```

## Next steps

- [Install the CLI](/sdk/cli/install) — Homebrew, universal installer, or PyPI
- [Commands](/sdk/cli/commands) — full subcommand and flag reference
- [Configuration](/sdk/cli/configuration) — environment variables and cache layout
- [Local mode](/sdk/cli/local-mode) — the fully on-device brain
- [Python SDK](/sdk/python) — programmatic access to the same runtime
