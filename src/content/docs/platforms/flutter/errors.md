---
title: "Flutter errors"
description: "What BithumanAvatar.load throws, why a voice session ends, and what to do."
section: platforms
group: "Flutter"
order: 35
type: reference
llms: troubleshooting
next: ["/platforms/flutter/troubleshooting", "/api/errors"]
---

A failure reaches your app in one of two places: `BithumanAvatar.load` throws, or a running voice session ends once on `errorStream`. Decide on the code, never on the message, which is written for people and can change.

A network error never means the API secret is wrong. Retry it later, and do not sign the user out or ask for a new secret.

## Loading an avatar

`load` throws `BithumanModelRejected` when the engine refuses the avatar file, `BithumanEntitlementException` when bitHuman has not said yes to this API secret for this avatar (plugin 2.6.36 or newer), and a `PlatformException` for everything else. The installers (`downloadAgentImx`, `downloadExpression2Avatar`, `downloadExpression2Agent`, `downloadEssence2Bundle`) throw `BithumanEntitlementException` too. Neither class is a `PlatformException`, so catch each one:

```dart
try {
  final avatar = await BithumanAvatar.load(code, engine: 'essence2', apiSecret: secret);
} on BithumanModelRejected catch (e) {
  // MODEL_REJECTED: this avatar cannot run here; show it as unavailable
} on BithumanEntitlementException catch (e) {
  // e.refused true: bitHuman said no to this secret for this avatar; do not retry with it
  // e.refused false: bitHuman could not be asked (offline, a timeout); retry when online
} on PlatformException catch (e) {
  // e.code: load_failed, load_cancelled, unsupported, detached, BAD_ARGS
}
```

| Code | Platforms | What happened | Retry helps | What to do |
|---|---|---|---|---|
| `MODEL_REJECTED` (`BithumanModelRejected`) | Android, iOS, macOS | The engine refused the avatar file. `nativeCode` -4 on Essence 2: the file was published before the engine's current version. On Android the plugin downloads the file again once before it gives up. | No | Show the character as unavailable. On iOS and macOS, download the file again (`GET /v1/agent/{code}/model/download`). |
| `BithumanEntitlementException`, `refused: true` | Android, iOS, macOS | bitHuman refused this API secret for this avatar: it is another account's private avatar, or the secret is revoked. A copy kept on the device is not opened. | No | Pass the API secret of the account that owns the avatar. |
| `BithumanEntitlementException`, `refused: false` | Android, iOS, macOS | bitHuman could not be asked (offline, a timeout, a 5xx), and this secret has no recent yes for the kept copy: within 24 hours for an account's own avatar, 7 days for a public one. On Android the first open of each kept avatar after updating to 2.6.36 asks once. | Yes, once online | Call `load` again when the device is online. |
| `load_failed` | Android | The download or the engine failed; the message names the cause: no network, a missing or refused API secret, another account's private avatar. | Only when the cause is the network; the download keeps its bytes | Fix the cause. For the network, wait for it and call `load` again. |
| `load_cancelled` | Android | `BithumanAvatar.cancelLoad(code)` or `BithumanAvatar.clearCredentials()` stopped the load. | — | Nothing: the next `load` of that code continues the download. |
| `unsupported` | Android, iOS, macOS | `engine:` names no engine, or the agent code is empty. On iOS and macOS also: Essence 2 below iOS 26 or macOS 26 (the message names the version it needs), or `'essence2'` in a build that does not carry the Essence 2 engine. | No | Pass `engine: 'expression2'` or `'essence2'`, and the agent code. Check the OS version before you download Essence 2 files; below iOS 26 or macOS 26, use Expression 2. |
| `detached` | Android | The Flutter engine went away while the avatar loaded. | No | Load again from the new engine. |
| `BAD_ARGS` | iOS, macOS | `load` was called without a path. | No | Pass the avatar's file (Essence 2) or folder (Expression 2). |

On iOS and macOS a missing or refused API secret for a file your app downloaded itself does not throw: the avatar never becomes ready (`isReady` stays false). Wait on `avatar.ready` with a timeout, and check the secret when it expires. Always pass `engine:`.

## Voice session

A `BithumanRealtimeSession` reports a failure that a retry cannot fix once, as a `RealtimeSessionError` on `errorStream` (also kept in `lastError`), then `RealtimeStatus.error`. The session then stops whole: microphone and speaker off, captions ended, streams closed. It does not reconnect; fix the cause and build a new session.

| `code` | What happened | What to do |
|---|---|---|
| `UNAUTHORIZED` | The relay refused the API secret at the start (HTTP 401): missing, revoked or mistyped. | Use a valid [API secret](/start/api-secret). |
| `INSUFFICIENT_BALANCE` | The account has no credits, at the start (HTTP 402) or when they run out during the session. | [Top up](https://www.bithuman.ai/billing#credits), then start a new session. |
| `PAYWALL` | The account has no minutes left for a voice session: its plan's credits, its free trial and its top-ups are spent (HTTP 402). bitHuman returns it for bitHuman Live sign-ins; a session on your own API secret ends with `INSUFFICIENT_BALANCE` instead. | Choose a plan or top up, then start a new session. |
| `FORBIDDEN` | The relay refused the start (HTTP 403), or bitHuman stopped the session. At the start the usual cause is the model: `gpt-realtime` (the session's default before plugin 2.6.36) needs an entitlement. | Pass `model: 'gpt-realtime-mini'`. Otherwise check the plan and the secret. |
| `PLAN_REQUIRED` | The account's plan does not include the session. At the start the relay answers HTTP 403, which arrives as `FORBIDDEN`. | [Choose a plan](https://www.bithuman.ai/pricing). |
| `SESSION_DURATION_LIMIT` | The session reached its maximum length, one hour. | Start a new session. |
| `MODEL_LOCKED` | A `session.update` tried to change the model fixed when the session connected. | Keep the model; open a new session for another. |
| `BAD_REQUEST` | The relay refused the start (HTTP 400), for example a model name it does not serve. | Use `gpt-realtime-mini`. |
| `MODEL_REJECTED` | The avatar's engine refused its model file during the session. | As for `load`, above. |

A dropped connection is not on `errorStream`: the session reconnects, waiting 1 s and doubling up to 30 s (8 attempts), and reports `RealtimeStatus.error` only when they run out. A relay at capacity (HTTP 503) reports `RealtimeStatus.error` too; start again shortly. The relay's codes and limits are on [Realtime relay](/api/realtime#limits--billing).

## Android engine refusals

On Android the plugin runs the [Android SDK](/platforms/android)'s engines. A refusal of the account (the plan, too many sessions, a suspended account, no credits) or an out-of-date avatar file is described, with its fix, in [Android troubleshooting](/platforms/android/troubleshooting).
