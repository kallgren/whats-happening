# 03 — Drag-and-drop for a grid of contenteditable cards

Type: research
Status: open
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
