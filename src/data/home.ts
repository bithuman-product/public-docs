// The home page's cards, in one place. src/pages/index.astro draws them and
// the home page's markdown twin (/index.md) lists them, so the page a person
// sees and the file an agent reads name the same links.
//
// Every card is one link and one short line. Longer text belongs on the page
// the card links to. No frame rate, multiple or price is typed here: speed comes
// from the generated headline (src/lib/perf-headline.ts), prices from /pricing.
import { PLATFORM_PAGES } from "./platforms";
import { DEPLOYMENTS as MODES } from "./deployments";
import { MODEL_CARDS } from "../lib/model-card";

export interface HomeCard {
  title: string;
  line: string;
  href: string;
  /** A name from src/components/Icon.astro */
  icon: string;
  /** A short plan or availability label shown as a chip */
  badge?: string;
  /** A second, quieter line under `line` */
  note?: string;
  /** Spans the whole row */
  wide?: boolean;
}

/** The landing's head (docs v2 SPEC §6): the H1 names the site, one sentence
 *  under it opens with the brand line (owner, 2026-09-30: "AI with character."). */
export const LANDING = {
  title: "bitHuman docs",
  line: "AI with character. One portrait becomes an avatar that lip-syncs to speech, live.",
  /** W10 (owner, 2026-10-03): which platform and which model, in one line each */
  pickPlatform: "A website: Web. An app: iOS, Android or Flutter. A voice agent: LiveKit or Pipecat. Any backend: the REST API.",
  pickModel: "A real person: Essence 2. Any other character: Expression 2, the default.",
};

/** The product promise (the site JSON-LD description). */
export const HERO = {
  title: "Real-time talking avatars that render on the device",
  line: "Turn one portrait into a lip-synced avatar. Render it on iPhone, iPad, Android, Mac, a Linux PC with no GPU or in a WebGPU browser, or stream it from the bitHuman cloud.",
};

/** "Start building": one card per platform page. */
export const START_BUILDING: HomeCard[] = PLATFORM_PAGES.map((p) => ({ title: p.title, line: p.line, href: p.href, icon: p.icon }));

/** "Where it runs": the four deployment modes, each to its own page, with the
 *  short line from src/data/deployments.ts (docs v2 SPEC §6: the offline tile
 *  uses the short line; the approved offline copy stays on the pages it links). */
export const DEPLOYMENTS: HomeCard[] = MODES.map((d) => ({ title: d.name, line: d.line, href: d.href, icon: d.icon }));

export type { ModelCard } from "../lib/model-card";

/** "Models": every model as a card (owner, 2026-10-01: each model shows an
 *  image, a description, highlights and the devices it runs on, "rather than
 *  just merely stating the performance number"). The text lives in
 *  src/data/models.ts beside the page that states each fact; "Runs on" is its
 *  matrix, never typed. The current generation carries a showcase character
 *  other than the live demo's two samples (owner, 2026-09-29: "I don't like we
 *  repeat the same image for different cards"); the first generation one of
 *  the house showcase avatars of that model. */
export const MODELS = MODEL_CARDS.filter((m) => m.generation === "current");

/** The first generation (owner, 2026-09-30: "we should list all Essence
 *  versions and Expression versions"). */
export const MODELS_V1 = MODEL_CARDS.filter((m) => m.generation === "first");

/** "Build": recipes and the pages that make an avatar yours. */
export const GUIDES: { title: string; line: string; href: string; icon: string }[] = [
  { title: "Voice agent", line: "A talking avatar on your machine with the CLI or Python.", href: "/build/voice-agent", icon: "wave" },
  { title: "Create your own avatar", line: "From one portrait to your own agent.", href: "/build/create-avatar", icon: "spark" },
  { title: "Persona", line: "Give the agent a personality and instructions.", href: "/build/persona", icon: "chat" },
  { title: "Voices", line: "Choose a voice, or bring your own provider.", href: "/build/voices", icon: "wave" },
  { title: "Claude & Cursor (MCP)", line: "Drive bitHuman from an AI assistant.", href: "/build/mcp", icon: "code" },
  { title: "Example gallery", line: "Complete apps to clone and run.", href: "/examples", icon: "grid" },
];
