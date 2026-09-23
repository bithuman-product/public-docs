---
title: "Expression 1"
description: "Expression 1 — bitHuman's first-generation expressive model: facial animation generated from a portrait at runtime, GPU-only. How it is served and self-hosted."
section: concepts
group: "Models"
order: 7
label: "Expression 1"
---

## What it is

**Expression 1** (`expression-1`) animates a face from a **portrait image** at
runtime: you give it audio, and it generates the facial motion to match, with no
per-identity build step. It is maintained, not deprecated; `?model=expression`
serves it, and it is what `/v1/agent/generate` creates when the request names no
`model`.

It is a different engine from [Expression 2](/concepts/expression-2), not an
earlier version of it. For **new** expressive work, Expression 2 is the
recommended model.

## Where it runs

**On an NVIDIA GPU only**, by design. bitHuman serves it from cloud GPUs, and you
can run it on your own GPU with
[the Expression 1 GPU container](/guides/self-hosting#the-expression-1-gpu-container).
There is no CPU, Apple, Android or browser build, and none is planned. For an
expressive model on a Mac, a phone or in a browser, use Expression 2.

## What the file is

Usually nothing to download: Expression 1 renders from the agent's portrait, so
the download endpoint answers
[`400 MODEL_NOT_DOWNLOADABLE`](/api/errors#model-errors) for most agents.
An agent that went through the lip step owns a baked `.imx`, and the endpoint
serves that file. The engine weights are not part of any download; they ship
inside the container image.

Rates are on [pricing](/guides/pricing).

## See also

* [Models](/concepts/models) — the four models, where each runs, and which to pick
* [Essence 1](/concepts/essence-1) — the other first-generation model
* [Expression 2](/concepts/expression-2) — the recommended model for new work
