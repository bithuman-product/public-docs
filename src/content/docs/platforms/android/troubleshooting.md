---
title: "Android troubleshooting"
description: "Fix Android SDK errors from Gradle, the secret and the device."
section: platforms
group: "Android"
order: 40
type: troubleshooting
llms: build
---

| Symptom | Cause | Fix |
|---|---|---|
| `Expression2Exception` from `create()` naming the API secret | no secret set | call `Expression2Credential.set(secret)` before `fetch()` and `create()` |
| `MeteringRefused` on the first Essence 2 `pull()` | no secret set | call `Essence2Credential.set(secret)` before `fetch()` and `create()` |
| `Essence2StoreException` from `fetch()` | no secret was set when the store downloaded | call `Essence2Credential.set(secret)` before `fetch()` |
| Expression 2 renders slowly; `acceleratorNote` says no `libQnnTFLiteDelegate.so` | the accelerator runtime was excluded, or legacy packaging is off | keep the dependency whole and set `useLegacyPackaging = true` |
| The first Expression 2 `create()` after install is slow | the accelerator prepares the decoder once and keeps it; later launches reuse it | create on a background thread at app start; only the first launch after install pays it (and again after an SDK or OS update) |
| Download refused with `401` | the avatar is private | set its owner's API secret with `Expression2Credential.set` or `Essence2Credential.set` |
| `409 MODEL_NOT_GENERATED` on download | the agent has no model of that kind yet | [add the model](/api/agents#add-a-model-to-an-existing-agent), then retry |
| `Could not find ai.bithuman:expression2-android:…` (or `essence2-android`) | bitHuman's Maven repository is not in the build's repositories | add the `exclusiveContent` block for `https://maven.bithuman.ai` to `settings.gradle.kts`, as in [Install](/platforms/android#install) |
| Manifest merge fails on `minSdk` | `essence2-android` needs `minSdk 29` | raise the module to 29 |
| `Unresolved reference: BuildConfig` | the Android Gradle Plugin turns `BuildConfig` off by default | add `buildFeatures { buildConfig = true }` |
| `Unresolved reference 'MeteredDoorResolver'` | the resolver's public name is `Essence2MeteredDoorResolver` | you rarely need it: `Essence2Credential.set(secret)` covers downloads. To pass a secret explicitly: `import ai.bithuman.essence2.Essence2MeteredDoorResolver`, then `Essence2ModelStore(context, urlResolver = Essence2MeteredDoorResolver(secret))` |
| Gradle stops with `What went wrong:` followed only by a Java version number (such as `25.0.4.1`) | Gradle 8.11 cannot run on that JDK | set `JAVA_HOME` to JDK 17 or 21 and build again |
| The session is refused although you set a secret | `BuildConfig.BITHUMAN_API_SECRET` is empty | set `bithuman.apiSecret` in `local.properties` or `BITHUMAN_API_SECRET`, then rebuild |
| `Unable to strip the following libraries, packaging them as they are` during the build | no NDK is installed | expected; the APK works |
| `UnsatisfiedLinkError` on an emulator | the engines are `arm64-v8a` only | run on a physical arm64 handset |
