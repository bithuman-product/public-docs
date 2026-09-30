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
#     queue/<ns>-<pid>-<host>   one FIFO ticket per suite WAITING for a slot (arrival time in
#                               ns, pid, host; body = the pid's /proc start time + who; an
#                               EXCLUSIVE re-queue adds line 3 = "<order key ns> <asked ns>")
#     host.lock                 every running suite holds it SHARED; a Lighthouse/perf
#                               step takes it EXCLUSIVE (= no other suite running)
#     turnstile.lock            writer preference: a step waiting for EXCLUSIVE holds it,
#                               so no NEW suite starts under it (no starvation)
#     slotN.holder              who holds slot N (informational; the flock is the truth)
#     exclusive.holder          who holds host.lock EXCLUSIVE, since when (informational)
#
# flock(1) locks die with the process, so a killed suite can never leave a slot taken.
# Lock files are never deleted (deleting a flock file breaks the mutex).
#
# FIFO (2026-09-29 pm; a suite waited 44 min as the OLDEST waiter while newer runs won the
# old 5 s `flock -n` race): lci_gate_begin writes a ticket atomically, and only the OLDEST
# live ticket (the head) may take a free slot, so slots go out in arrival order. The first
# LOCAL_CI_SLOTS waiters poll every 1 s, the rest every 2 s. A waiter drops its ticket the
# moment it holds a slot, on timeout, and in its EXIT trap. Any waiter removes dead tickets:
# pid gone, or the pid was reused (its /proc start time differs from the ticket's); another
# host's ticket is dead once not refreshed for LOCAL_CI_STALE_S. A STOPPED waiter (^Z,
# SIGSTOP) keeps its ticket but is skipped, so it cannot stall the queue. Waiters still
# running the pre-FIFO copy of this file have no ticket and keep trying `flock -n` every
# 5 s: if one of them takes the slot the head was due, the head simply keeps waiting (no
# deadlock: neither side ever waits on the other's ticket); they disappear as those runs
# finish.
#
# Lighthouse fairness: lci_exclusive_begin YIELDS while any queued ticket has waited more
# than LOCAL_CI_EXCL_YIELD_S. A step that has to wait for its turn (yield, or the turnstile
# is held) does NOT keep its slot meanwhile (2026-09-29 eve: one held slot 2 for 1,700 s
# doing nothing while 7 suites queued): it writes an EXCLUSIVE queue ticket, THEN releases
# the slot (and its shared hold) and, as the head, re-takes a free slot and the turnstile
# (both -n: lock order stays slot -> turnstile -> host). Once it holds both it waits for
# the running suites to finish (writer preference: it keeps slot + turnstile for that
# drain, and no new suite starts meanwhile). Its queue order: the time it first
# re-queued (plain FIFO, so it cannot starve), promoted to the suite's ORIGINAL arrival
# while no suite queued behind that arrival has waited > YIELD_S (it only jumps suites
# younger than the threshold, never one that waited longer). During the drain it yields
# again only to a ticket over YIELD_S that RANKS AHEAD of it (key < its re-queue time),
# the same rule, so it never churns or lets later suites in. The order key is ticket
# line 3, so copies without it (they order by the name = the re-queue time) still see a
# live head and never deadlock with it. Every wait keeps its deadline (exit 75);
# lci_exclusive_end returns to a shared hold of the slot it holds now (the holder record
# follows the slot). "Waited > YIELD_S" counts whole seconds (in effect YIELD_S + <1 s).
# An exclusive hold longer than
# LOCAL_CI_EXCL_MAX_S logs a WARNING (and `status` flags it); with LOCAL_CI_EXCL_ENFORCE=1
# (the caller opts in) lci_run also runs the exclusive step under timeout(1) for what is
# left of that budget (exit 124 when it fires; a shell function cannot be run that way).
#
# API (bash):  lci_gate_begin <label>         wait for a slot (+ shared host lock)
#              lci_exclusive_begin <step>     wait until no other suite runs
#              lci_exclusive_end              back to shared
#              lci_run <cmd...>               run a child WITHOUT the lock fds (a daemon a
#                                             step leaves behind can't pin a slot)
#              lci_offload_orinda <repo> <preflight-shell> <args...>   see --host orinda
#                                             (chunked: <= 20-min holds, >= 10-min gaps)
# CLI:         bash ci/host-gate.sh status    who holds what, and the queue, right now
#
# Knobs: LOCAL_CI_WAIT_S (default 7200; 0 = wait forever; run-local.sh --wait-timeout S)
#        LOCAL_CI_SLOTS (2), LOCAL_CI_LOCK_DIR (~/_locks/local-ci), LOCAL_CI_POLL_S (60)
#        LOCAL_CI_EXCL_YIELD_S (600), LOCAL_CI_EXCL_MAX_S (900; 0 = no warning),
#        LOCAL_CI_EXCL_ENFORCE (0), LOCAL_CI_STALE_S (300)
#        --host orinda: LOCAL_CI_OFFLOAD_MIN (20, max 20), LOCAL_CI_ORINDA_CHUNK_S (900),
#        LOCAL_CI_ORINDA_GAP_S (600), LOCAL_CI_ORINDA_POLL_S (60), LOCAL_CI_ORINDA_LEASE_S (900)

LCI_LOCK_DIR="${LOCAL_CI_LOCK_DIR:-$HOME/_locks/local-ci}"
LCI_SLOTS="${LOCAL_CI_SLOTS:-2}"
LCI_WAIT_S="${LOCAL_CI_WAIT_S:-7200}"
LCI_POLL_S="${LOCAL_CI_POLL_S:-60}"
LCI_EXCL_YIELD_S="${LOCAL_CI_EXCL_YIELD_S:-600}"
LCI_EXCL_MAX_S="${LOCAL_CI_EXCL_MAX_S:-900}"
LCI_STALE_S="${LOCAL_CI_STALE_S:-300}"
LCI_QDIR="$LCI_LOCK_DIR/queue"
LCI_HOSTNAME="$(uname -n)"; LCI_HOSTNAME="${LCI_HOSTNAME%%.*}"
LCI_SLOT=""; LCI_SLOT_FD=""; LCI_HOST_FD=""; LCI_TURN_FD=""; LCI_LABEL=""; LCI_T0=""
LCI_ON=0
LCI_TICKET=""; LCI_TICKET_BODY=""; LCI_POS=0; LCI_ARRIVE_NS=""; LCI_ASK_NS=""; LCI_XKEY=""
LCI_EXCL=0; LCI_EXCL_T=0; LCI_EXCL_STEP=""; LCI_EXCL_WD=""
LCI_Q=(); LCI_QK=(); LCI_QW=(); LCI_QI=(); LCI_QSTOP=(); LCI_QDEAD=()
LCI_OLD_N=0; LCI_OLD_W=0; LCI_OLD_I=""; LCI_ST_STATE=""; LCI_ST_START=""

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

