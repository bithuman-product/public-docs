// The fixed label vocabulary for chips (STYLE.md "Chips"). Pages and
// components pick a key; nobody types the label.

/** The plan a feature needs. */
export const PLAN_LABEL = {
  creator: "Creator plan or higher",
  "business-enterprise": "Business & Enterprise",
  enterprise: "Enterprise only",
} as const;
export type Plan = keyof typeof PLAN_LABEL;

/** Where the avatar renders. */
export const RENDERS_LABEL = {
  device: "Renders on the device",
  "no-gpu": "No GPU",
  browser: "In the browser (WebGPU)",
  server: "Your servers",
  cloud: "bitHuman cloud",
  offline: "Fully offline",
} as const;
export type Renders = keyof typeof RENDERS_LABEL;

/** Artifact names for version chips (the versions come from versions.json). */
export const ARTIFACT_LABEL = {
  swift: "Swift package",
  essence2_android: "essence2-android",
  expression2_android: "expression2-android",
  python: "Python",
  cli: "CLI",
  livekit_plugin: "LiveKit plugin",
  flutter_plugin: "Flutter plugin",
} as const;
export type Artifact = keyof typeof ARTIFACT_LABEL;

import versions from "./versions.json";
/** "Swift package 2.18.0": an artifact's name and its current version. */
export function versionLabel(a: Artifact): string {
  const v = (versions.versions as Record<string, string>)[a];
  if (!v) throw new Error(`versions.json has no "${a}"`);
  return `${ARTIFACT_LABEL[a]} ${v}`;
}
