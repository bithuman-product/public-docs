---
title: "Changelog archive"
description: "Release notes from July 2026 and earlier, one short summary per release. The current changelog is /changelog."
section: resources
group: "Resources"
order: 3
type: changelog
label: "Changelog archive"
---

> **Note** This is the archive. Entries from August 2026 onwards are on the
> [changelog](/changelog). Every entry below keeps its original dated heading,
> so an older integration can still find the day its behaviour changed.

## July 2026

### Essence 2 — sharper mouth and teeth, and a much smaller model file (2026-07-27)

- Essence 2 renders through a new unified renderer: a sharper mouth interior
  and teeth, and wider, re-centred mouth motion.
- The downloadable model is much smaller — read `Content-Length` rather than
  hard-coding a size. No API, tier or pricing change.
- New creations get it automatically; existing agents move over when retrained.

### Expression 2 — faster creation, same quality bar (2026-07-22)

- Expression 2 creation runs an adaptive-ladder training recipe by default:
  essentially the same quality at a fraction of the training time and cost. No
  API, pricing or serving change.

### Run Expression 2 locally from the CLI (2026-07-16)

- The [bitHuman CLI](/sdk/cli) renders `expression-2` avatars on your own
  hardware (Apple Silicon macOS, Linux x86_64), with the render engine inside
  the CLI. `bithuman run` with no arguments renders the free Wise Pup avatar.

### Expression 2 — smaller, sharper serving model (2026-07-16)

- Expression 2 serves each identity through a more compact model with a sharper
  mouth and teeth, on gallery identities and new creations. No API, contract or
  pricing change; no action needed.

### Expression 2 — adaptive per-identity training (2026-07-15)

