---
title: "Render with WebGPU"
searchTitle: "WebGPU: render an avatar in a browser tab"
description: "Render the avatar in the visitor's browser tab with WebGPU."
section: platforms
group: "Web"
order: 35
type: concept
llms: apps
claims: ["S1", "S2", "S29", "S17"]
---

To render an avatar in a browser tab with WebGPU, add `render=local` to the web embed's URL. With `render=local` the avatar never renders in the cloud: a device that can't render it in real time shows a message, and no session starts. With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`).

`render=local` renders the avatar in the visitor's browser tab with WebGPU, for Expression 2, Essence 1, and Essence 2 avatars that have a browser build. Expression 1 always renders in the bitHuman cloud; with `render=local` it shows "This avatar can only be rendered in the cloud" instead. It is off by default: without it, every session renders in the bitHuman cloud and streams to the page.

- **One download:** the avatar's web bundle (50–200 MB) downloads to the browser once, then comes from the cache. Tell visitors before it starts on a metered connection.
- **No cloud fallback:** a browser without a usable WebGPU adapter, or a device that measures too slow, shows "This device can't render this avatar in real time". No session starts.
- **First visit:** for Essence 2 and Expression 2, after the visitor starts, the tab downloads the web bundle and checks the device ("Checking this device…") before any session starts. Later visits on that device reuse the result.
- **Where the conversation runs:** with the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`).
- **Private agents:** the embed token the iframe already uses covers it ([Embedding](/api/embedding)).

```diagram
topology web-local
```

Check for a usable GPU before you choose `render=local`, so a visitor without one gets the cloud render:

```html
<iframe id="avatar" allow="microphone *" style="width:100%;height:600px;border:0" title="Talking avatar"></iframe>
<script type="module">
  async function hasRealGPU() {
    if (!navigator.gpu) return false;
    const once = async () => { try { return (await navigator.gpu.requestAdapter()) ?? null; } catch { return null; } };
    const adapter = (await once()) ?? (await once());   // the first request can return null while the GPU starts
    return !!adapter && adapter.isFallbackAdapter !== true && adapter.info?.isFallbackAdapter !== true;
  }
  const iframe = document.querySelector("iframe#avatar");
  const mode = (await hasRealGPU()) ? "local" : "cloud";
  iframe.src = `https://www.bithuman.ai/embed/A23WJF0199?render=${mode}`;
</script>
```

Do not send `Cross-Origin-Embedder-Policy` from the page that holds the iframe: the embed does not send one itself, so the browser refuses to load it.