# lci__stat <pid>: LCI_ST_STATE (R/S/D/T/...) and LCI_ST_START (/proc start time, field 22)
# from /proc/<pid>/stat, read with builtins (no subshell: $BASHPID stays ours). 1 = gone.
lci__stat() {
  local s a
  LCI_ST_STATE=""; LCI_ST_START=""
  { read -r s <"/proc/$1/stat"; } 2>/dev/null || return 1
  s="${s##*) }"                               # comm may hold spaces and ')'
  IFS=' ' read -r -a a <<<"$s"
  LCI_ST_STATE="${a[0]:-}"; LCI_ST_START="${a[19]:-}"
  return 0
}

lci__ticket_write() {  # atomic (write + rename): a reader never sees half a ticket
  local tmp="$LCI_QDIR/.tmp-${LCI_TICKET##*/}"
  mkdir -p "$LCI_QDIR" 2>/dev/null || return 1
  printf '%s\n' "$LCI_TICKET_BODY" >"$tmp" 2>/dev/null || return 1
  mv -f "$tmp" "$LCI_TICKET" 2>/dev/null
}

# lci__ticket_new [<exclusive step>]: a ticket named by the time now (ns). With a step it is
# an EXCLUSIVE re-queue named by the time it (first) asked; line 3 = "<order key> <asked>"
# (key = asked until lci__excl_rekey).
lci__ticket_new() {
  local ns me="$BASHPID" user now_iso x=""
  ns="$(date +%s%N)"
  case "$ns" in ''|*[!0-9]*) ns="$(date +%s)000000000" ;; esac    # no %N (BSD date)
  lci__stat "$me" || LCI_ST_START="-"
  user="$(id -un)"; now_iso="$(date -u +%FT%TZ)"
  LCI_TICKET="$LCI_QDIR/$ns-$me-$LCI_HOSTNAME"
  if [ -n "${1:-}" ]; then                      # a 2nd re-queue in one exclusive_begin keeps its place
    [ -z "$LCI_ASK_NS" ] || ns="$LCI_ASK_NS"
    LCI_TICKET="$LCI_QDIR/$ns-$me-$LCI_HOSTNAME"; LCI_ASK_NS="$ns"; LCI_XKEY="$ns"; x="EXCLUSIVE step=$1 "
  else LCI_ARRIVE_NS="$ns"; LCI_ASK_NS=""; LCI_XKEY=""; fi
  LCI_TICKET_BODY="$(printf '%s\n%slabel=%s pid=%s user=%s since=%s cwd=%s' "${LCI_ST_START:--}" \
    "$x" "$LCI_LABEL" "$me" "$user" "$now_iso" "$PWD")"
  [ -z "$LCI_ASK_NS" ] || LCI_TICKET_BODY+=$'\n'"$LCI_XKEY $LCI_ASK_NS"
  lci__ticket_write
}

lci__ticket_rm() {
  if [ -n "$LCI_TICKET" ]; then
    rm -f "$LCI_TICKET" "$LCI_QDIR/.tmp-${LCI_TICKET##*/}" 2>/dev/null || true
    LCI_TICKET=""
  fi
  return 0
}

# lci__queue_scan: LCI_Q = live, runnable tickets in queue order (LCI_QK = order key ns,
# LCI_QW = really waited s, LCI_QI = who); LCI_QSTOP = stopped ones ("waited|who"). The key
# is the name's ns, or line 3's for an EXCLUSIVE re-queue (its wait counts from "asked").
# Removes dead tickets (LCI_REAP=0: only lists them in LCI_QDEAD, for `status`).
lci__queue_scan() {
  local LC_ALL=C f n rest ns pid host st info ex key ask now mt dead j
  LCI_Q=(); LCI_QK=(); LCI_QW=(); LCI_QI=(); LCI_QSTOP=(); LCI_QDEAD=()
  now="$(lci__now)"
  for f in "$LCI_QDIR"/*; do
    n="${f##*/}"; ns="${n%%-*}"; rest="${n#*-}"; pid="${rest%%-*}"; host="${rest#*-}"
    case "$ns" in ''|*[!0-9]*) continue ;; esac               # not a ticket (or no match)
    case "$pid" in ''|*[!0-9]*) continue ;; esac
    st=""; info=""; ex=""
    { read -r st && read -r info && { read -r ex || ex=""; }; } 2>/dev/null <"$f" || continue  # removed under us
    key="${ex%% *}"; ask="${ex#* }"
    case "$key" in ''|*[!0-9]*) key="$ns" ;; esac
    case "$ask" in ''|*[!0-9]*) ask="$ns" ;; esac
    dead=0; LCI_ST_STATE=""
    if [ "$host" = "$LCI_HOSTNAME" ]; then
      if [ -d /proc/self ]; then
        if ! lci__stat "$pid"; then dead=1
        elif [ "$st" != "-" ] && [ "$st" != "$LCI_ST_START" ]; then dead=1; fi   # pid reused
      elif ! kill -0 "$pid" 2>/dev/null; then dead=1; fi
    else                                         # another host sharing this dir: heartbeat
      mt="$(date -r "$f" +%s 2>/dev/null)" || mt="$now"
      [ $(( now - mt )) -le "$LCI_STALE_S" ] || dead=1
    fi
    if [ $dead = 1 ]; then
      if [ "${LCI_REAP:-1}" = 1 ]; then
        if rm "$f" 2>/dev/null; then lci__log "removed a dead queue ticket ($n: $info)"; fi
      else LCI_QDEAD+=("$n: $info"); fi
      continue
    fi
    case "$LCI_ST_STATE" in
      T|t) LCI_QSTOP+=("$(( now - ask / 1000000000 ))|$info"); continue ;;
    esac
    j=${#LCI_Q[@]}                               # insert by key (names come sorted; keys rarely differ)
    while [ "$j" -gt 0 ] && [ "${LCI_QK[$(( j - 1 ))]}" -gt "$key" ]; do
      LCI_Q[j]="${LCI_Q[j-1]}"; LCI_QK[j]="${LCI_QK[j-1]}"; LCI_QW[j]="${LCI_QW[j-1]}"; LCI_QI[j]="${LCI_QI[j-1]}"
      j=$(( j - 1 ))
    done
    LCI_Q[j]="$f"; LCI_QK[j]="$key"; LCI_QW[j]="$(( now - ask / 1000000000 ))"; LCI_QI[j]="$info"
  done
  return 0
}

lci__queue_pos() {  # LCI_POS = 1-based position of our ticket in LCI_Q (0 = not in it)
  local i
  LCI_POS=0
  for i in "${!LCI_Q[@]}"; do
    if [ "${LCI_Q[$i]}" = "$LCI_TICKET" ]; then LCI_POS=$(( i + 1 )); break; fi
  done
  return 0
}

