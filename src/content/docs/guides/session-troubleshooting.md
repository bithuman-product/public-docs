---
title: "Sessions & troubleshooting"
description: "What to expect when a live avatar session starts, idles and speaks, and how to fix the common session errors."
section: guides
group: "Deploy"
order: 31
type: guide
label: "Sessions & troubleshooting"
---

What a live session looks like when it works, and what to do when it does not.

## Before you start

- An agent whose status is `ready` ([poll status](/api/agents#poll-status)).

## 1. Connect

| Situation | Expect |
|---|---|
| A session on an agent that has served recently | the avatar appears in a few seconds |
| The first session on a new agent, or at a busy time | up to tens of seconds while capacity starts; later sessions are fast |

If sessions keep failing to connect, check [status.bithuman.ai](https://status.bithuman.ai).

## 2. Idle and speaking

During silence the avatar keeps moving: Expression 2 plays its idle clip and Essence 2 its identity video, both looping smoothly. When speech starts, the lips follow the audio; Expression 2's first talking frame arrives about 1.6 seconds after the audio starts, covered by the idle motion. Idle time is free ([pricing](/guides/pricing)).

## Check it worked

The avatar appears, moves while idle, and its lips follow the agent's speech. Frozen frames or motion that looks reversed are faults: report them with the agent code and the time.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The agent will not launch right after creation | it is not `ready` yet, or its model is still being prepared for serving | poll until `ready`; retry the first session after a short wait |
| `409 MODEL_NOT_GENERATED` | the session asked for a model the agent does not have | check `supported_models`; [add the model](/api/agents#add-a-model-to-an-existing-agent) |
| The session ends at once with `avatar_error: "model_not_generated"` | a `?model=` in the URL named a model the agent does not have | remove `?model=`, or add the model |
| `404` on `/speak` or `/add-context` | the agent has no live session | start a session first |
| No microphone prompt in an embed | the iframe lacks `allow="microphone *"` | add it ([Web](/sdk/web)) |
| In a room with several agents, the avatar stays silent for one | the avatar follows the agent that called `AvatarSession.start()` | start the avatar from the agent it should speak for |
| Creation stays at `lip_sync` for a long time | that is the training step for Essence 2 and Expression 2 (about 2–2.5 hours) | keep polling |

Creation errors and their fixes are on [Agents](/api/agents#errors).

## Next

- [Models](/concepts/models) · [Agents API](/api/agents) · [Errors](/api/errors)
