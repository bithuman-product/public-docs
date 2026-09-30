---
title: "Voices"
description: "Built-in voices in every language, or your own premium voice provider key."
section: build
group: "Avatars"
order: 30
type: guide
llms: build
---

## Two ways to give your agent a voice

| Option | What you get | Cost |
|------|--------------|------|
| **bitHuman default** | The built-in voice pipeline. Your agent detects the caller's language and replies in it. No setup, no keys. | Included in the voice chat rate ([pricing](/pricing)) |
| **Bring your own provider** | Connect your **own** OpenAI, Grok (xAI), ElevenLabs, or Cartesia key and pick that provider's premium voices — including low-latency speech-to-speech (real-time). | The same voice chat rate, plus your provider's charges on your key |

You never *have* to bring a key. The default pipeline already speaks every language. Bring your own only when you want a specific premium voice or a provider's real-time engine.

### Use the default (nothing to do)

Open any agent's voice settings at [bithuman.ai](https://www.bithuman.ai/explore). The **bitHuman voice** section is marked *Included* — design a voice, clone one, or pick from the gallery. It's multilingual automatically, so there's no language toggle to manage.

### Clone a voice

Cloning, designing and previewing voices is free.

1. Open the agent's voice settings in the bitHuman app and choose **Clone Voice**.
2. Upload or record 30 seconds or more of clean speech from one speaker, with no music. Longer clean samples are fine; the whole file is used.
3. Select **Clone Voice** and keep the window open. Cloning takes about a minute.
4. Select **Preview** to hear the new voice.
5. Select **Apply to Agent**. Until you apply it, the agent keeps its previous voice.

To clone from the API instead, send the sample as `audio` when you [create an agent](/api/agents#generate-an-agent).

## Check the voice your agent uses

- **In the bitHuman app:** open the agent's voice settings and select **Preview**. It plays the voice saved on the agent.
- **With the API:** [`GET /v1/agent/{code}`](/api/agents#get-an-agent) returns the saved voice as `data.voice_id`.

```bash
curl https://api.bithuman.ai/v1/agent/$AGENT_CODE -H "api-secret: $BITHUMAN_API_SECRET"
```

```json
{"success": true, "data": {"code": "A80HVD8577", "language": "en", "voice_id": "bf0a246a-8642-498a-9950-80c35e9276b5"}}
```

## Change the voice

Change an agent's voice in the bitHuman app: apply a clone, a designed voice or a gallery voice in the agent's voice settings. The API cannot set the voice; [`POST /v1/agent/{code}`](/api/agents#update-an-agent) changes only the prompt and the voice providers.

**Realtime mode uses its own voice.** With **Realtime mode** on, or an OpenAI or Grok real-time voice selected, the agent speaks that provider's voice instead of the saved voice. To use your clone, turn **Realtime mode** off in the agent's **Providers** settings and save. To clear a real-time voice from the API, send `{"providers": {"realtime": "default"}}` to [`POST /v1/agent/{code}`](/api/agents#update-an-agent).

## Bring your own voice provider

### 1. Connect your key

Go to **Developer → Integrations**, add your provider, and paste that provider's key; bitHuman checks the key there before saving and rejects an invalid one. The [Providers API](/api/providers) stores a key as sent, without a check, so start one session to confirm it works. Keys are encrypted at rest and never leave the platform in plaintext.

### 2. Pick a premium voice

Back in the agent's voice settings, the premium providers you've connected unlock. Choose a voice; a provider you haven't connected stays locked with a shortcut to Integrations. Your selection runs that voice on your key.

### Supported providers

| Provider | Voices you can select | Real-time (speech-to-speech) |
|----------|-----------------------|:---------------------------:|
| **OpenAI** | Realtime voices (alloy, ash, ballad, cedar, …) | ✓ |
| **Grok (xAI)** | Grok voices (ara, eve, rex, …) | ✓ |
| **ElevenLabs** | Your ElevenLabs voice library | — |
| **Cartesia** | Cartesia voices | — |

> **Tip** Real-time providers (OpenAI, Grok) give the lowest-latency, most expressive speech-to-speech — great for kiosks and live demos. ElevenLabs and Cartesia give you a specific voice on the standard pipeline.

## How billing works

- Every managed-agent conversation bills the voice chat rate, whichever voice it uses ([pricing](/pricing)).
- A bring-your-own voice or real-time model is also billed by your provider on your key.

If a bring-your-own key ever fails or is removed, the agent automatically falls back to the built-in multilingual pipeline — it never silently stops talking.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The preview sounded right, the live agent does not | the clone was previewed but never applied | clone again, then select **Apply to Agent** |
| The live agent speaks a different voice than **Preview** | **Realtime mode** is on, or a real-time voice is selected | turn **Realtime mode** off in the agent's **Providers** settings and save |
| `voice_id` and **Preview** are right, the live voice still differs | a voice fallback during that session | contact support with the session time; each session records the voice it used |
