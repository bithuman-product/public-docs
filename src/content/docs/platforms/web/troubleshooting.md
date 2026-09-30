---
title: "Web troubleshooting"
description: "Fix embed and in-tab rendering problems by symptom."
section: platforms
group: "Web"
order: 40
type: troubleshooting
llms: build
---

| Symptom | Cause | Fix |
|---|---|---|
| The microphone never activates | `allow` is missing `microphone *` | use `allow="microphone *"` |
| `404` | the agent code is wrong, or the agent is private | check the code; mint an [embed token](/api/embedding) for a private agent |
| `render=local` reloads as `render=cloud` | no usable GPU (WebGPU) in this browser, or this Essence 2 avatar has no browser build | nothing to do; it is served from the cloud. Check `hasRealGPU()` first to choose the mode yourself |
| The iframe shows a browser error page | your page sends `Cross-Origin-Embedder-Policy` | remove that header from the page that holds the iframe |
| A blank frame | a service problem | check [status.bithuman.ai](https://status.bithuman.ai), then reload |
| Your own avatar shows `Embedding is disabled for this agent` | its Anonymous Share setting is off | turn Anonymous Share back on in the agent's sharing settings |
