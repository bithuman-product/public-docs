# bitHuman developer docs

[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://www.bithuman.ai/discord) Questions, demos and challenges: [join the bitHuman Discord](https://www.bithuman.ai/discord).

Source for [docs.bithuman.ai](https://docs.bithuman.ai) — bitHuman's developer
platform. A custom **Astro 6** site styled after
[developers.openai.com](https://developers.openai.com/) (semantic design tokens,
light/dark, Shiki code, brand coral `#FF5757` + Roboto). The API
reference at `/api/reference` is rendered from the OpenAPI spec at build time,
with no third-party script.

## Local dev

```bash
nvm use            # Node 22+ (Astro 6); see .nvmrc
npm install
npm run dev        # http://localhost:4321
npm run build      # static output -> dist/
```

## Structure

```
src/
  content/docs/          The markdown pages; the file path is the URL
  config/nav.ts          Sections, sidebar groups, header, Resources menu, footer
  data/                  One source per fact: versions, pricing, platforms, demo avatars, offline copy
  layouts/               Base (head, nav, footer) and DocLayout (sidebar, chips, Next, pager)
  components/            Card, Chip, LiveDemo, CodeTabs, QuickstartPicker, PlatformSwitcher and the rest of the design system
  scripts/               The small browser scripts: tab and platform state, the explorer, the calculator, filters
  lib/                   Build-time helpers: data blocks, the OpenAPI reader, the curl → Python and Node generator
  styles/                tokens.css (light/dark tokens), components.css, prose.css
  pages/                 The home page, /start, the hubs, llms files and markdown twins
  openapi/bithuman.yaml  OpenAPI spec -> synced to public/api/openapi.yaml
scripts/                 The gates ci/run-local.sh runs, and the generators (redirects, versions, pricing)
STYLE.md                 The style guide: voice, terminology, claims, templates, budgets
```

## Information architecture

Organized by the developer's question. The header is Get started · Platforms · Deploy · Models · Build · API · Performance, then Resources.

- **Get started** (`/start`): the quickstart, the API secret.
- **Platforms** (`/platforms`): iOS & iPadOS, Android, Web, Python, the CLI, LiveKit, REST, and the SDK references.
- **Deploy** (`/deploy`): the bitHuman cloud, your servers, on the device, CPU only (no GPU), fully offline, pricing, and the use-case guides (`/deploy/use-cases`).
- **Models** (`/models`): Essence 2, Expression 2, the first generation, how it works, the avatar file.
- **Build** (`/build`): create your own avatar, persona, voices, recipes, and the example gallery (`/examples`).
- **API** (`/api`), **Performance** (`/performance`), **Resources** (`/resources`).

A page that moves gets a row in `scripts/ia-map.json`; `node scripts/gen-redirects.mjs` regenerates the redirects in `vercel.json`, and `ci/run-local.sh` checks them before merging (`--served` after each deploy).

## API reference

The reference at `/api/reference` is generated from `src/openapi/bithuman.yaml`
(OpenAPI 3.1) — `npm run sync-openapi` copies it to `public/api/openapi.yaml`
(runs automatically on `dev`/`build`). Edit the spec; no hand-written endpoint pages.

## Deploy

GitLab push → Vercel build (project `public-docs`) → preview URL. DNS for
`docs.bithuman.ai` is swapped to this project only once the rebuild is approved.

### ★ A push can succeed while the site keeps serving the old build

**Verify a publish by fetching the live HTML, never by reading the Vercel
status.** This has bitten us: the push lands, the dashboard goes green, the
deployment is marked Ready — and `docs.bithuman.ai` keeps serving the previous
build. A green status says a build finished; it does not say the domain is
pointing at it. The two failure shapes we have actually seen are an alias that
never moved to the new deployment, and a cached HTML response served ahead of
it.

So the last step of publishing is not `git push`. It is:

```bash
# 1. Note the commit you pushed.
git rev-parse --short HEAD

# 2. Fetch the LIVE page — cache-busted — and grep for a string that exists
#    only in the new build. Pick a distinctive sentence from your own diff.
curl -sS "https://docs.bithuman.ai/models/essence-2?cb=$(date +%s)" \
  | grep -c "head-upsample"

# 3. Zero means the site is still serving the old build. Investigate the alias
#    before telling anyone the change is live.
```

Do the same for `/llms.txt` and `/sitemap.xml` when the change adds or removes a
page — they are generated at build time and are the quickest signal that the
build you are looking at is the build you pushed.

**A page that carries a `TKTK` marker is not publishable at all** — `ci/run-local.sh` is red
until the marker is resolved (`scripts/check-placeholders.mjs`), and
`drafts/` holds page-sized text whose subject is not yet true. See
`drafts/README.md`.
