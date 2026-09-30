---
title: "Build a LiveKit agent"
description: "Fit the LiveKit plugin into your own client, room and server."
section: platforms
group: "LiveKit"
order: 30
type: platform-app
llms: platforms
claims: ["S4", "S14", "S17", "S31"]
next: ["/platforms/livekit/troubleshooting", "/platforms/livekit"]
---

## Integrate into your app

- **Your own client.** The avatar is a normal LiveKit participant: any LiveKit client SDK (JavaScript, Swift, Kotlin) subscribes to its video and audio tracks. The app takes a room token from your server, never a bitHuman secret.
- **Choosing a model.** The plugin serves the agent's own model. Do not pass `model=`; create the agent with the model you want ([Models](/models)).
- **A photo instead of an agent.** `avatar_image=` with no `avatar_id` animates the photo on Expression 1 only. On every other model the launch is refused with `400 VALIDATION_ERROR` before anything is billed: [create an agent](/api/agents#generate-an-agent) from the photo and pass its code as `avatar_id`.
- **Rendering on your own machine.** Pass `model_path=` (an avatar file) instead of `avatar_id=`, and the secret explicitly: `api_secret=os.environ["BITHUMAN_MASTER_SECRET"]`. The avatar renders inside the worker's process, and the secret stays in that process. Runnable example: [Voice agent](/build/voice-agent/python#with-python).
- **Without the plugin.** If your voice pipeline is not a LiveKit Agents worker, start the avatar with one REST call and stream it your audio: [Cloud avatar without the plugin](/platforms/livekit/cloud-avatar).
- **Several agents in one room.** The avatar lip-syncs the agent that calls `AvatarSession.start()` and ignores other agents' audio.
- **Gestures.** Trigger avatar actions from your agent: [Gestures](/build/gestures).

The [cloud example](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) packages this worker with a web UI and Docker Compose.

## Platform notes

- The mint call is one per session. The token starts that session only; it expires after an hour, and a session that runs longer continues.
- `livekit_url` in the mint call must be the URL the plugin connects to (`LIVEKIT_URL`, unless you pass `livekit_url=` to `AvatarSession.start()`).
- If you run your own LiveKit server for your own worker, use `livekit-server` 1.9.12 or newer (`bithuman run` needs 1.13 or newer). With older servers, browsers leave and rejoin the room every 15 s, and the video stalls each time.

## Reference

- [Runtime tokens](/api/reference): `POST /v1/runtime-tokens/mint`.
- [LiveKit Agents docs](https://docs.livekit.io/agents/).
- [Python](/platforms/python): the runtime the plugin builds on.
