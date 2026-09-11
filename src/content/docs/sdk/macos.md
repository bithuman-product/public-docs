---
title: "macOS"
description: "A talking avatar on an Apple Silicon Mac: the CLI renders Expression 2 and Essence 2 locally, and the same Python library and Swift package run natively."
section: sdk
group: "Platforms"
order: 50
label: "macOS"
---

## Install

```bash
brew install bithuman-product/bithuman/bithuman-cli
```

The universal installer puts the same release (same tarball, sha256-verified) on
your `PATH` without Homebrew:

```bash
curl -fsSL https://raw.githubusercontent.com/bithuman-product/homebrew-bithuman/main/install.sh | sh
```

**Apple Silicon only.** An Intel Mac has no CLI binary and no Python wheel —
use the [web](/sdk/web) or the [cloud API](/api/overview).

## Get a model

Nothing to fetch by hand for the first frame: `bithuman run` with no argument
downloads the free **Wise Pup** avatar itself — on a Mac, a 26 MB slice. Every other showcase avatar and your own agent come the same
way as on the [CLI page](/sdk/cli#get-a-model): `bithuman avatars`,
`bithuman pull <slug or CODE>`.

## Minimal code

```bash
bithuman run                                   # live at http://127.0.0.1:8088/
bithuman render "$(bithuman pull marmalade)" -a speech.wav -o out.mp4   # offline: audio in, MP4 out
```

From **Python**, the same two calls as on every platform — `pip install
"bithuman[expression-2]"` needs macOS 14 or newer on arm64; everything after
the install is on the [Python page](/sdk/python). From **Swift**, the
`Expression2` product of the SwiftPM package builds for `macos-arm64` as well
as iOS; the package, its products and entitlements are on the
[iOS page](/sdk/ios), the one writer for the Swift surface.

## Run

Open `http://127.0.0.1:8088/`, grant the microphone, talk. `bithuman login`
once adds the conversation brain to `run`; `render` needs that sign-in (or
`BITHUMAN_API_SECRET` in the environment) and refuses with exit 77 without it.
A self-hosted session is metered — [pricing](/guides/pricing) is the
authority.

## Performance

On an Apple M4, Expression 2 renders at **54 fps** and Essence 2 at **2 fps** —
unpaced, as fast as the engine can; avatars play at 20 and 25 fps. Essence 2
GPU rendering on the Mac is rolling out; until it lands, plan an offline
`render` for Essence 2 rather than a live session. Every platform side by
side: [Performance](/sdk/performance).

## Troubleshooting

| You see | It means | Do this |
|---|---|---|
| the installer names your platform and exits 1 | Intel Mac — no binary has ever been built ([exact output](/sdk/cli/reference#platforms-with-no-binary)) | [web](/sdk/web) or the [cloud API](/api/overview) |
| `render` exits 77, no output file | no credential | `bithuman login`, or `export BITHUMAN_API_SECRET=…` |
| `bithuman doctor` exits 1 | no credential and no brain configured yet — the check working, not a broken install | `bithuman login`; `run` and `pull` never needed it |
| `No matching distribution found for bithuman` | macOS older than 14, or an Intel Mac | upgrade macOS, or use an Apple Silicon Mac |
| `Error: No available formula` | the tap is not known to Homebrew yet | `brew tap bithuman-product/bithuman`, then install again |

## See also

- [CLI](/sdk/cli) — every command this page uses, in full
- [CLI reference](/sdk/cli/reference) — flags, exit codes, environment variables
- [Python](/sdk/python) — the library
- [iOS](/sdk/ios) — the Swift package, which builds for macOS too
- [SDK](/sdk) — every platform on one table
