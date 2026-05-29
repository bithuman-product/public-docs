---
title: "API quickstart"
description: "Validate your key, generate an agent, and make it speak — in a handful of curl and Python calls."
section: api
group: "Get started"
order: 2
---

## Before you start

Get an API secret at [Developer → API Keys](https://www.bithuman.ai/#developer)
(free tier, no credit card). Export it so the examples below pick it up:

```bash
export BITHUMAN_API_SECRET=your_api_secret
```

## 1. Validate your key

The cheapest call you can make — it verifies your secret without spending
credits or needing an existing agent.

**curl**

```bash
curl -X POST https://api.bithuman.ai/v1/validate \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

**Python**

```python
import os, requests

resp = requests.post(
    "https://api.bithuman.ai/v1/validate",
    headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
)
print(resp.json())  # {"valid": true}
```

A `200` with `{"valid": true}` means you're good. Anything else is an auth or
networking problem — see [Errors](/api/errors).

## 2. Generate an agent

Agent generation is asynchronous: the call returns immediately with an
`agent_id` and a `processing` status. Generation costs 250 credits and typically
takes two to five minutes.

**curl**

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "prompt": "You are a friendly fitness coach.",
    "image": "https://example.com/headshot.jpg"
  }'
```

**Python — generate and poll**

```python
import os, time, requests

BASE = "https://api.bithuman.ai"
headers = {"content-type": "application/json",
           "api-secret": os.environ["BITHUMAN_API_SECRET"]}

resp = requests.post(f"{BASE}/v1/agent/generate", headers=headers, json={
    "prompt": "You are a friendly fitness coach.",
})
agent_id = resp.json()["agent_id"]
print("Generating:", agent_id)

while True:
    status = requests.get(
        f"{BASE}/v1/agent/status/{agent_id}",
        headers={"api-secret": os.environ["BITHUMAN_API_SECRET"]},
    ).json()["data"]
    if status["status"] == "ready":
        print("Ready:", status["model_url"])
        break
    if status["status"] == "failed":
        raise SystemExit(f"Failed: {status['error_message']}")
    time.sleep(5)
```

Poll [`GET /v1/agent/status/{agent_id}`](/api/agents) every 5 seconds. Treat
`ready` and `failed` as terminal; `generating` and `completed` are intermediate
— keep polling. See [Agents](/api/agents) for the full lifecycle.

## 3. Make it speak

Once an agent has an active session (for example a LiveKit room or browser
embed), push text into it. The avatar speaks the message aloud.

**curl**

```bash
curl -X POST https://api.bithuman.ai/v1/agent/A78WKV4515/speak \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"message": "Hello! Ready for today’s workout?"}'
```

**Python**

```python
import os, requests

requests.post(
    "https://api.bithuman.ai/v1/agent/A78WKV4515/speak",
    headers={"content-type": "application/json",
             "api-secret": os.environ["BITHUMAN_API_SECRET"]},
    json={"message": "Hello! Ready for today’s workout?"},
)
```

> **Note** `/speak` and `/add-context` require an **active session**. If the
> agent has no live room you'll get a `404 NO_ACTIVE_ROOMS`. Start a session
> via the [embed flow](/api/embedding) or a LiveKit worker first.

## Try voice without an avatar

You don't need an agent to use text-to-speech. One call returns a WAV:

```bash
curl -X POST https://api.bithuman.ai/v1/tts \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "Hello from bitHuman.", "voice": "F1"}' \
  --output hello.wav
```

See [Voice](/api/voice) for languages, voices, and streaming.

## Next steps

- [API reference](/api/reference) — every endpoint with a live console.
- [Authentication](/api/authentication) — runtime tokens and key rotation.
- [Python SDK](/sdk/python) — the same engine, in-process, with the canonical
  [push-audio/drain-frames loop](/concepts/audio-streaming).
