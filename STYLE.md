# docs.bithuman.ai style guide

Rules for everything under `src/content/docs` and `src/pages`. Each rule is one line; the gate that enforces it is named in brackets. Every gate runs in `ci/run-local.sh` (GitHub Actions was removed on 2026-09-29; see `ci/README.md`).

## Voice

- Second person, present tense, active voice. "we" only when bitHuman acts.
- Lead with the action, then the result. One idea per sentence; at most 25 words per sentence in instructions.
- A claim is a fact with a source, never an adjective. Rewrite marketing tone ("premium", "great for", "powerful") as a fact.
- State what is true today. Never "currently", "rolling out", "as of", "honest", "simply" or "just".
- No page or section opens with history, a warning or a defence.
- Banned words: leading, world's first, best-in-class, seamless, revolutionary, scale infinitely, 1000×, highest quality, most cost-effective, instant, blazing. [check-claims]

## Terminology

| Use | Not |
|---|---|
| bitHuman | Bithuman, BitHuman |
| Essence 2, Expression 2, Essence 1, Expression 1; in code `essence-2`, `expression-2`, `essence-1`, `expression-1` | e2, x2, elevate, embody, "light/quality" [check-retired-model-names] |
| Essence 2 Max, only in the one sentence "Essence 2 Max is available on the Enterprise plan only." | any other mention [check-internal-vocabulary] |
| the Swift package (products `Expression2`, `Essence2Kit`, `Essence2`) | Apple SDK, Swift SDK, bitHumanKit |
| the Android SDK (`essence2-android`, `expression2-android`); the Flutter plugin; the Python SDK (`bithuman`); the CLI; the LiveKit plugin | — |
| the web embed; the bitHuman app (bithuman.ai) | dashboard, Studio, console, widget (mixed) |
| API secret · runtime token · embed token; `BITHUMAN_API_SECRET` (`BITHUMAN_API_KEY` is the deprecated alias), header `api-secret` | API key, bearer [check-internal-vocabulary] |
| the four modes: bitHuman cloud · Your servers (self-hosted) · On the device · Fully offline; CPU only (no GPU) is a note beside them (Your servers on a PC with no GPU) | Cloud/Self-hosted/On-device/Offline as a mixed set; "five modes"; "VPC" |
| the avatar **renders** (device, browser, server, cloud); the conversation **runs** (your stack, the CLI's local conversation brain, bitHuman's servers) | "runs locally" for a web embed |
| Local conversation brain (the CLI on macOS and Linux, `BITHUMAN_LOCAL=1`) | "on-device brain" [check-claims] |
| offline license (disconnected real-time use) vs **file rendering** (`bithuman render`, `bithuman.offline`; signs in online) | "offline render" |
| {x}× real time, floored to one decimal, with the hardware named | a frame rate on a card, hub, lede or llms opener |
| active session time, talking or idle, billed to the second | "talking time", "idle is free" [check-claims] |
| the Creator plan or higher | free tier, free key, free SDK [check-claims] |
| license (US), Apple silicon, iPhone, iPad, Android arm64, Linux x86_64 / arm64, WebGPU, real-time ("realtime" only in the approved offline sentence and in names: OpenAI Realtime, `/v1/realtime`) | licence, Apple Silicon, "any phone" [check-claims] |
| gestures (prose); `dynamics` (API paths only) | avatar actions |
| sample avatars `sofia-ramirez` (Essence 2) and `wise-pup` (Expression 2); placeholder `$AGENT_CODE` | customer or showcase codes as "your agent" |
| AI companion, companionship, conversation practice, coaching | therapy, mental-health support, loneliness [check-claims] |

The cloud Apple-silicon tier is "Apple". "ANE" survives ONLY inside slugs and identifiers. The generated clip is the "identity video", defined once on `/models`. [check-internal-vocabulary]

## Claims

- Publish only PLAN_v2's SAFE claims. The DO NOT CLAIM rows are patterns in `scripts/check-claims.mjs`; an exception needs a reason and an expiry in `scripts/claims-exceptions.json`. [check-claims]
- Never: data "never leaves" the device without the metering qualifier; air-gapped; offline for Expression 1, phones, the browser or Swift-package apps (a Mac is offline only through the Python package, Essence 1); an offline term; Raspberry Pi, Jetson or NVIDIA as a self-host target; native Windows; sub-second or reply-latency numbers; any, mid-range or older phones; battery; sessions per server; uptime or an SLA; any compliance certification; device tokens; per-user memory; customer logos.
- Offline copy is the approved sentence, word for word, followed by "Linux and macOS computers (Apple silicon); bought in the console or through sales." Code imports it from `src/data/offline.ts`; a page that only mentions the license links to `/deploy#fully-offline`. [check-offline-copy]
- Web privacy copy always carries: "With the web embed, the conversation runs on bitHuman's servers, even when the avatar renders in the tab."

