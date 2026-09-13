#!/usr/bin/env node
// NO INTERNAL COMMENTARY REACHES A READER.
//
// ★MEASURED 2026-09-13, live: docs.bithuman.ai/start served this to every
// visitor, inside an HTML comment in the page source —
//
//     <!-- The two pages that actually end in a rendered frame on a handset.
//          Before 2026-09-09 the served bytes of this page linked NEITHER, so a
//          reader who clicked "Start building" for a phone had nowhere to land:
//          the finished thing existed and could not be reached. -->
//
// — an internal post-mortem about our own delivery failure, addressed to us,
// shipped to customers. It had been there since 2026-09-09. Nothing caught it,
// because every other guard on this site reads the SOURCE or reads RENDERED
// TEXT, and an HTML comment is neither: it survives the build untouched and is
// invisible in the page a human reviews.
//
// ★THE RULE THAT WOULD HAVE CAUGHT IT, and why it is two rules and not one.
// Astro emits `<!-- ... -->` verbatim and strips `{/* ... */}`. So the fix for
// any comment meant for us is to write it as an Astro comment; anything left as
// HTML is, by construction, addressed to the reader. Two rules grade what is
// left:
//
//   R1 INTERNAL MARKER — a comment carrying a date, a ★, a TODO, or one of the
//      process words this estate writes when it is talking to itself. This is
//      the rule that catches the defect above (it carries `2026-09-09` AND
//      `served bytes`).
//   R2 LENGTH — a comment longer than MAX_CHARS. A marker for a human reading
//      the HTML is short ("sidebar", "Open Graph"); commentary is long. This is
//      the rule that catches the NEXT one, which will not use any word R1 knows.
//
// ★MEASURED on this site the same day, after the source was cleaned: exactly 3
// HTML comments survive the build outside <pre>/<code>, the longest 44 chars.
// MAX_CHARS is 80 — headroom for a genuine short marker, far under the 230 the
// live defect ran to. If a legitimate comment ever needs more than 80 chars,
// that is the moment to ask whether the reader needed it at all: the answer is
// almost always to write it as `{/* ... */}` and ship nothing.
//
// A comment inside <pre>/<code> is a page DOCUMENTING HTML — the embed snippet
// on /start opens with `<!-- Paste into any page. No API key, no install. -->`
// and a developer copies it. That exclusion is armed in --self-test, with a
// negative control, so it cannot quietly grow into a blanket pass.
//
//   node scripts/check-served-comments.mjs                 # grade dist/
//   node scripts/check-served-comments.mjs --live [origin] # grade what is served
//   node scripts/check-served-comments.mjs --self-test
import fs from "node:fs";
import path from "node:path";

const MAX_CHARS = 80;

// Words this estate writes when it is talking to itself. Each is whole-word or
// anchored so ordinary prose does not trip it: `lane` must not match "plane",
// `owner` must not match "downer".
const MARKERS = [
  { name: "a date", re: /\b(19|20)\d\d-\d\d-\d\d\b/ },
  { name: "the ★ internal marker", re: /★/ },
  { name: "a code marker (TODO/FIXME/HACK/XXX)", re: /\b(TODO|FIXME|HACK|XXX)\b/ },
  { name: "an internal process word", re: /\b(post-?mortem|regression|ruling|audit|lane|owner|landed|served bytes|measured on|as shipped|we ship|our own)\b/i },
];

function commentsOutsideCode(html) {
  // A comment inside <pre>/<code> is content a developer copies, not ours.
  const body = html
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code[\s\S]*?<\/code>/gi, " ");
  return [...body.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1].trim());
}

function findings(html, where) {
  const out = [];
  for (const raw of commentsOutsideCode(html)) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const hit = MARKERS.find((m) => m.re.test(text));
    if (hit) {
      out.push({ where, rule: "R1", why: `the comment carries ${hit.name} — this reads as a note to ourselves, not to the reader`, text });
    } else if (text.length > MAX_CHARS) {
      out.push({ where, rule: "R2", why: `the comment is ${text.length} chars, over the ${MAX_CHARS} a reader-facing marker needs — commentary is long, markers are short`, text });
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
      if (e.isDirectory()) { if (e.name !== "pagefind") walk(f, `${rel}/${e.name}`); }
      else if (e.name === "index.html") routes.push([rel || "/", f]);
    }
  })(root, "");
  return routes;
}

