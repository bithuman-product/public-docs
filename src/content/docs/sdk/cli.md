---
title: "CLI"
description: "Run a live avatar in your browser or render an MP4 from the terminal, on macOS (Apple silicon) and Linux (x86_64, arm64). No code."
section: sdk
group: "Platforms"
order: 10
type: platform
label: "CLI (macOS & Linux)"
---

One binary, no code: `bithuman run` opens a live conversation with an avatar in your browser, and `bithuman render` turns an audio file into an MP4. To program against the models instead, use [Python](/sdk/python).

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [any character from one portrait](/concepts/expression-2), 416×720 at 20 fps | [a photoreal person from one portrait](/concepts/essence-2), up to 1080p at 25 fps |
| **`run` and `render`** | both | both |
| **Download per avatar** | about 190 MB | 140–160 MB, plus a shared audio encoder (about 66 MB) once |

## Before you start

| You need | For | Check |
|---|---|---|
| macOS 14+ on Apple silicon, or Linux on x86_64 or arm64 | the binary | `uname -sm` |
| A bitHuman sign-in or API secret | `run` and `render` (browsing and downloading need none) | `bithuman account` exits 0 |
| `ffmpeg` on `PATH` | `render`, and `run` with an Essence 2 avatar | `ffmpeg -version` |
| `livekit-server` 1.13 or newer (the Linux download includes it) | `run` | `livekit-server --version`; update with `brew upgrade livekit` |
| Python 3.11 or newer with `venv` (`python3-venv` on Debian/Ubuntu) | `run` (its voice agent) | `python3 --version` |

## Install

```bash
# macOS (Apple silicon): also installs ffmpeg, livekit-server and Python
brew install bithuman-product/bithuman/bithuman-cli
```

```bash
# Linux, x86_64 or arm64 (Debian/Ubuntu); the download includes livekit-server
sudo apt install -y ffmpeg python3-venv
curl -fsSL https://install.bithuman.ai | sh
```

The installer puts the CLI in `~/.local/bin` (set `BITHUMAN_INSTALL_DIR` to change it) and verifies its checksum. If it asks you to, add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile. On macOS, `curl -fsSL https://install.bithuman.ai | sh` installs the same release (then `brew install ffmpeg livekit` yourself). `bithuman --version` prints the CLI and engine versions.

Check the install:

```text
$ bithuman --version
libessence 2.11.13 ABI 7
bithuman    2.8.0
```

The CLI is not on PyPI. `pip install bithuman` installs the Python library, which has no command.

## Authenticate

```bash
bithuman login            # opens a browser and stores a credential for this device
bithuman login --device   # over SSH: prints a code to enter in any browser
bithuman account          # exit 0 when signed in
```

Sign in first, because every render path needs a credential: without one, `run` and `render` stop before the first frame with exit 77 and write nothing. In scripts and CI, set `BITHUMAN_API_SECRET` instead of signing in ([Your API secret](/start/api-secret)). Credits pay for session time, talking or idle, by the exact second ([pricing](/guides/pricing)). Listing, downloading and opening avatars need no account.

## First frame

Render the sample speech through the `wise-pup` sample avatar:

```bash
bithuman login
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav -o out.mp4
# → out.mp4: 416×720, 300 frames, 15.0 s
```

Then talk to it live:

```bash
bithuman run wise-pup
# → open the printed http://127.0.0.1:8088/<CODE> and allow the microphone
```

`bithuman run wise-pup` is a live session with the brain: it starts a local `livekit-server` and the conversation brain (the first run installs the brain, about 350 MB on disk, in one to two minutes). `render` accepts any audio format `ffmpeg` reads.

## Integrate into your app

