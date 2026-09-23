---
title: "API quickstart"
description: "From nothing to a talking avatar over REST: embed a sample agent, check your API secret, speak, create your own agent and render a video."
section: api
group: "Get started"
order: 1
type: quickstart
label: "Quickstart"
---

A ladder: the first two steps are free and need no account; each later step builds on the one before.

## 1. Embed a sample avatar (no account)

```html
<iframe src="https://www.bithuman.ai/embed/A23WJF0199" allow="microphone *" style="width:100%;height:600px;border:0"></iframe>
```

Open the page and talk to it. Keep the `*` in `allow`, or the microphone is blocked. For your own site in production, mint an [embed token](/api/embedding).

## 2. Speak with text to speech (API secret)

```bash
export BITHUMAN_API_SECRET="<your API secret>"
curl -s -X POST https://api.bithuman.ai/v1/validate -H "api-secret: $BITHUMAN_API_SECRET"
# → {"valid":true}
curl -s -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"text": "Hello from bitHuman.", "voice": "F1"}' --output hello.wav
# → hello.wav
```

`/v1/validate` always returns `200`; read `valid`. Get an API secret under [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys).

## 3. Create your own agent (credits)

Creation is a one-time charge ([pricing](/guides/pricing#creation--one-time-credits)); a free balance returns `402`. Always send `model`.

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"model": "expression-2", "prompt": "You are a friendly fitness coach.", "image": "https://your-site.example/portrait.jpg"}'
# → {"success": true, "agent_id": "A80HVD8577", "status": "processing"}
```

Poll until `status` is `ready` or `failed` (about 2–2.5 hours for a second-generation model):

```bash
curl -s https://api.bithuman.ai/v1/agent/status/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
# → {"success": true, "data": {"status": "ready", "progress": 1.0, …}}
```

## 4. Make it speak in a live session

Open `https://www.bithuman.ai/embed/<your agent code>`, then push text from your backend:

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/A80HVD8577/speak \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"message": "Hello! Great to meet you."}'
# → {"agent_code": "A80HVD8577", "delivered_to_rooms": 1, …}
```

`404` means the agent is not yours, or it has no live session (the message says which).

## 5. Render a talking video

```bash
curl -s -X POST https://api.bithuman.ai/v1/video/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "Content-Type: application/json" \
  -d '{"agent_code": "A80HVD8577", "model": "expression-2", "input": {"type": "text", "text": "Welcome to our store."}}'
```

Poll `GET /v1/video/{job_id}` until `status` is `completed`, then download `video_url` ([Talking video](/api/video)).

## Next

- [Agents](/api/agents) · [Talking video](/api/video) · [Embedding](/api/embedding) · [Errors](/api/errors) · [OpenAPI reference](/api/reference)
