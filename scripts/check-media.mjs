#!/usr/bin/env node
// Real captures stay light, silent until asked and captioned (docs spec §4.3).
//
// Every capture in src/data/examples.ts is a set of files in
// public/examples/<id>/, and every file there belongs to a capture:
//
//   poster.avif + poster.webp  a still, at most 480 px wide, the capture's
//                              aspect ratio; AVIF ≤ 60 KB, WebP ≤ 80 KB
//   loop.av1.mp4 + loop.mp4    a muted loop (no sound track), ≤ 300 KB each
//   clip.mp4 + clip.vtt        the recording with sound (a sound track) and
//                              WebVTT captions with at least one cue, ≤ 1 MB
//
// When dist/ is built it also reads every page: each <video> waits for a
// click or the screen (preload="none"), nothing autoplays with sound, and no
// page ships a live-demo iframe (they are created on click).
//
//   node scripts/check-media.mjs            # the captures, and dist/ when built
//   node scripts/check-media.mjs --selftest
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");
const PUB = join(ROOT, "public/examples");
const KB = 1024;
export const BUDGET = { "poster.avif": 60 * KB, "poster.webp": 80 * KB, "loop.av1.mp4": 300 * KB, "loop.mp4": 300 * KB, "clip.mp4": 1024 * KB, "clip.vtt": 8 * KB };

/** Width and height of a WebP (VP8, VP8L or VP8X), or null. */
export function webpSize(b) {
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8L") { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  if (kind === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  return null;
}

/** The handler types of an MP4's tracks ("vide", "soun"), read from its hdlr boxes. */
export function mp4Handlers(b) {
  const out = [];
  for (let i = b.indexOf("hdlr"); i >= 0; i = b.indexOf("hdlr", i + 4)) out.push(b.toString("ascii", i + 12, i + 16));
  return out;
}

/** The number of cues in a WebVTT file, or -1 when it is not one. */
export function vttCues(text) {
  if (!/^\uFEFF?WEBVTT/.test(text)) return -1;
  return (text.match(/^\d\d:\d\d:\d\d\.\d{3} --> \d\d:\d\d:\d\d\.\d{3}/gm) ?? []).length;
}

/** Faults for one capture, given a reader for its files (name → Buffer | null). */
export function gradeCapture(c, read) {
  const faults = [];
  const want = ["poster.avif", "poster.webp", ...(c.loop ? ["loop.av1.mp4", "loop.mp4"] : []), ...(c.clip ? ["clip.mp4", "clip.vtt"] : [])];
  for (const name of want) {
    const b = read(name);
    if (!b) { faults.push(`${c.id}/${name} is missing`); continue; }
    if (b.length > BUDGET[name]) faults.push(`${c.id}/${name} is ${Math.round(b.length / KB)} KB, over its ${BUDGET[name] / KB} KB budget`);
    if (name === "poster.webp") {
      const s = webpSize(b);
      if (!s) faults.push(`${c.id}/poster.webp is not a WebP`);
      else {
        if (s.w > 480) faults.push(`${c.id}/poster.webp is ${s.w} px wide (at most 480)`);
        if (Math.abs(s.w / s.h - c.width / c.height) > 0.02) faults.push(`${c.id}/poster.webp is ${s.w}×${s.h}, not the capture's ${c.width}:${c.height}`);
      }
    }
    if (name.startsWith("loop") && mp4Handlers(b).includes("soun")) faults.push(`${c.id}/${name} has a sound track; a loop plays muted and carries none`);
    if (name === "clip.mp4" && !mp4Handlers(b).includes("soun")) faults.push(`${c.id}/clip.mp4 has no sound track; a still recording belongs in the loop`);
    if (name === "clip.vtt" && vttCues(b.toString("utf8")) < 1) faults.push(`${c.id}/clip.vtt is not WebVTT with at least one cue`);
  }
  return faults;
}

/** Faults in one built page's HTML. */
export function gradeHtml(html) {
  const faults = [];
  for (const m of html.matchAll(/<video\b[^>]*>/g)) {
    const tag = m[0];
    if (!/preload="none"/.test(tag)) faults.push(`a <video> without preload="none": ${tag.slice(0, 100)}`);
    if (/\sautoplay\b/.test(tag) && !/\smuted\b/.test(tag)) faults.push(`a <video> that autoplays with sound: ${tag.slice(0, 100)}`);
  }
  for (const m of html.matchAll(/<iframe\b[^>]*\bsrc="[^"]*\/embed\/[^"]*"[^>]*>/g)) faults.push(`a live-demo iframe in the page (create it on click): ${m[0].slice(0, 100)}`);
  return faults;
}

