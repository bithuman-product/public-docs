---
title: "Kiosk on a Linux PC"
description: "A live avatar full screen on a standard Linux PC with no GPU: the CLI renders it on the CPU, Chrome shows it in kiosk mode, and visitors talk to it."
section: build
group: "Apps"
order: 30
type: recipe
llms: build
time: "20 min"
availability: "creator"
renders: ["no-gpu", "server"]
needs: ["Linux x86_64 / arm64", "API secret"]
platforms: ["cli"]
models: ["essence-2", "expression-2"]
claims: ["S3", "S4", "S10", "S11", "S20"]
next: ["/deploy/cpu", "/platforms/cli", "/deploy/offline"]
artifacts: ["cli"]
---

## What you'll build

<div class="lead">
<div class="lead-text">

A screen that greets visitors with a live avatar that listens and answers. The avatar renders on the PC's CPU, so a standard Linux PC with no GPU is enough.

You need:

- a Linux PC (x86_64 or arm64) with a screen, speakers and a microphone;
- Google Chrome;
- an [API secret](/start/api-secret) on the Creator plan or higher.

</div>

```figure
kiosk-linux eager
```

</div>

## Steps

### Install the CLI

```bash
curl -fsSL https://install.bithuman.ai | sh
sudo apt install -y ffmpeg python3-venv     # Ubuntu/Debian
```

The Linux download includes `livekit-server`, which `bithuman run` starts for you.

```expected
`bithuman --version` prints the CLI and engine versions.
```

### Give the kiosk its own API secret

Create a secret for this kiosk alone, so you can revoke it without touching anything else ([API secrets](https://www.bithuman.ai/developer/api-keys)). Put it in the kiosk's environment:

```bash
export BITHUMAN_API_SECRET="<this kiosk's API secret>"
```

```expected
`bithuman account` shows your plan and credit balance.
```

### Download the avatar

Download it once, ahead of the first visitor. `bithuman pull` prints the file's path:

```bash
AVATAR=$(bithuman pull kwame-warm-museum-guide)    # or your own agent code
echo "$AVATAR"
```

A file always renders on this machine. Any Essence 2 or Expression 2 avatar works on the CPU.

```expected
A path ending in `kwame-warm-museum-guide.imx`. The next runs reuse it.
```

### Start the avatar

```bash
bithuman run "$AVATAR"
```

The first run also installs the conversation brain (about 350 MB). By default the conversation runs on bitHuman's voice chat; set `OPENAI_API_KEY` to use your own OpenAI account, or `BITHUMAN_LOCAL=1` for the [local conversation brain](/platforms/cli/local-brain).

```expected
The CLI prints the page's URL, such as `http://127.0.0.1:8088/KWAMEWARMMUSEUMGUIDE`. Open it in a browser, press the start button and allow the microphone: the avatar answers when you speak.
```

### Show it full screen

Open the URL in Chrome's kiosk mode, with a profile of its own so the microphone permission is remembered:

```bash
google-chrome --kiosk --user-data-dir="$HOME/.kiosk-chrome" "http://127.0.0.1:8088/KWAMEWARMMUSEUMGUIDE"
```

```expected
The avatar fills the screen with no browser chrome. The first time, allow the microphone once; `Alt+F4` leaves kiosk mode.
```

### Choose online or fully offline

A session checks your API secret when it starts and keeps rendering through a network drop of up to 5 minutes, so this kiosk needs the network to start a conversation.

For a site with no internet at all: Offline license is only available to Business and Enterprise clients who want to run realtime avatars completely locally, off the internet — e.g. kiosks, trade shows, ATM machines, embedded screens. Linux and macOS computers (Apple silicon); bought in the console or through sales. See [Fully offline](/deploy/offline).

```expected
Online, the kiosk is ready: it needs the network each time a session starts. For fully offline, talk to [sales](https://www.bithuman.ai/enterprise?topic=offline#contact) before you deploy.
```

## How it works

```diagram
topology cpu
```

`bithuman run` starts a local `livekit-server`, the conversation brain and the avatar on this PC. Chrome joins as the visitor: it sends the microphone and shows the avatar's video, all on `127.0.0.1`. The page is served on the loopback address only; `--host 0.0.0.0` (with `BITHUMAN_ALLOW_PUBLIC_BIND=1`) opens it to the network.

## Make it your own

- **Your avatar:** create one from a portrait ([Create your own avatar](/build/create-avatar)), then `bithuman pull <agent code>`.
- **Its persona and voice:** [Persona](/build/persona) and [Voices](/build/voices).
- **Start at boot:** run `bithuman run "$AVATAR"` from a service with `BITHUMAN_API_SECRET` in its environment, and start the kiosk browser from the desktop session's autostart.
- **What it costs:** active session time, talking or idle, billed to the second at the rates on [Pricing](/pricing). The conversation's rate depends on the brain you choose.
- **Speed on your PC:** the CPU-only rows on [Performance](/performance) are measured on a standard desktop CPU.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `bithuman` exits with code 77 | No API secret: export `BITHUMAN_API_SECRET`, or run `bithuman login` once. |
| `livekit-server` is not found | Install again with the one-line installer; the Linux download includes it. |
| The avatar does not answer | Run `bithuman doctor`: it names the missing part (credential, brain, `ffmpeg`). |
| Chrome asks for the microphone every time | Keep the same `--user-data-dir`; the permission is stored in that profile. |
| No sound in kiosk mode | Choose the speaker as the default output in the system's sound settings, then reload the page. |
| The picture stutters | Close other heavy programs; see the CPU-only rows on [Performance](/performance) for the reference machine. |
