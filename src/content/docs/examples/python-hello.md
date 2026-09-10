---
title: "Python — Hello, avatar"
description: "Render an on-device bitHuman avatar in under 15 lines of Python — pip install bithuman, open the avatar, render audio through it."
section: examples
group: "Examples"
order: 11
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Keys](https://www.bithuman.ai/developer/api-keys); see [Authentication](/api/authentication). It is read from the environment, never passed in code.
- Python 3.10–3.14 (use a virtualenv). Install the library — Apple Silicon macOS, Linux x86_64 and Linux aarch64:

```bash
pip install "bithuman>=3"
```

- `ffmpeg` on your `PATH`, because this example hands `render` an audio **file**. Pass 16 kHz mono samples instead and it is not needed.
- One avatar file the script reads by name — **`avatar.imx`**. Any of the
  twenty [showcase models](https://api.bithuman.ai/v1/models/showcase) is
  downloadable **with no credential at all** — Essence 2 and Expression 2
  included, so you do not need an agent of your own to run this:

  ```bash
  # Expression 2 (needs `pip install "bithuman[expression-2]"` once)
  curl -L "https://api.bithuman.ai/v1/agent/X03BOLT/model/download" -o avatar.imx
  # Essence 2
  curl -L "https://api.bithuman.ai/v1/agent/A21SKT4314/model/download" -o avatar.imx
  # Essence 1, the older showcase set
  curl -L https://models.bithuman.ai/showcase/modern-court-jester.imx -o avatar.imx
  ```

  `bithuman list --manifest https://api.bithuman.ai/v1/models/showcase` browses
  them, and `bithuman pull <slug> --manifest ...` does the same fetch. An
  avatar of your own agent works with the same code.
- One speech clip — **`speech.wav`**, from any TTS. No TTS handy? One call to the bitHuman API returns a WAV: `curl -X POST https://api.bithuman.ai/v1/tts -H "api-secret: $BITHUMAN_API_SECRET" -H content-type:application/json -d '{"text":"Hello from bitHuman.","voice":"F1"}' -o speech.wav`.

> **Note** This is the **3.0.0** surface — `bithuman.open` and `avatar.render`. If you are on 2.10.0, the same program is `AsyncBithuman.create` + `push_audio` + `run`, and [the Python SDK page](/sdk/python#coming-from-2100) has the one-line fix for every name that moved. To stay on 2.x, `pip install "bithuman<3"`.

## Run it

1. Set your API secret in the same shell you'll run from.

```bash
export BITHUMAN_API_SECRET=your_secret
```

2. Save the [Full code](#full-code) below as `hello.py`, with `avatar.imx` and `speech.wav` beside it.

3. Run it.

```bash
python hello.py
```

## What you'll see

The program prints one line per frame's shape and exits 0. It renders frames but doesn't display them — that's the minimal loop, by design. To actually *watch* the avatar, hand each `image` to whatever shows pictures on your machine; the OpenCV line in the comment is one way (OpenCV wants BGR, and the frames are RGB, hence the `[:, :, ::-1]`).

The first run on a machine downloads the shared audio encoder an essence-2 avatar needs (~377 MB, digest-verified, kept under `~/.bithuman/deps`) and prepares the avatar; both happen once.

Measured on one Linux x86_64 box with a 5.8 s clip, the same three lines:

| avatar | frames | shape | wall clock (incl. prepare) |
|---|---|---|---|
| Expression 2 (`X03BOLT`) | 117 | `(720, 416, 3)` | 8.6 s |
| Essence 2 (`A21SKT4314`) | 131 | `(1920, 1080, 3)` | 110.7 s |

**Expression 2 clears realtime on a CPU; Essence 2 does not** — about 1.2
rendered frames per second end to end, roughly 21x slower than its 25 fps
output. Essence 2 on a CPU is for offline renders; use a GPU for anything
interactive.

## Full code

```python
# hello.py — open an avatar, render a clip through it
import bithuman

with bithuman.open("avatar.imx") as avatar:            # essence-1, essence-2 or expression-2 — the same call
    for image in avatar.render("speech.wav"):           # (height, width, 3) uint8, RGB, at the avatar's frame rate
        print(image.shape)
        # cv2.imshow("avatar", image[:, :, ::-1]); cv2.waitKey(1)   # to watch it (OpenCV wants BGR)
```

Interrupting the avatar is "stop consuming": `break` out of the loop (or call `.close()` on the iterator you kept) and nothing further is rendered. Every refusal is a `bithuman.AvatarError` — `InvalidAvatar`, `NotSupported`, `NotAuthorised` or `Failed`. Set the key first: with `BITHUMAN_API_SECRET` unset, the first `render` on this showcase avatar refused before any frame with `Failed: the render stopped` ([measured on the published wheel](/sdk/python#measured-on-the-published-wheel)).

## Next steps

- [Python SDK](/sdk/python) — the eight names, the four refusals, and the migration from 2.10.0.
- [AI voice chat](/examples/ai-conversation) — add a conversational brain.
- [Audio streaming](/concepts/audio-streaming) — the push/drain contract behind `render`.
- [Essence 2 & Expression 2](/concepts/models-v2) — choose a second-generation model to build (creating one takes ~45 min to 1.5 h).
