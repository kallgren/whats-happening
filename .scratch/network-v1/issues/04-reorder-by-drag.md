# 04 — Reorder the grid by drag and drop

Type: task
Status: resolved
Blocked by: 02, 03

## Question

Make the grid reorderable by dragging, and persist the order. Robert named this as a requirement of
the MVP, not a nicety: notes are lists of people grouped by category, and which group sits at the
top *is* the information.

### Settled before this ticket

- Order is **explicit and user-controlled** — array position in the store. Never sorted by date,
  title or anything else.
- The mechanism comes from [03](./03-drag-and-drop-research.md). Whatever it recommends, it is
  **vendored into `public/`**, not fetched from a CDN at runtime and not installed from npm — the
  page has no build step and must not gain a runtime dependency on a third-party host.
- The **"+" tile stays first** and is not draggable.

### The work

- Wire the mechanism into the grid from [02](./02-notes-store-and-inline-editing.md).
- Persist on drop, through the store module rather than around it.
- Resolve the drag-vs-edit conflict the way 03 prescribes.

### Done when

Notes can be dragged into a new order on the live page and the order survives a reload.

## Answer

**Done. The grid reorders by dragging and the order is in the store.** Four files:
`public/sortable.min.js` (new, vendored), `public/sortable.min.js.sha256` (new), plus the script
tag in `network.html`, `saveOrder()` in `network.js`, and the cursors in `network.css`.

### What was built

- **`public/sortable.min.js`** — SortableJS 1.15.7, downloaded from the `1.15.7` git tag, unmodified.
  45,478 bytes, sha256 `bf4241bc…cf76` — both exactly what
  [03](./03-drag-and-drop-research.md) measured, so the file in the repo is provably the file the
  research vetted. The MIT notice is still line 1, which is the licence's only obligation.
  **`public/sortable.min.js.sha256`** records the hash beside it in `shasum -c` format, so a future
  bump is `shasum -a 256 -c public/sortable.min.js.sha256` rather than an act of faith.
- **A classic `<script src>`, not the ESM build**, placed before the module. It runs during parsing,
  so `window.Sortable` exists by the time `network.js` runs. The ESM build is unminified and would
  have cost 74 KB on the wire to buy an `import` keyword.
- **Two options, and no more:** `draggable: ".note"` and `onUpdate`. `animation: 150` for the
  displacement tween. **No `handle` and no `filter`** — 03's central finding is that Sortable already
  refuses a drag whose pointerdown landed on `contenteditable`, so the split between "grab the card"
  and "select the text" needs no configuration at all.
- **`saveOrder()`** reads the new order back off the DOM (`dataset.id` per card) rather than
  reconstructing it from `oldIndex`/`newIndex`, and rather than through `sortable.toArray()` —
  keeping the store independent of the library. It rebuilds `notes` and calls `flush()` directly:
  a drop is a finished gesture, not a keystroke mid-word, so there is nothing to debounce.
- **The CSS says what is grabbable**: `cursor: grab` on `.note`, `cursor: text` on the two editable
  regions. Because the guard makes *every* non-editable pixel draggable, the honest affordance is
  the whole card minus its text, not a grip icon — the top strip 02 already built, plus the padding.
  `.sortable-ghost` is dimmed and accent-bordered so the landing slot is visible.

### Four things worth knowing

- **The "+" tile.** The ticket's settled block says it "stays first" — stale: Robert moved it to the
  end while looking at [02](./02-notes-store-and-inline-editing.md). It is still excluded from
  dragging by `draggable: ".note"`, but that only stops the tile *being* dragged; a card can still be
  dropped past it. So `saveOrder()` ends with `grid.append(addTile)`, which is what keeps it reading
  as the next empty slot. Verified.
- **No new chrome was needed**, exactly as 02 predicted. The delete strip is the drag handle.
- **Keyboard reorder does not exist.** Dragging is pointer and touch only; there is no way to move a
  card with the keyboard. Out of what the map asked for, but it is a real gap and now sits in
  *Not yet specified*.
- **Touch is already handled** by the library and needs no code here. When the map's mobile question
  comes up, `delay: 200, delayOnTouchOnly: true` is the two-line change — see 03 §4.

### Verified

**22/22 headless Chrome checks** (Chrome 152 over CDP, against a static server), covering: three
cards render in stored order; Sortable binds at 1.15.7 with `draggable: ".note"`; dragging the first
card to the end reorders the DOM *and* writes `["b","c","a"]` to the store; the order survives a
reload; a drag started inside the body **and** inside the title changes nothing; the carried card is
still `contenteditable` afterwards with its text verbatim and Sortable's transient classes gone;
typing into a card after its drag still saves; a new note still lands in the last slot with the tile
behind it; and a corrupt store still freezes the page, creates no Sortable, and leaves the raw bytes
untouched.

Those drove Sortable's **fallback** transport, because synthetic events cannot start a native drag.
`forceFallback` alone is not enough — both it and `supportPointer` are read in the constructor, so
the harness also had to set `nativeDraggable = false`. The `isContentEditable` guard being tested
sits in `_onTapStart`, upstream of that split, so it is the same code path either way.

The **native** path — the one Robert's browser actually uses — was then driven separately with
**trusted input** (`Input.dispatchMouseEvent`) against **`vercel dev`**, since the fallback harness
proves nothing about it:

- drag the top strip of card 1 onto card 3 → DOM `["b","c","a"]`, store `["b","c","a"]`, tile last
- the same drag started inside the note body → order unchanged
- dragging across the note text → selects `"Anna Bertil Cecilia David"`

So editing and dragging genuinely coexist on the path that ships, not just on the scriptable one.

`npm run check` clean. **Not deployed** — the map's deploy gate stands; 05 is the last one in.
