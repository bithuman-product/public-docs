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
