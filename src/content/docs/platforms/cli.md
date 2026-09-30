---
title: "CLI"
description: "Render an MP4 or run a live avatar from the terminal, on macOS (Apple silicon) and Linux (x86_64, arm64), with no code. On Linux it needs no GPU."
section: platforms
group: "CLI"
order: 10
type: platform
llms: platforms
renders: ["server", "no-gpu"]
needs: ["API secret"]
artifacts: ["cli"]
platforms: ["cli"]
models: ["essence-2", "expression-2"]
claims: ["S2", "S3", "S4", "S6", "S10"]
next: ["/platforms/cli/voice", "/platforms/cli/troubleshooting", "/platforms/cli/reference"]
moved:
  integrate-into-your-app: /platforms/cli/voice#integrate-into-your-app
  voice-settings: /platforms/cli/voice#voice-settings
  platform-notes: /platforms/cli/voice#platform-notes
  reference: /platforms/cli/reference
  troubleshooting: /platforms/cli/troubleshooting
---

<div class="lead">
<div class="lead-text">

One binary, no code: `bithuman render` turns an audio file into a talking-avatar MP4, and `bithuman run` opens a live conversation with an avatar in your browser. It renders on your own machine. To program against the models instead, use [Python](/platforms/python).

> **Note:** On Linux, both models run live on the CPU alone, no GPU. See [CPU only (no GPU)](/deploy/cpu).

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **`render` and `run`** | both | both |
| **Download per avatar** | about 190 MB | 140–160 MB, plus a shared audio encoder (about 66 MB) once |

</div>

```figure
cli-linux eager
```

</div>

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

```powershell
# Windows 10/11 x86_64 (PowerShell): cloud sessions and MCP
irm https://install.bithuman.ai/windows | iex
```

The installer puts the CLI in `~/.local/bin` (set `BITHUMAN_INSTALL_DIR` to change it) and verifies its checksum. If it asks you to, add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile. On macOS `curl` works too (then `brew install ffmpeg livekit`). `bithuman --version` prints the CLI and engine versions.

Check the install:

```text
$ bithuman --version
libessence 2.11.17 ABI 7
bithuman    2.8.4
```

The CLI is not on PyPI. `pip install bithuman` installs the Python library, which has no command.

## Authenticate

```bash
bithuman login            # opens a browser and stores a credential for this device
bithuman login --device   # over SSH: prints a code to enter in any browser
bithuman account          # exit 0 when signed in
```

Sign in first, because every render path needs a credential: without one, `run` and `render` stop before the first frame with exit 77 and write nothing. In scripts and CI, set `BITHUMAN_API_SECRET` instead of signing in ([Your API secret](/start/api-secret)). Cost: active session time, to the second ([pricing](/pricing)). Listing, downloading and opening avatars need no account.

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

`render` accepts any audio format `ffmpeg` reads. `bithuman run` needs two more things from [Before you start](#before-you-start): `livekit-server` and Python. It starts a local `livekit-server` and the voice agent; the first run installs the agent, about 350 MB on disk, in one to two minutes.

## Complete example

From a fresh machine to a talking-avatar MP4 in four commands.

### Requirements

| You need | Notes |
|---|---|
| macOS (Apple silicon) or Linux (x86_64, arm64) | |
| An [API secret](/start/api-secret) | or `bithuman login` |
| `ffmpeg` | `brew install ffmpeg` or `sudo apt install -y ffmpeg` |

### Run it

```bash
curl -fsSL https://install.bithuman.ai | sh
export BITHUMAN_API_SECRET="<your API secret>"
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav
```

### Expected output

`wise-pup.mp4`: 416×720, as long as the audio (15 seconds for the sample).

### Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents) (or on bitHuman), then `bithuman pull <AGENT_CODE>` and render it the same way.
- **Your own words:** any audio file `ffmpeg` reads works as the second argument; generate speech with [Text to speech](/api/text-to-speech).
- **A photoreal person:** `bithuman render sofia-ramirez speech.wav` renders Essence 2 (this avatar is 1080×1920 portrait).
- **Scripts and CI:** add `--json` and branch on exit codes ([reference](/platforms/cli/reference#json-output)).
- **A conversation instead of a clip:** `bithuman run wise-pup` — [Talk to an avatar on your machine](/build/voice-agent).

## Performance

```perf
linux-cpu macos-m4
```
