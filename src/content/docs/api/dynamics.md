---
title: "Gestures API"
description: "Generate gestures (wave, nod, laugh) for an Essence 1 avatar, and trigger them."
section: api
group: "Media"
order: 30
type: endpoint
llms: api
---

## Overview

Gestures are conversational animations (wave, nod, laugh, idle motions) for an
Essence 1 avatar; the API paths use the word `dynamics`. Generate them asynchronously, then toggle them on to make the
gesture model the active one for live sessions. During conversation, gestures fire
automatically on keyword mapping — or you can trigger an exact gesture from your code.
Dynamics generation costs 250 credits.

> **Trigger a specific gesture from your code — in either mode.** Self-hosted:
> `runtime.push(VideoControl(action="…"))`. Managed cloud: send a `trigger_dynamics`
> RPC to the avatar participant (`avatar.avatar_identity`). Both are deterministic —
> no keyword, no randomness. See
> [Trigger avatar actions from code](/build/gestures).

## Generate dynamics

Generate movements for an agent. Returns
immediately with `processing`; use the GET endpoint to check completion.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `agent_id` | string | yes | — | Agent ID to generate dynamics for. |
| `image_url` | string | no | from agent | Source image URL. Defaults to the agent's primary image. |
| `duration` | number | no | `5` | Duration of each motion in seconds. |

```bash
curl -X POST https://api.bithuman.ai/v1/dynamics/generate \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"agent_id": "A80HVD8577", "duration": 5}'
```

```json
{
  "success": true,
  "message": "Dynamics generation started",
  "agent_id": "A80HVD8577",
  "status": "processing"
}
```

**Duration guidance:** 1–3 s for quick gestures (waves, nods), 3–5 s for standard
motions (default), 5–10 s for extended animations.

## Get dynamics

List the current dynamics configuration and
available gestures for an agent.

```bash
curl https://api.bithuman.ai/v1/dynamics/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET"
```

The gesture names are the keys of `data.gestures`.

```json
{
  "success": true,
  "data": {
    "url": "https://assets.bithuman.ai/A80HVD8577/my_agent_20260115_103500_000003.imx",
    "status": "ready",
    "agent_id": "A80HVD8577",
    "gestures": {
      "mini_wave_hello": "https://assets.bithuman.ai/A80HVD8577/mini_wave_hello_20260115_104000_000004.mp4",
      "talk_head_nod_subtle": "https://assets.bithuman.ai/A80HVD8577/talk_head_nod_subtle_20260115_104100_000005.mp4",
      "blow_kiss_heart": "https://assets.bithuman.ai/A80HVD8577/blow_kiss_heart_20260115_104200_000006.mp4"
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

Update the gestures configuration. After a successful update, the avatar's idle motion is regenerated automatically.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dynamics` | object | yes | Configuration to merge with existing data. |
| `dynamics.enabled` | boolean | no | Enable or disable dynamics for this agent. |
| `toggle_enabled` | boolean | no | `true` turns gestures on for live sessions; `false` turns them off. |

```bash
curl -X PUT https://api.bithuman.ai/v1/dynamics/A80HVD8577 -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "Content-Type: application/json" -d '{"dynamics": {"enabled": true}, "toggle_enabled": true}'
```

```json
{
  "success": true,
  "message": "Dynamics updated successfully and movements regeneration started",
  "agent_id": "A80HVD8577",
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
