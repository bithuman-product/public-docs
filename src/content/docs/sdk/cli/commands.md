---
title: "Commands"
description: "Full reference for the bithuman subcommands — run, render, info, pull, list, doctor, init, the auth commands (login/logout), and mcp — with flags and examples."
section: sdk
group: "Command line"
order: 32
---

## Subcommand overview

Every subcommand accepts `--help` for the full flag listing.

| Command | What it does |
| --- | --- |
| `bithuman login` | Sign in via the browser; mint + store a per-device key |
| `bithuman logout` | Revoke this device's key and clear the local store |
| `bithuman auth status` | Show the signed-in account and credential source |
| `bithuman init` | Credential wizard: save `BITHUMAN_API_SECRET`, pick a brain, pull a showcase avatar (e.g. `modern-court-jester`) |
| `bithuman run <path.imx>` | Live browser-served avatar (cloud or on-device brain) — [recognizes the model family](#which-model-files-run-locally) first |
| `bithuman render <path.imx>` | Offline render: model + WAV → MP4 (Linux-only) |
| `bithuman info <model-file>` | Print model metadata — engine + family for any recognized bitHuman artifact |
| `bithuman pull <slug \| AGENT_CODE>` | Download a showcase avatar, or your own agent's generated model by code |
| `bithuman list` | Browse the showcase avatar catalog |
| `bithuman doctor` | Host + auth + cache sanity check |
| `bithuman mcp` | Run the built-in MCP server for AI agents (stdio); `bithuman mcp tools` lists the tools. See [driving from an AI agent](/sdk/cli/agents). |
| `bithuman --version` | Print `libessence` + ABI + CLI versions |

## Signing in

`bithuman login` is the first step after installing. It signs you in to your
bitHuman account through the browser and stores the credential locally, so
`run`, `pull`, `doctor`, and the rest authenticate without any `export`.

```bash
bithuman login
# → opens your browser; approve the request, then return to the terminal
# ✓ Logged in as you@example.com
```

What happens: the CLI opens your browser to sign in, you approve the request,
and bitHuman mints a **per-device API key** scoped to your account — aliased
`cli@<hostname>` so you can recognize it later. The key is saved to your OS
keychain (macOS Keychain / Linux Secret Service) so it survives across
sessions and never sits in a plaintext env file. If no keychain is available,
the CLI falls back to `~/.bithuman/config` (a dotenv file, mode `0600`).

**SSH / headless (no browser):**

```bash
bithuman login --device
# → prints a short code and a URL; open the URL on any device, enter the code
```

`--device` switches to a code-entry flow: the CLI prints a short user code and
a verification URL. Open that URL in a browser anywhere (your laptop, your
phone), sign in, enter the code, and the CLI completes the login. Use this
whenever the browser can't reach the machine running the CLI — the default
loopback flow needs a browser on the same host.

**Check who you are:**

```bash
bithuman auth status
# Signed in as you@example.com
# Key:    cli@my-macbook
# Source: OS keychain
```

`auth status` reports the signed-in account, the per-device key alias, and
where the credential is being read from (env var, keychain, or
`~/.bithuman/config`).

**Sign out:**

```bash
bithuman logout
```

`logout` revokes this device's key on the server and clears the local store.
The key is gone immediately — any other machine's key (and your dashboard
keys) are untouched.

