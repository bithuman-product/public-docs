#!/usr/bin/env node
// Docs v2 (SPEC §2 "Noise per page", §8): REPORT-ONLY. Counts, on the built pages in
// headless Chrome, the visual vocabulary a reader sees: UI colours (text, fills,
// borders), font sizes, size/weight combinations and corner radii, and flags a
// horizontal scroll. Budget: ≤10 colours, ≤6 sizes, ≤9 combinations, ≤4 radii.
// Code blocks, media and hidden elements are not counted. Always exits 0 (it never
// fails the build); a page over budget prints a ::warning.
//
//   node scripts/noise-audit.mjs [--pages /,/start] [--widths 1440,390]
// Chrome: $CHROME_PATH, else google-chrome / chromium on PATH. None → skipped.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { join, extname } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PAGES = flag("--pages", "/,/start,/platforms/python,/build/voice-agent,/pricing,/api/agents").split(",");
const WIDTHS = flag("--widths", "1440,1024,390").split(",").map(Number);
const SCHEMES = ["light", "dark"];
const BUDGET = { colours: 10, sizes: 6, combos: 9, radii: 4 };

if (!existsSync(join(DIST, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); process.exit(2); }
const chrome = process.env.CHROME_PATH || ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].find((c) => {
  try { execFileSync("which", [c], { stdio: "ignore" }); return true; } catch { return false; }
});
if (!chrome) { console.log("noise-audit: skipped (no Chrome on this host)"); process.exit(0); }

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4" };
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(f)] ?? "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), "noise-audit-"));
const proc = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--password-store=basic", "--use-mock-keychain", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, CUDA_VISIBLE_DEVICES: "" } });
const wsUrl = await new Promise((resolve, reject) => {
  let err = "";
  const t = setTimeout(() => reject(new Error("Chrome did not start")), 20000);
  proc.stderr.on("data", (d) => { err += d; const m = /DevTools listening on (ws:\S+)/.exec(err); if (m) { clearTimeout(t); resolve(m[1]); } });
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map(), waiters = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else for (const w of waiters.splice(0)) w(m);
});
const send = (method, params = {}, sessionId) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const until = (pred, ms = 20000) => new Promise((resolve) => {
  const t = setTimeout(() => resolve(null), ms);
  const hook = (m) => { if (pred(m)) { clearTimeout(t); resolve(m); } else waiters.push(hook); };
  waiters.push(hook);
});

const MEASURE = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const c = getComputedStyle(e); return c.visibility !== 'hidden' && c.display !== 'none' && c.opacity !== '0'; };
  const skip = (e) => e.closest('pre, svg, img, video, iframe, canvas, [aria-hidden="true"], .sr-only, .visually-hidden, [data-agent-hint]');
  const colours = new Set(), sizes = new Set(), combos = new Set(), radii = new Set();
  const norm = (c) => c.replace(/\\s+/g, '');
  const transparent = (c) => /rgba\\(0,0,0,0\\)|transparent/.test(norm(c));
  for (const e of document.querySelectorAll('body *')) {
    if (skip(e) || !vis(e)) continue;
    const c = getComputedStyle(e);
    if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) { colours.add(norm(c.color)); sizes.add(c.fontSize); combos.add(c.fontSize + '/' + c.fontWeight); }
    if (!transparent(c.backgroundColor)) colours.add(norm(c.backgroundColor));
    for (const s of ['Top', 'Right', 'Bottom', 'Left'])
      if (parseFloat(c['border' + s + 'Width']) > 0 && c['border' + s + 'Style'] !== 'none' && !transparent(c['border' + s + 'Color'])) colours.add(norm(c['border' + s + 'Color']));
    const r = c.borderTopLeftRadius;
    if (r && r !== '0px' && !r.endsWith('%')) radii.add(r);
  }
  return JSON.stringify({ colours: colours.size, sizes: sizes.size, combos: combos.size, radii: radii.size, hscroll: document.documentElement.scrollWidth > innerWidth + 1 });
})()`;

let over = 0, runs = 0;
try {
  const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  for (const page of PAGES) for (const width of WIDTHS) for (const scheme of SCHEMES) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 }, sessionId);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] }, sessionId);
    const loaded = until((m) => m.method === "Page.loadEventFired" && m.sessionId === sessionId);
    await send("Page.navigate", { url: base + page }, sessionId);
    await loaded;
    await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true }, sessionId);
    const r = await send("Runtime.evaluate", { expression: MEASURE, returnByValue: true }, sessionId);
    const m = JSON.parse(r.result?.result?.value ?? "{}");
    runs++;
    const bad = Object.entries(BUDGET).filter(([k, v]) => m[k] > v).map(([k, v]) => `${k} ${m[k]} > ${v}`);
    if (m.hscroll) bad.push("horizontal scroll");
    if (bad.length) { over++; console.log(`::warning::noise ${page} ${width} ${scheme}: ${bad.join(", ")}`); }
    else console.log(`  ok ${page} ${width} ${scheme}: colours ${m.colours}, sizes ${m.sizes}, combos ${m.combos}, radii ${m.radii}`);
  }
} finally {
  ws.close(); proc.kill("SIGKILL"); server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
console.log(`noise-audit (report-only): ${runs} page views, ${over} over the noise budget`);
process.exit(0);
