#!/usr/bin/env bash
# ci/run-local.sh — local validation for public-docs (replaces GitHub Actions).
#
# Owner directive 2026-09-29: "disable Actions altogether as github is charging
# way too much" / "please also remove all github actions" / "instead we should
# run local tests for validation". The old workflow YAML is the recipe and lives
# in ci/github-workflows-disabled/; every step below names the file it came from.
#
#   ci/run-local.sh            default: every gate the PR/push workflows ran
#   ci/run-local.sh --list     list steps (default / served / manual)
#   ci/run-local.sh --only X   run only steps whose name equals X or starts with X
#                              (e.g. --only links, --only links:claims)
#   ci/run-local.sh --served   post-deploy checks against the served site only
#                              (run after each production deploy; ORIGIN=... to override)
#   ci/run-local.sh --full     default + --served
#   ci/run-local.sh --no-cap   do not wrap steps in the systemd scope (still takes a
#                              host CI slot)
#   ci/run-local.sh --wait-timeout S   max wait for a host CI slot / the exclusive
#                              lock (default 7200, 0 = forever; exit 75 on timeout)
#   ci/run-local.sh --host orinda      run the suite on orinda, only while orinda's
#                              measurement lock is free (default: local)
#   ci/run-local.sh --keep-going is the default (like `if: always()`); a step never
#                              stops the ones after it.
#
# HOST GATE (ci/host-gate.sh, 2026-09-29): at most 2 local-CI suites at once across ALL
# repos on this host; a 3rd prints "waiting for a CI slot". EVERY step (node, astro build,
# Lighthouse) runs under systemd-run MemoryMax=8G/CPUQuota=400% + nice 19, and Lighthouse
# additionally waits for the EXCLUSIVE host lock (no other suite running) so its
# timing-based score is stable. The EXCLUSIVE_STEPS run LAST, together, in ONE exclusive
# pass after every other step (shared): a suite never interleaves exclusive and shared
# phases, and while that pass waits its turn the suite gives its slot back (host-gate.sh).
#
# Secrets: GH_TOKEN (for the GitHub release lookups) falls back to `gh auth token`;
# INTERNAL_DENYLIST falls back to the private list in bithuman-product/platform.
# Neither is ever printed. BITHUMAN_* variables are scrubbed from every step so a
# refusal driver can never find a real credential.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ORIGIN="${ORIGIN:-https://docs.bithuman.ai}"
export ORIGIN

MODE=default; ONLY=""; CAP=1; LIST=0; HOST=local; FWD=()
while [ $# -gt 0 ]; do
  case "$1" in
    --list) LIST=1 ;;
    --only) ONLY="${2:?--only needs a step name}"; FWD+=("$1" "$2"); shift ;;
    --full) MODE=full; FWD+=("$1") ;;
    --served) MODE=served; FWD+=("$1") ;;
    --no-cap) CAP=0; FWD+=("$1") ;;
    --host) HOST="${2:?--host needs local|orinda}"; shift ;;
    --wait-timeout) export LOCAL_CI_WAIT_S="${2:?--wait-timeout needs seconds}"; FWD+=("$1" "$2"); shift ;;
    -h|--help) sed -n '2,37p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 64 ;;
  esac
  shift
done

# ── step registry ───────────────────────────────────────────────────────────
# add <kind> <heavy 0|1> <name> <command>   kind: default | served | manual
NAMES=(); KINDS=(); HEAVY=(); CMDS=()
add() { KINDS+=("$1"); HEAVY+=("$2"); NAMES+=("$3"); CMDS+=("$4"); }

