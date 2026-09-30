---
title: "Any character, live, rendered on the user's device"
description: "Essence 2 and Expression 2 render on phones, Macs, Linux and in the browser."
section: overview
group: "Resources"
order: 31
type: guide
llms: none
searchTitle: "News: any character, live, rendered on the user's device"
models: ["essence-2", "expression-2"]
next: ["/performance", "/examples", "/start"]
parent: /news
---

Published 2026-09-29.

Expression 2 animates any character from one portrait and renders it live on iPhone, iPad, Android, Mac, Linux or in a browser tab with WebGPU.

bitHuman has two current models: Essence 2 renders a photoreal person from one portrait; Expression 2 renders any character (people, animals, cartoons) from one portrait.

## Where it renders

Essence 2 and Expression 2 render on the device: iPhone, iPad and Mac (Swift package), Android arm64 (Android SDK), macOS on Apple silicon and Linux x86_64/arm64 (CLI, Python SDK), and in a browser tab with WebGPU. Both models run live on a standard Linux PC with no GPU.

Android, and Essence 2 on iPhone and iPad, need a physical device, not an emulator or the Simulator.

## How fast it renders

Every configuration we publish renders faster than real time, including 10-minute sustained runs on iPhone 15 and Samsung Galaxy S25+.

```perf
iphone-15 iphone-15-sustained android-s25plus android-s25plus-sustained linux-cpu web
```

In Chrome on an Apple M4 with WebGPU, the figure is the engine's render speed in the tab, not the frame rate a visitor sees. Every configuration, and how we measure it: [Performance](/performance).

## Your app keeps the conversation

The Swift and Android SDKs render: your app passes in 16 kHz mono speech from any voice stack and draws the frames, so the persona, the voice and the language model are yours to choose.

When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text.

## On a web page

With `render=local` the web embed renders the avatar in the visitor's browser tab with WebGPU; a browser without a usable GPU is switched to cloud rendering, so every visitor gets lip-sync. With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`). The embed and its options: [Web: embed and WebGPU](/platforms/web).

## Build with it

Ways to build: the Swift package (iOS, iPadOS, macOS), the Android SDK (Maven Central), the Python SDK (bithuman), the CLI with a built-in MCP server, the LiveKit Agents plugin, the Flutter plugin, the web embed and the REST API.

The bitHuman CLI includes an MCP server: `claude mcp add bithuman -- bithuman mcp`. Setup for Claude, Cursor and other MCP clients: [Claude & Cursor (MCP)](/build/mcp).

Sample avatars you can try without an account: Essence 2 `sofia-ramirez` and Expression 2 `wise-pup`. Talk to one in the [quickstart](/start).

## Price

Credits pay for active session time, talking or idle, by the exact second. The rate for each mode and the plans: [Pricing](/pricing).
