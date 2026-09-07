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
on the essence engine — the same engine that powers the [Python](/sdk/python) and
[Swift](/sdk/swift) libraries and the [cloud REST API](/api/reference). They all
read the same `.imx` avatar file and produce identical frames, so anything you
prove out with the CLI ports straight into your application.

The CLI publishes a binary for exactly two targets: **macOS Apple
Silicon** (`aarch64-apple-darwin`) and **Linux x86_64**
(`x86_64-unknown-linux-gnu`). Intel Macs and Linux ARM have no current binary —
the installer 404s on both. See
[which platforms actually have a binary](/sdk/cli/install#which-platforms-actually-have-a-binary).

> **Which models?** The CLI **recognizes every bitHuman model artifact** — it
> sniffs the file and tells you what it is. Its local runtime plays
> **`essence-1`** `.imx` avatars, **`expression-2`** avatars — including the
> free **Wise Pup** avatar that `bithuman run` fetches and renders out of the
> box — and, as of **CLI 2.6.1**, **`essence-2`** `.imx` avatars, live and
> offline, on macOS (Apple Silicon) and Linux x86_64 (see
> [Local rendering by platform](#local-rendering-by-platform)). Essence 2 Max's
> `essence-2-max` `.pkl` is recognized by `run` / `info` / `pull` with honest
> guidance and serves through the cloud surfaces (the [REST API](/api/agents),
> the [embed widget](/guides/deploy-embed), and the dashboard). See the
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
up an embedded `livekit-server`, an essence-engine avatar runtime, a conversation
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
| `bithuman render <path>` | Offline lipsync: model + audio → MP4. [Essence 2 and Expression 2](/sdk/cli/verified#bithuman-render-one-family-at-a-time) on Linux x86_64 and macOS arm64 as of 2.6.1; Essence 1 still exits 70 |
| `bithuman info <model-file>` | Print model metadata — engine + family for any recognized artifact |
| `bithuman pull <slug \| AGENT_CODE>` | Download a showcase avatar, or **your own agent's generated model** by code |
| `bithuman list` | Browse the showcase avatar catalog |
| `bithuman engine list \| install \| update` | Inspect, install, or update the per-platform local render engine (shipped in the CLI, auto-managed) |
| `bithuman doctor` | Host + auth + cache sanity check |

`bithuman --version` prints the essence engine version, ABI tag, and CLI
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
natively on your own hardware, and as of **CLI 2.6.1** it renders `essence-2`
avatars the same way. Which runtime does the work is a per-platform packaging
detail the CLI handles for you:

| Platform | Expression 2 local render | Essence 2 local render (2.6.1) | Status |
| --- | --- | --- | --- |
| **macOS (Apple Silicon)** | CoreML — predominantly the Neural Engine | Yes — `run` and `render`, runtime in the tarball | Real time (Expression 2) |
| **Linux x86_64** | LiteRT (CPU) | Yes — `run` and `render`, runtime in the tarball | Real time (Expression 2) |
| **Windows** | LiteRT (CPU) | — | Coming |

macOS renders Expression 2 through the same CoreML path the desktop app uses.
Reading CoreML's own per-operation compute plan for the models this engine
loads, the Neural Engine carries **84–100%** of the operations depending on the
member, with the remainder on the CPU — see
[which Apple compute units run Expression 2](/concepts/expression-2#which-apple-compute-units-run-expression-2).
Linux x86_64 renders Expression 2 in real time on a modern multi-core CPU.
Windows support is on the way. For the full picture of where every model
runs — cloud tiers, self-hosted, and on-device — see the
[device matrix](/concepts/architecture).

### Essence 2 on your own machine

Since `cli-v2.6.1` (2026-09-07) the Essence 2 runtime ships **inside the CLI
tarball** on both platforms, so a downloaded Essence 2 avatar renders locally,
offline, with nothing staged by hand:

```bash
bithuman login                                        # once — the first play checks the licence with the cloud
MODEL=$(bithuman pull <YOUR_AGENT_CODE> --model essence-2)   # → <code>.imx, path on stdout
bithuman render "$MODEL" -a speech.wav -o out.mp4     # exit 0; 5 s of audio → 125 frames at 25 fps
bithuman run "$MODEL"                                 # a local server, opened in your browser
```

The **first** Essence 2 render on a machine downloads the shared audio encoder
— about **377 MB**, one time — from the public release coordinate, checked by
content digest, into `~/.bithuman/engines/essence-2/`, and every later render
reuses it. No environment variable, no extra install step. Essence 2 is
**fail-closed**: a model file with a required member missing is refused with
exit 69 and no output file, never played with a substituted mouth. The flow
above was run from the published tarball alone, on Linux x86_64 and on an
Apple Silicon Mac — see the
[verified transcript](/sdk/cli/verified#essence-2--exit-0-on-261-on-linux-and-on-macos).

**Self-hosted sessions are metered — on both platforms as of `cli-v2.6.2`,
and billed on wall-clock as of `cli-v2.6.3`.**
`bithuman run <code>.imx` and `bithuman render` on an Essence 2 or Expression
2 avatar bill at the published self-hosted rate, **2 credits per minute**
([pricing](/guides/pricing)), by the pricing page's
[definition of a credit minute](/guides/pricing#serving--credits-per-live-minute)
— wall-clock, idle animation included; an offline render, its output
duration. `bithuman pull` is free. Before 2.6.2 only an Expression 2 session
on Linux was metered; an Essence 2 session on either platform, and any
session on macOS, was not. 2.6.2 then counted frames delivered ÷ fps rather
than wall-clock, so it under-counted a live preview on a machine whose engine
paints slowly — measured, a 92 s session recorded as 8.0 s. `cli-v2.6.3`
records the seconds the session was live. Metering never stops a render — without a sign-in,
or with a rejected or depleted key, the session renders behind a loud
`★ UNMETERED RENDER` line, and `BITHUMAN_METER_ENFORCE=1` turns those cases
into a refusal. Details and the verification on the published bytes:
[the self-host guide](/guides/self-host-local#the-cli-meters-a-self-hosted-session).

### One `.imx` per avatar, engine included

An `expression-2` or `essence-2` avatar is a single self-contained
[`.imx` file](/concepts/avatars-imx). The render engines ship **inside the
CLI** and are managed for you, so a fresh install needs no extra download to
run its first avatar. When the CLI fetches an Expression 2 avatar it pulls only
the slice your platform needs — about **26 MB on macOS** and about **63 MB on
Linux** — rather than the full cross-platform bundle.

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
- [Verified transcript](/sdk/cli/verified) — every command on Linux x86_64, run and pasted back with its real exit code
- [Commands](/sdk/cli/commands) — full subcommand and flag reference
- [Configuration](/sdk/cli/configuration) — environment variables and cache layout
- [Local mode](/sdk/cli/local-mode) — the fully on-device brain
- [Python SDK](/sdk/python) — programmatic access to the same runtime
