---
title: "Browser rendering"
description: "Move avatar rendering out of your server and into the user's tab — ONNX Runtime Web does the whole render in WASM, so the video never leaves the machine."
section: guides
group: "Build"
order: 1
---

## Rendering in the user's tab

Browser rendering moves the avatar **out of your server and into the user's
browser**. The agent worker keeps the brain (speech-to-text, LLM,
text-to-speech); the GPU on the server is free.

Production-deployed since Feb 2026. No install, no SDK call — flip one URL
parameter on an existing agent landing page.

### One switch, and the model picks the renderer

There is **one** browser-rendering switch, spelled two ways:

| You append | What the viewer does |
|---|---|
| `?render=local` | the short alias — sets rendering mode `browser` |
| `?rendering_mode=browser` | the long form of the same thing, kept for saved links |
| `?render=cloud` / nothing | cloud rendering, the default for every visitor |
| `?rendering_mode=avatar` | the third mode: a pure client-side puppet, no LiveKit and no agent worker |

`?render=local` is **not a second, Essence-2-only tier**. It is the same code
path: the viewer reads `render` first and maps `local` → `browser`, then falls
back to reading `rendering_mode`. An earlier version of this page described
`rendering_mode=browser` as the first-generation WASM path and `?render=local`
as a separate Essence 2 tier. That was wrong in a way that matters, because it
implied the parameter chooses the engine.

**The parameter chooses nothing but "render here". The agent's model chooses
the renderer**, and the four families answer differently:

| Model | Browser renderer | Backends it runs on | What you get without one |
|---|---|---|---|
| [expression-2](/concepts/expression-2) | **yes** — its own web engine | **WebGPU** when a real (non-fallback) adapter is grantable, otherwise **WASM** (one of two WASM tiers, picked by a capability gate) | a missing per-identity bundle or an unsupported browser falls back to **cloud** rendering |
| [essence-2](/concepts/essence-2) | **yes** — its own web engine | **WebGPU and WASM** — WebGPU carries the speech encoder, WASM the frame generator by default, with WebGL2 paste-back | same: falls back to **cloud** rendering |
| [essence-1](/concepts/essence-1) | **yes** — the `.imx` pipeline this page's transcripts describe | **WASM only.** The runner asks for the `wasm` execution provider and no other; there is no WebGPU path for it | nothing to fall back to — with no `.imx` on the agent the viewer says so |
| [expression-1](/concepts/expression-1) | **no** | — | the viewer shows *"In-browser rendering isn't available for this model yet — remove ?render=local (or use ?render=cloud)"*. It does **not** silently cloud-render, and this is not a rollout gap: expression-1 is [GPU-only](/concepts/expression-1) |

Two consequences worth planning around:

- **Opt-in, always.** Cloud rendering is the default for every visitor, every
  identity and every browser. Nobody gets a browser render unless the URL asks.
