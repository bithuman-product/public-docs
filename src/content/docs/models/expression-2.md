---
title: "Expression 2"
description: "Expression 2 renders any character from one portrait, live."
section: models
group: "Models"
order: 20
type: concept
llms: models
models: ["expression-2"]
claims: ["S1", "S3", "S13", "S21", "S28"]
renders: ["device", "server", "cloud"]
next: ["/platforms", "/build/create-avatar", "/models/essence-2"]
moved:
  how-creation-works: /build/create-avatar#how-creation-works
  serving-tiers: /performance/method#pin-a-tier-for-a-benchmark
  idle-and-speaking-behavior: /models/how-it-works#idle-and-speaking-behavior
---

## What it is

**Expression 2** (`expression-2`) generates the whole avatar scene live from the
audio — expressions, mouth and head movement are synthesized each session, not
replayed from a base video. It animates the **entire 416x720 frame** with no
face detector or cropping step, so it works for any character: cartoons,
animals, creatures, robots, and people.

At creation the platform trains a **small model of your specific identity** from
one photo. That per-identity model is what serves your sessions, and it is why
creation takes a couple of hours.

How it is created, served and kept moving while idle: [How it works](/models/how-it-works).

## When to choose it

- **Your character is not a photorealistic human** — this is the model for it,
  and where `model: "auto"` routes such inputs.
- **You want motion generated from the audio itself**, not patched onto a base
  video.
- **You only have a photo** — one image is enough.

For a photorealistic person, compare
[Essence 2](/models/essence-2). The side-by-side is on [Models](/models).

## Where it runs

```model-matrix
model: expression-2
```

Complete apps: [iOS Expression 2](/examples/ios-expression-2), [macOS Expression 2](/examples/macos-expression-2) and [Android Expression 2](/examples/android-expression-2).

The file you download from
[`GET /v1/agent/{code}/model/download?model=expression-2`](/api/agents#download-an-agents-model)
or `bithuman pull <CODE>` is labelled `<CODE>.imx`; `.avatar` is the legacy
extension for the same container. How fast it renders on each device is on
[performance](/performance).

## Limits and expectations

- **Output is the full 416×720 scene**, playing at 20 frames a second.
- **A clear, frontal, well-lit photo** gives the best result. The identity is
  fixed at creation — to change the face, create a new agent.
- **The first session on a new agent** can take longer to connect while its
  model is provisioned; later sessions reuse it.
- **Before training completes**, a launch that requests this model is refused
  with [`409 MODEL_NOT_GENERATED`](/api/errors#model-errors). Once ready,
  `expression-2` appears in the agent's `supported_models`.

## Next steps

- [Models](/models) — the four models side by side
- [Agents API](/api/agents) — create, poll, download
- [Embed widget](/api/embedding) — a live session in minutes
- [Video API](/api/video) — render an MP4 with `model: "expression-2"`
- [Session behavior & troubleshooting](/resources/troubleshooting)
