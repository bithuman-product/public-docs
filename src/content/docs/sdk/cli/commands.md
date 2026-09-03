---
title: "Commands"
description: "Full reference for the bithuman subcommands — run, render, info, pull, list, engine, doctor, init, the auth commands (login/logout), and mcp — with flags and examples."
section: sdk
group: "Command line"
order: 32
---

## Subcommand overview

Every subcommand accepts `--help` for the full flag listing. Everything on this
page that can be run on Linux x86_64 has been, with its real exit code, on
[Verified transcript](/sdk/cli/verified).

| Command | What it does |
| --- | --- |
| `bithuman login` | Sign in via the browser; mint + store a per-device key |
| `bithuman logout` | Revoke this device's key and clear the local store |
| `bithuman auth status` | Show the signed-in account and credential source |
| `bithuman init` | Credential wizard: save `BITHUMAN_API_SECRET`, pick a brain, pull a showcase avatar (e.g. `modern-court-jester`) |
| `bithuman run [avatar]` | Live avatar. No argument fetches + renders the free Wise Pup avatar out of the box; pass an avatar file to run your own — [recognizes the model family](#which-model-files-run-locally) first |
| `bithuman render <path.imx>` | Offline render: model + WAV → MP4 (Linux-only) |
| `bithuman info <model-file>` | Print model metadata — engine + family for any recognized bitHuman artifact |
| `bithuman pull <slug \| AGENT_CODE>` | Download a showcase avatar, or your own agent's generated model by code |
| `bithuman list` | Browse the showcase avatar catalog |
| `bithuman engine list \| install \| update` | Inspect, install, or update the per-platform local render engine ([shipped in the CLI, auto-managed](#bithuman-engine--local-render-engine)) |
| `bithuman doctor` | Host + auth + cache sanity check |
| `bithuman mcp` | Run the built-in MCP server for AI agents (stdio); `bithuman mcp tools` lists the tools. See [driving from an AI agent](/sdk/cli/agents). |
| `bithuman --version` | Print `libessence` + ABI + CLI versions |
| `bithuman version --json` | The same, machine-readable: `{"abi":7,"cli":"2.5.1","libessence":"2.3.8","schema_version":1}` |
| `bithuman avatars` | Alias of `list` |
| `bithuman whoami` | Alias of `auth status` |
| `bithuman account` | Plan, credit balance and account status (alias: `credits`) |
| `bithuman usage` | Recent credit usage / metering history; honors `--json` |
| `bithuman completion <shell>` | Shell completions for bash, zsh, fish, elvish, powershell |

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
> [Developer → API Keys](https://www.bithuman.ai/developer/api-keys) on the dashboard.

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

The headline command. With **no argument** it is the zero-config quickstart:
the CLI fetches the free **Wise Pup** avatar (a showcase `expression-2`
identity) and renders it live on your own hardware — no sign-in, no API key, no
file to point at.

```bash
bithuman run
# → the Wise Pup avatar downloads once, then renders in real time
```

Local rendering runs on macOS (Apple Silicon, CoreML) and Linux x86_64
(LiteRT); see [Local rendering by platform](/sdk/cli/overview#local-rendering-by-platform).

Pass an avatar file (or agent code) to run your own. From one invocation the
CLI stands up an embedded `livekit-server`, a `libessence` runtime, the
conversation brain (cloud OpenAI Realtime or the
[on-device](/sdk/cli/local-mode) stack per `BITHUMAN_LOCAL`), and a browser
landing page:

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
| `expression-2` | `<code>.avatar` — what `pull` and the download endpoint actually hand you. The extension is a frozen alias of `.imx`, not a distinct encoding: 96 of the 110 published objects are `IMX\0` v2 containers, 14 are still the pre-2026-07-12 CoreML zip (2026-09-01). A raw `<code>.imx` container also exists upstream. | **Runs locally** on macOS (Apple Silicon) — either form. On **Linux x86_64** the `.avatar` runs once the CPU render host is staged (`bithuman engine install linux`); a raw `.imx` on Linux is handed off to the cloud instead. Windows coming. The free Wise Pup avatar renders out of the box. Also serves live on bitHuman cloud. See [Local rendering by platform](/sdk/cli/overview#local-rendering-by-platform). |
| `essence-2` | `<code>.lebundle.imx` | The standard [Essence 2](/concepts/essence-2) artifact. Recognized; exits with `UNSUPPORTED_MODEL_FAMILY` (code 69) and points you to the cloud surfaces. The bundle contains **licensed weights** — local playback is pending the runtime license wiring, so keep the file. |
| `essence-2-max` | `<code>.pkl` | The [Essence 2 Max](/concepts/essence-2-max) artifact (`essence-2-quality` is its pre-rename internal alias). Recognized; same honest handoff — this family renders on bitHuman's GPU cloud and is not a local-playback artifact. |
| `expression-1` | usually none; `<code>.imx` for an agent that went through the lip step | Expression 1 has no per-identity artifact of its own — the shared v1 engine renders server-side from the agent's image, and the model is not supported on Mac locally (it's a heavy GPU engine). **One exception:** an `expression-1` agent that went through the lip step owns a baked `<code>.imx` in its model record, and the download endpoint serves that file exactly like `essence-1`, so it runs locally. Everything else in this family is cloud-served. |

Recognition never breaks what already worked: a file the sniffer can't
positively identify goes to the engine exactly as before (the engine stays
the final arbiter), and only a **positive cloud-only match** (Essence 2 or
Expression 1) diverts to the cloud surfaces.
Get the files themselves with [`bithuman pull <AGENT_CODE>`](#bithuman-pull--list--your-models-and-showcase-avatars)
or the [download endpoint](/api/agents#download-an-agents-model).

## `bithuman render` — offline MP4

For batch jobs or pipelines with TTS upstream — no browser, no brain,
just lipsync a WAV you already have:

```bash
bithuman render avatar.imx --audio speech.wav --output demo.mp4
```

> **Only Expression 2 completes on CLI 2.5.1.** Re-tested 2026-09-02 on Linux
> x86_64 with one 16 kHz mono WAV driving all three families through the same
> binary. Full transcript on
> [Verified transcript](/sdk/cli/verified#bithuman-render-one-family-at-a-time).
>
> | Family | File | Result | rc |
> | --- | --- | --- | --- |
> | Expression 2 | `<code>.avatar` | Writes a real MP4 (h264+aac; 60 frames at 20 fps from 3 s of audio) | `0` |
> | Essence 2 | `<code>.lebundle.imx` | No local native runtime on this host | `69` |
> | Essence 1 | `<code>.imx` | The engine runs; the mux fails and no file is written | `70` |
>
> Same audio, same binary, different engines — so the failures below are the
> runtime, not your input.

### Essence 2 — `rc=69`, and a file copy does not fix it

```text
error: could not load lible_core.so (the native essence-2 runtime that owns the TESSERA teeth borrow).
  hint: … Stage it as `lible_core.so` next to the bithuman binary / in ~/.bithuman/lib, or set BITHUMAN_LIBLE_CORE.
```

The message reads like a missing file, and the hint invites you to go find one.
**Staging one does not work.** With `BITHUMAN_LIBLE_CORE` pointing at a real
library, the loader gets further and then fails on the ABI:

```text
/home/you/.local/bin/lib/libonnxruntime.so.1: version `VERS_1.26.0' not found (required by …/lible_core.so)
rc=69
```

The 2.5.1 tarball ships `libonnxruntime.so.1` at **`VERS_1.20.1`**; every
`lible_core.so` is linked against **`VERS_1.26.0`**. That is an ABI gap inside
the shipped binary, not a packaging oversight you can route around by moving
files, so **Essence 2 has no offline `render` on any platform in 2.5.1**.
Render it through the [Video API](/api/video), or run it live with
`bithuman run <YOUR_AGENT_CODE>` — which opens a cloud session.

(`lible_core` is the native library's frozen filename — a legacy name kept for
compatibility, quoted verbatim by the loader, so it is spelled here exactly as
you will see it.)

### Essence 1 — `rc=70`, still

```text
  encoding via libessence (h264+aac → mp4)…
error: record_mp4 failed: file corrupt: audio_decode: avformat_open_input failed
rc=70
```

First reported against `cli-v2.4.0`, still present in **2.5.1**. It fails at the
muxing step and writes **no output file**. Three controls rule out the input:
the identical WAV renders through Expression 2 with `rc=0`; the `speech.wav`
that ships in this project's own `Examples/python/local-essence/` fails the same
way; and a second showcase model fails the same way. Use the
[Video API](/api/video) (`POST /v1/video/generate`) for Essence 1 MP4s today.

### No credential — `rc=77`, before any model is opened

```text
  bithuman render: auth required (BE_ERR_NO_AUTH): set BITHUMAN_API_SECRET (or BITHUMAN_API_KEY)
rc=77
```

`render` needs a signed-in account or `BITHUMAN_API_SECRET` in the environment.
This gate is checked first, so it fires for every family and says nothing about
whether that family would have rendered. It is also distinct from the
`[selfhost-meter] … enforce=OFF (fail-open)` lines a successful Expression 2
render prints: those are usage reporting that does not block a render, and they
appear only *after* this gate has passed.

Flags:

| Flag | Default | What |
| --- | --- | --- |
| `-a`, `--audio <PATH>` | (required) | Input audio. Any format `ffmpeg` reads for the second-generation engines; Essence 1 wants a 16 kHz mono PCM WAV. |
| `-o`, `--output <PATH>` | `output.mp4` | Output MP4 path. |
| `--quality <PRESET>` | `MEDIUM` | Encoder preset: `LOW`, `MEDIUM`, `HIGH`. |
| `--target-size <SIZE>` | `1280` | A single number `N` (longest side binds to `N`, aspect preserved) or `WxH` (explicit canvas). |
| `--limit <N>` | none | Cap the render at N frames — the audio is trimmed to `N/fps`. Measured on 2.5.1: `--limit 10` on an Expression 2 avatar produced a 10-frame MP4 (`ffprobe` `nb_frames=10`). |

> **`render` is Linux-only.** On macOS the command prints a
> `not implemented: be_video_encoder_*` error and exits. **UNVERIFIED here** —
> that macOS behaviour is carried from the earlier report and was not re-tested
> on 2.5.1; this estate has no Mac in the loop that runs these checks. What
> *was* re-tested is the Linux side, above. Workarounds:
>
> 1. **Run inside a Linux x86_64 container** — install with the universal
>    installer (`curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh`;
>    the PyPI wheel is macOS-only, so don't `pip install bithuman-cli` on Linux),
>    mount your avatar and audio in and the MP4 out. **Expression 2 only** — see
>    the family table above.
> 2. **Use the [Video API](/api/video)** — `POST /v1/video/generate` renders
>    server-side and returns a URL, and it is the only path that covers
>    Essence 1 and Essence 2 today.
> 3. **Use `bithuman run` instead** — the live-avatar path does not need the
>    offline encoder; it publishes frames into LiveKit via the webrtc-rs
>    encoder, and you can record from the browser if you need a file.
>
> An AVFoundation-based native macOS encoder is on the roadmap.

## `bithuman info` — inspect a model

Print model metadata. For an `.imx` that's the model type, fixture name,
frame size, sample rate, duration, and hash — plus the **engine and family**
resolved from the unified IMX container header (also in `--json` as
`engine` / `family`). The `engine` values are **legacy names kept for
compatibility** — an Essence 2 bundle reports `essence2-light`, an Essence 2 Max
bundle `essence2-quality` — and are never valid `model` values; see [the
`engine` value is a legacy
name](/concepts/avatars-imx#the-engine-value-is-a-legacy-name). Handy for
verifying a model file before deploy:

```bash
bithuman info avatar.imx
```

As of CLI **2.4.1**, `info` also prints the **full container table of
contents** — every member in the `.imx` with its byte size (`members` in
`--json`) — so you can see at a glance what an artifact carries (tested
against CLI 2.4.2 on a showcase model):

```text
  Members (9):
    manifest.json  (1030 bytes)
    audio/feature_centers.npz  (624727 bytes)
    audio_encoder.onnx  (2840632 bytes)
    …
```

(`inspect` is an alias — `bithuman inspect avatar.imx` prints the same
report.)

`info` recognizes the non-`.imx` artifacts too: an old **zip-form**
`expression-2` `.avatar`, an `essence-2-max` (Essence 2 Max) pickle, and legacy
`essence-1` tar exports get a format/family report instead of a "not an IMX
file" error; a legacy BIMX v1 container gets a precise unsupported-version
message. (Most `.avatar` files you download today are **not** one of those —
they are `IMX\0` v2 containers, and `info` reports them as `expression-2`,
table of contents and all. A minority of older identities still carry the zip
form; `info` reads either, which is the point of running it.)

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
#   expression-2 — runs locally on macOS (Apple Silicon) / Linux x86_64, or live on bitHuman cloud
```

When the agent's model is `essence-1`, the pulled `.imx` is immediately
runnable:

```bash
bithuman pull A66GYD8664
bithuman run ~/.cache/bithuman/agents/A66GYD8664/A66GYD8664.imx
```

Files land in `~/.cache/bithuman/agents/<code>/`. What each family's file is
— and which ones run locally — is in the
[launch matrix](#which-model-files-run-locally). Failure modes: not signed
in → exit 77 (`bithuman login` first); the server refusing the download →
exit 66 carrying the API's error, including the poll-able
[`MODEL_ARTIFACT_NOT_READY`](/api/errors#model-errors) when a supported
artifact simply hasn't been published yet. Showcase-slug pulls are
unchanged.

### One agent can have more than one downloadable model

> **Read this if you added a model to an existing agent.** An agent is not
> limited to the model it was created with. [Adding a
> model](/api/agents#add-a-model-to-an-existing-agent) — `POST /v1/agent/{code}/models`
> — gives the *same* agent code a second (or third) trained family, each with
> its own downloadable artifact. `bithuman pull <CODE>` downloads **one** of
> them: the family the server picks by default, which today is the model the
> agent was **created** with. It is not an error and there is no warning — you
> simply get the older artifact.
>
> **`pull --model` ships on both platforms as of CLI 2.5.1.** It was introduced
> in 2.5.0; 2.5.1 is the first release to carry it in the Linux x86_64 tarball
> as well, and it was exercised there on 2026-09-02:
>
> ```bash
> bithuman pull A31BSK9325 --model essence-2   # ask for a family
> ```
>
> ```text
> recognized: IMX v2 container — essence-2: cloud-served; no local CLI runtime yet
> /home/you/.cache/bithuman/agents/A31BSK9325/A31BSK9325.lebundle.imx
> rc=0
> ```
>
> Accepted values are the API's, not the CLI's: `essence-1`, `essence-2`,
> `essence-2-max`, `expression-2`. Asking for a family the agent does not have
> comes back as a server error naming what went wrong rather than a wrong file —
> here, an Expression 2 agent asked for `essence-2-max`:
>
> ```text
> error: MODEL_ARTIFACT_NOT_READY: agent A55NVK9945's essence-2-max artifact isn't available for
> download yet: the essence-2-max bundle derives on demand from the agent's source video the first
> time the agent is launched as essence-2-max — start one session, then retry
> rc=66
> ```
>
> Without a credential the same command exits **77** before any download starts:
>
> ```text
> error: downloading your agent A31BSK9325's model needs your account
>   hint: run `bithuman login` (or export BITHUMAN_API_SECRET)
> rc=77
> ```
>
> **A bare `pull` still gives you the BIRTH model** — an agent created as
> Essence 1 and later given Expression 2 hands back the Essence 1 artifact. Ask
> `--json` what else it has rather than guessing:
>
> ```bash
> bithuman pull A31BSK9325 --json
> ```
>
> ```text
> {"cached":true,"code":"A31BSK9325","family":"essence-2","model":"essence-2","model_source":"birth",
>  "other_models":["essence-2-max"],"path":"/home/you/.cache/bithuman/agents/A31BSK9325/A31BSK9325.lebundle.imx",
>  "runnable_locally":false,"schema_version":1}
> rc=0
> ```
>
> On a CLI **before 2.5.0**, or any build without the flag, fetch a specific
> family by calling the endpoint directly with `?model=<family>`:
>
> ```bash
> # The default response is a 302 to the artifact; -L follows it and -OJ keeps
> # the server's filename. Nothing here is a secret — export yours first.
> curl -LOJ -H "api-secret: $BITHUMAN_API_SECRET" \
>   "https://api.bithuman.ai/v1/agent/A17ZTB0222/model/download?model=expression-2"
> # → A17ZTB0222.avatar
> ```
>
> The signed URL lives for one hour (`expires_in`), so fetch it, don't store it.
>
> Ask the API which families an agent actually has before you guess —
> `supported_models` on [`GET /v1/agent/{code}`](/api/agents) lists them, and
> asking for one the agent doesn't have returns `409 MODEL_NOT_GENERATED`
> rather than a wrong file. Full per-family behaviour, including the override
> and every error code, is in
> [Download an agent's model](/api/agents#download-an-agents-model).

### What you get, per family

One line each — the file `pull` writes, and what runs it:

| Family | File you get | What runs it |
|---|---|---|
| `essence-1` | `<code>.imx` | `bithuman run <file>` locally on macOS (Apple Silicon) and Linux; the [Python SDK](/sdk/python); the [Android AAR](/sdk/android); bitHuman cloud. |
| `essence-2` | `<code>.lebundle.imx` | bitHuman cloud today, plus offline CPU rendering on your own servers via the [Python SDK](/guides/deploy-self-hosted#essence-2-self-hosted--cpu-offline-rendering-sdk-290) (2.9.0+, `bithuman[tessera]`). Not playable by `bithuman run`, and there is no Mac/iPhone/Android build. **Licensed weights** — keep the file. |
| `essence-2-max` | `<code>.pkl` | bitHuman's GPU cloud, or the hand-delivered [self-hosted GPU container](/guides/deploy-essence-2-max). No local-playback form. The `.pkl` is derived the first time the agent runs a session, so a download before that returns `404 MODEL_ARTIFACT_NOT_READY` — start one session, then retry. |
| `expression-2` | `<code>.avatar` | `bithuman run <file>` on macOS (Apple Silicon); on Linux x86_64 after `bithuman engine install linux`; the browser via [`?render=local`](/guides/browser-rendering); bitHuman cloud. **Not** the [`Expression2` Swift product](/sdk/swift#expression-2-on-device) — that engine wants a per-identity CoreML bundle, which is a different artifact and is not published. |
| `expression-1` | usually nothing (`400 MODEL_NOT_DOWNLOADABLE`); `<code>.imx` if the agent went through the lip step | bitHuman cloud. When the `.imx` exists it is the same artifact `essence-1` serves and runs the same way. |

All but one of those are `IMX\0` version-2 containers — including the
`expression-2` one, despite its `.avatar` name; the exception is a minority of
`expression-2` identities trained before 2026-07-12, which are still the
CoreML zip and will not be re-published. `bithuman info <file>` reads both and
prints the family, so run it rather than trusting the extension.

## `bithuman engine` — local render engine

The engine that renders `expression-2` avatars locally ships **inside the CLI**,
so a fresh install runs its first avatar with no extra download. `bithuman
engine` is the manual channel for that runtime — you rarely need it, but it lets
you inspect what's installed, install the engine for a different platform when
you package a cross-platform build, or update it when a newer avatar needs a
newer engine.

```bash
bithuman engine list                 # every known engine and whether it's installed
bithuman engine install              # fetch this platform's engine into the cache
bithuman engine install linux        # fetch another platform's engine (cross-build)
bithuman engine update               # install the newest pinned engine (idempotent)
```

The platform argument is **`mac` or `linux`** — those two tokens and nothing
else. A target triple is rejected:

```text
$ bithuman engine install linux-x86_64
bithuman engine install: no engine for platform 'linux-x86_64' (known: mac, linux)
rc=2
```

```text
$ bithuman engine install linux
  ◆ engine linux-1.0.0 ready → /home/you/.bithuman/engines/linux-1.0.0
rc=0
```

`bithuman engine list` names both, and marks the one this host is using:

```text
  ◆ expression-2 engines  (~/.bithuman/engines)
    mac-1.0.0  coreml · 173 MB  not installed
    linux-1.0.0  litert · 92 MB  installed (this host)
rc=0
```

Each avatar is one self-contained [`.imx` file](/concepts/avatars-imx); when the
CLI fetches one it pulls only the slice your platform needs (about 26 MB on
macOS, 63 MB on Linux). Which runtime renders on each platform is in
[Local rendering by platform](/sdk/cli/overview#local-rendering-by-platform).

## `bithuman doctor` — install sanity check

When something does not work, run this first. It checks versions, host
RAM, avatar auth, brain selection and availability, and cache sizes, and
exits `0` only if both avatar auth and a brain path are configured:

```bash
bithuman doctor && bithuman run avatar.imx
```

See [Install](/sdk/cli/install) for the full breakdown of what `doctor`
reports.
