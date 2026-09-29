#!/usr/bin/env node
// After `astro build`: one Open Graph card per page (1200×630 JPEG), the page's
// title and description beside a sample avatar, written to dist/og/<page>.jpg.
// Every page's <meta property="og:image"> already names that file
// (src/layouts/Base.astro), so this script renders exactly the cards the built
// pages ask for and fails when one is missing.
//
// Text is drawn from bundled Roboto (@fontsource/roboto), not system fonts, so
// the cards are the same on every build machine. The avatar is one of the
// allowlisted showcase characters in scripts/og/cast.json (a still each in
// scripts/og/<id>.jpg): an Essence 2 person on Essence 2 pages, an Expression 2
// character on Expression 2 pages, otherwise any of them (mostly Expression 2).
// The pick is a hash of the page path, so a page keeps its card from build to
// build and a feed of links does not repeat one face (owner, 2026-09-29: "I
// don't like we repeat the same image for different cards"). A child character
// never appears on a companion, dating or relationship page.
//
//   node scripts/gen-og.mjs [--dist dist] [--only /platforms/ios]
//   node scripts/gen-og.mjs --selftest   # the pick rules, without a build
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const DIST = join(ROOT, arg("--dist") ?? "dist");
const ONLY = arg("--only");
const require = createRequire(import.meta.url);
const font = (w) => readFileSync(require.resolve(`@fontsource/roboto/files/roboto-latin-${w}-normal.woff`));
const FONTS = [
  { name: "Roboto", data: font(400), weight: 400, style: "normal" },
  { name: "Roboto", data: font(500), weight: 500, style: "normal" },
  { name: "Roboto", data: font(700), weight: 700, style: "normal" },
];
const dataUri = (file, type) => `data:${type};base64,${readFileSync(file).toString("base64")}`;
const MODEL_NAME = { "essence-2": "Essence 2", "expression-2": "Expression 2" };
const CAST = JSON.parse(readFileSync(join(ROOT, "scripts/og/cast.json"), "utf8")).cast.map((c) => ({
  ...c,
  src: dataUri(join(ROOT, `scripts/og/${c.id}.jpg`), "image/jpeg"),
  label: `${MODEL_NAME[c.model]} · ${c.name}`,
}));
const MARK = dataUri(join(ROOT, "public/bithuman-mark.png"), "image/png");

// the light theme's tokens (src/styles/tokens.css)
const C = { bg: "#ffffff", surface: "#f7f7f8", border: "#e3e3e8", text: "#1d1d22", muted: "#5d5d6b", primary: "#d32933", soft: "#fff1ef" };

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
const meta = (html, re) => decode(re.exec(html)?.[1] ?? "");

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : n === "index.html" ? [p] : [];
});

// FNV-1a: a stable 32-bit hash of the page path
const hash = (s) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const GROWN_UPS_ONLY = /companion|dating|relationship|romanc|girlfriend|boyfriend/i;

function pickAvatar(path, title = "", cast = CAST) {
  const model = /essence/.test(path) ? "essence-2" : /expression/.test(path) ? "expression-2" : null;
  const pool = cast.filter((c) => (!model || c.model === model) && !(c.child && GROWN_UPS_ONLY.test(`${path} ${title}`)));
  return pool[hash(path) % pool.length];
}

const h = (type, style, children) => ({ type, props: { style, children } });

function card({ eyebrow, title, description, avatar }) {
  const size = title.length > 60 ? 54 : title.length > 36 ? 62 : 72;
  return h("div", { width: 1200, height: 630, display: "flex", background: C.bg, fontFamily: "Roboto", color: C.text }, [
    h("div", { display: "flex", flexDirection: "column", width: 740, padding: "64px 56px 56px 72px", justifyContent: "space-between" }, [
      h("div", { display: "flex", alignItems: "center", gap: 16 }, [
        { type: "img", props: { src: MARK, width: 48, height: 48, style: { borderRadius: 12 } } },
        h("div", { display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }, "bitHuman Docs"),
        eyebrow ? h("div", { display: "flex", marginLeft: 8, padding: "6px 16px", borderRadius: 999, background: C.soft, color: C.primary, fontSize: 22, fontWeight: 500 }, eyebrow) : null,
      ].filter(Boolean)),
      h("div", { display: "flex", flexDirection: "column", gap: 22 }, [
        h("div", { display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }, title),
        description ? h("div", { display: "flex", fontSize: 28, lineHeight: 1.35, color: C.muted, maxHeight: 114, overflow: "hidden" }, description) : null,
      ].filter(Boolean)),
      h("div", { display: "flex", fontSize: 24, fontWeight: 500, color: C.muted }, "docs.bithuman.ai"),
    ]),
    h("div", { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 460, background: C.surface, borderLeft: `1px solid ${C.border}` }, [
      { type: "img", props: { src: avatar.src, width: 320, height: 400, style: { borderRadius: 28, objectFit: "cover", boxShadow: "0 12px 40px rgba(29,29,34,0.18)" } } },
      h("div", { display: "flex", marginTop: 22, fontSize: 22, color: C.muted, fontWeight: 500 }, avatar.label),
    ]),
  ]);
}