| Job | Command |
|---|---|
| List the sample avatars | `bithuman list` (the same list as `https://api.bithuman.ai/v1/models/showcase`) |
| Download one | `bithuman pull <slug>` prints the cached path; `--force` downloads again |
| Download your own agent | `bithuman pull <AGENT_CODE> --model essence-2` (needs sign-in) |
| Inspect an avatar | `bithuman open <avatar>` |
| Render | `bithuman render <avatar> in.wav -o out.mp4` (a code or name is downloaded on first use) |
| Serve a live session | `bithuman run <avatar>`; `--host <LAN address>` to expose it (`0.0.0.0` also needs `BITHUMAN_ALLOW_PUBLIC_BIND=1`) |
| Talk with your own OpenAI key | `export OPENAI_API_KEY=…` before `bithuman run` ([voice settings](#voice-settings)) |
| Run the brain on your own hardware | [on-device brain](/sdk/cli/local-mode) |
| Drive it from an AI agent | `bithuman mcp` ([MCP server](/sdk/mcp)) |
| Script it | add `--json`: every failure prints one JSON object with a stable code, and the exit code is the contract ([reference](/sdk/cli/reference#exit-codes)) |

### Voice settings

`bithuman run` starts a voice agent on OpenAI Realtime. It answers about half a second after you stop talking. Both settings are read from the environment:

| Variable | Default | What it does |
|---|---|---|
| `OPENAI_API_KEY` | — | Your OpenAI key. Without it, the voice runs on your bitHuman account at the managed voice-chat rate, 10 credits per minute ([pricing](/guides/pricing)). |
| `BITHUMAN_INSTRUCTIONS` | a short assistant prompt | The agent's system prompt |

The whole setup, and the same conversation in your own Python code: [Talk to an avatar on your machine](/guides/local-voice-avatar).

## Platform notes

- Essence 1 avatars work with `run` only; for a file use [Python](/sdk/python) or the [video API](/api/video). Expression 1 runs on the [cloud API](/api).
- The first Essence 2 render on a machine downloads a shared audio encoder (about 66 MB) to `~/.bithuman/engines/essence-2/` once.
- Intel Macs and Windows have no binary. Use WSL2 on Windows, or the [web embed](/sdk/web) or [cloud API](/api).

## Performance

Frame rates for the CLI on macOS and Linux are on [Desktop performance](/performance/desktop).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman: command not found` | `~/.local/bin` is not on `PATH` | `export PATH="$HOME/.local/bin:$PATH"` |
| `not signed in`, exit 77, nothing written | no credential | `bithuman login`, or set `BITHUMAN_API_SECRET` |
| `your credential is invalid or expired` or `the API secret was rejected`, exit 77 | the secret was revoked or mistyped | `bithuman login` again, or create a new API secret |
| `bithuman login` prints `token exchange failed` or times out, exit 1 | the browser or device approval did not complete | run `bithuman login` (or `--device`) again |
| `render` exits 69: `ffmpeg not found` | `ffmpeg` is not on `PATH` (common in scripts) | install it, or set `BITHUMAN_FFMPEG` to its path |
| `run` with an Essence 2 avatar: no avatar in the page, and the terminal shows `essence-2: ffmpeg not found` | `ffmpeg` is not on `PATH` | `sudo apt install -y ffmpeg`, or set `BITHUMAN_FFMPEG` |
| `run` says the `livekit-server` binary was not found | `livekit-server` is not installed | `brew install livekit` (macOS), or rerun the installer (Linux) |
| `run` exits 69: `livekit-server 1.8.0 at …/livekit-server is too old for `bithuman run` (it needs 1.13 or newer)` | an old `livekit-server` found on `PATH` | `brew upgrade livekit` (macOS), or reinstall with `curl -fsSL https://install.bithuman.ai \| sh` (Linux) |
| `SLUG_NOT_FOUND`, exit 66 | the slug is not in the sample list | `bithuman list` and copy a slug |
| `pull <CODE>` fails with `404 NOT_FOUND` | not your agent and not a sample avatar | check the code under [your agents](/api/agents) |
| `pull <CODE>` fails with `409 MODEL_NOT_GENERATED` | the agent has no model of that kind | [add the model](/api/agents#add-a-model-to-an-existing-agent), or pass the `--model` it has |
| `PUBLIC_BIND_REFUSED`, exit 2 | `--host 0.0.0.0` without consent | use a LAN address, or set `BITHUMAN_ALLOW_PUBLIC_BIND=1` |
| the installer names your platform and stops | no binary for this platform | see Platform notes |

## Reference

- [CLI reference](/sdk/cli/reference): every command, flag, exit code and environment variable.
- [On-device brain](/sdk/cli/local-mode): run the conversation fully on your hardware.
- [CLI example scripts](https://github.com/bithuman-product/bithuman-examples/tree/main/api/cli): live stream, offline render, REST.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
