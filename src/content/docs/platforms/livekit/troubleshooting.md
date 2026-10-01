---
title: "LiveKit troubleshooting"
description: "Fix LiveKit plugin launch and room errors by symptom."
section: platforms
group: "LiveKit"
order: 40
type: troubleshooting
llms: troubleshooting
---

| Symptom | Cause | Fix |
|---|---|---|
| The mint call returns `403` | the token was minted for another agent, room or LiveKit URL | mint with the same `agent_code`, `room_name` and `livekit_url` the plugin uses |
| The mint call returns `401` | a missing or invalid API secret | check `BITHUMAN_MASTER_SECRET` against your [API secret](/start/api-secret) |
| The avatar speaks with the wrong model | the plugin serves the agent's own model | create an agent with the model you want |
| The video stalls for 1–2 s every 15 s, or a LiveKit Meet tile goes black | `livekit-server` older than 1.9.12: the browser leaves and rejoins the room every 15 s | `brew upgrade livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux), then restart `livekit-server` |
| Two voices play | the agent session also publishes audio | set `room_options=RoomOptions(audio_output=False)` |
