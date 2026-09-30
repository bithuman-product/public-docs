---
title: "Data flows & privacy"
description: "What reaches bitHuman in each deployment mode, and what bitHuman stores."
section: deploy
group: "Privacy & compliance"
order: 10
type: guide
llms: deploy
claims: ["S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S14", "S15", "S16", "S17", "S18", "S20", "S21", "S24", "S25", "S29", "S30"]
next: ["/deploy", "/deploy/on-device", "/deploy/self-hosted"]
moved:
  security-and-access: /deploy/privacy/retention#security-and-access
  retention-and-deletion: /deploy/privacy/retention#retention-and-deletion
  your-content: /deploy/privacy/retention#your-content
---

Two things decide what leaves your hardware: where the avatar **renders**, and where the conversation **runs**. This page answers both for each mode.

## By mode

| Question | bitHuman cloud | Your servers | On the device |
|---|---|---|---|
| **The avatar renders** | on bitHuman's servers, in the US | on your Mac or Linux machines; its audio and video stay there | in your app on the device, or in the browser tab (`render=local`) |
| **The conversation runs** | on bitHuman's voice service, or with the providers whose keys you connect | where you choose: the CLI's local conversation brain, your own services, or bitHuman's | where your app chooses; with the web embed, on bitHuman's servers |
| **Usage reports** | none: bitHuman runs the session | usage only, no audio, video, images or conversation text | the same as your servers |
| **Transcripts at bitHuman** | stored with the agent | none stored | none stored |
| **Your API secret** | on your server; browsers get scoped embed tokens | on your machine | held by your app on the device |

[Fully offline](/deploy/offline) runs on Linux and macOS computers (Apple silicon) with no required reconnection; it is bought in the console or through sales.

## What leaves your hardware

Pick a mode to see where each kind of data goes. Rows marked **Reaches bitHuman** are what crosses from your hardware to bitHuman.

```dataflow-explorer
```

## Rendering on your hardware

When the avatar renders on your hardware, its audio and video stay there. When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text. On Android, after the one-time model download, the only network traffic is usage reporting.

With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab (`render=local`).

## The conversation

- **The local conversation brain:** with the CLI's [local conversation brain](/platforms/cli/local-brain) (`BITHUMAN_LOCAL=1`), speech recognition, the language model and the voice run on the machine; audio, transcripts and generated speech never leave it. The session still reports usage online.
- **Your own model:** a managed agent works with any OpenAI-compatible language model endpoint, including one in your own network ([Providers](/api/providers)).
- **Your own stack:** the Swift and Android SDKs take any 16 kHz mono speech your pipeline produces and return frames.

## Usage reports

Self-hosted and on-device sessions check your credential when they start and report usage while they run. Usage reports contain no audio, video, images or conversation text. Self-hosted and on-device sessions store no transcript at bitHuman.

## Creating an avatar

Avatar creation from a portrait happens in the bitHuman cloud; the finished avatar model then runs on your devices. The portrait is uploaded for that step, in every mode.

Security, retention and deletion, and how bitHuman treats your content: [Security and retention](/deploy/privacy/retention).
