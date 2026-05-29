---
title: "bitHuman CLI"
description: "One Rust binary that runs the whole avatar stack — live browser avatar, offline render, model introspection — from a single command."
section: cli
group: "Get started"
order: 1
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

From one invocation, `bithuman run` stands up an embedded
`livekit-server`, a `libessence` avatar runtime, a conversation brain
(cloud or [on-device](/cli/local-mode)), and a browser landing page:

```bash
export BITHUMAN_API_SECRET=your_api_secret
export OPENAI_API_KEY=sk-...
bithuman run avatar.imx
# → open the printed http://127.0.0.1:8088/<CODE> URL, grant mic, talk
```

That single command is the fastest way to get a talking, listening avatar
in your browser. Beyond live chat, the CLI can render an MP4 offline,
inspect an `.imx` file, browse and download showcase avatars, and run a
full host sanity check.

## The seven subcommands

| Command | What it does |
| --- | --- |
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

| Brain | Requires | Use when |
| --- | --- | --- |
| **Cloud** (OpenAI Realtime) | `OPENAI_API_KEY` | Fast warm-up, lowest first-token latency, hosted reliability |
| **On-device** (whisper.cpp + llama.cpp + Supertonic + Silero) | `pip install 'bithuman-cli[local]'` + `BITHUMAN_LOCAL=1` | Zero outbound network, private audio, kiosks / offline / mobile |

> **Note** The `bithuman` package on PyPI is the Python SDK / library
> (`from bithuman import AsyncBithuman`). The CLI ships separately as
> `bithuman-cli`. See [Install](/cli/install).

## Next steps

- [Install the CLI](/cli/install) — Homebrew, universal installer, or PyPI
- [Commands](/cli/commands) — full subcommand and flag reference
- [Configuration](/cli/configuration) — environment variables and cache layout
- [Local mode](/cli/local-mode) — the fully on-device brain
- [Python SDK](/sdk/python) — programmatic access to the same runtime