lci__queue_show() {  # the queue, oldest first (status + the first "waiting" line)
  local i
  lci__queue_scan
  if [ ${#LCI_Q[@]} = 0 ] && [ ${#LCI_QSTOP[@]} = 0 ] && [ ${#LCI_QDEAD[@]} = 0 ]; then
    echo "  queue: empty"; return 0
  fi
  echo "  queue: ${#LCI_Q[@]} waiting for a slot, oldest first (only #1 may take a free slot):"
  for i in "${!LCI_Q[@]}"; do echo "    #$(( i + 1 )) waited ${LCI_QW[$i]}s  ${LCI_QI[$i]}"; done
  for i in "${LCI_QSTOP[@]+"${LCI_QSTOP[@]}"}"; do echo "    (STOPPED, skipped) waited ${i%%|*}s  ${i#*|}"; done
  for i in "${LCI_QDEAD[@]+"${LCI_QDEAD[@]}"}"; do echo "    (dead; the next waiter removes it) $i"; done
  return 0
}

lci__timeout() {
  lci__ticket_rm
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

lci__on_exit() { lci__ticket_rm; lci_gate_end; }

lci__holder_write() {  # slotN.holder follows the slot we hold now
  printf 'label=%s pid=%s user=%s since=%s cwd=%s\n' "$LCI_LABEL" "$$" "$(id -un)" \
    "$(date -u +%FT%TZ)" "$PWD" >"$LCI_LOCK_DIR/slot$LCI_SLOT.holder" 2>/dev/null || true
}

lci__slot_release() {  # give the slot back (record first, so we never remove a successor's)
  local line="" f="$LCI_LOCK_DIR/slot$LCI_SLOT.holder"
  { read -r line <"$f"; } 2>/dev/null || true
  case "$line" in *" pid=$$ "*) rm -f "$f" ;; esac
  if [ -n "$LCI_SLOT_FD" ]; then exec {LCI_SLOT_FD}>&-; fi
  LCI_SLOT=""; LCI_SLOT_FD=""
  return 0
}

# lci__excl_rekey: an EXCLUSIVE re-queue is ordered by its ORIGINAL arrival (writer
# preference) unless a live ticket queued behind that arrival has really waited > YIELD_S;
# then by the time it asked (plain FIFO). Published as line 3 (atomic rewrite).
lci__excl_rekey() {
  local i want="$LCI_ARRIVE_NS"
  case "$want" in ''|*[!0-9]*) want="$LCI_ASK_NS" ;; esac
  [ "$want" -lt "$LCI_ASK_NS" ] || want="$LCI_ASK_NS"
  for i in "${!LCI_Q[@]}"; do
    [ "${LCI_Q[$i]}" = "$LCI_TICKET" ] && continue
    if [ "${LCI_QK[$i]}" -gt "$want" ] && [ "${LCI_QW[$i]}" -gt "$LCI_EXCL_YIELD_S" ]; then want="$LCI_ASK_NS"; break; fi
  done
  [ "$want" = "$LCI_XKEY" ] && return 1
  if [ "$want" = "$LCI_ASK_NS" ]; then
    lci__log "EXCLUSIVE $LCI_EXCL_STEP queues from the time it asked (a suite behind its arrival has waited > ${LCI_EXCL_YIELD_S}s)"
  else
    lci__log "EXCLUSIVE $LCI_EXCL_STEP queues by its suite's arrival (no suite behind it has waited > ${LCI_EXCL_YIELD_S}s)"
  fi
  LCI_XKEY="$want"
  LCI_TICKET_BODY="${LCI_TICKET_BODY%$'\n'*}"$'\n'"$LCI_XKEY $LCI_ASK_NS"
  lci__ticket_write || true
  return 0
}

# lci__slot_wait [<exclusive step>]: wait in the FIFO queue until our ticket is the head and a
# slot is free (-> LCI_SLOT/LCI_SLOT_FD). With a step (an EXCLUSIVE re-queue) the head also
# needs the turnstile (-n; busy: drop the slot, stay the head).
lci__slot_wait() {
  local xs="${1:-}" what="a CI slot" i fd announced=0 left last beat head=0 tbusy=0
  [ -z "$xs" ] || what="a CI slot + the turnstile for EXCLUSIVE $xs"
  last="$(lci__now)"; beat="$last"
  while :; do
    [ -e "$LCI_TICKET" ] || lci__ticket_write || true    # removed by hand: same place again
    lci__queue_scan
    if [ -n "$xs" ] && lci__excl_rekey; then lci__queue_scan; fi
    lci__queue_pos
    if [ "$LCI_POS" = 1 ]; then               # FIFO: only the oldest live waiter takes a slot
      for i in $(seq 1 "$LCI_SLOTS"); do
        exec {fd}>>"$LCI_LOCK_DIR/slot$i.lock"
        if flock -n "$fd"; then
          if [ -z "$xs" ] || flock -n -x "$LCI_TURN_FD"; then LCI_SLOT="$i"; LCI_SLOT_FD="$fd"; break 2; fi
          exec {fd}>&-
          [ $tbusy = 1 ] || lci__log "first in the queue, but the turnstile is held (another exclusive step): $xs waits for it WITHOUT a slot"
          tbusy=1; break
        fi
        exec {fd}>&-
      done
    fi
    if [ $announced = 0 ]; then
      lci__log "waiting for $what ($LCI_SLOTS max on $LCI_HOSTNAME, $LCI_LABEL, pid $$; queue position $LCI_POS of ${#LCI_Q[@]}). Holders:"
      lci__holders >&2; lci__queue_show >&2; announced=1
    elif [ "$LCI_POS" = 1 ] && [ $head = 0 ]; then
      lci__log "first in the queue after $(( $(lci__now) - LCI_T0 ))s: taking the next free CI slot"
    fi
    [ "$LCI_POS" = 1 ] && head=1 || head=0
    left="$(lci__left)"; [ -z "$left" ] || [ "$left" -gt 0 ] || lci__timeout "$what"
    if [ "$LCI_POS" -ge 1 ] && [ "$LCI_POS" -le "$LCI_SLOTS" ]; then sleep 1; else sleep 2; fi
    if [ $(( $(lci__now) - beat )) -ge 30 ]; then beat="$(lci__now)"; touch "$LCI_TICKET" 2>/dev/null || true; fi
    if [ $(( $(lci__now) - last )) -ge "$LCI_POLL_S" ]; then
      last="$(lci__now)"; lci__log "still waiting for $what ($(( last - LCI_T0 ))s; queue position $LCI_POS of ${#LCI_Q[@]})"
    fi
  done
  lci__ticket_rm
  [ $announced = 1 ] && lci__log "got CI slot $LCI_SLOT after $(( $(lci__now) - LCI_T0 ))s"
  return 0
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
  trap 'lci__on_exit' EXIT                    # from here on: the ticket goes on any exit
  trap 'exit 130' INT
  trap 'exit 143' TERM
  lci__ticket_new || { lci__log "cannot write a queue ticket under $LCI_QDIR"; exit 75; }
  lci__slot_wait
  # Writer preference: pass the turnstile (a waiting EXCLUSIVE step holds it), then share.
  lci__flock_wait -x "$LCI_TURN_FD" "the turnstile (a Lighthouse/perf step is waiting for the host)"
  lci__flock_wait -s "$LCI_HOST_FD" "the host lock (a Lighthouse/perf step holds it exclusively)"
  flock -u "$LCI_TURN_FD"
  lci__holder_write
  LCI_ON=1
  lci__log "slot $LCI_SLOT/$LCI_SLOTS held by $LCI_LABEL (pid $$); lock dir $LCI_LOCK_DIR"
}

lci_gate_end() {
  [ "$LCI_ON" = 1 ] || return 0
  lci__excl_clear
  lci__slot_release
  [ -n "$LCI_HOST_FD" ] && exec {LCI_HOST_FD}>&-
  [ -n "$LCI_TURN_FD" ] && exec {LCI_TURN_FD}>&-
  LCI_ON=0
}

# LCI_OLD_N = queued tickets that waited > LOCAL_CI_EXCL_YIELD_S (oldest: LCI_OLD_W s, LCI_OLD_I)
# AND rank ahead of this exclusive step: once it has re-queued (LCI_ASK_NS set) only a
# ticket whose order key is < LCI_ASK_NS counts (one queued later is behind it anyway;
# yielding to it would only churn and let later suites through the turnstile).
lci__old_tickets() {
  local i
  LCI_OLD_N=0; LCI_OLD_W=0; LCI_OLD_I=""
  lci__queue_scan
  for i in "${!LCI_Q[@]}"; do
    [ "${LCI_Q[$i]}" = "$LCI_TICKET" ] && continue
    [ -z "$LCI_ASK_NS" ] || [ "${LCI_QK[$i]}" -lt "$LCI_ASK_NS" ] || continue
    if [ "${LCI_QW[$i]}" -gt "$LCI_EXCL_YIELD_S" ]; then
      LCI_OLD_N=$(( LCI_OLD_N + 1 ))
      if [ "${LCI_QW[$i]}" -gt "$LCI_OLD_W" ]; then LCI_OLD_W="${LCI_QW[$i]}"; LCI_OLD_I="${LCI_QI[$i]}"; fi
    fi
  done
  return 0
}

lci__excl_watch() {  # a helper WITHOUT the lock fds: WARN once the hold passes EXCL_MAX_S
  LCI_EXCL_WD=""
  [ "$LCI_EXCL_MAX_S" -gt 0 ] 2>/dev/null || return 0
  local parent="$BASHPID"
  (
    exec {LCI_SLOT_FD}>&- {LCI_HOST_FD}>&- {LCI_TURN_FD}>&- </dev/null >/dev/null
    while kill -0 "$parent" 2>/dev/null; do
      if [ $(( $(lci__now) - LCI_EXCL_T )) -ge "$LCI_EXCL_MAX_S" ]; then
        lci__log "WARNING: $LCI_EXCL_STEP ($LCI_LABEL, pid $parent) has held the EXCLUSIVE host lock $(( $(lci__now) - LCI_EXCL_T ))s > LOCAL_CI_EXCL_MAX_S=${LCI_EXCL_MAX_S}s; every other CI suite is blocked$([ "${LOCAL_CI_EXCL_ENFORCE:-0}" = 1 ] && echo "; timeout(1) ends the step now" || echo " (LOCAL_CI_EXCL_ENFORCE=1 would cap it with timeout)")"
        exit 0
      fi
      sleep 2 2>/dev/null
    done
  ) &
  LCI_EXCL_WD=$!
  return 0
}

lci__excl_clear() {  # end of an exclusive hold: stop the helper, drop the record, report
  [ "$LCI_EXCL" = 1 ] || return 0
  local d line f="$LCI_LOCK_DIR/exclusive.holder"
  if [ -n "$LCI_EXCL_WD" ]; then
    kill "$LCI_EXCL_WD" 2>/dev/null || true; wait "$LCI_EXCL_WD" 2>/dev/null || true; LCI_EXCL_WD=""
  fi
  line=""; { read -r line <"$f"; } 2>/dev/null || true
  case "$line" in *" pid=$$ "*) rm -f "$f" ;; esac
  d=$(( $(lci__now) - LCI_EXCL_T ))
  if [ "$LCI_EXCL_MAX_S" -gt 0 ] 2>/dev/null && [ "$d" -gt "$LCI_EXCL_MAX_S" ]; then
    lci__log "WARNING: EXCLUSIVE host lock for $LCI_EXCL_STEP was held ${d}s > LOCAL_CI_EXCL_MAX_S=${LCI_EXCL_MAX_S}s"
  else
    lci__log "EXCLUSIVE host lock for $LCI_EXCL_STEP released after ${d}s"
  fi
  LCI_EXCL=0
  return 0
}

