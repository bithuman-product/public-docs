---
title: "Cloud avatar in your room"
description: "Start a bitHuman cloud avatar in your own LiveKit room with one REST call, then stream it your TTS audio. No LiveKit plugin or agent framework needed."
section: api
group: "Live sessions"
order: 20
type: endpoint
---

## Overview

A cloud avatar is a participant in your LiveKit room. It lip-syncs the audio you send it, and it publishes the video and that audio as its own tracks. The [LiveKit plugin](/platforms/livekit) does all of this for a Python LiveKit Agents worker. Use this page when your voice pipeline is something else. You will:

1. Mint a LiveKit join token for the avatar.
2. Start the session with `POST /v1/runtime-tokens/request`. The avatar then joins your room.
3. Send each reply's audio to the avatar as a LiveKit byte stream.

Your clients subscribe to the avatar like any other participant. Call the endpoint from your server, because it takes your API secret.

## Mint the avatar's join token

Mint the token with your LiveKit credentials, not with a bitHuman credential. It needs:

- **Identity:** `bithuman-avatar-agent`.
- **Kind:** `agent`.
- **Grant:** permission to join the room.
- **Attribute `lk.publish_on_behalf`:** the identity of the participant that sends the audio. The avatar takes audio only from that participant. If you leave this attribute out, the avatar takes audio from the first agent participant in the room.

```python
from livekit import api

avatar_token = (
    api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    .with_identity("bithuman-avatar-agent")
    .with_kind("agent")
    .with_grants(api.VideoGrants(room_join=True, room=room_name))
    .with_attributes({"lk.publish_on_behalf": sender_identity})
    .to_jwt()
)
```

Don't put a bitHuman secret in the token or in its attributes. Everyone in the room can read attributes.

Join your sender to the room as an agent participant too (kind `agent`). The avatar treats standard participants as users, and it stays in the room while any user is there.

## Start the session

`POST https://api.bithuman.ai/v1/runtime-tokens/request` with the `api-secret` header:

```bash
curl -X POST https://api.bithuman.ai/v1/runtime-tokens/request \
  -H "api-secret: $BITHUMAN_API_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "mode": "gpu",
    "model": "essence-2",
    "agent_id": "<your agent code>",
    "livekit_url": "wss://your-project.livekit.cloud",
    "livekit_token": "<the avatar join token>",
    "room_name": "your-room"
  }'
# → {"avatar_session_started": true, "model": "essence-2", ...}
```