const REMEDY =
  "how to fix: this is a note to ourselves in bytes we ship. Write it as an Astro\n" +
  "  comment — `{/* ... */}` in a .astro template — which the build strips, or delete\n" +
  "  it. Do NOT raise MAX_CHARS or soften a marker to make this pass: the number was\n" +
  "  measured against a clean site, and the defect this guard exists for ran to 230\n" +
  "  chars and named a date.";

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--self-test") {
    let bad = 0;
    const arm = (label, cond) => { console.log(`  ${cond ? "ok  " : "FAIL"} ${label}`); if (!cond) bad++; };

    arm("a clean page is green",
        findings("<p>Ordinary.</p><!-- sidebar --><!-- Open Graph -->", "x").length === 0);

    // ★THE LIVE DEFECT, verbatim from dist/start/index.html on 2026-09-13.
    const live = `<div><!-- The two pages that actually end in a rendered frame on a handset.
         Before 2026-09-09 the served bytes of this page linked NEITHER, so a
         reader who clicked "Start building" for a phone had nowhere to land:
         the finished thing existed and could not be reached. --></div>`;
    arm("★the LIVE defect is caught", findings(live, "/start").length === 1);
    arm("★...and it is caught by the MARKER rule, not only by length",
        findings(live, "/start")[0].rule === "R1");

    arm("a date alone fires", findings("<!-- shipped 2026-09-09 -->", "x")[0]?.rule === "R1");
    arm("a ★ alone fires", findings("<!-- ★ this one matters -->", "x")[0]?.rule === "R1");
    arm("a TODO alone fires", findings("<!-- TODO: come back to this -->", "x")[0]?.rule === "R1");
    arm("an internal process word alone fires",
        findings("<!-- kept because of the owner ruling -->", "x")[0]?.rule === "R1");

    // R2 must stand on its own — the next leak will not use a word R1 knows.
    const longNeutral = "<!-- " + "a".repeat(MAX_CHARS + 1) + " -->";
    arm(`★a long comment with NO marker still fires (${MAX_CHARS + 1} chars)`,
        findings(longNeutral, "x")[0]?.rule === "R2");
    arm(`a comment of exactly ${MAX_CHARS} chars is allowed`,
        findings("<!-- " + "a".repeat(MAX_CHARS) + " -->", "x").length === 0);

    // Whole-word anchoring: ordinary prose must not trip the process words.
    arm("`plane` does not fire the `lane` marker",
        findings("<!-- the plane strip -->", "x").length === 0);

    // The <pre>/<code> exclusion, and its negative control.
    arm("a comment a page DOCUMENTS in <code> is left alone",
        findings("<p>Write <code>&lt;!-- TODO 2026-01-01 --&gt;</code></p><code><!-- TODO 2026-01-01 --></code>", "x").length === 0);
    arm("...and in <pre> too",
        findings("<pre><!-- TODO 2026-01-01 --></pre>", "x").length === 0);
    arm("★a comment AFTER a code block is still graded (the exclusion is not a page-wide pass)",
        findings("<pre>fine</pre><!-- TODO 2026-01-01 -->", "x").length === 1);

    arm("the finding says WHERE and WHY",
        (() => { const f = findings("<!-- TODO x -->", "/start")[0];
                 return f.where === "/start" && /note to ourselves/.test(f.why); })());

    console.log(bad ? `\nFAILED — ${bad} arm(s)` : `\nPASSED — 0 failure(s), ${MARKERS.length + 1} rules each proved able to fire`);
    process.exit(bad ? 1 : 0);
  }

  let pages = [];
  const routes = distRoutes();
  if (!routes.length) {
    console.error("CANNOT MEASURE: no dist/ — run `npm run build` first");
    process.exit(2);
  }
  if (args[0] === "--live") {
    const origin = (args[1] || "https://docs.bithuman.ai").replace(/\/$/, "");
    for (const [rel] of routes) {
      try {
        const r = await fetch(`${origin}${rel === "/" ? "/" : rel}`, { redirect: "follow" });
        if (r.status === 200) pages.push([rel, await r.text()]);
      } catch { /* a route not live yet is the freshness gate's subject, not this one */ }
    }
    if (!pages.length) { console.error("CANNOT MEASURE: no page fetched 200"); process.exit(2); }
    console.log(`graded ${pages.length} page(s) served by ${origin}`);
  } else {
    pages = routes.map(([rel, f]) => [rel, fs.readFileSync(f, "utf8")]);
    console.log(`graded ${pages.length} page(s) in dist/`);
  }

  // ★CORPUS CONTROL. A regex that stopped matching, or a build that emitted no
  // comments at all, would read green here for the wrong reason. This site
  // serves a handful of legitimate short comments; zero means the reader broke.
  const seen = pages.reduce((n, [, html]) => n + commentsOutsideCode(html).length, 0);
  if (seen === 0) {
    console.error("REFUSING TO PASS VACUOUSLY — 0 HTML comments found in any page outside <pre>/<code>.");
    console.error("  This site serves a few short ones (the emitter's note markers on /sdk/performance).");
    console.error("  Zero means the comment reader or the build stopped producing what this grades.");
    process.exit(2);
  }

  const all = pages.flatMap(([rel, html]) => findings(html, rel));
  if (!all.length) {
    console.log(`PASSED — ${seen} HTML comment(s) reach a reader, none of them a note to ourselves`);
    process.exit(0);
  }
  console.error(`FAILED — ${all.length} internal comment(s) reach a reader:`);
  for (const f of all) {
    console.error(`  ${f.where} [${f.rule}]`);
    console.error(`    ${f.why}`);
    console.error(`    <!-- ${f.text.slice(0, 160)}${f.text.length > 160 ? " …" : ""} -->`);
  }
  console.error(`  ${REMEDY}`);
  process.exit(1);
}

main();