const clip = (s, n) => (s.length > n ? s.slice(0, s.lastIndexOf(" ", n - 1)).replace(/[,;:·–—-]\s*$/, "") + "…" : s);

function selftest() {
  const faults = [];
  const paths = ["/", "/start", "/models/essence-2", "/models/expression-2", "/build/companion-app", "/platforms/ios", "/platforms/android", "/deploy/cloud", "/api/agents", "/pricing"];
  for (const p of paths) {
    const a = pickAvatar(p);
    if (a !== pickAvatar(p)) faults.push(`${p}: the pick is not stable`);
    if (/essence/.test(p) && a.model !== "essence-2") faults.push(`${p}: ${a.id} is not an Essence 2 character`);
    if (/expression/.test(p) && a.model !== "expression-2") faults.push(`${p}: ${a.id} is not an Expression 2 character`);
  }
  // a child character is never picked for a companion page, whatever the hash lands on
  const kids = CAST.filter((c) => c.child);
  if (!kids.length) faults.push("no child character in the cast, so the companion rule is untested");
  for (const k of kids) {
    const onlyKid = [k, { ...k, id: "grown-up", child: false }];
    for (const p of ["/build/companion-app", "/a/b", "/x"]) if (pickAvatar(p, "A companion for your users", onlyKid).child) faults.push(`${k.id} picked for a companion page`);
  }
  const general = paths.filter((p) => !/essence|expression/.test(p));
  const seen = new Set(general.map((p) => pickAvatar(p).id));
  if (seen.size < general.length / 2) faults.push(`${general.length} general pages share ${seen.size} faces: not varied`);
  console.log(faults.length ? `selftest RED:\n  ${faults.join("\n  ")}` : `selftest GREEN (${CAST.length} characters; stable, model-matched, companion-safe, varied)`);
  process.exit(faults.length ? 1 : 0);
}
if (args.includes("--selftest")) selftest();

let made = 0;
const missing = [];
const pages = walk(DIST).sort();
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const og = /<meta property="og:image" content="https:\/\/docs\.bithuman\.ai(\/og\/[^"]+\.jpg)"/.exec(html)?.[1];
  if (!og) continue;
  const path = "/" + relative(DIST, dirname(file)).replace(/\\/g, "/");
  if (ONLY && path !== ONLY) continue;
  const title = meta(html, /<meta property="og:title" content="([^"]*)"/).replace(/\s*[|·—–-]\s*bitHuman Docs$/i, "");
  const description = clip(meta(html, /<meta property="og:description" content="([^"]*)"/), 150);
  const eyebrow = meta(html, /data-pagefind-filter="section:([^"]+)"/) || (path === "/" ? "" : "Docs");
  const svg = await satori(card({ eyebrow, title: clip(title, 90), description, avatar: pickAvatar(path, title) }), { width: 1200, height: 630, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  const out = join(DIST, og);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer());
  made++;
}
// every og:image a built page names must now exist
for (const file of pages) {
  const og = /<meta property="og:image" content="https:\/\/docs\.bithuman\.ai(\/og\/[^"]+\.jpg)"/.exec(readFileSync(file, "utf8"))?.[1];
  if (og && !existsSync(join(DIST, og))) missing.push(`${relative(DIST, file)} → ${og}`);
}
if (missing.length && !ONLY) {
  for (const m of missing) console.log(`::error::no Open Graph card for ${m}`);
  process.exit(1);
}
console.log(`gen-og: ${made} Open Graph cards → dist/og/`);