- Expression 2 creation adapts training per identity: every agent passes the
  same quality checks, and an identity that needs more work gets more training.
  No action needed. See [Expression 2](/concepts/expression-2#how-creation-works).

### Agent creation is image-only (2026-07-10)

- **Breaking:** the `video` creation input is removed for all models. Provide a
  portrait `image` (or a prompt); a request carrying `video` gets
  [`400 VIDEO_INPUT_NOT_SUPPORTED`](/api/errors#agent-operations) before
  anything is billed.
- `video_aspect_ratio` is removed and `duration` is ignored. Existing agents are
  unaffected, and file upload still accepts video as an asset.

### Essence 2 naming settled (2026-07-10)

- `essence-2` is the standard tier name — the former `essence-2-light` was
  consolidated into it on 2026-07-05 — and the premium tier is no longer offered
  publicly. See [Naming & migration](/concepts/models#naming--migration).
- Rates are unchanged. The model guide is at [/concepts/essence-2](/concepts/essence-2);
  the old `/concepts/essence-2-light` and `/concepts/essence-2-quality` URLs redirect.

### Expression 2 creation price: 2000 credits (2026-07-10)

- `expression-2` creation and model-add cost 2000 credits, up from 500. Essence 2
  stays at 500; v1 stays at 250.
- `auto` bills the routed model's rate;
  [`GET /v1/pricing`](/api/billing#get-the-pricing-schedule) advertises `auto`
  at the 2000 ceiling.

### Essence 2 & Expression 2 — launch rollout begins; model pages refreshed (2026-07-10)

- Creation access opens progressively: a v2 creation ahead of your account's
  access returns [`503 MODEL_NOT_YET_AVAILABLE`](/api/errors#model-errors) and
  bills nothing.
- The `essence-2` and `expression-2` model pages gained their shipping
  characteristics — resolution, serving tiers and browser-local status.

### Plan concurrency, offline licensing preview, and one pricing page (2026-07-10)

- Concurrent avatar sessions are a plan allowance; a session start beyond it
  returns `403 CONCURRENCY_LIMIT_REACHED`, and live sessions are never cut off.
  See [Session concurrency](/api/rate-limits#session-concurrency).
- Offline licensing was previewed; its terms have since changed — see
  [Pricing → Offline licensing](/guides/pricing#offline-licensing).
- [Pricing](/guides/pricing) is now the single home of every rate, and naming
  history lives under Models → Naming & migration.

### Multi-agent avatar rooms — audio binds to the launching agent (2026-07-09)

- In a room with several agents, the cloud avatar binds its audio to the agent
  that started the `AvatarSession` (via `lk.publish_on_behalf`), not the first
  agent it sees. Server-side; no upgrade needed. See
  [LiveKit → Multiple agents](/sdk/livekit#wire-it-into-an-agent-worker).

### `essence-2-light` consolidated into `essence-2`; force-tier slugs (2026-07-05)

- **The `essence-2-light` name is retired:** create and render with
  `model: "essence-2"`. The old name gets a `400` pointing at `essence-2`;
  existing agents and saved links keep working.
- New force-tier slugs (`essence-2-gpu` / `-ane` / `-cpu`, `expression-2-gpu` /
  `-cpu` / `-ane`) pin one serving tier and never overflow. See
  [tier pinning](/concepts/models#advanced-pin-a-serving-tier).

### Android / Kotlin SDK docs restored (2026-07-04)

- The [Android SDK](/sdk/android) page and the Kotlin hello-avatar example are
  back. `ai.bithuman:sdk:2.3.6` (essence-1, arm64-v8a) was unchanged; only its
  documentation had been removed.

### Pick-for-me creation, model adds & downloads (2026-07-02)

*Named as of today: the tiers then called **Essence 2 Light** and **Essence 2 Quality**
are now `essence-2` and an internal model — see
[Naming & migration](/concepts/models#naming--migration).*

- `model: "auto"` on [`POST /v1/agent/generate`](/api/agents#auto--let-the-platform-pick-the-model)
  routes a photorealistic person to `essence-2` and a cartoon, animal or
  creature to `expression-2`. An explicit Essence 2 creation of anything but a
  photorealistic human gets `422 MODEL_SUBJECT_MISMATCH` before billing.
- New: `POST /v1/agent/{code}/models` adds a model to an existing agent, and
  `GET /v1/agent/{code}/model/download` downloads one —
  `bithuman pull <AGENT_CODE>` uses it.

### Official model guides + natural idle for the second generation (2026-07-02)

- Each second-generation model has its own guide —
  [Expression 2](/concepts/expression-2) and [Essence 2](/concepts/essence-2) —
  plus a [session troubleshooting](/guides/session-troubleshooting) guide.
- Expression 2 idles on a looping clip of the identity itself, and idle loops
  always play forward.
- Agent responses carry `supported_models`; asking for a model the agent has not
  generated yet returns `409 MODEL_NOT_GENERATED` before any charge.

### Announced — Essence 2 & Expression 2 (launching July 10, 2026)

- `essence-2` and `expression-2` are announced for July 10, 2026 on every
  surface; `essence-1` and `expression-1` stay fully supported. See
  [Essence 2 & Expression 2](/concepts/models).

## June 2026

### Talking video generation — new API (2026-06-29)

- New [`POST /v1/video/generate` and `GET /v1/video/{job_id}`](/api/video)
  render a talking-video mp4 of your agent from text or audio, asynchronously.
  Launch engines are `expression-2` and `essence-2-quality`, billed per minute
  of output rounded up; a failed render is refunded.

### Agent generation — v2 model names accepted (2026-06-29)

`POST /v1/agent/generate` accepts `essence-2-quality`, `expression-2` and
`essence-2-light` as `model` values, ahead of the v2 launch.

*Update 2026-06-30:* the pre-release aliases (`elevate`, `embody`, `embody-gpu`,
`essence-2-mobile`) were retired and return a `400 VALIDATION_ERROR`.

### Model naming — versioned public taxonomy (2026-06-26)

Model families get versioned public names — `essence-1`, `essence-2-quality`,
`essence-2-light`, `expression-1`, `expression-2` — on agent generation and the
viewer. `essence` and `expression` map to `essence-1` / `expression-1`.

The pre-release codenames were transitional aliases and have since been retired
(see the 2026-06-29 entry). Share links are unaffected.

### Python SDK `bithuman` 2.3.10 (2026-06-23) — self-hosted streaming lag fix

- Self-hosted streaming holds a steady frame rate across a long turn, and the
  audio stream resets at each turn so idle frames cannot shift lip-sync.

### Python SDK `bithuman` 2.3.9 (2026-06-23) — barge-in / interrupt fix

- Interrupting the avatar no longer freezes the runtime after the first
  barge-in; a user can talk over it repeatedly.
- Recommended LiveKit stack: `bithuman` 2.3.9+ with `livekit-plugins-bithuman`
  1.6.3 and `livekit-agents` 1.6.x.

### Python SDK `bithuman` 2.3.8 (2026-06-16)

- Maintenance release on the 2.3 line (2.3.5–2.3.7 were not published).

### Python SDK `bithuman` 2.3.4 (2026-06-12) — Linux CA auto-discovery

- On Linux the SDK finds your distro's CA bundle itself, so self-hosted auth
  needs no symlink workaround. `CURL_CA_BUNDLE` / `SSL_CERT_FILE` still win when
  set — unset them unless they point at a valid bundle.
- The macOS wheels require macOS 26+ (arm64).

## May 2026

### 2.3.0 (2026-05-28) — layered architecture + PyPI wheel split

- `pip install bithuman` is now the Python library only; install the CLI with
  Homebrew or the universal installer ([the CLI page](/sdk/cli)). The Python and
  Swift APIs are unchanged.
- The CLI keeps `run`, `render`, `info`, `pull`, `list`, `doctor` and `init`;
  legacy 1.x verbs stay removed.
- `BITHUMAN_BRAIN_*` env vars are renamed `BITHUMAN_AGENT_*` (the old names
  still work, with a warning). `bithuman.utils` and `bithuman.audio` are removed.
  Engine ABI v7 adds `be_runtime_tick_compose_from_mel`; older builds keep working.

### Python SDK `bithuman` 2.2.2 (2026-05-25) — Linux CLI tarballs restored

- A CI-only release: the Linux CLI tarballs are back on the GitHub Release. No
  API or runtime change.

### Python SDK `bithuman` 2.2.1 (2026-05-25) — the on-device brain

- 2.2.0 was skipped; install 2.2.1.
- `BITHUMAN_LOCAL=1` gave `bithuman run` a fully on-device conversation brain
  (whisper.cpp, llama.cpp, Supertonic TTS, Silero VAD) — no OpenAI key, no network.
  The wheel that carried it is gone; see [local mode](/sdk/cli/local-mode).
- New plugins: `livekit.plugins.bithuman.{WhisperSTT, LlamaCppLLM, SupertonicTTS}`.

### Python SDK `bithuman` 2.1.0 (2026-05-24) — figure → avatar

- `--figures-root` is renamed `--avatars-root` (the old flag stays as a
  deprecated alias), and the default cache moves to `~/.cache/bithuman/avatars`.
  No runtime change.

### Python SDK `bithuman` 2.0.2 (2026-05-24) — graceful drain

- `bithuman run` waits for the engine to tear down before exiting, fixing a
  crash (exit 134) on Ctrl-C or a supervisor stop.

### Python SDK `bithuman` 2.0.1 (2026-05-24)

- `AsyncBithuman.cleanup` is `async` — `await b.cleanup()` works.
- CLI error messages and `essence-render --help` no longer name renamed
  commands.

### Python SDK `bithuman` 2.0.0 (2026-05-22) — bundled-CLI release

- `pip install bithuman` ships a `bithuman` command that runs the full
  talk-to-your-avatar stack. The library API is unchanged; the 1.x Python CLI
  lives on as `essence-render`.
- Wheels: macOS arm64, Linux x86_64 and aarch64; Python 3.10+.

### v1.18.5 (2026-05-18)

- One `pip install bithuman` carries the full `1.11.3` API plus the native
  engine, backward-compatible. Python 3.9–3.14; pin `>=1.18.5` (Windows and
  Intel Mac stay on `==1.11.3`).

### v1.17.x (2026-05-14)

- `bithuman avatar --openai` renders an avatar in the browser on OpenAI
  Realtime; `voice` / `text` auto-pick cloud or `--local`.
- An interactive TUI for `voice` (`BITHUMAN_NO_TUI=1` opts out).
- The Flutter plugin is renamed `bithuman_avatar` → `bithuman`.

### v1.16.0 (2026-05-14)

- Streaming API on Swift (`pushAudio`/`frames()`/`resetStream()`).
- Default Realtime model: `gpt-realtime-mini`.

### v1.12.0 (2026-05-12)

- First unified release: Python, Swift and CLI from one source, identical output.
- Linux and Windows Python wheels (no WSL).

## April 2026

- **Chat Widget v5** — text, voice and video in one floating widget, with a JS
  API (`open`/`close`/`setTheme`/`destroy`).
- **Voice** — multilingual TTS (+11 languages, including Thai, Chinese and
  Arabic).
- **FAQ KB** and **streaming** fixes — search always runs; text reaches the UI
  without waiting for audio.

## March 2026

- **Platform UI** — a new sidebar (Explore / Library / Billing / Developer);
  credit balance in the top nav. Docs screenshots refreshed.

## February 2026

- **Expression Avatar v2** — a faster pipeline, with no concurrent-session
  artifacts.
- **Self-hosted GPU container** — several sessions per GPU, with weights cached
  automatically.
- **REST API** — `/v1/agent/{code}/speak` and `/v1/agent/{code}/add-context`;
  consistent error codes.
- **SDK** — Expression support in `livekit-plugins-bithuman`; one
  `bithuman.AvatarSession` for cloud, CPU and GPU; animal mode for Essence.

## January 2026

- **Essence Avatar** — CPU-only `.imx` rendering on Linux, macOS and Windows.
- **Platform API** — agent generation, CRUD, file upload, dynamics/gestures.
- **Integrations** — LiveKit cloud plugin, iframe embed (JWT), webhooks, a
  Flutter example.
