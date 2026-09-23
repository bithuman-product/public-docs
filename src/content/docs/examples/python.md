---
title: "Python example"
description: "Open an avatar in Python, play speech through it, and watch it talk in a window. Clone, install, run."
section: examples
group: "Examples"
order: 20
type: example
label: "Python"
---

<figure class="showcase">
  <video controls preload="none" playsinline poster="/examples/python/hero.webp" width="540" height="960" src="/examples/python/clip.mp4"></video>
  <figcaption>The <code>sofia-ramirez</code> Essence 2 sample avatar in the quickstart's window, with bithuman 2.11.6 on an Apple M4 Mac.</figcaption>
</figure>

## Requirements

| You need | Notes |
|---|---|
| Python 3.10–3.14 | on macOS (Apple silicon) or Linux (x86_64, arm64) |
| An [API secret](/start/api-secret) | |
| A desktop session | the example opens a window |

## Run it

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/python/quickstart
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
export BITHUMAN_API_SECRET="<your API secret>"
python local-avatar.py
```

## Expected output

A window titled **bitHuman avatar** opens and the avatar speaks the bundled `speech.wav`. The first run downloads the sample avatar (about 150 MB). To write an MP4 instead of opening a window, run `python -m bithuman ~/.cache/bithuman/models/A52DHS2219.imx speech.wav`.

## Make it your own

- **Your own avatar:** pass `--model` with your agent's `.imx`, downloaded with the [Agents API](/api/agents#download-an-agents-model) or `bithuman pull <AGENT_CODE>`.
- **Your own audio:** pass any audio file; or stream microphone audio with `AsyncBithuman` ([Integrate into your app](/sdk/python#integrate-into-your-app)).
- **A conversation:** `cloud-avatar.py` in the same folder connects the avatar to an OpenAI voice agent over LiveKit ([LiveKit](/sdk/livekit)).
- **A web app:** send the frames from `render()` to your own video stream, or use the [web embed](/sdk/web).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `NotAuthorised` at the first frame | `export BITHUMAN_API_SECRET=…` in the same terminal |
| The window never opens (`GUI: NONE`) | `pip install --force-reinstall --no-deps opencv-python` |
| `externally-managed-environment` | create and activate the venv first |

## Next

- [Python](/sdk/python) · [Python API](/sdk/python-api) · [Python examples](https://github.com/bithuman-product/bithuman-examples/tree/main/python)
