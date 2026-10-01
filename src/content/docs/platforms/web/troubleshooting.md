---
title: "Web troubleshooting"
description: "Fix embed and in-tab rendering problems by symptom."
section: platforms
group: "Web"
order: 40
type: troubleshooting
llms: troubleshooting
---

| Symptom | Cause | Fix |
|---|---|---|
| The microphone never activates | `allow` is missing `microphone *` | use `allow="microphone *"` |
| The frame shows `Agent not found` | the agent code is wrong | copy the code from the agent's Deploy & Share dialog |
| `render=local` reloads as `render=cloud` | no usable GPU (WebGPU), an Expression 1 model, or an Essence 2 avatar with no browser build | nothing to do; it is served from the cloud. Check `hasRealGPU()` first to choose the mode yourself |
| The iframe shows a browser error page | your page sends `Cross-Origin-Embedder-Policy` | remove that header from the page that holds the iframe |
| A blank frame | a service problem | check [status.bithuman.ai](https://status.bithuman.ai), then reload |
| Your own avatar shows `Embedding is disabled for this agent` | its Anonymous Share setting is off | turn Anonymous Share back on, or keep it off and pass an [embed token](/api/embedding) (`?token=`) |
