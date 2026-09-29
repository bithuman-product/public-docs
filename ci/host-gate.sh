#!/usr/bin/env bash
# ci/host-gate.sh — HOST-WIDE gate for local CI suites (sourced by ci/run-local.sh).
#
# WHY (2026-09-29): lafayette (32 cores, runs the LIVE Essence 2 workers) hit load 47.7
# from concurrent local CI: four platform suites + docs Lighthouse at nice 0 + apps
# vitest/lint + selfheal tests. Owner rule: no heavy uncapped jobs on a prod host. This
# file is copied VERBATIM into bithuman-apps, platform, public-docs and bithuman-models
# (keep them identical; `sha256sum ci/host-gate.sh` should match across repos) so every
# repo's suite shares ONE set of locks on the host:
#
#   $LOCAL_CI_LOCK_DIR (default ~/_locks/local-ci)/
#     slot1.lock .. slotN.lock  at most N (LOCAL_CI_SLOTS, default 2) suites at once,
#                               across every repo and user of this $HOME
#     host.lock                 every running suite holds it SHARED; a Lighthouse/perf
#                               step takes it EXCLUSIVE (= no other suite running)
#     turnstile.lock            writer preference: a step waiting for EXCLUSIVE holds it,
#                               so no NEW suite starts under it (no starvation)
#     slotN.holder              who holds slot N (informational; the flock is the truth)
#
# flock(1) locks die with the process, so a killed suite can never leave a slot taken.
# Lock files are never deleted (deleting a flock file breaks the mutex).
#
# API (bash):  lci_gate_begin <label>         wait for a slot (+ shared host lock)
#              lci_exclusive_begin <step>     wait until no other suite runs
#              lci_exclusive_end              back to shared
#              lci_run <cmd...>               run a child WITHOUT the lock fds (a daemon a
#                                             step leaves behind can't pin a slot)
#              lci_offload_orinda <repo> <preflight-shell> <args...>   see --host orinda
# CLI:         bash ci/host-gate.sh status    who holds what, right now
#
# Knobs: LOCAL_CI_WAIT_S (default 7200; 0 = wait forever; run-local.sh --wait-timeout S)
#        LOCAL_CI_SLOTS (2), LOCAL_CI_LOCK_DIR (~/_locks/local-ci), LOCAL_CI_POLL_S (60)

LCI_LOCK_DIR="${LOCAL_CI_LOCK_DIR:-$HOME/_locks/local-ci}"
LCI_SLOTS="${LOCAL_CI_SLOTS:-2}"
LCI_WAIT_S="${LOCAL_CI_WAIT_S:-7200}"
LCI_POLL_S="${LOCAL_CI_POLL_S:-60}"
LCI_SLOT=""; LCI_SLOT_FD=""; LCI_HOST_FD=""; LCI_TURN_FD=""; LCI_LABEL=""; LCI_T0=""
LCI_ON=0

lci__log() { echo "[host-gate] $*" >&2; }
lci__now() { date +%s; }

# seconds left before the wait deadline; "" = no deadline
lci__left() {
  [ "$LCI_WAIT_S" = 0 ] && { echo ""; return; }
  echo $(( LCI_T0 + LCI_WAIT_S - $(lci__now) ))
}

lci__holders() {  # one line per live slot holder
  local i f pid any=1
  for i in $(seq 1 "$LCI_SLOTS"); do
    f="$LCI_LOCK_DIR/slot$i.holder"
    if [ -f "$f" ]; then
      pid="$(sed -n 's/.*pid=\([0-9]*\).*/\1/p' "$f" | head -1)"
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then echo "  slot$i: $(cat "$f")"; any=0; continue; fi
    fi
    if ! flock -n "$LCI_LOCK_DIR/slot$i.lock" true 2>/dev/null; then echo "  slot$i: held (no holder record)"; any=0; fi
  done
  [ $any = 0 ] || echo "  (no slot holders)"
}

lci__timeout() {
  lci__log "TIMEOUT: waited ${LCI_WAIT_S}s for $1. Current holders:"
  lci__holders >&2
  lci__log "raise --wait-timeout / LOCAL_CI_WAIT_S (0 = forever), or run later."
  exit 75
}

