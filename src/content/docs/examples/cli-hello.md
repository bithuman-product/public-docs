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

4. Prefer no cloud at all? Run the fully on-device brain instead. First run downloads ~900 MB of brain models once (whisper.cpp + llama.cpp + Supertonic + Silero); after that it is offline. (The `[local]` pip extra is macOS Apple Silicon — see [Local mode](/sdk/cli/local-mode) for the Linux path.)

```bash
pip install 'bithuman-cli[local]'
BITHUMAN_LOCAL=1 bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

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

Want an offline MP4 instead of a live session? Lip-sync a WAV you already have:

```bash
bithuman render ~/.cache/bithuman/showcase/modern-court-jester.imx \
  --audio speech.wav --output rendered.mp4
```

> **Warning** `bithuman render` is **not working in `cli-v2.4.0` or
> `cli-v2.4.2`** (re-verified 2026-09-02). It ships on **Linux only** — on macOS
> the encoder returns "not implemented" — and on Linux x86_64 it fails at the
> muxing step with
> `record_mp4 failed: file corrupt: audio_decode: avformat_open_input failed`
> and writes no file, for every WAV tried (including the one shipped in this
> repo's own examples). Until it is fixed: for an **Essence 2** bundle render
> locally with the [Python SDK](/guides/self-host-local#4-render), which does
> produce an MP4; otherwise get one from the [Video API](/api/video)
> (`POST /v1/video/generate`), or use `bithuman run` and screen-record the tab.

Full source: [GitHub](https://github.com/bithuman-product/homebrew-bithuman/tree/main/Examples/cli)

## Next steps

- [Commands](/sdk/cli/commands) — the full CLI surface.
- [Local mode](/sdk/cli/local-mode) — run the whole stack offline.
- [AI voice chat](/examples/ai-conversation) — a full conversational agent.
- [Python — Hello, avatar](/examples/python-hello) — the same engine, in ~20 lines of code.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and which to choose (creating one takes ~45 min to 1.5 h).
