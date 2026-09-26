---
title: "Web"
description: "Put a live, talking avatar on any web page with one iframe. No install and no API secret in the browser; render in the cloud or in the visitor's tab."
section: sdk
group: "Platforms"
order: 50
type: platform
label: "Web (embed)"
---

The web surface is one URL: `https://www.bithuman.ai/embed/<CODE>`. Put it in an `<iframe>` and the page gets a live avatar that listens and answers. There is no npm package and no secret in the browser.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **What renders** | [any character from one portrait](/concepts/expression-2) | [a photoreal person from one portrait](/concepts/essence-2) |
| **Cloud rendering (default)** | yes | yes |
| **In the visitor's tab (`?render=local`)** | yes, with WebGPU; otherwise it switches to cloud | yes, with WebGPU and a browser build; otherwise it switches to cloud |

## Before you start

- A current browser. For lip-sync rendered in the tab, a usable GPU (WebGPU).
- An agent code: `A23WJF0199` (the `wise-pup` sample) or your own from [Agents](/api/agents).
- For a private agent, an [embed token](/api/embedding) minted by your server.

## Install

Nothing to install.

## Authenticate

A public agent needs no credential. For a private agent, your server mints an [embed token](/api/embedding) with your API secret and passes it to the page. Sessions bill the agent's owner: credits pay for session time, talking or idle, and the conversation (speech recognition, language model and voice) bills in every mode ([pricing](/guides/pricing)).

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

## Integrate into your app

Add parameters to the URL:

| Parameter | Values | Effect |
|---|---|---|
| `render` | `cloud` (default), `local` | Where the avatar renders: our servers, or the visitor's tab |
| `rendering_mode` | `browser`, `avatar` | Long form of `render=local`; `avatar` renders in the tab and lip-syncs the visitor's own microphone, with no conversation |
| `greetingLang` | a language code, for example `es` | Language of the first greeting |
| `greetingMsg` | text | The first thing the avatar says |

A private agent also takes `token`, and a session can pin its model with `model`; both are on [Embedding](/api/embedding). Other parameters are ignored.

`render=local` works for any avatar you can embed, and it is off by default: without it, every session renders in the cloud and streams to the page. For a private agent it needs an embed token minted by the agent's owner, the same one the iframe already uses. The conversation always runs on our servers.

With `render=local`, each device proves it can keep up before it renders:

1. **First visit on a device.** The avatar streams from the cloud at once. In the background the page downloads the avatar's web bundle (50–200 MB, then cached) and measures how fast this device renders it.
2. **The device passes.** From the next session on, the avatar renders in the tab.
3. **The device fails.** The avatar keeps streaming from the cloud, and the page shows this notice: "Your device can't render this avatar locally, so it's streaming from the cloud."

The page remembers the result for this browser and GPU for 30 days, and measures again after a browser update. To pass, a device must render faster than real time:
- with WebGPU: at least 1.25× the avatar's playback rate;
- without WebGPU: at least 2×.

The page tells yours which mode it chose with a `message` event:

```js
window.addEventListener("message", (e) => {
  if (e.data?.type !== "bithuman:render-mode") return;
  // e.data.mode: "local" | "cloud"
  // e.data.reason: "ok" | "probing" | "no-webgpu" | "software-adapter" | "unsupported-browser"
  //                | "below-realtime" | "probe-failed" | "no-web-bundle"
  // e.data.next: "local" when this device passed and the next session renders in the tab
  // e.data.bar: the bar the device was measured against
});
```

Do not send `Cross-Origin-Embedder-Policy` from the page that holds the iframe: the embed does not send one itself, so the browser refuses to load it.

To build your own video UI instead of the hosted page, subscribe to a cloud-rendered avatar over [LiveKit](/sdk/livekit).

## Platform notes

- Expression 1 avatars render in the cloud only.
- The in-tab render works for Essence 1, Expression 2, and Essence 2 avatars that have a browser build.

## Performance

In-browser frame rates (WebGPU) are on [Web browser performance](/performance/web).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The microphone never activates | `allow` is missing `microphone *` | use `allow="microphone *"` |
| `404` | the agent code is wrong, or the agent is private | check the code; mint an [embed token](/api/embedding) for a private agent |
| `render=local` reloads as `render=cloud` | this device has not passed the local-render check yet (first visit), failed it, or this avatar has no browser build | nothing to do; it is served from the cloud. Listen for `bithuman:render-mode` to see why |
| The iframe shows a browser error page | your page sends `Cross-Origin-Embedder-Policy` | remove that header from the page that holds the iframe |

## Reference

- [Embedding](/api/embedding): embed tokens, sizing and private agents.
- [LiveKit](/sdk/livekit): your own UI over a cloud-rendered avatar.
- Examples: [Next.js UI](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) · [Gradio](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web).
