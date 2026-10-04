---
title: "We moved to GitLab"
description: "bitHuman's public source code now lives on gitlab.com/bithuman, and release files download from downloads.bithuman.ai."
section: overview
group: "Help"
order: 45
type: reference
llms: troubleshooting
---

bitHuman's public repositories moved from GitHub to [gitlab.com/bithuman](https://gitlab.com/bithuman), and release files now download from `downloads.bithuman.ai`. The GitHub copies are archived and read-only, so everything you already installed keeps working, including every version and tag you pinned.

## What to change

You change each address once, when you adopt the release that ships it.

| You use | What to do |
|---|---|
| [Swift package](/platforms/ios) | From 3.0, add `https://gitlab.com/bithuman/sdk/bithuman-swift` with `from: "3.0.0"`. The same URL also resolves every 2.x version. If you stay on 2.x, the URL you have keeps working. |
| [Flutter](/platforms/flutter) | From 3.0, depend on `bithuman: ^3.0.0` from [pub.dev](https://pub.dev/packages/bithuman) and drop the git dependency. The 2.6.x git tags keep resolving from the archived repository. |
| [Android](/platforms/android) | Nothing: the `ai.bithuman` coordinates and `maven.bithuman.ai` are unchanged. Source and issues: [bithuman-android](https://gitlab.com/bithuman/sdk/bithuman-android). |
| [Python](/platforms/python) | Nothing: `pip install bithuman` is unchanged. Source and issues: [bithuman-python](https://gitlab.com/bithuman/sdk/bithuman-python). |
| [CLI](/platforms/cli) | Nothing if you use the installer: `curl -fsSL https://install.bithuman.ai \| sh`. With Homebrew, move to the new tap once, in this order (Homebrew refuses to untap a tap while its formula is installed): `brew uninstall bithuman-cli`, `brew untap bithuman-product/bithuman`, `brew tap bithuman/bithuman https://gitlab.com/bithuman/sdk/homebrew-bithuman`, then `brew install bithuman/bithuman/bithuman-cli`. Always give the tap its URL: without it, Homebrew looks for `bithuman` on GitHub, which is not bitHuman's account. Issues: [bithuman-cli](https://gitlab.com/bithuman/sdk/bithuman-cli/-/issues). |
| [LiveKit](/platforms/livekit) | Nothing: `pip install livekit-plugins-bithuman` is unchanged, and the plugin is still released in livekit/agents. Docs and issues: [livekit-bithuman](https://gitlab.com/bithuman/sdk/livekit-bithuman). |
| [Pipecat](/platforms/pipecat) | Nothing for `pip`. The source moved to [pipecat-bithuman](https://gitlab.com/bithuman/sdk/pipecat-bithuman). |
| [Examples](/examples) | `git clone https://gitlab.com/bithuman/sdk/bithuman-examples.git`. Each platform has one top-level folder (`cli`, `rest-api`, `flutter/avatar-chat`, `web/nextjs-ui`); the archived GitHub copy keeps the old paths. |
| Release files | Every file, old and new, is on `downloads.bithuman.ai` with the same name and checksum. The current ones are under [Release files](/downloads#release-files). |
| The web embed, the REST API, `maven.bithuman.ai` | Nothing. |

## Issues and merge requests

Open them on the GitLab project that holds the code; [Support](/support#where-things-live) lists each one. Docs fixes go to [public-docs](https://gitlab.com/bithuman/docs/public-docs/-/issues).