- **Per-identity web bundles are still rolling out** for the second generation,
  so for many agents `?render=local` renders in the cloud today. Which
  identities have one, and how to check yours, is on
  [WebGPU and local browser rendering](/guides/browser-webgpu#whether-it-will-work-for-your-agent).

```text
# Browser-side rendering, agent brain still cloud — either spelling:
https://www.bithuman.ai/<AGENT_CODE>?render=local
https://www.bithuman.ai/<AGENT_CODE>?rendering_mode=browser

# Pure client-side puppet (mic-driven, no LiveKit, no agent worker):
https://www.bithuman.ai/<AGENT_CODE>?rendering_mode=avatar
```

> ★ **Start every one of these on `www.bithuman.ai`.** That host mints the
> session key and forwards you to the viewer **carrying the rendering-mode
> parameter with it**; the viewer host does not mint one. Observed 2026-09-06:
> `https://www.bithuman.ai/<CODE>?rendering_mode=browser` answers `302` to
> `https://agent.viewer.bithuman.ai/<CODE>?s=…&rendering_mode=browser`.
> [Full detail, and the instruction this replaced](#activate-it).

[Try it on a showcase agent →](https://www.bithuman.ai/A74NWD9723?rendering_mode=browser)

> **WebGPU is not "the fast path" for `?render=local`, and there is no automatic
> WASM fallback under it.** Essence 2 runs on **ONNX Runtime Web's
> `wasm` provider by default**; WebGPU's job in the shipped path is the **speech
> encoder**, and paste-back is **WebGL2**. Which stage runs on which backend,
> the measured frame rates, and the `navigator.gpu`-exists-but-no-adapter
> failure mode are all on
> [WebGPU and local browser rendering](/guides/browser-webgpu) — that page is
> the single source for those numbers. To check any of it on your own machine,
> run [Browser — check before you ship](/examples/browser-webgpu-check).

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
| `browser` *(= `?render=local`)* | **Browser**, 25 FPS canvas — which engine and which backend depends on the agent's model, see the table above | Server | Yes — audio track only | Agent TTS over LiveKit audio |
| `avatar` | **Browser**, 25 FPS canvas | None — pure puppet | No | User's microphone (getUserMedia) |

`cloud` is the production default. The new modes are opt-in via URL parameter — your existing deployments are unchanged.

## Activate it

It's a URL parameter on the agent landing page. Replace `AGENT_CODE` with your code from bithuman.ai → Developer:

```text
https://www.bithuman.ai/<AGENT_CODE>?rendering_mode=browser
```

(The short URL mints a session key and forwards you. It preserves a **named** set
of parameters, not everything you append: the rendering-mode switches
`rendering_mode`, `render` and `compute` all survive the hop, alongside `model`,
`deployment`, `greetingLang`, `greetingMsg` and the transparent-embed options. A
parameter outside that set is dropped silently.)

> ★ **`www.bithuman.ai/<AGENT_CODE>` is the entry point. Put your parameters
> there, not on the viewer host.**
>
> This is the rule regardless of how the hosts are wired on the day you read it,
> and it is the rule because `www` is the only one of the two that **mints the
> session**: it issues the session key, then forwards you to the viewer with the
> rendering-mode parameter attached. A URL that starts at the viewer has no
> session behind it and must go back to `www` to get one.
>
> This page used to end the paragraph above with *"if you need one to reach the
> viewer, use the `agent.viewer.bithuman.ai` URL directly"*. **That instruction
> was withdrawn on 2026-09-06** because following it produced a plain **cloud**
> render: the observed redirect that day sent the viewer host back to `www`
> without the query string, so the mode never arrived.
>
> ```text
> observed 2026-09-06 — the reason the old instruction was withdrawn
> GET https://agent.viewer.bithuman.ai/<CODE>?rendering_mode=browser
>   -> 302  https://www.bithuman.ai/<CODE>          # query string dropped
> GET https://www.bithuman.ai/<CODE>?rendering_mode=browser
>   -> 302  https://agent.viewer.bithuman.ai/<CODE>?s=...&rendering_mode=browser
> ```
>
> Treat that transcript as a dated observation, not a contract. The
> viewer-host redirect may well be made to preserve the query string — and even
> once it is, starting on `www` is still what you should do, because the session
> key is minted there and only there. Nothing above changes.

For `avatar` mode (no agent worker, no LiveKit), use the same landing page with
the agent's own code:

```text
https://www.bithuman.ai/<AGENT_CODE>?rendering_mode=avatar
```

The mode resolves the agent's own model file — there is **no `model_url`
parameter**. Earlier revisions of this page printed
`agent.viewer.bithuman.ai/?rendering_mode=avatar&model_url=<IMX_URL>`; nothing
in the shipped viewer reads `model_url`, and the short URL does not forward it
either. To puppet an `.imx` you host yourself, [get in
touch](mailto:hello@bithuman.ai) rather than building on that parameter.

The browser downloads the model (~50–200 MB, per-agent), the audio encoder
(2.7 MB, shared across all agents), then runs the lip-sync pipeline at 25 FPS on
a `<canvas>`.

## What the browser does

```text
MediaStreamTrack (TTS or mic)
  -> AudioContext + AudioWorklet (16 kHz, 640-sample chunks)
  -> Mel spectrogram (80 bins x 16 frames, Bluestein FFT)
  -> ONNX audio encoder (WASM, 512-D embedding)
  -> KNN cluster lookup (183 clusters, L2 distance)
  -> Frame assembly (base frame + mouth patch, alpha-blended)
  -> <canvas> @ 25 FPS
```

That is the [essence-1](/concepts/essence-1) pipeline specifically, and it is bit-compatible with [the same engine](/concepts/architecture) on the server — same `.imx` file, same cluster centroids, same encoder weights. The browser just runs the inference loop in WASM. [essence-2](/concepts/essence-2) and [expression-2](/concepts/expression-2) run their own web engines with a different stage list; see [WebGPU and local browser rendering](/guides/browser-webgpu#what-runs-where).

## Latency budget

40 ms per frame (25 FPS) on a modest laptop:

| Stage | Typical |
|---|---|
| Mel FFT | 5–10 ms |
| ONNX encoder (WASM) | 10–20 ms |
| KNN lookup + frame assembly | 5–10 ms |

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
| Browser ML work | none | the whole render | the whole render |
| Server → browser bandwidth | 0.5–2 Mbps video | 32–64 kbps audio | 0 |
| Offline-capable | no | partial (brain still needs net) | **yes (post-cache)** |
| Setup | cloud session | append `?render=local` (or `?rendering_mode=browser`) | append `?rendering_mode=avatar` |

## Try it

- [Showcase agent — browser mode](https://www.bithuman.ai/A74NWD9723?rendering_mode=browser) — server brain, client-rendered avatar.
- [Showcase agent — cloud mode](https://www.bithuman.ai/A74NWD9723) — for comparison.

## Embedding it in your own app

Two different things, and only one of them exists today.

**The Essence 2 renderer is downloadable now.** A self-contained ES module you
can host yourself is published as static files — no npm, no bundler, no account.
It is **frames-driven**: you supply per-frame keypoints, it renders faces, and
the audio→keypoints stage is not in the package. See
[Browser runtime (WebAssembly)](/sdk/wasm) for `createAvatar` and the rest of
the API.

**A JS/TS SDK that wraps a full hosted session is not.** `@bithuman/sdk` — the
client that would drive a cloud or self-hosted avatar over LiveKit from your own
React / Vue / vanilla app — is **not published to npm** yet. To build a browser
integration against a hosted session today, drive
[LiveKit](/sdk/livekit) directly, or use the hosted landing page with a
rendering-mode parameter. Track it in
[Discord](https://discord.gg/ES953n7bPA).

## Where to go next

- [WebGPU and local browser rendering](/guides/browser-webgpu) — measured WebGPU vs WASM frame rates, the standalone runtime you can self-host, which identities have a published web bundle, and what a browser session does and does not meter.
- [Browser — check before you ship](/examples/browser-webgpu-check) — three runnable preflights, each with a deliberately broken control arm: bundle integrity, the real-WebGPU probe, and the execution-provider benchmark.
- [Browser runtime (WebAssembly)](/sdk/wasm) — the published runtime's API surface.
- [Architecture](/concepts/architecture) — how the essence engine powers every renderer.
- [Audio streaming](/concepts/audio-streaming) — the same push/drain pattern the WASM pipeline mirrors.
- [Deploy embed](/guides/deploy-embed) — drop a hosted avatar onto any page.
