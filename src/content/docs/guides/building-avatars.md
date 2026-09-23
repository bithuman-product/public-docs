---
title: "Create your own avatar"
description: "Turn a portrait, a voice sample and a prompt into your own avatar: what to upload, how to write the persona, and the API call."
section: guides
group: "Build"
order: 20
type: guide
label: "Create your own avatar"
---

An avatar is a face, a voice and a personality, packaged as one agent with a short code. Use a [sample avatar](/examples#ready-made-avatars) to start, or create your own from one portrait.

## Before you start

- An [API secret](/start/api-secret) and credits for the creation ([pricing](/guides/pricing#creation--one-time-credits); a free month cannot pay for one).
- A portrait image at a public URL (or create one from a prompt).
- Optionally, 3–10 seconds of clean speech for voice cloning.

## 1. Choose a model

| You have | Use |
|---|---|
| A photo of a real person | `essence-2`: photoreal, up to 1920×1080 |
| A character, animal, robot or illustration | `expression-2`: any subject |
| Not sure | `auto`: people go to `essence-2`, everything else to `expression-2` |

More on the difference: [Models](/concepts/models).

## 2. Pick the inputs

| Input | Use for | Limits |
|---|---|---|
| Image | the face | under 10 MB; one clear figure, neutral expression, facing the camera, face unobstructed |
| Voice | voice cloning | under 1 minute of clean speech (MP3, WAV or M4A), no music |
| Prompt | the personality | required when there is no image |

### What makes a good photo

One subject, in focus, facing the camera with a resting expression and the whole face visible (eyes, nose and mouth). Photos are not checked; these are the conditions the models are built for. For an animal, use a well-lit, front-facing photo with the face filling the frame.

Without a voice sample, a voice is generated to match the persona. Without a prompt, a persona is generated from the image.

## 3. Create the agent

```bash
curl -X POST https://api.bithuman.ai/v1/agent/generate \
  -H "Content-Type: application/json" -H "api-secret: $BITHUMAN_API_SECRET" \
  -d '{"model": "auto", "prompt": "You are a friendly receptionist.", "image": "https://example.com/headshot.jpg"}'
```

The response carries an `agent_id`. Creation takes about 2–2.5 hours for the second-generation models. You can also create an agent in the dashboard at [bithuman.ai](https://www.bithuman.ai/explore).

## 4. Wait until it is ready

Poll [`GET /v1/agent/status/{agent_id}`](/api/agents#poll-status) every few seconds until `status` is `ready` or `failed`.

## Check it worked

Open `https://www.bithuman.ai/embed/<agent_id>` in a browser and talk to it, or `bithuman run <agent_id>`.

## Variations

- **Write a better persona** with [the persona guide](/guides/persona).
- **Add another model** later without re-creating the agent: [add a model](/api/agents#add-a-model-to-an-existing-agent).
- **Change the prompt** at any time: [update an agent](/api/agents#update-an-agent).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `402 INSUFFICIENT_BALANCE` | not enough credits | top up or choose a plan |
| `422 MODEL_SUBJECT_MISMATCH` | `essence-2` for a subject that is not a photoreal person | use `expression-2` or `auto` |
| `failed` with an image error | the image URL is not publicly fetchable | host the image publicly and create again (the failed creation is refunded) |
| The likeness is off | a side profile, several people or poor light | crop to one front-facing person in good light |
| The voice sounds noisy | background noise or music in the sample | re-record in a quiet room |

## Next

- [Agents API](/api/agents) · [Persona](/guides/persona) · [Voices](/guides/voice-providers)
