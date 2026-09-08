// The `h` hotkey back to the hub, and nothing else. Ticket 02 brings the store
// and the editing; this file exists now so ticket 01 can prove the key handling
// works before there is anything to type into.
//
// Two things carry the weight here: the focus guard, and the history hop.

/** True while focus is anywhere text goes: a note, or any future input. */
function editing() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return /^(input|textarea|select)$/i.test(el.tagName);
}

/**
 * Go to `path` — but as a *history traversal* when that is where we just came
 * from, rather than as a fresh navigation.
 *
 * The difference is the whole feature. `location.href = "/"` re-fetches and
 * re-renders the hub, which is a server-rendered scrape: an edge-cache hit at
 * best, a ~2.5 s scrape at worst, and a fresh document either way. A
 * `history.back()` restores the page from the browser's back/forward cache —
 * the live document, frozen, with its scroll position and its open <details>
 * intact. No request, no reload, no flash.
 *
 * `document.referrer` is what makes the choice safe: we only go back when the
 * previous entry really is the page we want. Opened cold in a new tab, or
 * arrived at from anywhere else, and this falls through to a plain navigation.
 *
 * Deliberately no timeout fallback around `history.back()`. A pending timer is
 * *paused* when the page is frozen into the bfcache and fires on the way back
 * in, so a "did the back() work?" safety net is precisely a way to fire a
 * spurious navigation later. The referrer check is the guard instead.
 */
function hop(path) {
  let from = null;
  try { from = new URL(document.referrer); } catch (e) { /* empty or opaque */ }
  if (from && from.origin === location.origin && from.pathname === path && history.length > 1) {
    history.back();
  } else {
    location.href = path;
  }
}

/**
 * The guard is the substance of the handler. From ticket 02 onward every note
 * is a contenteditable, so an unguarded single-letter hotkey would navigate
 * away the moment Robert types an "h" into a name — the fastest way to build a
 * feature that eats your work.
 *
 * Shared in shape with the hub's inline `n` handler, deliberately duplicated
 * rather than factored into a file both pages load: the hub must not gain a
 * runtime dependency on an external script it can fail to fetch. See the map's
 * "whether the hub and Network should share more than CSS" — this is that
 * question's first concrete instance.
 *
 * NOTE for ticket 02: save on `pagehide`, never on `unload`. An `unload`
 * listener disqualifies the page from the bfcache outright and would silently
 * undo the hop above; `pagehide` is bfcache-safe and fires on freeze.
 */
document.addEventListener("keydown", (e) => {
  if (e.key !== "h" || e.isComposing || e.defaultPrevented) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (editing()) return;
  hop("/");
});
