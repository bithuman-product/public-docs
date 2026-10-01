// The live sample avatars, one per public model. The home page, /start, the
// model pages, /platforms/web and /deploy open them through <LiveDemo>. Both
// are public showcase agents (GET /v1/models/showcase), opened with the same
// no-account web embed a customer puts on a site. The Enterprise-only model
// has no public demo.
//
// A demo session is bounded on the page: it starts only on a click, one runs
// at a time per visitor (across tabs), it ends after DEMO_CAP_SECONDS of live
// time or when the tab stays hidden, and a recorded clip stands in when the
// live embed does not come up.

import { captureMedia } from "./examples.ts";

export type DemoModel = "essence-2" | "expression-2";

export interface Demo {
  model: DemoModel;
  /** The model's display name */
  modelName: string;
  /** Showcase agent code, slug and the name the button uses */
  code: string;
  slug: string;
  name: string;
  /** What the model renders, in a few words */
  kind: string;
  /** Poster base path: <poster>-480.{avif,webp} and <poster>-960.{avif,webp}, 4:5 */
  poster: string;
  /** A real recording of this avatar, shown when the live demo is unavailable */
  clip: { src?: string; poster: string; width: number; height: number; caption: string; captions?: string };
}

/** The front door's demo (/ and /start) opens on Expression 2, with Essence 2
 *  one click away in the same toggle; its poster is the no-JS view too (owner,
 *  2026-10-01). Other pages that show a demo keep their own order. */
export const FRONT_DOOR_DEMO: DemoModel[] = ["expression-2", "essence-2"];

/** The live session ends after this many seconds on screen. */
export const DEMO_CAP_SECONDS = 180;

export const embedUrl = (code: string) => `https://www.bithuman.ai/embed/${code}`;

export const DEMOS: Record<DemoModel, Demo> = {
  "essence-2": {
    model: "essence-2",
    modelName: "Essence 2",
    code: "A52DHS2219",
    slug: "sofia-ramirez",
    name: "Sofia",
    kind: "a photoreal person",
    poster: "/images/demo/sofia-ramirez",
    // the same embed a site uses, recorded with sound in Chrome
    clip: captureMedia("web-embed"),
  },
  "expression-2": {
    model: "expression-2",
    modelName: "Expression 2",
    code: "A23WJF0199",
    slug: "wise-pup",
    name: "Wise Pup",
    kind: "any character",
    poster: "/images/demo/wise-pup",
    clip: captureMedia("android-expression-2"),
  },
};