lci_exclusive_begin() {
  [ "$LCI_ON" = 1 ] || return 0
  LCI_T0="$(lci__now)"; LCI_EXCL_STEP="$1"; LCI_ASK_NS=""
  flock -u "$LCI_HOST_FD"                     # drop shared first (else two waiters deadlock)
  lci__old_tickets
  if [ "$LCI_OLD_N" = 0 ] && flock -w 1 -x "$LCI_TURN_FD"; then   # a suite passing it takes ms
    lci__old_tickets                          # re-check under the turnstile
    if [ "$LCI_OLD_N" != 0 ]; then flock -u "$LCI_TURN_FD"; lci__excl_requeue "$1"; fi
  else
    lci__excl_requeue "$1"                    # it would wait: not on a slot
  fi
  lci__excl_drain "$1"
  flock -u "$LCI_TURN_FD"
  LCI_EXCL=1; LCI_EXCL_T="$(lci__now)"; LCI_EXCL_STEP="$1"
  printf 'label=%s step=%s pid=%s since=%s t=%s\n' "$LCI_LABEL" "$1" "$$" "$(date -u +%FT%TZ)" \
    "$LCI_EXCL_T" >"$LCI_LOCK_DIR/exclusive.holder" 2>/dev/null || true
  lci__excl_watch
  lci__log "EXCLUSIVE host lock held for $1"
}

