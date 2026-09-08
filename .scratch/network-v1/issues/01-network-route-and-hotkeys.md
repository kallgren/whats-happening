# 01 — Ship the /network route and the hotkeys

Type: task
Status: open
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
