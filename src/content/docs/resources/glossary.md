---
title: "Glossary"
description: "The words used across the bitHuman docs and what each one means."
section: overview
group: "Help"
order: 30
type: reference
llms: start
searchTitle: "Glossary: bitHuman terms"
next: ["/models", "/deploy", "/resources/faq"]
moved:
  older-names: /resources/renamed#older-names
---

What each term means here, and the page that owns it. The short version, for a first read, is [Key terms](/models/how-it-works#key-terms).

## Models and avatars

| Term | Meaning |
|---|---|
| **Essence 2** (`essence-2`) | The model that renders a photoreal person from one portrait. [Essence 2](/models/essence-2) |
| **Expression 2** (`expression-2`) | The model that renders any character from one portrait. [Expression 2](/models/expression-2) |
| **Essence 1, Expression 1** (`essence-1`, `expression-1`) | The first generation of the models. [First generation](/models/first-generation) |
| **Avatar** | The face that talks: one character, made from one portrait. It turns speech audio into lip-synced video. |
| **Agent** | An avatar together with its persona, voice and knowledge, created in the bitHuman app or with the [Agents API](/api/agents). |
| **Agent code** | The identifier of an agent, for example `A23WJF0199`. Request fields name it `agent_id` or `agent_code`, and examples read it from `BITHUMAN_AGENT_ID` or `BITHUMAN_AGENT_CODE`: all take the same code. [Agent codes](/models/avatar-file#agent-codes) |
| **Sample avatars** | Public agents anyone can use without an account: `wise-pup` (agent code `A23WJF0199`, Expression 2) and `sofia-ramirez` (`A52DHS2219`, Essence 2). The CLI takes either the name or the code. [Showcase list](https://api.bithuman.ai/v1/models/showcase) |
| **Avatar file** (`.imx`) | One agent's model files in one container, downloaded once and rendered on your hardware. The Essence 2 SDKs call it an *identity*. [The avatar file](/models/avatar-file) |
| **Persona** | The agent's system prompt: who it is and how it answers. [Persona](/build/persona) |
| **Gestures** | A named motion (wave, nod, clap) an avatar plays when your code asks; the API calls them `dynamics`. [Gestures](/build/gestures) |
| **Idle** | The motion an avatar shows between replies, so it never freezes. |

## Where it runs

| Term | Meaning |
|---|---|
| **Renders / runs** | The avatar *renders* (on the device, in the browser, on your server or in the bitHuman cloud); the conversation *runs* (in your stack, in the CLI's local conversation brain, or on bitHuman's servers). |
| **On the device** | The avatar renders on the user's iPhone, iPad, Mac or Android phone. [On the device](/deploy/on-device) |
| **CPU only (no GPU)** | The avatar renders on a standard Linux PC with no graphics card. [CPU only](/deploy/cpu) |
| **Self-hosted (your servers)** | The avatar renders on a computer or server you run: the CLI, the Python SDK, the LiveKit plugin or Pipecat. It bills the lower self-hosted rate. [Your servers](/deploy/self-hosted) |
| **bitHuman cloud** | The avatar renders on bitHuman's servers and streams to any screen, at the cloud rate. [bitHuman cloud](/deploy/cloud) |
| **LiveKit room** | A real-time audio and video session on a LiveKit server. A voice agent and the avatar join it as participants, and so do your users. [LiveKit](/platforms/livekit) |
| **Fully offline** | A license for real-time avatars with no internet connection. [Fully offline](/deploy/offline) |
| **File rendering** | Turning an audio file into a talking-avatar video with `bithuman render` or the Python SDK. It signs in online; it is not the [offline license](/deploy/offline). [Talking video](/build/talking-video) |
| **WebGPU** | The browser graphics interface the web embed uses to render the avatar in the tab (`render=local`). [Web](/platforms/web) |
| **Local conversation brain** | The CLI mode (`BITHUMAN_LOCAL=1`) that runs speech recognition, the language model and the voice on a Mac or Linux PC. [Local conversation brain](/platforms/cli/local-brain) |
| **× real time** | Seconds of avatar video rendered per second. At 1.0× or more an avatar holds a live conversation. [Performance](/performance) |

## Credentials and billing

| Term | Meaning |
|---|---|
| **API secret** | The one credential for every surface, read from `BITHUMAN_API_SECRET`; REST sends it in the `api-secret` header. [Your API secret](/start/api-secret) |
| **Embed token** | A short-lived token your server mints so a web page can open a private agent without the secret. [Embedding](/api/embedding) |
| **Runtime token** | A short-lived token for a LiveKit room or a download, minted with the API secret. [Authentication](/api/authentication) |
| **Credits** | What usage is paid in: 100 credits = $1. [Pricing and credits](/pricing) |
| **Session** | One avatar running, from start to stop. It bills while it runs, talking or idle. [Pricing](/pricing) |
| **Managed agent, chat line** | bitHuman runs the whole conversation (listening, the replies, the voice) and the avatar, for one all-inclusive rate of 10 credits a minute. [Pricing](/pricing) |
| **Active session time** | What real-time usage bills: the time a session is open, talking or idle, to the second. [Pricing](/pricing) |
| **Creator plan** | The plan API and SDK use requires, or a higher one. [Plans](/pricing) |

## Next

- [FAQ](/resources/faq) · [Models](/models) · [Deploy](/deploy)
