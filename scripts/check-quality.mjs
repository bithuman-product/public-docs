#!/usr/bin/env node
// G11 + G12 — PAGE QUALITY. Serves the built site (dist/) locally and runs
// Lighthouse (mobile preset) on representative pages. Lighthouse's
// accessibility category is axe-core, so a 100 there is 0 axe violations.
//
//   node scripts/check-quality.mjs [--pages / /start /sdk ...] [--perf-min 90]
//
// Fails when accessibility < 100, SEO < 100, best practices < 95, or
// performance < --perf-min (default 90; the target is 95, and a page between
// the two is reported). Needs Chrome and `npx lighthouse`.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);   // async: the static server must keep answering while Lighthouse runs

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PERF_MIN = Number(flag("--perf-min", "90"));
const pi = args.indexOf("--pages");
const PAGES = pi >= 0 ? args.slice(pi + 1).filter((a) => a.startsWith("/")) :
  ["/", "/start", "/sdk", "/sdk/python", "/api/agents", "/examples", "/performance"];

if (!existsSync(join(DIST, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); process.exit(2); }
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".md": "text/markdown", ".txt": "text/plain",
  ".woff2": "font/woff2", ".xml": "application/xml", ".yaml": "text/yaml", ".wav": "audio/wav" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = join(DIST, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  else if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(f)] ?? "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let fail = 0;
for (const page of PAGES) {
  let report;
  try {
    const { stdout } = await run("npx", ["-y", "lighthouse@12", base + page, "--quiet", "--output=json", "--output-path=stdout",
      "--only-categories=performance,accessibility,best-practices,seo", "--chrome-flags=--headless=new --no-sandbox"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
    report = JSON.parse(stdout);
  } catch (e) {
    console.log(`::error::Lighthouse could not run on ${page}: ${String(e.message).split("\n")[0]}`);
    fail++;
    continue;
  }
  const s = Object.fromEntries(Object.entries(report.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const faults = [];
  if (s.accessibility < 100) faults.push(`accessibility ${s.accessibility} < 100`);
  if (s.seo < 100) faults.push(`SEO ${s.seo} < 100`);
  if (s["best-practices"] < 95) faults.push(`best practices ${s["best-practices"]} < 95`);
  if (s.performance < PERF_MIN) faults.push(`performance ${s.performance} < ${PERF_MIN}`);
  const failing = Object.entries(report.audits)
    .filter(([, a]) => a.score !== null && a.score < 1 && ["binary"].includes(a.scoreDisplayMode))
    .map(([k]) => k);
  console.log(`${faults.length ? "FAIL" : "ok  "} ${page.padEnd(14)} perf ${s.performance} · a11y ${s.accessibility} · bp ${s["best-practices"]} · seo ${s.seo}` +
    (s.performance < 95 && !faults.length ? " (below the 95 target)" : "") + (faults.length ? ` — ${faults.join("; ")}; failing audits: ${failing.slice(0, 6).join(", ")}` : ""));
  if (faults.length) fail++;
}
server.close();
console.log(fail ? `\nG11/G12: ${fail} page(s) below the bar` : `\nG11/G12 ok: ${PAGES.length} pages`);
process.exit(fail ? 1 : 0);
