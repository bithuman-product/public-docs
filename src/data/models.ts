// Which model renders where: the one model × place matrix. /models draws it
// whole; the model pages draw their column and the deploy pages their row
// (the ```model-matrix block, src/lib/doc-blocks.ts). Each place links to the
// page that installs it. Nothing about speed or price lives here.
//
// No imports, so scripts can load this file with Node alone.

export type ModelId = "essence-2" | "expression-2" | "essence-1" | "expression-1";
export type PlaceId = "ios" | "mac" | "android" | "cpu" | "browser" | "servers" | "cloud" | "offline";

export interface Model {
  id: ModelId;
  name: string;
  href: string;
  /** What it renders, in a few words */
  renders: string;
  generation: "current" | "first";
  /** The card's one-line description (owner, 2026-10-01: highlights,
   *  description and supported devices, not only a speed figure) */
  line: string;
  /** Two or three short facts, each stated on the model's own page */
  highlights: string[];
  /** Poster base path (4:5): <poster>-480.{avif,webp}, a house showcase avatar of this model */
  poster: string;
  alt: string;
}

export interface Place {
  id: PlaceId;
  name: string;
  /** The name on a model card's "Runs on" line */
  short: string;
  href: string;
}

/** A cell: available or not, and how (the product or command), when it is. */
export interface Cell {
  ok: boolean;
  how?: string;
}

export const MODELS: Model[] = [
  { id: "essence-2", name: "Essence 2", href: "/models/essence-2", renders: "a photoreal person from one portrait", generation: "current",
    line: "A photoreal person from one portrait, live.",
    // /models/essence-2: "up to 1080p", "a sharp mouth and teeth taken from that video", "Always-on displays"
    highlights: ["Photoreal, up to 1080p", "Sharp mouth and teeth", "Made for always-on kiosks and displays"],
    poster: "/images/cast/kwame-warm-museum-guide", alt: "Kwame, an Essence 2 avatar" },
  { id: "expression-2", name: "Expression 2", href: "/models/expression-2", renders: "any character from one portrait", generation: "current",
    line: "Any character from one portrait: stylized, animal, robot or human.",
    // /models/expression-2: "cartoons, animals, creatures, robots, and people", "synthesized each session", "one image is enough"
    highlights: ["Cartoons, animals, robots and people", "Motion generated live from the audio", "One photo is enough"],
    poster: "/images/cast/pip-the-red-panda-barista", alt: "Pip the red panda barista, an Expression 2 avatar" },
  { id: "essence-1", name: "Essence 1", href: "/models/first-generation#essence-1", renders: "first generation, pre-rendered motion", generation: "first",
    line: "First generation. A pre-built identity with its mouth matched to the audio in real time.",
    // /models/first-generation#essence-1: "runs on a CPU, with no GPU", "patches the mouth in real time", "custom gestures"
    highlights: ["Renders on a CPU, no GPU needed", "Lip-sync patched live over pre-rendered motion", "Custom gestures"],
    poster: "/images/cast/productivity-strategist-dr-vega", alt: "Dr. Vega, an Essence 1 avatar" },
  { id: "expression-1", name: "Expression 1", href: "/models/first-generation#expression-1", renders: "first generation, animated from a portrait", generation: "first",
    line: "First generation. Animates a face from a portrait at runtime.",
    // /models/first-generation#expression-1: "no per-identity build step", "on cloud GPUs", "512×512", "a photo with no agent"
    highlights: ["No per-identity build step", "Renders on bitHuman cloud GPUs at 512×512", "Can animate a photo with no agent"],
    poster: "/images/cast/storytelling-grandpa-leo", alt: "Grandpa Leo, an Expression 1 avatar" },
];

export const PLACES: Place[] = [
  { id: "ios", name: "iPhone and iPad", short: "iPhone & iPad", href: "/platforms/ios" },
  { id: "mac", name: "Mac", short: "Mac", href: "/platforms/macos" },
  { id: "android", name: "Android", short: "Android", href: "/platforms/android" },
  { id: "cpu", name: "Linux, no GPU", short: "Linux (no GPU)", href: "/deploy/cpu" },
  { id: "browser", name: "Browser (WebGPU)", short: "Browser", href: "/platforms/web" },
  { id: "servers", name: "Your servers", short: "Your servers", href: "/deploy/self-hosted" },
  { id: "cloud", name: "bitHuman cloud", short: "Cloud", href: "/deploy/cloud" },
  { id: "offline", name: "Fully offline", short: "Offline", href: "/deploy/offline" },
];

const no: Cell = { ok: false };

export const MATRIX: Record<ModelId, Record<PlaceId, Cell>> = {
  "essence-2": {
    ios: { ok: true, how: "Swift package, `Essence2Kit` (iOS 26)" },
    mac: { ok: true, how: "Swift package (macOS 26, M3 or newer), CLI, Python" },
    android: { ok: true, how: "`essence2-android`" },
    cpu: { ok: true, how: "CLI, Python" },
    browser: { ok: true, how: "`render=local`, for identities with a browser build" },
    servers: { ok: true, how: "CLI, Python, LiveKit plugin" },
    cloud: { ok: true, how: "web embed, REST API, LiveKit" },
    offline: { ok: true, how: "Linux x86_64, bitHuman 2.11.17 or later (Python) or CLI 2.8.4 or later; Business & Enterprise" },
  },
  "expression-2": {
    ios: { ok: true, how: "Swift package, `Expression2`" },
    mac: { ok: true, how: "Swift package (macOS 13), CLI, Python" },
    android: { ok: true, how: "`expression2-android`" },
    cpu: { ok: true, how: "CLI, Python" },
    browser: { ok: true, how: "`render=local`" },
    servers: { ok: true, how: "CLI, Python, LiveKit plugin" },
    cloud: { ok: true, how: "web embed, REST API, LiveKit" },
    offline: { ok: true, how: "Linux x86_64, bitHuman 2.11.17 or later (Python, `bithuman[expression-2]`) or CLI 2.8.4 or later; Business & Enterprise" },
  },
  "essence-1": {
    ios: no,
    mac: { ok: true, how: "CLI (`run`), Python" },
    android: no,
    cpu: { ok: true, how: "CLI (`run`), Python" },
    browser: { ok: true, how: "`render=local`" },
    servers: { ok: true, how: "CLI (`run`), Python" },
    cloud: { ok: true, how: "web embed, REST API, LiveKit" },
    offline: { ok: true, how: "Linux x86_64 and ARM64 (bitHuman 2.11.16 or later), macOS on Apple silicon (2.11.17 or later, Python); Business & Enterprise" },
  },
  "expression-1": {
    ios: no, mac: no, android: no, cpu: no, browser: no, servers: no,
    cloud: { ok: true, how: "web embed, REST API, LiveKit" },
    offline: no,
  },
};

/** Where a model runs, in matrix order: the places whose cell is available.
 *  A model card's "Runs on" line is this, never typed by hand. */
export const runsOn = (id: ModelId): Place[] => PLACES.filter((p) => MATRIX[id][p.id].ok);
