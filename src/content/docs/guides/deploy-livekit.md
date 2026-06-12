---
title: "Deploy via LiveKit"
description: "The fastest path to production — drop a bitHuman avatar into any LiveKit agent worker with the cloud plugin. Managed runtime, ~5-minute setup."
section: guides
group: "Deploy"
order: 20
---

## The cloud plugin

`livekit-plugins-bithuman` runs the avatar on bitHuman's servers — no model files, no GPU on your side. It's the fastest production path (~5 minutes) and charges per active minute against your account. Works with both [Essence and Expression](/concepts/models).

## Install

```bash
pip install livekit-plugins-bithuman pillow
```

Python 3.9+. The plugin pulls `bithuman` + `livekit-agents`.

> **Note** The plugin currently requires Pillow but doesn't declare it as a
> dependency — install `pillow` alongside it (as above). Without it,
> `from livekit.plugins import bithuman` fails with
> `ModuleNotFoundError: No module named 'PIL'`. An upstream fix is pending with
> LiveKit.

## Set your environment

```bash
export BITHUMAN_API_SECRET="your_api_secret"
export BITHUMAN_AGENT_ID="A78WKV4515"        # your agent code from the Library
export OPENAI_API_KEY="sk-..."
export LIVEKIT_URL="wss://your-project.livekit.cloud"
export LIVEKIT_API_KEY="APIxxxx"
export LIVEKIT_API_SECRET="xxxx"
```

## Wire into an agent worker

```python
from livekit.agents import Agent, JobContext
from livekit.plugins import bithuman
import os

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    await ctx.wait_for_participant()
    avatar = bithuman.AvatarSession(
        avatar_id=os.environ["BITHUMAN_AGENT_ID"],
        api_secret=os.environ["BITHUMAN_API_SECRET"],
    )
    # ...attach the avatar to your AgentSession and start it.
```

To select Expression, pass `model="expression"` to the session. To point at your **own** Essence server instead of bitHuman's cloud, pass `api_url=` — see [self-hosted deployment](/guides/deploy-self-hosted).

## What you get

- **Managed avatar runtime** — no GPU to provision, no Docker to operate.
- **LiveKit Cloud-compatible** — works with both LiveKit Cloud and self-hosted LiveKit servers.
- **WebRTC delivery** — video streamed via LiveKit's media pipeline to any client.

## Billing

Each session bills at the [cloud or self-hosted rate](/guides/pricing) depending on whether the avatar GPU is yours or bitHuman's — 2 cr/min cloud Essence, 4 cr/min cloud Expression.

## Runnable examples

Complete LiveKit agents ship in the [examples repo](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python) — each with `.env.example`, `requirements.txt`, and a `docker-compose.yml` full stack (LiveKit + agent + web UI). Clone, fill `.env`, then `docker compose up`:

| Example | Model · where |
|---|---|
| [cloud-essence](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/cloud-essence) | Essence · bitHuman cloud — start here |
| [local-essence](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/local-essence) | Essence · your server (CPU) |

See the [LiveKit Agents docs](https://docs.livekit.io/agents/) for the broader agent-worker model.

## Where to go next

- [Self-hosted GPU](/guides/deploy-self-hosted) — run Expression on your own NVIDIA hardware.
- [Embed widget](/guides/deploy-embed) — drop an iframe on any page.
- [Pricing](/guides/pricing) — the cloud-vs-self-hosted credit breakdown.
- [API reference](/api/reference) — agents, speak, dynamics, tokens.
