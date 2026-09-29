---
title: "Glossary"
description: "The words used across the bitHuman docs, what each one means, and the older names you may still meet in code, files and saved links."
section: resources
group: "Resources"
order: 60
type: reference
llms: start
searchTitle: "Glossary: bitHuman terms and older names"
next: ["/models", "/deploy", "/resources/faq"]
---

What each term means here, and the page that owns it.

## Models and avatars

| Term | Meaning |
|---|---|
| **Essence 2** (`essence-2`) | The model that renders a photoreal person from one portrait. [Essence 2](/models/essence-2) |
| **Expression 2** (`expression-2`) | The model that renders any character from one portrait. [Expression 2](/models/expression-2) |
| **Essence 2 Max** | Essence 2 Max is available on the Enterprise plan only. Contact sales to enable it. [Models](/models) |
| **Essence 1, Expression 1** (`essence-1`, `expression-1`) | The first generation of the models. [First generation](/models/first-generation) |
| **Agent** | An avatar together with its persona, voice and knowledge, created in the bitHuman app or with the [Agents API](/api/agents). |
| **Agent code** | The identifier of an agent, for example `A23WJF0199`. [Agent codes](/models/avatar-file#agent-codes) |
| **Sample avatars** | Public agents anyone can use without an account: `sofia-ramirez` (Essence 2) and `wise-pup` (Expression 2). [Showcase list](https://api.bithuman.ai/v1/models/showcase) |
| **Avatar file** (`.imx`) | One agent's model files in one container, downloaded once and rendered on your hardware. [The avatar file](/models/avatar-file) |
| **Persona** | The agent's system prompt: who it is and how it answers. [Persona](/build/persona) |
| **Gestures** | A named motion (wave, nod, clap) an avatar plays when your code asks; the API calls them `dynamics`. [Gestures](/build/gestures) |
| **Idle** | The motion an avatar shows between replies, so it never freezes. |

## Where it runs

| Term | Meaning |
|---|---|
| **Renders / runs** | The avatar *renders* (on the device, in the browser, on your server or in the bitHuman cloud); the conversation *runs* (in your stack, in the CLI's local conversation brain, or on bitHuman's servers). |
| **On the device** | The avatar renders on the user's iPhone, iPad, Mac or Android phone. [On the device](/deploy/on-device) |
| **CPU only (no GPU)** | The avatar renders on a standard Linux PC with no graphics card. [CPU only](/deploy/cpu) |
| **Your servers** | You run the CLI, the Python SDK or the LiveKit plugin on machines you control. [Your servers](/deploy/self-hosted) |
| **bitHuman cloud** | The avatar renders on bitHuman's servers and streams to any screen. [bitHuman cloud](/deploy/cloud) |
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
| **Credits** | What usage is paid in. [Pricing and credits](/pricing) |
| **Active session time** | What real-time usage bills: the time a session is open, talking or idle, to the second. [Pricing](/pricing) |
| **Creator plan** | The plan API and SDK use requires, or a higher one. [Plans](/pricing) |

## Older names

The model names retired over time, the older file extensions and library names, and what each means today, are in one table: [Naming & migration](/models#naming--migration). The SDK and API names below are older spellings you may still meet:

| Older name | What to use now |
|---|---|
| `BITHUMAN_API_KEY` | `BITHUMAN_API_SECRET`. The deprecated alias is still read, with a warning, until CLI 3.0 and bithuman 4.0. |
| `POST /v1/realtime/ephemeral-token` (`ek_…` tokens) | Retired; connect through the [realtime relay](/api/realtime). |
| `bithuman.offline`, `render_offline` | Deprecated; use `bithuman.open(path).render(audio, out_mp4=...)` ([Python](/platforms/python)). |
| `bitHumanKit` | A legacy Swift package, not the current one; use the [Swift package](/platforms/ios) products `Expression2` and `Essence2Kit`. |

## Next

- [FAQ](/resources/faq) · [Models](/models) · [Deploy](/deploy)