# lci__excl_drain <step>: eligible (slot + turnstile held: no new suite starts), wait for the
# running suites to finish. A queued suite that ranks ahead (lci__old_tickets) crossing
# YIELD_S meanwhile ends eligibility: give the turnstile and the slot back and re-queue
# (same place), then drain again.
lci__excl_drain() {
  local what="the EXCLUSIVE host lock for $1 (no other CI suite running)" left step last
  flock -n -x "$LCI_HOST_FD" && return 0
  lci__log "waiting for $what ($LCI_LABEL, pid $$). Holders:"
  lci__holders >&2
  last="$(lci__now)"
  while :; do
    left="$(lci__left)"; step=2
    if [ -n "$left" ]; then [ "$left" -gt 0 ] || lci__timeout "$what"; [ "$left" -lt "$step" ] && step="$left"; fi
    flock -w "$step" -x "$LCI_HOST_FD" && { lci__log "got $what after $(( $(lci__now) - LCI_T0 ))s"; return 0; }
    lci__old_tickets
    if [ "$LCI_OLD_N" != 0 ]; then flock -u "$LCI_TURN_FD"; lci__excl_requeue "$1"; continue; fi
    if [ $(( $(lci__now) - last )) -ge "$LCI_POLL_S" ]; then
      last="$(lci__now)"; lci__log "still waiting for $what ($(( last - LCI_T0 ))s)"
    fi
  done
}

# lci__excl_requeue <step>: queue an EXCLUSIVE ticket, release the slot, come back holding a
# slot (maybe another number) + the turnstile. Bounded by the wait deadline (exit 75).
lci__excl_requeue() {
  local was="$LCI_SLOT"
  if [ "$LCI_OLD_N" -gt 0 ]; then
    lci__log "YIELDING: $LCI_OLD_N suite(s) queued for a CI slot > ${LCI_EXCL_YIELD_S}s (oldest ${LCI_OLD_W}s: $LCI_OLD_I); $1 ($LCI_LABEL, pid $$) RELEASES CI slot $was and re-queues"
  else
    lci__log "$1 ($LCI_LABEL, pid $$): the turnstile is held (another exclusive step waits or runs); RELEASES CI slot $was and re-queues"
  fi
  # ticket (with its order key) BEFORE the slot goes: no younger waiter slips in between
  lci__ticket_new "$1" || { lci__log "cannot write a queue ticket under $LCI_QDIR"; exit 75; }
  lci__queue_scan; lci__excl_rekey || true
  lci__slot_release
  lci__slot_wait "$1"
  lci__holder_write
  lci__log "done yielding after $(( $(lci__now) - LCI_T0 ))s: $1 re-took CI slot $LCI_SLOT (was $was) + the turnstile; waiting for the running suites to finish"
}

lci_exclusive_end() {
  [ "$LCI_ON" = 1 ] || return 0
  # downgrade. flock(2) conversion is not atomic: a drain waiter may take -x in between, and
  # then this waits for that exclusive step (benign; no lock is held that it needs).
  flock -s "$LCI_HOST_FD"
  lci__excl_clear
}

lci_run() {
  if [ "$LCI_ON" = 1 ]; then
    if [ "$LCI_EXCL" = 1 ] && [ "${LOCAL_CI_EXCL_ENFORCE:-0}" = 1 ] && [ "$LCI_EXCL_MAX_S" -gt 0 ] 2>/dev/null; then
      local rem=$(( LCI_EXCL_MAX_S - ( $(lci__now) - LCI_EXCL_T ) ))
      [ "$rem" -gt 0 ] || rem=1
      timeout -k 30 "$rem" "$@" {LCI_SLOT_FD}>&- {LCI_HOST_FD}>&- {LCI_TURN_FD}>&-
    else "$@" {LCI_SLOT_FD}>&- {LCI_HOST_FD}>&- {LCI_TURN_FD}>&-; fi
  else "$@"; fi
}

# --host orinda (CHUNKED, 2026-09-30): run the suite on orinda in chunks, each only while
# holding orinda's measurement lock (~/bin_mlock.sh there: a mkdir mutex ~/.measure_lock + a
# holder record; orinda-ci runners take it SHARED under /run/orinda-ci-mlock/shared). orinda's
# rule (10x Production, 09-30): releases and measurements share orinda, so one hold is <= 20
# min and holds are >= 10 min apart (a 90-min whole-suite hold blocked a Windows wheel
# release build). The steps come from the remote `ci/run-local.sh --list` (or the caller's
# --only values) and run one at a time as `ci/run-local.sh --only <step> <other args>`.
# A chunk: acquire the lock for LOCAL_CI_OFFLOAD_MIN (default and max 20) minutes (held by a
# measurement, a pending DRAIN or another suite's tree lease = wait, polling every
# LOCAL_CI_ORINDA_POLL_S (60), at most LOCAL_CI_WAIT_S per acquire, then exit 75); run steps
# until the next one would start LOCAL_CI_ORINDA_CHUNK_S (900) into the chunk; release; wait
# LOCAL_CI_ORINDA_GAP_S (600); repeat. A step longer than the hold is not killed (a WARNING
# says so). Preflight and rsync run once per suite (the rsync in the first chunk).
# ~/_local_ci/<repo> is shared by every offloaded suite of that repo, so the suite that
# synced it holds a lease on it (.git/lci-owner, refreshed while the suite lives, stale
# after LOCAL_CI_ORINDA_LEASE_S) and another suite waits; if the tree is re-synced by
# someone else mid-suite, the suite stops (exit 75) and never grades those bytes.
# One summary at the end in the usual `LOCAL CI PASS|FAIL sha=... steps=N` form (exit 0/1);
# a preflight / lock / --list refusal exits 75 and never falls back to local.
# EXIT/INT/TERM/HUP: stop the remote step, drop the lease, release the lock.
#   lci_offload_orinda <repo> <remote preflight shell> <run-local args...>
LCI_OR_SSH=(); LCI_OR_REPO=""; LCI_OR_LANE=""; LCI_OR_TMP=""; LCI_OR_WHY=""
LCI_OR_HELD=0; LCI_OR_TREE=0; LCI_OR_PID=""; LCI_OR_SLEEP=""; LCI_OR_RC=0
LCI_OR_POLL_S="${LOCAL_CI_ORINDA_POLL_S:-60}"; LCI_OR_LEASE_S="${LOCAL_CI_ORINDA_LEASE_S:-900}"

# Remote scripts ($1.. = args, passed quoted). ACQ: lane repo mins why first lease.
# shellcheck disable=SC2016  # expanded on the remote host, on purpose
LCI_OR_ACQ='lane=$1 t=$HOME/_local_ci/$2/.git lease=$6 o="" a=0
leased() {  # another live suite leases the tree
  [ -f "$t/lci-owner" ] || return 1
  o="$(head -n1 "$t/lci-owner")"; a=$(( $(date +%s) - $(stat -c %Y "$t/lci-owner") ))
  [ "$o" != "$lane" ] && [ "$a" -lt "$lease" ]
}
if [ "$5" = 1 ] && leased; then echo "~/_local_ci/$2 is leased by another offloaded suite ($o, refreshed ${a}s ago)"; exit 3; fi
st="$(~/bin_mlock.sh status 2>&1)"
case "$st" in *"DRAIN requested by "*) d="${st#*DRAIN requested by }"; d="${d%% *}"
  [ "$d" = "$lane" ] || { echo "a DRAIN is pending for $d (a measurement waits to start)"; exit 1; } ;; esac
