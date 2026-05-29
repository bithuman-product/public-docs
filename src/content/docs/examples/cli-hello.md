---
title: "CLI — Hello, avatar"
description: "Get an on-device AI avatar talking in ~2 minutes — install, doctor check, browser-served avatar, no code required."
section: examples
group: "Examples"
order: 10
---

## Prerequisites

- A bitHuman API secret (free tier works) — get one at [Developer → API Keys](https://www.bithuman.ai/#developer). See [Authentication](/api/authentication) for how the key is used.
- Install the CLI (one of):

```bash
brew install bithuman-product/bithuman/bithuman-cli   # macOS, recommended
```

- Device floor: macOS 26+ on Apple Silicon (M3+) **or** Linux x86_64 / aarch64. ~3 GB free disk for the showcase avatar; ~5 GB more for the on-device brain.
- Optional: an `OPENAI_API_KEY` for the cloud brain — or skip it entirely with `BITHUMAN_LOCAL=1` for a fully on-device, offline brain.

> **Note** No Homebrew? Use the universal one-liner `curl -fsSL https://github.com/bithuman-product/homebrew-bithuman/releases/latest/download/install.sh | sh`, or `pip install bithuman-cli` in any Python 3.10–3.14 env. All three install the same Rust binary.

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

4. Prefer no cloud at all? Run the fully on-device brain instead. First run downloads ~5 GB of brain models once (whisper.cpp + llama.cpp + Supertonic + Silero); after that it is offline.

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

> **Note** `bithuman render` ships on **Linux only** as of bithuman 2.3.0 / libessence ABI v7 — on macOS the encoder returns "not implemented". Workarounds: render in a manylinux Docker container, or use `bithuman run` and screen-record the browser tab. macOS render support is queued.

Full source: [GitHub](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/cli)

## Next steps

- [CLI reference](/cli) — every subcommand, cache layout, and flags.
- [Python — Hello, avatar](/examples/python-hello) — the same engine, in ~20 lines of code.
- [Models](/concepts/models) — Essence vs Expression, which to ship.