# link-check.yml / job `links` (every step ran with if: always())
add default 0 links:internal-links          "node scripts/check-internal-links.mjs"
add default 0 links:redirect-trailing-slash "node scripts/check-redirect-trailing-slash.mjs"
add default 0 links:gen-redirects-check     "node scripts/gen-redirects.mjs --check"
add default 0 links:redirects-selftest      "node scripts/check-redirects.mjs --selftest"
add default 0 links:perf-render             "node scripts/check-perf-render.mjs && node scripts/check-perf-render.mjs --selftest"
add default 0 links:unit-tests              "node --test src/lib/format-multiple.test.ts && node --test src/lib/ui-state.test.ts src/lib/calculator.test.ts src/lib/curl-samples.test.mjs"
add default 0 links:claims                  "node scripts/check-claims.mjs && node scripts/check-claims.mjs --selftest"
add default 0 links:offline-copy            "node scripts/check-offline-copy.mjs && node scripts/check-offline-copy.mjs --selftest"
add default 0 links:js-budget-selftest      "node scripts/check-js-budget.mjs --selftest"
add default 0 links:billing-consistency     "node scripts/check-billing-consistency.mjs"
add default 0 links:jsonld-facts            "node scripts/check-jsonld-facts.mjs && node scripts/check-jsonld-facts.mjs --selftest"
add default 0 links:sync-pricing            "node scripts/sync-pricing.mjs"
add default 0 links:model-enum-examples     "node scripts/check-model-enum-examples.mjs"
add default 0 links:retired-model-names     "node scripts/check-retired-model-names.mjs"
add default 0 links:cli-sample-from-surface "node scripts/check-cli-sample-output.mjs --from-surface"
add default 0 links:internal-vocabulary     "node scripts/check-internal-vocabulary.mjs && node scripts/check-internal-vocabulary.mjs --self-test"
add default 0 links:internal-content        "node scripts/check-internal-content.mjs --strict --require-private && node scripts/check-internal-content.mjs --self-test"
add default 0 links:page-template           "node scripts/check-page-template.mjs && node scripts/check-page-template.mjs --selftest"
add default 0 links:shell-tokens            "node scripts/check-shell-tokens.mjs --selftest && node scripts/check-shell-tokens.mjs"
add default 0 links:nav-consistency         "node scripts/check-nav-consistency.mjs"
# docs v2 (SPEC §8): new gates, report-only in W2a; each flips to fail when its wave lands
add default 0 links:page-budget             "node scripts/check-page-budget.mjs --selftest && node scripts/check-page-budget.mjs"
add default 0 links:model-concept-pages     "node scripts/check-model-concept-pages.mjs"
add default 0 links:placeholders            "node scripts/check-placeholders.mjs"
add default 0 links:kotlin-buildconfig      "node scripts/check-kotlin-buildconfig.mjs && node scripts/check-kotlin-buildconfig.mjs --selftest"
add default 0 links:mobile-sdk-arrival      "node scripts/check-mobile-sdk-arrival.mjs && node scripts/check-mobile-sdk-arrival.mjs --selftest"
add default 0 links:dependency-coordinates  "node scripts/check-dependency-coordinates.mjs && node scripts/check-dependency-coordinates.mjs --selftest"
add default 0 links:og-cast-selftest        "node scripts/gen-og.mjs --selftest"
add default 0 links:openapi-in-sync         "npm run sync-openapi --silent && git diff --exit-code -- public/api/openapi.yaml"

# link-check.yml / job `served-comments` (built bytes; needs the build step)
add default 1 build:npm-build               "node scripts/check-served-comments.mjs --self-test && npm run build"
add default 0 built:served-comments         "need_dist && node scripts/check-served-comments.mjs"
add default 0 built:redirects               "need_dist && node scripts/check-redirects.mjs"
add default 0 built:js-budget               "need_dist && node scripts/check-js-budget.mjs"
add default 0 built:no-js                   "need_dist && node scripts/check-no-js.mjs --selftest && node scripts/check-no-js.mjs"
add default 0 built:search                  "need_dist && node scripts/check-search.mjs"
add default 0 built:docs-mcp-test           "need_dist && node --test src/lib/docs-mcp.test.mjs"
add default 0 built:orphan-assets           "need_dist && node scripts/check-orphan-assets.mjs --selftest && node scripts/check-orphan-assets.mjs"
add default 0 built:media                   "need_dist && node scripts/check-media.mjs --selftest && node scripts/check-media.mjs"
add default 0 built:example-excerpts        "need_dist && node scripts/check-example-excerpts.mjs --selftest && node scripts/check-example-excerpts.mjs"
add default 0 built:claims                  "need_dist && node scripts/check-claims.mjs"
add default 0 built:offline-copy            "need_dist && node scripts/check-offline-copy.mjs"
add default 0 built:internal-vocabulary     "need_dist && node scripts/check-internal-vocabulary.mjs"
add default 0 built:perf-literals           "need_dist && node scripts/check-perf-literals.mjs"
add default 0 built:jsonld-facts            "need_dist && node scripts/check-jsonld-facts.mjs --built"
add default 0 built:discoverability         "need_dist && node scripts/check-discoverability.mjs"
add default 0 built:llms-caps               "need_dist && node scripts/check-llms.mjs --full-max-kb 190 --section-max-kb 96"
add default 0 built:served-markup           "need_dist && node scripts/check-served-markup.mjs --self-test && node scripts/check-served-markup.mjs"
# docs v2 (SPEC §4, §8): anchor coverage enforced from W3 (100% required); boilerplate report-only until W4
add default 0 built:anchor-coverage         "need_dist && node scripts/check-anchor-coverage.mjs --selftest && node scripts/check-anchor-coverage.mjs"
add default 0 built:boilerplate             "need_dist && node scripts/check-boilerplate.mjs --selftest && node scripts/check-boilerplate.mjs"
add default 1 built:noise-audit             "need_dist && node scripts/noise-audit.mjs"

