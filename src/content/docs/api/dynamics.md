---
title: "Dynamics API"
description: "Generate and manage conversational gesture animations — waves, nods, laughs, idle motions — for an avatar."
section: api
group: "Build"
order: 12
label: "Gestures & animations"
---

## Overview

Dynamics are conversational gesture animations (wave, nod, laugh, idle motions)
for an avatar. Generate them asynchronously, then toggle them on to make the
gesture model the active one for live sessions. During conversation, gestures
trigger based on keyword mapping. Dynamics generation costs 250 credits.

## Generate dynamics

`POST /v1/dynamics/generate` — generate movements for an agent. Returns
immediately with `processing`; use the GET endpoint to check completion.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `agent_id` | string | yes | — | Agent ID to generate dynamics for. |
| `image_url` | string | no | from agent | Source image URL. Defaults to the agent's primary image. |
| `duration` | number | no | `5` | Duration of each motion in seconds. |
| `model` | string | no | `auto` | Gesture-video generation preset. Leave as `auto` (the recommended default). |

```python
import requests

resp = requests.post(
    "https://api.bithuman.ai/v1/dynamics/generate",
    headers={"Content-Type": "application/json", "api-secret": "YOUR_API_SECRET"},
    json={"agent_id": "A91XMB7113", "duration": 5, "model": "auto"},
)
print(resp.json())
```

```json
{
  "success": true,
  "message": "Dynamics generation started",
  "agent_id": "A91XMB7113",
  "status": "processing"
}
```

**Duration guidance:** 1–3 s for quick gestures (waves, nods), 3–5 s for standard
motions (default), 5–10 s for extended animations.

**Model:** `auto` (the default) selects the recommended gesture-video backend.

## Get dynamics

`GET /v1/dynamics/{agent_id}` — list the current dynamics configuration and
available gestures for an agent.

```python
import requests

agent_id = "A91XMB7113"
resp = requests.get(
    f"https://api.bithuman.ai/v1/dynamics/{agent_id}",
    headers={"api-secret": "YOUR_API_SECRET"},
)
gestures = resp.json()["data"].get("gestures", {})
print(list(gestures.keys()))
```

```json
{
  "success": true,
  "data": {
    "url": "https://storage.bithuman.ai/A91XMB7113/my_agent_20260115_103500_000003.imx",
    "status": "ready",
    "agent_id": "A91XMB7113",
    "gestures": {
      "mini_wave_hello": "https://storage.bithuman.ai/A91XMB7113/mini_wave_hello_20260115_104000_000004.mp4",
      "talk_head_nod_subtle": "https://storage.bithuman.ai/A91XMB7113/talk_head_nod_subtle_20260115_104100_000005.mp4",
      "blow_kiss_heart": "https://storage.bithuman.ai/A91XMB7113/blow_kiss_heart_20260115_104200_000006.mp4"
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `url` | string \| null | URL to the dynamics model file, or null if not yet generated. |
| `status` | string | `generating` while in progress, `ready` when complete. **Also returned as `ready` (with `url: null` and empty `gestures`) for agents whose dynamics were never generated** — treat `url != null`, not `status`, as the has-dynamics signal. |
| `agent_id` | string | The agent ID. |
| `gestures` | object | Map of gesture action name → video URL. |

Before generation completes, `url` is `null` and `gestures` is an empty object.

## Update dynamics

`PUT /v1/dynamics/{agent_id}` — update the dynamics configuration. After a
successful update, background-movements regeneration is automatically triggered.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dynamics` | object | yes | Configuration to merge with existing data. |
| `dynamics.enabled` | boolean | no | Enable or disable dynamics for this agent. |
| `toggle_enabled` | boolean | no | `true` switches to the dynamics model; `false` restores the default talking model. |

```json
{
  "dynamics": { "enabled": true },
  "toggle_enabled": true
}
```

```json
{
  "success": true,
  "message": "Dynamics updated successfully and movements regeneration started",
  "agent_id": "A91XMB7113",
  "regeneration_status": "started"
}
```

If regeneration fails to start, `regeneration_status` is `failed` and a
`regeneration_error` message is included.

## Gesture names

Generated gestures use descriptive action identifiers. The exact set depends on
what was generated — call `GET /v1/dynamics/{agent_id}` to discover them.

| Gesture action | Category | Typical use |
|---|---|---|
| `mini_wave_hello` | wave | Greeting |
| `talk_head_nod_subtle` | nod | Agreement, acknowledgment |
| `blow_kiss_heart` | expression | Playful reaction |
| `laugh_react` | expression | Humor response |
| `idle_subtle` | idle | Background movement |

These action names are what you pass to `VideoControl(action=...)` or the
`trigger_dynamics` RPC in a live session.

## Error codes

| HTTP | Meaning |
|---|---|
| `400` | Invalid parameters. |
| `401` | Unauthorized. |
| `402` | Insufficient credits. |
| `404` | Agent not found. (An agent **without** dynamics is not a 404 — `GET /v1/dynamics/{agent_id}` returns `200` with `url: null`.) |
| `500` | Internal server error. |

See the full [error reference](/api/errors) and the interactive
[API reference](/api/reference).
