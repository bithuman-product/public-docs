---
title: "Web embed"
description: "Put a live, talking avatar on any web page with one iframe."
section: platforms
group: "Web"
order: 10
type: platform
llms: apps
searchTitle: "Web: embed a live avatar in any page"
renders: ["cloud", "browser"]
platforms: ["web"]
models: ["essence-2", "expression-2"]
claims: ["S1", "S2", "S29", "S17"]
next: ["/platforms/web/app", "/platforms/web/troubleshooting"]
moved:
  first-frame: /platforms/web#run-your-first-avatar
  render-in-the-visitors-tab-webgpu: /platforms/web/webgpu
  integrate-into-your-app: /platforms/web/app#integrate-into-your-app
  react-and-other-frameworks: /platforms/web/app#react-and-other-frameworks
  complete-example: /platforms/web/app#complete-example
  requirements: /platforms/web/app#requirements
  get-the-code: /platforms/web/app#get-the-code
  run-it: /platforms/web/app#run-it
  expected-output: /platforms/web/app#expected-output
  how-it-works: /platforms/web/app#how-it-works
  make-it-your-own: /platforms/web/app#make-it-your-own
  platform-notes: /platforms/web/app#platform-notes
  reference: /platforms/web/app#reference
  troubleshooting: /platforms/web/troubleshooting
---

One URL in an `<iframe>`: no npm package, no install and no secret in the browser.

## Before you start

The embed URL is `https://www.bithuman.ai/embed/<CODE>`, and the avatar listens and answers. By default it renders in the bitHuman cloud and streams to the page; with `render=local` it renders in the visitor's tab with WebGPU.

- A current browser. For lip-sync rendered in the tab, a usable GPU ([render in the tab](/platforms/web/webgpu)).
- An [agent code](/models/how-it-works#key-terms): `A23WJF0199` (the `wise-pup` sample avatar) or your own ([create your own avatar](/build/create-avatar)).
- For a private agent, an [embed token](/api/embedding) minted by your server.

## Authenticate

A public agent needs no credential. For a private agent, your server mints an [embed token](/api/embedding) with your API secret and passes it to the page. Sessions on your own agent bill your account per second, voice and AI included ([pricing](/pricing)).

## Run your first avatar

```html
<!doctype html>
<html>
  <body style="margin:0">
    <iframe src="https://www.bithuman.ai/embed/A23WJF0199"
            allow="microphone *" style="width:100%;height:100vh;border:0"></iframe>
  </body>
</html>
```

Expected: the avatar's picture with **Tap to talk**. Select it, allow the microphone, and the avatar greets you and answers when you speak. Keep the `*` in `allow`, or the microphone is blocked. To try it without a page, open [https://www.bithuman.ai/embed/A23WJF0199](https://www.bithuman.ai/embed/A23WJF0199).

The `wise-pup` sample ends each session after 2 minutes. For your site, embed your own agent ([create your own avatar](/build/create-avatar)); its sessions have no such limit.

<div class="fig-end">

```figure
web-embed
```

</div>

## Performance

Measured in the tab with WebGPU, in Chrome on an Apple M4.

```perf
web web-sustained
```
