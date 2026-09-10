#!/usr/bin/env node
// No UNRENDERED AUTHORING MARKUP reaches a reader.
//
// ★MEASURED 2026-09-10, live: four pages served 10 literal `:::` markers to
// customers — `:::caution[...]` written as a Starlight-style admonition on a
// site whose Astro config has NO remark-directive plugin, so the marker is
// just text. Two of them were the BILLING warning that reading `essence_cloud`
// for an Essence 2 agent over-estimates remaining minutes by 2x-4x: the
// emphasis a caution box exists to give was not merely absent, the page looked
// broken around the sentence that mattered most.
//
// It is graded on the SERVED/BUILT bytes, never on the source, because the
// source is where the marker looks correct. A `:::` inside <pre>/<code> is a
// page DOCUMENTING the syntax and is left alone — the arm for that is in
// --self-test, so the exclusion cannot quietly grow into a blanket pass.
//
//   node scripts/check-served-markup.mjs                 # grade dist/
//   node scripts/check-served-markup.mjs --live [origin] # grade what is served
//   node scripts/check-served-markup.mjs --self-test
import fs from "node:fs";
import path from "node:path";

// Markup this site cannot render. Each entry: a name, a test, and what a
// reader sees instead.
const PATTERNS = [
  { name: "directive/admonition (`:::`)",
    re: /:::/g,
    why: "this site has no remark-directive plugin, so `:::caution[...]` is served as literal text" },
  { name: "unclosed MDX expression (`{@`)",
    re: /\{@/g,
    why: "an MDX expression that survives to the HTML was never evaluated" },
];

function bodyText(html) {
  // Drop code and pre: a page may legitimately DOCUMENT this markup.
  return html
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code[\s\S]*?<\/code>/gi, " ");
}

function findings(html, where) {
  const body = bodyText(html);
  const out = [];
  for (const p of PATTERNS) {
    const hits = body.match(p.re);
    if (hits && hits.length) {
      const i = body.search(p.re);
      const snip = body.slice(Math.max(0, i - 60), i + 90)
        .replace(/\s+/g, " ").trim();
      out.push({ where, name: p.name, count: hits.length, why: p.why, snip });
    }
  }
  return out;
}

function distRoutes() {
  const root = new URL("../dist", import.meta.url).pathname;
  const routes = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f, `${rel}/${e.name}`);
      else if (e.name === "index.html") routes.push([rel || "/", f]);
    }
  })(root, "");
  return routes;
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--self-test") {
    let bad = 0;
    const arm = (label, cond) => {
      console.log(`  ${cond ? "ok  " : "FAIL"} ${label}`);
      if (!cond) bad++;
    };
    const clean = "<p>A perfectly ordinary page.</p><blockquote><p>A caution.</p></blockquote>";
    arm("a clean page is green", findings(clean, "x").length === 0);
    arm("★the LIVE defect is caught: a served `:::caution[...]`",
        findings("<p>:::caution[Read this]</p><p>body</p>:::", "x")
          .some(f => f.name.startsWith("directive")));
    arm("the count is the number of markers, not of pages",
        findings("<p>:::caution</p><p>:::</p>", "x")[0].count === 2);
    arm("a page DOCUMENTING the syntax in <code> is left alone",
        findings("<p>Write <code>:::caution</code> like so.</p>", "x").length === 0);
    arm("...and in <pre> too",
        findings("<pre>:::caution\nbody\n:::</pre>", "x").length === 0);
    arm("an unevaluated MDX expression is caught",
        findings("<p>{@render x()}</p>", "x").some(f => f.name.startsWith("unclosed")));
    // ★the exclusion must not be a blanket pass: prose AFTER a code block
    // still counts, or one <code> anywhere would disarm the whole page.
    arm("★prose after a code block is still graded (the exclusion is not a page-wide pass)",
        findings("<pre>fine</pre><p>:::caution[x]</p>", "x").length === 1);
    arm("the finding says WHERE and WHY",
        (() => { const f = findings("<p>:::x</p>", "/guides/pricing")[0];
                 return f.where === "/guides/pricing" && f.why.includes("directive"); })());
    console.log(bad ? `\nFAILED — ${bad} arm(s)` : "\nPASSED — 0 failure(s)");
    process.exit(bad ? 1 : 0);
  }

  let pages = [];
  if (args[0] === "--live") {
    const origin = (args[1] || "https://docs.bithuman.ai").replace(/\/$/, "");
    const routes = distRoutes();
    if (!routes.length) {
      console.error("CANNOT MEASURE: no dist/ — run `npm run build` first");
      process.exit(2);
    }
    for (const [rel] of routes) {
      const url = `${origin}${rel === "/" ? "/" : rel}`;
      try {
        const r = await fetch(url, { redirect: "follow" });
        if (r.status === 200) pages.push([rel, await r.text()]);
      } catch { /* a route not live yet is the freshness gate's subject, not this one */ }
    }
    if (!pages.length) { console.error("CANNOT MEASURE: no page fetched 200"); process.exit(2); }
    console.log(`graded ${pages.length} page(s) served by ${origin}`);
  } else {
    const routes = distRoutes();
    if (!routes.length) {
      console.error("CANNOT MEASURE: no dist/ — run `npm run build` first");
      process.exit(2);
    }
    pages = routes.map(([rel, f]) => [rel, fs.readFileSync(f, "utf8")]);
    console.log(`graded ${pages.length} page(s) in dist/`);
  }

  const all = pages.flatMap(([rel, html]) => findings(html, rel));
  if (!all.length) {
    console.log("PASSED — no unrendered authoring markup reaches a reader");
    process.exit(0);
  }
  console.error(`FAILED — ${all.length} finding(s):`);
  for (const f of all) {
    console.error(`  ${f.where}: ${f.count}x ${f.name}`);
    console.error(`    ${f.why}`);
    console.error(`    ...${f.snip}...`);
  }
  process.exit(1);
}

main();
