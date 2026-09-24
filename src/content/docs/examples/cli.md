---
title: "CLI example"
description: "Render a talking-avatar MP4 and open a live conversation from a terminal, with no code, on macOS or Linux."
section: examples
group: "Examples"
order: 10
type: example
label: "CLI"
---

<figure class="showcase">
  <video controls preload="none" playsinline poster="/examples/cli/hero.webp" width="416" height="720" src="/examples/cli/clip.mp4"></video>
  <figcaption>The <code>wise-pup</code> sample avatar, rendered by <code>bithuman render</code> with CLI 2.7.1 on an Apple M4 Mac.</figcaption>
</figure>

## Requirements

| You need | Notes |
|---|---|
| macOS (Apple silicon) or Linux (x86_64, arm64) | |
| An [API secret](/start/api-secret) | or `bithuman login` |
| `ffmpeg` | `brew install ffmpeg` or `sudo apt install -y ffmpeg` |

## Run it

```bash
curl -fsSL https://install.bithuman.ai | sh
export BITHUMAN_API_SECRET="<your API secret>"
curl -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
bithuman render wise-pup speech.wav
```

![Terminal: the installer, bithuman pull and bithuman render writing wise-pup.mp4](/examples/cli/terminal.webp)

## Expected output

`wise-pup.mp4`: 416×720 at 20 fps, as long as the audio (15 seconds for the sample). To talk to the avatar instead, run `bithuman run wise-pup` and open the printed URL (this also needs `livekit-server`; see [CLI](/sdk/cli#before-you-start)).

## Make it your own

- **Your own avatar:** create one with the [Agents API](/api/agents) (or on bitHuman), then `bithuman pull <AGENT_CODE>` and render it the same way.
- **Your own words:** any audio file `ffmpeg` reads works as the second argument; generate speech with [Text to speech](/api/text-to-speech).
- **A photoreal person:** `bithuman pull sofia-ramirez` renders an Essence 2 avatar at up to 1920×1080.
- **Scripts and CI:** add `--json` and branch on exit codes ([reference](/sdk/cli/reference#json-output)).
- **A conversation instead of a clip:** `bithuman run wise-pup` — [Talk to an avatar on your machine](/guides/local-voice-avatar).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `not signed in`, exit 77 | set `BITHUMAN_API_SECRET` or run `bithuman login` |
| `ffmpeg not found`, exit 69 | install `ffmpeg`, or set `BITHUMAN_FFMPEG` |
| `bithuman: command not found` | `export PATH="$HOME/.local/bin:$PATH"` |
| `bithuman run` exits 69: `livekit-server … is too old` | update LiveKit to 1.13 or newer: `brew upgrade livekit` |

## Next

- [CLI](/sdk/cli) · [CLI reference](/sdk/cli/reference) · [example scripts](https://github.com/bithuman-product/bithuman-examples/tree/main/api/cli)
