---
title: "Avatars and the .imx format"
description: "The self-contained .imx file that packages a bitHuman avatar — where it comes from, how it's addressed by agent code, and how to inspect it."
section: concepts
group: "Core"
order: 2
---

## What an `.imx` is

Every bitHuman avatar is packaged as a single `.imx` file — a self-contained bundle of identity weights, textures, voice config, and metadata that the [`libessence`](/concepts/architecture) engine reads to animate one specific face. The same file plays back byte-identically on every runtime: [Python](/sdk/python), [Swift](/sdk/swift), [Kotlin](/sdk/kotlin), and the [CLI](/cli).

## Where `.imx` files come from

| Source | How |
|---|---|
| **Showcase** | `bithuman pull <slug>` — pre-built avatars from [bithuman.ai → Explore](https://www.bithuman.ai/#explore). |
| **Dashboard** | Upload a portrait + voice samples in [bithuman.ai → Studio](https://www.bithuman.ai). |
| **API** | [`POST /v1/agent/generate`](/api/reference) returns an `agent_code` whose `.imx` you can download. |

See [Building avatars](/guides/building-avatars) for the full creation flow and media tips.

## Agent codes

The `.imx` is keyed by an **agent code** (e.g. `A78WKV4515`). Once generated, every SDK and the cloud runtime can resolve it by code — you don't have to ship the file with your app:

```python
from bithuman import AsyncBithuman
import os

rt = await AsyncBithuman.create(
    agent_code="A78WKV4515",   # resolves to the .imx — no model_path needed
    api_secret=os.environ["BITHUMAN_API_SECRET"],
)
```

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
| Python / Swift / Kotlin (Essence) | `~/.cache/bithuman/models/` |
| Showcase pulls (CLI) | `~/.cache/bithuman/showcase/` |
| Swift (Expression on Mac/iPad) | `~/.cache/bithuman/expression/` |

Downloads are integrity-verified and cached. Subsequent launches are instant.

## What's inside

You don't have to understand it, but for the curious:

- **Identity weights** — a small neural net specific to the face.
- **Reference frames** — texture atlases for the head.
- **Voice profile** — embedding for the cloned voice (Essence).
- **Manifest** — model version, ABI, license, and training metadata.

## Inspecting an `.imx`

Use the CLI to dump model metadata — version, ABI, resolution, and license:

```bash
bithuman info path/to/avatar.imx
```

## File-format stability

The `.imx` format is **forward-compatible within a major version**. The first time you open an older `.imx` with a newer runtime, the runtime warms it up and silently upgrades the file. Keep the runtime warm in production to avoid paying that warm-up cost per session.

## Where to go next

- [Building avatars](/guides/building-avatars) — design likeness, voice, and personality.
- [Audio streaming](/concepts/audio-streaming) — drive the `.imx` with audio.
- [Agent lifecycle](/concepts/agent-lifecycle) — generate, resolve, and go live.
- [CLI reference](/cli) — `bithuman info`, `pull`, `list`, and more.
