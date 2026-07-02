---
title: "Changelog"
description: "Release notes and version history for the bitHuman platform."
section: resources
group: "Resources"
order: 1
---

> **Note** Product-level changes only. For per-version notes, see the [Python SDK CHANGELOG](https://github.com/bithuman-product/bithuman-sdk-public/blob/main/python/CHANGELOG.md) and the [Swift SDK releases](https://github.com/bithuman-product/bithuman-sdk-public/releases).

## July 2026

### General availability — Essence 2 Quality, Essence 2 Light, Expression 2 (2026-07-01)

Three second-generation avatar models are now **generally available** on every surface — the REST API, the embed widget, the dashboard, and the SDKs. See [Essence 2 & Expression 2](/concepts/models-v2) for the full guide.

- **`expression-2`** — the second-generation expression engine. Audio-driven, real-time avatar video from a **single photo**: agent creation trains a small per-identity model in a few minutes, then the engine synthesizes fully generated motion live. Serves on three tiers — **gpu**, **cpu**, and **ane** (Apple Neural Engine). 4 credits/min cloud · 2 credits/min self-hosted.
- **`essence-2-quality`** — the **highest-fidelity** tier of the Essence family: a heavy GPU renderer for close-up, hero-quality output on cloud GPUs. 8 credits/min cloud · 4 credits/min self-hosted.
- **`essence-2-light`** — the **cost-effective** tier: a distilled renderer that runs across **gpu**, **cpu**, and **ane** — including fully **on-device**, where audio and video never leave your hardware. The `essence-2-light` rollout gate is lifted: agent generation with `model="essence-2-light"` is live. 4 credits/min cloud · 2 credits/min self-hosted.

All three are **train-on-create** via [`POST /v1/agent/generate`](/api/agents) (250 credits, one-time) and serve through the existing session flows unchanged. The v1 models (`essence-1`, `expression-1`) remain fully supported.

## June 2026

### Talking video generation — new API (2026-06-29)

- **New endpoints: `POST /v1/video/generate` + `GET /v1/video/{job_id}`.** Render a finished **talking-video mp4** of one of your agents from **text** or **audio**. With text input, the agent's own voice speaks your script; with audio input, your hosted `audio_url` drives the render directly. The API is asynchronous — submit a job, then poll for the public mp4 URL, output duration, and credits charged. Launch engines: **`expression-2`** (4 credits/min) and **`essence-2-quality`** (8 credits/min), billed per minute of output **rounded up**; a failed render is automatically refunded. Limits: 120 seconds of output, 5000 characters of text. See [Talking video generation](/concepts/talking-video) and the [Video API reference](/api/video).

### Agent generation — v2 model names accepted (2026-06-29)

- **`POST /v1/agent/generate` now accepts the v2 model names.** The `model` parameter takes **`essence-2-quality`**, **`expression-2`**, and **`essence-2-light`** as supported generation targets (alongside `essence-1` / `expression-1`). All three are **fully live** (the `essence-2-light` rollout gate was lifted 2026-07-01). *Update 2026-06-30:* the legacy aliases (`elevate`, `embody`, `embody-gpu`, `essence-2-mobile`) were retired ahead of GA — requests using them now return a `400 VALIDATION_ERROR` naming the current model list. Share links are unaffected.

### Model naming — versioned public taxonomy (2026-06-26)

- **The avatar model families now have versioned public names.** The `model` parameter on agent generation (and the viewer's `?model=` selector) accepts the consolidated names **`essence-1`**, **`essence-2-quality`**, **`essence-2-light`**, **`expression-1`**, and **`expression-2`**. **Essence 2** ships in two tiers — **Quality** (`essence-2-quality`, the high-fidelity cloud GPU renderer) and **Light** (`essence-2-light`, the efficient distilled renderer). The older values **`essence`** and **`expression`** map to **`essence-1`** / **`expression-1`**; the pre-release codename values (`elevate`, `embody`, `essence-2-mobile`) were transitional aliases and have since been retired (*see the 2026-06-30 note above* — they now return a validation error naming the current model list). Share links are unaffected. Documentation, dashboards, and app labels now use the new family names.

### Python SDK `bithuman` 2.3.10 (2026-06-23) — self-hosted streaming lag fix

- **Streaming compose no longer degrades over a long utterance.** Self-hosted streaming now holds a steady frame rate for the full length of a turn (long utterances used to slow down as they grew), with byte-identical output. The audio stream also resets at the start of each turn so idle frames can't shift lip-sync.

### Python SDK `bithuman` 2.3.9 (2026-06-23) — barge-in / interrupt fix

- **Interrupt (barge-in) no longer wedges the runtime.** Interrupting the avatar mid-utterance previously froze it after the first barge-in (the interrupt path shared the terminal stop signal). 2.3.9 routes interrupts through a separate event, drains in-flight frames, and resumes on a fresh runtime — so a user can talk over the avatar repeatedly without it getting stuck.
- **Recommended LiveKit stack:** `bithuman` 2.3.9+ with `livekit-plugins-bithuman` 1.6.3 and `livekit-agents` 1.6.x (plus `pillow`).

### Python SDK `bithuman` 2.3.8 (2026-06-16)

- Maintenance release on the 2.3 line (2.3.5–2.3.7 were not published).

### Python SDK `bithuman` 2.3.4 (2026-06-12) — Linux CA auto-discovery

- **Linux CA auto-discovery.** The SDK now finds your distro's CA bundle automatically on Linux — self-hosted auth (`AsyncBithuman.create()`) works **zero-config** on Debian, Ubuntu, SUSE, and Alpine-glibc layouts. The `/etc/pki/tls/certs/ca-bundle.crt` symlink workaround needed on ≤ 2.3.3 is obsolete. Thanks to the customer report that pinned down the Debian/Ubuntu `Problem with the SSL CA cert` failure.
- **Env-var override preserved.** `CURL_CA_BUNDLE` / `SSL_CERT_FILE` take precedence over auto-discovery when set — a stale or wrong value will still break auth, so unset them unless they point at a valid bundle.
- **macOS wheel tags.** The 2.3.4 macOS wheels are tagged for **macOS 26+ (arm64)**. On older macOS, pip reports `No matching distribution found` — see the [Python SDK page](/sdk/python) for options.

## May 2026

### 2.3.0 (2026-05-28) — layered architecture + PyPI wheel split

- **PyPI wheel split.** `pip install bithuman` is now the Python SDK **library only** (~5 MB) — `from bithuman import AsyncBithuman` still works. The bitHuman CLI moved to the sibling [`bithuman-cli`](https://pypi.org/project/bithuman-cli/2.3.0/) wheel; install via `pip install bithuman-cli`, `brew install bithuman-product/bithuman/bithuman-cli` (the old `bithuman` formula keeps working as a deprecated alias), or the universal `curl -sSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh` installer — all three deliver the same Rust binary that prints `libessence 1.19.1 ABI 7 / bithuman 2.3.0` on `bithuman --version`.
- **CLI surface trimmed.** The binary now exposes exactly six runtime subcommands: `run`, `render`, `info`, `pull`, `list`, `doctor` (plus `init` for scaffolding a new project — seven in total). Legacy 1.x verbs (`voice`, `text`, `avatar`, `stream`, `speak`, `action`, `generate`, `asr`, `tts`, `models pull|list`, `cleanup`) were removed during the 2.x line and stay removed.
- **Wheel matrix.** The Python library [`bithuman`](https://pypi.org/project/bithuman/) ships on PyPI for **macOS arm64** *and* **Linux x86_64 + aarch64** (manylinux). The CLI wheel [`bithuman-cli`](https://pypi.org/project/bithuman-cli/) is **macOS Apple Silicon only** on PyPI — on Linux, install the CLI via the universal `install.sh` / tarball, not pip. Python 3.10–3.14. *(Latest patches: `bithuman` 2.3.10, `bithuman-cli` 2.3.25.)*
- **Repo layout.** Public source lives in two repos: [`bithuman-sdk-public`](https://github.com/bithuman-product/bithuman-sdk-public) — docs source, runnable examples, and landing pages — and [`homebrew-bithuman`](https://github.com/bithuman-product/homebrew-bithuman) — the Homebrew tap, universal `install.sh`, and tarball release mirror. The engine and language SDKs ship as prebuilt, statically linked artifacts on PyPI and SwiftPM.
- **`BITHUMAN_BRAIN_*` → `BITHUMAN_AGENT_*` env-var rename** (carried through from Wave 5 of the 2.x line): `BITHUMAN_AGENT_PORT`, `BITHUMAN_AGENT_PYTHON`, `BITHUMAN_AGENT_SCRIPT`. The old `BITHUMAN_BRAIN_*` names are still read with a deprecation warning.
- **No external API breaks.** Python (`from bithuman import AsyncBithuman`) and Swift (`import Bithuman`) public APIs are unchanged from 2.2.x. Migration for existing `pip install bithuman && bithuman run` users is install-time only: `pip install bithuman-cli` (or `brew install bithuman-product/bithuman/bithuman-cli`) to keep the `bithuman` console-script.
- **Engine ABI** bumps to `v7` (libessence 1.19.1) — adds `be_runtime_tick_compose_from_mel` (compose a tick directly from a mel feed). Additive on top of v6; old SDK builds keep working. (`be_set_default_audio_encoder` is an additive, ABI-unchanged entry point and did not bump the ABI.)
- **LiveKit integration.** The upstream pin-relaxation PR ([livekit/agents#5882](https://github.com/livekit/agents/pull/5882)) has since merged — `livekit-plugins-bithuman` (1.6.3) now pins `bithuman<3,>=0.5.25`, so `pip install bithuman livekit-plugins-bithuman` resolves cleanly.
- **Removed surfaces.** The `bithuman.utils` and `bithuman.audio` Python modules are gone from the slim 2.3.0 wheel (helpers are inlined into the examples). **Elevate** was removed from the **cloud** model family but is **retained as the on-device engine** (vendored `libelevate`, used by AvatarUIKit and the `expression/iphone` sample app) — it was not deleted from the platform.

### Python SDK `bithuman` 2.2.2 (2026-05-25) — Linux CLI tarballs restored

- CI-only cleanup release; no API / runtime changes. Same Python wheel content as 2.2.1.
- Linux CLI tarballs (`bithuman-x86_64-unknown-linux-gnu.tar.gz` and `bithuman-aarch64-unknown-linux-gnu.tar.gz`) ship on the GitHub Release again — they had been missing since 2.0.1 because of two container-build blockers, both now fixed in `main`.
- Pin `bithuman==2.2.2` if you want `pip install` AND the standalone Linux CLI binary from the same tag; `==2.2.1` is fine for wheel-only consumers.

### Python SDK `bithuman` 2.2.1 (2026-05-25) — `bithuman-cli[local]` extra

> **Note** 2.2.0 was skipped; 2.2.1 is the first published build of this release, with identical source content. Install 2.2.1.

- New `pip install 'bithuman-cli[local]'` extra adds a **fully on-device conversation brain** to `bithuman run`. Flip it on with `BITHUMAN_LOCAL=1`; no API key required, no outbound network.
- Stack: `whisper.cpp` (STT) + `llama.cpp` (LLM, default Qwen 2.5 0.5B-Instruct Q4_K_M) + Supertonic 3 (TTS, 31 languages, voice M1 default) + Silero VAD. All in-process — no Ollama or other server.
- All three backends have first-party iOS C++ cores, so the same `.gguf` / `.bin` / `.onnx` model files are reusable when porting to mobile.
- New plugins live in `livekit.plugins.bithuman.{WhisperSTT, LlamaCppLLM, SupertonicTTS}` alongside `AvatarSession`. The avatar-only install path is unchanged (heavy deps are lazy-imported).
- Tuning via env vars: `BITHUMAN_LOCAL_WHISPER`, `BITHUMAN_LOCAL_LLM`, `BITHUMAN_LOCAL_LLM_FILE`, `BITHUMAN_LOCAL_VOICE`, `BITHUMAN_LOCAL_LANG`, `BITHUMAN_INSTRUCTIONS`. See [Python SDK](/sdk/python).
- Footprint: ~860 MB on disk (auto-downloaded from HuggingFace on first run), ~1.5 GB RAM, ~717 ms warm load, ~1.4 s warm end-to-end on Apple Silicon.
- Cloud path (`BITHUMAN_LOCAL` unset, `OPENAI_API_KEY` set) is byte-for-byte unchanged.

### Python SDK `bithuman` 2.1.0 (2026-05-24) — figure → avatar

- Retired legacy "figure" terminology. CLI flag `--figures-root` is now `--avatars-root` (old name kept as a deprecated alias). Default cache moved from `~/.cache/bithuman/figures` to `~/.cache/bithuman/avatars`.
- No runtime behavior change; alignment with the public-facing "avatar" product term.

### Python SDK `bithuman` 2.0.2 (2026-05-24) — graceful drain

- `bithuman run` now cancels active sessions and waits up to 2 s for libessence/HDF5 teardown before the process unwinds. Eliminates the `H5F.c: decrementing file ID failed` + exit 134 SIGABRT on Ctrl-C / LaunchDaemon stop. Required for production-style supervisors.

### Python SDK `bithuman` 2.0.1 (2026-05-24)

- `AsyncBithuman.cleanup` is now `async` — `await b.cleanup()` works (was raising `TypeError` and segfaulting at interpreter shutdown).
- CLI error message polish: `bithuman pull <bad-slug>` and `bithuman render` no longer reference renamed subcommands.
- `essence-render --help` shows the correct prog name (was `bithuman`).

### Python SDK `bithuman` 2.0.0 (2026-05-22) — bundled-CLI release

- `pip install bithuman` now ships a `bithuman` console-script that runs the full talk-to-your-avatar stack (Rust CLI + embedded livekit-server + the agent brain (STT/LLM/TTS) + browser UI). One install, one command, one URL — same Rust binary as the Homebrew CLI.
- The runtime library API (`import bithuman`, `AsyncBithuman`, `from bithuman import Avatar`) is unchanged — existing library consumers keep working.
- The legacy 1.x Python CLI is preserved as the `essence-render` console-script.
- Wheels: macOS arm64, Linux x86_64, Linux aarch64. Python 3.10+.
- Quickstart: `pip install bithuman && bithuman run` — see the [quickstart](/api/quickstart) for the full flow.

### v1.18.5 (2026-05-18)

- Unified `bithuman`: one `pip install bithuman` = full prior `1.11.3` API + native engine, 100% backward-compatible (`==1.11.3` code runs unchanged).
- Native engine: far faster cold load + lower memory than pure-Python, exact output parity. Loads fresh console `.imx` TAR exports natively.
- Python 3.9–3.14 (Linux x86_64/ARM64, macOS Apple Silicon). Pin `>=1.18.5` (1.18.0–1.18.4 predate the unification; Windows / macOS-Intel stay on `==1.11.3`).

### v1.17.x (2026-05-14)

- `bithuman avatar --openai` — workstation Realtime, browser-rendered avatar.
- `voice` / `text` auto-pick cloud vs `--local`; explicit flags override.
- Interactive TUI for `voice` (mic/bot meters + transcript); `BITHUMAN_NO_TUI=1` opts out.
- Flutter plugin renamed `bithuman_avatar` → `bithuman` (one Dart codebase, mac/iOS).
- Canonical OpenAI Realtime path is now the Rust CLI's `--openai` mode.

### v1.16.0 (2026-05-14)

- Streaming API on Swift (`pushAudio`/`frames()`/`resetStream()`). Flat per-tick cost on long sessions.
- Default Realtime model: `gpt-realtime-mini`.

### v1.12.0 (2026-05-12)

- First unified release: Python, Swift, CLI from one source, identical output.
- Linux + Windows Python wheels (no WSL).

## April 2026

- **Chat Widget v5** — text/voice/video in one floating widget; themes, FAB styles, JS API (`open`/`close`/`setTheme`/`destroy`).
- **FAQ KB** — search always runs; removed dedup that dropped valid results.
- **Voice** — Siri-style animation; multilingual TTS (+11 languages including Thai, Chinese, and Arabic).
- **Streaming** — instant text to UI without waiting for audio sync.

## March 2026

- **Platform UI** — sidebar (Explore / Library / Billing / Developer); Explore replaces Community, Library replaces My Agents; credit balance in top nav.
- **Docs** — screenshots + navigation refreshed for the new UI.

## February 2026

- **Expression Avatar v2** — 24% faster pipeline; no concurrent-session artifacts.
- **Self-hosted GPU container** — up to 8 sessions/GPU; ~50 s cold / 4–6 s warm; ~5 GB weights auto-cached.
- **Examples overhaul** — fixed Compose `env_file`; standardized `.env.example`; added `AGENTS.md`, `llms.txt`, OpenAPI spec.
- **REST API** — `/v1/agent/{code}/speak`, `/v1/agent/{code}/add-context`; consistent error codes.
- **SDK** — `livekit-plugins-bithuman` Expression support; `bithuman.AvatarSession` unified cloud/CPU/GPU; animal mode for Essence.

## January 2026

- **Essence Avatar** — CPU-only `.imx` rendering, 25 FPS, Linux / macOS / Windows.
- **Platform API** — agent generation, CRUD, file upload, dynamics/gestures.
- **Integrations** — LiveKit cloud plugin, iframe embed (JWT), webhooks, Flutter example.

> **Note** Feature requests and bugs: [GitHub](https://github.com/bithuman-product/bithuman-sdk-public/issues) and [Discord](https://discord.gg/ES953n7bPA). See the full [community guide](/community).
