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
| `bithuman render <path.imx>` | Offline render: model + audio → MP4. Essence 2 and Expression 2 on Linux x86_64 and macOS arm64 (2.6.1) |
| `bithuman info <model-file>` | Print model metadata — engine + family for any recognized bitHuman artifact |
| `bithuman pull <slug \| AGENT_CODE>` | Download a showcase avatar, or your own agent's generated model by code |
| `bithuman list` | Browse the showcase avatar catalog |
| `bithuman engine list \| install \| update` | Inspect, install, or update the per-platform local render engine ([shipped in the CLI, auto-managed](#bithuman-engine--local-render-engine)) |
| `bithuman doctor` | Host + auth + cache sanity check |
| `bithuman mcp` | Run the built-in MCP server for AI agents (stdio); `bithuman mcp tools` lists the tools. See [driving from an AI agent](/sdk/cli/agents). |
| `bithuman --version` | Print `libessence` + ABI + CLI versions |
| `bithuman version --json` | The same, machine-readable: `{"abi":7,"build":{…},"cli":"2.6.1","engine":{…},"libessence":"2.3.8","schema_version":1}` — 2.6.1 adds `build` (commit, target, `built_at`) and `engine` (the shipped Expression 2 engine's version and sha256) |
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

Pass an avatar file (or agent code) to run your own. **Where it renders**, in
the words of `bithuman run --help` on 2.6.2: a local `.imx` renders on this
machine — essence-1, essence-2 and expression-2 (`bithuman pull <CODE>`
fetches one); a slug auto-downloads on first use. An agent code is routed by
engine family: essence-1 downloads the `.imx` and renders locally; essence-2
/ expression-2 open a live cloud session. `--cloud` forces a cloud session.
(Through 2.6.1 the help still said essence-2 / expression-2 had "no local
runtime yet" — false since 2.6.1 shipped the Essence 2 runtime; the words
were fixed in 2.6.2, the routing did not change.) A self-hosted Essence 2 or
Expression 2 session is metered at the published self-hosted rate on both
platforms — see [the self-host guide](/guides/self-host-local#the-cli-meters-a-self-hosted-session).

From one invocation the CLI stands up an embedded `livekit-server`, an
essence-engine runtime, the conversation brain (cloud OpenAI Realtime or the
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
> - **Cloud brain (OpenAI Realtime):** nothing to install — the first
>   `bithuman run` creates `~/.cache/bithuman/brain-venv` and installs the
>   worker into it (a one-time ~200 MB download), and `bithuman doctor`
>   counts that venv once it exists. Advanced: `BITHUMAN_AGENT_SCRIPT` points
>   the binary at your own checkout's worker. (2.6.1's `doctor` on macOS
>   still told you to `pip install bithuman-cli`, a June wheel that puts an
>   older `bithuman` ahead of yours on `PATH`; 2.6.2 stopped saying so.)
> - **On-device brain:** install the requirements directly —
>   ```
>   pip install 'livekit-agents[silero]~=1.5' supertonic pywhispercpp llama-cpp-python soxr
>   ```
>   then `BITHUMAN_LOCAL=1`. Do **not** use `bithuman-cli[local]` (same
>   macOS-only wheel) or `bithuman[local]` — the `bithuman` distribution
>   has no `local` extra, so pip warns once, **exits 0, and installs none
>   of the brain**. Verified 2026-09-04: the resolved package set for
>   `bithuman[local]` is byte-identical to plain `bithuman`.
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
| `--cloud` | off | Force a cloud-rendered session (opens the live viewer) instead of rendering locally. Needs an agent code. |

### Which model files run locally?

`bithuman run` **recognizes the model family before launching** — it sniffs
the file (the IMX container's engine header, or the artifact's format), so
every bitHuman model file gets a correct, honest answer instead of a deep
engine error:

| Family | File | What `run` does |
|---|---|---|
| `essence-1` | `<code>.imx` (also legacy exports) | **Runs locally** — launches exactly as always. |
| `expression-2` | `<code>.avatar` — what `pull` and the download endpoint actually hand you. The extension is a frozen alias of `.imx`, not a distinct encoding: 96 of the 110 published objects are `IMX\0` v2 containers, 14 are still the pre-2026-07-12 CoreML zip (2026-09-01). A raw `<code>.imx` container also exists upstream. | **Runs locally** on macOS (Apple Silicon) — either form. On **Linux x86_64** the `.avatar` runs once the CPU render host is staged (`bithuman engine install linux`); a raw `.imx` on Linux is handed off to the cloud instead. Windows coming. The free Wise Pup avatar renders out of the box. Also serves live on bitHuman cloud. See [Local rendering by platform](/sdk/cli/overview#local-rendering-by-platform). |
| `essence-2` | `<code>.imx` — what `pull --model essence-2` writes as of 2.6.0; earlier releases named it `<code>.lebundle.imx`, a [legacy name kept for compatibility](/concepts/avatars-imx) that still opens | **Runs locally** on macOS (Apple Silicon) and Linux x86_64 as of **CLI 2.6.1** — the Essence 2 runtime ships inside the CLI. Pass the **file path**: `bithuman run <code>.imx` serves it from a local server. The first play fetches the shared audio encoder (~377 MB, once per machine, into `~/.bithuman/engines/essence-2/`) and performs a licence check with the cloud, so it needs your sign-in. A file with a required member missing is refused (exit 69) rather than played. The bundle contains **licensed weights** — keep the file. |
| `essence-2-max` | `<code>.pkl` | The [Essence 2 Max](/concepts/essence-2-max) artifact (`essence-2-quality` is its pre-rename internal alias). Recognized; same honest handoff — this family renders on bitHuman's GPU cloud and is not a local-playback artifact. |
| `expression-1` | usually none; `<code>.imx` for an agent that went through the lip step | Expression 1 has no per-identity artifact of its own — the shared v1 engine renders server-side from the agent's image, and the model is not supported on Mac locally (it's a heavy GPU engine). **One exception:** an `expression-1` agent that went through the lip step owns a baked `<code>.imx` in its model record, and the download endpoint serves that file exactly like `essence-1`, so it runs locally. Everything else in this family is cloud-served. |

Recognition never breaks what already worked: a file the sniffer can't
positively identify goes to the engine exactly as before (the engine stays
the final arbiter), and only a **positive cloud-only match** (Essence 2 Max or
Expression 1) diverts to the cloud surfaces. Passing a bare **agent code**
rather than a file path is different: `bithuman run <CODE>` routes an
`essence-2` or `expression-2` agent to a live cloud session, and `--cloud`
forces that for an `essence-1` code too.
Get the files themselves with [`bithuman pull <AGENT_CODE>`](#bithuman-pull--list--your-models-and-showcase-avatars)
or the [download endpoint](/api/agents#download-an-agents-model).

## `bithuman render` — offline MP4

For batch jobs or pipelines with TTS upstream — no browser, no brain,
just lipsync a WAV you already have:

```bash
bithuman render avatar.imx --audio speech.wav --output demo.mp4
```

> **Both second-generation families complete on CLI 2.6.1, on both platforms.**
> One audio file driving all three families through the same binary — the
> Expression 2 and Essence 1 rows measured on Linux x86_64, the Essence 2 row
> on Linux x86_64 *and* macOS arm64 during the 2.6.1 release verification. Full
> transcript on
> [Verified transcript](/sdk/cli/verified#bithuman-render-one-family-at-a-time).
>
> | Family | File | Result | rc |
> | --- | --- | --- | --- |
> | Expression 2 | `<code>.avatar` | Writes a real MP4 (h264+aac; 60 frames at 20 fps from 3 s of audio) | `0` |
> | Essence 2 | `<code>.imx` | Writes a real MP4 — 125 frames at 25 fps from 5 s of audio. **New in 2.6.1**; 2.5.1 and 2.6.0 exited 69 for this family | `0` |
> | Essence 1 | `<code>.imx` | The engine runs; the mux fails and no file is written | `70` |
>
> Same audio, same binary, different engines — so the one failure below is the
> runtime, not your input.

### Essence 2 — `rc=0` as of 2.6.1, and what the first render does

The Essence 2 runtime ships **inside the CLI tarball** on Linux x86_64 and
macOS arm64 as of `cli-v2.6.1`, so an Essence 2 file renders offline exactly
the way an Expression 2 file already did:

```bash
MODEL=$(bithuman pull <YOUR_AGENT_CODE> --model essence-2)   # → <code>.imx, path on stdout
bithuman render "$MODEL" -a speech.wav -o out.mp4
```

Three things happen the first time, and none of them needs your attention:

- **The shared audio encoder is downloaded** — about **377 MB**, once per
  machine — from the public release coordinate, checked by content digest, into
  `~/.bithuman/engines/essence-2/`. Later renders reuse it. There is no
  environment variable to set and nothing to stage next to the binary.
- **A licence check runs against the cloud** on first play, so the render
  needs the same sign-in `pull <YOUR_AGENT_CODE>` needs — `bithuman login`, or
  `BITHUMAN_API_SECRET` in CI. Signed out it is the `rc=77` gate below.
- **Metering** reports the render's minutes at the self-hosted rate, as for
  every self-hosted render ([pricing](/guides/pricing)).

**Fail-closed on an incomplete file.** If the model file is incomplete — a
required model member is missing — `render` refuses with **exit 69** and
writes **no output file**. It never substitutes a generated mouth for the one
the avatar recorded. On 2.6.1 that code means the *file*, not a missing
runtime: re-`pull` with `--force`, or send us the agent code if the artifact
needs rebuilding on our side.

### Essence 1 — `rc=70`, still

```text
  encoding via libessence (h264+aac → mp4)…
error: record_mp4 failed: file corrupt: audio_decode: avformat_open_input failed
rc=70
```

First reported against `cli-v2.4.0`, measured again on 2.5.1, and 2.6.1's own
`render --help` still reports exit 70 for this family on both platforms. It
fails at the muxing step and writes **no output file**. Three controls rule
out the input:
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
| `--target-size <SIZE>` | `1280` | A single number `N` (longest side binds to `N`, aspect preserved) or `WxH` (explicit canvas). **Essence 1 only** — the second-generation engines emit their native size. |
| `--limit <N>` | none | Cap the render at N frames — the audio is trimmed to `N/fps`. Measured on 2.5.1: `--limit 10` on an Expression 2 avatar produced a 10-frame MP4 (`ffprobe` `nb_frames=10`). |

> **`render` runs on both platforms as of 2.6.1** — Linux x86_64 and macOS
> arm64 — for Essence 2 and Expression 2. Writing the MP4 needs **`ffmpeg` on
> `PATH`** (or `$BITHUMAN_FFMPEG`) for those two families. Two release notes
> that matter if you are coming from an older build:
>
> - **2.6.0** fixed the macOS Expression 2 under-production that 2.5.x had
>   (an engine that produced fewer frames than the audio needed and left a
>   truncated MP4 behind): a refused render now leaves **no file** at
>   `--output`. Test the frame count anyway — it is cheap and it is the only
>   test that tells a complete clip from a partial one:
>   ```bash
>   ffprobe -v error -count_frames -select_streams v:0 \
>     -show_entries stream=nb_read_frames -of csv=p=0 out.mp4
>   ```
> - **Essence 1** exits **70** on both platforms (see above). Use the
>   [Video API](/api/video) — `POST /v1/video/generate` renders server-side
>   and returns a URL — for an Essence 1 MP4, or `bithuman run` and record
>   from the browser.

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
> **`pull --model` is in both tarballs** — introduced in 2.5.0, in the Linux
> x86_64 build since 2.5.1, and the CLI's own `pull --help` documents it:
> *"Which model family to download for an agent code: `essence-1`,
> `essence-2`, `essence-2-max`, `expression-2`. Agent codes only."*
>
> ```bash
> bithuman pull A31BSK9325 --model essence-2   # ask for a family; prints the cached path on stdout
> MODEL=$(bithuman pull A31BSK9325 --model essence-2) && bithuman render "$MODEL" -a in.wav -o out.mp4
> ```
>
> As of 2.6.0 the Essence 2 file is written as **`<code>.imx`** (earlier
> releases wrote `<code>.lebundle.imx`, a legacy name kept for compatibility),
> and as of 2.6.1 that file renders locally — see
> [`bithuman render`](#bithuman-render--offline-mp4).
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
> `--json` what else it has rather than guessing (captured on 2.5.1, before
> Essence 2 rendered locally — on 2.6.1 the `path` ends in `<code>.imx` and the
> local-playback answer is different; `other_models` is the field to read):
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
| `essence-2` | `<code>.imx` (2.6.0+; `<code>.lebundle.imx` from earlier releases is the same container under a legacy name) | `bithuman run <file>` and `bithuman render <file>` locally on macOS (Apple Silicon) and Linux x86_64 as of **CLI 2.6.1**; the [Python SDK](/sdk/python) (`bithuman.open`, 3.0.0) on macOS and Linux; the [Android AAR](/sdk/android#essence-2--aibithumanessence2-android040); the Swift [`Essence2`](/sdk/swift#essence-2-on-device) engine; bitHuman cloud. **Licensed weights** — keep the file. |
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

**Essence 2 has no `engine` subcommand and needs none.** Its runtime is inside
the CLI tarball on both platforms as of 2.6.1, and the one thing it fetches —
the shared audio encoder, about 377 MB, identity-agnostic — is downloaded by
`render` / `run` on the first Essence 2 play, checked by content digest, and
kept in `~/.bithuman/engines/essence-2/` for every later play. Delete that
directory and the next render fetches it again.

## `bithuman doctor` — install sanity check

When something does not work, run this first. It checks versions, host
RAM, avatar auth, brain selection and availability, and cache sizes, and
exits `0` only if both avatar auth and a brain path are configured:

```bash
bithuman doctor && bithuman run avatar.imx
```

See [Install](/sdk/cli/install) for the full breakdown of what `doctor`
reports.
