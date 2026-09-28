---
title: "Deployment options"
description: "The avatar renders in one of four places. Pick the one that matches where your users are and what may leave their device."
section: deploy
group: "Overview"
order: 0
type: hub
claims: ["S1", "S3", "S4", "S5", "S10", "S11", "S12", "S13", "S14", "S20", "S21", "S26", "S29", "S30", "S31"]
demo: "both"
next: ["/deploy/privacy", "/pricing", "/models"]
---

Every mode uses the same avatar and the same API secret. What changes is where the avatar renders, where the conversation runs, and what reaches bitHuman.

## Compare the modes

```deploy-matrix
```

## bitHuman cloud

bitHuman renders the avatar in the US and streams it to your page, app or LiveKit room. [bitHuman cloud](/deploy/cloud)

## Your servers (self-hosted)

The CLI, Python or the LiveKit plugin on your own Mac or Linux machines. When the avatar renders on your hardware, its audio and video stay there. [Your servers](/deploy/self-hosted)

> **Note:** No GPU? Both models run live on a standard Linux PC with no GPU: [CPU only (no GPU)](/deploy/cpu).

## On the device

Essence 2 and Expression 2 render on iPhone, iPad, Mac and Android, or in a WebGPU browser tab. [On the device](/deploy/on-device)

## Fully offline

Offline license is only available to Business and Enterprise clients who want to run realtime avatars completely locally, off the internet — e.g. kiosks, trade shows, ATM machines, embedded screens. Linux and macOS computers (Apple silicon); bought in the console or through sales. [Fully offline](/deploy/offline)

## Choosing a mode

- **Building for the web, or want the fewest moving parts?** The [bitHuman cloud](/deploy/cloud), starting with the [web embed](/platforms/web).
- **Must audio and video stay on your network?** [Your servers](/deploy/self-hosted) or [on the device](/deploy/on-device), with the [local conversation brain](/platforms/cli/local-brain) or your own models. What reaches bitHuman in each: [Data flows & privacy](/deploy/privacy).
- **Want the lowest per-minute rate?** Render on the device or on your servers ([rates](/pricing)).
- **No reliable internet at the site?** [Fully offline](/deploy/offline), on the Business and Enterprise plans.
- **Planning for a branch, a clinic or a show floor?** Start from [Use cases](/deploy/use-cases).

The overview to share with your team is on bithuman.ai: [where AI avatars run](https://www.bithuman.ai/deployment).

## Try it

Talk to a sample avatar streamed from the bitHuman cloud: the same web embed a customer puts on a site.
