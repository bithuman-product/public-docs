---
title: "Web example"
description: "Put a live, talking bitHuman avatar on any web page with one iframe: no install, no build step, no account for the sample avatar."
section: examples
group: "Examples"
order: 5
type: example
label: "Web"
---

<figure class="showcase">
  <video controls preload="none" playsinline muted poster="/examples/web/hero.webp" width="460" height="760" src="/examples/web/clip.mp4"></video>
  <figcaption>The <code>wise-pup</code> sample avatar in a plain HTML page in Chrome, answering a typed question (the recording has no sound).</figcaption>
</figure>

One `<iframe>` gives a page a live avatar that listens, thinks and answers: speech recognition, the language model, the voice and the lip-synced video all come with it.

## Requirements

| You need | Notes |
|---|---|
| A current browser | Chrome, Edge, Safari or Firefox |
| A local web server | the page must be served over `http://localhost` or HTTPS for the microphone to work |
| Nothing else | the sample avatar needs no account; your own avatar needs an [embed token](/api/embedding) |

## Get the code

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

## Run it

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` and allow the microphone.

## Expected output

The avatar greets you within a few seconds. Speak, or type into the **Type or speak…** box, and it answers out loud with its lips in sync. The red button ends the session.

## How it works

The iframe loads the hosted viewer for agent `A23WJF0199`. The viewer opens a real-time session: your microphone audio goes to the agent, and the agent's voice and video come back. `allow="microphone *"` lets the iframe ask for the microphone; without the `*` the browser blocks it. URL parameters, sizing and events are on [Web](/sdk/web).

## Make it your own

- **Your own avatar:** replace `A23WJF0199` with your agent code. A private agent needs an [embed token](/api/embedding) minted by your server with your API secret; never put the secret in the page.
- **Push what it says:** from your backend, `POST /v1/agent/{code}/speak` makes a live avatar say a line ([Agents](/api/agents)).
- **Size and layout:** any width and height work; keep roughly a 7:12 portrait shape for Expression 2 avatars.

## Troubleshooting

| Symptom | Fix |
|---|---|
| No microphone prompt | keep `microphone *` (and `camera *` for camera chat) in `allow`, and serve the page from `localhost` or HTTPS |
| A blank frame | check [status.bithuman.ai](https://status.bithuman.ai), then reload |
| Your own avatar does not load | a private agent needs an [embed token](/api/embedding) from your server |

## Next

- [Web SDK](/sdk/web) · [Embedding](/api/embedding) · [REST example](/examples/rest-hello)
