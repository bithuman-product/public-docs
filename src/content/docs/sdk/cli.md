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
| **What renders** | [any character from one portrait](/concepts/expression-2), 416×720 at 20 fps | [a photoreal person from one portrait](/concepts/essence-2), up to 1920×1080 at 25 fps |
| **`run` and `render`** | both | both |
| **Download per avatar** | about 190 MB | 118–148 MB, plus a 377 MB shared audio encoder once |

## Before you start

| You need | For | Check |
|---|---|---|
| macOS 14+ on Apple silicon, or Linux on x86_64 or arm64 | the binary | `uname -sm` |
| A bitHuman sign-in or API secret | `run` and `render` (browsing and downloading need none) | `bithuman account` exits 0 |
| `ffmpeg` on `PATH` | `render` | `ffmpeg -version` |
| `livekit-server` on `PATH` | `run` | `command -v livekit-server` |

## Install

```bash
# macOS (Apple silicon)
brew install ffmpeg livekit
curl -fsSL https://install.bithuman.ai | sh
```

```bash
# Linux, x86_64 or arm64 (Debian/Ubuntu)
sudo apt install -y ffmpeg
curl -sSL https://get.livekit.io | bash
curl -fsSL https://install.bithuman.ai | sh
```

The installer puts the CLI in `~/.local/bin` (set `BITHUMAN_INSTALL_DIR` to change it) and verifies its checksum. If it asks you to, add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile. On Apple silicon, `brew install bithuman-product/bithuman/bithuman-cli` installs the same release. `bithuman --version` prints the CLI and engine versions.

Check the install:

```text
$ bithuman --version
libessence  2.11.6 ABI 7
bithuman    2.7.1
```

The CLI is not on PyPI. `pip install bithuman` installs the Python library, which has no command.

## Authenticate

```bash
bithuman login            # opens a browser and stores a credential for this device
bithuman login --device   # over SSH: prints a code to enter in any browser
bithuman account          # exit 0 when signed in
```

Sign in first, because every render path needs a credential: without one, `run` and `render` stop before the first frame with exit 77 and write nothing. In scripts and CI, set `BITHUMAN_API_SECRET` instead of signing in ([Your API secret](/start/api-secret)). Credits pay for talking time; idle time is free ([pricing](/guides/pricing)). Listing, downloading and opening avatars need no account.

## First frame

Render the sample speech through the `wise-pup` sample avatar:

```bash
bithuman login
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render "$(bithuman pull wise-pup)" -a speech.wav -o out.mp4
# → out.mp4: 416×720, 300 frames, 15.0 s
```

Then talk to it live:

```bash
bithuman run wise-pup
# → open the printed http://127.0.0.1:8088/<CODE> and allow the microphone
```

`bithuman run wise-pup` is a live session with the brain: it starts a local `livekit-server` and the conversation brain (the first run installs the brain, about 200 MB, in one to two minutes). `render` accepts any audio format `ffmpeg` reads.

## Integrate into your app

| Job | Command |
|---|---|
| List the sample avatars | `bithuman list` (the same list as `https://api.bithuman.ai/v1/models/showcase`) |
| Download one | `bithuman pull <slug>` prints the cached path; `--force` downloads again |
| Download your own agent | `bithuman pull <AGENT_CODE> --model essence-2` (needs sign-in) |
| Inspect a file | `bithuman open avatar.imx` |
| Render a file | `bithuman render avatar.imx -a in.wav -o out.mp4` |
| Serve a live session | `bithuman run avatar.imx`; `--host <LAN address>` to expose it (`0.0.0.0` also needs `--allow-public-bind`) |
| Run the brain on your own hardware | [on-device brain](/sdk/cli/local-mode) |
| Drive it from an AI agent | `bithuman mcp` ([MCP server](/sdk/mcp)) |
| Script it | add `--json`: every failure prints one JSON object with a stable code, and the exit code is the contract ([reference](/sdk/cli/reference#exit-codes)) |

## Platform notes

- Essence 1 avatars work with `run` only; for a file use [Python](/sdk/python) or the [video API](/api/video). Expression 1 runs on the [cloud API](/api).
- The first Essence 2 render on a machine downloads a 377 MB shared audio encoder to `~/.bithuman/engines/essence-2/` once.
- Intel Macs and Windows have no binary. Use WSL2 on Windows, or the [web embed](/sdk/web) or [cloud API](/api).

## Performance

Frame rates for the CLI on macOS and Linux are on the [performance page](/performance).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman: command not found` | `~/.local/bin` is not on `PATH` | `export PATH="$HOME/.local/bin:$PATH"` |
| `not signed in`, exit 77, nothing written | no credential | `bithuman login`, or set `BITHUMAN_API_SECRET` |
| `sign-in failed: auth required`, exit 1 | the credential was rejected | `bithuman login` again, or create a new API secret |
| `render` exits 69: `ffmpeg not found` | `ffmpeg` is not on `PATH` (common in scripts) | install it, or set `BITHUMAN_FFMPEG` to its path |
| `run` says the `livekit-server` binary was not found | `livekit-server` is not installed | `brew install livekit`, or `curl -sSL https://get.livekit.io \| bash` |
| `SLUG_NOT_FOUND`, exit 66 | the slug is not in the sample list | `bithuman list` and copy a slug |
| `pull <CODE>` fails with `404 NOT_FOUND` | not your agent and not a sample avatar | check the code under [your agents](/api/agents) |
| `pull <CODE>` fails with `409 MODEL_NOT_GENERATED` | the agent has no model of that kind | [add the model](/api/agents#add-a-model-to-an-existing-agent), or pass the `--model` it has |
| `PUBLIC_BIND_REFUSED`, exit 2 | `--host 0.0.0.0` without consent | use a LAN address, or add `--allow-public-bind` |
| the installer names your platform and stops | no binary for this platform | see Platform notes |
| `Error: No available formula` from `brew` | the tap is not added | `brew tap bithuman-product/bithuman`, then install again |

## Reference

- [CLI reference](/sdk/cli/reference): every command, flag, exit code and environment variable.
- [On-device brain](/sdk/cli/local-mode): run the conversation fully on your hardware.
- [CLI example scripts](https://github.com/bithuman-product/bithuman-examples/tree/main/api/cli): live stream, offline render, REST.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
