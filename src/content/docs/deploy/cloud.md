---
title: "bitHuman cloud"
description: "bitHuman renders the avatar on its servers and streams it to you."
section: deploy
group: "Where it renders"
order: 10
type: deploy
llms: deploy
availability: "creator"
renders: ["cloud"]
models: ["essence-2", "expression-2", "essence-1", "expression-1"]
claims: ["S14", "S15", "S20", "S25", "S26", "S31"]
next: ["/platforms/web", "/platforms/rest", "/platforms/livekit"]
moved:
  models-available-here: /deploy#compare
  choosing-between-modes: /deploy#compare
---

## What it is

The fewest moving parts: bitHuman renders the avatar in the cloud and streams its video and audio to a web page, an app or a LiveKit room. You provision no GPU and install nothing.

Compare every mode: [Deployment options](/deploy#compare).

## Where it renders

```dataflow
cloud
```

```diagram
topology cloud
```

A managed agent's conversation runs on bitHuman's voice service with your persona, or with the voice and language providers whose keys you connect ([Voices](/build/voices), [Providers](/api/providers)). Traffic is encrypted in transit: HTTPS, and WebRTC media over DTLS-SRTP.

## Speed

The bitHuman cloud serves from several kinds of hardware; each is measured:

```perf
cloud-gpu apple-serve cloud-cpu
```

## Price

```price
cloud
```

## Limits

```session-caps
```

A session over your plan's limit is refused with `403 CONCURRENCY_LIMIT_REACHED` ([Rate limits](/api/rate-limits)). The network is needed for the whole session.

## First command

```html tab="Web embed"
<iframe src="https://www.bithuman.ai/embed/A23WJF0199" allow="microphone *"
        style="width:100%;height:600px;border:0"></iframe>
```

```bash tab="REST API"
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# → {"valid":true}
```

```bash tab="LiveKit"
pip install "livekit-agents[openai,silero]" livekit-plugins-bithuman python-dotenv
# then pass avatar_id= to bithuman.AvatarSession: /platforms/livekit
```

Next steps: [Web](/platforms/web), [REST API](/platforms/rest), [LiveKit](/platforms/livekit), or [a cloud avatar in your own room without the plugin](/platforms/livekit/cloud-avatar).

