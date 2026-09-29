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
ci/run-local.sh --no-cap     # skip the systemd-run memory/CPU scope on heavy steps
```

Needs Node 22 (`.nvmrc`; the script finds `~/.nvm` v22), Chrome (Lighthouse),
`python3.12` and Java 17 (published-wheel / AAR re-extraction), network access and
`gh` logged in. `GH_TOKEN` falls back to `gh auth token`; `INTERNAL_DENYLIST`
falls back to the private list in `bithuman-product/platform`. Neither is
printed. `BITHUMAN_*` variables are scrubbed so no refusal driver sees a
credential. Heavy steps (build, Lighthouse, published binaries) run under
`systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 -p CPUQuota=400% nice -n 19`
when systemd is available. Per-step logs go to `$CI_LOG_DIR` (default
`$TMPDIR/public-docs-local-ci-<sha>`).

Output: one `PASS`/`FAIL` line per step, then
`LOCAL CI <PASS|FAIL> sha=<git sha> steps=<n> ...`.

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
alone). Re-run `node scripts/check-quality.mjs --pages <page>` before calling it a
regression, and say so in the evidence comment.
