---
title: "Examples"
description: "Runnable bitHuman projects grouped by what you're building — every one is open-source. Clone, set your API secret, run."
section: examples
group: "Examples"
order: 1
---

## Pick your path

Every project below is open-source under [bithuman-product/bithuman-sdk-public/Examples](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples). Each tutorial page follows the same shape: **Prerequisites → Run it → What you'll see → Full code → Next steps**. Find your row and start there.

| If you want to… | Start with | Language | Time |
|---|---|---|---|
| Try a talking avatar end-to-end, no code | [CLI — Hello, avatar](/examples/cli-hello) | CLI | ~2 min |
| The smallest streaming loop in code | [Python — Hello, avatar](/examples/python-hello) | Python | ~5 min |
| Call the platform from any language | [REST — Hello, avatar](/examples/rest-hello) | `curl` | ~5 min |
| A talking voice assistant on a Mac/iPad/iPhone | [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) | SwiftUI | ~15 min |
| An avatar on an Android phone or tablet | [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) | Kotlin | ~15 min |
| Full voice conversation, mic in / avatar out | [AI voice chat](/examples/ai-conversation) | Python | ~10 min |

> **Note** New here? The fastest end-to-end demo is the [CLI — Hello, avatar](/examples/cli-hello): one `brew install`, one command, a talking avatar in your browser. No code.

## No-code & smallest scripts

- [CLI — Hello, avatar](/examples/cli-hello) — install, `bithuman doctor`, `bithuman run`. Full demo, zero code.
- [quickstart project](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/quickstart) — the smallest scripted path: API key, a model, your first render. Auto-downloads a sample avatar on first run.

## Backend & voice agents — Python

The streaming runtime and LiveKit voice agents. Each repo project ships an `.env.example`, `requirements.txt`, and a `docker compose` stack.

- [Python — Hello, avatar](/examples/python-hello) — the minimal `AsyncBithuman` streaming loop, ~20 lines.
- [AI voice chat](/examples/ai-conversation) — OpenAI Realtime voice in, lip-synced avatar out. No server.
- [python/local-essence](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/local-essence) — Essence on your own CPU box. Ships `quickstart.py`, `microphone.py`, `conversation.py`, plus a web UI at `http://localhost:4202`.
- [python/cloud-essence](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/python/cloud-essence) — Essence on bitHuman cloud + LiveKit + browser UI. Start here for production agents.

## Native apps — Swift & Kotlin

- [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) — SwiftUI avatar on the `Bithuman` package + AvatarUIKit.
- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — Maven Central AAR + `Avatar.load` on `arm64-v8a`.
- [swift/ios-avatar](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/ios-avatar) — complete runnable SwiftUI iOS reference app (hardware gate + entitlements).
- [swift/macos-voice](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/macos-voice) — voice-only on-device agent: no avatar, no API key, fully offline.

> **Note** **Honesty about Swift examples.** The runnable, current ones are [`ios-avatar`](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/ios-avatar) and [`macos-voice`](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/swift/macos-voice). The sibling `macos-avatar` and `essence-playback` examples target SDK surfaces that are still stabilizing on the `Bithuman` / AvatarUIKit rail — treat them as previews. A Flutter app exists in the `bithuman-apps` repo as a reference app, not a published code SDK.

## Web & other languages

- [REST — Hello, avatar](/examples/rest-hello) — zero-to-avatar with nothing but `curl`. Backends, CI, any non-SDK language.
- [rest-api](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/rest-api) — `curl` and Python scripts for every REST endpoint.
- [integrations/nextjs-ui](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/nextjs-ui) — a polished Next.js video-chat UI over LiveKit.
- [integrations/gradio-web](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/gradio-web) — talk to an avatar in the browser via Gradio + FastRTC.
- [integrations/java-websocket](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/java-websocket) — stream audio to an avatar server from Java over WebSocket.
- [integrations/offline-mac](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples/integrations/offline-mac) — fully offline macOS integration.

For the REST contract see the [API reference](/api/reference). For deployment shapes (LiveKit cloud, self-hosted GPU, embed widget) see the [Guides](/guides/deploy-livekit).
