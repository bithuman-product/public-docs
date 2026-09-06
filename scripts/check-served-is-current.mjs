#!/usr/bin/env node
// Is the live site serving THIS deploy, or the one before it?
//
// WHY THIS FILE EXISTS. check-served-vocabulary.mjs grades the bytes
// docs.bithuman.ai hands a browser. That is the right subject, but it is a
// MOVING one: run it a moment too early and it grades the PREVIOUS deploy and
// prints a green that describes text nobody just changed. That is the exact
// failure the post-deploy trigger was chosen to avoid, so leaving it to timing
// would reintroduce it one layer down.
//
// ★WHY THE ALIAS AND NOT THE DEPLOYMENT URL. A GitHub deployment_status
// carries an `environment_url` — the immutable per-deploy URL — and grading it
// would remove the race entirely. Measured 2026-09-06:
//     https://public-docs-<id>-bit-human.vercel.app/          -> 302
//     Location: https://vercel.com/sso-api?url=...            (deploy protection)
//     https://docs.bithuman.ai/sdk/python/                    -> 200
// Every per-deploy URL is behind Vercel SSO, so a guard pointed at it would
// fetch zero pages and exit 2 on every single run: a permanently inert check
// that reads as "configured". The alias is both reachable and the thing a
// customer actually receives, so the alias is the subject and this file is
// what makes reading it safe.
//
// THE SIGNAL. A static page served by Vercel carries `last-modified`, and it
// moves with the build. Measured 2026-09-06 on deployment 6289185127:
//     deployment created_at            2026-09-06T04:38:00Z
//     alias last-modified              2026-09-06T04:38:35Z   (35 s later)
//     previous deployment created_at   2026-09-05T05:56:27Z   (a day earlier)
// so `last-modified >= this deployment's created_at` separates this build from
// the one before it with ~24 h of margin in that sample.
//
// KNOWN SLACK, STATED RATHER THAN DISCOVERED LATER. This asserts that the
// alias is serving something built no earlier than this deployment — not that
// it is serving this exact commit. Nothing Vercel returns to an anonymous
// client names a commit, and asking the Vercel API for the alias target would
// mean a new secret in this repo. If a redeploy of byte-identical source ever
// reuses a cached build and leaves `last-modified` behind the new deployment's
// created_at, this exits 1 with the two timestamps printed; that is a visible
// stop, never a silent pass over the previous deploy.
//
// EXIT 0 fresh · 1 still stale after the budget · 2 cannot measure

const HELP = `usage:
  check-served-is-current.mjs --origin <url> --not-before <ISO8601> [--budget-seconds N]
  check-served-is-current.mjs --self-test`;

// ── the two primitives. Pure, so the self-test grades the same code the real
//    run does rather than a paraphrase of it. ─────────────────────────────────
export function assess(lastModified, notBefore) {
  if (lastModified === null || lastModified === undefined) return "no-signal";
  const lm = new Date(lastModified).getTime();
  const nb = new Date(notBefore).getTime();
  if (Number.isNaN(lm) || Number.isNaN(nb)) return "no-signal";
  return lm >= nb ? "current" : "stale";
}

export async function probe(fetcher, origin) {
  const res = await fetcher(origin, { headers: { "cache-control": "no-cache" } });
  if (!res || res.status !== 200) return { status: res ? res.status : 0, lastModified: null };
  const h = res.headers;
  const lm = typeof h?.get === "function" ? h.get("last-modified") : (h || {})["last-modified"];
  return { status: 200, lastModified: lm ?? null };
}