~/bin_mlock.sh acquire "$lane" "$3" "$4" || exit $?
if [ "$5" = 1 ]; then
  if leased; then
    ~/bin_mlock.sh release "$lane" >/dev/null
    echo "~/_local_ci/$2 is leased by another offloaded suite ($o, refreshed ${a}s ago)"; exit 3
  fi
elif [ "$(head -n1 "$t/lci-owner" 2>/dev/null)" = "$lane" ]; then touch -c "$t/lci-owner"
else ~/bin_mlock.sh release "$lane" >/dev/null; echo "~/_local_ci/$2 was re-synced by someone else since the last chunk"; exit 4
fi'
# shellcheck disable=SC2016
LCI_OR_REFRESH='[ "$(head -n1 "$HOME/_local_ci/$2/.git/lci-owner" 2>/dev/null)" = "$1" ] || exit 4
touch -c "$HOME/_local_ci/$2/.git/lci-owner"'
# STEP (login shell: uv/nvm live on the login PATH): lane repo step <run-local args...>
# shellcheck disable=SC2016
LCI_OR_STEP='lane=$1; cd "$HOME/_local_ci/$2" || exit 199; u=$3; shift 3
[ "$(head -n1 .git/lci-owner 2>/dev/null)" = "$lane" ] || { echo "this suite no longer owns ~/_local_ci/$2"; exit 199; }
ps -o pgid= -p $$ | tr -d " " >.git/lci-step.pgid
( while sleep 60; do touch -c .git/lci-owner; done ) </dev/null >/dev/null 2>&1 &
r=$!
ci/run-local.sh --only "$u" "$@"; rc=$?
kill "$r" 2>/dev/null; rm -f .git/lci-step.pgid; exit "$rc"'
# BYE: lane repo tree held stepping
# shellcheck disable=SC2016
LCI_OR_BYE='t=$HOME/_local_ci/$2/.git
if [ "$3" = 1 ] && [ "$(head -n1 "$t/lci-owner" 2>/dev/null)" = "$1" ]; then rm -f "$t/lci-owner"; fi
if [ "$5" = 1 ] && p="$(cat "$t/lci-step.pgid" 2>/dev/null)" && [ "${p:-0}" -gt 1 ] 2>/dev/null; then
  kill -TERM -- "-$p" 2>/dev/null
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do kill -0 -- "-$p" 2>/dev/null || break; sleep 0.5; done
  if kill -0 -- "-$p" 2>/dev/null; then echo "the remote step (pgid $p) is still stopping"; else echo "stopped the remote step"; fi
fi
if [ "$4" = 1 ]; then ~/bin_mlock.sh release "$1"; fi
true'

lci__or_sh() {  # <-c|-lc> <script> <args...>: run a bash script on the offload host
  local fl="$1" s="$2" q="" a; shift 2
  for a in "$@"; do q+=" $(printf %q "$a")"; done
  "${LCI_OR_SSH[@]}" "bash $fl $(printf %q "$s") lci$q" </dev/null
}

lci__or_sleep() { sleep "$1" & LCI_OR_SLEEP=$!; wait "$LCI_OR_SLEEP" || true; LCI_OR_SLEEP=""; }

lci__or_refresh() {  # keep our lease on the remote tree; 1 = the tree is not ours any more
  local rc=0
  lci__or_sh -c "$LCI_OR_REFRESH" "$LCI_OR_LANE" "$LCI_OR_REPO" >/dev/null 2>&1 || rc=$?
  if [ "$rc" = 4 ]; then LCI_OR_WHY="the offload tree _local_ci/$LCI_OR_REPO was re-synced by someone else while this suite waited"; return 1; fi
  return 0
}

lci__or_release() {
  local out rc=0
  # shellcheck disable=SC2016
  out="$(lci__or_sh -c 'exec ~/bin_mlock.sh release "$1"' "$LCI_OR_LANE" 2>&1)" || rc=$?
  if [ "$rc" = 255 ]; then lci__log "offload: releasing the lock failed (ssh), retrying before the next acquire: $out"; return 0; fi
  LCI_OR_HELD=0; lci__log "$out"
}

# lci__or_acquire <first 0|1> <mins>: 0 = held; 1 = gave up (LCI_OR_WHY); exits 2 on a bad call.
lci__or_acquire() {
  local t0 out rc why="" said=0 now
  t0="$(lci__now)"
  while :; do
    if [ "$LCI_OR_HELD" = 1 ]; then lci__or_release; fi   # an earlier release that failed
    rc=0
    out="$(lci__or_sh -c "$LCI_OR_ACQ" "$LCI_OR_LANE" "$LCI_OR_REPO" "$2" \
      "local-ci $LCI_OR_REPO suite chunk from $(hostname -s) (<= $2 min, steps one at a time)" "$1" "$LCI_OR_LEASE_S" 2>&1)" || rc=$?
    case "$rc" in
      0) LCI_OR_HELD=1; lci__log "$out"; return 0 ;;
      2) lci__log "offload: ~/bin_mlock.sh refused the call: $out"; exit 2 ;;
      4) LCI_OR_WHY="$out"; return 1 ;;
      255) out="ssh failed: $out" ;;
    esac
    now="$(lci__now)"
    if [ "${out%%[0-9]*}" != "$why" ] || [ $(( now - said )) -ge 300 ]; then
      why="${out%%[0-9]*}"; said="$now"
      lci__log "offload: waiting for the measurement lock ($(( now - t0 ))s): ${out##*$'\n'}"
    fi
    if [ "$LCI_WAIT_S" != 0 ] && [ $(( now - t0 )) -ge "$LCI_WAIT_S" ]; then
      LCI_OR_WHY="the measurement lock was not free for ${LCI_WAIT_S}s (LOCAL_CI_WAIT_S / --wait-timeout): ${out##*$'\n'}"
      return 1
    fi
    if [ "$1" = 0 ]; then lci__or_refresh || return 1; fi   # keep our tree while we wait
    lci__or_sleep "$LCI_OR_POLL_S"
  done
}

lci__or_gap() {  # <seconds>: no hold, the tree lease kept fresh
  local left="$1" s
  while [ "$left" -gt 0 ]; do
    s="$LCI_OR_POLL_S"; if [ "$left" -lt "$s" ]; then s="$left"; fi
    lci__or_sleep "$s"; left=$(( left - s ))
    lci__or_refresh || return 1
  done
}

lci__or_step() {  # <step> <run-local args...>: LCI_OR_RC, output in $LCI_OR_TMP/out
  local q="" a
  for a in "$LCI_OR_LANE" "$LCI_OR_REPO" "$@"; do q+=" $(printf %q "$a")"; done
  "${LCI_OR_SSH[@]}" "bash -lc $(printf %q "$LCI_OR_STEP") lci$q" </dev/null >"$LCI_OR_TMP/out" 2>&1 &
  LCI_OR_PID=$!
  LCI_OR_RC=0; wait "$LCI_OR_PID" || LCI_OR_RC=$?
  LCI_OR_PID=""
}

