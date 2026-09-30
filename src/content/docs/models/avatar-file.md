---
title: "The avatar file"
description: "The self-contained .imx file every bitHuman avatar ships in."
section: models
group: "Concepts"
order: 20
type: concept
llms: models
moved:
  the-engine-value-is-a-legacy-name: /resources/renamed#the-engine-value-is-a-legacy-name
---

## What an `.imx` is

An `.imx` file is the container a bitHuman avatar ships in: one self-contained
file of identity weights, textures and a manifest (model version, ABI, license)
that an [engine](/models/how-it-works) reads to animate one specific face.
Every model that renders on your own hardware uses it — a first-generation
[Essence 1](/models/first-generation#essence-1) identity, an [Essence 2](/models/essence-2)
identity, and an [Expression 2](/models/expression-2) identity.

Every download is
named `<CODE>.imx`; older Expression 2 files may carry the legacy `.avatar`
extension, which opens the same way. The same file opens on every on-device runtime — [Python](/platforms/python),
[Swift](/platforms/ios) and the [CLI](/platforms/cli) — and `bithuman open` tells you which
model a file you were given holds.

## Where `.imx` files come from

| Source | How |
|---|---|
| **Showcase** | `bithuman pull <slug>` — pre-built avatars from [bithuman.ai → Explore](https://www.bithuman.ai/explore), which opens on Essence 2 and Expression 2 agents. |
| **Dashboard** | Upload a portrait + voice samples in [bithuman.ai → Studio](https://www.bithuman.ai). |
| **API** | [`POST /v1/agent/generate`](/api/reference) returns an `agent_code` whose `.imx` you can download. |

See [Building avatars](/build/create-avatar) for the full creation flow and media tips.

### Agent codes

The `.imx` is keyed by an **agent code** (e.g. `A23WJF0199`). The **cloud runtime and REST API** resolve an agent by its code — you don't ship a file. The **on-device SDKs open a local `.imx`** — the file you downloaded for that code — and the key comes from `BITHUMAN_API_SECRET` in the environment, checked at the first frame:

```python
import bithuman

with bithuman.open("A23WJF0199.imx") as avatar:   # the local file — required on-device
    for image in avatar.render("speech.wav"):      # (height, width, 3) uint8, RGB
        ...
```

To get the file for a local run, download it by code or slug — `bithuman pull <CODE>` on macOS or Linux, or [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) — see [Caching for offline use](#caching-for-offline-use).

> **Note** Use `agent_code`, never the deprecated `figure_id` — the old identifier returns a 400.

## Caching for offline use

You can also pull the file down and pass it by path. A showcase slug needs no
account — `bithuman pull` downloads it anonymously:

```bash
bithuman pull sofia-ramirez
# → ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

`sofia-ramirez` (agent code `A52DHS2219`) is an Essence 2 sample identity from the
showcase, about 148 MB. `bithuman list` prints every showcase slug; a slug that is
not in that list is refused with `slug '<name>' not found in manifest`.

`bithuman pull <slug>`, `bithuman list` and `bithuman open` need no credential for a sample avatar. Pulling your own agent by code, and playing any model with `bithuman run` or `bithuman render`, need `bithuman login` or `BITHUMAN_API_SECRET`; session time bills at the [published rates](/pricing).

Cache locations by surface:

| Surface | Cache location |
|---|---|
| CLI | pulls in `~/.cache/bithuman/showcase/` (samples) and `~/.cache/bithuman/agents/` (your agents); unpacked copies in `~/.cache/bithuman/bundles/` |
| Python | unpacked copies in `~/.cache/bithuman/avatars/`; engine files in `~/.bithuman/deps/` |
| Swift (Expression on Mac/iPad) | `~/.cache/bithuman/expression/` |

Downloads are integrity-verified and cached. Later launches skip the download.


## One container, one file per model

Each model produces its own per-identity file in that container, downloaded
with [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
(or `bithuman pull <code>`, with `--model` when the agent has more than one):

| Model | Artifact | What it is |
|---|---|---|
| [`essence-1`](/models/first-generation#essence-1) | `.imx` | The first-generation identity — a pre-rendered base whose mouth is patched to the audio. Opens in the [Python SDK](/platforms/python) and the [CLI](/platforms/cli)'s `run`. |
| [`essence-2`](/models/essence-2) | `.imx` | The Essence 2 bundle; size is per identity, so read `Content-Length`. Licensed weights; renders locally in the [CLI](/platforms/cli/voice#platform-notes), the [Python SDK](/platforms/python), the [Android library](/platforms/android) and the Swift [`Essence2` product](/platforms/ios) — the first local play checks the license with the cloud, so it needs your sign-in. |
| [`expression-2`](/models/expression-2) | `.imx` (older downloads: `.avatar`): the same container under two names (a few early identities use an older format; `bithuman open` tells you which) | Renders locally in the [CLI](/platforms/cli), [Python](/platforms/python), [Apple](/platforms/ios) and [Android](/platforms/android), or on the cloud. |

Older releases saved Essence 2 files as `<CODE>.lebundle.imx`, a legacy extension. Such a file keeps working and `bithuman open` reads it; today's downloads are named `<CODE>.imx`. The model is [`essence-2`](/models/essence-2).

### File-format stability

The `.imx` format is **forward-compatible within a major version**. The first open unpacks the file into that cache, using about its size again on disk; later opens reuse it. Your file is never rewritten.

## Inspecting an `.imx`

`bithuman open <file>` prints the container format, the model family
(`Family: essence-2 (Essence 2)`) and the files inside; `--json` adds the
manifest. It reads the file on your own disk, so it needs no account and no network:

```bash
bithuman open ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

The `engine` value it prints is a legacy name: [what each one means](/resources/renamed#the-engine-value-is-a-legacy-name).

## Where to go next

- [Building avatars](/build/create-avatar) — design likeness, voice, and personality.
- [Audio streaming](/models/how-it-works#audio-in-frames-out) — drive the `.imx` with audio.
- [CLI reference](/platforms/cli) — `bithuman open`, `pull`, `list`, and more.
