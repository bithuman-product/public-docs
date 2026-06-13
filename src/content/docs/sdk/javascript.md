---
title: "JavaScript / TypeScript SDK"
description: "A cloud client SDK for browser and Node — @bithuman/sdk talks to a served or cloud avatar over LiveKit. Preview."
section: sdk
group: "Languages"
order: 13
---

## Overview

`@bithuman/sdk` is the JavaScript / TypeScript client. It is **not** a local
avatar engine — the engine runs on the server. The SDK talks to a self-hosted
avatar server (started with `bithuman-serve`) or the bitHuman cloud over LiveKit
and handles dispatch, the room join, audio push, and an async-iterator over
avatar frames.

> **Warning** This SDK is **Preview (v0.1)**. Auth, dispatch, and the session
> lifecycle work today. Frame payloads coming through the LiveKit data channel
> are a **placeholder** in this release — treat `frame.pixels` as opaque bytes.
> v0.2 will subscribe to the avatar participant's video track and yield real
> RGBA frames.

The API shape mirrors the [Python SDK](/sdk/python)'s `AsyncBithuman`, so docs
and examples translate 1:1.

## Install

> **Note** `@bithuman/sdk` is **not yet published to npm** — `npm install
> @bithuman/sdk` will 404 today. While it's in preview, install it from source
> (clone the SDK and `npm pack`/link the `sdks/javascript` package) or watch the
> [changelog](/changelog) for the npm release. The command below is the form the
> published package will take:

```bash
npm install @bithuman/sdk
```

Auth: provide your API secret as `apiSecret`. Get one at [Developer → API
Keys](https://www.bithuman.ai/#developer).

## Quick start

```ts
import { AsyncBithuman } from "@bithuman/sdk";

const avatar = await AsyncBithuman.create({
  apiSecret: process.env.BITHUMAN_API_SECRET!,
  avatarId: "modern-court-jester",
});

await avatar.pushAudio(audioChunk, { lastChunk: true });
for await (const frame of avatar.run()) {
  // render frame.pixels to canvas / save to disk (opaque bytes in v0.1)
}
await avatar.stop();
```

This is the cloud-client expression of the [audio-streaming push/drain
loop](/concepts/audio-streaming): push 16-bit PCM, iterate frames, stop.

## What it does

A thin client over LiveKit. It handles:

- `/launch` dispatch with your `api-secret`
- LiveKit room join (browser and Node)
- Audio push and end-of-speech signaling
- An async-iterator over avatar frames

Because the engine runs server-side, you need a reachable `bithuman-serve`
instance or a bitHuman cloud avatar. For self-hosting the server, see the
deployment guides; for a managed avatar, see [LiveKit](/sdk/livekit).

## Errors

Every exception extends `BithumanError` and carries a stable `code` and a docs
URL. The hierarchy mirrors the Python SDK:

```ts
import { ModelNotFoundError, BithumanError } from "@bithuman/sdk";

try {
  await AsyncBithuman.create({ apiSecret, avatarId: "bad" });
} catch (e) {
  if (e instanceof BithumanError) {
    console.log(e.code);    // "model_not_found"
    console.log(e.docsUrl); // https://docs.bithuman.ai/api/errors#model_not_found
  }
}
```

- `BithumanError`
  - `TokenError`
    - `TokenExpiredError`, `TokenValidationError`, `TokenRequestError`
    - `AccountStatusError` (HTTP 402 / 403)
  - `ModelError`
    - `ModelNotFoundError`, `ModelLoadError`, `ModelSecurityError`
  - `RuntimeNotReadyError`

## Examples

- `examples/browser/` — mic → avatar → canvas (bundler required)
- `examples/node/` — WAV file → avatar → frames on disk

## See also

- [SDK overview](/sdk) — which SDK to pick
- [Python SDK](/sdk/python) — the API this client mirrors
- [LiveKit](/sdk/livekit) — the WebRTC transport underneath
- [API reference](/api/reference) — the cloud REST API behind dispatch