# page-quality.yml (Lighthouse on the built site; needs Chrome). Capped like every
# step, and it first takes the EXCLUSIVE host lock (no other CI suite running): the
# performance score is timing-based, and on a host loaded by other suites a page scored
# 91 that scores 100 alone (measured 2026-09-29). Quiet host, not an uncapped Chrome.
add default 1 page-quality:lighthouse       "need_dist && node scripts/check-quality.mjs"
EXCLUSIVE_STEPS=" page-quality:lighthouse "

# performance-floors.yml
add default 0 perf:floors-selftests         "node scripts/check-performance-floors.mjs --selftest && node scripts/check-perf-literals.mjs --selftest"
add default 0 perf:floors                   "rc=0; node scripts/check-performance-floors.mjs || rc=\$?; [ \$rc -eq 0 ] || [ \$rc -eq 2 ]"
add default 0 perf:literals                 "node scripts/check-perf-literals.mjs"

# versions-current.yml (network: GitHub releases + registries)
add default 0 versions:current              "node scripts/check-versions-current.mjs --selftest && node scripts/check-versions-current.mjs"
add default 0 versions:registries           "GITHUB_TOKEN=\"\$GH_TOKEN\" node scripts/sync-versions.mjs --registries"
add default 0 versions:pins                 "node scripts/sync-versions.mjs"

# env-names-exist / cli-sample-output / cli-refusals / credential-claims (published bytes, empty HOME)
add default 0 published:env-names-exist     "node scripts/check-env-names-exist.mjs --selftest && node scripts/check-env-names-exist.mjs"
add default 1 published:cli-sample-output   "node scripts/check-cli-sample-output.mjs --selftest && node scripts/check-cli-sample-output.mjs"
add default 1 published:cli-refusals        "node scripts/check-cli-refusals.mjs --selftest && node scripts/check-cli-refusals.mjs"
add default 1 published:credential-claims   "node scripts/check-credential-claims-remeasured.mjs --selftest && node scripts/check-credential-claims-remeasured.mjs"
# python-api-current.yml / python-refusals.yml (Python 3.12, fresh venv) / android-api-current.yml (Java 17)
add default 1 published:python-api-current  "with_py312 node scripts/check-python-api-current.mjs --selftest && with_py312 node scripts/check-python-api-current.mjs --python python3.12"
add default 1 published:python-refusals     "with_py312 node scripts/check-python-refusals.mjs --selftest && with_py312 node scripts/check-python-refusals.mjs"
add default 1 published:android-api-current "with_java17 node scripts/check-android-api-current.mjs --selftest && with_java17 node scripts/check-android-api-current.mjs"

# examples-extractor-selftest.yml (the half that runs anywhere)
add default 0 examples:extractor            "node scripts/check-published-examples-build.mjs --selftest && node scripts/check-published-examples-build.mjs --controls"
add default 0 examples:remote-arm-verdicts  "node scripts/check-remote-arm-verdicts.mjs --selftest && node scripts/check-remote-arm-verdicts.mjs"
add default 0 examples:runner               "examples_runner_checks"