# lci__flock_wait <mode -s|-x> <fd> <what>: -n first; else a visible wait, bounded.
lci__flock_wait() {
  local mode="$1" fd="$2" what="$3" left step
  flock -n "$mode" "$fd" && return 0
  lci__log "waiting for $what ($LCI_LABEL, pid $$). Holders:"
  lci__holders >&2
  while :; do
    left="$(lci__left)"; step="$LCI_POLL_S"
    if [ -n "$left" ]; then [ "$left" -gt 0 ] || lci__timeout "$what"; [ "$left" -lt "$step" ] && step="$left"; fi
    flock -w "$step" "$mode" "$fd" && { lci__log "got $what after $(( $(lci__now) - LCI_T0 ))s"; return 0; }
    lci__log "still waiting for $what ($(( $(lci__now) - LCI_T0 ))s)"
  done
}

lci_gate_begin() {
  LCI_LABEL="${1:-local-ci}"; LCI_T0="$(lci__now)"
  if ! command -v flock >/dev/null 2>&1; then
    lci__log "flock(1) not found: host gate OFF on this host ($(uname -s)). Never run uncapped on a prod host."
    return 0
  fi
  mkdir -p "$LCI_LOCK_DIR"
  exec {LCI_HOST_FD}>>"$LCI_LOCK_DIR/host.lock"
  exec {LCI_TURN_FD}>>"$LCI_LOCK_DIR/turnstile.lock"
  local i fd announced=0 left last
  last="$(lci__now)"
  while :; do
    for i in $(seq 1 "$LCI_SLOTS"); do
      exec {fd}>>"$LCI_LOCK_DIR/slot$i.lock"
      if flock -n "$fd"; then LCI_SLOT="$i"; LCI_SLOT_FD="$fd"; break 2; fi
      exec {fd}>&-
    done
    if [ $announced = 0 ]; then
      lci__log "waiting for a CI slot ($LCI_SLOTS max on $(hostname -s), $LCI_LABEL, pid $$). Holders:"
      lci__holders >&2; announced=1
    fi
    left="$(lci__left)"; [ -z "$left" ] || [ "$left" -gt 0 ] || lci__timeout "a CI slot"
    sleep 5
    if [ $(( $(lci__now) - last )) -ge "$LCI_POLL_S" ]; then
      last="$(lci__now)"; lci__log "still waiting for a CI slot ($(( last - LCI_T0 ))s)"
    fi
  done
  [ $announced = 1 ] && lci__log "got CI slot $LCI_SLOT after $(( $(lci__now) - LCI_T0 ))s"
  # Writer preference: pass the turnstile (a waiting EXCLUSIVE step holds it), then share.
  lci__flock_wait -x "$LCI_TURN_FD" "the turnstile (a Lighthouse/perf step is waiting for the host)"
  lci__flock_wait -s "$LCI_HOST_FD" "the host lock (a Lighthouse/perf step holds it exclusively)"
  flock -u "$LCI_TURN_FD"
  printf 'label=%s pid=%s user=%s since=%s cwd=%s\n' "$LCI_LABEL" "$$" "$(id -un)" \
    "$(date -u +%FT%TZ)" "$PWD" >"$LCI_LOCK_DIR/slot$LCI_SLOT.holder" 2>/dev/null || true
  LCI_ON=1
  trap 'lci_gate_end' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  lci__log "slot $LCI_SLOT/$LCI_SLOTS held by $LCI_LABEL (pid $$); lock dir $LCI_LOCK_DIR"
}

lci_gate_end() {
  [ "$LCI_ON" = 1 ] || return 0
  local f="$LCI_LOCK_DIR/slot$LCI_SLOT.holder"
  grep -q "pid=$$ " "$f" 2>/dev/null && rm -f "$f"
  [ -n "$LCI_HOST_FD" ] && exec {LCI_HOST_FD}>&-
  [ -n "$LCI_SLOT_FD" ] && exec {LCI_SLOT_FD}>&-
  [ -n "$LCI_TURN_FD" ] && exec {LCI_TURN_FD}>&-
  LCI_ON=0
}

lci_exclusive_begin() {
  [ "$LCI_ON" = 1 ] || return 0
  LCI_T0="$(lci__now)"
  flock -u "$LCI_HOST_FD"                     # drop shared first (else two waiters deadlock)
  lci__flock_wait -x "$LCI_TURN_FD" "the turnstile (another exclusive step is queued)"
  lci__flock_wait -x "$LCI_HOST_FD" "the EXCLUSIVE host lock for $1 (no other CI suite running)"
  flock -u "$LCI_TURN_FD"
  lci__log "EXCLUSIVE host lock held for $1"
}

