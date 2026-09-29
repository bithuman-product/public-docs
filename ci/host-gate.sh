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
# CLI:         bash ci/host-gate.sh status    who holds what, and the queue, right now
#
# Knobs: LOCAL_CI_WAIT_S (default 7200; 0 = wait forever; run-local.sh --wait-timeout S)
#        LOCAL_CI_SLOTS (2), LOCAL_CI_LOCK_DIR (~/_locks/local-ci), LOCAL_CI_POLL_S (60)
#        LOCAL_CI_EXCL_YIELD_S (600), LOCAL_CI_EXCL_MAX_S (900; 0 = no warning),
#        LOCAL_CI_EXCL_ENFORCE (0), LOCAL_CI_STALE_S (300)

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
  # shellcheck disable=SC2088  # the ~ expands on the remote host, on purpose
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
