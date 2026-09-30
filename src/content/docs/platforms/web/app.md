---
title: "Build a web app"
description: "Set the embed's URL parameters and fit the avatar into your site."
section: platforms
group: "Web"
order: 30
type: platform-app
llms: apps
claims: ["S1", "S2", "S29", "S17"]
next: ["/platforms/web/troubleshooting", "/platforms/web"]
---

## Integrate into your app

Add parameters to the URL:

| Parameter | Values | Effect |
|---|---|---|
| `render` | `cloud` (default), `local` | Where the avatar renders: our servers, or the visitor's tab |
| `rendering_mode` | `browser`, `avatar` | Long form of `render=local`; `avatar` renders in the tab and lip-syncs the visitor's own microphone, with no conversation |
| `greetingLang` | a language code, for example `es` | Language of the first greeting |
| `greetingMsg` | text | The first thing the avatar says |

A private agent also takes `token`, and a session can pin its model with `model`; both are on [Embedding](/api/embedding). Other parameters are ignored.

### React and other frameworks

There is no npm package: the embed is an iframe in any framework. In React:

```jsx
export function Avatar({ code }) {
  return <iframe src={`https://www.bithuman.ai/embed/${code}`} allow="microphone *" style={{ width: "100%", height: 600, border: 0 }} title="Talking avatar" />;
}
```

For a floating avatar, one script tag adds a widget to any page, Next.js included ([Website widget](/build/website-widget)). The persona and your own model are settings on the agent ([Providers](/api/providers)), so there is no server to run.

To build your own video UI instead of the hosted page, subscribe to a cloud-rendered avatar over [LiveKit](/platforms/livekit).

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

## Platform notes

- Expression 1 avatars render in the cloud only.
- The in-tab render works for Essence 1, Expression 2, and Essence 2 avatars that have a browser build.

## Reference

- [Embedding](/api/embedding): embed tokens, sizing and private agents.
- [LiveKit](/platforms/livekit): your own UI over a cloud-rendered avatar.
- Examples: [Next.js UI](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) · [Gradio](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web).
