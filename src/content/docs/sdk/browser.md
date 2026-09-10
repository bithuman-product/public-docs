---
title: "Browser"
description: "The fastest first frame on this site: one URL, no install, no account, no key. Then the published Essence 2 browser runtime — createAvatar, the frames-driven contract, and a mirror you can host yourself."
section: sdk
group: "Platforms"
order: 60
label: "Browser"
---

## One URL

```text
https://www.bithuman.ai/A74NWD9723?rendering_mode=browser
```

A live, lip-synced agent that listens and answers, rendered **in the tab** — no
install, no account, no API key, nothing to build. It is the shortest path to a
bitHuman frame anywhere on this site.

Verified 2026-09-10 in headless Chrome 141 on Linux: `www.bithuman.ai` minted a
session and forwarded to the viewer carrying the parameter, and the page painted
a 416x720 avatar canvas with a live audio track. **Start on
`www.bithuman.ai`** — that host mints the session key; the viewer host does not.

Swap in your own agent code and it works the same way. The switch, the three
rendering modes and which model gets which in-browser renderer are on
[browser rendering](/guides/browser-rendering), which is the one writer for
that; what it costs is on [pricing](/guides/pricing).

## The renderer on its own, with no agent at all

```text
https://models.bithuman.ai/web/libelevate-web-v0.1.0/demo.html
```

That is the [Essence 2](/concepts/essence-2) browser runtime as a static page:
ONNX Runtime Web plus a single fused ONNX model, replaying a recorded
537-frame keypoint loop. No server, no session, no credential, nothing metered.

Measured 2026-09-10, headless Chrome 141 on a 24-core Linux x86_64 box:
cross-origin isolation **true**, 4 WASM threads, loaded in **5.8 s**, then
about **12 fps** with the quality model on this machine. The manifest's own
figures for an M5 Mac are 23–26 fps (`m4b`, WASM, 4 threads) and 65–66 fps
(`m3c2`).

## The one limit that decides whether you can use the package

**It is frames-driven, not audio-driven.** You push per-frame keypoints and it
renders faces. Audio → keypoints runs in the native engine; this package does
not contain it, and says so in its own manifest field:

```json
"out_of_scope": "live audio-driven actor (native engine only); frames-driven kp input required"
```

So:

- **Evaluating render quality and speed in a browser** — this is the right tool.
- **Driving an avatar from a microphone or a TTS stream in a tab** — it is not.
  Use the URL at the top of this page, which supplies the keypoint stream.
- **Your own keypoint source** — fine: 21×3 float32 per frame, ~252 bytes, about
  50 kbit/s at 25 fps if you stream them from your own server.

> **The path says `libelevate-web`. Type it exactly.** `libelevate` is a
> [retired name](/concepts/models-v2) — the product is
> [**Essence 2**](/concepts/essence-2) — but the published URL and the
> manifest's `"format": "libelevate-web-manifest-v1"` are frozen carriers and
> will not be renamed. Hiding a string you have to type would be worse than
> showing a retired one.

## Host the runtime yourself

The bundle publishes a `manifest.json` naming every file with a sha256 and a
size, so mirroring it is one loop and checking the mirror is free. **This is the
whole download** — 17 files, 133 MB, 6.4 s on a home connection, run
2026-09-10:

```bash
BASE=https://models.bithuman.ai/web/libelevate-web-v0.1.0
curl -fsS "$BASE/manifest.json" -o manifest.json
python3 - <<'PY'
import json, os, urllib.request
m = json.load(open("manifest.json"))
for name, f in m["files"].items():
    os.makedirs(os.path.dirname(name) or ".", exist_ok=True)
    urllib.request.urlretrieve(f["url"], name)
    assert os.path.getsize(name) == f["size"], name
    print("ok", name)
PY
```

Serve that directory with two headers — `Cross-Origin-Opener-Policy:
same-origin` and `Cross-Origin-Embedder-Policy: require-corp` — and the
quickstart below resolves every path it needs. Without those headers the runtime
**silently clamps to one thread** and the quality model drops from the 20-fps
class to roughly 8; ship the bundled `coi-serviceworker.js` shim if your host
cannot set headers, and read `avatar.crossOriginIsolated` rather than assuming.

Also required: `.js` / `.mjs` served as `text/javascript` and `.wasm` as
`application/wasm`; every asset same-origin (or CORP-tagged) once COEP is on;
and **WebCodecs VP9 4:4:4 decode** for the identity video — Chrome and Edge
119+ and Firefox 130+ have it, **Safari does not guarantee it**, so treat
Safari and iOS as unverified for this package.

## Quickstart

Save this beside the mirrored files and open it from that server. Every path
below is relative to the bundle you just downloaded — that is the whole reason
the mirror step comes first.

