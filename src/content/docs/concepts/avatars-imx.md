---
title: "Avatars and the .imx format"
description: "The self-contained .imx file every bitHuman avatar ships in — one container for Essence 1, Essence 2 and Expression 2 identities — where it comes from, how it's addressed by agent code, and how to inspect it."
section: concepts
group: "Core"
order: 2
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
[Swift](/sdk/ios) and the [CLI](/sdk/cli) — and `bithuman info` tells you which
model a file you were given holds.

## Where `.imx` files come from

| Source | How |
|---|---|
| **Showcase** | `bithuman pull <slug>` — pre-built avatars from [bithuman.ai → Explore](https://www.bithuman.ai/explore). |
| **Dashboard** | Upload a portrait + voice samples in [bithuman.ai → Studio](https://www.bithuman.ai). |
| **API** | [`POST /v1/agent/generate`](/api/reference) returns an `agent_code` whose `.imx` you can download. |

See [Building avatars](/guides/building-avatars) for the full creation flow and media tips.

## Agent codes

The `.imx` is keyed by an **agent code** (e.g. `A78WKV4515`). The **cloud runtime and REST API** resolve an agent by its code — you don't ship a file. The **on-device SDKs open a local `.imx`** — the file you downloaded for that code — and the key comes from `BITHUMAN_API_SECRET` in the environment, checked at the first frame:

```python
import bithuman

with bithuman.open("A78WKV4515.imx") as avatar:   # the local file — required on-device
    for image in avatar.render("speech.wav"):      # (height, width, 3) uint8, RGB
        ...
```

To get the file for a local run, download it by code or slug — `bithuman pull <CODE>` on macOS or Linux, or [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model) — see [Caching for offline use](#caching-for-offline-use).

> **Note** Use `agent_code`, never the deprecated `figure_id` — the old identifier returns a 400.

## Caching for offline use

You can also pull the file down and pass it by path:

```bash
bithuman pull modern-court-jester
# → ~/.cache/bithuman/showcase/modern-court-jester.imx
```

Cache locations by surface:

| Surface | Cache location |
|---|---|
| Python / Swift (Essence) | `~/.cache/bithuman/models/` |
| Showcase pulls (CLI) | `~/.cache/bithuman/showcase/` |
| Swift (Expression on Mac/iPad) | `~/.cache/bithuman/expression/` |

Downloads are integrity-verified and cached. Subsequent launches are instant.

## What's inside

You don't have to understand it, but for the curious:

- **Identity weights** — a small neural net specific to the face.
- **Reference frames** — texture atlases for the head.
- **Voice profile** — embedding for the cloned voice (Essence).
- **Manifest** — model version, ABI, license, and training metadata.

## One container, one file per model

Each model produces its own per-identity file in that container, downloaded
with [`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
(or `bithuman pull <code>`, with `--model` when the agent has more than one):

| Model | Artifact | What it is |
|---|---|---|
| [`essence-1`](/concepts/essence-1) | `.imx` | The first-generation identity — a pre-rendered base whose mouth is patched to the audio. Opens in the [Python SDK](/sdk/python) and the [CLI](/sdk/cli)'s `run`. |
| [`essence-2`](/concepts/essence-2) | `.imx` | The standard Essence 2 bundle — size is per identity, so read `Content-Length` (agents created before the 2026-07-27 renderer change are larger until retrained). Licensed weights; renders locally in the [CLI](/sdk/cli#what-renders-locally-and-where), the [Python SDK](/sdk/python), the [Android library](/sdk/android) and the Swift [`Essence2` product](/sdk/ios) — the first local play checks the licence with the cloud, so it needs your sign-in. |
| [`expression-2`](/concepts/expression-2) | `.avatar` — **usually** the current bitHuman container despite the extension, not a zip (a few identities trained before 2026-07-12 are an older zip format and stay that way). `bithuman info` tells you which you have. | Renders locally via the [CLI](/sdk/cli#what-renders-locally-and-where) on macOS (Apple Silicon) and Linux x86_64, or on bitHuman cloud. Per-platform selective download: about 26 MB on macOS, 63 MB on Linux. |

> **A note on the `.lebundle` extension.** `lebundle` is a **legacy name kept
> for compatibility** — it predates the current product naming and survives only
> as the extension older releases wrote, `<CODE>.lebundle.imx`. The download
> endpoint and `bithuman pull` label the file `<CODE>.imx` today; a bundle you
> saved under the older name keeps working, and `bithuman info` reads both, so
> the old spelling is kept here exactly as you may still have it on disk. It is
> not a product name and never appears in an API request: the model is
> [`essence-2`](/concepts/essence-2).

## Inspecting an `.imx`

Use the CLI to dump model metadata — version, ABI, resolution, and license:

```bash
bithuman info path/to/avatar.imx
```

### The `engine` value is a legacy name

`bithuman info` reports an **`engine`** read from the container header (also
`engine` in [`--json`](/sdk/cli/reference#the-machine-readable-contract)), and the Python runtime quotes the same
string verbatim in load errors — for example `backend loader for
engine='essence2-light'`.

**These engine ids are legacy names kept for compatibility.** They predate the
current product naming and they are the literal strings every reader parses, so
they are frozen and will not be renamed. They are spelled here exactly as you
will see them, because you may have to match on one:

| `engine` in the header | The model you actually have |
|---|---|
| `essence1` | [Essence 1](/concepts/essence-1) — also the value an older container with no header resolves to |
| `essence2-light` | **[Essence 2](/concepts/essence-2)** — request it as `essence-2` |
| `essence2-quality` | A retired premium tier of Essence 2 — not a model you can request; treat the file as **[Essence 2](/concepts/essence-2)** |
| `expression2` | **[Expression 2](/concepts/expression-2)** — request it as `expression-2` |

So a current Essence 2 bundle reports `engine: essence2-light`. That is
expected, not a mismatch
— the engine id names the *loader family*, not the product.

> **Never send an engine id to the API.** The `model` parameter takes the
> product names only — `essence-1`, `essence-2`, `expression-1`,
> `expression-2` — and anything else returns
> [`400 VALIDATION_ERROR`](/api/agents#creation-failure-modes). An engine id is
> something you *read* off a file you already have, never something you *send*.

## File-format stability

The `.imx` format is **forward-compatible within a major version**. The first time you open an older `.imx` with a newer runtime, the runtime warms it up and silently upgrades the file. Keep the runtime warm in production to avoid paying that warm-up cost per session.

## Where to go next

- [Building avatars](/guides/building-avatars) — design likeness, voice, and personality.
- [Audio streaming](/concepts/audio-streaming) — drive the `.imx` with audio.
- [Agent lifecycle](/concepts/agent-lifecycle) — generate, resolve, and go live.
- [CLI reference](/sdk/cli) — `bithuman info`, `pull`, `list`, and more.
