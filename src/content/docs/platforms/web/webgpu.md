---
title: "Render with WebGPU"
searchTitle: "WebGPU: render the avatar in the visitor's tab"
description: "Render the avatar in the visitor's browser tab with WebGPU."
section: platforms
group: "Web"
order: 35
type: concept
llms: apps
claims: ["S1", "S2", "S29", "S17"]
---

`render=local` renders the avatar in the visitor's browser tab with WebGPU. It works for any avatar you can embed and is off by default: without it, every session renders in the bitHuman cloud and streams to the page.

- **One download:** the avatar's web bundle (50–200 MB) downloads to the browser once, then comes from the cache. Tell visitors before it starts on a metered connection.
- **Fallback:** a browser without a usable WebGPU adapter is switched to cloud rendering, so every visitor gets lip-sync.
- **Where the conversation runs:** with the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`).
- **Private agents:** the embed token the iframe already uses covers it ([Embedding](/api/embedding)).

```diagram
topology web-local
```

Check for a usable GPU before you choose `render=local`:

```js
async function hasRealGPU() {
  if (!navigator.gpu) return false;
  const once = async () => { try { return (await navigator.gpu.requestAdapter()) ?? null; } catch { return null; } };
  const adapter = (await once()) ?? (await once());   // the first request can return null while the GPU starts
  return !!adapter && adapter.isFallbackAdapter !== true && adapter.info?.isFallbackAdapter !== true;
}
const mode = (await hasRealGPU()) ? "local" : "cloud";
iframe.src = `https://www.bithuman.ai/embed/A23WJF0199?render=${mode}`;
```

Do not send `Cross-Origin-Embedder-Policy` from the page that holds the iframe: the embed does not send one itself, so the browser refuses to load it.