| Field | Required | What it is |
|---|---|---|
| `mode` | yes | `"gpu"`. This field is what makes the call start an avatar; without it, the endpoint only issues a runtime token. The older value `"cpu"` also works but requires `agent_id`. |
| `model` | recommended | `essence-1`, `essence-2`, `expression-1` or `expression-2`. If you leave it out, the server picks the model from `mode` and the agent's models, so check `model` in the response. |
| `agent_id` | yes, unless `image` is sent | The agent code. |
| `image` | for photo sessions | A portrait, for Expression 1 only. See [A photo instead of an agent](#a-photo-instead-of-an-agent). |
| `livekit_url` | yes | Your LiveKit server URL. |
| `livekit_token` | yes | The avatar's join token from the step above. |
| `room_name` | yes | The room the avatar joins. |

A `200` response means the session is starting. `avatar_session_started` is `true`, and `model` is the model the session launched as. The response also echoes `mode`, `agent_id` and `image`, and includes your `user_id`.

The session is billed at the model's cloud rate for as long as it runs ([Pricing](/pricing)). It ends in any of these cases:

- The last user leaves the room.
- You remove `bithuman-avatar-agent` from the room.
- The room closes.

An ended session stops counting toward your plan's [concurrent sessions](/api/rate-limits#session-concurrency) within 2 minutes of its end. To free its slot at once, [terminate it](/api/runtime-sessions#terminate-a-session): list your live sessions and use the `id` of the one whose `room_name` is your room.

## Send the audio

Send each reply as one LiveKit byte stream:

- **Topic:** `lk.audio_stream`.
- **Destination identity:** `bithuman-avatar-agent`.
- **Attributes:** `sample_rate` and `num_channels`, as strings.
- **Payload:** raw 16-bit little-endian PCM.

Closing the stream marks the end of the reply. Mono 16 kHz is the native format. Other sample rates are resampled, and stereo is mixed down to mono.

```python
writer = await room.local_participant.stream_bytes(
    name="reply-1",
    topic="lk.audio_stream",
    destination_identities=["bithuman-avatar-agent"],
    attributes={"sample_rate": "16000", "num_channels": "1"},
)
async for pcm in tts_audio():      # 16-bit mono PCM chunks, as the TTS produces them
    await writer.write(pcm)
await writer.aclose()              # end of this reply
```

- **First reply:** wait until `bithuman-avatar-agent` has joined before you send it. Audio sent before the avatar joins is dropped.
- **Interrupting:** perform the RPC `lk.clear_buffer` on `bithuman-avatar-agent`, then close the stream.
- **Playback events (optional):** the avatar calls the RPCs `lk.playback_started` and `lk.playback_finished` on your sender. Register handlers for them if you want to know when it speaks. If you don't register them, the avatar skips these calls.

## Keep latency low

- **Write each TTS chunk as soon as it exists.** Open the stream on the first chunk. Don't pace the audio to real time: the avatar buffers it and plays it at the right speed. The size of each write doesn't matter.
- **Close the stream as soon as the reply ends.** The avatar renders speech in blocks of up to about a second of audio. A reply shorter than one block, like "Sure!", waits for the close.
- **Keep one session for the whole conversation.** Starting a session connects to the room and loads the avatar, so don't start a new one for each turn.
- **Run your pipeline in the US.** Cloud avatars render in the US. Put your LiveKit server or LiveKit Cloud project and your STT, LLM and TTS in a US region; US East is a good default.
- **Speed up the voice pipeline.** Most of a slow turn is usually spent there: end-of-speech detection, the LLM's first token and the TTS's first audio. Streaming STT and streaming TTS help the most.

## A photo instead of an agent

Expression 1 can animate a photo without an agent. Send `image`, leave out `agent_id`, and set `"model": "expression-1"`.

`image` is a string in one of these forms:

- A public `http(s)` URL. The server fetches it with a plain GET, so it must return `200` without authentication. A pre-signed URL works.
- The image as base64, either raw or as a `data:image/jpeg;base64,…` URI.

The endpoint takes JSON only.

Photo requirements:

- A JPEG or PNG.
- One person, facing the camera, with the face clearly visible.
- Head and shoulders, with room around the head.

The server finds the face and crops a square about twice the face's width, with a little extra room above the head. It scales the crop to 512×512, so a face at least ~256 px wide keeps full detail. A face near the edge of the photo gets a clipped crop. If no face is found, the whole photo is used as it is, and a photo that isn't square looks stretched.

Photo sessions work on Expression 1 only. On every other model, the request is refused with `400 VALIDATION_ERROR`, and nothing is launched or billed. To use another model, [create an agent](/api/agents#generate-an-agent) from the photo first.

## Errors

| Status | Code | Cause |
|---|---|---|
| `400` | `VALIDATION_ERROR` | One of these: a field is missing or invalid; `image` was sent without `agent_id` for a model other than Expression 1; an Essence 1 session was started without `livekit_url`, `livekit_token` and `room_name`. Nothing is launched or billed. |
| `401` | `MISSING_AUTH` / `UNAUTHORIZED` | The `api-secret` header is missing or invalid. |
| `403` | `PLAN_REQUIRED` | The model is not in your plan, or, from 2026-10-12, your account is on the Free plan. Nothing is launched or billed. |
| `403` | `CONCURRENCY_LIMIT_REACHED` | The session would exceed your plan's concurrent sessions ([Rate limits](/api/rate-limits)). |
| `404` | `NOT_FOUND` | No agent with this code that you can start. |
| `409` | `VALIDATION_ERROR` | The agent can't be served as the requested model, or its own model isn't ready yet. |
| `503` | `SERVICE_UNAVAILABLE` | No capacity right now, or a temporary failure. Retry after the `Retry-After` header. |

All error codes are listed on [Errors](/api/errors).
