// The reader's choices that follow them across the site: the code language
// (`lang`), the platform (`platform`) and the model (`model`). Pure functions,
// shared by the browser scripts (src/scripts/platform-state.ts, tabs-sync.ts,
// picker.ts) and the unit tests (ui-state.test.ts).
//
// The order a choice is read in (docs spec §4.1): the URL parameter
// (`?platform=ios&model=essence-2`, shareable), then browser storage (keys
// `bh.lang`, `bh.platform`, `bh.model`), then the page's default. Nothing that
// matters lives only in storage.

export type StateName = "lang" | "platform" | "model";
export const STATE_NAMES: StateName[] = ["lang", "platform", "model"];
export const storageKey = (name: StateName) => `bh.${name}`;

/** A tab's label → the key every tab group on the site shares. */
const LANG: Record<string, string> = {
  curl: "curl", shell: "curl", bash: "curl", http: "curl",
  python: "python", node: "js", "node fetch": "js", javascript: "js", js: "js",
  swift: "swift", kotlin: "kotlin", dart: "dart", cli: "cli", html: "html",
};
const PLATFORM: Record<string, string> = {
  "ios & ipados": "ios", ios: "ios", "iphone & ipad": "ios", iphone: "ios",
  mac: "macos", macos: "macos", android: "android", flutter: "flutter",
  web: "web", "web embed": "web", website: "web",
  python: "python", cli: "cli", terminal: "cli", livekit: "livekit",
  "rest api": "rest", rest: "rest", "kiosk / offline": "offline", offline: "offline",
};
const MODEL: Record<string, string> = { "essence 2": "essence-2", "expression 2": "expression-2" };
const MAPS: Record<StateName, Record<string, string>> = { lang: LANG, platform: PLATFORM, model: MODEL };

const norm = (label: string) => label.trim().toLowerCase().replace(/\s+/g, " ");

/** The shared key for a label in one group, or the label itself, normalised. */
export function keyFor(group: StateName, label: string): string {
  const n = norm(label);
  return MAPS[group][n] ?? n.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Which group a set of tab labels belongs to: models when every label is a
 *  model, platforms when any label names a platform that is not also a
 *  language (a "Python · CLI" pair stays a language group), else languages. */
export function groupOf(labels: string[]): StateName {
  const ns = labels.map(norm);
  if (ns.length && ns.every((l) => l in MODEL)) return "model";
  if (ns.some((l) => l in PLATFORM && !(l in LANG))) return "platform";
  return "lang";
}

/** Resolve one choice: URL parameter, then storage, then the fallback; a
 *  value outside `allowed` (when given) is skipped, never shown. */
export function resolve(
  name: StateName,
  sources: { url?: string | null; stored?: string | null; fallback?: string | null },
  allowed?: readonly string[],
): string | null {
  const ok = (v: string | null | undefined): v is string => !!v && (!allowed || allowed.includes(v));
  for (const v of [sources.url, sources.stored, sources.fallback]) if (ok(v)) return v;
  return null;
}

/** Copy text without the `# →` / `// →` lines that show a command's output. */
export function stripOutput(code: string): string {
  return code.split("\n").filter((l) => !/^\s*(#|\/\/)\s?→/.test(l)).join("\n").replace(/\n+$/, "");
}