# post-deploy (served-matches-main.yml, served-vocabulary.yml, performance-floors.yml served half)
add served 0 served:is-current              "node scripts/check-served-is-current.mjs --self-test && node scripts/check-served-is-current.mjs --origin \"\$ORIGIN\" --not-before \"\$(git log -1 --format=%cI origin/main 2>/dev/null || git log -1 --format=%cI)\" --budget-seconds 600"
add served 0 served:vocabulary              "need_dist && node scripts/check-served-vocabulary.mjs --live \"\$ORIGIN\""
add served 0 served:markup                  "node scripts/check-served-markup.mjs --live \"\$ORIGIN\""
add served 0 served:comments                "node scripts/check-served-comments.mjs --live \"\$ORIGIN\""
add served 0 served:redirects-live          "node scripts/check-redirects-live.mjs --origin \"\$ORIGIN\""
add served 0 served:performance-floors      "rc=0; node scripts/check-performance-floors.mjs --served \"\$ORIGIN\" || rc=\$?; [ \$rc -eq 0 ] || [ \$rc -eq 2 ]"

# manual (host / secret needed) — listed, never run by this script
add manual 0 manual:examples-host-build     "bash scripts/examples-build-gate.sh  # on the Mac/Android build host with Xcode, xcodegen, Gradle (see ci/github-workflows-disabled/examples-extractor-selftest.yml header)"
add manual 0 manual:perf-floors-vs-models   "node scripts/check-performance-floors.mjs --models <bithuman-models checkout>  # needs the private FLOORS.json record (performance-floors.yml)"
add manual 0 manual:deployment-exists       "gh api 'repos/bithuman-product/public-docs/deployments?sha=<sha>' --jq length  # after a merge: Vercel must have created a deployment (served-matches-main.yml)"
add manual 0 manual:vercel-deploy           "Vercel git integration deploys main; not a check this script can run"

# Run order: every step in registry order, then the EXCLUSIVE_STEPS last (one exclusive pass).
ORDER=(); XORDER=()
for i in "${!NAMES[@]}"; do
  case "$EXCLUSIVE_STEPS" in *" ${NAMES[$i]} "*) XORDER+=("$i") ;; *) ORDER+=("$i") ;; esac
done

if [ "$LIST" = 1 ]; then
  for i in "${ORDER[@]}" "${XORDER[@]+"${XORDER[@]}"}"; do
    case "${KINDS[$i]}" in
      default) k="default" ;; served) k="served (--served/--full, after a deploy)" ;;
      manual) k="manual (host/secret needed)" ;;
    esac
    case "$EXCLUSIVE_STEPS" in *" ${NAMES[$i]} "*) k="$k, LAST: exclusive pass (no other CI suite running)" ;; esac
    printf '%-36s %s\n' "${NAMES[$i]}" "$k"
    [ "${KINDS[$i]}" = manual ] && printf '    %s\n' "${CMDS[$i]}"
  done
  exit 0
fi

# ── environment ─────────────────────────────────────────────────────────────
# Node 22 (.nvmrc): Astro 6 and the .ts loaders need it.
if ! node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' 2>/dev/null; then
  for d in "$HOME"/.nvm/versions/node/v22.*/bin /opt/homebrew/opt/node@22/bin; do
    [ -x "$d/node" ] && PATH="$d:$PATH" && break
  done
fi
export PATH
node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' || { echo "Node >= 22 required"; exit 1; }

for v in $(env | awk -F= '/^BITHUMAN_/{print $1}'); do unset "$v"; done
if [ -z "${GH_TOKEN:-}" ] && command -v gh >/dev/null; then GH_TOKEN="$(gh auth token 2>/dev/null || true)"; fi
export GH_TOKEN="${GH_TOKEN:-}"
if [ -z "${INTERNAL_DENYLIST:-}" ] && command -v gh >/dev/null; then
  INTERNAL_DENYLIST="$(gh api repos/bithuman-product/platform/contents/infra/docs/public-docs-internal-denylist.txt \
    --jq .content 2>/dev/null | base64 -d 2>/dev/null || true)"
fi
export INTERNAL_DENYLIST="${INTERNAL_DENYLIST:-}"

