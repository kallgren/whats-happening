# 05 — Export and import

Type: task
Status: resolved
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

## Answer

**Done. The round trip works: export, delete every note, import, and the notes come back byte-identical.**
Four files touched: `public/store.js` (the validator split out and one new rule), `public/network.js`
(the export/import section, plus `unfreeze`), `public/network.html` (two buttons and a file input),
`public/network.css` (their styling).

### What was built

- **Export writes the store's own bytes.** `rawText()`, not a re-serialisation of the in-memory
  `notes`. Three things follow, and all three are why: the round trip is byte-exact; an *unreadable*
  document can still be saved, which is when a copy matters most; and the export cannot invent a
  document that was never stored. The file therefore **is** the store, which is what the ticket
  asked for.
- **Export flushes first.** The debounce means the last word typed can still be 300 ms from disk,
  and a backup missing the thing you just wrote has quietly failed at its only job.
- **Import validates through the store's own rules.** `load()`'s document checks were extracted into
  an exported `parse(text)`, and `load` now calls it. This is the shape decision of the ticket: an
  importer carrying its own validator is a second opinion about what a valid document is, and two
  opinions drift — a file the page accepts must be a file the page can re-open. Import gets the
  version gate, the shape check and the per-note check for free, and always will.
- **Validate, then confirm, then write.** A bad file costs a dialog Robert never sees, rather than a
  "replace everything?" he answers yes to and then loses to a syntax error. The write is one
  `setItem` of a fully-built document, so it lands whole or leaves the old value alone; `notes` is
  only reassigned after the write returns true. There is no state in which half a file has been
  applied.
- **The confirm counts what it is destroying** — "Importera 2 anteckningar? Alla 3 anteckningar som
  finns här nu tas bort." — and declines the noun, because `${n} anteckningar` reading as broken
  Swedish in the one dialog standing in front of an irreversible act is the wrong place to save four
  lines.
- **Both buttons live in the page header**, shaped like the hub's `.chip`. Outside the grid on
  purpose — see below.

### Four things worth knowing

- **Import is the way out of a corrupt store, and that is new.** [02](./02-notes-store-and-inline-editing.md)
  froze the page on an unreadable document with no way back except devtools. Both buttons now stay
  live while frozen, which inverts every other control on the page: export becomes the *rescue*
  (the damaged bytes, saved before anything touches them) and import the *recovery*. The freeze
  exists to stop **incidental** writes — a keystroke, a debounce — not a deliberate, confirmed
  replacement. That is what the header placement is really for, since the grid is hidden in exactly
  that state. Two consequences: `unfreeze()` had to undo `fail()` completely rather than partly, and
  `enableDragging()` had to become idempotent, because a recovery import mounts a grid the failed
  load never mounted. Verified end to end, including that the page writes again afterwards.
- **A new rule: two notes may not share an id.** Ids are identity precisely because position is the
  user's ordering, so a duplicate is not cosmetic — the next lookup by id finds one note twice and
  the other never, which is `saveOrder()` silently dropping a list. Unreachable through the page's
  own writes; reachable the moment a file arrives, because a hand-edited backup or two exports
  someone tried to merge in a text editor is exactly how it happens. It went into `parse`, so
  `load` enforces it too.
- **Unknown fields are kept, not stripped.** A note carrying `{"colour":"blue"}` is accepted and
  round-trips. Deliberate: the page's stated contract is that a document is accepted whole or
  refused whole, and quietly rewriting a file into our own shape is data loss wearing tidiness as a
  disguise.
- **One wording regression.** Sharing the validator means sharing its messages, so the failure
  banner now says "Innehållet är inte giltig JSON" where it said "Det *sparade* innehållet". The
  sentence above it still says the notes could not be read, so the subject is not in doubt — but it
  is a real half-word of precision traded for the single-validator guarantee.

### Known, and deliberate

- **An empty store still exports.** Export refuses only when the key is *absent* ("Det finns inget
  att exportera ännu"), not when it holds zero notes — that is a truthful record of an empty store,
  but it is also a file that will wipe a real one on import. Naming it rather than fixing it: the
  fix is a warning nobody has asked for.
- **Nothing tells Robert when he last exported.** A backup habit with no nudge is a habit you
  forget, and that is the whole value of the feature. Now in the map's *Not yet specified*.
- **Whole store only.** No exporting one note, no merge on import — merge is the map's deferred
  sync question and stays deferred.

### Verified

**51/51 headless Chrome checks over CDP, run twice** — once against a static server, once against
the real `vercel dev` — plus **19/19 node checks** on `store.js` in isolation with a stubbed
`localStorage`, and `npm run check` clean.

The browser checks cover: both controls present in the header with a hidden `accept="json"` picker;
an empty browser exporting nothing and saying so, with no file written; a real export producing one
file whose name matches `natverk-YYYY-MM-DD-HHMM` and whose bytes equal `localStorage` exactly; an
export inside the 300 ms debounce window containing the just-typed text; **eight** malformed files
each refused by name and each leaving the store untouched (not JSON, JSON that is not a document, no
version, a future version, a note missing `body`, a non-string title, an empty id, duplicate ids);
the confirm naming both counts and declining the singular; cancelling changing nothing on disk *or*
on screen; accepting replacing the store, re-rendering in the file's order, keeping the "+" tile
last, and leaving the page still saving edits; **the ticket's round trip** — export, delete every
note through the UI, import, identical on screen and on disk and after a reload; the full frozen
path — freeze, export the damaged bytes, import a good backup, banner gone, grid back, writes
resumed, Sortable wired for the first time; no second set of drag listeners after an ordinary
import (counted via `DOMDebugger.getEventListeners`); re-picking the same file asking again; and an
unknown field surviving the write.

Files were put on the picker with `DOM.setFileInputFiles` and downloads captured with
`Browser.setDownloadBehavior` — the real code paths, not synthetic `FileList`s or a stubbed
`createObjectURL`.

**Not deployed.** With 05 in, everything the destination asks for is built; the map's single deploy
gate is now the only thing left, and it is [06](./06-prod-deploy.md).
