---
title: "Support & community"
description: "Where to get help, report a bug, and follow bitHuman releases."
section: overview
group: "Help"
order: 40
type: reference
llms: none
help: top
---

## Get help

- **Discord**: [the bitHuman community](https://www.bithuman.ai/discord). Share what you are building and meet other developers.
- **The bitHuman app on Discord**: [what it does and what it stores](/legal/discord-app).
- **Email**: [hello@bithuman.ai](mailto:hello@bithuman.ai) for anything that should not be public.
- **Status**: [status.bithuman.ai](https://status.bithuman.ai) for live platform and API status.
- **News and releases**: [X](https://x.com/steve_gu_1984), [LinkedIn](https://www.linkedin.com/company/bithuman-ai), [Bluesky](https://bsky.app/profile/bithuman.ai), [GitLab](https://gitlab.com/bithuman) and the [changelog](/changelog).

When you ask for help, include the command you ran, the version (`bithuman --version`, or `pip show bithuman`), and the full error. Every SDK page ends with a Troubleshooting table that maps common messages to fixes.

## Where things live

| Repository | What it holds | Open an issue for |
|---|---|---|
| [homebrew-bithuman](https://gitlab.com/bithuman/sdk/homebrew-bithuman) | The Homebrew tap and the CLI installers | CLI install and upgrade problems |
| [bithuman-cli](https://gitlab.com/bithuman/sdk/bithuman-cli/-/issues) | The CLI's issues (the CLI and `bithuman-serve` ship with the installer and Homebrew `bithuman-cli`) | CLI bugs and feature requests |
| [bithuman-swift](https://gitlab.com/bithuman/sdk/bithuman-swift) | The Swift package (3.0 and later) | Swift package bugs and feature requests |
| [bithuman-android](https://gitlab.com/bithuman/sdk/bithuman-android) | The Android SDK (maven.bithuman.ai `ai.bithuman`) | Android SDK bugs and feature requests |
| [bithuman-flutter](https://gitlab.com/bithuman/sdk/bithuman-flutter) | The Flutter plugin (pub.dev `bithuman`, 3.0 and later) | Flutter plugin bugs and feature requests |
| [bithuman-python](https://gitlab.com/bithuman/sdk/bithuman-python) | The Python library (PyPI `bithuman`) | Python library bugs and feature requests |
| [livekit-bithuman](https://gitlab.com/bithuman/sdk/livekit-bithuman) | The LiveKit Agents plugin (`livekit-plugins-bithuman`, released in livekit/agents) | LiveKit plugin bugs and feature requests |
| [pipecat-bithuman](https://gitlab.com/bithuman/sdk/pipecat-bithuman) | The Pipecat service (PyPI `pipecat-bithuman`) | Pipecat service bugs and feature requests |
| [bithuman-examples](https://github.com/bithuman-product/bithuman-examples) | Runnable example apps for every platform | An example that does not build or run |
| [public-docs](https://gitlab.com/bithuman/docs/public-docs) | The source of this site | A wrong or unclear page |

## Contribute

- **Doc fixes and examples**: open a merge request against the repository above that holds them. Small, focused changes are reviewed fastest.
- **A new feature or flag**: open an issue with the use case before you write code.
- **A new language SDK**: open an issue that names the language and what you want to build. The engine ships as a binary, so we build and support new bindings.
- **A framework integration**: Pipecat has one, maintained by bitHuman: [`pipecat-bithuman`](/platforms/pipecat). For another framework (LangChain and others), build it on a published SDK in the framework's own repository, then open an issue with the link and we will list it. The [LiveKit integration](/platforms/livekit) is the model to follow.
