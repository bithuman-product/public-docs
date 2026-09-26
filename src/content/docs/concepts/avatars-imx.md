---
title: "Avatars and the .imx format"
description: "The self-contained .imx file every bitHuman avatar ships in — one container for Essence 1, Essence 2 and Expression 2 identities — where it comes from, how it's addressed by agent code, and how to inspect it."
section: guides
group: "Learn"
order: 6
type: concept
label: "The avatar file"
---

## What an `.imx` is

An `.imx` file is the container a bitHuman avatar ships in: one self-contained
file of identity weights, textures and a manifest (model version, ABI, licence)
that an [engine](/concepts/architecture) reads to animate one specific face.
Every model that renders on your own hardware uses it — a first-generation
[Essence 1](/concepts/essence-1) identity, an [Essence 2](/concepts/essence-2)
identity, and an [Expression 2](/concepts/expression-2) identity, which the
download endpoint labels `.avatar`: the same container under a second
extension. The same file opens on every on-device runtime — [Python](/sdk/python),
[Swift](/sdk/apple) and the [CLI](/sdk/cli) — and `bithuman open` tells you which
model a file you were given holds.

## Where `.imx` files come from

| Source | How |
|---|---|
| **Showcase** | `bithuman pull <slug>` — pre-built avatars from [bithuman.ai → Explore](https://www.bithuman.ai/explore), which opens on Essence 2 and Expression 2 agents. |
| **Dashboard** | Upload a portrait + voice samples in [bithuman.ai → Studio](https://www.bithuman.ai). |
| **API** | [`POST /v1/agent/generate`](/api/reference) returns an `agent_code` whose `.imx` you can download. |

See [Building avatars](/guides/building-avatars) for the full creation flow and media tips.

## Agent codes

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

`sofia-ramirez` (agent code `A52DHS2219`) is an Essence 2 identity in the free
showcase, about 148 MB. `bithuman list` prints every showcase slug; a slug that is
not in that list is refused with `slug '<name>' not found in manifest`.

`bithuman pull <slug>`, `bithuman list` and `bithuman open` need no credential for a sample avatar. Pulling your own agent by code, and playing any model with `bithuman run` or `bithuman render`, need `bithuman login` or `BITHUMAN_API_SECRET`; talking time bills at the [published rates](/guides/pricing).

Cache locations by surface:

| Surface | Cache location |
|---|---|
| Python / Swift (Essence) | `~/.cache/bithuman/models/` |
| Showcase pulls (CLI) | `~/.cache/bithuman/showcase/` |
| Swift (Expression on Mac/iPad) | `~/.cache/bithuman/expression/` |

Downloads are integrity-verified and cached. Subsequent launches are instant.


## One container, one file per model

Each model produces its own per-identity file in that container, downloaded
with [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
(or `bithuman pull <code>`, with `--model` when the agent has more than one):

| Model | Artifact | What it is |
|---|---|---|
| [`essence-1`](/concepts/essence-1) | `.imx` | The first-generation identity — a pre-rendered base whose mouth is patched to the audio. Opens in the [Python SDK](/sdk/python) and the [CLI](/sdk/cli)'s `run`. |
| [`essence-2`](/concepts/essence-2) | `.imx` | The Essence 2 bundle; size is per identity, so read `Content-Length`. Licensed weights; renders locally in the [CLI](/sdk/cli#platform-notes), the [Python SDK](/sdk/python), the [Android library](/sdk/android) and the Swift [`Essence2` product](/sdk/apple) — the first local play checks the licence with the cloud, so it needs your sign-in. |
| [`expression-2`](/concepts/expression-2) | `.avatar` or `.imx`: the same container under two names (a few early identities use an older format; `bithuman open` tells you which) | Renders locally in the [CLI](/sdk/cli), [Python](/sdk/python), [Apple](/sdk/apple) and [Android](/sdk/android), or on the cloud. |

Older releases saved Essence 2 files as `<CODE>.lebundle.imx`, a legacy extension. Such a file keeps working and `bithuman open` reads it; today's downloads are named `<CODE>.imx`. The model is [`essence-2`](/concepts/essence-2).

## Inspecting an `.imx`

Use the CLI to dump model metadata — version, ABI, resolution, and license. This
reads the file on your own disk, so it needs no account and no network:

```bash
bithuman open ~/.cache/bithuman/showcase/sofia-ramirez.imx
```

### The `engine` value is a legacy name

`bithuman open` reports an **`engine`** read from the container header (also
`engine` in [`--json`](/sdk/cli/reference#json-output)), and the Python runtime quotes the same
string verbatim in load errors — for example `backend loader for
engine='essence2-light'`.

**These engine ids are legacy names kept for compatibility.** They are the literal strings readers parse, spelled here exactly as you will see them:

| `engine` in the header | The model you actually have |
|---|---|
| `essence1` | [Essence 1](/concepts/essence-1) — also the value an older container with no header resolves to |
| `essence2-light` | **[Essence 2](/concepts/essence-2)** — request it as `essence-2` |
| `essence2-quality` | A retired premium tier of Essence 2 — not a model you can request; treat the file as **[Essence 2](/concepts/essence-2)** |
| `expression2` | **[Expression 2](/concepts/expression-2)** — request it as `expression-2` |

So a current Essence 2 bundle reports `engine: essence2-light`. The model is
**Essence 2**, requested as `essence-2`: the engine id names the *loader family*,
not the product, so the value is expected, not a mismatch.

> **Warning** Never send an engine id to the API. `model` takes only `essence-1`, `essence-2`, `expression-1` or `expression-2`; anything else returns [`400 VALIDATION_ERROR`](/api/agents#errors).

## File-format stability

The `.imx` format is **forward-compatible within a major version**. The first time you open an older `.imx` with a newer runtime, the runtime warms it up and silently upgrades the file. Keep the runtime warm in production to avoid paying that warm-up cost per session.

## Where to go next

- [Building avatars](/guides/building-avatars) — design likeness, voice, and personality.
- [Audio streaming](/concepts/audio-streaming) — drive the `.imx` with audio.
- [CLI reference](/sdk/cli) — `bithuman open`, `pull`, `list`, and more.
