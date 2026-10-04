---
title: "CLI troubleshooting"
description: "Fix CLI install, sign-in and render errors by symptom."
section: platforms
group: "CLI"
order: 40
type: troubleshooting
llms: troubleshooting
---

| Symptom | Cause | Fix |
|---|---|---|
| `bithuman: command not found` | `~/.local/bin` is not on `PATH` | `export PATH="$HOME/.local/bin:$PATH"` |
| `not signed in`, exit 77, nothing written | no credential | `bithuman login`, or set `BITHUMAN_API_SECRET` |
| `your credential is invalid or expired` or `the API secret was rejected`, exit 77 | the secret was revoked or mistyped; from 2026-10-12, a Free account | `bithuman login` again, or create a new API secret; on Free, [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| `bithuman login` prints `token exchange failed` or times out, exit 1 | the browser or device approval did not complete | run `bithuman login` (or `--device`) again |
| `render` exits 69: `ffmpeg not found` | `ffmpeg` is not on `PATH` (common in scripts) | install it, or set `BITHUMAN_FFMPEG` to its path |
| `run` with an Essence 2 avatar: no avatar in the page, and the terminal shows `essence-2: ffmpeg not found` | `ffmpeg` is not on `PATH` | `sudo apt install -y ffmpeg`, or set `BITHUMAN_FFMPEG` |
| `run` says the `livekit-server` binary was not found | `livekit-server` is not installed | `brew install livekit` (macOS), or rerun the installer (Linux) |
| `run` exits 69: `livekit-server 1.8.0 at …/livekit-server is too old for `bithuman run` (it needs 1.13 or newer)` | an old `livekit-server` found on `PATH` | `brew upgrade livekit` (macOS), or reinstall with `curl -fsSL https://install.bithuman.ai \| sh` (Linux) |
| `SLUG_NOT_FOUND`, exit 66 | the slug is not in the sample list | `bithuman list` and copy a slug |
| `pull <CODE>` fails with `404 NOT_FOUND` | not your agent and not a sample avatar | check the code under [your agents](/api/agents) |
| `pull <CODE>` fails with `409 MODEL_NOT_GENERATED` | the agent has no model of that kind | [add the model](/api/agents#add-a-model-to-an-existing-agent), or pass the `--model` it has |
| `PUBLIC_BIND_REFUSED`, exit 2 | `--host 0.0.0.0` without consent | use a LAN address, or set `BITHUMAN_ALLOW_PUBLIC_BIND=1` |
| the installer says `The tarball for … may not be published` | the download server is rate-limiting your network (HTTP 429) | wait five minutes and run it again |
| `bithuman doctor` exits 1 on a fresh install: `Agent worker ✗ not found` | the first `bithuman run` sets up the worker | run `bithuman run` once |
| many `Removing initializer` warnings and short bracketed diagnostic lines during an Essence 2 render | runtime diagnostics | expected |
| the installer names your platform and stops | no binary for this platform | see Platform notes |
