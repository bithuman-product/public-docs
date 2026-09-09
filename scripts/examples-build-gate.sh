#!/bin/bash
# THE HOST RUNNER FOR THE PUBLISHED-EXAMPLES BUILD GATE.
#
# scripts/check-published-examples-build.mjs fetches the two handset example
# pages from docs.bithuman.ai, writes the code blocks out as a project and
# compiles them. It needs an Android SDK and Xcode. No GitHub-hosted runner has
# both — `ubuntu-latest` has neither, and `macos-latest` has no Android SDK — so
# the gate cannot live in this repo's CI. It lives here instead, scheduled from
# lafayette's crontab and executed on `echelon`, the Mac that has Xcode 26.3, a
# JDK 17 and an Android SDK with platform 35.
#
#   lafayette (cron, the pager, the throttle state)  --ssh-->  echelon (toolchains)
#
# WHY THE SCHEDULE LIVES ON LAFAYETTE AND NOT ON ECHELON
# -----------------------------------------------------
# Because that is where a red is HEARD. tools/guard_page.py in bithuman-models-prod
# is this estate's one delivery-verified pager (Slack, throttled per guard, armed
# only by a message that actually landed), its throttle state is on lafayette, and
# every other guard on the estate is already scheduled beside it. echelon has no
# crontab at all. Putting the beat here means the alarm is the same alarm as
# everything else rather than a 26th log file nobody reads.
#
# EXIT CODES — the cron line branches on these, so they are load-bearing.
#   0  the published pages compiled (or, under --mutate, the control fired)
#   1  A REAL DISAGREEMENT: the published code does not build
#   2  UNPROVEN: the extractor's own self-test failed, echelon was unreachable,
#      a toolchain was missing, the disk was too full to build, or (under
#      --mutate) the deliberately broken page built anyway. Cannot-measure is
#      not a pass; the cron line pages differently for 2 than for 1.
#
# MODES
#   (none)       fetch the live pages and build both arms
#   --mutate     the failure control: same pages, one bitHuman API symbol
#                renamed, and the toolchain MUST reject it
#   --selftest   the extractor's own arms only; no ssh, no toolchain, no network
#   --deadman    no build at all: page if the last run's receipt is stale
#   --which-node print the node interpreter this script would use, and exit 2 if
#                there is none. The arm that answers "would cron get this far?"
#
# NO SECRET IS READ, PRINTED OR EXPORTED BY THIS SCRIPT, and it never runs under
# `set -x`. The pager reads SLACK_WEBHOOK_URL itself, out of ~/.env, in its own
# process; nothing sensitive crosses the ssh hop.

set -u -o pipefail

CHECKOUT="${GATE_CHECKOUT:-/home/sgu/docs-gate/public-docs}"
REMOTE="${GATE_REMOTE_HOST:-echelon}"
RECEIPT="${GATE_RECEIPT:-/home/sgu/scripts/docs-examples-build.receipt.json}"
DEADMAN_HOURS="${GATE_DEADMAN_HOURS:-30}"
MIN_FREE_GIB="${GATE_MIN_FREE_GIB:-6}"
REMOTE_JAVA_HOME="${GATE_REMOTE_JAVA_HOME:-/opt/homebrew/Cellar/openjdk@17/17.0.20.1/libexec/openjdk.jdk/Contents/Home}"
REMOTE_ANDROID_HOME="${GATE_REMOTE_ANDROID_HOME:-\$HOME/android-sdk}"

MODE="run"
case "${1:-}" in
  --mutate)     MODE="mutate" ;;
  --selftest)   MODE="selftest" ;;
  --deadman)    MODE="deadman" ;;
  --which-node) MODE="which-node" ;;
  "")           ;;
  *)            echo "usage: $0 [--mutate|--selftest|--deadman|--which-node]" >&2; exit 2 ;;
esac

say() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

