---
title: "AI voice chat"
description: "Talk to an OpenAI Realtime voice agent and watch a bitHuman avatar lip-sync the response in real time."
section: examples
group: "Examples"
order: 15
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys); see [Authentication](/api/authentication). The runtime checks it at the first frame, so this example does not start without one.
- An `OPENAI_API_KEY` (the brain) — from [openai.com](https://openai.com).
- A working microphone, and an avatar `.imx` file — [get one below](#get-an-avatar-file).
- **On Linux, the PortAudio system library.** `sounddevice` loads it at import and no
  pip package supplies it, so without it the script dies on its first import with
  `OSError: PortAudio library not found`. On Debian and Ubuntu:
  `sudo apt install libportaudio2`. macOS needs nothing here — the macOS wheel falls
  back to a PortAudio it bundles.
- Everything runs locally — no LiveKit server, no browser, no server-side WebRTC.
- Python 3.10–3.14, **in a virtualenv**. A system-wide `pip install` is refused on stock
  Debian and Ubuntu with `error: externally-managed-environment`, so create the
  environment first. This is the whole install, in order — the last line matters, see
  below:

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/python/local-essence
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install "bithuman<3"                                  # the AsyncBithuman API this example uses
pip install --force-reinstall --no-deps opencv-python     # must be LAST — see below
```

**Why `opencv-python` goes last.** The example draws the avatar with `cv2.imshow`, so it
needs a **GUI** OpenCV build. Both `requirements.txt` and the `bithuman` wheel itself
depend on `opencv-python-headless`, which has no window support, and whichever of the two
lands last wins the shared `cv2` directory. Installing the GUI build afterwards is what
makes the window open; skip that line and the script reaches the display and raises
`cv2.error: ... The function is not implemented. Rebuild the library with Windows, GTK+
2.x or Cocoa support`. Do **not** `pip uninstall opencv-python-headless` to fix it —
removing it deletes files the GUI build shares, and `import cv2` then half-loads.

## Get an avatar file

Downloading a showcase avatar is **free and anonymous** — no account, no key, nothing to
sign in to. Either command below writes the exact path the run command uses. The CLI
route needs the [bitHuman CLI](/sdk/cli#install) (macOS Apple Silicon or Linux x86_64);
the `curl` route works on any platform:

```bash
# With the CLI
bithuman pull sofia-ramirez

# Or with curl alone — the same file, addressed by agent code
curl -L "https://api.bithuman.ai/v1/agent/A52DHS2219/model/download?model=essence-2" \
  --create-dirs -o ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

`sofia-ramirez` (agent code `A52DHS2219`) is an Essence 2 identity in the free showcase,
about 148 MB. `bithuman list` prints every showcase slug; more are on
[Explore](https://www.bithuman.ai/explore).

> **What is free, and what needs an account.** Downloading a showcase avatar costs
> nothing and needs no credential. *Playing* one always does — this example,
> `bithuman run` and `bithuman render` alike — and the minutes bill at the
> [published rates](/guides/pricing). The same split applies to `bithuman pull`
> itself: a showcase **slug** is anonymous, while one of **your own** agents by
> **code** is not (`bithuman pull A78WKV4515` answers `MISSING_AUTH` until you run
> `bithuman login` or export `BITHUMAN_API_SECRET`).

## Run it

1. Set both keys in the same shell (or copy `.env.example` to `.env` and fill it in).

```bash
export BITHUMAN_API_SECRET="<your API secret>" OPENAI_API_KEY="sk-..."
```

2. Run the conversation, pointing at your model. Speak into your mic; press `Q` in the window to quit.

```bash
python conversation.py --model ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

> **Will your machine keep up?** A live conversation needs the avatar to render
> at least as fast as it plays — 25 fps for Essence 2, 20 for Expression 2. The
> measured rate for each platform is on the [performance page](/sdk/performance).

## What you'll see

An OpenCV window opens with the avatar. Your mic streams to the **OpenAI Realtime API**, the AI's spoken reply pipes into the bitHuman runtime, and the avatar lip-syncs the answer in real time while you hear it through your speakers.

## Full code

The pipeline: mic → OpenAI Realtime (24 kHz PCM16) → `push_audio`/`flush` into the runtime → lip-synced frames + audio out. The runnable script (`conversation.py`) wires up the mic, speaker, and OpenCV window; the heart of it is below.

```python
# Configure the OpenAI Realtime session, then bridge its audio into bitHuman.
async with client.beta.realtime.connect(model="gpt-4o-mini-realtime-preview") as conn:
    await conn.session.update(session={
        "instructions": "You are a friendly AI assistant. Keep responses concise.",
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16",
        "turn_detection": {"type": "server_vad"},
        "voice": "coral",
    })

    async for event in conn:
        if event.type == "response.audio.delta":
            # OpenAI speaks at 24 kHz — push straight into the avatar runtime.
            await runtime.push_audio(base64.b64decode(event.delta), 24000, last_chunk=False)
        elif event.type == "response.audio.done":
            await runtime.flush()

# Meanwhile, the render loop draws every frame and plays its synced audio:
async for frame in runtime.run():
    if frame.has_image:
        cv2.imshow("bitHuman", frame.bgr_image)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    if frame.audio_chunk:
        speaker_buf.extend(frame.audio_chunk.array.tobytes())
```

Customize the personality by editing the `instructions` string — e.g. "You are a patient tech expert who explains things simply." or "You are an enthusiastic product advisor."

Full source: [GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/python/local-essence)

> **Note** **Common issues, by the exact error.**
> `OSError: PortAudio library not found` → the system library is missing;
> `sudo apt install libportaudio2` on Debian/Ubuntu, or `brew install portaudio` on a Mac
> whose bundled copy did not load.
> `cv2.error: ... The function is not implemented` → the headless OpenCV is winning;
> re-run the `--force-reinstall --no-deps opencv-python` line above.
> `error: externally-managed-environment` → you are outside the virtualenv;
> `source .venv/bin/activate`.
> Script won't start → both keys set in the same shell?
> No mic input → grant the terminal mic permission (macOS: System Settings → Privacy &
> Security → Microphone).
> Avatar shows but doesn't lip-sync → OpenAI Realtime audio is 24 kHz PCM16; pass `24000`
> to `push_audio`.
> **Want it in the browser instead?** Run the
> [cloud-essence Docker Compose stack](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence)
> and open `http://localhost:4202`.

## Next steps

- [LiveKit integration](/sdk/livekit) — deploy a voice agent with a face.
- [Building avatars](/guides/building-avatars) — use your own avatar.
- [Embed widget](/api/embedding) — put it on your site.
- [Python SDK](/sdk/python) — full API surface, LiveKit voice agents, troubleshooting.
- [Audio streaming](/concepts/audio-streaming) — the `push_audio` / `flush` / `run` contract this example is built on.
- [macos-voice example](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — fully on-device voice agent: speech never leaves your Mac.
