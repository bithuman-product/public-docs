# docs.bithuman.ai style guide

Rules for everything under `src/content/docs` and `src/pages`. Each rule is one line; the gate that enforces it is named in brackets. Run every gate with the commands in `.github/workflows/`.

## Naming

- **bitHuman**, in any position. Apple silicon, macOS, WebRTC, WebGPU, on-device, self-hosted.
- Models in prose: **Essence 2, Expression 2, Essence 1, Expression 1**. In code and API values: `essence-2`, `expression-2`, `essence-1`, `expression-1`. [check-retired-model-names]
- Retired names (`essence-2-light`, `essence-2-quality`, `elevate`, `embody`, `lebundle`, `embody-gpu`, `essence-2-mobile`) appear only in the "Naming & migration" section of `/concepts/models`, a `400` hint, or the changelog. Strings a developer must type or parse (file names, URL paths, tier slugs, engine ids such as `essence2-light`) stay spelled exactly and are documented once. [check-retired-model-names]
- The cloud Apple-silicon tier is "Apple". "ANE" survives ONLY inside slugs and identifiers. [check-internal-vocabulary]
- The generated clip is the "identity video", defined once on `/concepts/models`. [check-internal-vocabulary]
- The credential is the **API secret**: variable `BITHUMAN_API_SECRET` (`BITHUMAN_API_KEY` is a deprecated alias), header `api-secret`, parameter `api_secret` / `apiSecret`, placeholder `<your API secret>`. Short-lived credentials are a **runtime token** or an **embed token**. [check-internal-vocabulary]
- Where it runs: "Runs on", "platform", "the cloud API". Never our internal words for serving targets, and never "tier" except the cloud tier slugs on `/performance`. [check-internal-vocabulary, check-internal-content]

## One vocabulary, used verbatim

| Term | Text |
|---|---|
| Essence 2 | A photoreal person from one portrait. Up to 1920×1080. |
| Expression 2 | Any character (stylized, animal, robot or human) from one portrait. 416×720. |
| Essence 1 / Expression 1 | First-generation models, maintained. |
| Speed | "{x}× real time", floored to one decimal, with the hardware named. Never a frame rate on a card, hub, lede or llms opener. |
| Billing | Realtime usage bills active session time, talking or idle, to the second. Never "talking time" or "idle is free". |
| Plan | "the Creator plan or higher" for API and SDK use. Never "free tier", "free key", "free account" or "free SDK". |
| Where it runs | bitHuman cloud · Your servers (self-hosted) · On the device · Fully offline · CPU only (no GPU). Use the set as written; never "VPC". |
| Renders / runs | The avatar **renders** (device, browser, server, cloud); the conversation **runs** (your stack, the CLI's local conversation brain, or bitHuman's servers). |
| Offline | "Offline license is only available to Business and Enterprise clients who want to run realtime avatars completely locally, off the internet — e.g. kiosks, trade shows, ATM machines, embedded screens." Then: "Linux PCs and terminals; arranged through sales." Models: Essence 1, Essence 2, Expression 2. Quote it from `src/data/offline.ts`; never paraphrase. |
| File rendering | `bithuman render` and `bithuman.offline` write a video file and sign in online. Never call them "offline" rendering. |
| Sample avatars | Essence 2 `sofia-ramirez`, Expression 2 `wise-pup`; "your agent" is the placeholder `$AGENT_CODE` |
| Embed | `https://www.bithuman.ai/embed/<CODE>` with `allow="microphone *"`; the demo agent is `A23WJF0199` |
| Apple | The iOS & iPadOS and macOS pages; "the Swift package" for the artifact (products `Expression2`, `Essence2Kit`, `Essence2`) |
| Android | "the Android SDK" (`essence2-android`, `expression2-android`); "Android arm64"; a physical device, never an emulator |
| Spelling | license (US), Apple silicon, iPhone, iPad, WebGPU, realtime |
| Companions | AI companion, companionship, conversation practice, coaching. Never therapy or mental-health framing. |

Banned words: leading, world's first, best-in-class, seamless, revolutionary, scale infinitely, 1000×, highest quality, most cost-effective, instant, blazing. A claim is a fact with a source, never an adjective.

## Never in a public page [check-internal-content]

- Internal host names, storage buckets, infrastructure vendors, home-directory paths.
- Process language: owner, ruling, lane, press, second reader, control.
- Measurement jargon (shape names, drive ids, "floor", "positive control", "byte-identical"). Performance numbers live only on `/performance`, generated.
- Dated investigation logs ("Measured on 2026-…", "Verified on …"). The changelog carries time.
- Version history outside the changelog ("from 2.6.20…", "through 2.7.0…"). Write "Requires X or newer."
- Commit, build or object ids in prose. Checksums only in the verification block on `/downloads`.
- `★`, "load-bearing", essays about the page itself.
- Billing-pipeline internals and bypass variables. Write: "Usage is reported to your account; a brief network loss does not stop the session."
- Partner-incident narratives, marketing copy, and notes that argue with the product.

## Voice

- Second person, present tense, active. "we" only when bitHuman acts.
- Lead with what to do, then the result. Never open a page or section with history, a warning or a defence.
- One idea per sentence; at most 25 words per sentence in instructions. Use a table for three or more parallel items.
- State what happens today. "Rolling out", "currently", "as of" and "honest" are not used.

## Caveats

- At most 1 callout per H2 and 3 per page, each under 40 words. [check-page-template]
- `**Warning:**` only for security, money or data loss. `**Note:**` for one fact the reader needs now.
- Gotchas go in the page's Troubleshooting table (Symptom · Cause · Fix), current release only.
- Table cells stay under 25 words.

## Code samples

- Runnable as pasted after `export BITHUMAN_API_SECRET=…`, or the first line is `# excerpt: …` / `// excerpt: …`.
- Secrets only from the environment: `$BITHUMAN_API_SECRET`, `os.environ["BITHUMAN_API_SECRET"]`. Never a literal. [check-placeholders]
- Versions come from `src/data/versions.json`: edit it, then run `node scripts/sync-versions.mjs --write`. [sync-versions]
- curl first on every API page; Python `requests` second, self-contained.
- Every fence names its language. `json` blocks parse (no comments).
- One placeholder per value: `$AGENT_CODE`, `$BITHUMAN_API_SECRET`, `$WEBHOOK_ID`, UUID `00000000-0000-0000-0000-000000000000`.
- Sample inputs come from bitHuman domains: `https://docs.bithuman.ai/samples/speech.wav` and the sample avatars.
- Show the output under every first-run block.

## Numbers and units

- "2.0× real time", "1.6 GB", "~160 MB download", "2–3 h" (en dash), "credits" (never "cr"), "credits/min".
- Pricing numbers appear only on `/guides/pricing`. Frame rates appear only in the generated performance tables. [check-billing-consistency, check-performance-floors]

## Page shapes

Every page declares `type:` in its frontmatter and follows that type's section order: quickstart, platform, endpoint, guide, reference, example, concept, changelog, generated. A platform page runs What you get → Before you start → Install → Authenticate → First frame → Integrate into your app → Performance → Troubleshooting → Reference. H2 names are stable anchors. [check-page-template]
