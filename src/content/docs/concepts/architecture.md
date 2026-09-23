---
title: "Architecture"
description: "How bitHuman is built — one portable engine, thin language SDKs on top, and your app on top of that. Audio in, lip-synced frames out, the same on every platform."
section: concepts
group: "Core"
order: 5
---

## The three layers

bitHuman is one portable engine with thin language bindings on top, and your app on top of that. Every layer reads the same [model file](/concepts/avatars-imx) and produces the same lip-synced frames — on an iPhone, a Mac, a Linux box, a browser, or a cloud GPU.

<div class="bh-stack">
  <div class="bh-layer"><div class="bh-l-title">Apps &amp; tools</div><div class="bh-l-sub">the bitHuman CLI · your own app · LiveKit transport for WebRTC</div></div>
  <div class="bh-layer"><div class="bh-l-title">Language SDKs</div><div class="bh-l-sub">Python · Swift · Kotlin — thin, idiomatic bindings over the same engine; the browser through the hosted URL or an iframe</div></div>
  <div class="bh-layer bh-accent"><div class="bh-l-title">The bitHuman engine</div><div class="bh-l-sub">The portable avatar renderer, shipped inside every SDK — nothing separate to install. macOS · iOS · Android · Linux · the browser</div></div>
</div>

Every layer drives the same pipeline — audio goes in, lip-synced frames come out:

<div class="bh-flow"><span class="bh-node">16 kHz mono audio</span><span class="bh-sep">→</span><span class="bh-node">bitHuman engine</span><span class="bh-sep">→</span><span class="bh-node">lip-synced frames</span></div>

You integrate at the SDK layer. The engine is built into each SDK, so your app needs the bitHuman dependency and nothing else. To pick a platform, start at [SDK](/sdk); which model runs where is on [Models](/concepts/models#where-each-model-runs).

## What stays true across every surface

- **One model file, every surface.** The same audio produces the same frames in every SDK.
- **A stable public API.** Patches never break your source, minors add without removing, and majors call out breaks explicitly.
- **Surfaces mix.** The Swift SDK in your iOS app with the Python package on your backend is supported; keep each one current — [Downloads](/downloads#current-shipping-versions) lists the current versions.
- **One credential.** The same key drives every surface; how it is exchanged and billed is on [Authentication](/api/authentication) and [pricing](/guides/pricing).

## Where to go next

- [Models](/concepts/models) — the four models, where each runs, and which to pick
- [Audio streaming](/concepts/audio-streaming) — the push/drain loop every SDK shares
- [Avatars and the `.imx` format](/concepts/avatars-imx) — how avatars are packaged
