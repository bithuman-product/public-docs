---
title: "Troubleshooting"
description: "Where to fix a problem on each platform and recipe, what a working live session looks like, and the fixes for the common session errors."
section: resources
group: "Resources"
order: 40
type: guide
---

Every platform and recipe page ends with a Troubleshooting table for its own problems; this page links them all, then covers the live session itself.

## By platform

| Platform | Its Troubleshooting table |
|---|---|
| iOS & iPadOS | [Swift package on iPhone and iPad](/platforms/ios#troubleshooting) |
| macOS | [Swift package on the Mac](/platforms/macos#troubleshooting) |
| Android | [Android SDK](/platforms/android#troubleshooting) |
| Flutter | [Flutter plugin](/platforms/flutter#troubleshooting) |
| Web | [Web embed](/platforms/web#troubleshooting) |
| Python | [Python SDK](/platforms/python#troubleshooting) |
| CLI | [CLI](/platforms/cli#troubleshooting) |
| LiveKit | [LiveKit plugin](/platforms/livekit#troubleshooting) |
| REST API | [REST](/platforms/rest#troubleshooting) · every error code: [Errors](/api/errors) |

## By task

| Task | Its Troubleshooting table |
|---|---|
| Create an avatar | [Create an avatar](/build/create-avatar#troubleshooting) · creation errors: [Agents API](/api/agents#errors) |
| A voice agent | [Voice agent](/build/voice-agent#troubleshooting) |
| A companion app | [Companion app](/build/companion-app#troubleshooting) |
| A kiosk | [Kiosk](/build/kiosk#troubleshooting) |
| A talking video | [Talking video](/build/talking-video#troubleshooting) |
| Persona and gestures | [Persona](/build/persona#troubleshooting) · [Gestures](/build/gestures#troubleshooting) |
| Claude, Cursor and other MCP clients | [MCP server](/build/mcp#troubleshooting) |

## Before you start

- An agent whose status is `ready` ([poll status](/api/agents#poll-status)).

## 1. Connect

| Situation | Expect |
|---|---|
| A session on an agent that has served recently | the avatar appears in a few seconds |
| The first session on a new agent, or at a busy time | up to tens of seconds while capacity starts; later sessions are fast |

If sessions keep failing to connect, check [status.bithuman.ai](https://status.bithuman.ai).

## 2. Idle and speaking

During silence the avatar keeps moving: Expression 2 plays its idle clip and Essence 2 its identity video, both looping smoothly. When speech starts, the lips follow the audio; on Expression 2, the idle motion covers the start of each reply. A running session bills whether the avatar is talking or idle ([pricing](/pricing)); end sessions you are not using.

## Check it worked

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

Creation errors and their fixes are on [Agents](/api/agents#errors).

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

## Next

- [Models](/models) · [Agents API](/api/agents) · [Errors](/api/errors)
