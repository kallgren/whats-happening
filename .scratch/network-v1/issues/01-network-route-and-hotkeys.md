# 01 — Ship the /network route and the hotkeys

Type: task
Status: resolved
Blocked by: —

## Question

Nothing to decide about *whether* — this is the shell every other ticket lands in. Get an empty,
styled, reachable `/network` page onto the live deploy, with the hotkeys working in both directions.
Ship this alone, before any notes exist: it is the smallest thing that proves the route, the
rewrite, the shared CSS and the key handling all work together.

### Settled before this ticket

- **A static file**, `public/network.html`, plus a rewrite in `vercel.json`. The serverless function
  never runs for this route. The notes page must be completely independent of the scraping pipeline
  — a dead hejauppsala cannot affect it, and vice versa. It is also CDN-cacheable indefinitely.
- **Shares `public/style.css`**, adding a small `public/network.css` on top. The custom properties
  and typography are most of the value; note-specific rules go in the second file.
- **`n` on the hub → `/network`; `h` on `/network` → hub.** Both **inert while a note has focus** —
  guard on `contenteditable`/input focus, or `n` becomes unusable the moment you type a name.
- **A small visible hint on each page.** An invisible-only hotkey is one you forget you built.
- **No switcher UI.** Explicitly cut from the MVP.

### The work

- `public/network.html` — the page skeleton, Swedish chrome matching the hub, an empty grid
  container, and the hint.
- `public/network.css` — the grid, and nothing else yet.
- `public/network.js` (or inline for now) — the `h` handler with the focus guard.
- The hub's `n` handler. The hub is rendered by `lib/page.ts`; this is the **first client-side
  script the hub has ever carried**, so keep it to a few lines and make sure a script failure cannot
  cost the page its content — that property is load-bearing for the hub.
- The rewrite in `vercel.json`.

### Done when

`vercel deploy --prod` has run, `n` on the live hub lands on a styled empty Network page, `h` comes
back, and neither fires while typing.

## Answer

Shipped and verified locally. **Not deployed** — see the deploy note below.

**The files.** `public/network.html` (Swedish chrome matching the hub, an empty `.notes` grid for
ticket 02 to fill, the footer hint), `public/network.css` (the grid, and nothing else — a uniform
`auto-fill` grid at `minmax(16rem, 1fr)`; `auto-fill` rather than `auto-fit` so a single note stays
one card wide instead of stretching, because the order is the information), `public/network.js`
(the `h` handler), the hint styles appended to `public/style.css` since both pages use them, the
hub's inline `n` handler in `lib/page.ts`, and the `/network` → `/network.html` rewrite in
`vercel.json` ahead of the existing `/` → `/api`.

**The hint is also the link.** `<a href="/network">Nätverk</a> — eller tryck <kbd>n</kbd>` in each
footer. The switcher UI stays cut, but a phone has no keyboard to press `n` on, and a page reachable
only by typing its URL is a page that does not exist. Robert approved it on sight.

**Switching does not reload — this ticket's one real addition.** Robert, testing: *"when I toggle
back to the hub, it seems to reload the page, and it takes a second or two."* Correct, and
`location.href` is why: a fresh navigation never uses the browser's back/forward cache, so returning
to the hub re-ran the scrape. Both handlers now call a small `hop(path)` that prefers
`history.back()` when `document.referrer` says the previous entry *is* the target, falling back to a
plain navigation otherwise (cold tab, arrived from elsewhere, cross-origin referrer, no history).
Back-navigation restores the live frozen document — no request, no reload, no flash, scroll position
and open `<details>` intact.

The asymmetry is the point: the expensive direction (back to the server-rendered hub) is always the
bfcache one; the cheap direction (out to a static file) can stay a normal navigation. No timeout
fallback around `back()` — a pending timer is *paused* by the freeze and fires on restore, so a
"did it work?" safety net is exactly a way to fire a spurious navigation later. The referrer check
is the guard instead.

**The hop was not enough on its own, and the fix underneath it is the one that worked.** Robert,
still seeing a reload: the console showed `document.referrer` correct and `history.length` at 13, so
`history.back()` was firing — Arc was simply refusing the bfcache restore, most likely its own
injected content scripts (an open message port disqualifies a page, as does an attached DevTools).
The real culprit was one level down and had nothing to do with the hotkeys: `api/index.ts` sent
**`s-maxage` only**, which is shared-cache only, so the browser had no freshness lifetime of its own
and revalidated on every navigation. Under `vercel dev` there is no CDN at all, so every press of
`h` re-ran the full ~2.5 s scrape — most of what Robert was feeling was that, not the missing
bfcache.

Fixed by giving the browser its own lifetime: `max-age=300, s-maxage=3600,
stale-while-revalidate=86400`, capped at `Math.min(maxAge, 300)` so a failed source keeps its short
backoff. The return trip is now a disk-cache hit — no request, no scrape — in every browser,
whatever it decides about freezing pages.

Robert's verdict: *"it doesn't seem to reload, although there is some flashing when going back to
the hub. but i think i can live with that for now."* The flash is the tell that **bfcache is still
not engaging** — a restore repaints nothing. So the hop is currently doing no work in Arc and the
`max-age` is carrying it. The hop stays anyway: it costs ~8 lines, it is what preserves scroll
position and open `<details>`, and it should engage in a clean profile and on the phone. But it is
**unproven in a real browser** and should not be assumed. Accepted as-is for now; see the map's
*Not yet specified*.

The visible cost, accepted: `uppdaterad HH:MM` can lag by up to five minutes. The edge already
served copies up to an hour old, so the content is no staler than before — only the clock admits it.

**A standing constraint this creates:** nothing on either page may register an `unload` listener —
it disqualifies the page from the bfcache and would silently undo this. `pagehide`, which ticket 02
needs for its unconditional save, is bfcache-safe and fires on freeze. Noted on
[02](./02-notes-store-and-inline-editing.md).

**The focus guard**, on both handlers: no fire while `activeElement` is contenteditable, input,
textarea or select; none with ctrl/meta/alt (so `cmd+n` still opens a window); none during IME
composition or on an already-handled key. From ticket 02 on, the page is wall-to-wall
contenteditable, and an unguarded single-letter hotkey would navigate away mid-word.

**Verification.** No browser — the Chrome extension was unresponsive all session. Instead the real
handler source from both files (the hub's pulled out of `lib/page.ts` by regex, so the test reads
what actually ships) runs against a DOM stub: 22 cases over the guard and the hop, all passing.
Robert then exercised both routes by hand against `vercel dev` and approved. The bfcache hop itself
is the one thing verified only by its logic and not observed in a browser.

**`npm run dev` was broken before this ticket** and is fixed in passing: `vercel dev` refuses to
start when it finds `vercel dev` in the package's own `dev` script, so the script that was meant to
launch it was the thing preventing it. Renamed to **`npm start`**.

**Deploy deferred — Robert's call, and it changes the remaining tickets.** *"no prod deploy until
I've tested it myself. we'll probably do prod deploy when the whole feature is in place."* So this
ticket's original "done when `vercel deploy --prod` has run" is **not** met and deliberately so; the
gate moved to the end of the map. One SSO-protected preview deploy confirmed the rewrite works on
real Vercel routing before that call was made. Production is untouched and nothing is live.
