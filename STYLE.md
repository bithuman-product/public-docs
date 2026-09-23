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
| Essence 2 | A photoreal person from one portrait. Up to 1920×1080, 25 fps. |
| Expression 2 | Any character (stylized, animal, robot or human) from one portrait. 416×720, 20 fps. |
| Essence 1 / Expression 1 | First-generation models, maintained. |
| Billing | Credits pay for talking time. Idle time is free. |
| Offline | Business and Enterprise plans can run realtime avatars fully offline, for kiosks, trade shows, ATMs and embedded screens. Credit-based, from 100,000 credits. Contact sales. |
| Sample avatars | Essence 2 `sofia-ramirez`, Expression 2 `wise-pup` |
| Embed | `https://www.bithuman.ai/embed/<CODE>` with `allow="microphone *"`; the demo agent is `A23WJF0199` |
| Apple | "Apple (iOS, iPadOS, macOS)" for the SDK; "Swift package" for the artifact |

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

- "25 fps", "4.1×", "1.6 GB", "~160 MB download", "2–3 h" (en dash), "credits" (never "cr"), "credits/min".
- Pricing numbers appear only on `/guides/pricing`. Frame rates appear only in the generated performance tables. [check-billing-consistency, check-performance-floors]

## Page shapes

Every page declares `type:` in its frontmatter and follows that type's section order: quickstart, platform, endpoint, guide, reference, example, concept, changelog, generated. A platform page runs What you get → Before you start → Install → Authenticate → First frame → Integrate into your app → Performance → Troubleshooting → Reference. H2 names are stable anchors. [check-page-template]
