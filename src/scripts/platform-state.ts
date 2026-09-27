// The reader's site-wide choices (language, platform, model) in the browser:
// read in the order URL parameter → storage → default (src/lib/ui-state.ts),
// written on an explicit choice, and announced to every widget on the page
// with one event. Every storage access is wrapped: a private window or blocked
// storage leaves the page working, with the default shown.
import { resolve, storageKey, type StateName } from "../lib/ui-state";

const EVT = "bh-state";

export function readState(name: StateName, allowed?: readonly string[], fallback: string | null = null): string | null {
  let url: string | null = null, stored: string | null = null;
  try { url = new URLSearchParams(location.search).get(name); } catch (_) {}
  try { stored = localStorage.getItem(storageKey(name)); } catch (_) {}
  return resolve(name, { url, stored, fallback }, allowed);
}

/** Remember a choice and tell every widget on the page. `inUrl` also writes
 *  it to the address bar (the quickstart picker's shareable `?platform=`). */
export function setState(name: StateName, key: string, inUrl = false) {
  try { localStorage.setItem(storageKey(name), key); } catch (_) {}
  if (inUrl) {
    try {
      const u = new URL(location.href);
      u.searchParams.set(name, key);
      history.replaceState(history.state, "", u);
    } catch (_) {}
  }
  document.dispatchEvent(new CustomEvent(EVT, { detail: { name, key } }));
}

export function onState(fn: (name: StateName, key: string) => void) {
  document.addEventListener(EVT, (e) => { const d = (e as CustomEvent).detail; fn(d.name, d.key); });
}
