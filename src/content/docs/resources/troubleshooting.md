---
title: "Troubleshooting"
description: "Where to fix a problem on each platform and recipe, what a working live session looks like, and the fixes for the common session errors."
section: overview
group: "Help"
order: 10
type: guide
llms: build
---

Every platform and recipe page ends with a Troubleshooting table for its own problems; this page links them all, then covers the live session itself.

## By platform

| Platform | Its Troubleshooting table |
|---|---|
| iOS & iPadOS | [Swift package on iPhone and iPad](/platforms/swift/troubleshooting#ios) |
| macOS | [Swift package on the Mac](/platforms/swift/troubleshooting#macos) |
| Android | [Android SDK](/platforms/android/troubleshooting) |
| Flutter | [Flutter plugin](/platforms/flutter/troubleshooting) |
| Web | [Web embed](/platforms/web/troubleshooting) |
| Python | [Python SDK](/platforms/python/troubleshooting) |
| CLI | [CLI](/platforms/cli/troubleshooting) |
| LiveKit | [LiveKit plugin](/platforms/livekit/troubleshooting) |
| REST API | [REST](/platforms/rest#troubleshooting) · every error code: [Errors](/api/errors) |

## By task

| Task | Its Troubleshooting table |
|---|---|
| Create an avatar | [Create an avatar](/build/create-avatar#troubleshooting) · creation errors: [Errors](/api/errors#agent-operations) |
| A voice agent | [Voice agent](#voice-agent) |
| A companion app | [Companion app](/build/companion-app#troubleshooting) |
| A kiosk | [Kiosk](/build/kiosk#troubleshooting) |
| A talking video | [Talking video](/build/talking-video#troubleshooting) |
| Persona and gestures | [Persona](/build/persona#troubleshooting) · [Gestures](/build/gestures#troubleshooting) |
| Claude, Cursor and other MCP clients | [MCP server](/build/mcp#troubleshooting) |

## A live session

### Before you start

- An agent whose status is `ready` ([poll status](/api/agents#poll-status)).

### 1. Connect

| Situation | Expect |
|---|---|
| A session on an agent that has served recently | the avatar appears in a few seconds |
| The first session on a new agent, or at a busy time | up to tens of seconds while capacity starts; later sessions are fast |

If sessions keep failing to connect, check [status.bithuman.ai](https://status.bithuman.ai).

### 2. Idle and speaking

During silence the avatar keeps moving: Expression 2 plays its idle clip and Essence 2 its identity video, both looping smoothly. When speech starts, the lips follow the audio; on Expression 2, the idle motion covers the start of each reply. A running session bills whether the avatar is talking or idle ([pricing](/pricing)); end sessions you are not using.

### Check it worked

The avatar appears, moves while idle, and its lips follow the agent's speech. Frozen frames or motion that looks reversed are faults: report them with the agent code and the time.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The agent will not launch right after creation | it is not `ready` yet, or its model is still being prepared for serving | poll until `ready`; retry the first session after a short wait |
| `409 MODEL_NOT_GENERATED` | the session asked for a model the agent does not have | check `supported_models`; [add the model](/api/agents#add-a-model-to-an-existing-agent) |
| The session ends at once with `avatar_error: "model_not_generated"` | a `?model=` in the URL named a model the agent does not have | remove `?model=`, or add the model |
| `404` on `/speak` or `/add-context` | the agent has no live session | start a session first |
| No microphone prompt in an embed | the iframe lacks `allow="microphone *"` | add it ([Web](/platforms/web)) |
| In a room with several agents, the avatar stays silent for one | the avatar follows the agent that called `AvatarSession.start()` | start the avatar from the agent it should speak for |
| Creation stays at `lip_sync` for a long time | that is the training step for Essence 2 and Expression 2 (about 2–2.5 hours) | keep polling |

Creation errors and their fixes are on [Errors](/api/errors#agent-operations).

### Plan and credit refusals

Every SDK and the CLI refuse a render or session the same way, with the service's reason in the message (the CLI exits 77). Each code, its link field and the exact wording: [Errors](/api/errors#plan-and-credit-refusals).

| The message says | Cause | Fix |
|---|---|---|
| *API and SDK access starts at the Creator plan* | from 2026-10-12, a Free account's API secret (`403 PLAN_REQUIRED`) | [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| *the API secret was rejected*, *was not accepted* or *account suspended* | a revoked or mistyped secret; from 2026-10-12, an older SDK or CLI also says this for a Free account | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys); if a new secret is refused too, [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| *Your … plan allows N cloud avatar sessions at once, and N are running (N/N)* | the plan's [concurrent cloud sessions](/api/rate-limits#session-concurrency) (`403 CONCURRENCY_LIMIT_REACHED`); a session you just ended can count for up to 2 minutes | [terminate the session](/api/runtime-sessions#terminate-a-session) to free its slot at once, wait up to 2 minutes, or [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| *as many agents as its plan allows*, or `403 AGENT_LIMIT_REACHED` | a new agent would pass the plan's agent limit; existing agents keep working | delete an agent, or [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| *no credits remaining* or *out of bitHuman credits* | no credits left (`402 INSUFFICIENT_BALANCE`) | [top up](https://www.bithuman.ai/billing#credits) on the Creator plan or higher |
| *this account is suspended* | runtime access is suspended (`403 RUNTIME_SUSPENDED`) | [contact support](/support); a plan change does not clear it |

## Voice agent

The [voice agent](/build/voice-agent), with the CLI or the Python example.

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman run` exits 69: `livekit-server 1.8.0 at …/livekit-server is too old for `bithuman run`` | The CLI needs livekit-server 1.13 or newer | `brew upgrade livekit` (macOS), or reinstall the CLI (Linux: its download includes one) |
| The video stalls for 1–2 s every 15 s, or a LiveKit Meet tile goes black | `livekit-server` older than 1.9.12: the browser leaves and rejoins the room every 15 s | `brew upgrade livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux), then restart `livekit-server` |
| `livekit-server not found` (exit 69) | LiveKit is not installed | `brew install livekit` (macOS) or `curl -sSL https://get.livekit.io \| bash` (Linux) |
| The avatar never appears | No or invalid API secret | CLI: `bithuman login`. Python example: set `BITHUMAN_MASTER_SECRET` in `.env` |
| The avatar never appears; the terminal shows `essence-2: ffmpeg not found` | Essence 2 unpacks its avatar with `ffmpeg` | `sudo apt install -y ffmpeg`, then run again |
| The page says it could not connect | `livekit-server --dev` is not running | Start it, then click **Start** again |
| Nothing happens after joining | `livekit-server --dev` or `agent.py` is not running | Start both, `livekit-server` first |
| Another device on your network cannot join | `--dev` listens on `localhost` only | `livekit-server --dev --bind 0.0.0.0 --node-ip <your LAN IP>`; other browsers also need HTTPS for the microphone |
| On a Mac, your own page with no microphone, on the same machine as the avatar, fails with `could not establish pc connection` | Chrome hides the machine's local addresses until the page has microphone permission | call `navigator.mediaDevices.getUserMedia({ audio: true })` before connecting, or open the page from another device |
| `OSError: PortAudio library not found` | the system library is missing | `sudo apt install libportaudio2` (Debian, Ubuntu) |
| `cv2.error: … The function is not implemented` | the headless OpenCV build won the install | `pip install --force-reinstall --no-deps opencv-python` |
| `error: externally-managed-environment` | outside the virtualenv | `. .venv/bin/activate` |
| No microphone input on macOS | the terminal has no microphone permission | System Settings → Privacy & Security → Microphone |

## Next

- [Models](/models) · [Agents API](/api/agents) · [Errors](/api/errors)
