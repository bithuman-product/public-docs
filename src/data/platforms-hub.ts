// The Platforms hub's groups and reference links, shared by the page
// (src/pages/platforms/index.astro) and its .md twin, so both carry the same headings.
export const PLATFORM_GROUPS = [
  { name: "Apps", line: "The avatar renders inside your app, on the device." },
  { name: "Code & terminal", line: "Render on your own Mac or Linux machine." },
  { name: "Agents & APIs", line: "A face for a voice agent, or agents over HTTPS." },
] as const;
export const PLATFORM_REFERENCE: Record<string, { title: string; href: string }> = {
  ios: { title: "Swift reference", href: "/platforms/swift/reference" },
  macos: { title: "Swift reference", href: "/platforms/swift/reference" },
  android: { title: "Android reference", href: "/platforms/android/reference" },
  flutter: { title: "Flutter reference", href: "/platforms/flutter/app#reference" },
  web: { title: "Web reference", href: "/platforms/web/app#reference" },
  python: { title: "Python reference", href: "/platforms/python/reference" },
  cli: { title: "CLI reference", href: "/platforms/cli/reference" },
  pipecat: { title: "Pipecat reference", href: "/platforms/pipecat/app#reference" },
  rest: { title: "API reference", href: "/api/reference" },
};
