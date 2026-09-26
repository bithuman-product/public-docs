import type { APIRoute } from "astro";
import { PLATFORMS, EMBED_URL } from "../data/platforms";
import versions from "../data/versions.json";

// /platforms.json — every way to run bitHuman: what it is for, what it needs,
// the first command, the models it runs and its docs page (markdown twin too).
export const prerender = true;
const SITE = "https://docs.bithuman.ai";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      schema: 1,
      demo_embed: EMBED_URL,
      versions: versions.versions,
      platforms: PLATFORMS.map((p) => ({
        id: p.id, want: p.want, use: p.use, needs: p.needs, first_command: p.id === "offline" ? null : p.first, ...(p.id === "offline" ? { contact: "https://www.bithuman.ai/sales" } : {}), models: p.models,
        docs: `${SITE}${p.docs}`, markdown: `${SITE}${p.docs.split("#")[0]}.md`,
      })),
    }, null, 2) + "\n",
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
