---
title: "REST — Hello, avatar"
description: "Zero-to-avatar with the bitHuman REST API using nothing but curl: validate, generate an agent from a prompt, poll until ready."
section: examples
group: "Examples"
order: 12
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Keys](https://www.bithuman.ai/#developer); see [Authentication](/api/authentication).
- `curl` and `python3` (for pretty-printing JSON) — preinstalled on macOS and most Linux. No SDK, no language runtime.

```bash
export BITHUMAN_API_SECRET=your_secret
```

- Works from any stack that can make HTTPS requests. Base URL is `https://api.bithuman.ai`; auth is the `api-secret` header on every call.

> **Note** **Want to try for free first?** Generating an agent costs credits. To render an avatar at **$0 with no account**, use the SDK quickstart — it auto-downloads a sample model: see [Python — Hello, avatar](/examples/python-hello).

## Run it

1. Validate your secret — the cheapest call, spends no credits. `/v1/validate` always returns `200`; inspect the `valid` field.

```bash
curl -s -X POST https://api.bithuman.ai/v1/validate \
  -H "api-secret: $BITHUMAN_API_SECRET" | python3 -m json.tool
```

2. Generate an agent from a text prompt (optionally add an `image` URL of a face). This is asynchronous and costs credits; it returns an `agent_id`.

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"prompt": "You are a friendly fitness coach.", "aspect_ratio": "16:9"}' \
  | python3 -m json.tool
```

3. Save the returned `agent_id`, then poll status every ~5 s until `data.status` is `ready`. Keep polling through `processing` → `generating` → `completed` — only `success`/`ready` and `failed` are terminal (generation takes 2–5 min; failures auto-refund credits).

```bash
export AGENT_ID=A91XMB7113   # paste the agent_id from step 2
curl -s "https://api.bithuman.ai/v1/agent/status/$AGENT_ID" \
  -H "api-secret: $BITHUMAN_API_SECRET" | python3 -m json.tool
```

4. Once ready, open the agent in the web viewer and start a conversation.

```bash
open "https://www.bithuman.ai/$AGENT_ID"   # or paste into any browser
```

## What you'll see

`/v1/validate` returns `{"valid": true}`. Generation returns `{"success": true, "agent_id": "...", "status": "processing"}`, and the status poll climbs through `progress` 0.0 → 1.0 until `data.status` is `success`/`ready` with a `model_url`. Opening the viewer URL gives you a live, talking avatar.

> **Warning** The `POST /v1/agent/{code}/speak` endpoint only works while the agent is in an **active session** (someone connected via the viewer, a LiveKit room, or the dashboard). With no active session you'll get `No active rooms found for agent`.

## Full code

A single copy-paste script that validates, generates, and polls to ready:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${BITHUMAN_API_SECRET:?Set BITHUMAN_API_SECRET first}"
BASE="https://api.bithuman.ai"

# 1. Validate
curl -s -X POST "$BASE/v1/validate" \
  -H "api-secret: $BITHUMAN_API_SECRET" | python3 -m json.tool

# 2. Generate (returns agent_id)
RESP=$(curl -s -X POST "$BASE/v1/agent/generate" \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"prompt": "You are a friendly fitness coach.", "aspect_ratio": "16:9"}')
AGENT_ID=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['agent_id'])")
echo "Agent: $AGENT_ID"

# 3. Poll until ready or failed (data.status)
while true; do
  S=$(curl -s "$BASE/v1/agent/status/$AGENT_ID" -H "api-secret: $BITHUMAN_API_SECRET")
  STATUS=$(echo "$S" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('status','unknown'))")
  echo "  status: $STATUS"
  { [ "$STATUS" = "ready" ] || [ "$STATUS" = "success" ]; } && { echo "Open https://www.bithuman.ai/$AGENT_ID"; break; }
  [ "$STATUS" = "failed" ] && { echo "Generation failed (credits auto-refunded)"; exit 1; }
  sleep 5
done
```

The repo ships this as runnable per-endpoint scripts (`validate.sh`, `generate-agent.sh`, `speak.sh`, …):

```bash
git clone https://github.com/bithuman-product/bithuman-sdk-public.git
cd bithuman-sdk-public/Examples/rest-api/curl
export BITHUMAN_API_SECRET=your_secret
./validate.sh
```

Full source: [GitHub](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/rest-api)

## Next steps

- [API reference](/api/reference) — every operation with a live console.
- [API quickstart](/api/quickstart) — the guided path through your first calls.
- [Agents](/api/agents) — the full generate → poll → speak lifecycle.
