---
title: "Flutter troubleshooting"
description: "Fix Flutter plugin build and runtime errors by symptom."
section: platforms
group: "Flutter"
order: 40
type: troubleshooting
llms: troubleshooting
---

| Symptom | Cause | Fix |
|---|---|---|
| `UnsatisfiedLinkError` on an emulator | the engines are `arm64-v8a` only | run on a physical arm64 phone |
| The app shows a refusal and asks for a secret | no API secret, or a rejected one | enter a valid [API secret](/start/api-secret), or build with `--dart-define=BITHUMAN_API_SECRET=…` |
| Manifest merge fails on `minSdk` | Essence 2 needs `minSdk 29` | raise the app to 29 |
| `pod install` fails on iOS or macOS | the deployment target is below iOS 16 or macOS 13 | raise the Podfile platform and the Runner targets |
| The iOS or macOS build cannot find the engines | the bootstrap step was skipped | run `scripts/bootstrap.sh` in the plugin's folder, then build again |
| A macOS link error names `llama` or `onnxruntime` | the Homebrew libraries are missing | `brew install llama.cpp onnxruntime` |
