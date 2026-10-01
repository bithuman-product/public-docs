---
title: "Swift troubleshooting"
description: "Fix Swift package errors on iPhone, iPad and Mac, by symptom."
section: platforms
group: "Swift"
order: 40
type: troubleshooting
llms: build
---

## iOS

| Symptom | Cause | Fix |
|---|---|---|
| `create` throws `meteringRefused` (C: `be_essence2_create` returns `-3`): *no API secret was found* | no secret | call `Essence2Credential.set` / `Expression2Credential.set`, or set `BITHUMAN_API_SECRET` in the scheme |
| *the API secret was rejected* | revoked or mistyped secret; from 2026-10-12, a Free account | create a new one under [API secrets](https://www.bithuman.ai/developer/api-keys); on Free, [choose a plan](https://www.bithuman.ai/pricing?from=docs) |
| *cannot reach bitHuman to verify your credential* | no network at first contact | fix the network, then create again |
| `pull()` keeps returning `nil` right after `feed()` | frames arrive asynchronously, and Essence 2 hands out at most 25 a second | poll, or use `frames()` |
| crash in `__cxa_finalize` when the app quits | `Essence2Engine.quiesceAll()` (C: `be_essence2_quiesce_all`) was not called | call it from `applicationWillTerminate` |
| `unable to resolve module dependency: 'Expression2'` on a Simulator build | the default destination also builds x86_64 | add `ARCHS=arm64`, or set `EXCLUDED_ARCHS[sdk=iphonesimulator*] = x86_64` in the target |
| `expression is 'async' but is not marked with 'await'` on `player.scheduleBuffer(reply)` | Xcode 26 imports an `async` overload | call `player.scheduleBuffer(reply, completionHandler: nil)` |
| `duplicate symbol` naming `MLX` at the final link, or Essence 2 memory rising in a long session | an older Swift package | raise `from:` to the version on [Downloads & versions](/downloads), then `swift package update` |
| a link error naming `BithumanEngineProtocol` | that product was added beside `Expression2`, which already contains it | depend on `Expression2` only |
| `401 MISSING_AUTH` downloading a model | the agent code and `model=` do not match a sample avatar | check the code, or send your API secret for your own agent |

## macOS

| Symptom | Cause | Fix |
|---|---|---|
| `refusing to serve: no API secret was found` | no secret in this shell or scheme | `export BITHUMAN_API_SECRET=…`, or set it in the scheme |
| *cannot reach bitHuman to verify your credential* in a Mac app | App Sandbox blocks outgoing connections | tick **Outgoing Connections (Client)** under App Sandbox |
| `create` throws before `engine ready` | the model files are missing | run `./setup.sh` from the example folder, so `Model/` holds the three files |
| The link step prints `ld: warning: … was built for newer 'macOS' version (14.0) than being linked (13.0)` | the Expression 2 engine library targets macOS 14 | expected; the build succeeds |
| The first run is slow | the engine is prepared for this Mac once | keep `Model/staged/` between runs |
