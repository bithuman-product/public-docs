---
title: "Community & support"
description: "Where to get help, report a bug, and follow bitHuman releases."
section: resources
group: "Resources"
order: 3
---

## Get help

- **Discord**: [discord.gg/ES953n7bPA](https://discord.gg/ES953n7bPA). Share what you are building and ask the team.
- **Email**: [hello@bithuman.ai](mailto:hello@bithuman.ai) for anything that should not be public.
- **Status**: [status.bithuman.ai](https://status.bithuman.ai) for live platform and API status.
- **Releases**: [@bithuman_ai](https://x.com/bithuman_ai) and the [changelog](/changelog).

When you ask for help, include the command you ran, the version (`bithuman --version`, or `pip show bithuman`), and the full error. Every SDK page ends with a Troubleshooting table that maps common messages to fixes.

## Where things live

| Repository | What it holds | Open an issue for |
|---|---|---|
| [homebrew-bithuman](https://github.com/bithuman-product/homebrew-bithuman) | SDK releases: CLI, Swift package, Flutter plugin | SDK bugs and feature requests |
| [bithuman-examples](https://github.com/bithuman-product/bithuman-examples) | Runnable example apps for every platform | An example that does not build or run |
| [public-docs](https://github.com/bithuman-product/public-docs) | The source of this site | A wrong or unclear page |

## Contribute

- **Doc fixes and examples**: open a pull request against the repository above that holds them. Small, focused changes are reviewed fastest.
- **A new feature or flag**: open an issue with the use case before you write code.
- **A new language SDK**: open an issue that names the language and what you want to build. The engine ships as a binary, so we build and support new bindings.
- **A framework integration** (Pipecat, LangChain, and others): build it on a published SDK in the framework's own repository, then open an issue with the link and we will list it. The [LiveKit integration](/sdk/livekit) is the model to follow.
