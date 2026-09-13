---
title: "Architecture"
description: "How bitHuman is built — one portable engine, thin language SDKs on top, and your app on top of that. Audio in, lip-synced frames out, the same on every platform."
section: concepts
group: "Architecture"
order: 5
---

## The three layers

bitHuman is one portable engine with thin language bindings on top, and your app on top of that. Every layer reads the same [`.imx` model file](/concepts/avatars-imx) and produces the same lip-synced frames — on an iPhone, a Raspberry Pi, a MacBook, a browser, or a cloud GPU.

<div class="bh-stack">
  <div class="bh-layer"><div class="bh-l-title">Apps &amp; tools</div><div class="bh-l-sub">the bitHuman CLI · your own app · LiveKit transport for WebRTC</div></div>
  <div class="bh-layer"><div class="bh-l-title">Language SDKs</div><div class="bh-l-sub">Python · Swift · Kotlin · JavaScript — thin, idiomatic bindings over the same engine</div></div>
  <div class="bh-layer bh-accent"><div class="bh-l-title">The bitHuman engine</div><div class="bh-l-sub">The portable avatar renderer. Shipped inside every SDK — there is nothing separate to install. macOS · iOS · Android · Linux · the browser</div></div>
</div>

Every layer drives the same pipeline — audio goes in, lip-synced frames come out:

<div class="bh-flow"><span class="bh-node">16 kHz mono audio</span><span class="bh-sep">→</span><span class="bh-node">bitHuman engine</span><span class="bh-sep">→</span><span class="bh-node">lip-synced frames</span></div>

You integrate at the SDK layer and never need to know what is underneath. The engine is built into each SDK, so your app's manifest needs the bitHuman dependency and nothing else — no separate runtime, no transitive media libraries to pin.

To pick a surface and install it, start at [SDK](/sdk).

## What stays true across every surface

- **One `.imx`, every surface.** A model file runs the same way in every SDK — we test that the same audio produces the same frames everywhere.
- **A stable public API.** Each language SDK is stable across patch and minor releases. Patches never break your source; minors add without removing; majors call out breaks explicitly.
- **Compatibility is our problem, not yours.** Mixing surfaces in one project — the Swift SDK in your iOS app with the Python wheel on your backend — is supported and tested. Keep each one reasonably current and they work together; the [Downloads](/downloads#current-shipping-versions) page lists the current version of each.

The one skew that is **not** supported is a Python major: `bithuman` 1.x and 3.x reshaped the API, so pin the whole Python stack to one major version.

## Where each model runs

Which model runs on which hardware — cloud, your own servers, a phone, or the browser — is on one page: [where each model runs](/concepts/where-models-run). Measured frame rates for every platform are on the [performance page](/sdk/performance).

## Authentication and billing

One credential drives every surface; only the env-var name differs by platform convention:

```text
BITHUMAN_API_SECRET    # Python, REST API, CLI
BITHUMAN_API_KEY       # Swift (Apple convention)
```

The SDK never holds the long-lived secret in process memory — it exchanges the secret for a short-lived runtime token at startup, auto-renewing on the billing heartbeat. Failed heartbeats trigger a 5-minute offline grace window before the avatar pauses. Audio-only mode (no attached avatar) is fully offline and bills nothing. See [Pricing](/guides/pricing).

## Where to go next

- [Models](/concepts/models) — Essence vs Expression in depth.
- [Essence 2 & Expression 2](/concepts/models-v2) — the second-generation models and where each one runs.
- [Avatars and the `.imx` format](/concepts/avatars-imx) — how avatars are packaged.
- [Quickstart](/api/quickstart) — your first avatar in ~2 minutes.
- [Python SDK](/sdk/python) — the easiest surface to script from.
