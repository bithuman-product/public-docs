---
title: "Voice providers"
description: "Every agent speaks every language for free on bitHuman's built-in voice pipeline — or bring your own OpenAI, Grok, ElevenLabs, or Cartesia key to unlock premium voices that run on your account."
section: guides
group: "Integrate"
order: 10
---

## Two ways to give your agent a voice

| Lane | What you get | Cost |
|------|--------------|------|
| **bitHuman default** | The built-in voice pipeline — **multilingual out of the box**. Your agent auto-detects the caller's language and replies in it. No setup, no keys. | Included |
| **Bring your own provider** | Connect your **own** OpenAI, Grok (xAI), ElevenLabs, or Cartesia key and pick that provider's premium voices — including low-latency speech-to-speech (realtime). | Runs on **your** key, billed by **your** provider |

You never *have* to bring a key. The default pipeline already speaks every language. Bring your own only when you want a specific premium voice or a provider's realtime engine.

## Use the default (nothing to do)

Open any agent's voice settings at [bithuman.ai](https://www.bithuman.ai/explore). The **bitHuman voice** section is marked *Included* — design a voice, clone one, or pick from the gallery. It's multilingual automatically, so there's no language toggle to manage.

## Bring your own voice provider

### 1. Connect your key

Go to **Developer → Integrations**, add your provider, and paste your API key. bitHuman **validates the key before saving** — an invalid key is rejected on the spot, so a saved provider is always a working one. Keys are encrypted at rest and never leave the platform in plaintext.

### 2. Pick a premium voice

Back in the agent's voice settings, the premium providers you've connected unlock. Choose a voice; a provider you haven't connected stays locked with a shortcut to Integrations. Your selection runs that voice on your key.

## Supported providers

| Provider | Voices you can select | Realtime (speech-to-speech) |
|----------|-----------------------|:---------------------------:|
| **OpenAI** | Realtime voices (alloy, ash, ballad, cedar, …) | ✓ |
| **Grok (xAI)** | Grok voices (ara, eve, rex, …) | ✓ |
| **ElevenLabs** | Your ElevenLabs voice library | — |
| **Cartesia** | Cartesia voices (also powers the free default) | — |

> **Tip** Realtime providers (OpenAI, Grok) give the lowest-latency, most expressive speech-to-speech — great for kiosks and live demos. ElevenLabs and Cartesia give you a specific voice on the standard pipeline.

## How billing works

- The **default** pipeline is part of your normal per-minute [avatar runtime credits](/guides/pricing) — nothing extra.
- **Bring-your-own** voices run on **your** provider account. bitHuman charges you only the normal avatar runtime; the voice tokens are billed to you by OpenAI / xAI / ElevenLabs / Cartesia directly.

If a bring-your-own key ever fails or is removed, the agent automatically falls back to the free multilingual pipeline — it never silently stops talking.
