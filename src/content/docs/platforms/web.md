---
title: "Web: embed and WebGPU"
description: "Put a live, talking avatar on any web page with one iframe. It renders in the bitHuman cloud, or in the visitor's tab with WebGPU."
section: platforms
group: "Apps"
order: 50
type: platform
searchTitle: "Web: embed and WebGPU in the browser"
demo: "both"
renders: ["cloud", "browser"]
platforms: ["web"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S29", "S17"]
next: ["/api/embedding", "/platforms/rest", "/deploy/on-device"]
---

<div class="lead">
<div class="lead-text">

The web surface is one URL: `https://www.bithuman.ai/embed/<CODE>`. Put it in an `<iframe>` and the page gets a live avatar that listens and answers. By default the avatar renders in the bitHuman cloud and streams to the page; with `render=local` it renders in the visitor's tab with WebGPU. There is no npm package, no install and no secret in the browser.

```why-on-device
web
```

</div>

```figure
web-embed
```

</div>

## Before you start

- A current browser. For lip-sync rendered in the tab, a usable GPU (WebGPU).
- An agent code: `A23WJF0199` (the `wise-pup` sample) or your own from [Agents](/api/agents).
- For a private agent, an [embed token](/api/embedding) minted by your server.

## Authenticate

A public agent needs no credential. For a private agent, your server mints an [embed token](/api/embedding) with your API secret and passes it to the page. Sessions bill the agent's owner: credits pay for session time, talking or idle, and the conversation (speech recognition, language model and voice) bills in every mode ([pricing](/pricing)).

## First frame

```html
<!doctype html>
<html>
  <body style="margin:0">
    <iframe src="https://www.bithuman.ai/embed/A23WJF0199"
            allow="microphone *" style="width:100%;height:100vh;border:0"></iframe>
  </body>
</html>
```

Expected: the avatar appears, asks for the microphone, and answers when you speak. Keep the `*` in `allow`, or the microphone is blocked. To try it without a page, open [https://www.bithuman.ai/embed/A23WJF0199](https://www.bithuman.ai/embed/A23WJF0199).

## Complete example

A whole page with a live avatar: one HTML file and a local web server.

### Requirements

| You need | Notes |
|---|---|
| A current browser | Chrome, Edge, Safari or Firefox |
| A local web server | the page must be served over `http://localhost` or HTTPS for the microphone to work |
| Nothing else | no account for the sample avatar; your own agent works the same way while its Anonymous Share setting is on, and its sessions bill you |

### Get the code

Save this as `index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>bitHuman web embed</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0f1115; }
    body { display: flex; align-items: center; justify-content: center; }
    iframe { border: 0; border-radius: 16px; }
  </style>
</head>
<body>
  <iframe src="https://www.bithuman.ai/embed/A23WJF0199"
          allow="microphone *; camera *; autoplay *" style="width:100%;height:100vh;border:0"></iframe>
</body>
</html>
```

### Run it

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` and allow the microphone.

### Expected output

The avatar greets you within a few seconds. Speak, or type into the **Type or speak…** box, and it answers out loud with its lips in sync. The red button ends the session.

### How it works

The iframe loads the hosted viewer for agent `A23WJF0199`. The viewer opens a real-time session: your microphone audio goes to the agent, and the agent's voice and video come back. `allow="microphone *"` lets the iframe ask for the microphone; without the `*` the browser blocks it. URL parameters are on [Web](/platforms/web); session events on [Embedding](/api/embedding).

### Make it your own

- **Your own avatar:** replace `A23WJF0199` with your agent code. Anyone with the code can open it and sessions bill your account; turn off Anonymous Share in the agent's sharing settings to stop that.
- **Push what it says:** from your backend, `POST /v1/agent/{code}/speak` makes a live avatar say a line ([Agents](/api/agents)).
- **Size and layout:** any width and height work; keep roughly a 7:12 portrait shape for Expression 2 avatars.

## Integrate into your app

Add parameters to the URL:

| Parameter | Values | Effect |
|---|---|---|
| `render` | `cloud` (default), `local` | Where the avatar renders: our servers, or the visitor's tab |
| `rendering_mode` | `browser`, `avatar` | Long form of `render=local`; `avatar` renders in the tab and lip-syncs the visitor's own microphone, with no conversation |
| `greetingLang` | a language code, for example `es` | Language of the first greeting |
| `greetingMsg` | text | The first thing the avatar says |

A private agent also takes `token`, and a session can pin its model with `model`; both are on [Embedding](/api/embedding). Other parameters are ignored.

### Render in the visitor's tab (WebGPU)

`render=local` renders the avatar in the visitor's browser tab with WebGPU. It works for any avatar you can embed and is off by default: without it, every session renders in the bitHuman cloud and streams to the page.

- **One download:** the avatar's web bundle (50–200 MB) downloads to the browser once, then comes from the cache. Tell visitors before it starts on a metered connection.
- **Fallback:** a browser without a usable GPU is switched to cloud rendering, so every visitor gets lip-sync.
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

### React and other frameworks

There is no npm package: the embed is an iframe in any framework. In React:

```jsx
export function Avatar({ code }) {
  return <iframe src={`https://www.bithuman.ai/embed/${code}`} allow="microphone *" style={{ width: "100%", height: 600, border: 0 }} title="Talking avatar" />;
}
```

For a floating avatar, one script tag adds a widget to any page, Next.js included ([Website widget](/build/website-widget)). The persona and your own model are settings on the agent ([Providers](/api/providers)), so there is no server to run.

To build your own video UI instead of the hosted page, subscribe to a cloud-rendered avatar over [LiveKit](/platforms/livekit).

## Platform notes

- Expression 1 avatars render in the cloud only.
- The in-tab render works for Essence 1, Expression 2, and Essence 2 avatars that have a browser build.

## Performance

Measured in the tab with WebGPU. The figures are the engine's render speed in Chrome on an Apple M4, not the frame rate a visitor sees.

```perf
web web-sustained
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The microphone never activates | `allow` is missing `microphone *` | use `allow="microphone *"` |
| `404` | the agent code is wrong, or the agent is private | check the code; mint an [embed token](/api/embedding) for a private agent |
| `render=local` reloads as `render=cloud` | no usable GPU (WebGPU) in this browser, or this Essence 2 avatar has no browser build | nothing to do; it is served from the cloud. Check `hasRealGPU()` first to choose the mode yourself |
| The iframe shows a browser error page | your page sends `Cross-Origin-Embedder-Policy` | remove that header from the page that holds the iframe |
| A blank frame | a service problem | check [status.bithuman.ai](https://status.bithuman.ai), then reload |
| Your own avatar shows `Embedding is disabled for this agent` | its Anonymous Share setting is off | turn Anonymous Share back on in the agent's sharing settings |

## Reference

- [Embedding](/api/embedding): embed tokens, sizing and private agents.
- [LiveKit](/platforms/livekit): your own UI over a cloud-rendered avatar.
- Examples: [Next.js UI](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) · [Gradio](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web).
