---
title: "Events and trade shows"
description: "Run an avatar on a show floor with unreliable Wi-Fi: a Linux PC with no GPU, the local conversation brain, a setup checklist, and fully offline for halls with no internet."
section: deploy
group: "Use cases"
order: 30
type: guide
llms: deploy
searchTitle: "Events and trade shows: a booth avatar on unreliable Wi-Fi"
claims: ["S3", "S4", "S6", "S10", "S20", "S21"]
next: ["/build/kiosk", "/deploy/cpu", "/deploy/offline"]
---

A booth avatar that greets visitors, answers questions about your product and hands them to your staff. It renders on a machine at the booth, so its video does not travel over the hall's network.

## Where it runs

A Linux PC with no GPU (x86_64 or arm64) or a Mac with Apple silicon, running the CLI. Both models run live on a standard Linux PC with no GPU; how fast each one renders is on [Performance](/performance). The step-by-step setup is [Kiosk on a Linux PC](/build/kiosk).

## When the Wi-Fi is weak

- **The avatar renders at the booth.** When the avatar renders on your hardware, its audio and video stay there.
- **Keep the conversation at the booth too:** the CLI's [local conversation brain](/platforms/cli/local-brain) (`BITHUMAN_LOCAL=1`) runs speech recognition, the language model and the voice on the machine. The session still reports usage online.
- **Network drops:** a session checks your API secret when it starts and keeps rendering through a network drop of up to 5 minutes.
- **No internet in the hall at all:** [Fully offline](/deploy/offline), on the Business and Enterprise plans.

## Setup checklist

1. **Before the show:** create the avatar and write its [persona](/build/persona). Creating the avatar from a portrait happens in the bitHuman cloud.
2. **On a good connection:** on the booth machine, run `bithuman pull $AGENT_CODE`, then `bithuman run` once with the conversation brain you will use, so the avatar and the brain are on the machine.
3. **Its own API secret:** give the booth a secret of its own, so you can revoke it after the show ([API secrets](https://www.bithuman.ai/developer/api-keys)).
4. **At the booth:** test the microphone with the hall's noise, and show the avatar full screen in Chrome's kiosk mode ([Kiosk on a Linux PC](/build/kiosk#show-it-full-screen)).
5. **When the hall closes:** stop the avatar. A session bills while it runs, talking or idle.

## What it costs

```price
cpu
```

## Share it with your team

The overviews on bithuman.ai: [AI avatars for trade shows, museums and kiosks](https://www.bithuman.ai/use-cases/trade-shows-kiosks) and [Enterprise](https://www.bithuman.ai/enterprise).
