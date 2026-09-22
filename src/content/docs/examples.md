---
title: "Examples"
description: "Runnable bitHuman projects grouped by what you're building — every one is open-source. Clone, set your API secret, run."
section: examples
group: "Examples"
order: 1
---

## Pick your path

Every project below is open-source under [bithuman-product/bithuman-examples](https://github.com/bithuman-product/bithuman-examples/tree/main). Each tutorial page follows the same shape: **Prerequisites → Run it → What you'll see → Full code → Next steps**. Find your row and start there.

> **Every Swift example in that repository builds from a clone, as of
> 2026-09-22.** It used not to: seven of its ten Swift packages failed
> `swift build` against the published package — one could not even resolve,
> because it named a path outside the repository. Those have been removed and
> the repository's own gate no longer carries an allowlist.

| If you want to… | Start with | Language | Time |
|---|---|---|---|
| Try a talking avatar end-to-end, no code | [CLI — Hello, avatar](/sdk/cli) | CLI | ~2 min |
| The smallest streaming loop in code | [Python — Hello, avatar](/sdk/python) | Python | ~5 min |
| Call the platform from any language | [REST — Hello, avatar](/examples/rest-hello) | `curl` | ~5 min |
| A talking avatar on the iPhone you already own | [Swift / iOS — expression-2 on-device](/examples/swift-ios-expression2) | SwiftUI | ~25 min. **No account, no key, no credits** — it renders the free-gallery identity `A23WJF0199` (Wise Pup) |
| A talking voice assistant on a Mac/iPad/iPhone **16 Pro or later** | [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) | SwiftUI | ~15 min + Apple's 1–3 day entitlement wait |
| An on-device avatar in an Android app | [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) | Kotlin | ~15 min. Expression 2 needs no key; the Essence 2 project on the same page needs one |
| A full-resolution Essence 2 avatar on an iPhone | [Swift / iOS — Essence 2 on-device](/examples/swift-ios-essence2) | SwiftUI | ~30 min. Needs **iOS 26**; the download is anonymous |
| Full voice conversation, mic in / avatar out | [AI voice chat](/examples/ai-conversation) | Python | ~10 min |
| Know whether the browser path will work before you ship it | [Browser — check before you ship](/examples/browser-webgpu-check) | bash / JS | ~5 min |
| Know whether the Apple package will resolve before you open Xcode | [Apple — check before you ship](/examples/apple-swiftpm-check) | bash | ~5 min |

> **Note** New here? The fastest end-to-end demo is the [CLI — Hello, avatar](/sdk/cli): one `brew install`, one command, a talking avatar in your browser. No code.

## No-code & smallest scripts

- [CLI — Hello, avatar](/sdk/cli) — install, `bithuman doctor`, `bithuman run`. Full demo, zero code.
- [quickstart project](https://github.com/bithuman-product/bithuman-examples/tree/main/python/quickstart) — the smallest scripted path: API key, a model, your first render. Auto-downloads a sample avatar on first run.

## Backend & voice agents — Python

The streaming runtime and LiveKit voice agents. Each repo project ships an `.env.example`, `requirements.txt`, and a `docker compose` stack.

- [Python — Hello, avatar](/sdk/python) — the minimal `bithuman.open()` / `render()` loop, a few lines.
- [AI voice chat](/examples/ai-conversation) — OpenAI Realtime voice in, lip-synced avatar out. No server.
- [python/local-essence](https://github.com/bithuman-product/bithuman-examples/tree/main/python/local-essence) — Essence on your own CPU box. Ships `quickstart.py`, `microphone.py`, `conversation.py`, plus a web UI at `http://localhost:4202`.
- [python/cloud-essence](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) — Essence on bitHuman cloud + LiveKit + browser UI. Start here for production agents.

## Native apps — Swift

- [Swift / iOS — expression-2 on-device](/examples/swift-ios-expression2) — **start here for a frame on a phone.** No device floor, no Apple entitlement, no 1.6 GB download: measured 2026-09-09 it rendered 416x720 frames on an iPhone 15. Every file is on the page.
  **No account, no key, no credits, no wait.** The Apple rail has a keyless identity: `A23WJF0199` (Wise Pup), a bitHuman-owned agent in the **free gallery** — the download endpoint serves every gallery identity to anyone, so the same URL covers the showcase face and your own agent and only the credential differs. `setup.sh` fetches the identity, the shared engine graphs and a 16 kHz WAV with **no credential in the environment at all** — the same shape the Android example has always had. Want *your own* face on the phone instead? That is still an `expression-2` creation: **about 2–2.5 hours** and **2000 credits** ([creation times](/api/agents#model-specific-inputs-and-creation-times), [pricing](/guides/pricing)).
- [swift/ios-expression2](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-expression2) — the same app as a repository you can clone, with a `setup.sh` that fetches your model.
- [Swift / iOS — Essence 2 on-device](/examples/swift-ios-essence2) — the same shape, for the full-resolution engine: a complete SwiftUI app, every file printed, that renders an Essence 2 identity entirely on the phone. The identity and the engine resources both download **with no credential**. Costs you **iOS 26** and a separate resources archive, and the two engine products cannot be attached to one app.
- [Swift / iOS — Hello, avatar](/examples/swift-ios-hello) — SwiftUI avatar on the `bitHumanKit` package. The richest path (on-device STT + LLM + TTS) and the most demanding: iPhone 16 Pro or later, plus two Apple-approved entitlements.
- [swift/ios-avatar](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/ios-avatar) — complete runnable SwiftUI iOS reference app (hardware gate + entitlements).
- [swift/macos-expression2](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-expression2) — **the Mac answer**: one file, a WAV in and lip-synced frames out, no account and no key. Measured 2026-09-22 on an M4 Max: 407 frames at 416x720 in 13.02 s.
- [swift/macos-voice](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-voice) — voice-only on-device agent: no avatar, no API key, fully offline.

## Native apps — Kotlin / Android

- [Kotlin / Android — Hello, avatar](/examples/kotlin-android-hello) — a complete Android project, every file in full, that renders a talking avatar on a physical phone from a 16 kHz WAV. The Expression 2 project needs **no API key, no account and no agent of your own** — it renders a published identity that the model store's mirror serves anonymously, so this is the shortest path on the site from nothing to a frame on a handset. The Essence 2 project in the second half of the same page renders a full-resolution picture and **does** need your `api-secret` to fetch the identity. See the [Android SDK](/sdk/android) for the full API surface.

## Web & other languages

- [REST — Hello, avatar](/examples/rest-hello) — zero-to-avatar with nothing but `curl`. Backends, CI, any non-SDK language.
- [rest-api](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api) — `curl` and Python scripts for every REST endpoint.
- [integrations/nextjs-ui](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) — a polished Next.js video-chat UI over LiveKit.
- [integrations/gradio-web](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/gradio-web) — talk to an avatar in the browser via Gradio + FastRTC.
- [integrations/java-websocket](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/java-websocket) — stream audio to an avatar server from Java over WebSocket.
- [integrations/offline-mac](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/offline-mac) — fully offline macOS integration.

## Preflight & validation

Not "hello, avatar" pages — checks you run *before* shipping, each with a
deliberately broken control arm so you can tell a working setup from a silently
failing one. Every transcript on both pages was produced by running the snippet.

- [Browser — check before you ship](/examples/browser-webgpu-check) — a probe for whether a browser has a usable GPU, and a check that the runtime files you serve are the ones we published.
- [Apple — check before you ship](/examples/apple-swiftpm-check) — SwiftPM resolve preflight against the pinned checksums, which `bithuman` wheel pip picks on a Mac, and what is actually inside the shipped `Expression2` binary. Runs from any OS.
- [Failure states on a phone](/examples/failure-states) — what the on-device SDKs throw when the network is gone, a download is interrupted, a model is corrupt or a key is rejected, with the handling each state needs.

For the REST contract see the [API reference](/api/reference). For deployment shapes (LiveKit cloud, self-hosted GPU, embed widget) see the [Guides](/guides/deploy-livekit).
