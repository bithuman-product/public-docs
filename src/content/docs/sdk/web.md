---
title: "Web"
description: "A talking avatar in a browser tab with nothing to install — one URL or one iframe — plus the self-hostable renderer package, honestly labelled."
section: sdk
group: "Platforms"
order: 60
---

## Install

Nothing. The hosted route renders in any modern browser; the self-hosted
renderer further down is a static bundle you mirror with `curl`.

## Get a model

Every showcase agent is public. `A74NWD9723` is one; browse the rest on the
[showcase](/showcase) and use any code you see there. Your own agent's code
comes from [Agents](/api/agents).

## Minimal code

Open this URL — a live, lip-synced agent that listens and answers, rendered in
the tab. No account, no key:

```text
https://www.bithuman.ai/A74NWD9723?rendering_mode=browser
```

Or put it in a page of your own:

```html
<iframe src="https://bithuman.ai/embed/A74NWD9723"
        allow="microphone" width="420" height="720"></iframe>
```

Start on `www.bithuman.ai` — that host mints the session; the viewer host
does not. Swap in your own agent code and it works the same way. The
`rendering_mode` switch and its three values are on
[browser rendering](/guides/browser-rendering); embedding options are on
[deploy an embed](/guides/deploy-embed).

## Run

Open the URL, grant the microphone, talk. A session is metered per active minute
at the rate on [pricing](/guides/pricing); the free tier covers a first
conversation.

## Performance

Measured unpaced (frames rendered back to back, not paced to playback) on
2026-09-10. The hosted route plays at the model's own frame rate — 20 fps for
Expression 2, 25 fps for Essence 2 — because the frames are produced server-side.

| Route | Device | Model | fps (unpaced) | Notes |
|---|---|---|---:|---|
| Hosted (`rendering_mode=browser`) | any modern browser | Expression 2 / Essence 2 | plays at 20 / 25 | rendering is server-side; the tab decodes video |
| Self-hosted renderer, `ep: "wasm"`, 4 threads | Linux x86_64, headless Chrome 141 | reduced Essence 2 renderer (see below) | 12 | needs cross-origin isolation, or it clamps to 1 thread |
| Self-hosted renderer, `ep: "wasm"` | Apple M-series | reduced Essence 2 renderer | 23–26 | the bundle manifest's own figure |
| Expression 2 in the tab (WebGPU) | Apple M4 | Expression 2 | 28 | internal build, not yet a published package |
| Expression 2 in the tab (WASM) | Linux x86_64 | Expression 2 | 20 | internal build, not yet a published package |

Every platform side by side, with what is on main for the next release: [Performance](/sdk/performance).

## Self-host the renderer

There is one published in-browser renderer package, and it is narrower than its
name suggests. **It is a reduced, frames-driven student of the Essence 2
renderer, published in June** — it takes per-frame keypoints, not audio, and it
does not carry the teeth pipeline the hosted Essence 2 route renders with. Use
it to evaluate in-browser rendering speed on your hardware; use the hosted route
above to render your identity.

The bundle ships a `manifest.json` naming every file with a sha256 and a size.
This is the whole download — 17 files, 133 MB:

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
PY
```

> The path says `libelevate-web`. Type it exactly — `libelevate` is a
> [retired name](/concepts/models-v2) kept in the published URL and in the
> manifest's `"format": "libelevate-web-manifest-v1"` for compatibility.

Serve that directory with `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` (or ship the bundled
`coi-serviceworker.js`), `.wasm` as `application/wasm`, and open this file
from that server:

```html
<canvas id="cv" width="512" height="512"></canvas>
<script type="module">
  import { createAvatar } from "./index.js";
  const avatar = await createAvatar({
    canvas:      document.getElementById("cv"),
    ortBase:     "./ort/",
    modelUrl:    "./models/m4b_full_mmq.onnx",          // or m3c2_full_mmq.onnx (faster, lower quality)
    pooled64Url: "./identity/A63GVG1577/pooled64_m4b.f16",
    videoUrl:    "./identity/A63GVG1577/p_vp9_444.webm",
    ep: "wasm", threads: 4,
  });
  // The bundle ships a recorded keypoint loop, so this renders on its own.
  const [xs, xd, si] = await Promise.all(
    ["xs.bin", "xd.bin", "si.bin"].map(async (n) =>
      (await fetch(`./identity/A63GVG1577/${n}`)).arrayBuffer()));
  const XS = new Float32Array(xs), XD = new Float32Array(xd), SI = new Int32Array(si);
  for (let f = 0; f < SI.length; f++) {
    await avatar.renderFrame(XD.subarray(f*63, f*63+63), XS.subarray(f*63, f*63+63), SI[f]);
  }
</script>
```

`A63GVG1577` is the one identity the bundle ships and the only one those paths
resolve to; substituting your own code gives four 404s. The `createAvatar`
options (`ep: "wasm" | "webgpu"`, `threads`, `onProgress`) and the returned
members (`renderFrame`, `setIdentity`, `lastNNMs`, `destroy`) are documented in
the bundle's `index.js`; never pair one model's `pooled64` with the other model.
`ep: "webgpu"` is a commitment, not a preference — probe for a real adapter
first ([the check](/examples/browser-webgpu-check#check-2--does-this-browser-have-a-real-webgpu-adapter)),
and read [WebGPU and local browser rendering](/guides/browser-webgpu) for
where it is worth it.

### Essence 1 in the tab

An [essence-1](/concepts/essence-1) agent renders in your tab too, and not with
the package above: open the hosted route with `?render=local` and the
tab fetches the agent's `.imx`, runs the audio front end (mel + KNN cluster
index) in a WebAssembly module, and draws the mouth on a `<canvas>` from the
frames stored in the model file. That module is published, so what your tab
runs is pinned to a commit:

```text
https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/essence1-web/3.1.2/manifest.json
```

`manifest.json` names `essence_compute_wasm.js` and `essence_compute_wasm.wasm`
with their sha256 and the commit they were built from. It is the audio front
end only — not a standalone renderer package, so there is nothing to `npm
install`; the enable path is the hosted URL,
`https://www.bithuman.ai/<CODE>?render=local`, on an Essence 1 agent.

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| The hosted URL shows a page but no avatar | you opened the viewer host directly | start on `https://www.bithuman.ai/<CODE>?rendering_mode=browser` |
| `404` on the hosted URL | the agent code is wrong or the agent is not public | check the code on the [showcase](/showcase) or in your [agents](/api/agents) |
| The renderer runs at ~8 fps instead of 20 | `crossOriginIsolated` is `false`, so WASM clamped to 1 thread | send the two headers above, or ship `coi-serviceworker.js`; read `avatar.crossOriginIsolated` |
| `WebGPU not available in this browser` | you passed `ep: "webgpu"` on a browser with no adapter | pass `"wasm"`, or probe first |
| The identity video does not decode | no WebCodecs VP9 4:4:4 (Safari does not guarantee it) | use Chrome, Edge 119+ or Firefox 130+ |
| You want a JavaScript SDK | there is no npm package today | drive a served avatar over [LiveKit](/sdk/livekit), or embed the hosted route |

## See also

- [Browser rendering](/guides/browser-rendering) — the URL switch and the three modes
- [Deploy an embed](/guides/deploy-embed) — the iframe with a brain inside your page
- [API quickstart](/api/quickstart) — the same embed from the API side
- [SDK](/sdk) — every platform on one table
