---
title: "Expression 1"
description: "Expression 1 — bitHuman's first-generation expressive model: facial animation generated from a portrait at runtime, served in the bitHuman cloud. Where it runs and what it costs."
section: guides
group: "Learn"
order: 5
type: concept
label: "Expression 1"
---

## What it is

**Expression 1** (`expression-1`) animates a face from a **portrait image** at
runtime: you give it audio, and it generates the facial motion to match, with no
per-identity build step. It is maintained, not deprecated; `?model=expression-1`
serves it, and it is what `/v1/agent/generate` creates when the request names no
`model`.

It is a different engine from [Expression 2](/concepts/expression-2), not an
earlier version of it. For **new** expressive work, Expression 2 is the
recommended model.

## Where it runs

**In the bitHuman cloud only**, by design, on cloud GPUs.
There is no CPU, Apple, Android or browser build, and none is planned. For an
expressive model on a Mac, a phone or in a browser, use Expression 2.

## What the file is

Usually nothing to download: Expression 1 renders from the agent's portrait, so
the download endpoint answers
[`400 MODEL_NOT_DOWNLOADABLE`](/api/errors#model-errors) for most agents; a few
older agents have a downloadable `.imx`, which the endpoint serves. The engine weights are not part of any download.

Rates are on [pricing](/guides/pricing).

## See also

* [Models](/concepts/models) — the four models, where each runs, and which to pick
* [Essence 1](/concepts/essence-1) — the other first-generation model
* [Expression 2](/concepts/expression-2) — the recommended model for new work
