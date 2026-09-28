---
title: "Healthcare"
description: "Configure bitHuman so patient audio, transcripts and video stay in your environment: rendering on your hardware, a local or private language model, and no transcript stored at bitHuman."
section: deploy
group: "Use cases"
order: 20
type: guide
searchTitle: "Healthcare: avatars in clinics and hospitals, with patient data in your environment"
claims: ["S4", "S5", "S6", "S7", "S9", "S14", "S15", "S17", "S18", "S19", "S21", "S24", "S30"]
next: ["/deploy/privacy", "/deploy/self-hosted", "/platforms/cli/local-brain"]
---

Check-in desks, wayfinding, visitor information and patient-education screens: an avatar that answers questions in a clinic or a hospital. This page shows where each kind of data goes, so your privacy and security teams can assess a deployment. bitHuman does not certify your deployment; your organization makes its own assessment.

## Keep patient data in your environment

1. **Render on your hardware:** your servers, a Linux PC with no GPU, or your app on the device. When the avatar renders on your hardware, its audio and video stay there.
2. **Keep the conversation there too:** the CLI's [local conversation brain](/platforms/cli/local-brain) (`BITHUMAN_LOCAL=1`) runs speech recognition, the language model and the voice on the machine, and audio, transcripts and generated speech never leave it. Or use any OpenAI-compatible model inside your own network ([Providers](/api/providers)). In an app, the Swift package and the Android SDK take any 16 kHz mono speech your own services produce.
3. **What reaches bitHuman then:** a credential check when a session starts, the avatar download, and usage reports. Usage reports contain no audio, video, images or conversation text. Self-hosted and on-device sessions store no transcript at bitHuman.

```dataflow
servers
```

When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text.

## Creating the avatar

Creating the avatar from a portrait happens in the bitHuman cloud; the finished avatar model then runs on your devices. Use a portrait you have the rights to use.

## In the bitHuman cloud instead

With the web embed or a cloud avatar, the session's audio and conversation reach bitHuman to run it:

- cloud avatars render in the US;
- transcripts are stored with the agent, and deleting the agent deletes its records, including transcripts, and its model files;
- traffic is encrypted in transit (HTTPS/TLS; WebRTC media uses DTLS-SRTP), and provider keys you connect are encrypted at rest.

## Access and accounts

Organization roles (owner, admin, member), an audit-log API, API-secret rotation with immediate revocation, and scoped runtime and embed tokens so browsers never hold your secret ([Data flows & privacy](/deploy/privacy#security-and-access)).

## Agreements

Healthcare and financial-services deployments are set up under an enterprise agreement and review. [Contact sales](https://www.bithuman.ai/sales) to start one.

Overviews to share with your team, on bithuman.ai: [AI avatars for healthcare](https://www.bithuman.ai/use-cases/healthcare), [Security and privacy](https://www.bithuman.ai/security) and [Enterprise](https://www.bithuman.ai/enterprise).
