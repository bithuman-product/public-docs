---
title: "Browser rendering"
description: "Move avatar rendering out of your server and into the user's tab — one URL parameter, no install, no SDK call. What it needs, which agents can do it, and what it costs."
section: guides
group: "Build"
order: 1
---

## Rendering in the user's tab

Browser rendering moves the avatar **out of your server and into the user's
browser**. Your agent keeps its brain on the server — speech-to-text, the LLM,
text-to-speech — and the server's GPU is free.

Production since February 2026. No install and no SDK call: you append one
parameter to an existing agent landing page.

```text
https://www.bithuman.ai/<AGENT_CODE>?render=local
```

[Try it on a showcase agent →](https://www.bithuman.ai/A74NWD9723?render=local)

> **Start on `www.bithuman.ai`.** That host mints the session key and forwards
> you to the viewer, carrying your parameter with it. A link that starts on the
> viewer host has no session behind it and has to come back — it works, but
> `www` is the shorter road and the link to publish.

## When you'd reach for it

- **Server video egress is the bottleneck.** Cloud rendering publishes video; browser rendering publishes only the agent's speech audio. Bandwidth drops 10–20×.
- **You're paying for avatar GPU on the server.** In browser mode the server runs only the conversation, never the avatar.
- **Privacy.** The rendered video never leaves the user's machine — useful for kiosks, healthcare, education.
- **Offline.** In `avatar` mode the model is cached in the browser after the first load, so later sessions need no network for the avatar.
- **One pipeline everywhere.** The same browser build runs in Safari, Chrome, Firefox and Edge on macOS, Windows, Linux and iOS. No per-platform native build.

## The three modes

| Mode | How you ask for it | Where the avatar runs | Where the brain runs | Audio |
|---|---|---|---|---|
| **cloud** *(default)* | nothing, or `?render=cloud` | our servers | our servers | the agent's speech, over video |
| **browser** | `?render=local` | **the user's tab** | our servers | the agent's speech, audio only |
| **avatar** | `?rendering_mode=avatar` | **the user's tab** | nothing — a pure puppet | the user's microphone |

Cloud is the default for every visitor, every identity and every browser.
**Nobody gets a browser render unless the URL asks**, so your existing
deployments are unchanged.

`?rendering_mode=browser` is the long spelling of `?render=local`, kept working
for saved links. The parameter says *render here* — it does not choose an
engine; the agent's model does that.

> The landing page forwards a **named** set of parameters to the viewer:
> `render`, `rendering_mode`, `compute`, `model`, `deployment`, `greetingLang`,
> `greetingMsg` and the transparent-embed options. Anything else you append is
> dropped silently.

`avatar` mode resolves the agent's own model file. There is no way to point it
at a model you host yourself — if that is what you need,
[get in touch](mailto:hello@bithuman.ai).

## Whether it will work for your agent

Two things have to be true, and when either is not, **the session falls back to
cloud rendering rather than showing a wrong face**.

**1. Your agent's model must have a browser renderer.**

| Model | In the browser? |
|---|---|
| [expression-2](/concepts/expression-2) | yes |
| [essence-2](/concepts/essence-2) | yes |
| [essence-1](/concepts/essence-1) | yes |
| [expression-1](/concepts/expression-1) | **no** — it needs a server GPU by design. The viewer says so and does not silently cloud-render |

**2. Your identity must have a published browser bundle.** These are still
rolling out: broadly available for `expression-2`, and a **small pilot** for
`essence-2`. For a photoreal identity outside that pilot, `?render=local` still
serves a cloud render today. That is a publishing backlog, not a browser
limitation — ask us about your agent in
[Discord](https://discord.gg/ES953n7bPA).

## What the browser needs

Most of this is already true of any current browser. Two things are worth
knowing before you ship:

- **A real GPU makes the difference for lip-sync.** The speech step needs real
  GPU acceleration to keep up with live speech, and there is no software
  fallback for it. On a machine without one an `?render=local` session does
  **not** go black and does not silently revert to the cloud: you get the living
  idle loop and the agent's speech, and only the lip-sync is off. If you need
  lip-sync everywhere, use cloud rendering.
- **Your page needs two headers** if you host it yourself:
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: credentialless` (or `require-corp`). Without
  them the renderer is limited to a single thread and runs several times slower.
  The bitHuman-hosted landing page already sends them.

The browser downloads the model once (50–200 MB, per agent) plus a small shared
audio encoder, caches them, and renders on a `<canvas>`. Budget roughly 40 ms
per frame on a modest laptop; in `browser` mode add the network round-trip for
the agent's audio, and in `avatar` mode there is no network in the loop at all
once the model is cached.

### Checking a machine before you ship

`navigator.gpu` existing does **not** mean the GPU is usable. Feature-detect by
awaiting `requestAdapter()` and checking you got a real, non-software adapter:

```js
async function hasRealGPU() {
  if (!navigator.gpu) return false;
  const once = async () => {
    try { return (await navigator.gpu.requestAdapter()) ?? null; } catch { return null; }
  };
  // The FIRST call of a browser session can resolve null while the GPU process
  // is still starting, then return the real adapter on the next call. A
  // one-shot probe reports "no GPU" on hardware that has one.
  const first = await once();
  const adapter = first === null ? await once() : first;
  if (!adapter) return false;
  // Chromium moved this flag between two objects; read both, or a software
  // adapter reads as real — and on a software adapter this path is SLOWER.
  return adapter.isFallbackAdapter !== true && adapter.info?.isFallbackAdapter !== true;
}
```

[Browser — check before you ship](/examples/browser-webgpu-check) is this as a
script you can run in CI, alongside a check that the runtime files you serve are
the ones we published.

## What a browser session costs

"Runs locally" and "is free" are not the same sentence.

- **The conversation still bills.** Speech-to-text, the LLM and text-to-speech
  are metered exactly as they are in cloud mode. Rendering mode does not affect
  them.
- **Avatar serving bills zero.** That per-minute charge only starts when the
  rendering mode is `cloud`. There is no server render to charge for.

So: **browser rendering removes the avatar-serving line item from your bill. It
does not make the session free.** [Pricing](/guides/pricing) is the authority.

Running a model on your **own hardware** through an SDK is a different route and
*is* metered — see [self-hosting](/guides/self-hosting). Do not read this
section as applying to it.

## Embedding it in your own app

Two different things, and only one exists today.

**A renderer you can host yourself — available now.** A self-contained browser
build is published as static files: no npm, no bundler, no account. It is
**frames-driven** — you supply per-frame keypoints and it renders faces; turning
audio into those keypoints is not part of the package, so it is the right tool
for evaluating render quality and speed, not a lip-sync engine on its own. See
[Browser runtime](/sdk/web) for the API and the download.

**A JavaScript SDK for a full hosted session — not yet.** bitHuman publishes
no npm package: there is no client library that drives a cloud or self-hosted
avatar from your own React, Vue or vanilla app. To build a browser integration
against a hosted session today, drive [LiveKit](/sdk/livekit) directly or use the hosted
landing page with a rendering-mode parameter. Track it in
[Discord](https://discord.gg/ES953n7bPA).

## Where to go next

- [Browser runtime](/sdk/web) — the downloadable renderer's API surface.
- [Browser — check before you ship](/examples/browser-webgpu-check) — the checks above, runnable.
- [Deploy embed](/guides/deploy-embed) — drop a hosted avatar onto any page.
- [Run a model on your own hardware](/guides/self-hosting) — the SDK route, per platform.
- [Pricing](/guides/pricing) — the rates behind the billing section.
