---
title: "Essence 2"
description: "Essence 2 renders a photoreal person from one portrait: the identity's own footage, lip-synced live, on the device or in the bitHuman cloud."
section: models
group: "Models"
order: 10
type: concept
llms: models
models: ["essence-2"]
claims: ["S1", "S3", "S13", "S21", "S28"]
renders: ["device", "server", "cloud"]
next: ["/platforms", "/build/create-avatar", "/models/expression-2"]
moved:
  how-creation-works: /build/create-avatar#how-creation-works
  serving-tiers: /models/how-it-works#serving-tiers
  idle-and-speaking-behavior: /models/how-it-works#idle-and-speaking-behavior
---

## What it is

**Essence 2** (`essence-2`) renders a photoreal person from one portrait, up to
1080p: the identity's own canvas, 1080×1920 portrait for a standard identity. From your portrait the platform generates a 10-second
identity video; the model then animates lip-sync and expression over it live,
with a sharp mouth and teeth taken from that video.

How it is created, served and kept moving while idle: [How it works](/models/how-it-works).

## When to choose it

- **A photorealistic person** — start here.
- **Always-on displays** — kiosks, lobby screens and 24/7 assistants.
- **On your own hardware** — every SDK platform runs it.

For a stylized character, or a scene generated from one photo, choose
[Expression 2](/models/expression-2). The side-by-side is on
[Models](/models).

## Where it runs

```model-matrix
model: essence-2
```

A complete app for iPhone and iPad is the [iOS Essence 2 example](/examples/ios-essence-2); for Android, the [Android Essence 2 example](/examples/android-essence-2).

The file you download is `<CODE>.imx`, from
[`GET /v1/agent/{code}/model/download?model=essence-2`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE> --model essence-2`. How fast it renders on each device
is on [performance](/performance).

## Limits and expectations

- **Output plays at 25 frames a second** everywhere it runs. How fast a platform
  renders is on [performance](/performance).
- **The downloadable file is about 140–160 MB**, varying per identity — read
  `Content-Length` rather than assuming a size.
- **The identity is fixed at creation.** To change the face, create a new agent.
- **The first session on a new agent** can take longer to connect while the
  identity is provisioned; later sessions reuse it.
- **Before training completes**, a launch that requests this model is refused
  with [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors). Once ready,
  `essence-2` appears in the agent's `supported_models`.

## Next steps

- [Models](/models) — the four models side by side
- [Agents API](/api/agents) — create, poll, download
- [Embed widget](/api/embedding) — a live session in minutes
- [Video API](/api/video) — render an MP4 with `model: "essence-2"`
- [Session behavior & troubleshooting](/resources/troubleshooting)
