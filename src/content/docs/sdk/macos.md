---
title: "macOS"
description: "A talking avatar on an Apple Silicon Mac in three commands — install the CLI, pull a free showcase identity, run it. Expression 2 and Essence 2 render locally; the same Python library and Swift package run natively."
section: sdk
group: "Platforms"
order: 50
label: "macOS"
---

## Install

```bash
brew install ffmpeg                      # bithuman render writes the MP4 through ffmpeg
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"     # installs the current CLI release, named on /sdk/cli
```

One self-contained binary, sha256-verified against the release;
`brew install bithuman-product/bithuman/bithuman-cli` installs the same tarball.
The release it installs is named on the [CLI page](/sdk/cli#install).
**Apple Silicon only** — an Intel Mac has no binary and no Python wheel; use the
[web](/sdk/web) or the [cloud API](/api/overview).

## Get a model

Twenty showcase identities download with no account and no key:

```bash
bithuman avatars                         # slug, code, name, model, size
MODEL=$(bithuman pull marmalade)         # ~/.cache/bithuman/showcase/marmalade.imx
```

`$MODEL` is a local `.imx` under `~/.cache/bithuman/`. `bithuman run` with no
argument fetches the free Wise Pup avatar itself. Your own agent needs
`bithuman login` once, then `bithuman pull <YOUR_AGENT_CODE>` (`--model
essence-2` picks a family).

## Minimal code

```bash
bithuman run "$MODEL"                    # live at http://127.0.0.1:8088/
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

`render` is a billed offline render and refuses without a credential. A
showcase download is free; a session on your own agent is metered —
[pricing](/guides/pricing) is the authority.

## Performance

Measured frame rates for every platform are on the
[performance page](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the installer names your platform and stops | Intel Mac — no binary has ever been built ([exact output](/sdk/cli/reference#platforms-with-no-binary)) | [web](/sdk/web) or the [cloud API](/api/overview) |
| `bithuman: command not found` after the install | `~/.local/bin` is not on your `PATH` | `export PATH="$HOME/.local/bin:$PATH"` — the installer prints the same line |
| `pull <CODE>` refuses without a sign-in | your own agent code, no sign-in (a showcase slug never needs one) | `bithuman login`, then pull again |
| `render` refuses with `NOT_SIGNED_IN`, no output file | no credential | `bithuman login`, or `export BITHUMAN_API_SECRET=…` |
| `Error: No available formula` | the tap is not known to Homebrew yet | `brew tap bithuman-product/bithuman`, then install again |
| `No matching distribution found for bithuman` | macOS older than 14, or an Intel Mac | upgrade macOS, or use an Apple Silicon Mac |
