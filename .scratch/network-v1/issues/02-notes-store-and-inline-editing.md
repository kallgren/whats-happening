# 02 — The store, the grid, and in-line editing

Type: task
Status: resolved
Blocked by: 01

## Question

The feature itself: notes that exist, that you can create, edit and delete, that survive a reload.
After this ticket the page is genuinely usable — 03/04 make it good, 05 makes it safe.

### Settled before this ticket

- **Save on `pagehide`, never on `unload`.** From
  [01](./01-network-route-and-hotkeys.md): an `unload` listener disqualifies the page from the
  browser's back/forward cache, which is what makes `h`/`n` switch instantly without a reload.
  `pagehide` is bfcache-safe and fires on freeze, so it is both the correct save hook and the one
  that preserves the hop.

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

## Answer

Built and working against `vercel dev`. Four files: `public/store.js` (new), and
`public/network.js`, `network.css`, `network.html`.

**The store is its own module.** `store.js` knows about notes and `localStorage` and nothing about
the DOM — it is the thing a future sync replaces. One key, `whats-happening:network`, holding
`{ version: 1, notes: [{ id, title, body }] }`. The key never changes; the version inside it is what
moves, so an old browser's data stays findable. `migrate()` exists as a seam and is identity today.

`network.js` became an **ES module** (`<script type="module">`), which is how store.js is a separate
file with no build step. Modules are deferred, so the DOM is parsed before anything runs. The
vendored SortableJS of ticket 04 is a classic UMD script and loads alongside it unaffected.

**A corrupt store fails loudly and, more importantly, refuses to write.** The banner explains the
reason and prints the raw JSON for hand-recovery; the grid — including the "+" tile — is hidden, and
a `frozen` flag blocks every save path. That last part is the load-bearing half: a banner that
explains the damage while the next keystroke saves an empty document over the evidence is worse than
no banner. A failed *write* (quota, denied storage) takes the same path, since a save that silently
does nothing is corruption's quieter twin. An absent key is a first run and is **not** treated as
corruption — that distinction is the whole contract.

### Decided inside the ticket

- **The "+" tile is the grid's last cell, not its first.** Robert changed this on seeing it: at the
  end it reads as the next empty slot rather than as a toolbar. New notes follow the tile and land
  at the end — where the click happened, and so where the eye already is. The map's v1-surface
  bullet is updated.
- **Delete uses `window.confirm`, naming the note** ("Ta bort \"Klätterkompisar\"? Det går inte att
  ångra."). There is no undo, so the dialog is the only thing between a click and a lost list.
- **Enter in a title jumps to the body** rather than growing the title into a second line.
- **Every card carries a non-editable strip along its top**, holding the delete button (revealed on
  hover, and on `:focus-within` so it stays keyboard-reachable). This is also the handle
  [03](./03-drag-and-drop-research.md) requires: SortableJS refuses to drag a contenteditable
  target, so a card of pure editable text has nowhere to grab. **Ticket 04 needs no new chrome.**
- **A capped card gets a bottom fade**, applied only to cards that actually overflow (measured, not
  guessed — overflow depends on how lines wrap, so it is recomputed on input and on resize). Without
  it the cap slices the last line through the middle of the letters and reads as a rendering fault.
- **`visibilitychange` saves alongside `pagehide`.** A mobile browser killing a backgrounded tab may
  never run `pagehide`. Both are bfcache-safe; there is no `unload` listener anywhere, per 01.
- **`contenteditable="plaintext-only"` behind a feature test**, with a paste handler that strips to
  text in both cases. `white-space: pre-wrap` is what makes a note plain text — newlines are
  newlines, and a list of people is just lines.
- **Placeholders are driven by a class, not `:empty`** — a contenteditable that has been typed into
  and cleared usually still holds a `<br>` and is never `:empty` again.
- **`.notes[hidden] { display: none }` is stated explicitly**, because `display: grid` outranks the
  UA's `[hidden]` rule. Without it the "+" tile survived the failure banner.

### How it was verified

The Chrome extension would not respond, so real Chrome was driven headless over CDP instead
(`--headless=new` plus a hand-rolled CDP client — no puppeteer, no new dependency). **29 browser
checks**, green three runs running: real keystrokes into contenteditables, Enter-to-body, the
debounce, reload survival, the `h` guard while editing, the confirm both ways, and the corruption
path — including that the corrupt value is still byte-identical after a click that would otherwise
create a note. Plus **13 node-level checks** on the store's failure modes (bad JSON, missing
version, future version, malformed note, non-array, quota failure). `tsc --noEmit` clean.

One check failed once and then passed repeatedly. It was chased rather than re-run: the harness was
racing the 300 ms debounce, not the page — the input events and the written JSON were both confirmed
directly. The scripts were throwaway and are not in the repo; there is no test runner here to put
them in.

Not deployed — the deploy gate holds until 04 and 05 are in.
