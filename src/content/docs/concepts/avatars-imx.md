---
title: "Avatars and the .imx format"
description: "The self-contained .imx file that packages a bitHuman avatar — where it comes from, how it's addressed by agent code, and how to inspect it."
section: concepts
group: "Core"
order: 2
---

## What an `.imx` is

Every bitHuman avatar is packaged as a single `.imx` file — a self-contained bundle of identity weights, textures, voice config, and metadata that the [`libessence`](/concepts/architecture) engine reads to animate one specific face. The same file plays back byte-identically on every runtime: [Python](/sdk/python), [Swift](/sdk/swift), and the [CLI](/sdk/cli/overview).

## Where `.imx` files come from

| Source | How |
|---|---|
| **Showcase** | `bithuman pull <slug>` — pre-built avatars from [bithuman.ai → Explore](https://www.bithuman.ai/explore). |
| **Dashboard** | Upload a portrait + voice samples in [bithuman.ai → Studio](https://www.bithuman.ai). |
| **API** | [`POST /v1/agent/generate`](/api/reference) returns an `agent_code` whose `.imx` you can download. |

See [Building avatars](/guides/building-avatars) for the full creation flow and media tips.

## Agent codes

The `.imx` is keyed by an **agent code** (e.g. `A78WKV4515`). The **cloud runtime and REST API** resolve an agent by its code — you don't ship a file. The **on-device SDKs render a local `.imx`**, so you pass its `model_path` (the `agent_code` is optional, used for billing attribution):

```python
from bithuman import AsyncBithuman
import os

rt = await AsyncBithuman.create(
    model_path="agent.imx",      # the local .imx file — required on-device
    agent_code="A78WKV4515",     # optional: billing attribution
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
```

To get the file for a local run, download it by code/slug (`bithuman pull` on macOS, or `https://models.bithuman.ai/showcase/<slug>.imx`) — see [Caching for offline use](#caching-for-offline-use).

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

## Second-generation artifacts

The `.imx` container above packages the first-generation `essence-1` avatar.
The [second-generation models](/concepts/models-v2) each produce their own
per-identity artifact, downloaded with
[`GET /v1/agent/{code}/model/download`](/api/agents#download-an-agents-model)
(or `bithuman pull <code>`):

| Model | Artifact | What it is |
|---|---|---|
| [`essence-2`](/concepts/essence-2) | `<code>.lebundle.imx` | The standard Essence 2 bundle — **~85–105 MB** on the current renderer (agents created before the 2026-07-27 renderer change are larger, up to ~550 MB, until retrained). Licensed weights; serves via bitHuman cloud today. |
| [`essence-2-max`](/concepts/essence-2-max) | `<code>.pkl` | The Essence 2 Max identity bundle — renders on bitHuman's GPU cloud, not a local-playback artifact. |
| [`expression-2`](/concepts/expression-2) | `<code>.avatar` — **usually** an `IMX\0` v2 container despite the extension, not a zip (96 of the 110 published objects on 2026-09-01; the other 14 are the pre-2026-07-12 CoreML zip and stay that way). `bithuman info` tells you which you have. | Renders locally via the [CLI](/sdk/cli/overview#local-rendering-by-platform) on macOS (Apple Silicon), and on Linux x86_64 with the CPU render host installed, or on bitHuman cloud. Per-platform selective download: about 26 MB on macOS, 63 MB on Linux. |

> **A note on the `.lebundle` extension.** `lebundle` is a **legacy name kept
> for compatibility** — it predates the current product naming and survives only
> as the file extension. It is the literal string the download endpoint and
> `bithuman pull` give you, and the one `bithuman info` expects, so it is spelled
> here exactly as you will type it. It is not a product name and never appears in
> an API request: the model is [`essence-2`](/concepts/essence-2). The file will
> not be renamed — saved paths and scripts keep working.

## Inspecting an `.imx`

Use the CLI to dump model metadata — version, ABI, resolution, and license:

```bash
bithuman info path/to/avatar.imx
```

### The `engine` value is a legacy name

`bithuman info` reports an **`engine`** read from the container header (also
`engine` in [`--json`](/sdk/cli/agents)), and the Python runtime quotes the same
string verbatim in load errors — for example `backend loader for
engine='essence2-light'`.

**These engine ids are legacy names kept for compatibility.** They predate the
current product naming and they are the literal strings every reader parses, so
they are frozen and will not be renamed. They are spelled here exactly as you
will see them, because you may have to match on one:

| `engine` in the header | The model you actually have |
|---|---|
| `essence1` | [Essence 1](/concepts/models) — also the value an older container with no header resolves to |
| `essence2-light` | **[Essence 2](/concepts/essence-2)** — request it as `essence-2` |
| `essence2-quality` | **[Essence 2 Max](/concepts/essence-2-max)** — request it as `essence-2-max` |
| `expression2` | **[Expression 2](/concepts/expression-2)** — request it as `expression-2` |

So a current Essence 2 bundle reports `engine: essence2-light`, and an Essence 2
Max bundle reports `engine: essence2-quality`. That is expected, not a mismatch
— the engine id names the *loader family*, not the product.

> **Never send an engine id to the API.** The `model` parameter takes the
> product names only — `essence-1`, `essence-2`, `essence-2-max`,
> `expression-1`, `expression-2` — and anything else returns
> [`400 VALIDATION_ERROR`](/api/agents#creation-failure-modes). An engine id is
> something you *read* off a file you already have, never something you *send*.

## File-format stability

The `.imx` format is **forward-compatible within a major version**. The first time you open an older `.imx` with a newer runtime, the runtime warms it up and silently upgrades the file. Keep the runtime warm in production to avoid paying that warm-up cost per session.

## Where to go next

- [Building avatars](/guides/building-avatars) — design likeness, voice, and personality.
- [Audio streaming](/concepts/audio-streaming) — drive the `.imx` with audio.
- [Agent lifecycle](/concepts/agent-lifecycle) — generate, resolve, and go live.
- [CLI reference](/sdk/cli/overview) — `bithuman info`, `pull`, `list`, and more.
