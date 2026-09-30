// Real captures and the example gallery (docs spec §4.2 #10, W4). Every card
// in the gallery, every example page's figure and every platform page's lead
// figure draws a capture from this file, so a recording is described once:
// what it shows, where it was captured, with which release and which avatar.
//
// Media live in public/examples/<capture id>/:
//   poster.avif + poster.webp   a still (<= 480 px wide)
//   loop.av1.mp4 + loop.mp4     a muted 3-4 s loop (AV1 first, H.264 fallback), <= 300 KB each
//   clip.mp4 + clip.vtt         the recording with sound, and its captions
// scripts/check-media.mjs holds every file to those budgets and fails on a file
// no capture names.
//
// Rules (STYLE.md "Visuals"): every capture names its device, OS, release and
// avatar; only public showcase avatars; no fps overlays; no customer or demo
// brands; captures on fast hardware name the hardware.
//
// No imports, so scripts can load this file with Node alone.

export type CaptureId =
  | "web-embed" | "kiosk-linux" | "cli-linux" | "talking-video-linux" | "python-macos"
  | "ios-expression-2" | "macos-expression-2" | "android-expression-2" | "android-essence-2";

export type Frame = "iphone" | "android" | "mac" | "browser" | "linux-pc" | "terminal" | "cloud";

export interface Capture {
  id: CaptureId;
  /** What the recording shows, in one sentence (the alt text and the caption's first line) */
  alt: string;
  /** Poster size in pixels (the aspect ratio the figure reserves) */
  width: number;
  height: number;
  /** The drawing the gallery card names the device with */
  frame: Frame;
  /** A muted loop exists (a still has none) */
  loop: boolean;
  /** The recording with sound: its length in seconds; captions sit beside it */
  clip?: { seconds: number };
  provenance: {
    device: string;
    os?: string;
    /** The product and release that rendered it */
    release: string;
    /** The showcase avatar's slug and its model */
    avatar: string;
    model: "essence-2" | "expression-2";
    /** Where the avatar rendered, in the fixed vocabulary */
    renders: string;
    /** The capture date, YYYY-MM-DD */
    date: string;
    /** Anything a viewer should know about how the recording was made */
    note?: string;
  };
}

const MODEL_NAME = { "essence-2": "Essence 2", "expression-2": "Expression 2" } as const;
/** The Linux captures ran on a desktop that has a graphics card; the process could not see it. */
const CPU_NOTE = "Rendered on the CPU alone: the PC's graphics card was hidden from the process.";

