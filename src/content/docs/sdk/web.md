---
title: "Web"
description: "A talking avatar in a browser tab with nothing to install — one URL or one iframe. Any showcase code, no account, no key."
section: sdk
group: "Platforms"
order: 60
---

## Install

Nothing. The hosted route renders in any modern browser.

## Get a model

Every showcase agent is public. `A74NWD9723` is one; browse the rest on the
[showcase](/showcase) and use any code you see there. Your own agent's code
comes from [Agents](/api/agents).

## Minimal code

```html
<iframe src="https://bithuman.ai/embed/A74NWD9723"
        allow="microphone" width="420" height="720"></iframe>
```

Or open the agent directly: `https://www.bithuman.ai/A74NWD9723?rendering_mode=browser`
— a live, lip-synced agent that listens and answers, rendered in the tab.
Start on `www.bithuman.ai`; that host mints the session, the viewer host does
not. Swap in your own agent code and it works the same way. The
`rendering_mode` switch and its three values are on
[browser rendering](/guides/browser-rendering); embedding options are on
[deploy an embed](/guides/deploy-embed). An [Essence 1](/concepts/essence-1)
agent renders in the tab with `?render=local` instead: the tab fetches the
agent's `.imx` and runs the audio front end in a published WebAssembly module,
pinned to a commit in
`https://tmoobjxlwcwvxvjeppzq.supabase.co/storage/v1/object/public/web/essence1-web/3.1.2/manifest.json`.

## Run

```bash
open "https://www.bithuman.ai/A74NWD9723?rendering_mode=browser"
```

Grant the microphone, talk. A session is metered per active minute at the rate
on [pricing](/guides/pricing); the free tier covers a first conversation.

## Performance

The hosted route plays at the model's own frame rate — 20 fps for Expression 2,
25 fps for Essence 2 — because the frames are produced server-side and the tab
decodes video. Rendering **in** the tab, unpaced (frames rendered back to back):

| Hardware | Model | fps (unpaced) | Measured |
|---|---|---:|---|
| Chrome 141 on Linux x86_64, WASM, 4 threads | reduced Essence 2 renderer — keypoint-driven, without the teeth pipeline | **12** | 2026-09-10 — needs cross-origin isolation, or WASM clamps to 1 thread |

That row is the one published in-browser package: a June student of the
Essence 2 renderer that ships one built-in identity and a recorded loop. Use it
to measure in-browser speed on your hardware, not to render your agent. Its
bundle is `https://models.bithuman.ai/web/libelevate-web-v0.1.0/manifest.json`
(every file with a sha256; `index.js` documents `createAvatar`; the path keeps
a [retired name](/concepts/models-v2)), served with
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. No in-browser Expression 2
package is published. Every platform side by side:
[Performance](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| The hosted URL shows a page but no avatar | you opened the viewer host directly | start on `https://www.bithuman.ai/<CODE>?rendering_mode=browser` |
| `404` on the hosted URL | the agent code is wrong or the agent is not public | check the code on the [showcase](/showcase) or in your [agents](/api/agents) |
| The in-tab renderer runs at ~8 fps instead of 20 | `crossOriginIsolated` is `false`, so WASM clamped to 1 thread | send the two headers above, or ship the bundle's `coi-serviceworker.js` |
| `WebGPU not available in this browser` | `ep: "webgpu"` on a browser with no adapter | pass `"wasm"`, or [probe first](/examples/browser-webgpu-check#check-2--does-this-browser-have-a-real-webgpu-adapter) |
| You want a JavaScript SDK | there is no npm package today | drive a served avatar over [LiveKit](/sdk/livekit), or embed the hosted route |
