# 05 — Export and import

Type: task
Status: open
Blocked by: 02

## Question

The whole store out to a file, and a file back in. This is the **only** protection the notes have:
`localStorage` is one browser, and clearing site data destroys it silently with no warning and no
recovery.

### Settled before this ticket

- **Export downloads a JSON file** of the whole store — the same versioned document shape 02
  defines, so the file *is* the store rather than a serialisation of it.
- **Import replaces everything**, and says so before it does. Merge-by-id was considered and
  rejected: merging needs conflict rules that cannot be specified before there are two devices,
  which is exactly what the map deferred. Replacing is the honest MVP semantic.
- **Import must refuse a file it does not understand** rather than half-applying it — check the
  `version` and the shape first. A destructive operation that fails halfway is worse than one that
  refuses.
- Both are plain buttons on the page. No hotkeys.
- **This is a backup habit, not a sync feature.** The map is explicit that mobile sync is out of
  scope; nothing here should pretend otherwise.

### The work

- Export: serialise the store, `Blob`, object URL, filename with a date in it so successive backups
  don't collide.
- Import: file picker, parse, validate, confirm the replacement, write, re-render.

### Done when

A round trip works on the live page: export, delete every note, import the file, and the notes come
back identical.
