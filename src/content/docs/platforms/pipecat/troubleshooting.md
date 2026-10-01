---
title: "Pipecat troubleshooting"
description: "Fix Pipecat avatar start, video and session errors by symptom."
section: platforms
group: "Pipecat"
order: 40
type: troubleshooting
llms: troubleshooting
---

| Symptom | Cause | Fix |
|---|---|---|
| `ValueError: BitHumanVideoService needs an avatar model` | no `model_path=` and no `BITHUMAN_MODEL_PATH` | pass `model_path="avatar.imx"` or `export BITHUMAN_MODEL_PATH=…` |
| `ErrorFrame`: *the bitHuman avatar could not start: ImportError: The bitHuman Python SDK is not installed* | `bithuman` is missing from this environment | activate the venv, then `pip install "pipecat-bithuman[expression-2]"` |
| `ErrorFrame`: *could not start: … api_secret is required* | no secret in the bot's environment | `export BITHUMAN_API_SECRET=…`, or pass `api_secret=` |
| `ErrorFrame`: *could not start: … that API secret was not accepted* | the secret was revoked or mistyped | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys) |
| `ErrorFrame`: *could not start: … API and SDK access starts at the Creator plan* | from 2026-10-12, a Free account | [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| `ErrorFrame`: *could not start: … this avatar needs one more package* with an Expression 2 file | the `expression-2` extra is missing | `pip install "pipecat-bithuman[expression-2]"` |
| The bot speaks but shows no video, after an `ErrorFrame` | the avatar failed, and TTS audio passes through by default | fix what the `ErrorFrame` names; `audio_passthrough_on_error=False` drops the voice too |
| No video and no `ErrorFrame` | video out is off in the transport | set `video_out_enabled=True` in the transport's params |
| The picture is resized or stretched | the transport's video size differs from the avatar's | set `video_out_width` and `video_out_height` to the size the service logs on the first frame |
| Log: *queued speech did not finish in … s; closing* | at `EndFrame` the service waits for the queued speech plus `stop_frame_timeout_s` and 1 s, at most `end_drain_timeout_s` (30 s by default), then closes the avatar | if the logged wait equals `end_drain_timeout_s`, raise it |
| Session time keeps running after the user leaves | the pipeline still runs, so the avatar stays open | cancel the pipeline when the participant leaves (`await worker.cancel()`), or end it with `EndFrame` |
| `404 NOT_FOUND` downloading a model | not your agent and not a sample avatar | check the code under [your agents](/api/agents) |

Errors from the Python SDK itself: [Python troubleshooting](/platforms/python/troubleshooting).
