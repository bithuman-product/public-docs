---
title: "Examples"
description: "Runnable bitHuman projects grouped by what you're building — every one is open-source. Clone, set your API secret, run."
section: examples
group: "Examples"
order: 1
---

## Start here

Every project below is open-source under [bithuman-product/bithuman-sdk-public/Examples](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples). Find the row that matches what you're building and start there.

> **Note** New here? The fastest end-to-end demo is the [CLI — Hello, avatar](/examples/cli-hello): one `brew install`, one command, a talking avatar in your browser. No code, ~2 minutes.

These are the no-code and smallest-scripted starting points:

- [CLI — Hello, avatar](/examples/cli-hello) — install, `bithuman doctor`, `bithuman run`. Full demo, zero code.
- [Quickstart project](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/quickstart) — the smallest scripted path: credentials, a model, your first render.

## Backend & voice agents — Python

The streaming runtime and LiveKit voice agents. Each repo project ships an `.env.example`, `requirements.txt`, and a `docker compose` stack.

- [Python — Hello, avatar](/examples/python-hello) — the minimal `AsyncBithuman` streaming loop, ~20 lines.
- [AI voice chat](/examples/ai-conversation) — OpenAI Realtime voice in, lip-synced avatar out. No server.
- [cloud-essence](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/cloud-essence) — Essence on bitHuman cloud + LiveKit + web UI. Start here for agents.
- [local-essence](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/local-essence) — Essence on your own CPU box. Includes a no-LiveKit `quickstart.py`.

## Native apps — Swift & Kotlin

- [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) — minimal SwiftUI `bitHumanKit` integration, ~40 lines.
- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — Maven AAR + `Avatar.load` in a fresh Android Studio project.
- [swift/ios-avatar](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/ios-avatar) — a complete runnable SwiftUI iOS reference app.
- [swift/macos-voice](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/macos-voice) — voice-only on-device agent: no avatar, no API key, fully offline.
- [swift/macos-avatar (preview)](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/macos-avatar) — macOS Expression voice agent. Targets an unreleased renderer/sink bridge.
- [swift/essence-playback (preview)](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/essence-playback) — SwiftUI Essence playback. Targets an unreleased SDK API surface.

> **Note** A Flutter reference app exists in the `bithuman-apps` repo (one Dart codebase across macOS, iOS, and Android), but Flutter is **not** a published code SDK — treat it as a reference app / "coming soon", not an Apps SDK language.

## Web & other languages

- [integrations/nextjs-ui](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/nextjs-ui) — a polished Next.js video-chat UI over LiveKit.
- [integrations/gradio-web](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/gradio-web) — talk to an avatar in the browser via Gradio + FastRTC.
- [integrations/java-websocket](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/java-websocket) — stream audio to an avatar server from Java over WebSocket.
- [integrations/offline-mac](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/offline-mac) — fully offline macOS integration.
- [REST — Hello, avatar](/examples/rest-hello) — zero-to-avatar with nothing but `curl`.
- [rest-api](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/rest-api) — `curl` and Python scripts for every REST endpoint.

## All hello-world tutorials

| Tutorial | Path | Best for |
|---|---|---|
| [CLI — Hello, avatar](/examples/cli-hello) | no code | Trying it end-to-end in ~2 minutes |
| [Python — Hello, avatar](/examples/python-hello) | Python | The minimal streaming loop |
| [REST — Hello, avatar](/examples/rest-hello) | `curl` | Backends, CI, any non-SDK language |
| [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) | SwiftUI | iPhone / iPad on-device |
| [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) | Kotlin | Android on-device |
| [AI voice chat](/examples/ai-conversation) | Python | OpenAI Realtime voice + avatar |

For the REST contract see the [API reference](/api/reference). For deployment shapes (LiveKit cloud, self-hosted GPU, embed widget) see [Guides](/guides).
