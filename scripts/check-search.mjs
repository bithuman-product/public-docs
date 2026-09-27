#!/usr/bin/env node
// Search acceptance (docs spec §2.5): the words developers type land on the
// right page first. Runs the built Pagefind index in Node, the same index and
// ranking the ⌘K dialog uses. The table is cumulative: a wave adds its rows.
//
//   node scripts/check-search.mjs   # after npm run build (dist/pagefind)
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");

/** query -> the page that must be the first result (and the wave that added it). */
export const QUERIES = [
  { q: "quickstart", top: "/start", wave: "W1" },
  { q: "Swift", top: "/platforms/ios", wave: "W1" },
  { q: "pricing", top: "/pricing", wave: "W1" },
  { q: "self-host", top: "/deploy/self-hosted", wave: "W1" },
];

if (!existsSync(join(DIST, "pagefind/pagefind.js"))) { console.log("::error::no dist/pagefind — run npm run build first"); process.exit(2); }
const srv = createServer((q, r) => {
  const p = join(DIST, decodeURIComponent(q.url.split("?")[0]));
  if (!p.startsWith(DIST) || !existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200); r.end(readFileSync(p));
});
await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
let bad = 0;
try {
  const pf = await import(join(DIST, "pagefind/pagefind.js"));
  await pf.options({ basePath: `http://127.0.0.1:${srv.address().port}/pagefind/`, baseUrl: "/" });
  await pf.init();
  const norm = (u) => (u.replace(/\/index\.html$|\.html$/, "").replace(/\/$/, "") || "/");
  for (const { q, top, wave } of QUERIES) {
    const res = await pf.search(q);
    const first = await Promise.all(res.results.slice(0, 3).map((x) => x.data()));
    const got = first.map((d) => norm(d.url.split("#")[0]));
    const ok = got[0] === top;
    if (!ok) bad++;
    console.log(`${ok ? "  ok  " : "::error::"} "${q}" -> ${got[0] ?? "(nothing)"}${ok ? "" : ` (want ${top}; top 3: ${got.join(", ")})`} [${wave}]`);
  }
} finally {
  srv.close();
}
console.log(bad ? `search: ${bad} of ${QUERIES.length} queries miss their page` : `search ok: ${QUERIES.length} queries land on their page first`);
process.exit(bad ? 1 : 0);
