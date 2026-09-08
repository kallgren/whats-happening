# 03 — Drag-and-drop for a grid of contenteditable cards

Type: research
Status: resolved
Blocked by: —

## Question

Settle the mechanism for reordering the grid, before [04](./04-reorder-by-drag.md) builds on it.
The prior is **SortableJS, vendored as a single file into `public/`** — no npm, no build step, no
CDN dependency at runtime. Confirm or overturn it.

The specific risk that makes this a ticket rather than an assumption: **drag and `contenteditable`
fight each other.** A card that is both draggable and directly editable has to distinguish "I am
picking this up" from "I am selecting text in it", and getting that wrong makes either the drag or
the editing unusable.

### What to find out

1. **Is SortableJS still the right pick?** Current version, licence (expected MIT — confirm it
   permits vendoring), the exact single file to vendor and its size, and whether it ships as an ES
   module usable from a plain `<script type="module">` with no bundler.
2. **The `contenteditable` interaction.** How does Sortable behave when the draggable element
   contains editable text? Is a **drag handle** required, or does `draggable`/`filter` configuration
   suffice? What is the accepted pattern?
3. **Is a library needed at all?** Native HTML5 drag-and-drop is zero bytes. Judge it honestly
   against a grid of editable cards — its known weaknesses are touch support and the drop-indicator
   experience. If native is genuinely adequate here, say so; the map prefers less to maintain.
4. **Touch.** Not an MVP requirement (see the map's *Not yet specified* on mobile), but note what it
   would cost, since it may be free with the right choice.
5. **Persisting the order** — the event to hang the store write on.

### Deliverable

`.scratch/network-v1/research/03-drag-and-drop.md`, with the recommendation stated up front and the
exact file to vendor named. Verified against primary sources.

## Answer

Full findings: [research/03-drag-and-drop.md](../research/03-drag-and-drop.md), verified 2026-09-08.

**The prior holds — vendor SortableJS.** Take `Sortable.min.js` from the `1.15.7` git tag into
`public/sortable.min.js`: **45,478 bytes** (15,060 gzipped), **MIT**, UMD, loads from a plain
`<script src>` with no bundler and defines `window.Sortable`. Latest release 1.15.7, published
2026-02-11; repo active, not archived. The tag file and the npm tarball file are byte-identical
(sha256 `bf4241bc…cf76`). It ships ESM builds that do work from a bare `<script type="module">`, but
they are unminified and 2.6× larger — don't.

**The risk this ticket was written for does not exist.** `_onTapStart` in Sortable's source bails
out with `if (originalTarget.isContentEditable) return;` before any drag setup. Verified by running
it in Chrome 152: with **no `handle` and no `filter` configured**, a drag begun inside an editable
field fires nothing at all, while a drag begun on non-editable chrome reorders normally. Editing and
dragging do not fight. The only build requirement is that each card have some non-editable surface
to grab — a header strip with `cursor: grab`. Sortable also moves the existing node rather than
re-creating it, so editable state, text and listeners survive a reorder.

**Native HTML5 DnD was a real contender and still loses.** Chrome gives `contenteditable`
precedence over an ancestor's `draggable="true"` — measured with trusted input, against a control
proving the harness sees real drags — so MDN's Alt-key caveat does not bite here. But native drags
are never initiated by touch (Sortable disables its own native path on iOS and Chrome-for-Android
for exactly this reason), and we would own the 2-D grid insertion logic and the drop indicator
forever. 45 KB of unmodified vendored code is less to maintain than that.

**Touch is free** with this choice — `delay: 200, delayOnTouchOnly: true` when mobile comes up. Not
for v1.

**Persist on `onUpdate`** (fires only when the order actually changed; `onEnd` also fires on no-op
drops), and re-derive the order from the DOM — `[...grid.children].map(el => el.dataset.id)`, or
`sortable.toArray()` — never from `oldIndex`/`newIndex` arithmetic.