need_dist() { [ -f dist/index.html ] || { echo "dist/ missing: the build step failed or was not run (run without --only, or --only build first)"; return 1; }; }
with_py312() {
  local py; py="$(command -v python3.12 || true)"
  [ -n "$py" ] || { echo "python3.12 not found"; return 1; }
  local shim; shim="$(mktemp -d)"; ln -s "$py" "$shim/python3"; ln -s "$py" "$shim/python"
  PATH="$shim:$PATH" "$@"
}
with_java17() {
  local jh=""
  for c in "${JAVA17_HOME:-}" /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/java-17-openjdk-arm64 \
           "$(/usr/libexec/java_home -v 17 2>/dev/null || true)"; do
    [ -n "$c" ] && [ -x "$c/bin/java" ] && jh="$c" && break
  done
  if [ -n "$jh" ]; then JAVA_HOME="$jh" PATH="$jh/bin:$PATH" "$@"; else "$@"; fi
}
examples_runner_checks() {
  set -u +e
  bash -n scripts/examples-build-gate.sh || return 1
  local out rc out2 rc2 sb r
  out=$(bash scripts/examples-build-gate.sh --which-node); rc=$?; echo "$out"
  [ $rc -eq 0 ] || { echo "--which-node exited $rc"; return 1; }
  case "$out" in *node:*) ;; *) echo "--which-node named no interpreter"; return 1 ;; esac
  sb=$(mktemp -d); mkdir -p "$sb/bin" "$sb/home"
  for t in date ls sort tail; do ln -s "$(command -v $t)" "$sb/bin/$t"; done
  out2=$(env -i PATH="$sb/bin" HOME="$sb/home" GATE_NODE_CANDIDATES="$sb/nope/node" \
           /bin/bash scripts/examples-build-gate.sh --which-node 2>&1); rc2=$?
  echo "control: rc=$rc2 :: $out2"
  [ $rc2 -eq 2 ] || { echo "no-node arm exited $rc2, not 2"; return 1; }
  case "$out2" in *UNPROVEN*) ;; *) echo "no-node arm did not say UNPROVEN"; return 1 ;; esac
  [ -x scripts/examples-build-gate.sh ] || { echo "examples-build-gate.sh not executable"; return 1; }
  grep -q 'check-published-examples-build.mjs' scripts/examples-build-gate.sh || { echo "runner no longer invokes the checker"; return 1; }
  grep -q 'examples-build-gate.sh' scripts/check-published-examples-build.mjs || { echo "checker no longer names its runner"; return 1; }
  r=$(mktemp -d); mkdir -p "$r/scripts"
  cp scripts/examples-build-gate.sh scripts/check-published-examples-build.mjs "$r/scripts/"
  git -C "$r" init -q . && git -C "$r" -c user.email=ci@local -c user.name=ci add -A \
    && git -C "$r" -c user.email=ci@local -c user.name=ci commit -qm pin && git -C "$r" update-ref refs/remotes/origin/main HEAD
  out=$(GATE_SELF_UPDATED=1 /bin/bash "$r/scripts/examples-build-gate.sh" --selftest 2>&1); rc=$?; echo "$out"
  [ $rc -eq 0 ] || { echo "pinned-grader arm exited $rc"; return 1; }
  case "$out" in *"grader pinned"*) ;; *) echo "runner did not say which blob it pinned"; return 1 ;; esac
  printf '\n// hand-edited on the box\n' >> "$r/scripts/check-published-examples-build.mjs"
  out2=$(GATE_SELF_UPDATED=1 /bin/bash "$r/scripts/examples-build-gate.sh" --selftest 2>&1); rc2=$?; echo "$out2"
  [ $rc2 -eq 2 ] || { echo "unpinned grader accepted (exit $rc2)"; return 1; }
  case "$out2" in *"THE GRADER IS NOT THE PUBLISHED GRADER"*) ;; *) echo "pin did not name the defect"; return 1 ;; esac
  case "$out2" in *"selftest GREEN"*) echo "graded with unpinned bytes before refusing"; return 1 ;; esac
  return 0
}
export -f need_dist with_py312 with_java17 examples_runner_checks

case "$HOST" in local|orinda) ;; *) echo "--host must be local or orinda" >&2; exit 2 ;; esac
# shellcheck source=ci/host-gate.sh
. "$ROOT/ci/host-gate.sh"
if [ "$HOST" = orinda ]; then
  # Toolchain this suite needs on the offload host (Node 22, Chrome, python3.12, gh).
  lci_offload_orinda public-docs 'n=$(node -p "process.versions.node.split(\".\")[0]" 2>/dev/null || echo 0); [ "$n" -ge 22 ] || ls -d ~/.nvm/versions/node/v22.*/bin >/dev/null 2>&1 || { echo "node >= 22 not found (have $(node -v 2>/dev/null || echo none))"; exit 1; }; for t in python3.12 gh git flock systemd-run; do command -v $t >/dev/null || { echo "$t not found"; exit 1; }; done; command -v google-chrome >/dev/null || command -v chromium >/dev/null || { echo "Chrome not found"; exit 1; }' "${FWD[@]+"${FWD[@]}"}"
