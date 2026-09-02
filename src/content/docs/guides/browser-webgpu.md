---
title: "WebGPU and local browser rendering"
description: "What the browser path actually runs today — the standalone runtime you can self-host, measured WebGPU vs WASM frame rates, which identities have a published web bundle, and whether a browser session meters."
section: guides
group: "Build"
order: 2
---

## What this page is

[Browser rendering](/guides/browser-rendering) describes the rendering modes.
This page is the **measured** companion: every number below was produced by
running the thing being described, on 2026-09-02, and the commands to reproduce
each one are included. Where something could not be run, it says so instead of
estimating.

Test host for every measurement on this page: Linux x86_64, 32 logical cores,
NVIDIA RTX 4090, headless Chrome 149 with ANGLE/Vulkan. Your numbers will
differ — treat these as one honest data point, not a spec.

---

## The standalone browser runtime

There is a **self-contained browser build you can fetch and host yourself**. It
is public, unauthenticated, and needs no SDK and no account:

```bash
curl -s https://models.bithuman.ai/web/libelevate-web-v0.1.0/manifest.json
```

The manifest lists all 17 files (~139 MB total) with a SHA-256 for each, so you
can mirror it onto your own origin and verify what you serve. It ships:

- `index.js` — the loader (`createAvatar`)
- `ort/` — onnxruntime-web, both the plain and the WebGPU-capable (`jsep`) WASM builds
- `models/` — two director graphs, `m4b` (quality) and `m3c2` (speed)
- `identity/` — one packaged demo identity
- `demo.html` — a working page that drives all of it

> **A note on the path name.** `libelevate-web` is a frozen artifact path, not a
> product name. The product names are [essence-2](/concepts/essence-2) and
> [expression-2](/concepts/expression-2).

### Measured: WebGPU vs WASM

Run against the published `demo.html`, 4 threads, cross-origin isolated,
EMA settled over 12 s of uncapped rendering:

| Director | Execution provider | FPS | NN time/frame | Load |
|---|---|---|---|---|
| `m4b` (quality) | **WebGPU** | **23.1** | 40.3 ms | 5.1 s |
| `m4b` (quality) | WASM, 4 threads | 10.8 | 85.7 ms | 3.7 s |
| `m3c2` (speed) | **WebGPU** | **26.0** | 38.1 ms | 5.3 s |
| `m3c2` (speed) | WASM, 4 threads | 26.9 | 29.8 ms | 3.4 s |

Two things worth knowing before you reach for WebGPU:

- **On the quality director, WebGPU is worth ~2.1×** (23.1 vs 10.8 FPS).
- **On the speed director, WebGPU bought nothing here** — 26.0 FPS on WebGPU
  against 26.9 FPS on 4-thread WASM. The graph is small enough that dispatch
  overhead cancels the win. Measure before assuming WebGPU is the fast path.

Reproduce any row by opening the demo with the matching query parameters:

```text
https://models.bithuman.ai/web/libelevate-web-v0.1.0/demo.html?model=m4b&ep=webgpu&threads=4
```

The page exposes its running average as `window.__fps`, so it drives cleanly
from Playwright or Puppeteer.

### The limit that matters most

This package **replays a recorded 537-frame keypoint loop**. It is not
audio-driven. The manifest states it plainly:

```json
"out_of_scope": "live audio-driven actor (native engine only); frames-driven kp input required"
```

So the standalone runtime is the right tool for evaluating render quality and
speed in a browser. It is **not** a lip-sync engine on its own — for
audio-driven rendering in a tab, use `?render=local` on a hosted session
(below).

### WebGPU feature detection — the trap

`navigator.gpu` being present does **not** mean WebGPU works. On a machine with
no usable adapter, `navigator.gpu` was still defined, `requestAdapter()`
returned `null`, and the runtime **hard-failed**:

```text
no available backend found. ERR: [webgpu] Error: Failed to get GPU adapter.
```

