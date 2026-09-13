---
title: "Where each model runs"
description: "Which bitHuman model runs where: the four product models, what GPU-only means, and which one to pick."
section: concepts
group: "Models"
order: 0
label: "Where each model runs"
---

This is the page to read before you pick a model. It answers one question —
**which model runs where** — and it does not soften the answer anywhere.

## The four models

| Model | What it is | What it is for |
|---|---|---|
| **essence-1** | A complete avatar identity packaged in one `.imx` file. Pre-rendered base motion, mouth region patched in real time to match audio. | The workhorse. Runs on any modern CPU, no idle timeout, custom gestures, low memory. Kiosks, edge boxes, phones, high-concurrency LiveKit fleets. |
| **essence-2** | The current photoreal renderer — a sharper, more lifelike mouth than essence-1 at the same reach. | The default for new photoreal work. |
| **expression-1** | First-generation expressive engine: facial animation driven from a portrait image at runtime, no build step. | Existing v1 agents. **GPU only.** |
| **expression-2** | Second-generation generative engine: fully generated motion from one photo, rather than patching a pre-rendered base. | Stylized characters and creatures, and any case where the face is supplied at session time. |

Those four are the only product names. If you have met the words `elevate`,
`embody`, `essence-2-light`, `essence-2-quality`, `lebundle` or `libelevate`,
see [legacy names you will still see](#legacy-names-you-will-still-see) —
several of them are still literals you have to type or read, and this page
shows you which.

## The matrix

| Model | GPU offline | GPU live | Cloud, Apple tier | macOS (your Mac) | iOS | Browser | Android | Cloud, CPU tier |
|---|---|---|---|---|---|---|---|---|
| **essence-1** | **Not applicable** | **Not applicable** | In scope | In scope | In scope | In scope | In scope | **Not applicable** |
| **essence-2** | In scope | In scope | In scope | In scope | In scope | In scope | In scope | In scope |
| **expression-1** | In scope | In scope | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** | **Not applicable** |
| **expression-2** | In scope | In scope | In scope | In scope | In scope | In scope | In scope | In scope |

### There are two answers, and they are two different facts

**In scope** — this model belongs on this platform. If the artifact is missing
here, that is a gap, and it is our bug.

**Not applicable** — this model is deliberately **off** this platform. A
missing artifact here is **correct**. It is not "coming soon", it is not a
roadmap item, and there is no date. `expression-1` is **GPU-only by design**:
its absence from Apple, the browser and Android is the intended shape of the
product, so architect around a GPU for it rather than waiting. If you need
photoreal quality on a Mac, a phone or in a tab, the model you want is
**essence-2**.

`essence-1`'s **Not applicable** cells are the other kind: they are the cloud's
own serving tiers, and we serve essence-1 from the cloud's Apple tier. That is
about where *we* run it. Nothing about where *you* run it changes — your Mac,
iPhone, browser and Android stay in scope.

## essence-1 is the model you are most likely to be handed

About two thirds of the agents on the platform are **essence-1**, and the
CLI's default showcase catalogue is built entirely from it — every avatar a
bare `bithuman list` returns is an essence-1 identity. A second catalogue of
twenty essence-2 and expression-2 identities is open to anyone with no
credential; the CLI reads it with `bithuman list --manifest
https://api.bithuman.ai/v1/models/showcase`.

One thing to code against: **a stored agent can carry no model value at all.**
Roughly a fifth of them do, so anything of yours that switches on `agents.model`
must handle a null. It is not a rounding error.

## Identify what you are holding

`bithuman info` reads a model file locally and tells you its family. It needs
**no credential and no network**, so it is the cheapest way to find out which
row of the matrix applies to a file somebody sent you:

```bash
bithuman info e2.lebundle.imx
```

```text
  Format:         IMX v2
  Engine:         essence2-light
  Family:         essence-2 (Essence 2)
  Members (26):
    …
```

Read the **`Family:`** line — that is the product. Two things in that output
are legacy names you will meet and cannot avoid: the file extension
`.lebundle.imx`, and the `Engine: essence2-light` line. Neither is a product
name; [legacy names](#legacy-names-you-will-still-see) maps them all. The full
output and every exit code are on the
[CLI reference](/sdk/cli/reference).

## What a credential changes

`bithuman info` is free. **`bithuman render` is not** — it needs
`bithuman login`, or `BITHUMAN_API_SECRET` in the environment. Get a key at
[Developer → API keys](https://www.bithuman.ai/developer/api-keys).

Without one, `render` refuses before it opens the file, so the refusal is the
same for every model family. `bithuman doctor` reports the same thing as a
checklist and exits non-zero on a host with no credential — that is the
designed result, not a broken install.

## The lanes, one at a time

| Lane | What runs there | Start here |
|---|---|---|
| **GPU** | `essence-2`, `expression-1`, `expression-2`, offline and live. The only lane where `expression-1` exists at all. | [Self-hosted GPU](/guides/deploy-self-hosted) · [LiveKit plugin](/guides/deploy-livekit) |
| **Command line** | macOS Apple Silicon and Linux x86_64, and only those. | [CLI](/sdk/cli) |
| **Android** | `essence-1`, `essence-2` and `expression-2`, arm64 only. | [Android SDK](/sdk/android) |
| **Apple (your Mac and iPhone)** | Swift packages for macOS and iOS. `essence-2` on an iPhone is not available yet. | [Swift SDK](/sdk/ios) · [macOS](/sdk/macos) |
| **Browser** | `essence-1` and, per identity, `essence-2` and `expression-2`. | [Web](/sdk/web) · [Browser rendering](/guides/browser-rendering) |
| **Python** | macOS Apple Silicon, Linux x86_64 and Linux aarch64. | [Python SDK](/sdk/python) |

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Legacy names you will still see

There are two current product names — **expression-2** and **essence-2** —
plus the first generation, **essence-1** and **expression-1**. `elevate`,
`embody`, `essence-2-light`, `essence-2-quality`, `lebundle` and `libelevate`
are **deprecated as words**.

Deprecating a word does not rename a wire format. Several of these are frozen
forever in file names, API fields and manifest values, and **you will have to
read or type them**. Hiding a name you have to type would be worse than showing
a retired one, so here they are:

| Literal you will meet | Where you meet it | What it means | Do you type it? |
|---|---|---|---|
| `essence` | `model` field in the showcase manifest and in `agents.model` | **essence-1** | Yes — accepted request spelling. |
| `essence2-light` | `Engine:` line from `bithuman info` | **essence-2** | No. Read-only; the `Family:` line is the answer. |
| `essence-2-light` | the `agents.model` value in the database | **essence-2** | No — write `essence-2`. Retired as a product name, frozen as a stored value. |
| `.lebundle.imx` | the file extension of an essence-2 bundle | an essence-2 model file | Yes — it is the filename you are given. |
| `elevate` | SDK request field | **essence-2** | Accepted for compatibility; write `essence-2` in new code. |
| `embody` | legacy request spelling | **expression-2** | Accepted for compatibility; write `expression-2` in new code. |
| `essence-2-quality` | internal model lists | **essence-2** | No — write `essence-2`. |
| `libelevate`, `libelevate-android` | old library and artifact names | **essence-2** | **No.** Neither spelling was ever published to Maven Central; the coordinate to type is `ai.bithuman:essence2-android`. |

The rule: **write the product name; accept the legacy spelling on input; expect
to read it in file names and engine strings forever.**

One more naming point, because it causes real architecture mistakes: the Apple
lane is called **Apple**, not "ANE". It is the whole Apple Silicon target, not
one accelerator inside it — we run the work on whichever unit measures faster.

## Which model should I use?

**You need it on a Mac, an iPhone, in a browser, or on Android.** essence-1,
essence-2 or expression-2. `expression-1` is GPU-only and that is permanent —
plan for the cloud, not for a future release.

**You want photoreal, everywhere.** essence-2.

**You need maximum concurrency on cheap hardware, or a 24/7 unattended
display.** essence-1. Low memory, no idle timeout, custom gestures, runs on
1-2 CPU cores.

**You want to supply the face at session time, or the character is stylized or
non-human.** expression-2.

**You are maintaining an existing v1 agent.** expression-1 on GPU, or
essence-1 on any lane you run yourself. Both remain supported.

## Next steps

- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation family overview
- [Essence 2](/concepts/essence-2) · [Expression 2](/concepts/expression-2)
- [Essence vs Expression](/concepts/models) — the first-generation pair in detail
- [CLI reference](/sdk/cli/reference) — every command, flag and exit code
- [Android SDK](/sdk/android) · [Swift SDK](/sdk/ios) · [Python SDK](/sdk/python) · [CLI](/sdk/cli)
- [Avatars and the `.imx` format](/concepts/avatars-imx) — how a model file is packaged
- [Pricing & credits](/guides/pricing) — what each model costs to run
