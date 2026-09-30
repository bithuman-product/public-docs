---
title: "Windows"
description: "Render Essence 2 and Expression 2 on a Windows 11 PC, with no GPU."
section: platforms
group: "Apps"
order: 10
type: platform
llms: platforms
searchTitle: "Windows: real-time avatars on a Windows PC, no GPU"
renders: ["server", "no-gpu"]
needs: ["API secret"]
artifacts: ["python"]
platforms: ["python"]
models: ["essence-2", "expression-2"]
claims: ["S2", "S3", "S4", "S7", "S10"]
next: ["/platforms/python", "/platforms/python/reference", "/deploy/cpu"]
---

The `bithuman` Python package: a file in and frames or an MP4 out, or a live stream in and frames out.

## Before you start

Both models run on the CPU alone, with no GPU and no WSL. The [CLI](/platforms/cli) on Windows runs cloud sessions and MCP.

| Detail | Expression 2 | Essence 2 |
|---|---|---|
| **Renders** | [any character from one portrait](/models/expression-2) | [a photoreal person from one portrait](/models/essence-2) |
| **Install** | `pip install "bithuman[expression-2]"` | included in the same install |
| **Frames** | RGB `numpy` arrays, `(height, width, 3)` `uint8` | the same |

| You need | Check |
|---|---|
| Windows 11 on x86_64 (64-bit Intel or AMD) | `python -c "import platform; print(platform.system(), platform.machine())"` prints `Windows AMD64` |
| 64-bit Python 3.10–3.14, from [python.org](https://www.python.org/downloads/windows/) or `winget install Python.Python.3.12` | `python --version` |
| An API secret | [Your API secret](/start/api-secret) |
| About 1 GB of disk (the package, 118–190 MB per avatar) | `Get-PSDrive C` |

The package carries the Microsoft C++ runtime it needs, so there is nothing else to install. It is tested on Windows 11; Windows on Arm has no package yet.

## Install

In PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install "bithuman[expression-2]"
```

The package installs no command-line tool.

## Authenticate

Set `BITHUMAN_API_SECRET` in the PowerShell window that runs Python (`bithuman.open` reads it), or pass `api_secret=` to `AsyncBithuman.create()`. See [Your API secret](/start/api-secret). Cost: active session time, to the second ([pricing](/pricing)). Downloading a sample avatar needs no account.

## First frame

```powershell
$env:BITHUMAN_API_SECRET = "<your API secret>"
curl.exe -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"
curl.exe -fsSLo speech.wav https://docs.bithuman.ai/samples/speech.wav
```

```python
import bithuman

with bithuman.open("wise-pup.imx") as avatar:
    frames = [image for image in avatar.render("speech.wav")]
print(len(frames), "frames of", frames[0].shape)
# → 300 frames of (720, 416, 3)
```

To write an MP4 instead, pass `out_mp4=` to the same `render`; it returns the number of frames written. On Windows the video is encoded with Windows' own H.264 encoder, so no `ffmpeg` install is needed.

```python
import bithuman
bithuman.open("wise-pup.imx").render("speech.wav", out_mp4="out.mp4")
```

## Integrate into your app

The Python API is the same on Windows as on macOS and Linux: `AsyncBithuman` takes audio as it arrives and yields frames and audio at the model's rate, `interrupt()` stops a reply, and the [LiveKit plugin](/platforms/livekit) renders the avatar inside a LiveKit Agents worker. The code and the calls are in [Python: Integrate into your app](/platforms/python/app#integrate-into-your-app).

## Platform notes

- The first Essence 2 render downloads a shared audio encoder (about 66 MB) to `%USERPROFILE%\.bithuman\deps`, once.
- `BITHUMAN_CACHE_DIR` moves the download cache from `%USERPROFILE%\.cache\bithuman`.
- `python -m bithuman render <AGENT_CODE> <audio>` downloads your own agent's model by code and renders it.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Activate.ps1 cannot be loaded because running scripts is disabled` | PowerShell's execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or run `.venv\Scripts\python.exe` directly |
| `pip` finds no wheel | 32-bit Python, Windows on Arm, or Python outside 3.10–3.14 | install 64-bit Python 3.10–3.14 on an x86_64 PC |
| `'curl' is not recognized` or a PowerShell `Invoke-WebRequest` error | `curl` in Windows PowerShell 5.1 is an alias | type `curl.exe`, as above |
| `NotSupported` opening an Expression 2 file | the extra is missing | `pip install "bithuman[expression-2]"` |
| `NotAuthorised` at `open`: *that key was not accepted (401)* | the secret was rejected | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys) |

## Reference

- [Python](/platforms/python) and the [Python API reference](/platforms/python/reference): every public class and function.
- [Changelog](/changelog) and [Downloads & versions](/downloads).