# ------------------------------------------------------------ finding node ---
# ★MEASURED 2026-09-09, and it is the whole reason this is not a bare
# `command -v node`. cron on lafayette hands a job PATH=/usr/bin:/bin, and this
# box has NO node in /usr/bin — node lives under ~/.nvm. The first installed
# form of this gate therefore did this on every single nightly run:
#
#   $ env -i HOME=/home/sgu PATH=/usr/bin:/bin sh -c '.../examples-build-gate.sh --selftest'
#   2026-09-09T08:05:10Z UNPROVEN: node is not on PATH here
#   EXIT=2
#
# It could not once have been green. It would have paged docs-examples-unproven
# every morning, and a guard whose green is UNREACHABLE is worse than no guard:
# it teaches whoever is on call that this name means nothing. Interactive shells
# never saw it, because nvm puts node on THEIR PATH — the classic shape where
# the test passes for the tester and the job fails for cron.
#
# So: an explicit override first, then PATH, then the newest nvm install
# (`sort -V`, so v9 does not beat v20 the way a lexical sort would), then the
# absolute homes node actually takes on this estate's Linux box and its Macs.
resolve_node() {
  if [ -n "${GATE_NODE_BIN:-}" ] && [ -x "$GATE_NODE_BIN" ]; then
    printf '%s\n' "$GATE_NODE_BIN"; return 0
  fi
  n="$(command -v node 2>/dev/null || true)"
  if [ -n "$n" ]; then printf '%s\n' "$n"; return 0; fi
  n="$(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)"
  if [ -n "$n" ] && [ -x "$n" ]; then printf '%s\n' "$n"; return 0; fi
  # The candidate list is INJECTABLE for exactly one reason: so a control can
  # take every interpreter away and watch this exit 2. A resolver that can only
  # be tested on a box that happens to have no node is a resolver nothing tests.
  for c in ${GATE_NODE_CANDIDATES:-/usr/local/bin/node /opt/homebrew/bin/node /snap/bin/node /usr/bin/node}; do
    if [ -x "$c" ]; then printf '%s\n' "$c"; return 0; fi
  done
  return 1
}

NODE_BIN="$(resolve_node || true)"

# The cheapest possible answer to "would the beat get past its first line?" — no
# network, no ssh, no toolchain, no checkout reset. Run it under the environment
# cron actually gives a job and it answers for cron, not for your shell.
if [ "$MODE" = which-node ]; then
  if [ -z "$NODE_BIN" ]; then
    say "UNPROVEN: no node interpreter found (PATH=$PATH, and no nvm/homebrew/usr-local install either)"
    exit 2
  fi
  say "node: $NODE_BIN ($("$NODE_BIN" -v 2>&1))"
  exit 0
fi

# ---------------------------------------------------------------- dead-man ---
# A build gate that stops running looks exactly like a build gate that is green.
# This arm reads nothing but the receipt the successful path writes, so it fires
# whether the beat was removed, the box was down, or ssh stopped working.
if [ "$MODE" = deadman ]; then
  if [ ! -f "$RECEIPT" ]; then
    say "DEADMAN RED: no receipt at $RECEIPT — the examples build gate has never reported"
    exit 1
  fi
  now=$(date -u +%s)
  then_=$(python3 -c 'import json,sys;print(int(json.load(open(sys.argv[1]))["at_epoch"]))' "$RECEIPT" 2>/dev/null)
  if [ -z "${then_:-}" ]; then
    say "DEADMAN RED: $RECEIPT is unreadable or has no at_epoch"
    exit 1
  fi
  age_h=$(( (now - then_) / 3600 ))
  if [ "$age_h" -ge "$DEADMAN_HOURS" ]; then
    say "DEADMAN RED: the last examples build gate run was ${age_h}h ago (limit ${DEADMAN_HOURS}h)"
    exit 1
  fi
  say "DEADMAN GREEN: last run ${age_h}h ago (limit ${DEADMAN_HOURS}h)"
  exit 0
fi

