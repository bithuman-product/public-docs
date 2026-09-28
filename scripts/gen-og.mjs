#!/usr/bin/env node
// After `astro build`: one Open Graph card per page (1200×630 JPEG), the page's
// title and description beside a sample avatar, written to dist/og/<page>.jpg.
// Every page's <meta property="og:image"> already names that file
// (src/layouts/Base.astro), so this script renders exactly the cards the built
// pages ask for and fails when one is missing.
//
// Text is drawn from bundled Roboto (@fontsource/roboto), not system fonts, so
// the cards are the same on every build machine. The avatars are the two public
// sample avatars (scripts/og/*.jpg, from public/images/demo): Essence 2 on
// Essence 2 pages, Expression 2 on Expression 2 pages, otherwise alternating by
// page so a feed of links does not repeat one face.
//
//   node scripts/gen-og.mjs [--dist dist] [--only /platforms/ios]
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
const AVATAR = {
  "essence-2": { src: dataUri(join(ROOT, "scripts/og/sofia-ramirez.jpg"), "image/jpeg"), label: "Essence 2 · sofia-ramirez" },
  "expression-2": { src: dataUri(join(ROOT, "scripts/og/wise-pup.jpg"), "image/jpeg"), label: "Expression 2 · wise-pup" },
};
const MARK = dataUri(join(ROOT, "public/bithuman-mark.png"), "image/png");

// the light theme's tokens (src/styles/tokens.css)
const C = { bg: "#ffffff", surface: "#f7f7f8", border: "#e3e3e8", text: "#1d1d22", muted: "#5d5d6b", primary: "#d32933", soft: "#fff1ef" };

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
const meta = (html, re) => decode(re.exec(html)?.[1] ?? "");

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : n === "index.html" ? [p] : [];
});

function pickAvatar(path, i) {
  if (/essence/.test(path)) return "essence-2";
  if (/expression/.test(path)) return "expression-2";
  return i % 2 ? "expression-2" : "essence-2";
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
      { type: "img", props: { src: AVATAR[avatar].src, width: 320, height: 400, style: { borderRadius: 28, objectFit: "cover", boxShadow: "0 12px 40px rgba(29,29,34,0.18)" } } },
      h("div", { display: "flex", marginTop: 22, fontSize: 22, color: C.muted, fontWeight: 500 }, AVATAR[avatar].label),
    ]),
  ]);
}

const clip = (s, n) => (s.length > n ? s.slice(0, s.lastIndexOf(" ", n - 1)).replace(/[,;:·–—-]\s*$/, "") + "…" : s);

let made = 0;
const missing = [];
const pages = walk(DIST).sort();
for (const [i, file] of pages.entries()) {
  const html = readFileSync(file, "utf8");
  const og = /<meta property="og:image" content="https:\/\/docs\.bithuman\.ai(\/og\/[^"]+\.jpg)"/.exec(html)?.[1];
  if (!og) continue;
  const path = "/" + relative(DIST, dirname(file)).replace(/\\/g, "/");
  if (ONLY && path !== ONLY) continue;
  const title = meta(html, /<meta property="og:title" content="([^"]*)"/).replace(/\s*[|·—–-]\s*bitHuman Docs$/i, "");
  const description = clip(meta(html, /<meta property="og:description" content="([^"]*)"/), 150);
  const eyebrow = meta(html, /data-pagefind-filter="section:([^"]+)"/) || (path === "/" ? "" : "Docs");
  const svg = await satori(card({ eyebrow, title: clip(title, 90), description, avatar: pickAvatar(path, i) }), { width: 1200, height: 630, fonts: FONTS });
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
