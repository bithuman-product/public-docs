---
title: "FAQ"
description: "Answers to the questions developers ask first."
section: overview
group: "Help"
order: 20
type: reference
llms: start
searchTitle: "FAQ: frequently asked questions"
help: end
claims: ["S1", "S2", "S3", "S5", "S6", "S7", "S10", "S20", "S24", "S26", "S27", "S29", "S30", "S32"]
next: ["/start", "/deploy", "/pricing"]
---

Short answers, each with the page that has the detail.

## Getting started

### What is bitHuman?

Real-time talking avatars for your app: you give an avatar speech audio and it lip-syncs to it, live, rendered on the device, in the browser, on your own computer or in the bitHuman cloud. The words it uses are on [Key terms](/models/how-it-works#key-terms).

### Which model should I use?

A real person: [Essence 2](/models/essence-2). Any other character (a cartoon, an animal, a mascot): [Expression 2](/models/expression-2), the default. More on [Choosing a model](/models#choosing-a-model).

## Building an app

### Is there an iOS and Android SDK?

Yes. The [Swift package](/platforms/ios) renders Essence 2 and Expression 2 on iPhone, iPad and [Mac](/platforms/macos). `essence2-android` and `expression2-android`, from bitHuman's Maven repository, render them on arm64 [Android](/platforms/android) phones, and the [Flutter plugin](/platforms/flutter) wraps them for Flutter apps on Android. Measured results for each device are on [Performance](/performance).

### Does the avatar render on the phone or in the cloud?

With the Swift and Android SDKs, on the phone. With the [web embed](/platforms/web), in the bitHuman cloud by default, or in the browser tab with WebGPU (`render=local`); there, a device that can't render the avatar in real time shows a message instead of falling back to the cloud. With the web embed the conversation runs on bitHuman's servers, even when the avatar renders in the tab. With the [LiveKit](/platforms/livekit) cloud avatar, the avatar renders in the bitHuman cloud. Every mode side by side: [Deploy](/deploy).

### Does the SDK include the voice and the AI conversation?

The Swift and Android SDKs only render: your app passes in 16 kHz mono speech and draws the frames, so any speech-recognition, language-model and voice stack works. For a managed conversation, use a bitHuman agent through the web embed or LiveKit. On a Mac or a Linux PC, the CLI's [local conversation brain](/platforms/cli/local-brain) runs speech recognition, the language model and the voice on the machine.

### Can I use my own language model and persona?

Yes. Any OpenAI-compatible endpoint works, including one in your own network ([voice and model providers](/api/providers)). Set the persona in your model's system prompt or, for a managed agent, as its `system_prompt` ([Persona](/build/persona)).

### Can I build an AI companion app?

Yes. bitHuman provides the companion's face, rendered in real time on the phone, on the Mac or in the browser, and you choose the voice, the language model and the persona. The [companion app recipe](/build/companion-app) covers the conversation loop, the app lifecycle and cost.

### Can I use bitHuman in a React or Next.js app?

Yes, with the iframe embed; there is no npm package. [Web](/platforms/web/app#react-and-other-frameworks) has the React snippet.

### Can I test on the iPhone Simulator or an Android emulator?

Expression 2 runs in the iOS Simulator. Essence 2 on Apple needs a physical iPhone or iPad, not the Simulator, and Android needs a physical arm64 device, not an emulator.

### Does a computer need a GPU?

No. Essence 2 and Expression 2 run live on a standard Linux PC with no GPU; see [CPU only (no GPU)](/deploy/cpu) for the measured speed.

## Pricing and plans

### What does it cost?

From 12 October 2026, API and SDK use requires the Creator plan or higher. On the device:

```price
device
```

In the bitHuman cloud:

```price
cloud
```

The [credit calculator](/pricing) turns your minutes into credits and a plan.

### How is a session billed?

Real-time usage bills active session time, talking or idle, to the second. End sessions you are not using. The Video API bills whole minutes of output ([Pricing](/pricing)).

### Is there a one-time fee to create an avatar?

Creating your own avatar is a one-time 500 credits for Essence 2 or 2,000 credits for Expression 2, and takes about 2 to 2.5 hours. A failed creation is refunded automatically. After that, sessions bill active session time at the rates above.

### Do you offer annual or enterprise agreements?

Yes. Enterprise customers can choose a flat annual price that covers a committed volume. The SDK still reports usage against that volume, so a phone app needs a network connection during a session. Further discounts are available with an annual commitment and for larger commitments. Start from the published [plans](/pricing), then [contact sales](https://www.bithuman.ai/enterprise?topic=annual-agreement#contact).

### Can I ship a white-label app?

Yes. Apps built with the bitHuman SDKs can be fully white-label: no bitHuman branding is required in your app, including App Store apps.

## Connectivity and data

### Does it work offline on a phone?

No. Apps on phones and Macs need a connection to start a session, and they keep rendering through a network drop of up to 5 minutes. The web embed needs a connection throughout. Fully offline realtime is a separate license: [Fully offline](/deploy/offline).

### What data does the SDK send to bitHuman?

Usage reports for metering. They contain no audio, video, images or conversation text. When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only. With the web embed, the conversation runs on bitHuman's servers. The full picture per mode: [What leaves the device](/deploy/privacy).

## Next

- [Quickstart](/start) · [Deploy](/deploy) · [Glossary](/resources/glossary)
