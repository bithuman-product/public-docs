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

> **Which models?** The CLI **recognizes every bitHuman model artifact** —
> it sniffs the file and tells you what it is — and its local runtime
> (`run` / `render`) plays **`essence-1`** `.imx` avatars. The
> [second-generation artifacts](/concepts/models-v2) (the standard Essence 2's
> `essence-2-light` `.lebundle.imx`, Essence 2 Max's `essence-2-quality`
> `.pkl`, `expression-2` `.avatar` — the artifact families keep their
> internal names) are
> recognized by `run` / `info` / `pull` with honest guidance on where each
> runs — today they serve through the cloud surfaces (the
> [REST API](/api/agents), the [embed widget](/guides/deploy-embed), and the
> dashboard), not the CLI's local runtime. See the
> [launch matrix](/sdk/cli/commands#which-model-files-run-locally).

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
[Configuration](/sdk/cli/configuration).)

Under the hood `bithuman run` stands up an embedded `livekit-server`, a
`libessence` avatar runtime, a conversation brain (cloud or
[on-device](/sdk/cli/local-mode)), and a browser landing page. That single
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
| `bithuman info <model-file>` | Print model metadata — engine + family for any recognized artifact |
| `bithuman pull <slug \| AGENT_CODE>` | Download a showcase avatar, or **your own agent's generated model** by code |
| `bithuman list` | Browse the showcase avatar catalog |
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

## Next steps

- [Install the CLI](/sdk/cli/install) — Homebrew, universal installer, or PyPI
- [Commands](/sdk/cli/commands) — full subcommand and flag reference
- [Configuration](/sdk/cli/configuration) — environment variables and cache layout
- [Local mode](/sdk/cli/local-mode) — the fully on-device brain
- [Python SDK](/sdk/python) — programmatic access to the same runtime
