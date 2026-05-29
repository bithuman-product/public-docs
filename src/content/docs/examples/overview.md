---
title: "Examples"
description: "Runnable bitHuman projects, grouped by what you're building. Every one is open-source — clone, set your API secret, run."
icon: "book-open"
---

Every project below is open-source under
[bithuman-sdk-public/Examples](https://github.com/bithuman-product/bithuman-sdk-public/tree/main/Examples).
Find the row that matches what you're building and start there.


New here? The fastest end-to-end demo is the
[CLI — Hello, avatar](/examples/cli-hello): one `brew install`, one
command, a talking avatar in your browser. No code, ~2 minutes.


## Start here — no code


  
    Install, `bithuman doctor`, `bithuman run`. Full demo, zero code.
  
  
    The smallest scripted path — credentials, a model, your first render.
  


## Backend & voice agents — Python

The streaming runtime and LiveKit voice agents. Each repo project ships
an `.env.example`, `requirements.txt`, and a `docker compose` stack.


  
    The minimal `AsyncBithuman` streaming loop, ~20 lines.
  
  
    OpenAI Realtime voice in, lip-synced avatar out. No server.
  
  
    Essence on bitHuman cloud + LiveKit + web UI. Start here for agents.
  
  
    Essence on your own CPU box. Includes a no-LiveKit `quickstart.py`.
  


## Native apps — Swift & Kotlin


  
    Minimal SwiftUI `bitHumanKit` integration, ~40 lines.
  
  
    Maven AAR + `Avatar.load` in a fresh Android Studio project.
  
  
    macOS Expression voice agent. Targets an unreleased renderer/sink bridge.
  
  
    Voice-only on-device agent — no avatar, no API key, fully offline.
  
  
    SwiftUI Essence playback. Targets an unreleased SDK API surface.
  
  
    One Dart codebase across macOS, iOS, and Android.
  


## Web & other languages


  
    A polished Next.js video-chat UI over LiveKit.
  
  
    Talk to an avatar in the browser via Gradio + FastRTC.
  
  
    Stream audio to an avatar server from Java over WebSocket.
  
  
    `curl` and Python scripts for every REST endpoint.
  


For deployment shapes (LiveKit cloud, self-hosted GPU, embed widget)
see [Deployment](/guides/deployment). For the REST contract see the
[API reference](/api-reference/overview).
