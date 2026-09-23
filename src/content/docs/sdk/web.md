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
| **In the visitor's tab (`?render=local`)** | yes | yes, when the avatar has a browser build; otherwise it switches to cloud |

## Before you start

- A current browser. For lip-sync rendered in the tab, a usable GPU (WebGPU).
- An agent code: `A23WJF0199` (the `wise-pup` sample) or your own from [Agents](/api/agents).
- For a private agent, an [embed token](/api/embedding) minted by your server.

## Install

Nothing to install.

## Authenticate

A public agent needs no credential. For a private agent, your server mints an [embed token](/api/embedding) with your API secret and passes it to the page. Sessions bill the agent's owner: credits pay for talking time, idle time is free, and the conversation (speech recognition, language model and voice) bills in every mode ([pricing](/guides/pricing)).

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

Other parameters are ignored. With `render=local`, the avatar downloads once (50–200 MB, then cached) and renders in the tab with WebGPU; the conversation still runs on our servers. Without a usable GPU the avatar shows its idle motion and plays the speech without lip-sync, so use cloud rendering when you need lip-sync on every machine.

Check for a usable GPU before you choose `render=local`:

```js
async function hasRealGPU() {
  if (!navigator.gpu) return false;
  const once = async () => { try { return (await navigator.gpu.requestAdapter()) ?? null; } catch { return null; } };
  const adapter = (await once()) ?? (await once());   // the first request can return null while the GPU starts
  return !!adapter && adapter.isFallbackAdapter !== true && adapter.info?.isFallbackAdapter !== true;
}
```

If you host the page yourself and use `render=local`, send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`; without them the in-tab renderer runs on one thread.

To build your own video UI instead of the hosted page, subscribe to a cloud-rendered avatar over [LiveKit](/sdk/livekit).

## Platform notes

- Expression 1 avatars render in the cloud only.
- The in-tab render works for Essence 1, Expression 2, and Essence 2 avatars that have a browser build.

## Performance

In-browser frame rates (WebGPU) are on the [performance page](/performance).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The microphone never activates | `allow` is missing `microphone *` | use `allow="microphone *"` |
| `404` | the agent code is wrong, or the agent is private | check the code; mint an [embed token](/api/embedding) for a private agent |
| `render=local` reloads as `render=cloud` | this Essence 2 avatar has no browser build | nothing to do; it is served from the cloud |
| In-tab rendering is slow | the page is not cross-origin isolated | send the two headers above |
| The avatar moves but its lips do not follow | no usable GPU in this browser | use cloud rendering, or check `hasRealGPU()` first |

## Reference

- [Embedding](/api/embedding): embed tokens, sizing and private agents.
- [LiveKit](/sdk/livekit): your own UI over a cloud-rendered avatar.
- Examples: [Next.js UI](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) · [Gradio](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web).
