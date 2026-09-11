---
title: "macOS"
description: "A talking avatar on an Apple Silicon Mac in three commands — install the CLI, pull a free showcase identity, run it. Expression 2 and Essence 2 render locally through CoreML; the same Python library and Swift package run natively."
section: sdk
group: "Platforms"
order: 50
label: "macOS"
---

## Install

```bash
brew install ffmpeg                      # bithuman render writes the MP4 through ffmpeg
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"     # installs bithuman 2.6.7 (libessence 3.1.3 ABI 7)
```

One self-contained binary, sha256-verified against the release;
`brew install bithuman-product/bithuman/bithuman-cli` installs the same tarball.
**Apple Silicon only** — an Intel Mac has no binary and no Python wheel; use the
[web](/sdk/web) or the [cloud API](/api/overview).

## Get a model

Twenty showcase identities download with no account and no key — 4 Essence 2
(photoreal human), 16 Expression 2 (stylized or animal):

```bash
bithuman list --manifest https://api.bithuman.ai/v1/models/showcase                        # slug, model, size
MODEL=$(bithuman pull marmalade --manifest https://api.bithuman.ai/v1/models/showcase)      # Expression 2
MODEL=$(bithuman pull afro-latina-astrophysics-mentor --manifest https://api.bithuman.ai/v1/models/showcase)   # Essence 2
```

`$MODEL` is a local `.imx` under `~/.cache/bithuman/`. `bithuman run` with no
argument fetches the free Wise Pup avatar itself. Your own agent needs
`bithuman login` once, then `bithuman pull <YOUR_AGENT_CODE>` (`--model
essence-2` picks a family).

## Minimal code

```bash
bithuman run "$MODEL"                    # live at http://127.0.0.1:8088/ — CoreML, Neural Engine
```

From **Python**, `pip install "bithuman[expression-2]"` (macOS 14 or newer,
arm64) — everything after the install is on the [Python page](/sdk/python).
From **Swift**, the `Expression2` product of the package on the
[iOS page](/sdk/ios) builds for `macos-arm64` too.

## Run

Open `http://127.0.0.1:8088/`, grant the microphone, talk. Without a sign-in
the avatar renders but does not answer; `bithuman login` adds the conversation
brain. To render a clip to a file instead:

```bash
bithuman login                                              # once; a free account is enough
bithuman render "$MODEL" -a speech.wav -o clip.mp4          # 16 kHz mono WAV in, MP4 out
```

`render` refuses with exit 77 without a credential. A showcase identity
measured 0 credits for every download and render on 2026-09-10; a session on
your own agent is metered — [pricing](/guides/pricing) is the authority.

## Performance

Unpaced (as fast as the engine renders, not paced to playback), from the
published CLI 2.6.5 on an Apple M4:

| Model | fps (unpaced) | Measured |
|---|---:|---|
| Expression 2 | **54** | 2026-09-10 — steady state over 32-frame chunks, 54–69; a whole 16 s clip including CoreML model load renders at 31 |
| Essence 2 | **2** | 2026-09-11 — an offline `render` of 408 frames at 1920×1080 from a 16 s clip, 8 threads |

Playback is 20 fps for Expression 2 and 25 fps for Essence 2. Every platform
side by side: [Performance](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the installer names your platform and exits 1 | Intel Mac — no binary has ever been built ([exact output](/sdk/cli/reference#platforms-with-no-binary)) | [web](/sdk/web) or the [cloud API](/api/overview) |
| `bithuman: command not found` after the install | `~/.local/bin` is not on your `PATH` | `export PATH="$HOME/.local/bin:$PATH"` — the installer prints the same line |
| `pull` exits 66: `--model applies to YOUR agent codes … not to the showcase slug` | on 2.6.5 a showcase identity is pulled by slug with `--manifest`, not by CODE with `--model` | the `pull` lines above |
| `pull <CODE>` exits 77 | your own agent code, no sign-in (a showcase slug never needs one) | `bithuman login`, then pull again |
| `render` exits 77, no output file | no credential | `bithuman login`, or `export BITHUMAN_API_SECRET=…` |
| `Error: No available formula` | the tap is not known to Homebrew yet | `brew tap bithuman-product/bithuman`, then install again |
| `No matching distribution found for bithuman` | macOS older than 14, or an Intel Mac | upgrade macOS, or use an Apple Silicon Mac |
