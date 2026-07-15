---
title: "Runtime sessions"
description: "List live avatar sessions, read a session transcript, terminate a session, or revoke every runtime key at once."
section: api
group: "Account & teams"
order: 41
---

## Overview

See and control the avatar sessions running on your account — list live sessions with their
burn rate, read a session's transcript, terminate one, or (in an emergency) revoke every
runtime key at once.

Base URL `https://api.bithuman.ai`. Authenticate with your `api-secret`. The `{user_id}` in the
path is your own account id — get it from [`GET /v1/me`](/api/billing#account-status).

## List sessions

`GET /v2/{user_id}/runtime-sessions` — derived sessions plus live account KPIs.

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `window` | string | `all` | `live` (only running), `recent` (idle + ended), or `all`. |
| `kind` | string | `all` | `conversations` (cloud), `self_hosted`, or `all`. |
| `limit` | int | `50` | Max sessions to return (1–200). |

```bash
curl "https://api.bithuman.ai/v2/$USER_ID/runtime-sessions?window=live" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "success": true,
  "data": {
    "active_count": 1,
    "live_burn_rate_cr_per_min": 12.5,
    "credits_this_hour": 340,
    "sessions": [
      {
        "id": "a3f1c8e2-…-9b02",
        "agent_code": "agent_greeter",
        "agent_name": "Greeter",
        "billing_type": "usage_agent_video_chat_on_imaginex",
        "key_alias": "prod-server",
        "room_name": "room_a3f1c8e2",
        "started": "2026-07-15T15:20:00Z",
        "last_seen": "2026-07-15T15:33:00Z",
        "minutes": 13.0,
        "credits": 162,
        "burn_rate_cr_per_min": 12.5,
        "status": "live",
        "has_transcript": true
      }
    ]
  }
}
```

The KPIs (`active_count`, `live_burn_rate_cr_per_min`, `credits_this_hour`) are account-wide over
the last hour; `sessions` is the filtered list. Use a session's `id` for the calls below.

## Read a transcript

`GET /v2/{user_id}/runtime-sessions/{session_id}/messages` — the conversation, oldest first.

```bash
curl "https://api.bithuman.ai/v2/$USER_ID/runtime-sessions/a3f1c8e2-…/messages" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{
  "success": true,
  "data": {
    "session_id": "a3f1c8e2-…",
    "agent_code": "agent_greeter",
    "started": "2026-07-15T15:20:00Z",
    "ended": "2026-07-15T15:33:00Z",
    "live": true,
    "messages": [
      { "timestamp": "2026-07-15T15:20:03Z", "role": "user", "message": "Hi there" },
      { "timestamp": "2026-07-15T15:20:05Z", "role": "assistant", "message": "Hello! How can I help?" }
    ]
  }
}
```

Only cloud voice/chat sessions record a transcript; self-hosted sessions return `messages: []`.

## Terminate a session

`POST /v2/{user_id}/runtime-sessions/{session_id}/terminate` — stop **one** session. Never
touches an API key.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | no | Free-text stop reason. Default `user-terminated`. |

```bash
curl -X POST "https://api.bithuman.ai/v2/$USER_ID/runtime-sessions/a3f1c8e2-…/terminate" \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" -d '{}'
```

```json
{
  "success": true,
  "data": { "session_id": "a3f1c8e2-…", "closed": true, "ended": true, "self_hosted": false,
            "note": "Session ended — the avatar disconnected and the conversation closed." }
}
```

For a cloud session this ends the LiveKit room; for a self-hosted runtime it closes the activity
record (the runtime is on your hardware). Errors: `404` no such session (or not yours).

## Revoke all keys

`POST /v2/{user_id}/runtime/revoke-all` — the emergency stop. Disables **every** runtime key on
the account (e.g. a leak). Live sessions stop within one refresh cycle (~5 min).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | no | Free-text reason. |

```bash
curl -X POST "https://api.bithuman.ai/v2/$USER_ID/runtime/revoke-all" \
  -H "api-secret: $BITHUMAN_API_SECRET" -H "content-type: application/json" -d '{}'
```

```json
{
  "success": true,
  "data": { "revoked": true, "effective_in_seconds": 420, "runtime_suspended": true,
            "note": "All runtime keys disabled. Creating a new API key restores runtime access." }
}
```

This does **not** delete your keys — it suspends runtime token issuance. It's self-recoverable:
creating a new API key clears the suspension.