const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);

function selftest() {
  let bad = 0;
  const ok = (name, cond) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) bad++; };
  const webp = (w, h) => { const b = Buffer.alloc(30); b.write("RIFF", 0); b.write("WEBP", 8); b.write("VP8 ", 12); b.writeUInt16LE(w, 26); b.writeUInt16LE(h, 28); return b; };
  const mp4 = (...h) => Buffer.from(h.map((t) => "\0\0\0\x21hdlr\0\0\0\0\0\0\0\0" + t).join(""), "latin1");
  const vtt = Buffer.from("WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello.\n");
  const c = { id: "x", width: 480, height: 854, loop: true, clip: { seconds: 2 } };
  const files = { "poster.avif": Buffer.alloc(10), "poster.webp": webp(480, 854), "loop.av1.mp4": mp4("vide"), "loop.mp4": mp4("vide"), "clip.mp4": mp4("vide", "soun"), "clip.vtt": vtt };
  const with_ = (over) => (n) => (n in over ? over[n] : files[n]);
  ok("a complete capture passes", gradeCapture(c, with_({})).length === 0);
  ok("a missing caption file fires", gradeCapture(c, with_({ "clip.vtt": null })).some((f) => f.includes("missing")));
  ok("a loop with sound fires", gradeCapture(c, with_({ "loop.mp4": mp4("vide", "soun") })).some((f) => f.includes("sound track")));
  ok("a clip with no sound fires", gradeCapture(c, with_({ "clip.mp4": mp4("vide") })).some((f) => f.includes("no sound")));
  ok("a wide poster fires", gradeCapture(c, with_({ "poster.webp": webp(960, 1708) })).some((f) => f.includes("480")));
  ok("a poster of another shape fires", gradeCapture(c, with_({ "poster.webp": webp(480, 480) })).some((f) => f.includes("not the capture")));
  ok("a heavy loop fires", gradeCapture(c, with_({ "loop.av1.mp4": Buffer.concat([mp4("vide"), Buffer.alloc(301 * KB)]) })).some((f) => f.includes("budget")));
  ok("captions with no cue fire", gradeCapture(c, with_({ "clip.vtt": Buffer.from("WEBVTT\n") })).some((f) => f.includes("cue")));
  ok("a still with no loop passes without loop files", gradeCapture({ ...c, loop: false, clip: undefined }, with_({ "loop.mp4": null, "loop.av1.mp4": null, "clip.mp4": null, "clip.vtt": null })).length === 0);
  ok("a video that preloads fires", gradeHtml('<video src="a.mp4" controls>').length === 1);
  ok("a video that autoplays with sound fires", gradeHtml('<video preload="none" autoplay src="a.mp4">').length === 1);
  ok("a muted loop passes", gradeHtml('<video class="fig-loop" muted playsinline loop preload="none">').length === 0);
  ok("a live-demo iframe in the page fires", gradeHtml('<iframe src="https://www.bithuman.ai/embed/A1" allow="microphone">').length === 1);
  console.log(bad ? "selftest RED" : "selftest GREEN (every rule fired)");
  return bad ? 1 : 0;
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const { CAPTURES } = await import(pathToFileURL(join(ROOT, "src/data/examples.ts")).href);
  const faults = [];
  const named = new Set();
  for (const c of Object.values(CAPTURES)) {
    const read = (name) => { const f = join(PUB, c.id, name); named.add(f); return existsSync(f) ? readFileSync(f) : null; };
    faults.push(...gradeCapture(c, read));
  }
  for (const f of walk(PUB)) if (!named.has(f)) faults.push(`${relative(ROOT, f)} belongs to no capture in src/data/examples.ts`);
  const dist = join(ROOT, "dist");
  let pages = 0;
  if (existsSync(join(dist, "index.html"))) {
    for (const f of walk(dist).filter((f) => f.endsWith(".html"))) {
      pages++;
      for (const x of gradeHtml(readFileSync(f, "utf8"))) faults.push(`${relative(dist, f)}: ${x}`);
    }
  }
  for (const f of faults) console.log(`::error::${f}`);
  const n = Object.keys(CAPTURES).length;
  console.log(faults.length ? `media: ${faults.length} finding(s)` : `media ok: ${n} captures within budget, no stray files${pages ? `; ${pages} built pages load video on demand` : ""}`);
  return faults.length ? 1 : 0;
}
process.exit(await main());