It did not silently fall back to WASM. **Always feature-detect by awaiting
`requestAdapter()` and checking for a non-null, non-fallback adapter**, then
pass `ep: "wasm"` yourself if it fails:

```js
async function hasRealWebGPU() {
  if (!navigator.gpu) return false;
  const a = await navigator.gpu.requestAdapter();
  return !!a && a.isFallbackAdapter !== true;
}
```

Also measured on the adapter this host granted: `shader-f16` was **not**
available. Do not assume fp16 support just because you got an adapter.

### Headless CI: the launcher decides whether you get a GPU

On one host, with one Chrome binary and one set of flags, a WebGPU adapter was
granted under one headless launcher and came back `null` under another. If your
CI reports "no GPU adapter" on a machine that demonstrably has one, suspect the
launch configuration before the driver. Verify with a tiny page that prints
`(await navigator.gpu.requestAdapter())` and run it in your real CI harness.

---

## `?render=local` on a hosted session

This is the audio-driven browser path. It is **opt-in per URL** — cloud
rendering stays the default for every visitor.

### What runs where

The browser path is not "one model on WebGPU". Different stages use different
backends by design:

| Stage | Backend |
|---|---|
| Speech encoder (w2v) | **WebGPU** — the default; WASM exists only as a dev hook |
| Audio-to-motion encoder/decoder | **WASM** (pinned) |
| Director / frame generator | **WASM** by default; WebGPU is opt-in |
| Paste-back composite (unsharp → warp → feather blend) | **WebGL2** |

The paste-back backend was confirmed by instrumenting a real run, which
reported `paste_backend: "webgl2"`. Note the shape of this: **WebGPU's job in
the shipped path is the speech encoder, not the frame generator.**

### Whether it will work for *your* agent

`?render=local` needs a published per-identity web bundle. Without one the
session **falls back to cloud rendering** rather than rendering a wrong face.

Probing the public bundle mirror for 49 real agent codes on 2026-09-02:

| Family | Codes probed | Bundle published |
|---|---|---|
| [expression-2](/concepts/expression-2) (stylized) | 49 | **40** |
| [essence-2](/concepts/essence-2) (photoreal) | 49 | **1** |

A control code that does not exist returned "not found" on both, so the probe
distinguishes present from absent.

**Read that table before planning around it.** Browser-local rendering is in
real shape for expression-2 and is effectively **a single-identity preview for
essence-2** today. For any other photoreal identity, `?render=local` will serve
a cloud render. This is a publishing backlog, not a browser limitation — the one
published photoreal bundle carries a complete set of members and loads fine.

---

## Billing: what a browser render actually costs

Stated plainly, because "runs locally" and "is free" are not the same sentence.

**The standalone runtime is unmetered.** It was run with no API key, no account
and no credential of any kind, and it rendered. It performs no authentication
and sends no billing heartbeat. **Nothing meters, and nothing stops you** —
which also means nothing stops anyone who mirrors it.

**A hosted `?render=local` session still bills for the conversation.** The
session heartbeat that meters speech-to-text, the LLM and text-to-speech starts
unconditionally — rendering mode does not affect it.

**A hosted `?render=local` session bills zero for avatar serving.** The
per-minute avatar-serving meter only starts when the rendering mode is `cloud`.
Browser rendering skips it, because there is no server render to charge for.

So the honest summary: **browser rendering removes the avatar-serving line item
from your bill. It does not make the session free** — you still pay for the
conversation.

**Self-hosted SDK rendering is different and *is* metered.** The Python SDK
route on [your own hardware](/guides/self-host-local) authenticates and beats
once a minute; a verified render reported
`billing_type: "self-hosted-essence-2-model"` with `metered_heartbeat: true`.
Without a valid key it renders nothing. Do not read this page's browser numbers
as applying to that route.

---

## Where to go next

- [Browser rendering](/guides/browser-rendering) — the rendering modes and how to switch them.
- [Run a model on your own hardware](/guides/self-host-local) — the SDK route, per platform.
- [Pricing](/guides/pricing) — the rates behind the billing section above.
