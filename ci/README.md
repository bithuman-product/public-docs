# Local CI (GitHub Actions removed)

**Owner directive, 2026-09-29:** "disable Actions altogether as github is charging
way too much" · "please also remove all github actions" · "instead we should run
local tests for validation".

Actions are disabled for this repository and no status check is required on
`main`. Validation is `ci/run-local.sh`, run on your own machine.

## Run it

```bash
ci/run-local.sh              # every gate the PR/push workflows ran (default)
ci/run-local.sh --list       # all steps: default / served / manual
ci/run-local.sh --only links # one step, or every step with that prefix
ci/run-local.sh --served     # after each production deploy: grades docs.bithuman.ai
ci/run-local.sh --full       # default + served
ci/run-local.sh --no-cap     # skip the systemd-run memory/CPU scope (still waits for a host slot)
ci/run-local.sh --wait-timeout 600   # give up (exit 75) after 10 min without a host CI slot
ci/run-local.sh --host orinda        # offload to orinda while its measurement lock is free
bash ci/host-gate.sh status          # who holds the host's CI slots right now
```

Needs Node 22 (`.nvmrc`; the script finds `~/.nvm` v22), Chrome (Lighthouse),
`python3.12` and Java 17 (published-wheel / AAR re-extraction), network access and
`gh` logged in. `GH_TOKEN` falls back to `gh auth token`; `INTERNAL_DENYLIST`
falls back to the private list in `bithuman-product/platform`. Neither is
printed. `BITHUMAN_*` variables are scrubbed so no refusal driver sees a
credential. EVERY step (node checks, npm ci, the build, Lighthouse, published binaries)
runs under `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 -p CPUQuota=400%
nice -n 19` when systemd is available, behind the host gate below; Lighthouse also waits for
the exclusive host lock. Per-step logs go to `$CI_LOG_DIR` (default
`$TMPDIR/public-docs-local-ci-<sha>`).

Output: one `PASS`/`FAIL` line per step, then
`LOCAL CI <PASS|FAIL> sha=<git sha> steps=<n> ...`.


## Host gate (every repo shares it; added 2026-09-29)

lafayette runs the live Essence 2 workers and hit load 47.7/32 cores from concurrent local CI
(four platform suites, docs Lighthouse at nice 0, apps vitest/lint, selfheal tests). So
`ci/run-local.sh` sources `ci/host-gate.sh` (the SAME file in bithuman-apps, platform,
public-docs and bithuman-models; keep it identical):

- **At most 2 suites at once on the host, across all repos.** Two flock slots,
  `~/_locks/local-ci/slot{1,2}.lock`. A third suite prints `waiting for a CI slot` with the
  current holders and waits; `--wait-timeout S` (default 7200, `0` = forever, env
  `LOCAL_CI_WAIT_S`) bounds the wait, then it exits 75. The slot is released on exit, and
  because it is a kernel flock a killed suite can never leave it taken. Children run with
  the lock fds closed, so a daemon a step leaves behind cannot pin a slot.
- **Every step is capped:** `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0
  -p CPUQuota=400% nice -n 19`, node, tsc, lint, vitest, `next build`, `astro build` and
  Lighthouse alike. `--no-cap` drops the cap but **still takes a slot**.
- **Lighthouse/perf steps take the EXCLUSIVE host lock** (`host.lock`: every suite holds it
  shared) and so run only when no other CI suite is running, instead of running uncapped.
  A step waiting for it blocks new suites from starting (`turnstile.lock`), so it cannot
  starve.
- `bash ci/host-gate.sh status` shows who holds which slot and the host lock.
- **`--host orinda`** (optional; default stays local): runs the suite on orinda over ssh,
  only while orinda's measurement lock is free. It takes that lock with
  `~/bin_mlock.sh acquire local-ci-<repo>-...` on orinda (refused while a measurement holds
  it, a DRAIN is pending, or an orinda-ci runner job holds it shared), rsyncs the checkout to
  `orinda:~/_local_ci/<repo>/`, runs `ci/run-local.sh` there (behind orinda's own gate),
  and releases the lock on exit. It first checks orinda has this suite's toolchain and
  refuses (exit 75) if not; it never falls back to local silently. **Today orinda has node
  18 only, so this suite's offload refuses** (`node >= 22 not found`) until Node 22, Chrome
  and python3.12 are there.

## Evidence convention

Before merging, run `ci/run-local.sh` on the exact PR head and post a PR comment
with the command, the sha and the PASS/FAIL lines. **Red = no merge.** After a
production deploy, run `ci/run-local.sh --served` and treat red as a rollback
question.

## Manual steps (host/secret needed; listed by `--list`, never run here)

- `scripts/examples-build-gate.sh` — the real handset example builds, on a build
  host with Xcode/xcodegen/Gradle.
- `node scripts/check-performance-floors.mjs --models <bithuman-models checkout>` —
  re-reads the private FLOORS.json record.
- A Vercel deployment exists for the merged sha
  (`gh api 'repos/bithuman-product/public-docs/deployments?sha=<sha>'`).

## Where the old workflows are

`ci/github-workflows-disabled/*.yml` — kept as the recipe (they do not run).

## Known reds

None on main at the switch (2026-09-29: 60/60 default steps green).
`page-quality:lighthouse` grades a timing-based performance score (bar 95): on a
heavily loaded host a page can dip below it (one scored 91 at load ~49, then 100
alone). It now runs only under the exclusive host lock (no other CI suite running), but
the host's own production load still counts. Re-run `node scripts/check-quality.mjs --pages <page>` before calling it a
regression, and say so in the evidence comment.