lci__or_exit() {
  set +e
  local stepping=0
  [ -z "$LCI_OR_SLEEP" ] || kill "$LCI_OR_SLEEP" 2>/dev/null
  if [ -n "$LCI_OR_PID" ]; then stepping=1; kill "$LCI_OR_PID" 2>/dev/null; fi
  if [ "$LCI_OR_TREE$LCI_OR_HELD$stepping" != 000 ]; then
    lci__or_sh -c "$LCI_OR_BYE" "$LCI_OR_LANE" "$LCI_OR_REPO" "$LCI_OR_TREE" "$LCI_OR_HELD" "$stepping" 2>&1 \
      | sed 's/^/[host-gate] offload exit: /' >&2
    LCI_OR_TREE=0; LCI_OR_HELD=0
  fi
  [ -z "$LCI_OR_TMP" ] || rm -rf "$LCI_OR_TMP"
}

# lci__or_parse_list "<kinds>" < `ci/run-local.sh --list`: the runnable step names in list
# order, one per line. Layouts: section headers (unindented, starting with '#' or ending in
# ':') with indented steps, or one `<step> <kind...>` line per step. Kinds: default, full,
# served; manual / implicit are skipped. Exit 1 (reason on stderr) on anything it cannot
# place: an unknown section, a step line with no kind, a name with odd characters, a
# `# <kind>: N` header whose N does not match, or no runnable step at all.
lci__or_parse_list() {
  awk -v want="$1" '
    function kind(s) { s = tolower(s)
      if (s ~ /manual|implicit/) return "skip"; if (s ~ /served/) return "served"
      if (s ~ /full/) return "full"; if (s ~ /default|run by/) return "default"; return "" }
    function bad(m) { if (!err) print "cannot parse --list line " NR ": " m > "/dev/stderr"; err = 1 }
    function close_sec() { if (sec != "skip" && cnt_want != "" && cnt_want + 0 != cnt) bad("\"" head "\" announces " cnt_want " steps, lists " cnt) }
    { sub(/\r$/, "") }
    /^[ \t]*$/ { next }
    /^[^ \t]/ && (/^#/ || /:[ \t]*$/) {
      close_sec(); head = $0; sec = kind($0); hdr = 1; cnt = 0; cnt_want = ""
      if (sec == "") bad("unknown section: " $0)
      if (/^#.*:[ \t]*[0-9]+[ \t]*$/) cnt_want = $NF
      next }
    /^[ \t]/ { if (!hdr) next; cnt++; name = $1; k = sec }
    /^[^ \t]/ { if (hdr) { bad("unindented line under a section: " $0); next }
      name = $1; rest = $0; sub(/^[^ \t]+[ \t]*/, "", rest); k = kind(rest)
      if (k == "") { bad("no kind for step: " $0); next } }
    k == "skip" { next }
    name !~ /^[A-Za-z0-9_][A-Za-z0-9_.:\/@+=,-]*$/ { bad("odd step name: " name); next }
    index(want, " " k " ") && !(name in seen) { seen[name] = 1; print name; n++ }
    END { close_sec(); if (!n && !err) { print "no runnable step in --list" > "/dev/stderr"; err = 1 }; exit err }'
}

lci_offload_orinda() {
  local repo="$1" pre="$2"; shift 2
  local host="${LOCAL_CI_OFFLOAD_HOST:-orinda}" mins="${LOCAL_CI_OFFLOAD_MIN:-20}"
  local chunk_s="${LOCAL_CI_ORINDA_CHUNK_S:-900}" gap_s="${LOCAL_CI_ORINDA_GAP_S:-600}"
  local root sha out list="" want=" default " listmode=0 i=0 n=0 u v nm got bad ran t_chunk t_step dt
  local chunks=0 nf=0 left=0 lost="" warn_s
  local units=() fwd=() order=()
  local -A res=() note=() known=()
  case "$mins" in ''|*[!0-9]*|0) mins=20 ;; esac
  if [ "$mins" -gt 20 ]; then lci__log "LOCAL_CI_OFFLOAD_MIN=$mins: orinda holds are <= 20 min; using 20"; mins=20; fi
  warn_s="${LOCAL_CI_ORINDA_WARN_S:-$(( mins * 60 ))}"
  root="$(git rev-parse --show-toplevel)" || return 2
  [ -d "$root/.git" ] || { lci__log "--host $host needs a normal checkout (.git is not a directory here: worktree?)"; exit 2; }
  sha="$(git -C "$root" rev-parse HEAD)"
  LCI_OR_REPO="$repo"; LCI_OR_LANE="local-ci-$repo-$(hostname -s)-$$"
  LCI_OR_SSH=(ssh -o BatchMode=yes -o ConnectTimeout=10 "$host")
  while [ $# -gt 0 ]; do
    case "$1" in
      --only) [ $# -ge 2 ] || { lci__log "--only needs a step name"; exit 2; }; units+=("$2"); shift ;;
      --only=*) units+=("${1#--only=}") ;;
      --full) want=" default full served "; fwd+=("$1") ;;
      --served) want=" served "; fwd+=("$1") ;;
      *) fwd+=("$1") ;;
    esac
    shift
  done
  [ ${#units[@]} -gt 0 ] || listmode=1
  lci__log "offload: toolchain preflight on $host"
  if ! out="$("${LCI_OR_SSH[@]}" "bash -lc $(printf %q "$pre")" </dev/null 2>&1)"; then
    lci__log "offload REFUSED: $host lacks the toolchain for $repo:"; printf '%s\n' "$out" | sed 's/^/    /' >&2
    lci__log "the default (local, gated) still works: rerun without --host"; exit 75
  fi
  LCI_OR_TMP="$(mktemp -d "${TMPDIR:-/tmp}/lci-orinda.XXXXXX")" || exit 2
  trap 'lci__or_exit' EXIT
  trap 'exit 130' INT; trap 'exit 143' TERM; trap 'exit 129' HUP
  while :; do
    if ! lci__or_acquire "$(( chunks == 0 ))" "$mins"; then lost="$LCI_OR_WHY"; break; fi
    chunks=$(( chunks + 1 )); t_chunk="$(lci__now)"; ran=0
    if [ "$chunks" = 1 ]; then
      "${LCI_OR_SSH[@]}" "mkdir -p ~/_local_ci/$repo" </dev/null || exit 2
      rsync -a --delete --exclude node_modules --exclude /dist --exclude /ci/.logs --exclude /ci/.tmp \
        --exclude .venv --exclude .astro -e "ssh -o BatchMode=yes" "$root/" "$host:_local_ci/$repo/" || exit 2
      # shellcheck disable=SC2016
      lci__or_sh -c 'printf "%s\n" "$1" >"$HOME/_local_ci/$2/.git/lci-owner"' "$LCI_OR_LANE" "$repo" || exit 2
      LCI_OR_TREE=1
      # the step list: the units to run (unless the caller gave --only), and every runnable
      # name, so only real step names count in the per-step PASS/FAIL lines
      out=""
      if ! list="$("${LCI_OR_SSH[@]}" "bash -lc $(printf %q "cd ~/_local_ci/$repo && ci/run-local.sh --list")" </dev/null 2>&1)" \
         || ! out="$(printf '%s\n' "$list" | lci__or_parse_list " default full served " 2>&1)" \
         || { [ "$listmode" = 1 ] && ! out="$(printf '%s\n' "$list" | lci__or_parse_list "$want" 2>&1)"; }; then
        lci__log "offload REFUSED: cannot parse the step list (ci/run-local.sh --list on $host); nothing ran:"
        if [ "$out" != "$list" ]; then printf '%s\n' "$out" | tail -n 3 | sed 's/^/    /' >&2; fi
        printf '%s\n' "$list" | tail -n 15 | sed 's/^/    | /' >&2
        lci__log "the default (local, gated) still works: rerun without --host"; exit 75
      fi
      while IFS= read -r u; do known[$u]=1; done < <(printf '%s\n' "$list" | lci__or_parse_list " default full served ")
      if [ "$listmode" = 1 ]; then mapfile -t units <<<"$out"; fi
      n=${#units[@]}
      lci__log "offload: $n step(s) on $host (sha $sha), one at a time, in chunks: lock <= ${mins} min, no step starts after ${chunk_s}s of a chunk, >= ${gap_s}s between chunks"
    fi
    while [ "$i" -lt "$n" ]; do
      u="${units[$i]}"
      if [ -n "${res[$u]+x}" ]; then i=$(( i + 1 )); continue; fi   # already ran (a prefix --only)
      if [ "$ran" -gt 0 ] && [ $(( $(lci__now) - t_chunk )) -ge "$chunk_s" ]; then break; fi
      t_step="$(lci__now)"
      lci__or_step "$u" "${fwd[@]+"${fwd[@]}"}"
      dt=$(( $(lci__now) - t_step ))
      sed 's/^/  | /' "$LCI_OR_TMP/out"
      if [ "$LCI_OR_RC" = 199 ]; then lost="$(tail -n1 "$LCI_OR_TMP/out")"; break 2; fi
      got=0; bad=0
      while read -r v nm _; do
        case "$v" in PASS|FAIL) ;; *) continue ;; esac
        if [ -z "$nm" ] || [ -z "${known[$nm]+x}" ]; then continue; fi   # a log line, not a step
        if [ -z "${res[$nm]+x}" ]; then order+=("$nm"); fi
        res[$nm]="$v"; got=1
        if [ "$v" = FAIL ]; then bad=1; fi
      done <"$LCI_OR_TMP/out"
      if [ "$LCI_OR_RC" != 0 ] && [ "$bad" = 0 ]; then   # a non-zero exit is a failure, lines or not
        if [ -z "${res[$u]+x}" ]; then order+=("$u"); fi
        res[$u]=FAIL; note[$u]=" (exit $LCI_OR_RC on $host)"
      elif [ "$got" = 0 ]; then
        if [ -z "${res[$u]+x}" ]; then order+=("$u"); fi
        res[$u]=PASS
      fi
      if [ "$dt" -gt "$warn_s" ]; then
        lci__log "WARNING: step $u ran ${dt}s, longer than the ${mins}-min hold (orinda rule: holds <= 20 min); not killed"
      fi
      i=$(( i + 1 )); ran=$(( ran + 1 ))
    done
    lci__log "offload: chunk $chunks: $ran step(s), lock held $(( $(lci__now) - t_chunk ))s"
    lci__or_release
    [ "$i" -lt "$n" ] || break
    lci__log "offload: $(( n - i )) step(s) left; next chunk after a ${gap_s}s gap"
    if ! lci__or_gap "$gap_s"; then lost="$LCI_OR_WHY"; break; fi
  done
  if [ "$chunks" = 0 ]; then
    lci__log "offload REFUSED: $lost"
    lci__log "the default (local, gated) still works: rerun without --host"; exit 75
  fi
  echo "----"
  for u in "${order[@]+"${order[@]}"}"; do
    echo "${res[$u]} $u${note[$u]:-}"
    if [ "${res[$u]}" = FAIL ]; then nf=$(( nf + 1 )); fi
  done
  for (( ; i < n; i++ )); do
    if [ -z "${res[${units[$i]}]+x}" ]; then left=$(( left + 1 )); fi
  done
  if [ -n "$lost" ]; then
    lci__log "offload STOPPED after $chunks chunk(s): $lost"
    echo "LOCAL CI FAIL sha=$sha steps=${#order[@]} failed=$nf not_run=$left host=$host chunks=$chunks"; exit 75
  fi
  if [ "$nf" = 0 ]; then echo "LOCAL CI PASS sha=$sha steps=${#order[@]} host=$host chunks=$chunks"; exit 0; fi
  echo "LOCAL CI FAIL sha=$sha steps=${#order[@]} failed=$nf host=$host chunks=$chunks"; exit 1
}