fi

# EVERY step runs under this cap (node checks, npm ci, astro build, Lighthouse alike).
WRAP=()
if [ "$CAP" = 1 ] && command -v systemd-run >/dev/null && systemctl --user show-environment >/dev/null 2>&1; then
  WRAP=(systemd-run --user --scope --quiet -p MemoryMax=8G -p MemorySwapMax=0 -p CPUQuota=400% nice -n 19)
fi

SHA="$(git rev-parse HEAD)"
lci_gate_begin "public-docs@${SHA:0:12}"
LOGDIR="${CI_LOG_DIR:-${TMPDIR:-/tmp}/public-docs-local-ci-${SHA:0:12}}"
mkdir -p "$LOGDIR"

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "npm ci ..."; lci_run "${WRAP[@]}" npm ci --no-audit --no-fund >"$LOGDIR/npm-ci.log" 2>&1 \
    || { tail -40 "$LOGDIR/npm-ci.log"; echo "LOCAL CI FAIL sha=$SHA steps=0 (npm ci failed)"; exit 1; }
fi

selected() {
  local i=$1 n=${NAMES[$1]} k=${KINDS[$1]}
  [ "$k" = manual ] && return 1
  if [ -n "$ONLY" ]; then [ "$n" = "$ONLY" ] || [[ "$n" == "$ONLY"* ]]; return; fi
  case "$MODE" in default) [ "$k" = default ] ;; served) [ "$k" = served ] ;; full) true ;; esac
}

if [ "$MODE" = served ] && [ -z "$ONLY" ] && [ ! -f dist/index.html ]; then
  echo "served:vocabulary compares against a local build; building first"; lci_run "${WRAP[@]}" npm run build >"$LOGDIR/build.log" 2>&1 || true
fi

pass=0; fail=0; n=0; FAILED=()
run_step() {  # <index>: run one step (capped), print PASS/FAIL, count it
  local i=$1 name log t0 cmd ok
  name=${NAMES[$i]}; log="$LOGDIR/${name//:/_}.log"; n=$((n+1)); t0=$(date +%s)
  cmd=("${WRAP[@]}" bash -c "${CMDS[$i]}")   # HEAVY[] is informational: every step is capped
  if lci_run "${cmd[@]}" >"$log" 2>&1 </dev/null; then ok=1; else ok=0; fi
  if [ $ok = 1 ]; then
    pass=$((pass+1)); printf 'PASS %-36s %4ss\n' "$name" "$(( $(date +%s)-t0 ))"
  else
    fail=$((fail+1)); FAILED+=("$name"); printf 'FAIL %-36s %4ss  log: %s\n' "$name" "$(( $(date +%s)-t0 ))" "$log"
    tail -15 "$log" | sed 's/^/     | /'
  fi
}

for i in "${ORDER[@]}"; do
  if selected "$i"; then run_step "$i"; fi
done
# The Lighthouse/perf steps LAST, in ONE exclusive pass: lci_exclusive_begin gives the slot
# back while it waits its turn (host-gate.sh), so the suite does not keep a slot idle.
XSEL=(); XNAMES=""
for i in "${XORDER[@]+"${XORDER[@]}"}"; do
  if selected "$i"; then XSEL+=("$i"); XNAMES+="${XNAMES:+,}${NAMES[$i]}"; fi
done
if [ ${#XSEL[@]} -gt 0 ]; then
  # tally first: a wait timeout (exit 75) in this pass must not hide the shared results
  echo "shared steps: $pass passed, $fail failed${FAILED[0]:+ (${FAILED[*]})}; exclusive pass (last): $XNAMES"
  lci_exclusive_begin "$XNAMES"
  for i in "${XSEL[@]}"; do run_step "$i"; done
  lci_exclusive_end
fi

[ $n -gt 0 ] || { echo "no step matched '${ONLY}'"; exit 64; }
[ $fail -eq 0 ] && verdict=PASS || verdict=FAIL
[ $fail -eq 0 ] || echo "failed: ${FAILED[*]}"
echo "LOCAL CI $verdict sha=$SHA steps=$n pass=$pass fail=$fail mode=${ONLY:+only:$ONLY}${ONLY:-$MODE}"
[ $fail -eq 0 ]
