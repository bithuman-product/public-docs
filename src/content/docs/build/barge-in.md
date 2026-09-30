---
title: "Barge-in"
description: "Let users talk over the avatar and stop it mid-sentence."
section: build
group: "Conversations"
order: 12
type: guide
llms: build
next: ["/build/voice-agent", "/build/companion-app", "/platforms/livekit"]
---

Talk over the avatar and it stops mid-sentence, then listens: that is barge-in.

- **The CLI and the Python agent:** the voice model's turn detection hears you start talking and cancels its reply; LiveKit Agents then clears the avatar's buffered audio and frames, so the mouth stops with the voice. In the Python agent it is `interrupt_response=True` on the turn detection, shown in [Voice agent in Python](/build/voice-agent/python#with-python).
- **Your own loop in Python:** when your speech detection fires, call `interrupt()` on the runtime and clear any reply audio you still hold. `run()` carries on with idle frames. With OpenAI Realtime, the event to watch is `input_audio_buffer.speech_started`:

```python
# excerpt: barge-in, in the event loop of conversation.py
elif event.type == "input_audio_buffer.speech_started":
    # the user started talking: drop the rest of the reply
    runtime.interrupt()
```

- **On the device:** `interrupt()` in Swift and Flutter; `resetState(true)` for Expression 2 and `resetAudio()` for Essence 2 on Android ([Companion app](/build/companion-app#let-the-user-interrupt)).
- **A cloud avatar without the plugin:** perform the RPC `lk.clear_buffer` on the avatar ([Cloud avatar](/platforms/livekit/cloud-avatar)).

Barge-in does not change billing: a session bills active session time, talking or idle, to the second.
