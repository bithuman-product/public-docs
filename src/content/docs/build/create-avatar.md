---
title: "Create your own avatar"
description: "Turn a portrait, a voice sample and a prompt into your own avatar."
section: build
group: "Avatars"
order: 10
type: guide
llms: build
next: ["/build/persona", "/build/voices", "/models"]
---

An avatar is a face, a voice and a personality, packaged as one agent with a short code. Use a [sample avatar](/examples/avatars) to start, or create your own from one portrait.

```diagram
creation
```

## Before you start

- **Time:** creation trains for about 2 hours, up to 4 for some Expression 2 avatars. Build with a [sample avatar](/examples/avatars) (`wise-pup`) meanwhile.
- An [API secret](/start/api-secret) on the Creator plan or higher, and credits for the creation ([pricing](/pricing#creation--one-time-credits)).
- A portrait image at a public URL (or create one from a prompt).
- Optionally, a voice sample for cloning: 30 seconds or more of clean speech from one speaker. Longer clean samples are fine; the whole file is used.

## Steps

### 1. Choose a model

| You have | Use |
|---|---|
| A photo of a real person | `essence-2`: photoreal, up to 1080p |
| A character, animal, robot or illustration | `expression-2`: any subject |
| Not sure | `auto`: people go to `essence-2`, everything else to `expression-2` |

Every model except Expression 2 needs a clear, real human face: see [Choosing a model](/models#choosing-a-model).

```expected
One `model` value: `essence-2`, `expression-2` or `auto`.
```

### 2. Pick the inputs

| Input | Use for | Limits |
|---|---|---|
| Image | the face | under 10 MB; one clear figure, neutral expression, facing the camera, face unobstructed |
| Voice | voice cloning | 30 seconds or more of clean speech, one speaker, no music (MP3, WAV or M4A); the whole file is used |
| Prompt | the personality | required when there is no image |

#### What makes a good photo

One subject, in focus, facing the camera with a resting expression and the whole face visible (eyes, nose and mouth). The photo is checked before anything is charged; the refusals are in [Troubleshooting](#troubleshooting). For an animal or character, use `expression-2` with a well-lit, front-facing photo and the face filling the frame.

Without a voice sample, a voice is generated to match the persona. Without a prompt, a persona is generated from the image.

```expected
An image URL that opens in a browser without signing in, under 10 MB, plus a voice sample and a prompt if you have them.
```

### 3. Create the agent

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"model": "auto", "prompt": "You are a friendly receptionist.", "image": "https://example.com/headshot.jpg"}'
```

The response carries an `agent_id`. Creation takes about 2–2.5 hours for the second-generation models. You can also create an agent in the dashboard at [bithuman.ai](https://www.bithuman.ai/explore), which starts on Expression 2.

````expected
```json
{"success": true, "message": "Agent generation started", "agent_id": "A80HVD8577", "status": "processing"}
```
````

### 4. Wait until it is ready

Poll [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) every few seconds until `status` is `ready` or `failed`.

```expected
`status` is `ready`: after about 2 to 2.5 hours, or up to 4 for an Expression 2 identity that needs more training.
```

## Check it worked

Open `https://www.bithuman.ai/embed/<agent_id>` in a browser and talk to it, or `bithuman run <agent_id>`.

## How creation works

Creation runs once, in the bitHuman cloud; the finished avatar then runs anywhere its model runs. Always send `model`: an omitted `model` creates a first-generation Expression 1 agent.

- **Essence 2** generates a short video of the person from the portrait, then trains on it. `ready` serves at once; the downloadable file follows a little later (until then a download answers a retryable `404 MODEL_ARTIFACT_NOT_READY`).
- **Expression 2** generates a portrait from your prompt when you send no image, plus an idle clip and a voice. A failed run is refunded; a completed one is not, so a second `generate` is a second charge.

Request fields and every failure mode: [Agents API](/api/agents).

## Variations

- **Write a better persona** with [the persona guide](/build/persona).
- **Add another model** later without re-creating the agent: [add a model](/api/agents#add-a-model-to-an-existing-agent).
- **Change the prompt** at any time: [update an agent](/api/agents#update-an-agent).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `402 INSUFFICIENT_BALANCE` | not enough credits | [top up](https://www.bithuman.ai/billing#credits) (the error's `topup_url`) |
| `403 PLAN_REQUIRED` | a Free account, which cannot create agents, or a model outside your plan | [choose a plan](https://www.bithuman.ai/pricing?from=docs) (the error's `upgrade_url`) |
| `403 AGENT_LIMIT_REACHED` | your plan's agent limit; existing agents keep working | delete an agent, or [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| `422 MODEL_SUBJECT_MISMATCH` | any model but `expression-2` for a subject that is not a real person, or no face found | use `expression-2` or `auto` |
| `422 IMAGE_FACE_UNSUITABLE` | `essence-2` with a face too small in frame, or several faces | upload a closer photo of one person |
| `failed` with an image error | the image URL is not publicly fetchable | host the image publicly and create again (the failed creation is refunded) |
| The likeness is off | a side profile, several people or poor light | crop to one front-facing person in good light |
| The voice sounds noisy | background noise or music in the sample | re-record in a quiet room |
| The live voice differs from the preview | the clone was not applied, or Realtime mode (a provider's built-in voice) is on | [check the voice your agent uses](/build/voices#check-the-voice-your-agent-uses) |

## Next

- [Agents API](/api/agents) · [Persona](/build/persona) · [Voices](/build/voices)
