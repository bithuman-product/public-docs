---
title: "Architecture V3 (preview)"
description: "The V3 unified engine: bithuman-engine, the Engine → Avatar → Session object model, one renderer plug-in per engine per plane, and the .imx artifact — preview of the next-generation architecture."
section: concepts
group: "Architecture"
order: 6
draft: true
---

> **Preview.** V3 is the next-generation unified architecture, currently in
> validation. The APIs below are frozen-candidate and may still change before
> release. Today's shipping architecture is described in
> [Architecture](/concepts/architecture).

## One engine, three objects

V3 unifies every bitHuman render engine behind **one library** —
`bithuman-engine` — and **one interface** of three objects:

| Object | What it is | Lifetime |
|---|---|---|
| **Engine** | The runtime: credentials, host capabilities, network callbacks, renderer registry, dependency cache, meter, event spine. | One per process |
| **Avatar** | A loaded `.imx`. Opening negotiates the best renderer for this machine and validates the license. | One per identity |
| **Session** | A live, A/V-synced stream: pacing, audio↔frame pairing, barge-in, watchdog, delivery via sink callbacks. | One per stream |

```text
engine  = Engine(api_key=…)          # the runtime
avatar  = engine.open("model.imx")   # a loaded identity
session = avatar.start(on_video=…, on_audio=…)
session.speak(pcm)                   # stream 16 kHz mono s16 — any chunk length
session.finish()                     # the utterance is complete
session.interrupt()                  # barge-in
session.stop()
```

The utterance triple is `speak / finish / interrupt` — append / commit /
abort. `finish()` matters: the audio→motion model needs ~480 ms of *future*
audio to animate the mouth (coarticulation), so only the caller knows the
stream ended. A silence-gap fallback completes a forgotten utterance ~0.6 s
later.

## Render engines × planes

A **plane** is one inference runtime; a **renderer** is one engine on one
plane (`bithuman-renderer-<engine>-<plane>`). The `.imx` declares what it
needs; the engine loads *only* the matching renderer — nothing unused is
ever downloaded.

| Engine | What it is | Runs on |
|---|---|---|
| `essence-1` | Photoreal, first generation | anywhere |
| `essence-2` | Photoreal, realtime | anywhere |
| `essence-2-max` | Photoreal, highest fidelity | GPU |
| `expression-1` | Stylized, first generation | GPU |
| `expression-2` | Stylized / creatures | anywhere |

Planes: `onnxruntime-cpu` · `onnxruntime-cuda` · `tensorrt-cuda` ·
`coreml-neural-engine` · `coreml-gpu` · `mlx` · `litert-xnnpack` ·
`onnxruntime-webgpu` · `onnxruntime-wasm`.

## Sessions: streaming solved once

Historically every serve tier re-implemented pacing and A/V sync. In V3 the
session layer lives **inside the engine**: one implementation of the fps
clock, audio↔frame pairing (every frame carries `pts_us` and
`audio_position_samples`), graceful degradation (underruns are counted, the
last frame is held — never a freeze), and a watchdog that turns a wedged
renderer into a recoverable event instead of a hang.

Transports are SDK-side adapters over the sink callbacks: LiveKit/WebRTC,
WebSocket, canvas paint (in-browser via WASM), local playback, file mux.

## The artifact: `.imx`

One model file, five keys, five axes:

```jsonc
{
  "format_version": 3,                    // parse
  "engine": { "id": "essence-2",          // run
              "planes": [ { "id": "onnxruntime-cpu", "members": [ … ] } ] },
  "actions": [ { "id": "wave" } ],        // do — session.perform("wave")
  "dependencies": [                        // need — referenced, never contained
    { "id": "audio-encoder-fp32", "sha256": "…" } ],
  "license": { "profiles": ["offline-prepaid"] }   // may
}
```

Shared, identity-agnostic files (like the speech encoder) are
content-addressed **references** — fetched once, shared by every avatar that
pins the same hash.

## Hosted and embedded — one product

The Cloud API is the *hosted binding* of the same objects: `POST /v1/avatars`,
`POST /v1/sessions` (→ LiveKit credentials), `POST /v1/videos` (batch = a
session in offline mode). The workers behind the API embed the same engine
through the same SDK you do. One implementation, audited once.

## The tool

One binary, one operation registry, two projections — shell subcommands for
humans, MCP tools for AI agents:

```text
bithuman run avatar.imx [-i audio] [-o out.mp4] [--check]
bithuman pack bundle/ -o out.imx
bithuman list [query]
bithuman usage
bithuman auth
bithuman mcp        # the same operations, served to AI agents
```
