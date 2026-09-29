---
title: "Runtime sessions"
description: "List live avatar sessions, read a session transcript, terminate a session, or revoke every runtime key at once."
section: api
group: "Live sessions"
order: 50
type: endpoint
---

## Overview

See and control the avatar sessions running on your account — list live sessions with their
burn rate, read a session's transcript, terminate one, or (in an emergency) revoke every
runtime key at once.

Base URL `https://api.bithuman.ai`. Authenticate with your `api-secret`. The `{user_id}` in the
path is your own account id — get it from [`GET /v1/me`](/api/billing#account-status).

Set it once in your shell before the examples below — with `$USER_ID` unset the
paths collapse to `/v2//…` and the API answers `404 {"detail":"Not Found"}`:

```bash
export USER_ID=$(curl -s https://api.bithuman.ai/v1/me \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user_id'])")
```


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
    "live_burn_rate_cr_per_min": 4,
    "credits_this_hour": 52,
    "sessions": [
      {
        "id": "a3f1c8e2-…-9b02",
        "agent_code": "agent_greeter",
        "agent_name": "Greeter",
        "billing_type": "usage_essence_2_model_cloud",
        "key_alias": "prod-server",
        "room_name": "room_a3f1c8e2",
        "started": "2026-07-15T15:20:00Z",
        "last_seen": "2026-07-15T15:33:00Z",
        "minutes": 13.0,
        "credits": 52,
        "burn_rate_cr_per_min": 4,
        "status": "live",
        "has_transcript": true
      }
    ]
  }
}
```

The KPIs (`active_count`, `live_burn_rate_cr_per_min`, `credits_this_hour`) are account-wide over
the last hour; `sessions` is the filtered list. `billing_type` is the pricing code the session bills under; see `GET /v1/pricing`. Use a session's `id` for the calls below.

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

## End a cloud avatar session

`POST /v1/runtime-sessions/{session_id}/end` — end a [cloud avatar](/api/cloud-avatar) you
started. `session_id` is the `session_id` the start returned. No body.

```bash
curl -X POST "https://api.bithuman.ai/v1/runtime-sessions/$SESSION_ID/end" \
  -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{ "session_id": "cs_4f1c…", "status": "ended", "agent_id": "A23KSG5258",
  "model": "essence-2", "room_name": "my-room", "started_at": "…", "ended_at": "…",
  "billed_seconds": 131.2, "credits": 9, "ended": true, "slot_released": true,
  "note": "Session ended: the avatar left the room and billing stopped." }
```

Billing stops at the end call: the session is billed its active time up to that moment, and
nothing after. Its concurrent-session slot frees at once. When `ended` is `true`, the avatar
has left your room. When it is `false`, `note` says when it leaves: within about a minute, or,
for an `essence-1` avatar, when you remove it or the room closes. Deleting the room removes it
at once. Your LiveKit room is never deleted. Calling it again returns the same answer and
bills nothing. Errors: `404` no such session (or not yours).

## Read a cloud avatar session

`GET /v1/runtime-sessions/{session_id}` — `status` (`starting`, `live` or `ended`), times,
`billed_seconds` and `credits` so far. Errors: `404` no such session (or not yours).

## Terminate a session

`POST /v2/{user_id}/runtime-sessions/{session_id}/terminate` — stop **one** session. Never
touches an API secret.

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

The session stops counting toward your plan's concurrent sessions at once. What else happens depends on where it runs:

- A conversation on bitHuman's servers (the web embed, the bitHuman app): its room is closed and `ended` is `true`.
- A [cloud avatar in your own LiveKit room](/api/cloud-avatar): billing stops, `ended` is `false`, and the avatar leaves at its next billing check, within about a minute. An `essence-1` avatar stays until you remove it or the room closes. Delete the room on your LiveKit server to end it at once.
- A self-hosted runtime: the activity record is closed; stop the process on your hardware.

To find a cloud avatar's `session_id`, list sessions with `window=live&kind=conversations` and take the `id` whose `room_name` is your room. A cloud avatar you started can instead be [ended by the `session_id` its start returned](#end-a-cloud-avatar-session) (`cs_…`). Errors: `404` no such session (or not yours).

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
  "data": { "revoked": true, "effective_in_seconds": 320, "runtime_suspended": true,
            "note": "All runtime keys disabled. Creating a new API key restores runtime access." }
}
```

This does **not** delete your API secrets — it suspends runtime token issuance. It's self-recoverable:
creating a new API secret clears the suspension.
