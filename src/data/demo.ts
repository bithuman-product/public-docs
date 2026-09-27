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
  clip: { src: string; poster: string; width: number; height: number; caption: string };
}

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
    clip: {
      src: "/examples/android/essence2.mp4",
      poster: "/examples/android/essence2.webp",
      width: 540,
      height: 1006,
      caption: "A recording of sofia-ramirez (Essence 2) on a Samsung Galaxy S25+, rendered by the Android SDK.",
    },
  },
  "expression-2": {
    model: "expression-2",
    modelName: "Expression 2",
    code: "A23WJF0199",
    slug: "wise-pup",
    name: "Wise Pup",
    kind: "any character",
    poster: "/images/demo/wise-pup",
    clip: {
      src: "/examples/android/expression2.mp4",
      poster: "/examples/android/expression2.webp",
      width: 540,
      height: 1006,
      caption: "A recording of wise-pup (Expression 2) on a Samsung Galaxy S25+, rendered by the Android SDK.",
    },
  },
};
