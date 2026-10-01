---
title: "Build a Pipecat bot"
description: "Fit BitHumanVideoService into your Pipecat pipeline, transport and error handling."
section: platforms
group: "Pipecat"
order: 30
type: platform-app
llms: platforms
claims: ["S3", "S4"]
next: ["/platforms/pipecat/troubleshooting", "/platforms/pipecat"]
---

## Integrate into your app

- **Where it goes.** After the TTS service, or a speech-to-speech LLM, and before `transport.output()`.
- **The transport.** Turn on video out with `video_out_enabled=True`. The service logs the avatar's frame size on the first frame; set `video_out_width` and `video_out_height` to it to avoid resizing.
- **Voice and picture together.** The service does not forward your TTS audio. It pushes the avatar's copy of the speech, paired with each picture. Each image carries `sync_with_audio`, so keep the transport's `video_out_is_live` off (its default).
- **Barge-in.** On `InterruptionFrame` the avatar drops the reply in flight and goes back to idle. See [Barge-in](/build/barge-in).
- **The end of a reply.** `TTSStoppedFrame` is held until the avatar has finished speaking the reply.
- **Session time.** The avatar opens on `StartFrame` and closes on `EndFrame`, `CancelFrame` or cleanup; it is billed while open, talking or idle. End the pipeline when the user leaves, as the example below does.
- **When the avatar fails.** The service pushes one `ErrorFrame` upstream and, by default, passes TTS audio through unchanged, so the bot keeps talking without video. `audio_passthrough_on_error=False` drops the audio instead.
- **Metrics.** With `enable_metrics=True` in `PipelineParams`, the service reports TTFB: from a reply's first audio in to its first voiced avatar frame out.

### What the service does with frames

| In | Out |
|---|---|
| `TTSAudioRawFrame` | sent to the avatar, not forwarded as is |
| (avatar frame) | `OutputImageRawFrame` (RGB), while talking and while idle |
| (avatar audio) | `TTSAudioRawFrame` (16 kHz mono), paired with each picture |
| `TTSStoppedFrame` | held until the avatar has finished speaking the reply |
| `InterruptionFrame` | the avatar drops the reply in flight and goes back to idle |
| anything else | passed on unchanged |

## Complete example

`examples/bot.py` in [pipecat-bithuman](https://github.com/bithuman-product/pipecat-bithuman) is a complete voice bot in a Daily room, with Deepgram speech-to-text, an OpenAI LLM and Cartesia TTS. The avatar sits between the TTS and the output transport:

```python
# excerpt: the transport and the pipeline, from pipecat-bithuman's examples/bot.py
transport = DailyTransport(
    os.environ["DAILY_ROOM_URL"],
    None,
    "Pip",
    DailyParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        video_out_enabled=True,
        video_out_width=416,   # the wise-pup sample's frame size; the service logs yours
        video_out_height=720,
    ),
)
# …
avatar = BitHumanVideoService()  # BITHUMAN_MODEL_PATH + BITHUMAN_API_SECRET
# …
pipeline = Pipeline(
    [
        transport.input(),
        stt,
        aggregators.user(),
        llm,
        tts,
        avatar,
        transport.output(),
        aggregators.assistant(),
    ]
)
# …
@transport.event_handler("on_participant_left")
async def on_left(transport, participant, reason):
    await worker.cancel()  # close the avatar: session time stops
```

Run it from the repository, with the avatar file from [Pipecat](/platforms/pipecat#first-frame). `examples/bot.py` sets the transport to the `wise-pup` frame size, 416×720; for another avatar, use the size the service logs on the first frame:

```bash
pip install "pipecat-bithuman[expression-2]" "pipecat-ai[daily,deepgram,openai,cartesia,silero]"
export BITHUMAN_API_SECRET="<your API secret>" BITHUMAN_MODEL_PATH=wise-pup.imx
export DAILY_ROOM_URL=… DEEPGRAM_API_KEY=… OPENAI_API_KEY=… CARTESIA_API_KEY=… CARTESIA_VOICE_ID=…
python examples/bot.py
# → join the Daily room; the avatar says hello first, then answers
```

## Platform notes

- Requires Python 3.11–3.14 and `pipecat-ai` 1.12.0 or newer.
- Your own avatar: [download an agent's model](/api/agents#download-an-agents-model) and pass the `.imx` file as `model_path=`.
- The service has no settings to change at runtime. The avatar is chosen when the service is built.
- For tests, or to wrap the SDK, pass `runtime_factory=`: an async callable that returns an object implementing `BitHumanRuntime`. The package's own tests run on fakes, with no network, secret or model file.
- Report bugs in the [pipecat-bithuman issues](https://github.com/bithuman-product/pipecat-bithuman/issues). The Pipecat team does not maintain this package.

## Reference

### `BitHumanVideoService` options

| Argument | Default | Meaning |
|---|---|---|
| `model_path` | `BITHUMAN_MODEL_PATH` | the `.imx` avatar file |
| `api_secret` | `BITHUMAN_API_SECRET` | the API secret, read by the SDK when not passed |
| `sync_video_to_audio` | `True` | sets `sync_with_audio` on each image |
| `audio_passthrough_on_error` | `True` | keep the voice if the avatar fails |
| `stop_frame_timeout_s` | `2.0` | release a held `TTSStoppedFrame` after this much quiet |
| `end_drain_timeout_s` | `30.0` | the longest wait on `EndFrame` for queued speech |
| `runtime_factory` | the SDK | advanced: your own `BitHumanRuntime` |

Properties: `is_avatar_ready` (the avatar is open and rendering) and `frame_size` (`(width, height)` of the first frame, or `None` before it).

### How it maps to the Python SDK

| Pipecat | `bithuman.AsyncBithuman` |
|---|---|
| `StartFrame` | `AsyncBithuman.create(model_path=..., api_secret=...)`, then `run()` |
| `TTSAudioRawFrame` | `push_audio(pcm, sample_rate, last_chunk=False)` |
| `TTSStoppedFrame` | `flush()` |
| `InterruptionFrame` | `interrupt()` |
| `EndFrame`, `CancelFrame`, cleanup | `shutdown()` |

The SDK side of each call: [Python reference](/platforms/python/reference).
