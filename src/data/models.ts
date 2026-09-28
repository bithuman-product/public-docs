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
}

export interface Place {
  id: PlaceId;
  name: string;
  href: string;
}

/** A cell: available or not, and how (the product or command), when it is. */
export interface Cell {
  ok: boolean;
  how?: string;
}

export const MODELS: Model[] = [
  { id: "essence-2", name: "Essence 2", href: "/models/essence-2", renders: "a photoreal person from one portrait", generation: "current" },
  { id: "expression-2", name: "Expression 2", href: "/models/expression-2", renders: "any character from one portrait", generation: "current" },
  { id: "essence-1", name: "Essence 1", href: "/models/first-generation#essence-1", renders: "first generation, pre-rendered motion", generation: "first" },
  { id: "expression-1", name: "Expression 1", href: "/models/first-generation#expression-1", renders: "first generation, animated from a portrait", generation: "first" },
];

export const PLACES: Place[] = [
  { id: "ios", name: "iPhone and iPad", href: "/platforms/ios" },
  { id: "mac", name: "Mac", href: "/platforms/macos" },
  { id: "android", name: "Android", href: "/platforms/android" },
  { id: "cpu", name: "Linux, no GPU", href: "/deploy/cpu" },
  { id: "browser", name: "Browser (WebGPU)", href: "/platforms/web" },
  { id: "servers", name: "Your servers", href: "/deploy/self-hosted" },
  { id: "cloud", name: "bitHuman cloud", href: "/deploy/cloud" },
  { id: "offline", name: "Fully offline", href: "/deploy/offline" },
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
    offline: { ok: false, how: "Coming later" },
  },
  "expression-2": {
    ios: { ok: true, how: "Swift package, `Expression2`" },
    mac: { ok: true, how: "Swift package (macOS 13), CLI, Python" },
    android: { ok: true, how: "`expression2-android`" },
    cpu: { ok: true, how: "CLI, Python" },
    browser: { ok: true, how: "`render=local`" },
    servers: { ok: true, how: "CLI, Python, LiveKit plugin" },
    cloud: { ok: true, how: "web embed, REST API, LiveKit" },
    offline: { ok: false, how: "Coming later" },
  },
  "essence-1": {
    ios: no,
    mac: { ok: true, how: "CLI (`run`), Python" },
    android: no,
    cpu: { ok: true, how: "CLI (`run`), Python" },
    browser: { ok: true, how: "`render=local`" },
    servers: { ok: true, how: "CLI (`run`), Python" },
    cloud: { ok: true, how: "web embed, REST API, LiveKit" },
    offline: { ok: false, how: "Coming with bitHuman 2.11.16: Linux x86_64, Business & Enterprise" },
  },
  "expression-1": {
    ios: no, mac: no, android: no, cpu: no, browser: no, servers: no,
    cloud: { ok: true, how: "web embed, REST API, LiveKit" },
    offline: no,
  },
};
