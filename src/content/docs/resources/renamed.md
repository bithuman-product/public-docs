---
title: "Renamed and retired names"
description: "Find what an older command, flag or API name is called now."
section: overview
group: "Resources"
order: 50
type: reference
llms: linked
searchTitle: "Renamed and retired names: old CLI flags, SDK and API names"
next: ["/resources/glossary", "/platforms/cli/reference", "/changelog"]
---

Older spellings you may still meet in scripts, code and saved links, and what to use now.

## Renamed in 2.7.3

The old spellings still work for now. Each prints one line on stderr naming what to use instead, and `--json` output is unchanged.

| Was | Now |
|---|---|
| `render X -a in.wav` | `render X in.wav` |
| `render` writing `output.mp4` | `render` writes `<avatar>.mp4` unless you pass `-o` |
| `render --quality`, `--target-size` | one preset, each avatar's default size |
| `run --allow-public-bind` | `BITHUMAN_ALLOW_PUBLIC_BIND=1` |
| `run --cloud`, `--offscreen`, `--frames`, `--embedded-livekit`, `--livekit-*` | not needed: `run <avatar>` picks and starts what it needs; frames without a window come from `render --limit N` |
| `chat`, `info`, `avatars`, `list --agents` | `run`, `open`, `list`, `list --mine` |
| `list --limit/--offset/--status`, `account --start/--end/--agent` | the full list; filter the `--json` output |
| `--api-base` | not needed: the CLI talks to `https://api.bithuman.ai` |
| `--dest` | `BITHUMAN_CACHE_DIR` |
| `--quiet`, `--no-color`, `BITHUMAN_JSON/QUIET/NO_COLOR` | `--json`, `NO_COLOR=1` |

## Older names

Older SDK and API names you may still meet:

| Older name | What to use now |
|---|---|
| `BITHUMAN_API_KEY` | `BITHUMAN_API_SECRET`. The deprecated alias is still read, with a warning, until CLI 3.0 and bithuman 4.0. |
| `POST /v1/realtime/ephemeral-token` (`ek_…` tokens) | Retired; connect through the [realtime relay](/api/realtime). |
| `bithuman.offline`, `render_offline` | Deprecated; use `bithuman.open(path).render(audio, out_mp4=...)` ([Python](/platforms/python)). |
| `bitHumanKit` | A legacy Swift package, not the current one; use the [Swift package](/platforms/ios) products `Expression2` and `Essence2Kit`. |

## Retired model and file names


Every other page uses the four model names. Some older names are still strings you
may read in links, logs or files:

| Legacy name you may meet | Where | What it means | Do you type it? |
|---|---|---|---|
| `essence`, `expression` | older `?model=` links and request bodies | Essence 1, Expression 1 | No — write `essence-1` / `expression-1` |
| `essence2-light` | the `Engine:` line from `bithuman open` — a [legacy engine value](/resources/renamed#the-engine-value-is-a-legacy-name) | Essence 2 | No — read the `Family:` line |
| `essence-2-light` | the retired tier name (the old Light tier) | Essence 2 | No — a request naming it gets a `400`; write `essence-2` |
| `elevate`, `essence-2-quality` | retired names of a premium tier | a separate tier, not Essence 2 | No — a request naming them gets a `400` |
| `embody` | a retired request spelling | Expression 2 | No — a request naming it gets a `400` naming `expression-2` |
| `.lebundle.imx`, `.avatar` | older file extensions | an Essence 2 or Expression 2 model file | Only if you already have one; it opens as-is |
| `[embody]` | the legacy prefix on log lines of the Apple `Expression2` engine | Expression 2 | Grep your logs for it |
| `BITHUMAN_EMBODY_DIR`, `EMBODY_DEBUG_FAIL_PREDICT` | legacy variables the Apple `Expression2` engine still reads beside their `EXPRESSION2_` twins | Expression 2 | No — set `BITHUMAN_EXPRESSION2_DIR` |
| `libelevate`, `libelevate-android` | legacy library names | Essence 2 | No — the Android coordinate is `ai.bithuman:essence2-android` |
| `libelevate-web` | the legacy path of the in-browser runtime | Essence 2 in a browser | No — embed with `https://www.bithuman.ai/embed/<CODE>` |
| older Python module and class names for MP4 rendering | legacy names, still importable — listed under [Older names](/platforms/python/reference#older-names) | the Essence 2 MP4 route | No — write `bithuman.offline`, `OfflineRenderer`, `render_offline`, `OfflineRenderError` |
| `bithuman[offline]` and the other older pip extras | legacy pip extras, removed from the wheel in 2.11.6 | nothing — pip warns and installs the base wheel | No — `pip install bithuman` |

Saved links keep working: `essence-2-light-gpu` / `essence-2-light-cpu` still pin
their tiers, links carrying `essence-2-light` or `essence-2-light-ane` route to
the Essence 2 default chain, and the older `essence-2-ane` / `expression-2-ane`
spellings of the Apple tier stay accepted. A link carrying the retired
`?model=essence-2-quality` falls back to the agent's stored model.

The cloud's Apple tier is called **Apple**, not "ANE": it is the whole Apple silicon target, not one accelerator inside it.

## The `engine` value is a legacy name

`bithuman open` reports an **`engine`** read from the container header (also
`engine` in [`--json`](/platforms/cli/reference#json-output)), and the Python runtime quotes the same
string verbatim in load errors — for example `backend loader for
engine='essence2-light'`.

**These engine ids are legacy names kept for compatibility.** They are the literal strings readers parse, spelled here exactly as you will see them:

| `engine` in the header | The model you actually have |
|---|---|
| `essence1` | [Essence 1](/models/first-generation#essence-1) — also the value an older container with no header resolves to |
| `essence2-light` | **[Essence 2](/models/essence-2)** — request it as `essence-2` |
| `essence2-quality` | a retired premium-tier name, not a model you can request; treat the file as **[Essence 2](/models/essence-2)** |
| `expression2` | **[Expression 2](/models/expression-2)** — request it as `expression-2` |

So a current Essence 2 bundle reports `engine: essence2-light`. The model is
**Essence 2**, requested as `essence-2`: the engine id names the *loader family*,
not the product, so the value is expected, not a mismatch.

> **Warning** Never send an engine id to the API. `model` takes `essence-2`, `expression-2`, `auto`, `essence-1` or `expression-1`; any other value returns [`400 VALIDATION_ERROR`](/api/errors#agent-operations).
