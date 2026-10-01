---
title: "Python troubleshooting"
description: "Fix Python install, secret and rendering errors by symptom."
section: platforms
group: "Python"
order: 40
type: troubleshooting
llms: troubleshooting
---

| Symptom | Cause | Fix |
|---|---|---|
| `error: externally-managed-environment` | `pip` targeted the system Python | create and activate a venv |
| `ModuleNotFoundError: No module named 'bithuman'` | the venv is not active in this terminal | `source .venv/bin/activate` |
| `pip` finds no wheel | Intel Mac, Windows on Arm, musl, or Python outside 3.10–3.14 | use a supported platform ([Windows](/platforms/windows) needs 64-bit Python on x86_64) |
| `NotSupported` opening an Expression 2 file | the extra is missing | `pip install "bithuman[expression-2]"` |
| `NotAuthorised`: *no credential was supplied* (first frame) or *no API secret was found* (`open`) | no secret in this shell | `export BITHUMAN_API_SECRET=…`; nothing is rendered or written |
| `NotAuthorised` at `open`: *that API secret was not accepted* | the secret was rejected; from 2026-10-12, a Free account | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys); on Free, [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| An MP4 with sound and no picture | a refused render through the deprecated `render_offline` leaves the audio track | render with `bithuman.open(path).render(audio, out_mp4=...)`, which refuses before it writes anything; check the frame count it returns |
| Many `Removing initializer` warnings and short bracketed diagnostic lines during an Essence 2 render | runtime diagnostics | expected |
| Frames look blue | frames are RGB and your display wants BGR | `image[:, :, ::-1]` |
| Raw audio plays slow and long | decoded audio must be 16 kHz mono | pass a file path, or resample to 16 kHz |
| `404 NOT_FOUND` downloading a model | not your agent and not a sample avatar | check the code under [your agents](/api/agents) |
| The example window never opens (`GUI: NONE`) | the headless OpenCV build won the install | `pip install --force-reinstall --no-deps opencv-python` |
