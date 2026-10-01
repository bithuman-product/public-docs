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

To render an avatar in a browser tab with WebGPU, add `render=local` to the web embed's URL. A browser without a usable GPU is switched to cloud rendering, so every visitor gets lip-sync. With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`).

`render=local` renders the avatar in the visitor's browser tab with WebGPU, for Expression 2, Essence 1, and Essence 2 avatars that have a browser build. Expression 1 always renders in the bitHuman cloud. It is off by default: without it, every session renders in the bitHuman cloud and streams to the page.

- **One download:** the avatar's web bundle (50–200 MB) downloads to the browser once, then comes from the cache. Tell visitors before it starts on a metered connection.
- **Fallback:** a browser without a usable WebGPU adapter is switched to cloud rendering, so every visitor gets lip-sync.
- **First visit:** the first `render=local` visit on a device streams from the cloud while the tab checks the GPU and downloads the web bundle; later visits render in the tab.
- **Where the conversation runs:** with the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`).
- **Private agents:** the embed token the iframe already uses covers it ([Embedding](/api/embedding)).

```diagram
topology web-local
```

Check for a usable GPU before you choose `render=local`:

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
