# bitHuman developer docs

Source for [docs.bithuman.ai](https://docs.bithuman.ai) — bitHuman's developer
platform. A custom **Astro 6** site styled after
[developers.openai.com](https://developers.openai.com/) (semantic design tokens,
light/dark, Shiki code, brand coral `#FF5757` + Roboto). The embedded API
reference is rendered with **Scalar** at `/api/reference`.

> Status: **rebuild in progress.** The landing page + design system are live;
> pillar/section pages are being migrated from the old Mintlify docs
> (`bithuman-product/bithuman-sdk-public/docs`) and the OpenAPI prose tags.

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
  layouts/Base.astro     Shell: head/SEO, nav, footer, theme init
  components/            Nav, Footer, Button, CodeTabs (Shiki), LiveAvatar, Stub
  styles/                tokens.css (design tokens, light/dark) + global.css
  pages/
    index.astro          Landing page (OpenAI-style: hero + pillars + showcase)
    api/reference.astro  Scalar API reference (renders public/api/openapi.yaml)
    {api,sdk,...}/       Pillar + resource pages (stubs during migration)
  openapi/bithuman.yaml  OpenAPI 3.1 spec -> synced to public/api/openapi.yaml
public/
  images/                Brand + agent imagery referenced across pages
```

## Information architecture

Two product pillars + resources, mirroring developers.openai.com:

- **API Platform** (`/api`) — REST: agents, Voice/TTS, dynamics, embedding + the Scalar reference
- **SDK** (`/sdk`) — Python, Swift (Apple), JS/TS, and the CLI
- **Showcase** (`/showcase`) — live demo agents + forkable reference apps
- **Resources** — Examples, Changelog, Downloads, Community

## API reference

The reference at `/api/reference` is generated from `src/openapi/bithuman.yaml`
(OpenAPI 3.1) — `npm run sync-openapi` copies it to `public/api/openapi.yaml`
(runs automatically on `dev`/`build`). Edit the spec; no hand-written endpoint pages.

## Deploy

GitHub push → Vercel build (project `public-docs`) → preview URL. DNS for
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
curl -sS "https://docs.bithuman.ai/concepts/essence-2?cb=$(date +%s)" \
  | grep -c "head-upsample"

# 3. Zero means the site is still serving the old build. Investigate the alias
#    before telling anyone the change is live.
```

Do the same for `/llms.txt` and `/sitemap.xml` when the change adds or removes a
page — they are generated at build time and are the quickest signal that the
build you are looking at is the build you pushed.

**A page that carries a `TKTK` marker is not publishable at all** — CI is red
until the marker is resolved (`scripts/check-placeholders.mjs`), and
`drafts/` holds page-sized text whose subject is not yet true. See
`drafts/README.md`.
