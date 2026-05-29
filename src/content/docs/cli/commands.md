---
title: "Commands"
description: "Full reference for the seven bithuman subcommands — init, run, render, info, pull, list, doctor — with flags and examples."
section: cli
group: "Usage"
order: 10
---

## Subcommand overview

The bithuman CLI exposes seven subcommands plus `--version`. Every
subcommand accepts `--help` for the full flag listing.

| Command | What it does |
| --- | --- |
| `bithuman init` | Scaffold a new project / starter config |
| `bithuman run <path.imx>` | Live browser-served avatar (cloud or on-device brain) |
| `bithuman render <path.imx>` | Offline render: model + WAV → MP4 (Linux-only) |
| `bithuman info <path.imx>` | Print `.imx` metadata |
| `bithuman pull <slug>` | Download a showcase avatar |
| `bithuman list` | Browse the showcase avatar catalog |
| `bithuman doctor` | Host + auth + cache sanity check |
| `bithuman --version` | Print `libessence` + ABI + CLI versions |

## `bithuman init`

Scaffold a new project with a starter configuration so you can go from a
fresh directory to a running avatar quickly:

```bash
bithuman init
```

This sets up the local project layout and prompts for the values the
other commands need (avatar auth, brain selection). After `init`, wire up
your secrets as described in [Configuration](/cli/configuration).

## `bithuman run` — live avatar

The headline command. From one invocation it stands up an embedded
`livekit-server`, a `libessence` runtime, the conversation brain (cloud
OpenAI Realtime or the [on-device](/cli/local-mode) stack per
`BITHUMAN_LOCAL`), and a browser landing page.

```bash
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
# → open the printed http://127.0.0.1:8088/<CODE> URL, grant mic, talk
```

Common flags:

| Flag | Default | What |
| --- | --- | --- |
| `--host` | `127.0.0.1` | Bind address. Pass a Tailnet / LAN IP to expose. `0.0.0.0` needs `--allow-public-bind`. |
| `--port` | `8088` | Launcher HTTP port. |
| `--max-sessions` | (CPU count) | Pool cap; new launches are rejected (not degraded) when full. |
| `--embedded-livekit` | on with model arg | Spawn a self-contained `livekit-server` child. Off when omitting the model and using an external SFU. |
| `--mock-runtime` | off | Run with black frames instead of `libessence` — for protocol tests. |

## `bithuman render` — offline MP4

For batch jobs or pipelines with TTS upstream — no browser, no brain,
just lipsync a WAV you already have:

```bash
bithuman render avatar.imx --audio speech.wav --output demo.mp4
```

Flags:

| Flag | Default | What |
| --- | --- | --- |
| `-a`, `--audio <PATH>` | (required) | 16 kHz mono PCM WAV input. |
| `-o`, `--output <PATH>` | `output.mp4` | Output MP4 path. |
| `--quality <PRESET>` | `MEDIUM` | Encoder preset: `LOW`, `MEDIUM`, `HIGH`. |
| `--target-size <SIZE>` | `1280` | A single number `N` (longest side binds to `N`, aspect preserved) or `WxH` (explicit canvas). |
| `--limit <N>` | none | Cap output frame count — for testing. |

> **Warning** `bithuman render` is currently **Linux-only**. On macOS the
> command prints a `not implemented: be_video_encoder_*` error and exits.
> Workarounds:
>
> 1. **Run inside a Linux Docker container** — e.g. from `python:3.12-slim`,
>    `pip install bithuman-cli` and render there, mounting your `.imx` and
>    WAV in and the MP4 out.
> 2. **Use `bithuman run` instead** — the live-avatar path does not need the
>    offline encoder; it publishes frames into LiveKit via the webrtc-rs
>    encoder, and you can record from the browser if you need a file.
> 3. **Render on a Linux host** — a small Linux box or CI runner with
>    `bithuman-cli` installed renders any `.imx` + WAV pair to MP4
>    identically.
>
> An AVFoundation-based native macOS encoder is on the roadmap.

## `bithuman info` — inspect a model

Print `.imx` metadata (model type, fixture name, frame size, sample rate,
duration, hash). Handy for verifying a model file before deploy:

```bash
bithuman info avatar.imx
```

## `bithuman pull` + `list` — showcase avatars

Browse the showcase manifest and download one:

```bash
bithuman list
bithuman pull modern-court-jester
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

Pulled avatars land in `~/.cache/bithuman/showcase/`. See
[Configuration](/cli/configuration) for the full cache layout.

## `bithuman doctor` — install sanity check

When something does not work, run this first. It checks versions, host
RAM, avatar auth, brain selection and availability, and cache sizes, and
exits `0` only if both avatar auth and a brain path are configured:

```bash
bithuman doctor && bithuman run avatar.imx
```

See [Install](/cli/install) for the full breakdown of what `doctor`
reports.
