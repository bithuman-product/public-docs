---
title: "CLI — Hello, avatar"
description: "Get an on-device AI avatar talking in ~2 minutes — install, doctor check, browser-served avatar, no code required."
section: examples
group: "Examples"
order: 10
---

## Prerequisites

- A bitHuman API secret (free tier works) — get one at [Developer → API Keys](https://www.bithuman.ai/developer/api-keys). See [Authentication](/api/authentication) for how the key is used.
- Install the CLI:
  - **macOS (Apple Silicon):** `brew install bithuman-product/bithuman/bithuman-cli` (or `pip install bithuman-cli`).
  - **Linux (x86_64 / aarch64):** the universal installer — `curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh`. (The PyPI `bithuman-cli` wheel is macOS-Apple-Silicon only, so `pip install` won't work on Linux.)
- Device floor: macOS 14 (Sonoma)+ on Apple Silicon, **or** Linux x86_64 / aarch64. ~100 MB free disk for a showcase avatar; ~900 MB more for the on-device brain.
- Optional: an `OPENAI_API_KEY` for the cloud brain — or skip it entirely with `BITHUMAN_LOCAL=1` for a fully on-device, offline brain.

## Run it

1. Set your API secret and sanity-check the host. `doctor` validates arch, OS, RAM, disk, the key, and brain availability — re-run it any time you change env vars.

```bash
export BITHUMAN_API_SECRET=your_api_secret
bithuman doctor
```

2. Download a showcase avatar into the local cache.

```bash
bithuman pull modern-court-jester
```

3. Start a browser-served voice chat with the cloud brain. Open the printed `http://127.0.0.1:8088/<CODE>` URL, grant mic permission, and talk.

```bash
export OPENAI_API_KEY=sk-...
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

4. Prefer no cloud at all? Run the fully on-device brain instead. First run downloads ~900 MB of brain models once (whisper.cpp + llama.cpp + Supertonic + Silero); after that it is offline. (Install the brain requirements directly — the `[local]` extra only exists on the macOS-arm64-only `bithuman-cli` wheel; see [Local mode](/sdk/cli/local-mode).)

```bash
pip install 'livekit-agents[silero]~=1.5' supertonic pywhispercpp llama-cpp-python soxr
BITHUMAN_LOCAL=1 bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

Install the requirements directly rather than through an extra.
`bithuman-cli[local]` reaches the same set, but only on macOS arm64 —
on Linux it exits 1. And `bithuman[local]` is not an extra at all: pip
warns, **exits 0, and installs none of it**.

## What you'll see

A browser tab opens to a live, lip-synced avatar on `localhost`. Speak into your mic and the avatar answers and lip-syncs the reply in real time over WebRTC — all rendered on your own device.

## Full code

There is no code to write — the whole demo is four commands. The complete, copy-paste version:

```bash
# 1. Install (macOS)
brew install bithuman-product/bithuman/bithuman-cli

# 2. Auth + host check
export BITHUMAN_API_SECRET=your_api_secret
bithuman doctor

# 3. Pull a showcase avatar
bithuman pull modern-court-jester

# 4. Live voice chat in the browser (cloud brain)
export OPENAI_API_KEY=sk-...
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

Want an offline MP4 instead of a live session? Lip-sync an audio file you
already have. Both second-generation models render locally — on macOS Apple
Silicon and Linux x86_64 — and the two flows have the same shape; `pull` prints
the cached path on stdout, so capture it:

```bash
bithuman login                                                # once — the first play checks the licence

# Expression 2 — <code>.avatar
MODEL=$(bithuman pull <YOUR_AGENT_CODE> --model expression-2)
bithuman render "$MODEL" --audio speech.wav --output x2.mp4   # 20 fps

# Essence 2 — <code>.imx (CLI 2.6.1 and later)
MODEL=$(bithuman pull <YOUR_AGENT_CODE> --model essence-2)
bithuman render "$MODEL" --audio speech.wav --output e2.mp4   # 25 fps; 5 s of audio → 125 frames
```

The first Essence 2 render on a machine downloads the shared audio encoder
(~377 MB, once, by content digest) into `~/.bithuman/engines/essence-2/` and
reuses it after that; nothing to stage by hand. Writing the MP4 needs `ffmpeg`
on `PATH`. An Essence 2 file with a required member missing is refused with
exit 69 and no output file. Every exit code, with the transcript, is on
[Verified transcript](/sdk/cli/verified#bithuman-render-one-family-at-a-time).

> **Warning** `bithuman render` on an **Essence 1** model (the showcase
> avatars, including `modern-court-jester.imx`) is **not working** — first
> reported against `cli-v2.4.0`, and 2.6.1's own `render --help` still reports
> **exit 70** for this family on both platforms. On Linux x86_64 it fails at
> the muxing step with
> `record_mp4 failed: file corrupt: audio_decode: avformat_open_input failed`
> and writes no file, for every WAV tried (including the one shipped in this
> repo's own examples). For an Essence 1 MP4 use the [Video API](/api/video)
> (`POST /v1/video/generate`), or `bithuman run` and screen-record the tab.

Full source: [GitHub](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/cli)

## Next steps

- [Commands](/sdk/cli/commands) — the full CLI surface.
- [Local mode](/sdk/cli/local-mode) — run the whole stack offline.
- [AI voice chat](/examples/ai-conversation) — a full conversational agent.
- [Python — Hello, avatar](/examples/python-hello) — the same engine, in ~20 lines of code.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and which to choose (creating one takes ~45 min to 1.5 h).
