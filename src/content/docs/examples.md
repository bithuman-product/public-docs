---
title: "Examples"
description: "Runnable bitHuman projects, one row per platform — every one is open source. Clone, set your API secret, run."
section: examples
group: "Examples"
order: 1
---

Every project is open source in
[bithuman-product/bithuman-examples](https://github.com/bithuman-product/bithuman-examples/tree/main).
The pages below print a whole project; the repository links are projects you
clone.

## Start here

| If you want… | Start with | Time |
|---|---|---|
| A talking avatar with no code | [CLI](/sdk/cli) | ~2 min |
| The smallest loop in code | [Python quickstart](/sdk/python#quickstart-the-whole-thing-in-one-block) | ~5 min |
| The platform from any language | [REST — Hello, avatar](/examples/rest-hello) | ~5 min |
| An avatar in an Android app | [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) | ~15 min |
| An avatar on the iPhone you have | [Swift / iOS — Expression 2](/examples/swift-ios-expression2) | ~25 min |
| A full-resolution Essence 2 avatar on an iPhone | [Swift / iOS — Essence 2](/examples/swift-ios-essence2) | ~30 min |
| A voice conversation, mic in, avatar out | [AI voice chat](/examples/ai-conversation) | ~10 min |

## By platform

**Python**

- [AI voice chat](/examples/ai-conversation) — OpenAI Realtime voice in, lip-synced avatar out.
- [`python/quickstart`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/quickstart) — an API key, a model, a first render.
- [`python/local-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/local-essence) — Essence on your own CPU, with a microphone script and a web UI.
- [`python/cloud-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) — Essence on bitHuman cloud with LiveKit and a browser UI.

**Apple — iOS and macOS**

- [Swift / iOS — Expression 2](/examples/swift-ios-expression2) — a complete SwiftUI app; a published identity renders with no account, key or credits.
- [Swift / iOS — Essence 2](/examples/swift-ios-essence2) — the same shape for the full-resolution engine (iOS 26).
- [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) — `bitHumanKit`, the whole on-device voice agent (iPhone 16 Pro or later, two Apple entitlements).
- [`swift/macos-expression2`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-expression2) — one file on a Mac: a WAV in, lip-synced frames out, no account.
- [`swift/macos-voice`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — a voice-only on-device agent with no avatar.

**Android**

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — a complete project, every file in full. Expression 2 needs no key; the Essence 2 half of the page needs your API secret.

**Web and other languages**

- [REST — Hello, avatar](/examples/rest-hello) — create and drive an agent with `curl`.
- [`api/rest-api`](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api) — `curl` and Python scripts for every REST endpoint.
- [`integrations/nextjs-ui`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) — a Next.js video-chat UI over LiveKit.
- [`integrations/gradio-web`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web) — an avatar in the browser via Gradio + FastRTC.
- [`integrations/java-websocket`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/java-websocket) — stream audio to an avatar server from Java.

For the REST contract see the [API reference](/api/reference); for deployment
shapes see [Guides](/guides).
