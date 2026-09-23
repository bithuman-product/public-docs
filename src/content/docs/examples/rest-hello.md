---
title: "REST — Hello, avatar"
description: "Zero-to-avatar with the bitHuman REST API using nothing but curl: validate, generate an agent from a prompt, poll until ready."
section: examples
group: "Examples"
order: 12
---

## Prerequisites

- A bitHuman API secret — get one at [Developer → API Secrets](https://www.bithuman.ai/developer/api-keys); see [Authentication](/api/authentication).
- `curl` and `python3` (for pretty-printing JSON) — preinstalled on macOS and most Linux. No SDK, no language runtime.
- **At least 250 credits on the account.** Step 2 creates an agent, and creation is a one-time charge: 250 credits for `expression-1` (what this walkthrough builds), 500 for `essence-2`, 2000 for `expression-2`. The free tier's **99 credits/month covers none of them** — a free balance gets `402 INSUFFICIENT_BALANCE` and no agent. Top up or pick a plan first: [the free-tier arithmetic](/guides/pricing#the-free-tier-cannot-create-an-agent).
- Works from any stack that can make HTTPS requests. Base URL is `https://api.bithuman.ai`; auth is the `api-secret` header on every call.

Export the secret once — every command on this page reads it from the environment:

```bash
export BITHUMAN_API_SECRET="<your API secret>"   # from Developer → API Secrets
```

Then confirm you can afford step 2 before you run it. This call spends nothing:

```bash
curl -s https://api.bithuman.ai/v2/credit-summaries \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  | python3 -c "import sys,json;print('balance:', int(json.load(sys.stdin)['data']['balance']), 'credits')"
```

A balance under 250 means step 2 cannot run — see [Pricing & credits](/guides/pricing#the-free-tier-cannot-create-an-agent).

> **Note** **Want to spend less on the first run?** Creation is the expensive step, not serving. Downloading a free-gallery avatar model is an anonymous, free download, and running it bills per live minute instead of a one-time 250–2000-credit creation — see [Python — Hello, avatar](/sdk/python) (the render itself still needs the same free API secret).

## Run it

1. Validate your secret — the cheapest call, spends no credits. `/v1/validate` always returns `200`; inspect the `valid` field.

```bash
curl -s -X POST https://api.bithuman.ai/v1/validate \
  -H "api-secret: $BITHUMAN_API_SECRET" | python3 -m json.tool
```

2. Generate an agent from a text prompt (optionally add an `image` URL of a face). This is asynchronous and returns an `agent_id`. **It debits 250 credits** — the `expression-1` rate named in the body below. Name the model on every creation call: the price is the price of the model that gets built, so leaving it out leaves the cost to a server default. `"model": "essence-2"` costs 500 and `"model": "expression-2"` costs 2000 ([creation costs](/guides/pricing#creation--generation--one-time-credits)).

```bash
curl -s -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"prompt": "You are a friendly fitness coach.", "model": "expression-1", "aspect_ratio": "16:9"}' \
  | python3 -m json.tool
```

> **Choosing a second-generation model.** This walkthrough builds an
> `expression-1` agent: the cheapest creation at 250 credits, and the fastest.
> To create an `essence-2` (500 credits) or `expression-2` (2000 credits) agent
> instead, change the `"model"` value — or send `"auto"` and let the platform
> pick, billing the routed model's rate. See
> [Essence 2 & Expression 2](/concepts/models). Their creation does real
> per-identity work, so it takes **about 2 to 2.5 hours**
> ([creation times](/api/agents#model-specific-inputs-and-creation-times)), not
> the minutes below — keep polling `status` rather than applying a short
> timeout.

3. Save the returned `agent_id`, then poll status every ~5 s until `data.status` is `ready`. Keep polling through `processing` → `generating` → `completed` → `success` — only `ready` and `failed` are terminal. **`success` is a step-level marker written mid-run** (around 20% and 45% `progress`), so don't stop on it unless `progress` is also `1.0` (generation takes 2–5 min; failures auto-refund credits).

```bash
export AGENT_ID=PASTE_AGENT_ID_FROM_STEP_2   # e.g. A91XMB7113 — must be an agent on your own account
curl -s "https://api.bithuman.ai/v1/agent/status/$AGENT_ID" \
  -H "api-secret: $BITHUMAN_API_SECRET" | python3 -m json.tool
```

4. Once ready, open the agent in the web viewer and start a conversation.

```bash
AGENT_URL="https://www.bithuman.ai/$AGENT_ID"
echo "$AGENT_URL"              # paste it into any browser
# macOS: open "$AGENT_URL"  ·  Linux: xdg-open "$AGENT_URL"
```

## What you'll see

`/v1/validate` returns `{"valid": true}`. Generation returns `{"success": true, "agent_id": "...", "status": "processing"}`, and the status poll climbs through `progress` 0.0 → 1.0 until `data.status` is `success`/`ready` with a `model_url`. Opening the viewer URL gives you a live, talking avatar.

> **Warning** The `POST /v1/agent/{code}/speak` endpoint only works while the agent is in an **active session** (someone connected via the viewer, a LiveKit room, or the dashboard). With no active session you'll get `No active rooms found for agent`.

## Full code

A single copy-paste script that validates, checks you can pay for the creation,
generates, and polls to ready. It debits one creation charge — 250 credits as
written — and exits before spending anything if the balance is short:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${BITHUMAN_API_SECRET:?Set BITHUMAN_API_SECRET first}"
BASE="https://api.bithuman.ai"
MODEL="expression-1"   # 250 credits. essence-2 = 500 credits, expression-2 = 2000.
COST=250               # keep in step with MODEL — https://docs.bithuman.ai/guides/pricing

# 1. Validate the secret (spends nothing; always HTTP 200, read the `valid` field)
curl -s -X POST "$BASE/v1/validate" \
  -H "api-secret: $BITHUMAN_API_SECRET" | python3 -m json.tool

# 2. Refuse before spending: creation is one-time and the free tier is 99 credits/month
BALANCE=$(curl -s "$BASE/v2/credit-summaries" -H "api-secret: $BITHUMAN_API_SECRET" \
  | python3 -c "import sys,json;print(int(json.load(sys.stdin)['data']['balance']))")
echo "Balance: $BALANCE credits — creating $MODEL costs $COST"
[ "$BALANCE" -ge "$COST" ] || { echo "Not enough credits: top up at https://www.bithuman.ai"; exit 1; }

# 3. Generate (debits $COST, returns agent_id)
RESP=$(curl -s -X POST "$BASE/v1/agent/generate" \
  -H "Content-Type: application/json" \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -d "{\"prompt\": \"You are a friendly fitness coach.\", \"model\": \"$MODEL\", \"aspect_ratio\": \"16:9\"}")
AGENT_ID=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['agent_id'])")
echo "Agent: $AGENT_ID"

# 4. Poll until ready or failed (data.status)
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
git clone https://github.com/bithuman-product/bithuman-examples.git
cd bithuman-examples/api/rest-api/curl
export BITHUMAN_API_SECRET="<your API secret>"
./validate.sh
```

`validate.sh` spends nothing. `generate-agent.sh` performs a real creation and
debits credits; it sends no `model` field, so confirm your balance and the
[creation costs](/guides/pricing#creation--generation--one-time-credits) before
you run it.

Full source: [GitHub](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api)

## Next steps

- [API quickstart](/api/quickstart) — the full REST walkthrough
- [Agents API](/api/agents) — generate and drive agents
- [Essence 2 & Expression 2](/concepts/models) — pick a second-generation model (creation takes about 2–2.5 h)
- [Embed widget](/api/embedding) — put the agent on a page
- [API reference](/api/reference) — every operation with a live console