## Never in a public page [check-internal-content]

- Internal host names, storage buckets, infrastructure vendors, home-directory paths.
- Process language: owner, ruling, lane, press, second reader, control.
- Measurement jargon (shape names, drive ids, "floor", "positive control", "byte-identical").
- Dated investigation logs ("Measured on 2026-…", "Verified on …"). The changelog carries time.
- Version history outside the changelog ("from 2.6.20…"). Write "Requires X or newer."
- Commit, build or object ids in prose. Checksums only in the verification block on `/downloads`.
- `★`, "load-bearing", essays about the page itself; billing-pipeline internals; partner-incident narratives.

## Numbers

- Speed comes only from `public/performance.json` and the generated headline, through the generated tables and components (`RunsEverywhere`, `XrtChip`, the ```` ```perf ```` block). Never type a number. × real time is floored to one decimal by `src/lib/format-multiple.ts`. No frame rate on a card, a hub, a lede or the home page. [check-performance-floors, check-perf-literals, check-perf-render]
- Prices come only from `src/data/pricing.json` (synced from `/v1/pricing`) and appear on `/pricing`. [check-billing-consistency, sync-pricing]
- Versions come only from `src/data/versions.json`: edit it, then `node scripts/sync-versions.mjs --write`. [sync-versions, check-versions-current]
- Units: "2.0× real time", "1.6 GB", "~160 MB download", "2–3 h" (en dash), "credits" (never "cr"), "credits/min".

## Code samples

- Runnable as pasted after `export BITHUMAN_API_SECRET=…`, or the first line is `# excerpt: …` / `// excerpt: …`. An excerpt of a project in bithuman-examples names its file (`// excerpt: android/essence2-hello/app/…/MainActivity.kt`) and copies its lines verbatim, with `// …` between runs; the project's CI builds it and the gate grades the page against main. `node scripts/check-example-excerpts.mjs --make <path> 12-18,40-52` prints one. [check-example-excerpts]
- Secrets only from the environment. Never a literal. [check-placeholders]
- Every fence names its language; `json` blocks parse. Show the output under every first-run block.
- API pages go curl → Python → Node `fetch`. On `/api/*` pages write the curl only: the Python and Node tabs are generated from that same command at build time. A command the generator cannot convert (a pipe, a form upload, an `export`) stays curl alone. To use a variable inside a JSON body, splice it: `'{"agent_code": "'"$BITHUMAN_AGENT_CODE"'"}'`. [remark-api-samples, check-no-js]
- Consecutive fences that show the same step in different languages are tabs: give each fence `tab="Swift"` (the label) in its meta. Tab groups follow the reader's last choice across the site, by kind: languages, platforms (`iOS & iPadOS`, `Android`, `Web`…) or models (`Essence 2`, `Expression 2`). The kind is read from the labels; name it on the first fence with `group="platform"` when the labels are ambiguous. [remark-code-tabs, tabs-sync]
- One placeholder per value: `$AGENT_CODE`, `$BITHUMAN_API_SECRET`, `$WEBHOOK_ID`.

## Caveats

- At most 1 callout per H2 and 3 per page, each under 40 words. [check-page-template]
- `**Warning:**` only for security, money or data loss. `**Note:**` for one fact the reader needs now.
- Gotchas go in the page's Troubleshooting table (Symptom · Cause · Fix). Table cells stay under 25 words.

## Page chrome and frontmatter

Every docs page gets, from `DocLayout`: a breadcrumb, the H1 (= the sidebar label), a one-sentence lede (= `description`), a chips row, page actions, the outline rail, Next cards, "Last updated" and "Edit this page on GitHub", and the pager.

| Field | Use |
|---|---|
| `title` | the H1 and the sidebar label; there is no separate label [check-nav-consistency] |
| `description` | the lede (subtitle), one sentence of 6–14 words, with the words developers type (`scripts/check-subtitles.mjs`) |
| `section`, `group`, `order` | where it sits: `section` is a header item, `group` one of its `GROUP_ORDER` groups in `src/config/nav.ts` [check-nav-consistency] |
| `type` | the template below [check-page-template] |
| `availability` | `creator` · `business-enterprise` · `enterprise`, shown as a plan chip |
| `renders` | `device` · `no-gpu` · `browser` · `server` · `cloud` · `offline`, shown as where-it-renders chips |
| `artifacts` | keys of `versions.json`, shown as version chips |
| `demo` | `essence-2` · `expression-2` · `both`: a live sample avatar under the lede (at the end of a hub) |
| `next` | 1–3 docs paths, shown as the Next cards |
| `searchTitle` | the search-result title, when the H1 alone does not carry the word readers type |
| `claims` | the SAFE claim ids the page makes; required on deploy and privacy pages |

The file path is the URL: no `slug:` overrides. A page that moves gets a row in `scripts/ia-map.json`, and `node scripts/gen-redirects.mjs` regenerates `vercel.json`. [gen-redirects --check, check-redirects, check-redirects-live]

## Page templates [check-page-template]

H2 names are stable anchors. A section that does not apply is omitted, never written as "Nothing to install".

| Type | H2 sections, in order (required in bold) |
|---|---|
| `platform` | (the lead: ONE short line, with a link to /deploy/on-device on device pages; the first step starts within 400 px at 1440) → Before you start (the model comparison table opens it: decision W7, 2026-09-30, `scripts/check-mobile-sdk-arrival.mjs`) → Install → **Authenticate** → **First frame** (ends with the real capture) → Complete example → **Integrate into your app** → Platform notes → Performance → **Troubleshooting** → **Reference** |
| `recipe` | What you'll build (the outcome beside a real capture) → **Steps** (each `### ` a step with an ```` ```expected ```` check) → How it works (a diagram) → Make it your own → **Troubleshooting** → Next. `time:` in the frontmatter is the chip "20 min". |
| `concept` | a one-sentence definition, a diagram first, 3–5 key ideas, In code, Where it runs, Related |
| `endpoint` | summary and method chips → Authentication → per operation: Request → Example (curl, Python, Node) → Response → Errors → Related guide |
| `deploy` | **What it is** (links to /deploy#compare) → **Where it renders** → **Speed** → **Price** → **Limits** → First command |
| `hub` | one line of purpose, the chooser or matrix, cards; no copy longer than 60 words outside the cards |
| `example` | **Requirements** → Get the code → Set up the app → Set your API secret → **Run it** → **Expected output** → How it works → **The code that matters** (verbatim excerpts) → Make it your own → **Troubleshooting** → **Next** |

`quickstart`, `guide`, `reference`, `generated`, `changelog` and `legal` keep their own shapes.

## Design system

- Tokens live in `src/styles/tokens.css`: colours per theme (light, and dark under `[data-theme="dark"]`), radii `--r-sm` to `--r-pill`, the 4-px spacing scale `--s-1` to `--s-12`, `--flow-egress` for diagram arrows only. No hard-coded colour or radius in a component.
- One card: `Card` (variants link, media, model, stat, platform) inside a `.card-grid`. One chip: `Chip`, with `Availability` and `VersionBadge` on top of it. Labels come from `src/data/labels.ts`.
- Chip labels: **Where** "Renders on the device", "No GPU", "In the browser (WebGPU)", "Your servers", "bitHuman cloud"; **Needs** "Physical device", "Apple silicon", "Linux x86_64 / arm64", "API secret"; **Plan** "Creator plan or higher", "Business & Enterprise", "Enterprise only".
- Only avatars move. `prefers-reduced-motion` and Save-Data show posters only. One icon set (`Icon.astro`).
- Every capture names its device, OS, release and avatar. No fps overlays, stock art or customer brands.
- Captures are registered once in `src/data/examples.ts` (poster AVIF + WebP ≤480 px wide, a muted AV1 + H.264 loop ≤300 KB, the recording with sound and WebVTT captions) and placed with ```` ```figure ````. A moved media file gets an `assets` row in `scripts/ia-map.json`. [check-media]
- Diagrams are ```` ```diagram ```` blocks: inline SVG on the tokens, one style, a caption that is also the screen-reader and twin text. What leaves your hardware for bitHuman is drawn in `--flow-egress`; the offline diagram shows only a Linux PC or terminal and quotes the approved sentence.

## Generated blocks in markdown

A fenced block named for a block is drawn at build time from the data files (`src/lib/doc-blocks.ts`); the `.md` twins and llms files get the same block as plain markdown. A page never types what a block draws.

| Fence | Draws | From |
|---|---|---|
| ```` ```perf ```` + row ids | the × real time rows, with hardware, release and date one click away | `public/performance.json` |
| ```` ```why-on-device ```` + `ios`, `macos`, `android`, `flutter` or `web` | the three-line "why render on the device" box (S30, S26, S10; S29 on the web) | `pricing.json`, `plans.json` |
| ```` ```model-matrix ```` [+ `model: <id>` or `place: <ids>`] | which model renders where, whole or as a slice | `src/data/models.ts` |
| ```` ```model-cards ```` | the current models as portrait cards | `models.ts`, `demo.ts` |
| ```` ```deploy-matrix ```` | the four modes side by side, and the CPU-only note | `deployments.ts`, `dataflows.ts`, `pricing.json` |
| ```` ```dataflow ```` + a mode | where it renders, where the conversation runs, what reaches bitHuman | `dataflows.ts` |
| ```` ```price ```` + a mode, ```` ```session-caps ```` | one mode's rate; cloud sessions per plan | `pricing.json`, `plans.json` |
| ```` ```partial ```` + a name | a shared passage (`src/partials/<name>.md`), such as the Swift install on iOS and macOS | `src/partials` |
| ```` ```perf-explorer ```` | every published row as bars, per model, with the held-for-10-minutes rows (on `/performance`) | `public/performance.json`, `perf-groups.ts` |
| ```` ```credit-calculator ```` | credits and dollars a month for a usage pattern, with worked examples (on `/pricing`) | `pricing.json`, `plans.json` |
| ```` ```app-budget ```` [+ `example`] | what an avatar costs inside an app, per mode, or the one-user worked example alone (on `/pricing` and the companion recipe) | `pricing.json`, `plans.json` |
| ```` ```figure ```` + a capture id [+ `eager` above the fold] | a real capture in its device frame, its loop playing while on screen, "Play with sound" with captions, the provenance line | `src/data/examples.ts` |
| ```` ```example-gallery ````, ```` ```github-examples ```` | every example as a filterable card; the projects with no recording yet (on `/examples`) | `examples.ts` |
| ```` ```diagram ```` + `engine`, `creation`, `lifecycle`, `livekit`, `livekit-local` or `topology <mode>` | one of the canonical diagrams | `src/lib/diagrams.ts` |
| ```` ```dataflow-explorer ```` | where each kind of data goes, per mode, each cell citing its S row (on `/deploy/privacy`) | `dataflows.ts` |
| ```` ```expected ```` + markdown | the "Expected" check under a step (a `<details>`, open) | the page |

The explorer, the calculator, the filter above a full ```` ```model-matrix ```` or ```` ```deploy-matrix ````, figures, the gallery, the data-flow explorer and a recipe's steps bring a small script, loaded only on the page that places them. With JavaScript off everything they draw still shows. [check-no-js, check-js-budget]

Essence 2 Max is named only in the ruled sentence, "Essence 2 Max is available on the Enterprise plan only." It has no page, card, matrix row or chip. [check-internal-vocabulary]

A home or hub card links a page, never an anchor on another page. [check-nav-consistency]

## Live demos

- `LiveDemo` opens the sample avatars (`src/data/demo.ts`) in the web embed. Nothing loads before a click; one session runs at a time per visitor; the countdown starts when the avatar is live and the session ends at the cap, or 30 seconds after the tab is hidden; a real recording stands in when the embed does not come up.
- An `/embed/` URL is never a plain crawlable link: the component opens it, and markdown links to it carry `rel="nofollow"`.
- No fps or latency is shown to visitors. The web privacy line sits under every demo.

## Budgets

- Lighthouse mobile: performance ≥95, accessibility, best practices and SEO 100 on the gated pages. [check-quality]
- First-party JS ≤25 KB gzipped per page and ≤5 KB per script; no third-party JS except the API explorer until it is replaced; inlined CSS ≤30 KB. [check-js-budget]
- No horizontal scroll at 390 px. Iframes are created on click only. Video: `preload="none"`, poster first.

## Search

- Changelog bodies weigh 0.2 and the SDK references 0.5, so the pages readers start from rank first. Every page carries a `section` filter.
- The words developers type go in the H1, the lede and the description. The acceptance table is `scripts/check-search.mjs`. [check-search]