```html
<canvas id="cv" width="512" height="512"></canvas>
<script type="module">
  import { createAvatar } from "./index.js";

  const avatar = await createAvatar({
    canvas:      document.getElementById("cv"),
    ortBase:     "./ort/",
    modelUrl:    "./models/m4b_full_mmq.onnx",
    pooled64Url: "./identity/A63GVG1577/pooled64_m4b.f16",
    videoUrl:    "./identity/A63GVG1577/p_vp9_444.webm",
    ep: "wasm", threads: 4,
  });

  // The bundle ships a recorded keypoint loop, so this file renders on its own.
  const [xs, xd, si] = await Promise.all(
    ["xs.bin", "xd.bin", "si.bin"].map(async (n) =>
      (await fetch(`./identity/A63GVG1577/${n}`)).arrayBuffer()));
  const XS = new Float32Array(xs), XD = new Float32Array(xd), SI = new Int32Array(si);

  for (let f = 0; f < SI.length; f++) {
    await avatar.renderFrame(XD.subarray(f*63, f*63+63), XS.subarray(f*63, f*63+63), SI[f]);
  }
</script>
```

Run 2026-09-10 against a local mirror served with those two headers:
`crossOriginIsolated` **true**, no page errors, **537 frames** rendered to the
canvas. In a real app drive `renderFrame` from `requestAnimationFrame` rather
than a bare loop.

★ **`A63GVG1577` is not a placeholder — type it.** It is the one identity the
published bundle ships, and it is the only one those relative paths resolve to.
Substituting your own agent code here gives you four 404s. To render **your**
identity in a browser, use the hosted route at the top of this page; this
package renders whatever identity assets you point it at, and today the only
published set is that one.

`createAvatar` is `async` and does the whole cold start: fetch the model, fetch
the identity features, decode the identity video with WebCodecs, create the ONNX
Runtime session.

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

Also exported: `decodeIdentityVideo(url)`, `demuxWebMVP9(buf)` and `VERSION`.

> **Never mix `pooled64` across models.** Each model's `pooled64` is the output
> of that model's own trained compressor. `m4b`'s features fed to `m3c2` is not
> a degraded picture, it is a wrong one. The runtime cannot detect it — it only
> checks that the identity count matches the video frame count.

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
checks that `navigator.gpu` exists — true on machines that cannot grant an
adapter — and if the session then fails to come up, ONNX Runtime Web throws
rather than falling back to WASM. Decide the provider yourself with a real
adapter probe before you call `createAvatar`, and pass `"wasm"` when the answer
is no.

- The probe, with its measured failure arms:
  [Check 2 — does this browser have a real WebGPU adapter?](/examples/browser-webgpu-check#check-2--does-this-browser-have-a-real-webgpu-adapter)
- Whether WebGPU is worth it on your hardware — a large win on the quality model,
  a wash on the speed one:
  [WebGPU and local browser rendering](/guides/browser-webgpu#measured-webgpu-vs-wasm)

## Auth and billing

**There is none in this package.** Audit it yourself — the whole runtime is one
readable file:

```bash
$ curl -fsS https://models.bithuman.ai/web/libelevate-web-v0.1.0/index.js \
  | grep -nE 'fetch\(|XMLHttpRequest|Authorization|api[-_]?(key|secret)|/v1/|bithuman\.ai'
106:  const buf = await (await fetch(url)).arrayBuffer();
180:    (await fetch(modelUrl)).arrayBuffer(),
181:    (await fetch(pooled64Url)).arrayBuffer(),
```

Three network calls, all for assets you passed in. No `Authorization` header, no
key, no token, no call to any bitHuman API. That is a deliberate property of a
static bundle, and it does **not** extend to the hosted route at the top of this
page or to a self-hosted server, which do meter. See
[Billing: what a browser render actually costs](/guides/browser-webgpu#billing-what-a-browser-render-actually-costs).

To check a mirror really is what we published, there is a runnable checker — and
a control arm that proves the checker is checking — at
[Check 1](/examples/browser-webgpu-check#check-1--is-the-runtime-you-fetched-the-one-we-published).

## What this is not

- **Not a JavaScript SDK.** There is no published npm package: `@bithuman/sdk`
  is not on npm and there is no public source package to build from. To drive a
  served or cloud avatar from browser or Node code today, use
  [LiveKit](/sdk/livekit) — the same transport that client would wrap.
- **Not the hosted embed.** For a talking agent with a brain inside a page of
  your own, use the [embed](/guides/deploy-embed) or
  [`?render=local`](/guides/browser-rendering).
- **Not a way to reach Essence 2 Max or Expression 1.** Both are GPU-only by
  design; their absence from the browser is correct, not a roadmap item. See
  [where each model runs](/concepts/models-v2#where-each-model-runs).

## See also

- [Browser rendering](/guides/browser-rendering) — the URL switch and the three modes
- [WebGPU and local browser rendering](/guides/browser-webgpu) — the measured companion
- [Browser — check before you ship](/examples/browser-webgpu-check) — runnable preflights