# Direct execution: `bash ci/host-gate.sh status`
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  case "${1:-status}" in
    status)
      echo "lock dir: $LCI_LOCK_DIR  slots: $LCI_SLOTS  load: $(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null)"
      mkdir -p "$LCI_LOCK_DIR"; lci__holders
      if flock -n -x "$LCI_LOCK_DIR/host.lock" true 2>/dev/null; then echo "  host.lock: free"
      elif flock -n -s "$LCI_LOCK_DIR/host.lock" true 2>/dev/null; then echo "  host.lock: shared (suites running)"
      else
        echo "  host.lock: EXCLUSIVE (a Lighthouse/perf step is running)"
        x=""; { read -r x <"$LCI_LOCK_DIR/exclusive.holder"; } 2>/dev/null || true
        xt="${x##* t=}"; case "$xt" in ''|*[!0-9]*) xt="" ;; esac
        if [ -n "$xt" ]; then
          xd=$(( $(lci__now) - xt )); xo=""
          [ "$LCI_EXCL_MAX_S" -gt 0 ] 2>/dev/null && [ "$xd" -gt "$LCI_EXCL_MAX_S" ] && xo="  OVER LOCAL_CI_EXCL_MAX_S=${LCI_EXCL_MAX_S}s"
          echo "    held ${xd}s by ${x% t=*}$xo"
        fi
      fi
      LCI_REAP=0 lci__queue_show ;;
    *) echo "usage: bash ci/host-gate.sh status" >&2; exit 2 ;;
  esac
fi
