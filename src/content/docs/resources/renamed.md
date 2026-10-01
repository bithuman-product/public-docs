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

Older spellings you may still meet in scripts, code and saved links, and what to use now. Retired model names are on [Naming & migration](/models/first-generation#naming--migration).

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

The model names retired over time, the older file extensions and library names, and what each means today, are in one table: [Naming & migration](/models/first-generation#naming--migration). The SDK and API names below are older spellings you may still meet:

| Older name | What to use now |
|---|---|
| `BITHUMAN_API_KEY` | `BITHUMAN_API_SECRET`. The deprecated alias is still read, with a warning, until CLI 3.0 and bithuman 4.0. |
| `POST /v1/realtime/ephemeral-token` (`ek_…` tokens) | Retired; connect through the [realtime relay](/api/realtime). |
| `bithuman.offline`, `render_offline` | Deprecated; use `bithuman.open(path).render(audio, out_mp4=...)` ([Python](/platforms/python)). |
| `bitHumanKit` | A legacy Swift package, not the current one; use the [Swift package](/platforms/ios) products `Expression2` and `Essence2Kit`. |

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
