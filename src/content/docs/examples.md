---
title: "Examples"
description: "Complete, runnable bitHuman apps for every platform: clone, set your API secret, run. Each page shows the example running."
section: examples
group: "Examples"
order: 0
type: hub
label: "All examples"
---

Every example is open source in [bithuman-examples](https://github.com/bithuman-product/bithuman-examples). Each page shows the app running, the few commands to run it yourself, and how to make it your own.

<div class="example-grid">
  <a class="example-card" href="/examples/cli"><img src="/examples/cli/hero.webp" alt="The wise-pup avatar rendered by the CLI" loading="lazy" width="416" height="720"><span><strong>CLI</strong>An MP4 or a live conversation from a terminal. macOS and Linux.</span></a>
  <a class="example-card" href="/examples/python"><img src="/examples/python/hero.webp" alt="An Essence 2 avatar in the Python quickstart window" loading="lazy" width="540" height="988"><span><strong>Python</strong>Open an avatar, play speech through it, watch it talk.</span></a>
  <a class="example-card" href="/examples/swift-ios-expression2"><span><strong>iOS</strong>A SwiftUI app with a talking Expression 2 avatar on iPhone.</span></a>
  <a class="example-card" href="/examples/kotlin-android-hello"><span><strong>Android</strong>A Kotlin app rendering Essence 2 or Expression 2 on the handset.</span></a>
  <a class="example-card" href="/sdk/web#first-frame"><span><strong>Web</strong>One iframe: a live avatar on any page.</span></a>
  <a class="example-card" href="/examples/rest-hello"><span><strong>REST</strong>Create an agent and make it talk with curl.</span></a>
</div>

## More examples

| Example | Platform | What it shows |
|---|---|---|
| [Voice conversation](/examples/ai-conversation) | Python | microphone in, avatar and OpenAI voice out |
| [iOS: Essence 2](/examples/swift-ios-essence2) | iOS | a full-resolution photoreal avatar on iPhone |
| [iOS: voice agent](/examples/swift-ios-voice-agent) | iOS | `bitHumanKit`, a complete on-device assistant |
| [`swift/macos-expression2`](https://github.com/bithuman-product/bithuman-examples/tree/main/swift/macos-expression2) | macOS | a WAV in, lip-synced frames out, with `swift run` |
| [`app/avatar_chat`](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) | Flutter (Android) | a voice conversation with idle and interruption |
| [`python/cloud-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) | Python + LiveKit | a cloud avatar in a LiveKit room, with a web UI |
| [`integrations/nextjs-ui`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) | Next.js | a video-chat UI over LiveKit |
| [`api/rest-api`](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api) | any language | curl and Python for every REST endpoint |

## Ready-made avatars

Sample avatars you can use with no account. The full list, with each avatar's model and agent code, is served as JSON at [`https://api.bithuman.ai/v1/models/showcase`](https://api.bithuman.ai/v1/models/showcase).

| Avatar | Model | Try it |
|---|---|---|
| `wise-pup` | Expression 2 | [talk to it in your browser](https://www.bithuman.ai/embed/A23WJF0199) · `bithuman run wise-pup` |
| `sofia-ramirez` | Essence 2 | [talk to it in your browser](https://www.bithuman.ai/embed/A52DHS2219) · `bithuman run sofia-ramirez` |

`bithuman list` prints every sample avatar, and `bithuman pull <slug>` downloads one.
