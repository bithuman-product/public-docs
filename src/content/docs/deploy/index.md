---
title: "Deployment options"
description: "Where a bitHuman avatar renders and where its conversation runs: bitHuman cloud, your servers, on the device, CPU only (no GPU) or fully offline, and what reaches bitHuman in each."
section: deploy
group: "Overview"
order: 0
type: hub
claims: ["S1", "S3", "S4", "S5", "S10", "S11", "S12", "S13", "S14", "S20", "S21", "S29", "S30", "S31", "S32"]
demo: "both"
next: ["/deploy/self-hosted", "/pricing", "/models"]
---

Every mode uses the same avatar and the same API secret. What changes is where the avatar renders, where the conversation runs, and what reaches bitHuman.

## Compare the modes

| | bitHuman cloud | Your servers | On the device | Fully offline |
|---|---|---|---|---|
| **The avatar renders** | on bitHuman's servers, in the US | on your Mac or Linux machines | on the phone, tablet or Mac in front of the user, or in a WebGPU browser tab | on your Linux PCs and terminals |
| **The conversation runs** | on bitHuman's voice service, or with your provider keys | your choice: the local conversation brain, your services or bitHuman's | your app's choice; with the web embed, on bitHuman's servers | [see below](#fully-offline) |
| **What reaches bitHuman** | the session's audio and conversation, to run it | a credential check, the avatar download, and usage reports with no audio, video or text | the same as your servers, with your own voice and language services | [see below](#fully-offline) |
| **Network** | required | to start; rendering continues through a drop of up to 5 minutes | the same as your servers | off the internet |
| **Models** | Essence 2, Expression 2, Essence 1, Expression 1 | Essence 2, Expression 2; Essence 1 on the CLI and Python | Essence 2, Expression 2 | Essence 1, Essence 2, Expression 2 |
| **Plan** | Creator plan or higher | Creator plan or higher | Creator plan or higher | Business & Enterprise |

Every mode bills active session time, talking or idle, to the second. The rates are on [Pricing and credits](/pricing).

## bitHuman cloud

bitHuman renders the avatar on its servers and streams it to the page, the app or the LiveKit room. Start with the [web embed](/platforms/web), the [REST API](/platforms/rest) or a [cloud avatar in your room](/api/cloud-avatar). Concurrent cloud sessions are limited per plan ([Pricing and credits](/pricing)).

## Your servers (self-hosted)

Run the [CLI](/platforms/cli), the [Python SDK](/platforms/python) or the [LiveKit plugin](/platforms/livekit) on your own machines. When the avatar renders on your hardware, its audio and video stay there. Setup, networking and the credential rules are on [Your servers (self-hosted)](/deploy/self-hosted).

## On the device

Essence 2 and Expression 2 render on iPhone, iPad and Mac with the [Swift package](/platforms/ios), on Android arm64 with the [Android SDK](/platforms/android), and in the browser with [WebGPU](/platforms/web), falling back to cloud rendering without it. iPhone, iPad and Android need a physical device, not a simulator or an emulator.

When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text.

## CPU only (no GPU)

Both models run live on a standard Linux PC with no GPU, with the [CLI](/platforms/cli) or [Python](/platforms/python). The measured speed on an Intel desktop CPU is on [Performance](/performance#desktop).

## Fully offline

Offline license is only available to Business and Enterprise clients who want to run realtime avatars completely locally, off the internet — e.g. kiosks, trade shows, ATM machines, embedded screens. Linux PCs and terminals; arranged through sales.

- **Models:** Essence 1, Essence 2 and Expression 2.
- **Creation is online:** you create the avatar from a portrait in the bitHuman cloud; the finished avatar model then runs on your machines.
- **Not file rendering:** `bithuman render` writes a video file and signs in online; it needs no offline license.

[Contact sales](https://www.bithuman.ai/sales) · [Offline licensing on the pricing page](/pricing#offline-licensing)

## Choosing a mode

- **Building for the web, or want the fewest moving parts?** Start in the bitHuman cloud with the [web embed](/platforms/web).
- **Want the conversation to stay on your network?** Render on [your servers](#your-servers-self-hosted) or [on the device](#on-the-device), with the CLI's [local conversation brain](/platforms/cli/local-brain) or your own models.
- **Want the lowest per-minute rate?** Render on the device or on your servers ([rates](/pricing)).
- **No reliable internet at the site?** [Fully offline](#fully-offline), on the Business and Enterprise plans.

## Try it

Talk to a sample avatar streamed from the bitHuman cloud: the same web embed a customer puts on a site.
