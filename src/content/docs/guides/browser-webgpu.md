---
title: "WebGPU and local browser rendering"
description: "Rendering in the browser tab instead of on our servers — the standalone runtime you can self-host, how to detect WebGPU properly, which agents can do it, and what a browser session costs."
section: guides
group: "Build"
order: 2
---

## What this page is

[Browser rendering](/guides/browser-rendering) describes the rendering modes and
how to switch them. This page covers the two ways rendering happens **in the
tab** rather than on our servers: a runtime you host yourself, and
`?render=local` on a hosted session.

---

## The standalone browser runtime

There is a **self-contained browser build you can fetch and host yourself**. It
is public, unauthenticated, and needs no SDK and no account:

```bash
curl -s https://models.bithuman.ai/web/libelevate-web-v0.1.0/manifest.json
```

The manifest lists all 17 files (~139 MB) with a SHA-256 for each, so you can
mirror it onto your own origin and verify what you serve —
[a runnable checker](/examples/browser-webgpu-check#check-1--is-the-runtime-you-fetched-the-one-we-published).
It ships a loader, the ONNX Runtime builds it needs, two renderer models, one
packaged demo identity, and `demo.html` — a working page that drives all of it.
Open `demo.html` to see it run and to measure it on your own hardware.

> **A note on the path name.** `libelevate-web` is a frozen artifact path, not a
> product name. The product names are [essence-2](/concepts/essence-2) and
> [expression-2](/concepts/expression-2).

### Is WebGPU faster here?

Sometimes, and by a lot; sometimes not at all. It depends on which renderer
model you run and on the machine. **Measure before you assume WebGPU is the fast
path** — `demo.html` gives you the numbers for your own hardware, and
[Browser — check before you ship](/examples/browser-webgpu-check#check-3--is-webgpu-actually-faster-here)
turns that into a script you can run in CI.

### The limit that matters most

This package **replays a recorded animation loop**. It is not audio-driven, and
the manifest says so:

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

It did not silently fall back to WebAssembly. **Always feature-detect by
awaiting `requestAdapter()` and checking for a non-null, non-fallback
adapter**, then pass `ep: "wasm"` yourself if it fails. Two things trip up the
obvious version of that function:

- **Retry once on `null`.** The *first* `requestAdapter()` of a browser session
  can resolve `null` while the GPU process is still starting, then return the
  real adapter on the next call. A one-shot probe reports "no WebGPU" on
  hardware that has it.
- **Check both flag locations.** Chromium moved `isFallbackAdapter` from
  `GPUAdapter` to `GPUAdapterInfo`. Reading only one of them classifies a
  software adapter as real — and on a software adapter, WebGPU is slower than
  plain WebAssembly.

```js
async function hasRealWebGPU() {
  if (!navigator.gpu) return false;
  const once = async () => {
    try { return (await navigator.gpu.requestAdapter()) ?? null; } catch { return null; }
  };
  const first = await once();
  const a = first === null ? await once() : first;   // cold-call retry
  if (!a) return false;
  return a.isFallbackAdapter !== true && a.info?.isFallbackAdapter !== true;
}
```

Getting an adapter does not guarantee every feature: `shader-f16` was not
available on one adapter we tested. Check for the features you need.

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

### Without WebGPU, local lip-sync is off

The speech step of the browser pipeline needs a real WebGPU adapter to keep up
with live speech. WebAssembly produces the same output but is far too slow for
it, so there is no WebAssembly fallback for lip-sync.

An `?render=local` session on a machine with no usable adapter does **not** go
black and does not silently revert to the cloud: rendering continues, you get
the living idle loop and the agent's speech audio, and only the local lip-sync
is off. If you need lip-sync on a browser with no WebGPU adapter, use cloud
rendering — drop the `?render=local` parameter.

### Whether it will work for *your* agent

`?render=local` needs a published per-identity web bundle. Without one the
session **falls back to cloud rendering** rather than rendering a wrong face.
Published today:

| Family | Identities published |
|---|---|
| [expression-2](/concepts/expression-2) (stylized) | **79** |
| [essence-2](/concepts/essence-2) (photoreal) | **7** (4 belong to a live agent) |

So browser-local rendering is in real shape for expression-2, and essence-2 is a
**small pilot**. For any photoreal identity outside that pilot, `?render=local`
still serves a cloud render. That is a publishing backlog, not a browser
limitation.

---

## Billing: what a browser render actually costs

Stated plainly, because "runs locally" and "is free" are not the same sentence.

**The standalone runtime is unmetered.** It performs no authentication and sends
no billing heartbeat. Nothing meters it, and nothing stops you — which also
means nothing stops anyone who mirrors it.

**A hosted `?render=local` session still bills for the conversation.** The
meter for speech-to-text, the LLM and text-to-speech starts unconditionally —
rendering mode does not affect it.

**A hosted `?render=local` session bills zero for avatar serving.** That
per-minute meter only starts when the rendering mode is `cloud`. Browser
rendering skips it, because there is no server render to charge for.

So the honest summary: **browser rendering removes the avatar-serving line item
from your bill. It does not make the session free** — you still pay for the
conversation.

**Self-hosted SDK rendering is different and *is* metered.** The Python SDK
route on [your own hardware](/guides/self-host-local) authenticates and reports
usage once a minute; without a valid key it renders nothing. Do not read this
page's browser billing as applying to that route.

---

## Where to go next

- [Browser rendering](/guides/browser-rendering) — the rendering modes and how to switch them.
- [Browser — check before you ship](/examples/browser-webgpu-check) — the checks above as runnable scripts.
- [Browser runtime (WebAssembly)](/sdk/web) — the standalone runtime's API surface.
- [Run a model on your own hardware](/guides/self-host-local) — the SDK route, per platform.
- [Pricing](/guides/pricing) — the rates behind the billing section above.
