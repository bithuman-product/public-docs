---
title: "Banking and ATMs"
description: "Run an always-on avatar on a branch screen, teller terminal or ATM: the avatar handles the conversation, card handling and transactions stay in your systems. Hardware, data flows, operations and cost."
section: deploy
group: "Use cases"
order: 10
type: guide
llms: deploy
searchTitle: "Banking and ATMs: avatars on branch screens, teller terminals and ATMs"
claims: ["S3", "S4", "S5", "S6", "S7", "S9", "S10", "S19", "S20", "S21"]
next: ["/deploy/cpu", "/build/kiosk", "/deploy/privacy"]
parent: /deploy/use-cases
---

An avatar on a branch screen, a teller terminal or an ATM greets customers, answers questions and walks them through a task. The avatar handles the conversation; card handling and transactions stay in your systems.

## Where it runs

| Terminal | How the avatar renders |
|---|---|
| A Linux PC or terminal, x86_64 or arm64, with no GPU | the CLI or the Python SDK render it on the CPU ([CPU only (no GPU)](/deploy/cpu)) |
| An Android terminal (arm64) | the Android SDK renders it inside your app ([Android](/platforms/android)) |
| Screens fed from your own servers | the CLI, the Python SDK or the LiveKit plugin on your Mac or Linux machines ([Your servers](/deploy/self-hosted)) |
| Windows-based terminals | [contact sales](https://www.bithuman.ai/enterprise?topic=banking#contact) |

How fast each model renders on a standard desktop CPU: [Performance](/performance).

## What reaches bitHuman

```dataflow
cpu
```

Usage reports contain no audio, video, images or conversation text, and self-hosted sessions store no transcript at bitHuman. Every mode: [Data flows & privacy](/deploy/privacy).

## The conversation

- **On the terminal:** the CLI's [local conversation brain](/platforms/cli/local-brain) (`BITHUMAN_LOCAL=1`) runs speech recognition, the language model and the voice on the machine. Audio, transcripts and generated speech never leave it; the session still reports usage online.
- **Your own model:** any OpenAI-compatible endpoint works, including one inside your own network ([Providers](/api/providers)).
- **Your own systems:** account data and transactions stay in the services you already run. The avatar speaks what your conversation layer gives it.

## No internet at the site

A site with no internet runs [Fully offline](/deploy/offline), on the Business and Enterprise plans. The models it covers:

```model-matrix
place: offline
```

Creating the avatar from a portrait happens in the bitHuman cloud; the finished avatar model then runs on your machines.

## Run it all day

- **One API secret per terminal**, so you can revoke one without touching the rest ([API secrets](https://www.bithuman.ai/developer/api-keys)).
- **Download the avatar before opening:** `bithuman pull $AGENT_CODE`, then start it at boot from a service that restarts it if it exits, and show it full screen ([Kiosk on a Linux PC](/build/kiosk)).
- **Network drops:** a session checks your API secret when it starts and keeps rendering through a network drop of up to 5 minutes.
- **Session length:** a self-hosted session runs for up to 7 days, then ends with `403 SESSION_DURATION_LIMIT`; start a new one ([Rate limits](/api/rate-limits#session-concurrency)).

## What it costs

```price
cpu
```

A session bills while it runs, talking or idle, so close it when the branch closes.

## Agreements

Healthcare and financial-services deployments are set up under an enterprise agreement and review. [Contact sales](https://www.bithuman.ai/enterprise?topic=banking#contact) to start one.

Overviews to share with your team, on bithuman.ai: [AI avatars for banking and ATMs](https://www.bithuman.ai/use-cases/banking-atm), [Security and privacy](https://www.bithuman.ai/security) and [Enterprise](https://www.bithuman.ai/enterprise).
