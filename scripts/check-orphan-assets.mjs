#!/usr/bin/env node
// Every file in public/ is referenced by something the site serves: a built
// page, a markdown twin, an llms file, a feed, a stylesheet or a script. A file
// nobody references is dead weight in every deploy and a URL nobody maintains.
// Run after `npm run build`:
//
//   node scripts/check-orphan-assets.mjs            # fail on an orphan
//   node scripts/check-orphan-assets.mjs --selftest # the rule fires on a fixture
//
// A few files are fetched by URL convention rather than linked (robots.txt,
// favicon.ico, the OpenAPI spec and performance.json, which tools and agents
// request by name); they are listed in ENTRY_POINTS with the reason.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ENTRY_POINTS = new Map([
  ["/robots.txt", "crawlers request it by name"],
  ["/favicon.ico", "browsers request it by name"],
  ["/performance.json", "the performance emitter's contract; agents and the CI gates fetch it by URL"],
  ["/api/openapi.yaml", "API tools fetch the spec by URL (linked from the API pages too)"],
]);

const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);

/** The public files no served text names. `served` is the concatenated text. */
export function orphans(publicFiles, served) {
  return publicFiles.filter((url) => {
    if (ENTRY_POINTS.has(url)) return false;
    const variants = [url, encodeURI(url), url.slice(1)];
    return !variants.some((v) => served.includes(v));
  });
}

function selftest() {
  const served = '<img src="/images/a.webp"> <a href="/skills/x/SKILL.md">x</a> url(/fonts/b.woff2)';
  const found = orphans(["/images/a.webp", "/skills/x/SKILL.md", "/fonts/b.woff2", "/images/stale.jpg", "/robots.txt"], served);
  const ok = found.length === 1 && found[0] === "/images/stale.jpg";
  console.log(ok ? "selftest GREEN (an unreferenced file fires; referenced files and entry points stay quiet)" : `selftest RED: ${JSON.stringify(found)}`);
  return ok ? 0 : 1;
}

function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const dist = join(ROOT, "dist");
  if (!existsSync(join(dist, "index.html"))) { console.log("::error::no dist/ — run npm run build first"); return 2; }
  const pub = join(ROOT, "public");
  const files = walk(pub).map((f) => "/" + relative(pub, f).replace(/\\/g, "/"));
  const text = walk(dist)
    .filter((f) => /\.(html|md|txt|xml|json|css|js|mjs|webmanifest|vtt)$/.test(f) && !f.includes(`${join("dist", "pagefind")}`) && !f.endsWith("docs-mcp-index.json"))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  const bad = orphans(files, text);
  for (const f of bad) console.log(`::error file=public${f}::public${f} is referenced by no built page, twin, llms file, feed, stylesheet or script. Link it or delete it (and redirect its URL).`);
  console.log(bad.length ? `orphan assets: ${bad.length} of ${files.length} public files are unreferenced` : `orphan assets ok: all ${files.length} public files are referenced (${ENTRY_POINTS.size} by URL convention)`);
  return bad.length ? 1 : 0;
}
process.exit(main());