export const CAPTURES: Record<CaptureId, Capture> = {
  "web-embed": {
    id: "web-embed", width: 404, height: 720, frame: "browser", loop: true, clip: { seconds: 20 },
    alt: "The sofia-ramirez avatar answering a spoken question in the web embed, in a plain HTML page",
    provenance: {
      device: "Chrome 154 on Linux", release: "the web embed", avatar: "sofia-ramirez", model: "essence-2",
      renders: "bitHuman cloud", date: "2026-09-27",
      note: "The visitor's question is the microphone input, mixed into the recording.",
    },
  },
  "kiosk-linux": {
    id: "kiosk-linux", width: 480, height: 854, frame: "linux-pc", loop: true, clip: { seconds: 16.5 },
    alt: "The kwame-warm-museum-guide avatar answering a visitor, full screen in Chrome on a Linux PC, from bithuman run",
    provenance: {
      device: "a Linux PC, Intel Core i7-13700F", os: "Ubuntu 24.04", release: "CLI 2.8.2 (bithuman run)",
      avatar: "kwame-warm-museum-guide", model: "essence-2", renders: "No GPU", date: "2026-09-27",
      note: `${CPU_NOTE} The visitor's question is the microphone input, mixed into the recording.`,
    },
  },
  "cli-linux": {
    id: "cli-linux", width: 416, height: 720, frame: "linux-pc", loop: true, clip: { seconds: 5.6 },
    alt: "The pip-the-red-panda-barista avatar speaking a line, rendered by bithuman render on a Linux PC with no GPU",
    provenance: {
      device: "a Linux PC, Intel Core i7-13700F", os: "Ubuntu 24.04", release: "CLI 2.8.2 (bithuman render)",
      avatar: "pip-the-red-panda-barista", model: "expression-2", renders: "No GPU", date: "2026-09-27", note: CPU_NOTE,
    },
  },
  "talking-video-linux": {
    id: "talking-video-linux", width: 480, height: 854, frame: "linux-pc", loop: true, clip: { seconds: 6.9 },
    alt: "The kwame-warm-museum-guide avatar in a talking video, rendered from one audio file by bithuman render on a Linux PC",
    provenance: {
      device: "a Linux PC, Intel Core i7-13700F", os: "Ubuntu 24.04", release: "CLI 2.8.2 (bithuman render)",
      avatar: "kwame-warm-museum-guide", model: "essence-2", renders: "No GPU", date: "2026-09-27", note: CPU_NOTE,
    },
  },
  "python-macos": {
    id: "python-macos", width: 480, height: 854, frame: "mac", loop: true, clip: { seconds: 8 },
    alt: "The sofia-ramirez avatar speaking in a window opened by the Python SDK on a Mac",
    provenance: {
      device: "an Apple M4 Mac", os: "macOS", release: "Python SDK 2.11.6", avatar: "sofia-ramirez", model: "essence-2",
      renders: "Your servers", date: "2026-09-23",
    },
  },
  "ios-expression-2": {
    id: "ios-expression-2", width: 416, height: 720, frame: "iphone", loop: false,
    alt: "The wise-pup avatar mid-sentence, as drawn by the ios-expression2 example app on an iPhone 15",
    provenance: {
      device: "iPhone 15", os: "iOS 26", release: "Swift package 2.14.2", avatar: "wise-pup", model: "expression-2",
      renders: "Renders on the device", date: "2026-09-23",
    },
  },
  "macos-expression-2": {
    id: "macos-expression-2", width: 416, height: 720, frame: "mac", loop: true, clip: { seconds: 8 },
    alt: "The wise-pup avatar speaking, rendered by the macos-expression2 example",
    provenance: {
      device: "an Apple M4 iMac", os: "macOS", release: "Swift package 2.14.2", avatar: "wise-pup", model: "expression-2",
      renders: "Renders on the device", date: "2026-09-23",
    },
  },
  "android-expression-2": {
    id: "android-expression-2", width: 480, height: 894, frame: "android", loop: true, clip: { seconds: 8.1 },
    alt: "The wise-pup avatar speaking in the expression2-hello app on a Galaxy S25+",
    provenance: {
      device: "Samsung Galaxy S25+", os: "Android", release: "expression2-android 0.4.9", avatar: "wise-pup", model: "expression-2",
      renders: "Renders on the device", date: "2026-09-23",
    },
  },
  "android-essence-2": {
    id: "android-essence-2", width: 480, height: 894, frame: "android", loop: true, clip: { seconds: 8.1 },
    alt: "The sofia-ramirez avatar speaking in the essence2-hello app on a Galaxy S25+, at 1080×1920",
    provenance: {
      device: "Samsung Galaxy S25+", os: "Android", release: "essence2-android 0.5.14", avatar: "sofia-ramirez", model: "essence-2",
      renders: "Renders on the device", date: "2026-09-23",
    },
  },
};

export const media = (id: CaptureId) => {
  if (!CAPTURES[id]) throw new Error(`unknown capture "${id}"`);
  const base = `/examples/${id}`;
  const c = CAPTURES[id];
  return {
    posterAvif: `${base}/poster.avif`,
    posterWebp: `${base}/poster.webp`,
    loopAv1: c.loop ? `${base}/loop.av1.mp4` : undefined,
    loopH264: c.loop ? `${base}/loop.mp4` : undefined,
    clip: c.clip ? `${base}/clip.mp4` : undefined,
    captions: c.clip ? `${base}/clip.vtt` : undefined,
  };
};

/** "iPhone 15 (iOS 26) · Swift package 2.14.2 · wise-pup (Expression 2) · 2026-09-23" */
export function provenanceLine(id: CaptureId): string {
  const p = CAPTURES[id].provenance;
  return `Captured on ${p.device}${p.os ? ` (${p.os})` : ""} · ${p.release} · ${p.avatar} (${MODEL_NAME[p.model]}) · ${p.date}`;
}

/** The shape /start's picker and the live demo's fallback take: the recording
 *  with sound (or the still), its size and a caption with the provenance. */
export function captureMedia(id: CaptureId) {
  const c = CAPTURES[id];
  const m = media(id);
  return { src: m.clip, poster: m.posterWebp, width: c.width, height: c.height, caption: `${c.alt}. ${provenanceLine(id)}.`, captions: m.captions };
}

// ---------------------------------------------------------------- the gallery

export type Where = "device" | "no-gpu" | "servers" | "browser" | "cloud";
export const WHERE_LABEL: Record<Where, string> = {
  device: "Renders on the device",
  "no-gpu": "No GPU",
  servers: "Your servers",
  browser: "In the browser (WebGPU)",
  cloud: "bitHuman cloud",
};

export type GalleryPlatform = "web" | "ios" | "macos" | "android" | "linux" | "python" | "rest";
export const PLATFORM_LABEL: Record<GalleryPlatform, string> = {
  web: "Web", ios: "iPhone & iPad", macos: "Mac", android: "Android", linux: "Linux", python: "Python", rest: "REST API",
};

export interface Example {
  id: string;
  title: string;
  /** One line: what it does */
  line: string;
  /** The docs page that runs it */
  href: string;
  capture: CaptureId;
  platform: GalleryPlatform;
  models: ("essence-2" | "expression-2")[];
  where: Where[];
  /** The one command that gets the code, and roughly how long the first run takes */
  get: string;
  time: string;
  /** One linked line under the card: [link text, href, the rest of the sentence] */
  note?: [string, string, string];
}

