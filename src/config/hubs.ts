// The static (non-collection) pages, in one place: the route each one serves,
// the source file that renders it (the sitemap's last-modified date comes from
// that file's last commit), the short name an index shows for it, and the one
// description the page itself publishes as its <meta name="description">.
//
// Every consumer reads THIS list — the hub .astro pages for their meta
// description, /sitemap.xml for the routes, /llms.txt for the index line and
// /llms-full.txt for the section — so the page and the indexes cannot describe
// the same URL differently. Before 2026-09-20 the nine hubs were bare URLs in
// /llms.txt and absent from /llms-full.txt altogether: an agent that ingested
// only the full file never saw /start's four-step CLI sample.

export interface HubMeta {
  /** Route without leading slash; "" is the home page. */
  route: string;
  /** Source file rendering the route — must match src/pages/ (no phantom routes). */
  file: string;
  /** The name an index shows. */
  name: string;
  /** The page's own meta description, verbatim. */
  description: string;
  /** Collection section whose pages this hub lists, if it is a section hub. */
  section?: "sdk" | "guides" | "resources";
}

export const HUBS: HubMeta[] = [
  {
    route: "",
    file: "src/pages/index.astro",
    name: "bitHuman docs",
    description:
      "Realtime talking avatars from one portrait: Essence 2 for photoreal people, Expression 2 for any character. Run them from the cloud API, the web, the CLI, Python, Apple, Android and LiveKit.",
  },
  {
    route: "start",
    file: "src/pages/start.astro",
    name: "Get started",
    description: "Talk to a live avatar, get an API secret, and run your first avatar on the platform you choose.",
  },
  {
    route: "api/reference",
    file: "src/openapi/bithuman.yaml",
    name: "REST API reference",
    description:
      "Every endpoint in the bitHuman OpenAPI spec — agents, voice, talking video, embedding, billing, webhooks — with try-it-out. The same contract is served raw at /api/openapi.yaml.",
  },
  {
    route: "sdk",
    file: "src/pages/sdk/index.astro",
    name: "SDK",
    description:
      "Every platform bitHuman runs on: CLI, Python, Apple, Android, Web, LiveKit and MCP, with current versions and frame rates.",
    section: "sdk",
  },
  {
    route: "guides",
    file: "src/pages/guides/index.astro",
    name: "Guides",
    description: "Learn the models, build your own avatar, deploy it, and understand pricing.",
    section: "guides",
  },
  {
    route: "resources",
    file: "src/pages/resources/index.astro",
    name: "Resources",
    description: "Downloads and versions, the changelog, support, and machine-readable files for AI agents.",
    section: "resources",
  },
];

export function hubMeta(route: string): HubMeta {
  const h = HUBS.find((x) => x.route === route);
  if (!h) throw new Error(`no hub metadata for route "/${route}" — add it to src/config/hubs.ts`);
  return h;
}

// The two code samples /start prints, from src/data/platforms.ts, so
// /llms-full.txt carries the same bytes the page renders.
import { PLATFORMS, EMBED_SNIPPET } from "../data/platforms";
export const START_EMBED = EMBED_SNIPPET;
export const START_CLI = PLATFORMS.find((p) => p.id === "cli")!.card!.code;
