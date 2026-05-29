---
title: "WebAssembly (Browser)"
description: "Run bitHuman visual agents entirely in the browser with WebAssembly — the avatar renders on the user's machine, no server GPU required."
section: sdk
group: "Languages"
order: 14
label: "WebAssembly"
---

> **New** — the WebAssembly runtime lets a bitHuman agent render **fully client-side**, in any modern browser.

## What it is

The bitHuman engine (`libessence`) is compiled to **WebAssembly**, so the entire avatar
pipeline — mel spectrogram → audio encoder → frame compositing — runs **in the user's tab**,
in realtime, on a `<canvas>` (via [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
on a WASM backend, with SIMD). The avatar video never leaves the device, and your server's GPU
stays free.

This is the same [Essence](/concepts/models) model you run on-device elsewhere — now in the browser.

## Two modes

| Mode | What the server does | What the browser does | Use it for |
|---|---|---|---|
| **Browser** `rendering_mode=browser` | Runs the conversation brain (STT / LLM / TTS) and streams audio over LiveKit | Renders the lip-synced face locally | Offloading render cost while keeping a cloud brain |
| **Avatar** `rendering_mode=avatar` | Nothing | Mic-driven puppet, fully client-side; `.imx` cached in IndexedDB | Pure-client, offline-capable demos |

## Quickstart

The fastest path is the embed, with the rendering mode set in the URL:

```html
<iframe
  src="https://agent.viewer.bithuman.ai/api/embed/A74NWD9723?rendering_mode=browser"
  allow="microphone; autoplay"
  style="width:100%;height:100%;border:0">
</iframe>
```

## Requirements

- A modern browser with **WebAssembly SIMD** (recent Chrome, Firefox, Safari).
- **`SharedArrayBuffer`** — your page must be cross-origin isolated, so serve these headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- A one-time model download per identity, cached in **IndexedDB** for instant reloads and offline use.

## When to use it

- **Cost** — rendering happens on the client, so a single server can drive far more sessions.
- **Privacy** — the rendered video stays on the user's machine.
- **Scale & reach** — ship a talking agent to anyone with a browser, no install.

See the full [Browser rendering guide](/guides/browser-rendering) for the pipeline internals and
the cross-origin-isolation setup. For a server-rendered or native path instead, see
[Python](/sdk/python), [Swift](/sdk/swift), or [Android](/sdk/android).
