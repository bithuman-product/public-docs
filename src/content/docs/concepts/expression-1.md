---
title: "Expression 1"
description: "Official guide to expression-1 — bitHuman's first-generation expressive avatar model: audio-driven facial animation from a portrait, GPU-only, how it is served and self-hosted, what it costs, and what the .imx artifact contains."
section: concepts
group: "Models"
order: 7
label: "Expression 1"
---

> **Note — first generation, and still maintained.** `expression-1` is
> bitHuman's original expressive model and is **not deprecated**: it is what
> `?model=expression` serves, it is the default model when `/v1/agent/generate`
> is called with no `model`, and thousands of live agents run on it today. For
> **new** expressive work the recommended model is
> [`expression-2`](/concepts/expression-2).

## What it is

`expression-1` animates a face from a **portrait image** rather than replaying
a pre-recorded identity: you give it audio, and it generates the facial motion
to match. That is what makes it expressive, and it is also why it needs more
hardware than [`essence-1`](/concepts/essence-1).

`-1` is naming symmetry with [Expression 2](/concepts/expression-2), which is a
different engine — not an earlier version of the same one.

## Where it runs

**GPU only.** That is an explicit product decision, not a gap: `expression-1`
is served on bitHuman's cloud GPUs and has no CPU, browser or on-device build,
so a missing Apple, browser or Android artifact for this model is **correct**.

See **[Where each model runs](/concepts/where-models-run)** for the per-model
matrix. Nothing here restates it.

## How to self-host it

**One published route, and it is a container:**
`sgubithuman/expression-avatar` on Docker Hub, which needs an NVIDIA GPU. The
[self-hosted deployment guide](/guides/deploy-self-hosted) has the run
instructions, the digest to pin and the licence terms.

**There is no Apple on-device route for `expression-1`.** The Swift package we
publish exposes `bitHumanKit`, `BithumanEngineProtocol` and `Expression2`;
there is no Expression **1** engine type in it to import. If you need an
avatar that runs on a Mac or an iPhone without a GPU server, use
[`essence-1`](/concepts/essence-1) or [`essence-2`](/concepts/essence-2)
instead.

## What it costs

Billed per live minute at the first-generation expressive rate, with a one-time
agent-creation charge. **All numbers live on one page:**
[Pricing & credits](/guides/pricing). The live rate card your key sees is
`GET /v1/pricing`.

## What the artifact is

`expression-1` shares the [`.imx` container](/concepts/avatars-imx) and the
same public store as [`essence-1`](/concepts/essence-1) — the two
first-generation models have one artifact format between them. You fetch it
the same way:

```bash
curl -H "api-secret: $BITHUMAN_API_SECRET" \
  https://api.bithuman.ai/v1/agent/<CODE>/model/download
```

★ **Not every `expression-1` agent has one.** The model can animate from a
portrait without a per-identity file, so an agent created that way has nothing
to download and the endpoint answers `unavailable` for it. That is the designed
behaviour, not a broken agent: if you need a downloadable artifact, check the
response rather than assuming one exists.

The engine weights are a separate thing and are not part of your download —
they ship inside the self-hosting container image.

## See also

* [Where each model runs](/concepts/where-models-run) — the per-model matrix
* [Essence vs Expression](/concepts/models) — the first-generation comparison
* [Essence 1](/concepts/essence-1) — the other first-generation model
* [Expression 2](/concepts/expression-2) — the recommended model for new work
* [Self-hosted deployment](/guides/deploy-self-hosted) — the GPU container
