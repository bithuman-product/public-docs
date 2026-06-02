---
title: "bitHuman CLI"
description: "One Rust binary that runs the whole avatar stack — live browser avatar, offline render, model introspection — from a single command."
section: cli
group: "Get started"
order: 0
label: "Overview"
---

## One binary, the same engine as the SDKs

`bithuman` is a single command-line binary that runs the entire avatar
stack without writing any code. It is built on `libessence` — the same
Rust engine that powers the [Python](/sdk/python), [Swift](/sdk/swift),
and Kotlin SDKs and the [cloud REST API](/api/reference). They all read
the same `.imx` avatar file and produce identical frames, so anything you
prove out with the CLI ports straight into your application.

The CLI runs on macOS arm64 and Linux (x86_64 and aarch64).

## What it does

The fastest path from a fresh install to a talking avatar is three steps —
**install → `bithuman login` → run**:

```bash
bithuman login            # opens your browser, signs you in — done
export OPENAI_API_KEY=sk-...
bithuman run avatar.imx
# → open the printed http://127.0.0.1:8088/<CODE> URL, grant mic, talk
```

`bithuman login` opens your browser, you approve, and the CLI stores a
per-device credential in your OS keychain so every other command
authenticates automatically — no `export BITHUMAN_API_SECRET`. (That manual
path still works for CI and automation; see
[Configuration](/cli/configuration).)

Under the hood `bithuman run` stands up an embedded `livekit-server`, a
`libessence` avatar runtime, a conversation brain (cloud or
[on-device](/cli/local-mode)), and a browser landing page. That single
command is the fastest way to get a talking, listening avatar in your
browser. Beyond live chat, the CLI can render an MP4 offline, inspect an
`.imx` file, browse and download showcase avatars, and run a full host
sanity check.

## The subcommands

| Command | What it does |
| --- | --- |
| `bithuman login` | Sign in via the browser; store a per-device key in the OS keychain |
| `bithuman logout` | Revoke this device's key and clear the local store |
| `bithuman auth status` | Show who you're signed in as and where the credential lives |
| `bithuman init` | Scaffold a new project / starter config |
| `bithuman run <path.imx>` | Start the live avatar (mic in, browser viewer out) |
| `bithuman render <path.imx>` | Offline lipsync: model + WAV → MP4 (Linux-only) |
| `bithuman info <path.imx>` | Print `.imx` metadata |
| `bithuman pull <slug>` | Download a showcase avatar |
| `bithuman list` | Browse the showcase avatar catalog |
| `bithuman doctor` | Host + auth + cache sanity check |

`bithuman --version` prints the `libessence` engine, ABI tag, and CLI
versions. Every subcommand accepts `--help`. See
[Commands](/cli/commands) for the full flag reference.

## Two ways to talk to the avatar

The conversation brain is pluggable. Both paths go through the same
`bithuman run` command — one environment variable is the only difference.

> **Precondition.** The native brew binary serves the avatar on its own,
> but the conversational brain runs as a Python agent the binary launches.
> Install that bundle first: `pip install bithuman-cli` for the cloud
> brain, or `pip install 'bithuman[local]'` for the on-device brain.
> Without it the avatar renders but cannot talk back.

| Brain | Requires | Use when |
| --- | --- | --- |
| **Cloud** (OpenAI Realtime) | `OPENAI_API_KEY` | Fast warm-up, lowest first-token latency, hosted reliability |
| **On-device** (whisper.cpp + llama.cpp + Supertonic + Silero) | `pip install 'bithuman[local]'` + `BITHUMAN_LOCAL=1` | Zero outbound network, private audio, kiosks / offline / mobile |

> **Note** The `bithuman` package on PyPI is the Python SDK / library
> (`from bithuman import AsyncBithuman`), and carries the `[local]`
> on-device brain extra (`pip install 'bithuman[local]'`). The CLI ships
> separately as `bithuman-cli` — installed via Homebrew or the universal
> installer on macOS and Linux; `pip install bithuman-cli` is **macOS
> Apple Silicon only**. See [Install](/cli/install).

## Next steps

- [Install the CLI](/cli/install) — Homebrew, universal installer, or PyPI
- [Commands](/cli/commands) — full subcommand and flag reference
- [Configuration](/cli/configuration) — environment variables and cache layout
- [Local mode](/cli/local-mode) — the fully on-device brain
- [Python SDK](/sdk/python) — programmatic access to the same runtime
