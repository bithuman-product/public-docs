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
| With `render=local`, the frame says "This device can't render this avatar in real time" | no usable WebGPU adapter, or the device measured too slow | use `render=cloud` for that visitor; check `hasRealGPU()` first to choose the mode yourself ([Render with WebGPU](/platforms/web/webgpu)) |
| With `render=local`, the frame says "This avatar can only be rendered in the cloud" | an Expression 1 model | remove `render=local`, or add `model=` with another model the agent supports |
| With `render=local`, the frame says "This avatar can't be rendered in the browser" | the avatar has no browser build | remove `render=local` |
| With `render=local`, the frame says "In-browser rendering is turned off right now" | bitHuman has switched off in-tab rendering for this model | remove `render=local` |
| The iframe shows a browser error page | your page sends `Cross-Origin-Embedder-Policy` | remove that header from the page that holds the iframe |
| A blank frame | a service problem | check [status.bithuman.ai](https://status.bithuman.ai), then reload |
| Your own avatar shows `Embedding is disabled for this agent` | its Anonymous Share setting is off | turn Anonymous Share back on, or keep it off and pass an [embed token](/api/embedding) (`?token=`) |