lci_exclusive_end() {
  [ "$LCI_ON" = 1 ] || return 0
  flock -s "$LCI_HOST_FD"                     # downgrade; we hold -x so this cannot block
}

lci_run() {
  if [ "$LCI_ON" = 1 ]; then "$@" {LCI_SLOT_FD}>&- {LCI_HOST_FD}>&- {LCI_TURN_FD}>&-
  else "$@"; fi
}

# --host orinda: run the whole suite on orinda, ONLY while orinda's measurement lock is
# free. orinda's lock is ~/bin_mlock.sh there (a mkdir mutex ~/.measure_lock + a holder
# record; orinda-ci GitHub runners take it SHARED under /run/orinda-ci-mlock/shared). We
# `acquire` it (it refuses while a measurement holds it, while a DRAIN is pending, or while
# a live shared CI hold exists), so no measurement starts under our suite, and release it
# on exit. Never falls back to local silently: a refusal exits 75.
#   lci_offload_orinda <repo> <remote preflight shell> <run-local args...>
lci_offload_orinda() {
  local repo="$1" pre="$2"; shift 2
  local host="${LOCAL_CI_OFFLOAD_HOST:-orinda}" root lane mins="${LOCAL_CI_OFFLOAD_MIN:-90}" out rc q=""
  root="$(git rev-parse --show-toplevel)" || return 2
  [ -d "$root/.git" ] || { lci__log "--host $host needs a normal checkout (.git is not a directory here: worktree?)"; exit 2; }
  lane="local-ci-$repo-$(hostname -s)-$$"
  local ssh_=(ssh -o BatchMode=yes -o ConnectTimeout=10 "$host")
  lci__log "offload: toolchain preflight on $host"
  if ! out="$("${ssh_[@]}" "bash -lc $(printf %q "$pre")" 2>&1)"; then
    lci__log "offload REFUSED: $host lacks the toolchain for $repo:"; printf '%s\n' "$out" | sed 's/^/    /' >&2
    lci__log "the default (local, gated) still works: rerun without --host"; exit 75
  fi
  out="$("${ssh_[@]}" "~/bin_mlock.sh acquire $lane $mins $(printf %q "local-ci $repo suite offloaded from $(hostname -s)")" 2>&1)"; rc=$?
  if [ $rc != 0 ]; then
    lci__log "offload REFUSED: $host measurement lock is not free:"; printf '%s\n' "$out" | sed 's/^/    /' >&2
    lci__log "the default (local, gated) still works: rerun without --host"; exit 75
  fi
  lci__log "$out"
  # shellcheck disable=SC2064
  trap "${ssh_[*]} '~/bin_mlock.sh release $lane' >&2 || true" EXIT
  trap 'exit 130' INT; trap 'exit 143' TERM
  "${ssh_[@]}" "mkdir -p ~/_local_ci/$repo" || exit 2
  rsync -a --delete --exclude node_modules --exclude /dist --exclude /ci/.logs --exclude /ci/.tmp \
    --exclude .venv --exclude .astro -e "ssh -o BatchMode=yes" "$root/" "$host:_local_ci/$repo/" || exit 2
  for a in "$@"; do q+=" $(printf %q "$a")"; done
  lci__log "offload: running ci/run-local.sh$q on $host (sha $(git -C "$root" rev-parse HEAD))"
  # a LOGIN shell, as in the preflight (uv/nvm live on the login PATH, not ssh's bare one)
  "${ssh_[@]}" "bash -lc $(printf %q "cd ~/_local_ci/$repo && ci/run-local.sh$q")"; rc=$?
  exit $rc
}

# Direct execution: `bash ci/host-gate.sh status`
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  case "${1:-status}" in
    status)
      echo "lock dir: $LCI_LOCK_DIR  slots: $LCI_SLOTS  load: $(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null)"
      mkdir -p "$LCI_LOCK_DIR"; lci__holders
      if flock -n -x "$LCI_LOCK_DIR/host.lock" true 2>/dev/null; then echo "  host.lock: free"
      elif flock -n -s "$LCI_LOCK_DIR/host.lock" true 2>/dev/null; then echo "  host.lock: shared (suites running)"
      else echo "  host.lock: EXCLUSIVE (a Lighthouse/perf step is running)"; fi ;;
    *) echo "usage: bash ci/host-gate.sh status" >&2; exit 2 ;;
  esac
fi