> **Tip** — Each device gets its own key, so you can revoke one laptop without
> disrupting another. You can also revoke any device's key from
> [Developer → API Keys](https://www.bithuman.ai/#developer) on the dashboard.

### Credential resolution order

Every command looks for the credential in this order — first match wins:

1. **`BITHUMAN_API_SECRET`** in the environment (explicit; CI / automation)
2. **OS keychain** (what `bithuman login` writes)
3. **`~/.bithuman/config`** (the dotenv fallback, also written by
   `bithuman init`)

So a key you `export` always overrides a logged-in one — handy for testing a
specific secret without logging out. See
[Configuration](/sdk/cli/configuration) for the manual path in full.

## `bithuman init` — credential wizard

`bithuman init` is an interactive setup wizard, not a project scaffolder.
It walks you through first-time credentials and a starter avatar:

```bash
bithuman init
```

It prompts for your `BITHUMAN_API_SECRET` and writes it to
`~/.bithuman/config` (a dotenv file, mode `0600`), lets you pick a
conversation brain, and pulls a showcase avatar (e.g. `modern-court-jester`)
so you have something to run immediately. `~/.bithuman/config` is loaded at every CLI
startup, so the secret persists across sessions without re-exporting it.
See [Configuration](/sdk/cli/configuration) for the full set of variables it
manages.

## `bithuman run` — live avatar

The headline command. From one invocation it stands up an embedded
`livekit-server`, a `libessence` runtime, the conversation brain (cloud
OpenAI Realtime or the [on-device](/sdk/cli/local-mode) stack per
`BITHUMAN_LOCAL`), and a browser landing page.

```bash
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
# → open the printed http://127.0.0.1:8088/<CODE> URL, grant mic, talk
```

> **Precondition — the conversation brain needs the Python agent bundle.**
> The native brew binary serves the avatar on its own, but the
> conversational brain runs as a Python agent that the binary launches.
> Install it before `bithuman run` can talk back:
>
> - **Cloud brain (OpenAI Realtime):** `pip install bithuman-cli`
> - **On-device brain:** `pip install 'bithuman-cli[local]'` (then
>   `BITHUMAN_LOCAL=1`)
>
> Without one of these the avatar renders but has no brain. See
> [Configuration](/sdk/cli/configuration) and [Local mode](/sdk/cli/local-mode).

Common flags:

| Flag | Default | What |
| --- | --- | --- |
| `--host` | `127.0.0.1` | Bind address. Pass a Tailnet / LAN IP to expose. `0.0.0.0` needs `--allow-public-bind`. |
| `--port` | `8088` | Launcher HTTP port. |
| `--max-sessions` | (CPU count) | Pool cap; new launches are rejected (not degraded) when full. |
| `--embedded-livekit` | on with model arg | Spawn a self-contained `livekit-server` child. Off when omitting the model and using an external SFU. |
| `--mock-runtime` | off | Run with black frames instead of `libessence` — for protocol tests. |

### Which model files run locally?

`bithuman run` **recognizes the model family before launching** — it sniffs
the file (the IMX container's engine header, or the artifact's format), so
every bitHuman model file gets a correct, honest answer instead of a deep
engine error:

| Family | File | What `run` does |
|---|---|---|
| `essence-1` | `<code>.imx` (also legacy exports) | **Runs locally** — launches exactly as always. |
| `essence-2-light` | `<code>.lebundle.imx` | The standard [Essence 2](/concepts/essence-2) artifact (the family keeps its internal name). Recognized; exits with `UNSUPPORTED_MODEL_FAMILY` (code 69) and points you to the cloud surfaces. The bundle contains **licensed weights** — local playback is pending the runtime license wiring, so keep the file. |
| `essence-2-quality` | `<code>.pkl` | The [Essence 2 Max](/concepts/essence-2-max) artifact (the family keeps its pre-rename internal name). Recognized; same honest handoff — this family renders on bitHuman's GPU cloud and is not a local-playback artifact. |
| `expression-2` | `<code>.avatar` (CoreML zip) | Recognized; the CLI can't play it yet and the desktop app doesn't open `.avatar` files from disk today — keep the file for upcoming desktop support; the model runs live on bitHuman cloud (dashboard, embeds, API sessions). |
| `expression-1` | — | No downloadable artifact exists (it renders server-side from the agent's image), and the model is not supported on Mac locally — it's a heavy GPU engine. Serve it through the cloud surfaces. |

Recognition never breaks what already worked: a file the sniffer can't
positively identify goes to the engine exactly as before (the engine stays
the final arbiter), and only a **positive non-`essence-1` match** diverts.
Get the files themselves with [`bithuman pull <AGENT_CODE>`](#bithuman-pull--list--your-models-and-showcase-avatars)
or the [download endpoint](/api/agents#download-an-agents-model).

## `bithuman render` — offline MP4

For batch jobs or pipelines with TTS upstream — no browser, no brain,
just lipsync a WAV you already have:

```bash
bithuman render avatar.imx --audio speech.wav --output demo.mp4
```

Flags:

| Flag | Default | What |
| --- | --- | --- |
| `-a`, `--audio <PATH>` | (required) | 16 kHz mono PCM WAV input. |
| `-o`, `--output <PATH>` | `output.mp4` | Output MP4 path. |
| `--quality <PRESET>` | `MEDIUM` | Encoder preset: `LOW`, `MEDIUM`, `HIGH`. |
| `--target-size <SIZE>` | `1280` | A single number `N` (longest side binds to `N`, aspect preserved) or `WxH` (explicit canvas). |
| `--limit <N>` | none | Intended to cap output frame count for testing, but **currently a no-op** — it is accepted and ignored; the full input is always rendered. |

> **Warning** `bithuman render` is currently **Linux-only**. On macOS the
> command prints a `not implemented: be_video_encoder_*` error and exits.
> Workarounds:
>
> 1. **Run inside a Linux Docker container** — install the CLI with the
>    universal installer (`curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh`; the PyPI wheel is macOS-only, so don't `pip install bithuman-cli` on Linux) and render there, mounting your `.imx` and WAV in and the MP4 out.
> 2. **Use `bithuman run` instead** — the live-avatar path does not need the
>    offline encoder; it publishes frames into LiveKit via the webrtc-rs
>    encoder, and you can record from the browser if you need a file.
> 3. **Render on a Linux host** — a small Linux box or CI runner with the
>    CLI installed via the universal installer renders any `.imx` + WAV
>    pair to MP4 identically. (On Linux, install with the universal
>    installer, not `pip install bithuman-cli` — the PyPI wheel is
>    macOS-only.)
>
> An AVFoundation-based native macOS encoder is on the roadmap.

## `bithuman info` — inspect a model

Print model metadata. For an `.imx` that's the model type, fixture name,
frame size, sample rate, duration, and hash — plus the **engine and family**
resolved from the unified IMX container header (also in `--json` as
`engine` / `family`). Handy for verifying a model file before deploy:

```bash
bithuman info avatar.imx
```

`info` recognizes the non-`.imx` artifacts too: an `expression-2` `.avatar`
(CoreML zip), an `essence-2-quality` (Essence 2 Max) pickle, and legacy `essence-1` tar
exports get a format/family report instead of a "not an IMX file" error; a
legacy BIMX v1 container gets a precise unsupported-version message.

## `bithuman pull` + `list` — your models and showcase avatars

Browse the showcase manifest and download one:

```bash
bithuman list
bithuman pull modern-court-jester
bithuman run ~/.cache/bithuman/showcase/modern-court-jester.imx
```

Pulled showcase avatars land in `~/.cache/bithuman/showcase/`. See
[Configuration](/sdk/cli/configuration) for the full cache layout.

### Pull your own agent's model by code

Pass an **agent code** (`A` + 9 characters, e.g. `A17ZTB0222`) instead of a
showcase slug and `pull` downloads **your agent's generated model** through
the authenticated
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
endpoint, then sniffs the file and prints its family and the next step:

```bash
bithuman login                      # once — pull-by-code needs your account
bithuman pull A17ZTB0222
# → ~/.cache/bithuman/agents/A17ZTB0222/A17ZTB0222.avatar
#   expression-2 (CoreML .avatar) — runs live on bitHuman cloud; not locally playable yet
```

When the agent's model is `essence-1`, the pulled `.imx` is immediately
runnable:

```bash
bithuman pull A56ZFX6217
bithuman run ~/.cache/bithuman/agents/A56ZFX6217/A56ZFX6217.imx
```

Files land in `~/.cache/bithuman/agents/<code>/`. What each family's file is
— and which ones run locally — is in the
[launch matrix](#which-model-files-run-locally). Failure modes: not signed
in → exit 77 (`bithuman login` first); the server refusing the download →
exit 66 carrying the API's error, including the poll-able
[`MODEL_ARTIFACT_NOT_READY`](/api/errors#model-errors) when a supported
artifact simply hasn't been published yet. Showcase-slug pulls are
unchanged.

## `bithuman doctor` — install sanity check

When something does not work, run this first. It checks versions, host
RAM, avatar auth, brain selection and availability, and cache sizes, and
exits `0` only if both avatar auth and a brain path are configured:

```bash
bithuman doctor && bithuman run avatar.imx
```

See [Install](/sdk/cli/install) for the full breakdown of what `doctor`
reports.
