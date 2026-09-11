---
title: "Essence 1"
description: "Official guide to essence-1 — bitHuman's first-generation avatar model: what it is, where it runs, how to self-host it with the Python SDK, the CLI or the Android SDK, what it costs, and what the .imx artifact contains."
section: concepts
group: "Models"
order: 6
label: "Essence 1"
---

> **Note — first generation, and still maintained.** `essence-1` is bitHuman's
> original avatar model. It is **not deprecated**: it runs the majority of the
> agents on the platform today, it is what `?model=essence` serves, and it is
> the model behind the published Python SDK, the CLI and the Android SDK. For
> **new** photorealistic work the recommended model is
> [`essence-2`](/concepts/essence-2) — see
> [Essence 2 & Expression 2](/concepts/models-v2) for the comparison.

## What it is

`essence-1` is a portable rendering core with a stable C ABI, wrapped by every
bitHuman SDK. You give it 16 kHz mono PCM; it gives you 25 fps avatar video
frames, lip-synced to that audio, by reading a pre-built identity out of an
[`.imx` avatar file](/concepts/avatars-imx).

Two properties are the reason it is still here:

* **It runs on virtually any CPU.** No GPU, no accelerator, no cloud round
  trip. A Raspberry Pi is enough for a 256×256 avatar.
* **It is the widest published surface we have.** The Python wheel, the CLI and
  the Android SDK all ship it, and all three resolve for a stranger with no
  bitHuman account.

It is a **core library plus SDKs**, not a tiered model: there is one
`essence-1`, and no light/max variants.

## Where it runs

See **[Where each model runs](/concepts/where-models-run)** — that page is the
single matrix for every model and is kept in step with the engineering source
of truth. Nothing here restates it.

The short version: bitHuman serves `essence-1` for you in the cloud, and you
may also run it yourself on macOS, in a browser, or in an Android app.

## How to self-host it

Three published routes, all resolvable without a bitHuman-issued artifact
beyond your own agent's `.imx`:

* **Python** — `pip install bithuman`, then open the `.imx` with the two-call
  surface the [Python SDK](/sdk/python) page documents (`AsyncBithuman` is the
  2.x spelling and raises a refusal naming its replacement on 3.x). PyPI serves
  **3.1.2** with wheels for CPython 3.10–3.14 on macOS arm64, Linux x86_64 and
  Linux aarch64. There is **no Windows wheel**.
* **CLI** — the `bithuman` binary from the public Homebrew tap, with macOS
  arm64 and Linux x86_64 builds. See the [CLI overview](/sdk/cli).
* **Android** — `ai.bithuman:sdk` on Maven Central. ★ **The published `2.3.6`
  cannot authenticate on an Android device** — `Avatar.load` throws
  `be_auth_authenticate: status=11` on every device because the artifact's
  native library ships with no CA trust store. For an on-device talking head on
  Android today use [expression-2](/concepts/expression-2)
  (`ai.bithuman:expression2-android`), which needs no key at all; essence-1 on
  Android is on the [Android SDK](/sdk/android#troubleshooting)
  page.

**In your own Apple app:** the Swift package we publish today exposes
`bitHumanKit`, `BithumanEngineProtocol` and `Expression2`. There is **no
standalone Essence product in it yet**, so an iOS or macOS app cannot import
`essence-1` directly — use the Python SDK or the CLI on a Mac, or serve it from
bitHuman's cloud. This is stated here rather than left to be discovered at
`swift build`.

## What it costs

`essence-1` is billed per live minute like every other model, at the
first-generation rate, and agent creation is a one-time charge. **All numbers
live on one page:** [Pricing & credits](/guides/pricing). The live rate card
your key sees is `GET /v1/pricing`.

## What the artifact is

One file: `<CODE>.imx`, an encrypted [`.imx` container](/concepts/avatars-imx)
holding the identity, and optionally baked-in idle and keyword action clips.
You fetch it with:

```bash
curl -H "api-secret: $BITHUMAN_API_SECRET" \
  https://api.bithuman.ai/v1/agent/<CODE>/model/download
```

or with `bithuman pull <CODE>`. `essence-1` artifacts are served from a public
URL, so the download is a redirect rather than a short-lived signed link — the
same file, fetched the same way, whichever SDK you point at it.

## See also

* [Where each model runs](/concepts/where-models-run) — the per-model matrix
* [Essence vs Expression](/concepts/models) — the first-generation comparison
* [Expression 1](/concepts/expression-1) — the other first-generation model
* [Essence 2](/concepts/essence-2) — the recommended model for new work