export async function run(fetcher, origin, notBefore, budgetSeconds, sleep, log) {
  const deadline = Date.now() + budgetSeconds * 1000;
  let attempt = 0, last = null;
  for (;;) {
    attempt++;
    let p;
    try {
      p = await probe(fetcher, origin);
    } catch (e) {
      log(`  attempt ${attempt}: ${origin} did not respond: ${e.message}`);
      p = { status: 0, lastModified: null };
    }
    last = p;
    if (p.status === 200 && p.lastModified) {
      const verdict = assess(p.lastModified, notBefore);
      log(`  attempt ${attempt}: last-modified ${p.lastModified} -> ${verdict}`);
      if (verdict === "current") {
        log(`OK — ${origin} is serving a build made at or after ${notBefore}`);
        return 0;
      }
    } else {
      log(`  attempt ${attempt}: status ${p.status}, last-modified ${p.lastModified}`);
    }
    if (Date.now() >= deadline) break;
    await sleep(Math.min(20000, Math.max(1, deadline - Date.now())));
  }
  if (last.status !== 200) {
    log(`CANNOT MEASURE: ${origin} never answered 200 (last status ${last.status})`);
    return 2;
  }
  if (!last.lastModified) {
    log(`CANNOT MEASURE: ${origin} answered 200 but sent no last-modified header, ` +
        `so freshness cannot be established and a green here would be unearned`);
    return 2;
  }
  log(`FAIL: ${origin} is still serving a build from ${last.lastModified}, which is ` +
      `older than this deployment (${notBefore}). Grading it now would grade the ` +
      `PREVIOUS deploy.`);
  return 1;
}

// ── the instrument must be able to fail ──────────────────────────────────────
function fakeFetcher(status, lastModified) {
  return async () => ({ status, headers: new Map([["last-modified", lastModified]]) });
}
async function selfTest() {
  const noop = () => {};
  const nosleep = async () => {};
  const checks = [];
  const T0 = "2026-09-06T04:38:00Z";

  checks.push(["assess: newer than the deploy is current",
    assess("Sun, 06 Sep 2026 04:38:35 GMT", T0) === "current"]);
  checks.push(["assess: older than the deploy is stale",
    assess("Sat, 05 Sep 2026 05:56:27 GMT", T0) === "stale"]);
  checks.push(["assess: exactly equal counts as current",
    assess("Sun, 06 Sep 2026 04:38:00 GMT", T0) === "current"]);
  checks.push(["assess: a missing header is no-signal, not a pass",
    assess(null, T0) === "no-signal"]);
  checks.push(["assess: an unparseable header is no-signal",
    assess("not a date", T0) === "no-signal"]);

  checks.push(["run: a fresh alias exits 0",
    (await run(fakeFetcher(200, "Sun, 06 Sep 2026 04:38:35 GMT"), "x", T0, 0, nosleep, noop)) === 0]);
  checks.push(["run: an alias stuck on the PREVIOUS build exits 1",
    (await run(fakeFetcher(200, "Sat, 05 Sep 2026 05:56:27 GMT"), "x", T0, 0, nosleep, noop)) === 1]);
  checks.push(["run: 200 with no last-modified exits 2, never 0",
    (await run(fakeFetcher(200, undefined), "x", T0, 0, nosleep, noop)) === 2]);
  checks.push(["run: a non-200 alias exits 2, never 0",
    (await run(fakeFetcher(503, "Sun, 06 Sep 2026 04:38:35 GMT"), "x", T0, 0, nosleep, noop)) === 2]);
  checks.push(["run: a thrown fetch exits 2, never 0",
    (await run(async () => { throw new Error("ECONNREFUSED"); }, "x", T0, 0, nosleep, noop)) === 2]);

  let bad = 0;
  for (const [name, ok] of checks) { if (!ok) bad++; console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}`); }
  if (bad) { console.error(`\nself-test FAILED (${bad} of ${checks.length})`); return 1; }
  console.log(`\nself-test passed: ${checks.length}/${checks.length} (it both passes and refuses)`);
  return 0;
}

// ── cli ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
if (argv.includes("--self-test") || argv.includes("--selftest")) {
  process.exit(await selfTest());
}
const origin = flag("--origin");
const notBefore = flag("--not-before");
const budget = Number(flag("--budget-seconds", "180"));
if (!origin || !notBefore) { console.error(HELP); process.exit(2); }
if (Number.isNaN(new Date(notBefore).getTime())) {
  console.error(`CANNOT MEASURE: --not-before ${notBefore} is not a date`);
  process.exit(2);
}
console.log(`asking whether ${origin} is already serving the build from ${notBefore} ` +
            `(budget ${budget}s)`);
process.exit(await run(fetch, origin, notBefore, budget, (ms) => new Promise((r) => setTimeout(r, ms)), console.log));
