---
name: bithuman-integrate
description: Add a bitHuman real-time talking avatar (Essence 2 or Expression 2) to an app, a website, a Python or LiveKit voice agent, or a terminal. Use when a user asks to integrate bitHuman, render a talking avatar from speech, or choose between on-device, browser, self-hosted and bitHuman cloud rendering.
---

# Integrate a bitHuman avatar

bitHuman turns speech into a real-time talking avatar from one portrait. Essence 2 renders a photoreal person; Expression 2 renders any character. The docs are at https://docs.bithuman.ai; every page is also markdown at `<url>.md`, and the index is https://docs.bithuman.ai/llms.txt.

## Rules

- API and SDK use requires the Creator plan or higher. Never tell a user they can build on a free plan.
- Read the API secret from the environment (`BITHUMAN_API_SECRET`). Never write it into code, a command line or a commit.
- In a LiveKit worker, name the secret `BITHUMAN_MASTER_SECRET` and pass a minted token.
- Use two verbs: the avatar **renders** (on the device, in the browser, on your server or in the bitHuman cloud); the conversation **runs** (in the user's own stack, in the CLI's local conversation brain, or on bitHuman's servers).
- Send `model` (`"essence-2"` or `"expression-2"`) when creating an agent, and poll until `status` is `ready` or `failed`.
- Take versions from https://docs.bithuman.ai/versions.json, speed from https://docs.bithuman.ai/performance.json (× real time, with the device) and prices from `GET https://api.bithuman.ai/v1/pricing`, sent with the `api-secret` header (it returns 401 without one). Do not type them from memory.
- Do not claim offline operation on phones, Mac or the browser, a conversation brain on phones, or any certification.

## 1. Pick a path

| The user wants | Use | Where the avatar renders | Docs |
|---|---|---|---|
| An avatar on a website | the web embed (an iframe) | bitHuman cloud, or the tab with WebGPU | https://docs.bithuman.ai/platforms/web.md |
| An iPhone, iPad or Mac app | the Swift package | on the device (a physical iPhone or iPad) | https://docs.bithuman.ai/platforms/ios.md |
| An Android app | `essence2-android` / `expression2-android` | on the device (a physical arm64 phone) | https://docs.bithuman.ai/platforms/android.md |
| A Flutter app on Android | the Flutter plugin | on the device (a physical arm64 phone) | https://docs.bithuman.ai/platforms/flutter.md |
| Python code or a render job | the Python SDK (`bithuman`) | on the machine (macOS, Linux; no GPU needed) | https://docs.bithuman.ai/platforms/python.md |
| A face for a LiveKit voice agent | the LiveKit plugin | your server, or the bitHuman cloud | https://docs.bithuman.ai/platforms/livekit.md |
| A terminal, kiosk or quick test | the CLI (`bithuman`) | on the machine (macOS arm64, Linux x86_64 / arm64) | https://docs.bithuman.ai/platforms/cli.md |
| Any backend | the REST API | bitHuman cloud | https://docs.bithuman.ai/platforms/rest.md |

Fully offline operation is a separate license, arranged through sales: https://docs.bithuman.ai/deploy/offline.md. All modes side by side: https://docs.bithuman.ai/deploy.md.

## 2. Install

Copy the install line from the platform page, with the version from `/versions.json`. Python goes into a virtual environment (`python3 -m venv .venv`). The sample avatars need no account to download: Essence 2 `sofia-ramirez` (A52DHS2219) and Expression 2 `wise-pup` (A23WJF0199).

## 3. Wire speech to frames

The SDKs take 16 kHz mono speech from any speech-recognition, language-model and voice stack and hand back frames:

1. Keep one avatar open for the conversation.
2. Feed each audio chunk as it arrives (`feed(chunk)` in Swift and Kotlin, `push_audio(...)` in Python).
3. Show the frames the avatar hands out, on the audio player's clock where the platform offers one.
4. Mark the end of each reply (`flushTail()`, `endOfAudio()`, `flush()`); between replies the avatar keeps moving on idle frames.
5. On barge-in, interrupt the reply (`interrupt()`, `resetState(true)`, `resetAudio()`), then feed the next one.

Each platform page's "Integrate into your app" table names the exact calls. A runnable voice agent: https://docs.bithuman.ai/build/voice-agent.md. A companion app: https://docs.bithuman.ai/build/companion-app.md.

## 4. Handle the secret

- Local development: `export BITHUMAN_API_SECRET=…` (the Python SDK and the CLI read it; the CLI also has `bithuman login`).
- A shipped mobile app holds the secret on the phone: give each app its own secret that can be rotated or revoked, and fetch it from the user's backend at startup rather than compiling it in.
- A website never holds the secret: the embed opens a public or token-scoped agent.
- A LiveKit worker: `BITHUMAN_MASTER_SECRET`, plus a minted token.

Get a secret: https://www.bithuman.ai/developer/api-keys. Details: https://docs.bithuman.ai/start/api-secret.md.

## 5. Check it worked

The avatar appears, moves while idle and its lips follow the speech. Real-time sessions bill active session time, talking or idle, to the second; end sessions you are not using. If something fails, read https://docs.bithuman.ai/resources/troubleshooting.md and the platform page's Troubleshooting table.
