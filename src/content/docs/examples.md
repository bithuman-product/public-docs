---
title: "Example gallery"
description: "Complete, runnable bitHuman apps for every platform: clone, set your API secret, run. Each page shows the example running."
section: build
group: "Examples"
order: 0
type: hub
---

Every example is open source in [bithuman-examples](https://github.com/bithuman-product/bithuman-examples). Each page shows the app running, the few commands to run it yourself, and how to make it your own.

<ul class="card-grid cols-3 gallery" role="list">
  <li><a class="card card-media" href="/platforms/web#complete-example"><span class="card-figure"><img src="/examples/web/hero.webp" alt="The wise-pup avatar answering in a web page" width="460" height="760"></span><span class="card-body"><span class="card-title"><strong>Web</strong></span><span class="card-line">One iframe: a live avatar that listens and answers, on any page.</span></span></a></li>
  <li><a class="card card-media" href="/platforms/cli#complete-example"><span class="card-figure"><img src="/examples/cli/hero.webp" alt="The wise-pup avatar rendered by the CLI" loading="lazy" width="416" height="720"></span><span class="card-body"><span class="card-title"><strong>CLI</strong></span><span class="card-line">An MP4 or a live conversation from a terminal. macOS and Linux.</span></span></a></li>
  <li><a class="card card-media" href="/platforms/python#complete-example"><span class="card-figure"><img src="/examples/python/hero.webp" alt="An Essence 2 avatar in the Python quickstart window" loading="lazy" width="540" height="988"></span><span class="card-body"><span class="card-title"><strong>Python</strong></span><span class="card-line">Open an avatar, play speech through it, watch it talk.</span></span></a></li>
  <li><a class="card card-media" href="/examples/ios-expression-2"><span class="card-figure"><img src="/examples/ios/hero.webp" alt="The wise-pup avatar drawn by the iOS example on an iPhone" loading="lazy" width="416" height="720"></span><span class="card-body"><span class="card-title"><strong>iOS</strong></span><span class="card-line">A SwiftUI app with a talking Expression 2 avatar, rendered on the iPhone.</span></span></a></li>
  <li><a class="card card-media" href="/examples/macos-expression-2"><span class="card-figure"><img src="/examples/macos/hero.webp" alt="The wise-pup avatar rendered by the macOS example" loading="lazy" width="416" height="720"></span><span class="card-body"><span class="card-title"><strong>macOS</strong></span><span class="card-line">One Swift file: speech in, lip-synced frames out, on your Mac.</span></span></a></li>
  <li><a class="card card-media" href="/examples/android-expression-2"><span class="card-figure"><img src="/examples/android/expression2.webp" alt="The wise-pup avatar in the Android example on a Galaxy S25+" loading="lazy" width="540" height="1005"></span><span class="card-body"><span class="card-title"><strong>Android: Expression 2</strong></span><span class="card-line">A Kotlin app rendering any character on the phone.</span></span></a></li>
  <li><a class="card card-media" href="/examples/android-essence-2"><span class="card-figure"><img src="/examples/android/essence2.webp" alt="The sofia-ramirez avatar in the Android example on a Galaxy S25+" loading="lazy" width="540" height="1005"></span><span class="card-body"><span class="card-title"><strong>Android: Essence 2</strong></span><span class="card-line">A photoreal person at 1080×1920, rendered on the phone.</span></span></a></li>
  <li><a class="card card-link" href="/platforms/rest#complete-example"><span class="card-body"><span class="card-title"><strong>REST</strong></span><span class="card-line">Create an agent and make it talk with curl.</span></span></a></li>
</ul>

## More examples

| Example | Platform | What it shows |
|---|---|---|
| [Voice conversation](/build/voice-agent#python-voice-conversation) | Python | microphone in, avatar and OpenAI voice out |
| [iOS: Essence 2](/examples/ios-essence-2) | iOS | a full-resolution photoreal avatar on iPhone |
| [`app/avatar_chat`](https://github.com/bithuman-product/bithuman-examples/tree/main/app/avatar_chat) | Flutter (Android) | a voice conversation with idle and interruption |
| [`python/self-host`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/self-host) | Python + LiveKit | your own LiveKit server, OpenAI Realtime, the avatar rendered on your machine ([guide](/build/voice-agent)) |
| [`python/cloud-essence`](https://github.com/bithuman-product/bithuman-examples/tree/main/python/cloud-essence) | Python + LiveKit | a cloud avatar in a LiveKit room, with a web UI |
| [`integrations/nextjs-ui`](https://github.com/bithuman-product/bithuman-examples/tree/main/integrations/nextjs-ui) | Next.js | a video-chat UI over LiveKit |
| [`api/rest-api`](https://github.com/bithuman-product/bithuman-examples/tree/main/api/rest-api) | any language | curl and Python for every REST endpoint |

## Ready-made avatars

Sample avatars you can open in a browser with no account. The CLI needs `bithuman login` and bills your credits. The full list, with each avatar's model and agent code, is served as JSON at [`https://api.bithuman.ai/v1/models/showcase`](https://api.bithuman.ai/v1/models/showcase).

| Avatar | Model | Try it |
|---|---|---|
| `wise-pup` | Expression 2 | [talk to it in your browser](https://www.bithuman.ai/embed/A23WJF0199) · `bithuman login && bithuman run wise-pup` |
| `sofia-ramirez` | Essence 2 | [talk to it in your browser](https://www.bithuman.ai/embed/A52DHS2219) · `bithuman login && bithuman run sofia-ramirez` |

`bithuman list` prints every sample avatar, and `bithuman pull <slug>` downloads one (no account needed).
