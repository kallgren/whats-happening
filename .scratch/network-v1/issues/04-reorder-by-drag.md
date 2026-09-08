# 04 — Reorder the grid by drag and drop

Type: task
Status: open
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
