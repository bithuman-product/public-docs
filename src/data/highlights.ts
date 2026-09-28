// The changelog's "Highlights" and the home page's "What's new" strip: a few
// releases worth a developer's attention this month, each in one line. A
// highlight names its release by the changelog heading; the date, the platform
// tag and the anchor come from /changelog at build time (src/lib/changelog.ts),
// and the build fails when a named release is not on the page. `href` is the
// docs page where the change is used; the home strip links there, the
// changelog links to the release itself. Speed, prices and versions are never
// typed here.

export interface Highlight {
  /** The changelog heading this highlight is about, without its date */
  release: string;
  title: string;
  line: string;
  /** The docs page where the change is used (a page, never an anchor) */
  href: string;
}

/** The month the highlights cover (the heading on /changelog). */
export const HIGHLIGHTS_MONTH = "September 2026";

export const HIGHLIGHTS: Highlight[] = [
  {
    release: "Swift package 2.18.0",
    title: "One frame stream for Expression 2 on Apple",
    line: "`frames(audioClock:)` hands out idle and speech frames on your player's clock, and `events()` reports when each reply starts and ends.",
    href: "/platforms/ios",
  },
  {
    release: "bithuman 2.11.15",
    title: "One call renders an MP4 from Python",
    line: "`bithuman.open(path).render(audio, out_mp4=...)` writes the video with its speech, for every model.",
    href: "/build/talking-video",
  },
  {
    release: "CLI 2.8.2",
    title: "Talk to any gallery avatar from the CLI",
    line: "`bithuman run <CODE>` plays the gallery avatar with that code, the way `pull`, `render` and `open` already did.",
    href: "/platforms/cli",
  },
  {
    release: "Flutter plugin 2.6.20",
    title: "The Flutter plugin builds for iOS and macOS",
    line: "iOS and macOS build from the published tag and link the published Expression 2 and Essence 2 engines.",
    href: "/platforms/flutter",
  },
];
