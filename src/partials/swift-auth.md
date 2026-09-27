<!-- Shared by /platforms/ios and /platforms/macos (```partial swift-auth). -->
The engines check an API secret when a session starts. Set `BITHUMAN_API_SECRET` in the scheme's environment, or pass it in code before you create an engine: `Expression2Credential.set(secret)` or `Essence2Credential.set(secret)` ([Your API secret](/start/api-secret)).

A shipped app holds that secret on the device. Create a dedicated secret for each app, so you can rotate or revoke it on its own ([API secrets](https://www.bithuman.ai/developer/api-keys)). Fetch it from your backend at startup rather than compiling it into the binary, and keep it in the Keychain.

Credits pay for active session time, talking or idle, billed to the second ([pricing](/pricing)).
