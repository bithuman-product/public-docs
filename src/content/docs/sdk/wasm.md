---
title: "Browser runtime (WebAssembly)"
description: "The published Essence 2 browser runtime: createAvatar, the frames-driven contract, execution providers, cross-origin isolation, and what it deliberately does not do."
section: sdk
group: "Languages"
order: 14
label: "WebAssembly"
---

## What it is

A **self-contained ES-module runtime that renders an Essence 2 avatar in a
`<canvas>`**, published as static files. No install, no bundler, no account, no
API key. You import one module and call one function.

```text
https://models.bithuman.ai/web/libelevate-web-v0.1.0/index.js
```

It is the same runtime the hosted `?render=local` path uses for its frame
generator, packaged so you can host it yourself.

> **The path says `libelevate-web`. Type it exactly.** `libelevate` is a
> [retired name](/concepts/models-v2) — the product is
> [**Essence 2**](/concepts/essence-2) — but the published URL and the
> manifest's `"format": "libelevate-web-manifest-v1"` are frozen carriers and
> will not be renamed. Hiding a string you have to type would be worse than
> showing a retired one.

> **This page replaces an older one that described an "engine-internal
> Emscripten beachhead" and said no full client-side pipeline shipped.** That is
> no longer true, and the runtime below is what shipped instead.

> **The two terminal transcripts on this page were produced by running the
> command above them**, against the live URL, on 2026-09-02 (curl 8.18, Linux).
> If a line number moves, the file moved — re-run rather than trusting the
> number.

## The one limit that decides whether you can use it

**It is frames-driven, not audio-driven.** You push per-frame keypoints and it
renders faces. Audio → keypoints runs in the native engine; this package does
not contain it. The manifest says so in its own field:

```json
"out_of_scope": "live audio-driven actor (native engine only); frames-driven kp input required"
```

So:

- **Evaluating render quality and speed in a browser** — this is the right tool.
- **Driving an avatar from a microphone or a TTS stream in a tab** — it is not.
  Use [`?render=local` on a hosted session](/guides/browser-webgpu#renderlocal-on-a-hosted-session),
  which supplies the keypoint stream.
- **Your own keypoint source** — fine: 21×3 float32 per frame, ~252 bytes,
  about 50 kbit/s at 25 fps if you stream them from your own server.

## Quick start

```html
<canvas id="cv" width="512" height="512"></canvas>
<!-- only if your host cannot set COOP/COEP itself -->
<script src="./coi-serviceworker.js"></script>
<script type="module">
  import { createAvatar } from "./index.js";

  const avatar = await createAvatar({
    canvas:      document.getElementById("cv"),
    ortBase:     "./ort/",
    modelUrl:    "./models/m4b_full_mmq.onnx",
    pooled64Url: "./identity/A63GVG1577/pooled64_m4b.f16",
    videoUrl:    "./identity/A63GVG1577/p_vp9_444.webm",
    ep:          "wasm",   // default; "webgpu" is opt-in — see below
    threads:     4,
    onProgress:  (msg) => console.log(msg),
  });

  // per frame: two Float32Array(63) keypoint sets (21 x 3) + the identity index
  await avatar.renderFrame(kpDriving, kpSource, si);
</script>
```

`createAvatar` is `async` and does the whole cold start: fetch the model, fetch
the identity features, decode the identity video with WebCodecs, and create the
ONNX Runtime session.

### `createAvatar(options)`

| Option | Type | Default | Notes |
|---|---|---|---|
| `canvas` | `HTMLCanvasElement` | — | required; a 512×512 2D context is taken from it |
| `modelUrl` | string | — | required; `m4b_full_mmq.onnx` (quality) or `m3c2_full_mmq.onnx` (speed) |
| `pooled64Url` | string | — | required; **must** be the `pooled64` built by that same model |
| `videoUrl` | string | — | required; the VP9 4:4:4 identity video |
| `ortBase` | string | `"./ort/"` | where the ONNX Runtime Web files live |
| `ep` | `"wasm" \| "webgpu"` | `"wasm"` | execution provider |
| `threads` | number | `4` | WASM threads; silently clamped to 1 without cross-origin isolation |
| `onProgress` | function | no-op | called with load-stage strings |

Returns:

| Member | Notes |
|---|---|
| `renderFrame(kpDriving, kpSource, si)` | `async`; two `Float32Array(63)`, identity frame index |
| `setIdentity(si)` | switch identity frame without rendering |
| `lastNNMs` | getter — the last `session.run` time in ms |
| `numIdentities`, `ep`, `threads`, `version`, `crossOriginIsolated` | what you actually got |
| `destroy()` | `async`; releases the session |

Also exported: `decodeIdentityVideo(url)` and `demuxWebMVP9(buf)` if you want
the decoded identity frames yourself, and `VERSION`.

> **Never mix `pooled64` across models.** Each director's `pooled64` is the
> output of that director's own trained compressor. `m4b`'s features fed to
> `m3c2` is not a degraded picture, it is a wrong one. The runtime cannot detect
> it — it only checks that the identity count matches the video frame count.

## Execution providers

`ep` defaults to **`"wasm"`**, in the published file:

```bash
$ curl -fsS https://models.bithuman.ai/web/libelevate-web-v0.1.0/index.js \
  | grep -n 'ep = "wasm"\|WebGPU not available\|executionProviders'
164:  ortBase = "./ort/", ep = "wasm", threads = 4, onProgress = () => {},
169:  if (ep === "webgpu" && !navigator.gpu) throw new Error("WebGPU not available in this browser");
191:    executionProviders: [ep], graphOptimizationLevel: "all",
```

Read line 169 carefully, because it is the shape of the whole problem:
**passing `ep: "webgpu"` is a commitment, not a preference.** The guard only
checks that `navigator.gpu` exists — which is true on machines that cannot grant
an adapter — and if the session then fails to come up, ONNX Runtime Web throws
rather than falling back to WASM. Decide the provider yourself with a real
adapter probe before you call `createAvatar`, and pass `"wasm"` when the answer
is no.

- The probe to use, with its measured failure arms:
  [Check 2 — does this browser have a real WebGPU adapter?](/examples/browser-webgpu-check#check-2--does-this-browser-have-a-real-webgpu-adapter)
- Whether WebGPU is worth it on your hardware — it is a large win on the quality
  director and a wash on the speed one:
  [WebGPU and local browser rendering](/guides/browser-webgpu#measured-webgpu-vs-wasm)

## Hosting requirements

- **Cross-origin isolation, for WASM threads.** Serve with
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`, or ship the bundled
  `coi-serviceworker.js` shim (it registers a service worker that injects the
  headers; the first page load reloads once). Without isolation the runtime
  **silently clamps to 1 thread** — the quality director drops from the 20-fps
  class to roughly 8 fps. Check `avatar.crossOriginIsolated` rather than
  assuming.
- **MIME types.** `.js` / `.mjs` as `text/javascript`, `.wasm` as
  `application/wasm`.
- **All assets same-origin** (or CORP-tagged) once COEP is on.
- **WebCodecs VP9 4:4:4 decode**, for the identity video. This is the real
  browser gate: Chrome and Edge 119+ and Firefox 130+ have it; **Safari does
  not guarantee it**, so treat Safari/iOS as unverified for this package.

## Verify what you serve

The bundle publishes a `manifest.json` with a sha256 and size for every file, so
a mirror is checkable. There is a runnable checker — and, more usefully, a
control arm that proves the checker is really checking — at
[Check 1](/examples/browser-webgpu-check#check-1--is-the-runtime-you-fetched-the-one-we-published).

## Auth and billing

**There is none.** Audit it yourself — the whole runtime is one readable file:

```bash
$ curl -fsS https://models.bithuman.ai/web/libelevate-web-v0.1.0/index.js \
  | grep -nE 'fetch\(|XMLHttpRequest|Authorization|api[-_]?(key|secret)|/v1/|bithuman\.ai'
106:  const buf = await (await fetch(url)).arrayBuffer();
180:    (await fetch(modelUrl)).arrayBuffer(),
181:    (await fetch(pooled64Url)).arrayBuffer(),
```

Three network calls, all for the model and identity assets you passed in. No
`Authorization` header, no key, no token, no call to any bitHuman API. The
runtime authenticates nothing and meters nothing. That is a deliberate property
of a static bundle, not a gap you should route around — and it does not extend
to the hosted or self-hosted routes, which do meter. See
[Billing: what a browser render actually costs](/guides/browser-webgpu#billing-what-a-browser-render-actually-costs).

## What this is not

- **Not `@bithuman/sdk`.** That is the cloud client for LiveKit sessions and is
  a separate, unpublished package — see [JavaScript / TypeScript](/sdk/javascript).
- **Not the hosted embed.** For a talking agent with a brain in a page, use the
  [embed](/guides/deploy-embed) or
  [`?render=local`](/guides/browser-rendering).
- **Not a way to reach Essence 2 Max or Expression 1.** Both are GPU-only by
  design; their absence from the browser is correct, not a roadmap item. See
  [where each model runs](/concepts/models-v2#where-each-model-runs).

## See also

- [WebGPU and local browser rendering](/guides/browser-webgpu) — the measured companion.
- [Browser — check before you ship](/examples/browser-webgpu-check) — runnable preflights.
- [Browser rendering](/guides/browser-rendering) — the URL-toggled rendering modes.
