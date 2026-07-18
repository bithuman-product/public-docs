---
title: "Browser rendering"
description: "Move avatar rendering out of your server and into the user's tab — ONNX Runtime Web does the mel spectrogram, audio encoder, and frame compositing in WASM, so the video never leaves the machine."
section: guides
group: "Build"
order: 1
---

## ONNX in the user's tab

`rendering_mode=browser` and `rendering_mode=avatar` are two URL-toggled modes on every bitHuman agent landing page. They move the avatar rendering pipeline (mel spectrogram → ONNX audio encoder → KNN cluster lookup → frame composite) **out of your server and into the user's browser**, using ONNX Runtime Web on a WebAssembly backend. The agent worker keeps the brain (STT/LLM/TTS); the GPU on the server is free.

Production-deployed since Feb 2026. No install, no SDK call — flip one URL parameter on an existing agent landing page.

> **Which generation.** The `rendering_mode=browser` / `avatar` modes on this
> page render the first-generation **`essence-1`** avatar in WASM.
> [`essence-2`](/concepts/essence-2) has its **own** browser-local tier — append
> **`?render=local`** to a session URL to render Essence 2 in the browser
> (WebGPU on Apple Silicon and desktop-class GPUs, WASM fallback), **rolling
> out** per identity as web bundles publish. See
> [Essence 2 → In the browser](/concepts/essence-2#serving-tiers) and
> [where each model runs](/concepts/models-v2#where-each-model-runs).
> [`expression-2`](/concepts/expression-2) also renders in the browser via the
> same **`?render=local`** URL option (LiteRT.js / WebGPU, WASM fallback). It is
> a **client-side rendering option**, not a separate serving tier: it is on by
> default for an identity that has a published per-identity web bundle, and
> **falls back to cloud rendering** for identities that don't. Per-identity web
> bundles are **rolling out** — they aren't published for every identity yet, so
> for many agents `?render=local` still renders in the cloud today.

```text
# Browser-side rendering, agent brain still cloud:
https://www.bithuman.ai/<AGENT_CODE>?rendering_mode=browser

# Pure client-side puppet (mic-driven, no LiveKit, no agent worker):
https://agent.viewer.bithuman.ai/?rendering_mode=avatar&model_url=<IMX_URL>
```

[Try it on a showcase agent →](https://www.bithuman.ai/A74NWD9723?rendering_mode=browser)

## When you'd reach for it

- **Server video egress is the bottleneck.** Cloud rendering publishes H.264 over LiveKit; browser rendering publishes only the agent's TTS audio. Bandwidth drops ~10–20×.
- **You're paying for avatar GPU on the server.** Browser mode renders the avatar on the user's device, so the server runs only the conversation pipeline (speech-to-text, LLM, text-to-speech) — no avatar GPU.
- **Privacy.** The rendered video never leaves the user's machine. Useful for kiosks, healthcare, education.
- **Offline / cached.** In `avatar` mode the IMX is cached in IndexedDB after the first load. Subsequent sessions need no network for the avatar — the brain still does.
- **Cross-device parity.** The same WASM pipeline runs in Safari / Chrome / Firefox on macOS, Windows, Linux, and iOS. No per-platform native build.

## The three rendering modes

| Mode | Where avatar runs | Where brain runs | LiveKit | Audio source |
|---|---|---|---|---|
| `cloud` *(default)* | Server (H.264 video published) | Server | Yes — video track | Server TTS, server-side |
| `browser` | **Browser** (ONNX WASM, 25 FPS canvas) | Server | Yes — audio track only | Agent TTS over LiveKit audio |
| `avatar` | **Browser** (ONNX WASM, 25 FPS canvas) | None — pure puppet | No | User's microphone (getUserMedia) |

`cloud` is the production default. The new modes are opt-in via URL parameter — your existing deployments are unchanged.

## Activate it

It's a URL parameter on the agent landing page. Replace `AGENT_CODE` with your code from bithuman.ai → Developer:

```text
https://www.bithuman.ai/<AGENT_CODE>?rendering_mode=browser
```

(The short URL mints a session key and forwards you — extra parameters like
`rendering_mode` are preserved.)

For `avatar` mode (no agent worker, no LiveKit), pass the IMX model URL directly:

```text
https://agent.viewer.bithuman.ai/?rendering_mode=avatar&model_url=https://your-storage/avatar.imx
```

The browser downloads the IMX (~50–200 MB, per-agent), the ONNX audio encoder (2.7 MB, shared across all agents), then runs the lip-sync pipeline at 25 FPS on a `<canvas>`.

## What the browser does

```text
MediaStreamTrack (TTS or mic)
  -> AudioContext + AudioWorklet (16 kHz, 640-sample chunks)
  -> Mel spectrogram (80 bins x 16 frames, Bluestein FFT)
  -> ONNX audio encoder (WASM, 512-D embedding)
  -> KNN cluster lookup (183 clusters, L2 distance)
  -> Frame composite (base frame + mouth patch, alpha-blended)
  -> <canvas> @ 25 FPS
```

The pipeline is bit-compatible with [`libessence`](/concepts/architecture) on the server — same `.imx` file, same cluster centroids, same encoder weights. The browser just runs the inference loop in WASM.

## Latency budget

40 ms per frame (25 FPS) on a modest laptop:

| Stage | Typical |
|---|---|
| Mel FFT | 5–10 ms |
| ONNX encoder (WASM) | 10–20 ms |
| KNN lookup + composite | 5–10 ms |

Network adds the LiveKit audio-track RTT in `browser` mode (typically 50–150 ms one-way to the nearest LiveKit edge). In `avatar` mode there's no network in the loop at all once the IMX is cached.

## Browser requirements

- **SharedArrayBuffer** for ONNX Runtime Web multi-threading. Your page needs both `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` (or `require-corp`) headers. The bitHuman-hosted landing page is already configured.
- **WebAssembly** + `AudioWorklet` — all current Safari, Chrome, Firefox, Edge.
- **IndexedDB** — ~50–200 MB of free quota for the IMX cache (per-agent).
- **`requestVideoFrameCallback`** for smooth frame pacing (optional — the pipeline falls back to `requestAnimationFrame` on older Safari).

## Cloud vs browser vs avatar — side by side

| | **cloud** | **browser** | **avatar** |
|---|---|---|---|
| Server avatar GPU | yes | **no** | none |
| Server brain (STT/LLM/TTS) | yes | yes | none |
| LiveKit subscription | video + audio | **audio only** | none |
| Browser ML work | none | mel + ONNX + composite | mel + ONNX + composite |
| Server → browser bandwidth | 0.5–2 Mbps video | 32–64 kbps audio | 0 |
| Offline-capable | no | partial (brain still needs net) | **yes (post-cache)** |
| Setup | cloud session | append `?rendering_mode=browser` | append `?rendering_mode=avatar&model_url=…` |

## Try it

- [Showcase agent — browser mode](https://www.bithuman.ai/A74NWD9723?rendering_mode=browser) — server brain, client-rendered avatar.
- [Showcase agent — cloud mode](https://www.bithuman.ai/A74NWD9723) — for comparison.

## A standalone JS/TS SDK is coming

The browser pipeline is currently distributed via the hosted agent-landing page only. A standalone JS/TS SDK that wraps the same pipeline for embedding in your own React / Vue / vanilla app is in **Preview** — track or comment in [Discord](https://discord.gg/ES953n7bPA).

## Where to go next

- [Architecture](/concepts/architecture) — how `libessence` powers every renderer.
- [Audio streaming](/concepts/audio-streaming) — the same push/drain pattern the WASM pipeline mirrors.
- [Deploy embed](/guides/deploy-embed) — drop a hosted avatar onto any page.
