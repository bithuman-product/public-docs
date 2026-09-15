---
title: "Web"
description: "A talking avatar in a browser tab with nothing to install — one URL or one iframe. Any showcase code, no account, no key."
section: sdk
group: "Platforms"
order: 60
---

## Install

Nothing. The hosted route renders in any modern browser.

## Authentication and configuration

Nothing to authenticate, and nothing to configure: the browser holds no key.
A hosted session is metered per active minute against the **agent's owner**,
at the rate on [pricing](/guides/pricing), and the free tier covers a first
conversation. The one thing you do configure lives on **your** host, not ours —
serving your page cross-origin isolated, or in-tab WebAssembly drops to a
single thread. See Troubleshooting.

## Get a model

Every showcase agent is public. `A74NWD9723` is one; browse the rest on the
[showcase](/showcase) and use any code you see there. Your own agent's code
comes from [Agents](/api/agents).

## Minimal code

```html
<iframe src="https://bithuman.ai/embed/A74NWD9723"
        allow="microphone *; camera *; autoplay *" width="420" height="720"></iframe>
```

Or open the agent directly: `https://www.bithuman.ai/A74NWD9723?rendering_mode=browser`
— a live, lip-synced agent that listens and answers, rendered in the tab.
Always start on `www.bithuman.ai`: that host signs you in, the viewer host does
not. Swap in your own agent code and it works the same way. The
`rendering_mode` switch and its three values are on
[browser rendering](/guides/browser-rendering); embedding options are on
[deploy an embed](/guides/deploy-embed). An [Essence 1](/concepts/essence-1)
agent renders in the tab with `?render=local` instead.

## Run

```bash
open "https://www.bithuman.ai/A74NWD9723?rendering_mode=browser"
```

Grant the microphone, talk. A session is metered per active minute at the rate
on [pricing](/guides/pricing); the free tier covers a first conversation.

## Performance

The hosted route plays at the avatar's own frame rate: the frames are rendered
on bitHuman's servers and your tab decodes video, like any other stream.
Measured rates for every platform are on the
[performance page](/sdk/performance).

You can also render **in** the tab:

- **Expression 2** — nothing to install. Add `?render=local` to the hosted URL
  and the renderer runs in your tab, ahead of the rate the avatar plays at:
  `https://www.bithuman.ai/A74NWD9723?render=local`.
- **Essence 2** — the one published in-browser package is a **demo**. It ships
  a single built-in identity and a recorded loop, so you can measure in-browser
  speed on your own hardware; it cannot render your own agent. The bundle is
  `https://models.bithuman.ai/web/essence2-web-v0.1.1/manifest.json`. The same
  bytes are also published at the older `libelevate-web-v0.1.0` path — a
  [retired name](/concepts/models-v2) that still works and will never be
  removed, so saved links and already-deployed pages keep resolving. Your page
  must be cross-origin isolated or WebAssembly drops to one thread — see the
  troubleshooting table.

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| The hosted URL shows a page but no avatar | you opened the viewer host directly | start on `https://www.bithuman.ai/<CODE>?rendering_mode=browser` |
| `404` on the hosted URL | the agent code is wrong or the agent is not public | check the code on the [showcase](/showcase) or in your [agents](/api/agents) |
| The in-tab renderer runs at ~8 fps instead of 20 | `crossOriginIsolated` is `false`, so WASM clamped to 1 thread | send `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` from your own host, or ship the bundle's `coi-serviceworker.js` |
| `WebGPU not available in this browser` | you asked for the GPU renderer on a browser with no usable GPU | ask for the software renderer, or [probe first](/examples/browser-webgpu-check#check-1--does-this-browser-have-a-usable-gpu) |
| You want a JavaScript SDK | there is no npm package today | drive a served avatar over [LiveKit](/sdk/livekit), or embed the hosted route |
| `?ep=webgpu` seems to do nothing | the parameter is dropped while the page signs you in, so the page never sees it | add it **after** the page has loaded: append `&ep=webgpu` to the URL in the address bar (the one that already carries `token=`) and reload. It runs the model on the GPU instead of WebAssembly; it is opt-in and needs a browser with WebGPU. The older `?elevate_ep=` is still accepted and always will be — `elevate_ep` is a legacy name kept for compatibility, and `ep` is the same parameter the Expression 2 local renderer already takes. |

## Examples and source

- [Does this browser have a usable GPU?](/examples/browser-webgpu-check) — a
  probe to run before you ask for the GPU renderer.
- [`integrations/nextjs-ui`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) — a Next.js
  video-chat UI over LiveKit, for when the avatar is served rather than in-tab.
- [`integrations/gradio-web`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web) — the same idea in
  Gradio + FastRTC.
- [Examples](/examples) — every runnable project, by language.

There is no npm package today, so there is no JavaScript API reference to link:
the browser surface is the hosted URL, its query parameters, and the `<iframe>`
above. The parameters are on [browser rendering](/guides/browser-rendering).

## See also

- [Browser rendering](/guides/browser-rendering) — `rendering_mode` and its
  three values, in full
- [Deploy an embed](/guides/deploy-embed) — putting the iframe on your own site
- [LiveKit](/sdk/livekit) — driving a served avatar from your own JavaScript
- [Performance](/sdk/performance) — measured frame rates for every platform
- [SDK](/sdk) — every platform on one page
