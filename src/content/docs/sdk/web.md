---
title: "Web"
description: "A talking avatar in a browser tab with nothing to install — one URL or one iframe, rendered on our servers or, with ?render=local, in the visitor's own tab. Which models run in a tab, what the browser needs, and what it costs."
section: sdk
group: "Platforms"
order: 60
---

The browser surface is a URL and an `<iframe>`. There is no npm package and no
key in the browser: the avatar is either streamed from our servers or, with
`?render=local`, drawn in the visitor's own tab.

## Install

Nothing. Any current browser works.

## Minimal code

```html
<iframe src="https://bithuman.ai/embed/A74NWD9723"
        allow="microphone *; camera *; autoplay *" width="420" height="720"></iframe>
```

Or open an agent directly — a live agent that listens and answers:

```text
https://www.bithuman.ai/A74NWD9723
```

Always start on `www.bithuman.ai`: that host starts the session and forwards
you to the viewer. Keep the `*` in `allow`, or the microphone will not work.
Tokens, sizing and embedding on your own site are on
[Embed widget](/guides/deploy-embed).

## Get a model

Every showcase agent is public: `A74NWD9723` is one, and any code on the
[showcase](/showcase) works the same way. Your own agent's code comes from
[Agents](/api/agents).

## Render in the tab

Add `?render=local` and the model downloads into the tab and renders there,
instead of on our servers:

```text
https://www.bithuman.ai/A74NWD9723?render=local
```

Nothing else changes: no install, no key, and the conversation — speech
recognition, the LLM and the voice — still runs on our servers.

| Mode | How you ask for it | Where the avatar renders | Audio |
|---|---|---|---|
| **cloud** (default) | nothing, or `?render=cloud` | our servers | the agent's speech, over video |
| **browser** | `?render=local` (long form `?rendering_mode=browser`) | the visitor's tab | the agent's speech, audio only |
| **avatar** | `?rendering_mode=avatar` | the visitor's tab, as a puppet with no brain | the visitor's microphone |

Nobody gets an in-tab render unless the URL asks, so existing deployments are
unchanged. The landing page forwards `render`, `rendering_mode`, `compute`,
`model`, `deployment`, `greetingLang`, `greetingMsg` and the transparent-embed
options to the viewer; anything else you append is dropped.

**Which models render in a tab:**

| Model | In the tab? |
|---|---|
| [Expression 2](/concepts/expression-2) | yes |
| [Essence 2](/concepts/essence-2) | yes, for an identity whose in-browser build is published — otherwise the page switches to `?render=cloud` and the avatar is served |
| [Essence 1](/concepts/essence-1) | yes |
| [Expression 1](/concepts/expression-1) | no — it needs a server GPU, and the viewer says so |

`A21SKT4314` is a public Essence 2 agent with an in-browser build.

**What the browser needs:**

- **A real GPU for lip-sync.** Without one, an in-tab session still shows the
  living idle loop and plays the agent's speech; only the lip-sync is off. If
  you need lip-sync on every machine, use cloud rendering.
- **Two headers, if you host the page yourself:**
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: credentialless` (or `require-corp`). Without
  them the renderer is limited to one thread. The bitHuman-hosted pages already
  send them.
- **A one-time download** of 50–200 MB per agent, cached for later visits.

Measured in-browser frame rates are on the [performance page](/sdk/performance).

## Check a browser before you ship

`navigator.gpu` existing does not mean a GPU is usable. Test for a real,
non-software adapter:

```js
async function hasRealGPU() {
  if (!navigator.gpu) return false;
  const once = async () => {
    try { return (await navigator.gpu.requestAdapter()) ?? null; } catch { return null; }
  };
  // The first call of a browser session can resolve null while the GPU process
  // starts; retry once, or a machine with a GPU reads as having none.
  const first = await once();
  const adapter = first === null ? await once() : first;
  if (!adapter) return false;
  // The software-renderer flag lives on one of two objects; read both.
  return adapter.isFallbackAdapter !== true && adapter.info?.isFallbackAdapter !== true;
}
```

## Authentication and billing

The browser holds no key. A session bills to the **agent's owner**, at the
rates on [pricing](/guides/pricing):

- **The conversation always bills** — speech, the LLM and the voice — whichever
  mode renders the avatar.
- **In-tab rendering adds no avatar-serving charge.** Cloud rendering bills
  serving at the cloud rate.

The free tier covers a first conversation.

## The downloadable runtime

One in-browser package is published as static files so you can measure
rendering speed on your own hardware. It ships one built-in identity and a
recorded loop, and it cannot render your own agent — use `?render=local` for
that. Its manifest, with a `sha256` per file:

```text
https://models.bithuman.ai/web/essence2-web-v0.1.1/manifest.json
```

The same bytes are also published at the legacy `libelevate-web-v0.1.0` path,
kept for compatibility so saved links keep resolving. If you mirror the files
onto your own origin, check them against the manifest:

```bash
BASE=https://models.bithuman.ai/web/essence2-web-v0.1.1
curl -fsS "$BASE/manifest.json" -o manifest.json
for f in index.js ort/ort.min.mjs ort/ort-wasm-simd-threaded.mjs ort/ort-wasm-simd-threaded.jsep.mjs; do
  mkdir -p "$(dirname "$f")" && curl -fsS "$BASE/$f" -o "$f"
  want=$(python3 -c 'import json,sys;print(json.load(open("manifest.json"))["files"][sys.argv[1]]["sha256"])' "$f")
  [ "$want" = "$(sha256sum "$f" | cut -d' ' -f1)" ] && echo "OK       $f" || echo "MISMATCH $f"
done
```

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| A page but no avatar | you opened the viewer host directly | start on `https://www.bithuman.ai/<CODE>` |
| `404` on the hosted URL | the agent code is wrong or the agent is not public | check the code on the [showcase](/showcase) or in your [agents](/api/agents) |
| `?render=local` turns into `?render=cloud` and the page reloads | that Essence 2 identity has no in-browser build yet | nothing — the conversation is the same, served from the cloud |
| `Local rendering refused. This essence-2 avatar could not load part of its identity…` | part of the identity did not arrive, and Essence 2 will not draw a stand-in | reload; if it repeats, report the agent code |
| The in-tab renderer is far below the model's frame rate | `crossOriginIsolated` is `false`, so it runs on one thread | send the two headers above, or ship the bundle's `coi-serviceworker.js` |
| `WebGPU not available in this browser` | the GPU renderer was requested on a browser with no usable GPU | use the default renderer, or check with `hasRealGPU()` first |
| `?ep=webgpu` seems to do nothing | the parameter is dropped while the page signs you in | append `&ep=webgpu` after the page has loaded and reload. The older `?elevate_ep=` is a legacy name kept for compatibility |
| You want a JavaScript SDK | there is no npm package | embed the hosted page, or drive a served avatar over [LiveKit](/sdk/livekit) |

## Examples and source

- [`integrations/nextjs-ui`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) — a Next.js video-chat UI over LiveKit
- [`integrations/gradio-web`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web) — the same in Gradio + FastRTC

## See also

- [Embed widget](/guides/deploy-embed) — the iframe on your own site
- [LiveKit](/sdk/livekit) — a served avatar from your own JavaScript
- [Models](/concepts/models#where-each-model-runs) — which model runs where
- [Performance](/sdk/performance) — measured frame rates for every platform
