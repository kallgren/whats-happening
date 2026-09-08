# 02 — The store, the grid, and in-line editing

Type: task
Status: open
Blocked by: 01

## Question

The feature itself: notes that exist, that you can create, edit and delete, that survive a reload.
After this ticket the page is genuinely usable — 03/04 make it good, 05 makes it safe.

### Settled before this ticket

- **A note is a title plus free-form multiline text.** Nothing else. Plain text, newlines preserved;
  a list of people is just lines. No markdown, no checkboxes, no schema. See the map's glossary for
  why the generality is deliberate.
- **One `localStorage` key holding a single versioned JSON document** — `{ version, notes: [...] }`,
  each note with a stable id and its position given by array order. The version field exists from
  day one so a future import/merge or sync has something to stand on.
- **Uniform responsive grid**, not Keep-style masonry. Every card the same width, height fitting its
  content **up to a cap**, then scrolling internally. Masonry was rejected: it is where drag-reorder
  implementations go to die, and a cap stops one long list of names dominating the page.
- **The focused card grows in place** to fit its full content and collapses back to the cap on blur.
  Editing a 30-name list through a 200px window is the failure mode this avoids, and it keeps the
  "all editing in-line" promise — no modal, no detail view.
- **A permanent "+" tile as the first cell of the grid.** Click it and you are typing in a new note.
- **Delete behind a confirm**, on card hover. Robert chose confirm over the recommended
  undo-toast — so there is no undo, which makes the confirm load-bearing.
- **Saves debounced ~300ms after typing stops, plus unconditionally on blur and on `pagehide`.**
  Robert should never think about saving. `localStorage` writes are synchronous and tiny.

### The work

- The store module: load, save, migrate-by-version, create, update, delete. Keep it separate from
  the rendering — it is the thing a future sync would replace.
- Rendering the grid from the store, and a first-run empty state.
- `contenteditable` on title and body, with the debounce and the blur/`pagehide` saves.
- A corrupt or absent `localStorage` value must not blank the page. Prefer failing loudly and
  visibly over silently starting from empty, since silently-empty looks exactly like data loss.

### Done when

Notes can be created, edited and deleted on the live page, and survive a reload and a browser
restart.
