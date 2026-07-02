---
title: "Python — Hello, avatar"
description: "Get a real-time on-device bitHuman avatar rendering in under 20 lines of Python."
section: examples
group: "Examples"
order: 11
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Keys](https://www.bithuman.ai/#developer); see [Authentication](/api/authentication).
- Python 3.10–3.14 (use a virtualenv). Install the library (cross-platform wheels — macOS arm64 + Linux x86_64/aarch64):

```bash
pip install bithuman soundfile
```

- Runs on macOS arm64, Linux x86_64, and Linux aarch64 — fully on-device.
- Two input files the script reads by name:
  - **`avatar.imx`** — an avatar model. Download any showcase model directly, e.g. `curl -L https://models.bithuman.ai/showcase/modern-court-jester.imx -o avatar.imx`. (On macOS you can also `bithuman pull modern-court-jester` via the [CLI](/sdk/cli/overview); the CLI's PyPI wheel is macOS-only, so on Linux use the direct download above or grab one from [Explore](https://www.bithuman.ai/explore).)
  - **`speech.wav`** — any speech clip from any TTS. No TTS handy? One call to the bitHuman API returns a WAV: `curl -X POST https://api.bithuman.ai/v1/tts -H "api-secret: $BITHUMAN_API_SECRET" -H content-type:application/json -d '{"text":"Hello from bitHuman.","voice":"F1"}' -o speech.wav`.

> **Note (Debian/Ubuntu)** Older releases (≤ 2.3.3) failed the first authenticated call on Debian/Ubuntu with `Problem with the SSL CA cert` — **fixed in 2.3.4**, which auto-discovers your distro's CA bundle on Linux with no configuration. If you must stay on ≤ 2.3.3, either upgrade (recommended) or symlink once: `sudo mkdir -p /etc/pki/tls/certs && sudo ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt`. Heads-up: `CURL_CA_BUNDLE` / `SSL_CERT_FILE` override auto-discovery when set — a stale value breaks auth even on 2.3.4.

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

The program **prints nothing and exits 0**. It renders frames into `frame.bgr_image` but doesn't display them — that's the minimal loop, by design. To actually *watch* the avatar (OpenCV window + speaker playback), run the canonical example:

```bash
git clone https://github.com/bithuman-product/homebrew-bithuman.git
cd homebrew-bithuman/Examples/python/local-essence
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt      # incl. opencv — not bundled with the SDK
python quickstart.py \
  --model ~/.cache/bithuman/showcase/modern-court-jester.imx \
  --audio-file speech.wav            # this example dir ships a speech.wav
```

The streaming contract — `push_audio` → `flush` → `run` — is documented in full in [Audio streaming](/concepts/audio-streaming).

## Full code

```python
# hello.py — minimal avatar render loop
import asyncio, os
import numpy as np
import soundfile as sf
from bithuman import AsyncBithuman

# bithuman 2.3 is library-only — the old bithuman.audio helpers were
# removed. Inline what we need: load a WAV, downmix to mono 16 kHz,
# convert float32 → int16 PCM.
def load_audio(path: str, target_sr: int = 16000) -> tuple[np.ndarray, int]:
    audio, sr = sf.read(path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sr != target_sr:
        n = int(round(len(audio) * target_sr / sr))
        audio = np.interp(
            np.linspace(0, len(audio), n, endpoint=False),
            np.arange(len(audio)), audio,
        ).astype(np.float32)
        sr = target_sr
    return audio, sr

def float32_to_int16(arr: np.ndarray) -> np.ndarray:
    return (np.clip(arr, -1.0, 1.0) * 32767.0).astype(np.int16)

async def main():
    runtime = await AsyncBithuman.create(
        model_path="avatar.imx",
        api_secret=os.environ["BITHUMAN_API_SECRET"],
    )

    pcm, sr = load_audio("speech.wav")
    pcm = float32_to_int16(pcm)
    chunk = sr // 100  # 10 ms per chunk
    for i in range(0, len(pcm), chunk):
        await runtime.push_audio(
            pcm[i : i + chunk].tobytes(), sr, last_chunk=False,
        )
    await runtime.flush()

    try:
        async for frame in runtime.run():
            if frame.has_image:
                bgr = frame.bgr_image            # (H, W, 3) uint8 numpy array
                # Encode it, display it, push it to a video sink — your choice.
            if frame.end_of_speech:
                break
    finally:
        await runtime.stop()

asyncio.run(main())
```

Full source: [GitHub](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/python/local-essence)

## Next steps

- [Python SDK](/sdk/python) — the full on-device runtime reference.
- [AI voice chat](/examples/ai-conversation) — add a conversational brain.
- [Audio streaming](/concepts/audio-streaming) — the push/drain loop in depth.
