---
title: "Use cases"
description: "Which deployment mode each use case starts from: banking and ATMs, healthcare, events and trade shows, kiosks, apps and AI companions, and websites."
section: deploy
group: "Use cases"
order: 0
type: guide
claims: ["S3", "S4", "S19", "S29", "S30"]
next: ["/deploy/use-cases/banking-and-atms", "/deploy/use-cases/healthcare", "/deploy/use-cases/events-and-trade-shows"]
---

Every use case runs the same avatar. What changes is where it renders, where the conversation runs, and what reaches bitHuman.

| Use case | Start from | Guide |
|---|---|---|
| Branch screens, teller terminals and ATMs | a Linux PC or terminal with no GPU, or an Android terminal; fully offline where there is no internet | [Banking and ATMs](/deploy/use-cases/banking-and-atms) |
| Clinics and hospitals | your servers or the device, with the conversation kept in your environment | [Healthcare](/deploy/use-cases/healthcare) |
| Booths, show floors and museums | a Linux PC with no GPU and the local conversation brain | [Events and trade shows](/deploy/use-cases/events-and-trade-shows) |
| Lobbies, retail and information screens | a Linux PC with no GPU, full screen in Chrome | [Kiosk on a Linux PC](/build/kiosk) |
| iPhone, iPad, Mac and Android apps, including AI companions | on the device, with your own voice and language services | [Companion app](/build/companion-app) |
| Websites | the bitHuman cloud, through the web embed or a widget | [Website widget](/build/website-widget) |

When the avatar renders on your hardware, its audio and video stay there. When the avatar renders in your app on the device and you use your own voice and language services, bitHuman receives usage metering only, never audio, video or conversation text. With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab. Every mode, side by side: [Data flows & privacy](/deploy/privacy).

Healthcare and financial-services deployments are set up under an enterprise agreement and review. [Contact sales](https://www.bithuman.ai/sales) to start one.
