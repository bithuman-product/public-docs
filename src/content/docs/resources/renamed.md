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

Older spellings you may still meet in scripts, code and saved links, and what to use now. Retired model names are on [Naming & migration](/models#naming--migration).

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

The model names retired over time, the older file extensions and library names, and what each means today, are in one table: [Naming & migration](/models#naming--migration). The SDK and API names below are older spellings you may still meet:

| Older name | What to use now |
|---|---|
| `BITHUMAN_API_KEY` | `BITHUMAN_API_SECRET`. The deprecated alias is still read, with a warning, until CLI 3.0 and bithuman 4.0. |
| `POST /v1/realtime/ephemeral-token` (`ek_…` tokens) | Retired; connect through the [realtime relay](/api/realtime). |
| `bithuman.offline`, `render_offline` | Deprecated; use `bithuman.open(path).render(audio, out_mp4=...)` ([Python](/platforms/python)). |
| `bitHumanKit` | A legacy Swift package, not the current one; use the [Swift package](/platforms/ios) products `Expression2` and `Essence2Kit`. |
