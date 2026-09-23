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
  <a class="example-card" href="/examples/web"><img src="/examples/web/hero.webp" alt="The wise-pup avatar answering in a web page" fetchpriority="high" width="460" height="760"><span><strong>Web</strong>One iframe: a live avatar that listens and answers, on any page.</span></a>
  <a class="example-card" href="/examples/cli"><img src="/examples/cli/hero.webp" alt="The wise-pup avatar rendered by the CLI" loading="lazy" width="416" height="720"><span><strong>CLI</strong>An MP4 or a live conversation from a terminal. macOS and Linux.</span></a>
  <a class="example-card" href="/examples/python"><img src="/examples/python/hero.webp" alt="An Essence 2 avatar in the Python quickstart window" loading="lazy" width="540" height="988"><span><strong>Python</strong>Open an avatar, play speech through it, watch it talk.</span></a>
  <a class="example-card" href="/examples/swift-ios-expression2"><img src="/examples/ios/hero.webp" alt="The wise-pup avatar drawn by the iOS example on an iPhone" loading="lazy" width="416" height="720"><span><strong>iOS</strong>A SwiftUI app with a talking Expression 2 avatar, rendered on the iPhone.</span></a>
  <a class="example-card" href="/examples/macos-expression2"><img src="/examples/macos/hero.webp" alt="The wise-pup avatar rendered by the macOS example" loading="lazy" width="416" height="720"><span><strong>macOS</strong>One Swift file: speech in, lip-synced frames out, on your Mac.</span></a>
  <a class="example-card" href="/examples/android-expression2"><img src="/examples/android/expression2.webp" alt="The wise-pup avatar in the Android example on a Galaxy S25+" loading="lazy" width="540" height="1005"><span><strong>Android: Expression 2</strong>A Kotlin app rendering any character on the phone.</span></a>
  <a class="example-card" href="/examples/android-essence2"><img src="/examples/android/essence2.webp" alt="The sofia-ramirez avatar in the Android example on a Galaxy S25+" loading="lazy" width="540" height="1005"><span><strong>Android: Essence 2</strong>A photoreal person at 1080×1920, rendered on the phone.</span></a>
  <a class="example-card" href="/examples/rest-hello"><span><strong>REST</strong>Create an agent and make it talk with curl.</span></a>
</div>

## More examples

| Example | Platform | What it shows |
|---|---|---|
| [Voice conversation](/examples/ai-conversation) | Python | microphone in, avatar and OpenAI voice out |
| [iOS: Essence 2](/examples/swift-ios-essence2) | iOS | a full-resolution photoreal avatar on iPhone |
| [iOS: voice agent](/examples/swift-ios-voice-agent) | iOS | `bitHumanKit`, a complete on-device assistant |
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