# --------------------------------------------------- self-reset the checkout ---
# The gate must grade the CURRENT main, not whatever was cloned once. Every other
# scheduled guard on this box runs out of a checkout that resets to origin/main
# for the same reason. GATE_SELF_UPDATED stops the re-exec from looping.
if [ -z "${GATE_SELF_UPDATED:-}" ]; then
  if [ -d "$CHECKOUT/.git" ]; then
    if git -C "$CHECKOUT" fetch --quiet origin 2>/dev/null && \
       git -C "$CHECKOUT" reset --hard --quiet origin/main 2>/dev/null; then
      say "checkout $CHECKOUT reset to origin/main $(git -C "$CHECKOUT" rev-parse --short HEAD)"
    else
      say "WARNING: could not reset $CHECKOUT to origin/main; running whatever is checked out there"
    fi
    export GATE_SELF_UPDATED=1
    exec /bin/bash "$CHECKOUT/scripts/examples-build-gate.sh" "$@"
  fi
  say "WARNING: $CHECKOUT is not a git checkout; running this copy without a refresh"
  export GATE_SELF_UPDATED=1
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER="$HERE/check-published-examples-build.mjs"
[ -f "$CHECKER" ] || { say "UNPROVEN: $CHECKER does not exist"; exit 2; }

[ -n "$NODE_BIN" ] || { say "UNPROVEN: no node interpreter found (PATH=$PATH) — see resolve_node above"; exit 2; }

# ------------------------------------------------------------- the selftest ---
# Always, before anything is graded: if the extractor's own arms do not all fire,
# it cannot tell a broken page from a good one and its green is meaningless.
say "extractor self-test"
if ! "$NODE_BIN" "$CHECKER" --selftest; then
  say "UNPROVEN: the extractor self-test is RED — this gate is blind, do not read its verdict"
  exit 2
fi
[ "$MODE" = selftest ] && { say "selftest-only: done"; exit 0; }

# ------------------------------------------------------------ echelon checks ---
if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" true 2>/dev/null; then
  say "UNPROVEN: $REMOTE is unreachable over ssh — the toolchains are there, so nothing was compiled"
  exit 2
fi

free_gib=$(ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" \
  "df -g /System/Volumes/Data | awk 'NR==2{print \$4}'" 2>/dev/null)
case "${free_gib:-}" in
  ''|*[!0-9]*) say "UNPROVEN: could not read free space on $REMOTE"; exit 2 ;;
esac
if [ "$free_gib" -lt "$MIN_FREE_GIB" ]; then
  say "UNPROVEN: $REMOTE has ${free_gib} GiB free, under the ${MIN_FREE_GIB} GiB this build needs — refusing to fill the disk"
  exit 2
fi
say "$REMOTE reachable, ${free_gib} GiB free"

# ------------------------------------------------------------------ the run ---
STAMP="$(date -u +%Y%m%d-%H%M%S)-$$"
RDIR="/tmp/docs-examples-gate-run-$STAMP"
ARGS=""
[ "$MODE" = mutate ] && ARGS="--mutate"

cleanup() { ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" "rm -rf '$RDIR'" >/dev/null 2>&1 || true; }
trap cleanup EXIT

ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" "mkdir -p '$RDIR'" || { say "UNPROVEN: cannot create $RDIR on $REMOTE"; exit 2; }
scp -q -o BatchMode=yes "$CHECKER" "$REMOTE:$RDIR/check.mjs" || { say "UNPROVEN: cannot copy the checker to $REMOTE"; exit 2; }

say "running the gate on $REMOTE ${ARGS:-(live pages)}"
ssh -o BatchMode=yes "$REMOTE" bash -s -- <<EOF
set -u
export JAVA_HOME="$REMOTE_JAVA_HOME"
export ANDROID_HOME="$REMOTE_ANDROID_HOME"
export ANDROID_SDK_ROOT="\$ANDROID_HOME"
export PATH="\$JAVA_HOME/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$RDIR"
node "$RDIR/check.mjs" $ARGS --workdir "$RDIR"
EOF
rc=$?

say "gate exited $rc"

# ------------------------------------------------------------- the receipt ---
# Written on EVERY outcome, including a red: the dead-man's job is to notice that
# the gate stopped speaking, not to re-report what it said.
mkdir -p "$(dirname "$RECEIPT")"
python3 - "$RECEIPT" "$rc" "$MODE" <<'PY'
import json, sys, time, socket
path, rc, mode = sys.argv[1], int(sys.argv[2]), sys.argv[3]
json.dump({"at_epoch": int(time.time()),
           "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "rc": rc, "mode": mode, "host": socket.gethostname()},
          open(path, "w"), indent=1)
PY

exit $rc