const REPO = "https://github.com/bithuman-product/bithuman-examples";
const CLONE = `git clone ${REPO}.git`;

export const EXAMPLES: Example[] = [
  {
    id: "web", title: "Web embed", line: "One iframe: a live avatar that listens and answers, on any page.",
    href: "/platforms/web/app#complete-example", capture: "web-embed", platform: "web", models: ["essence-2", "expression-2"], where: ["cloud"],
    get: "one <iframe> tag", time: "1 min",
  },
  {
    id: "kiosk", title: "Kiosk on a Linux PC", line: "A live avatar full screen on a standard Linux PC, with no GPU.",
    href: "/build/kiosk", capture: "kiosk-linux", platform: "linux", models: ["essence-2", "expression-2"], where: ["no-gpu", "servers"],
    get: "curl -fsSL https://install.bithuman.ai | sh", time: "15 min",
    note: ["Fully offline", "/deploy/offline", " needs a Business or Enterprise license."],
  },
  {
    id: "cli", title: "CLI on Linux", line: "An MP4 or a live conversation from a terminal, on the CPU alone.",
    href: "/platforms/cli#complete-example", capture: "cli-linux", platform: "linux", models: ["essence-2", "expression-2"], where: ["no-gpu", "servers"],
    get: "curl -fsSL https://install.bithuman.ai | sh", time: "5 min",
  },
  {
    id: "ios-expression-2", title: "iOS: Expression 2", line: "A SwiftUI app with a talking character, rendered on the iPhone.",
    href: "/examples/ios-expression-2", capture: "ios-expression-2", platform: "ios", models: ["expression-2"], where: ["device"],
    get: CLONE, time: "15 min",
  },
  {
    id: "android-essence-2", title: "Android: Essence 2", line: "A photoreal person at 1080×1920, rendered on the phone.",
    href: "/examples/android-essence-2", capture: "android-essence-2", platform: "android", models: ["essence-2"], where: ["device"],
    get: CLONE, time: "15 min",
  },
  {
    id: "android-expression-2", title: "Android: Expression 2", line: "A Kotlin app rendering any character on the phone.",
    href: "/examples/android-expression-2", capture: "android-expression-2", platform: "android", models: ["expression-2"], where: ["device"],
    get: CLONE, time: "15 min",
  },
  {
    id: "macos-expression-2", title: "macOS: Expression 2", line: "One Swift file: speech in, lip-synced frames out, on your Mac.",
    href: "/examples/macos-expression-2", capture: "macos-expression-2", platform: "macos", models: ["expression-2"], where: ["device"],
    get: CLONE, time: "10 min",
  },
  {
    id: "python", title: "Python", line: "Open an avatar, play speech through it, watch it talk.",
    href: "/platforms/python/app#complete-example", capture: "python-macos", platform: "python", models: ["essence-2", "expression-2"], where: ["servers"],
    get: "pip install bithuman", time: "5 min",
  },
  {
    id: "talking-video", title: "Talking video", line: "One MP4 from an audio file: the REST API, the CLI or Python.",
    href: "/build/talking-video", capture: "talking-video-linux", platform: "rest", models: ["essence-2", "expression-2"], where: ["cloud", "servers", "no-gpu"],
    get: "bithuman render <avatar> speech.wav", time: "2 min",
  },
];

/** Complete projects on GitHub with no recording on this site yet. */
export const MORE_ON_GITHUB: { title: string; path: string; line: string; href?: string }[] = [
  { title: "Flutter voice app", path: "app/avatar_chat", line: "A voice conversation with idle and interruption, on Android (the Flutter plugin).", href: "/platforms/flutter" },
  { title: "iOS: Essence 2", path: "swift/ios-essence2", line: "A full-resolution photoreal avatar on iPhone.", href: "/examples/ios-essence-2" },
  { title: "Python self-host with LiveKit", path: "python/self-host", line: "Your own LiveKit server and OpenAI Realtime, with the avatar rendered on your machine.", href: "/build/voice-agent#with-python" },
  { title: "Cloud avatar in a LiveKit room", path: "python/cloud-essence", line: "A bitHuman cloud avatar joining your LiveKit room, with a web UI.", href: "/platforms/livekit" },
  { title: "Next.js video-chat UI", path: "integrations/nextjs-ui", line: "A browser front end for an avatar in a LiveKit room." },
  { title: "REST API scripts", path: "api/rest-api", line: "curl and Python for every REST endpoint.", href: "/platforms/rest" },
];
export const repoUrl = (path: string) => `${REPO}/tree/main/${path}`;

/** The distinct showcase avatars the gallery shows (the acceptance asks for four or more). */
export const galleryAvatars = () => [...new Set(EXAMPLES.map((e) => CAPTURES[e.capture].provenance.avatar))];
