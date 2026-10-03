---
title: "CLI"
description: "Render an MP4 or run a live avatar from the terminal, with no code."
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
  first-frame: /platforms/cli#run-your-first-avatar
  integrate-into-your-app: /platforms/cli/voice#integrate-into-your-app
  voice-settings: /platforms/cli/voice#voice-settings
  platform-notes: /platforms/cli/voice#platform-notes
  reference: /platforms/cli/reference
  troubleshooting: /platforms/cli/troubleshooting
  complete-example: /platforms/cli#run-your-first-avatar
  requirements: /platforms/cli#before-you-start
  run-it: /platforms/cli#run-your-first-avatar
  expected-output: /platforms/cli#run-your-first-avatar
---

One binary, no code: `bithuman run` opens a live conversation with an avatar in your browser.

## Before you start

`bithuman render` turns an audio file into a talking-avatar MP4. Both render on your own machine. To program against the models instead, use [Python](/platforms/python).

> **Note:** On Linux, both models run live on the CPU alone, no GPU. See [CPU only (no GPU)](/deploy/cpu).

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **`render` and `run`** | both | both |
| **Download per avatar** | about 190 MB | 140–160 MB, plus a shared audio encoder (about 440 MB on Linux) once |

| You need | For | Check |
|---|---|---|
| macOS 14+ on Apple silicon, or Linux on x86_64 or arm64 | the binary | `uname -sm` |
| A bitHuman sign-in or API secret, on the Creator plan or higher (usage bills per second; [pricing](/pricing)) | `run` and `render` (browsing and downloading need none) | `bithuman account` exits 0 |
| `ffmpeg` on `PATH` | `render`, and `run` with an Essence 2 avatar | `ffmpeg -version` |
| `livekit-server` 1.13 or newer for `bithuman run` (the Linux download includes it) | `run` | `livekit-server --version`; update with `brew upgrade livekit` |
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

The Linux installer downloads about 190 MB and puts the CLI, its render engines and `livekit-server` (about 350 MB) in `~/.local/bin` (set `BITHUMAN_INSTALL_DIR` to change it). It verifies the checksum. If it asks you to, add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile. On macOS `curl` works too (then `brew install ffmpeg livekit`). `bithuman --version` prints the CLI and engine versions.

Check the install:

```text
$ bithuman --version
libessence 2.11.20 ABI 7
bithuman    2.8.8
build       … x86_64-unknown-linux-gnu/release …
engine      linux 1.0.2 …
```

The CLI is not on PyPI. `pip install bithuman` installs the Python library, which has no command.

## Authenticate

```bash
bithuman login            # opens a browser and stores a credential for this device
bithuman login --device   # over SSH: prints a code to enter in any browser
bithuman account          # exit 0 when signed in
```

Sign in first, because every render path needs a credential: without one, `run` and `render` stop before the first frame with exit 77 and write nothing. In scripts and CI, set `BITHUMAN_API_SECRET` instead of signing in ([Your API secret](/start/api-secret)). Listing, downloading and opening avatars need no account.

## Run your first avatar

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

`render` accepts any audio format `ffmpeg` reads. `bithuman run` needs two more things from [Before you start](#before-you-start): `livekit-server` and Python. It starts a local `livekit-server` and the voice agent; the first run installs the agent, about 380 MB on disk, in one to two minutes.

`wise-pup` and `A23WJF0199` are the same avatar, named two ways, and the name decides where it renders: a name (`wise-pup`) or a file renders on this machine, at the lower self-hosted rate; an agent code (`A23WJF0199`) renders in the bitHuman cloud, at the cloud rate ([pricing](/pricing)).

<div class="fig-end">

```figure
cli-linux
```

</div>

### Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents) (or on bitHuman), then `bithuman pull <AGENT_CODE>` and render it the same way.
- **Your own words:** any audio file `ffmpeg` reads works as the second argument: a recording, or a WAV or MP3 from any text-to-speech tool you use.
- **A photoreal person:** `bithuman render sofia-ramirez speech.wav` renders Essence 2 (this avatar is 1080×1920 portrait).
- **Scripts and CI:** add `--json` and branch on exit codes ([reference](/platforms/cli/reference#json-output)).
- **A conversation instead of a clip:** `bithuman run wise-pup` — [Talk to an avatar on your machine](/build/voice-agent).

## Performance

```perf
linux-cpu macos-m4
```
