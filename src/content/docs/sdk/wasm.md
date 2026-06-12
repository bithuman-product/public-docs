---
title: "WebAssembly (Browser)"
description: "The status of bitHuman in the browser: an engine-internal Emscripten beachhead, plus where the production browser renderer actually lives."
section: sdk
group: "Languages"
order: 14
label: "WebAssembly"
---

> **Preview / internal** — the in-repo WebAssembly build is an engine-internal
> beachhead, not a production browser SDK. Read this before assuming you can drop
> a `libessence` WASM bundle into a page.

## What the in-repo WASM actually is

The WebAssembly target in this repo is an **Emscripten beachhead** for the engine —
an early, internal port that compiles a narrow slice of `libessence` to WASM:

- **Auth + heartbeat** — the licensing/billing loop, so the engine can run under
  the same metering as native.
- **Mel** — the mel-spectrogram front-end for audio.
- **KNN** — the nearest-neighbour lookup used in the frame pipeline.

It does **not** ship the full client-side render pipeline as a supported,
installable browser SDK. Treat it as preview/internal plumbing, not a product
surface you build against today.

## Where the production browser renderer lives

The production, browser-based avatar renderer is **not** this WASM build — it
lives in the platform, in **agent-ui**. If you want a talking agent rendering in a
browser today, use the platform embed rather than a hand-rolled `libessence` WASM
bundle:

```html
<iframe
  src="https://bithuman.ai/embed/A74NWD9723"
  allow="microphone *; autoplay *"
  style="width:100%;height:100%;border:0">
</iframe>
```

The embed is driven by the platform's agent-ui renderer. See the
[Browser rendering guide](/guides/browser-rendering) for the embed and
cross-origin-isolation setup.

## Requirements (for the internal WASM build)

If you are working on the engine-internal beachhead itself:

- A modern browser with **WebAssembly SIMD** (recent Chrome, Firefox, Safari).
- **`SharedArrayBuffer`** — the page must be cross-origin isolated, so serve:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## See also

For a supported render path today, use a server-rendered or native target:
[Python](/sdk/python), [Swift](/sdk/swift), or [Android](/sdk/android), or the
platform embed via the [Browser rendering guide](/guides/browser-rendering).
