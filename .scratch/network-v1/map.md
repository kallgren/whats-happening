# Map: Network v1

Label: `wayfinder:map`

## Destination

A **live `/network` page in the deployed hub that Robert is actually putting notes into** —
a grid of free-form notes, each with an editable title and body, reorderable by drag and drop,
stored in `localStorage`, with export and import. Reached from the hub with the hotkey `n`.

Done when the page is deployed and in daily use, and Robert can say whether it earns its place —
not when a document describes it.

Robert's framing: *"I'm trying out this idea to make this the hub for **managing my social life**."*
The hub answers *what is happening*; Network is the first half-step toward *who I do it with*.

## Notes

**This effort carries execution, not just planning.** Same override as
[event-hub-v1](../event-hub-v1/map.md): tickets deliver working software, not decisions. Robert's
words: *"let's move quickly towards an MVP."* Every ticket here is a build ticket except the one
research spike, and each is independently shippable — the page is usable after 02, and 03/05 make
it good.

**The MVP exists to answer one question — will he use it?** He does not yet know how he will:
*"most notes will be lists of people grouped by category, some will probably be ideas of activities
or similar. I'm not quite sure how I will use it yet, that is why I'm making it so general."*
That uncertainty is the reason for the deliberate *lack* of structure, not an excuse for it. A note
is a title and a blob of text; anything more specific is a schema invented before the use that
would justify it.

**Domain**: personal social-life management, single user (Robert), one browser. The hub's page
chrome is Swedish; the Network page follows.

**Glossary** — deliberately general:
- **Note** — a title plus free-form multiline text. *Not* a person, not a contact, not a card type.
  Named generically on purpose (Q1): most notes will list people, some won't, and the shape must
  not presume.
- **Store** — the single versioned JSON document holding every note, in one `localStorage` key.
- **Grid** — the uniform responsive layout the notes sit in, in explicit user order.

**Skills every session should consult**: `/grilling` and `/domain-modeling` by default.
`/research` for 03. `/prototype` is not expected — the design questions were settled by grilling.

**Standing preferences for this effort** — settled during charting, do not re-litigate:

- **Same app, same deploy.** Network is a second route on the existing Vercel project, not a new
  thing. It reuses `public/style.css` so it reads as one app.
- **The server stays stateless and secretless.** `/network` is a **static file** — the serverless
  function never runs for it. This keeps the hub's defining property literally intact: no database,
  no auth, no expiring tokens, no secrets. The notes exist only in Robert's browser.
- **Vanilla, still — no build step.** Considered React + Vite + dnd-kit and rejected *for now*.
  The honest argument for React was **dnd-kit**, not React; but this repo has zero build step, and
  adding a bundler is a larger change to the project than the feature is. Drag-and-drop comes from
  a **vendored** library file in `public/`, not a CDN and not npm. Revisit if the Network page grows
  a second view — converting one self-contained page later is cheap, and by then it is a decision
  against known requirements. This is
  [event-hub-v1](../event-hub-v1/map.md)'s deferred framework question firing, and answered the
  same way: not yet.
- **`localStorage` is knowingly one-browser.** Robert: *"if I find this feature useful I definitely
  want sync with mobile later, but I don't think the complexity is warranted for just validating the
  idea."* No simple sync exists that preserves the secretless property — every option needs a token
  or an account, and the public unauthenticated URL means any server store is world-writable without
  auth, which is an effort of its own. Mitigation is **shape, not features**: the store is a single
  versioned JSON document, so a future sync is "PUT this blob" rather than a rewrite.
- **Export is a backup habit, not a feature.** Clearing site data destroys the notes silently.
  Import **replaces** rather than merges — merge needs conflict rules that cannot be specified
  before there are two devices.
- **Structure is deferred on purpose.** Plain text, newlines preserved. A list of people is just
  lines. Lines can become anything later; a schema can't.
- **Prod deploy is one gate at the end, not per ticket.** Changed by Robert while testing 01:
  *"no prod deploy until I've tested it myself. we'll probably do prod deploy when the whole feature
  is in place."* Tickets are done when they work against `vercel dev` and Robert has looked; the
  destination's "live and in daily use" is reached in one deploy once 02–05 are in. Run the dev
  server with **`npm start`** — the `dev` script could never work, since `vercel dev` refuses to
  start when it finds itself in the package's `dev` script.
- **In-line editing means in-line.** No modal, no detail view. The focused card grows in place to
  fit its content and collapses back on blur.

**The agreed v1 surface:**

- A **uniform responsive grid** of note cards, each capped in height with internal scroll, in
  explicit user order.
- A **"+" tile as the last cell** — click it and you are typing in a new note. Charting put it
  first; Robert moved it to the end on seeing ticket 02, so it reads as the next empty slot rather
  than as a toolbar. A new note appears where the tile was, at the end.
- **Title and body both `contenteditable`**, saved debounced while typing and unconditionally on
  blur and `pagehide`.
- **Delete behind a confirm**, on card hover. (Robert overrode the recommended undo-toast: *"confirm
  on delete instead of undo."*)
- **Drag to reorder**, persisted.
- **Export** the whole store to a JSON file; **import** a file, replacing everything.
- **Hotkeys**: `n` on the hub → `/network`, `h` on `/network` → hub. Both inert while a note has
  focus. A small visible hint on each page, because an invisible-only hotkey is one you forget you
  built. The **page switcher UI is deliberately not in the MVP** — Robert: *"possibly some switcher,
  but let's start with just the hotkey for now."*

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [01 — Ship the /network route and the hotkeys](./issues/01-network-route-and-hotkeys.md) —
  the shell is built and works locally: `public/network.html` behind a `vercel.json` rewrite,
  `network.css` for the grid, the hint-that-is-also-a-link in both footers, and the two hotkeys with
  their contenteditable focus guard. The addition Robert asked for on seeing it: switching **does
  not reload**. Both handlers prefer `history.back()` over `location.href` when `document.referrer`
  says the previous entry is the target. But the fix that actually worked was one level down and had
  nothing to do with the hotkeys: `api/index.ts` sent **`s-maxage` only** — shared-cache only — so
  the browser revalidated on every navigation and `vercel dev`, which has no CDN, re-scraped every
  time. It now sends `max-age=300` alongside, making the return trip a disk-cache hit in any
  browser. **Constraint this creates for every later ticket: never register an `unload` listener** —
  it disqualifies the page from the bfcache. `pagehide` is safe. Not deployed; see the deploy gate.

- [03 — Drag-and-drop for a grid of contenteditable cards](./issues/03-drag-and-drop-research.md) —
  drag-and-drop is **SortableJS 1.15.7**, vendored as `public/sortable.min.js` (45 KB, MIT, UMD,
  no bundler). No drag handle needed: Sortable already refuses to start a drag from a
  `contenteditable` target, so editing and dragging don't fight — each card just needs a
  non-editable strip to grab. Persist on `onUpdate`, reading order back off the DOM. Native HTML5
  DnD was judged genuinely close but loses on touch and on owning the grid-insertion logic. Full
  findings: [research/03-drag-and-drop.md](./research/03-drag-and-drop.md).

- [02 — The store, the grid, and in-line editing](./issues/02-notes-store-and-inline-editing.md) —
  the page is genuinely usable: notes create, edit, delete and survive a restart. The store is its
  own module (`public/store.js`) holding one versioned JSON document under
  `whats-happening:network`, and `network.js` became an ES module to import it — separate files, no
  build step. **A corrupt or unwritable store freezes the page rather than starting empty**: banner,
  raw JSON for recovery, grid hidden, every save path blocked, because a banner that lets the next
  keystroke overwrite the evidence is worse than none. Robert's change on seeing it: **the "+" tile
  moved to the end** of the grid, and new notes now land there with it. Two things fall out for
  later tickets: every card already has a non-editable top strip, which is exactly the drag handle
  [03](./issues/03-drag-and-drop-research.md) said 04 would need, so **04 needs no new chrome**; and
  `store.js` already exposes `rawText()`, which is most of 05's export. Verified with 29 headless
  Chrome checks over CDP plus 13 node checks on the store's failure modes. Not deployed.

- [04 — Reorder the grid by drag and drop](./issues/04-reorder-by-drag.md) — the grid reorders and
  the order is in the store. SortableJS 1.15.7 is vendored at `public/sortable.min.js`, byte-identical
  to what [03](./issues/03-drag-and-drop-research.md) vetted, with its sha256 recorded beside it.
  Two options and no more — `draggable: ".note"` keeps the "+" tile out of the drag, `onUpdate`
  writes; **no `handle` and no `filter`**, because Sortable's own `contenteditable` guard already
  splits grabbing the card from selecting its text. `saveOrder()` reads the new order off the DOM
  rather than reconstructing it from indices, so the store never learns the library's name, and
  re-appends the "+" tile — `draggable` stops the tile being dragged but not a card being dropped
  past it. Verified twice over, because one harness could not cover both: 22 headless checks through
  Sortable's fallback transport, then the **native** path — the one that actually ships — driven with
  trusted input against `vercel dev`, where dragging the strip reorders and dragging the text selects
  it. **One gap it leaves: no keyboard reorder**, now in *Not yet specified*. Not deployed.

- [05 — Export and import](./issues/05-export-and-import.md) — the notes can leave the browser and
  come back: export writes the store's **own bytes** (`rawText()`, so the file *is* the store — a
  byte-exact round trip, and a document too broken to parse can still be saved), import replaces
  everything behind a confirm that counts what it destroys. The shape decision is that import
  validates through the store's own rules: `load()`'s checks were extracted into an exported
  `parse(text)` that both callers share, because an importer with its own validator is a second
  opinion about what a valid document is, and two opinions drift. Order is validate → confirm →
  write → adopt, so a bad file costs a dialog nobody sees and there is no half-applied state. Two
  things it changes beyond its own scope: **import is now the way out of a frozen page** — both
  buttons stay live while [02](./issues/02-notes-store-and-inline-editing.md)'s corrupt-store freeze
  is up, making export the rescue and import the recovery, which is why they sit in the header and
  why `enableDragging()` had to become idempotent; and **duplicate ids are now refused** on load as
  well as import, a silent-loss path reachable only through a hand-edited or hand-merged file.
  Unknown fields on a note are deliberately kept rather than stripped. Verified with 51 headless
  Chrome checks run against both a static server and `vercel dev`, plus 19 node checks on the store.
  Not deployed — that is [06](./issues/06-prod-deploy.md).

- [07 — Icons for export and import](./issues/07-icon-actions.md) — the two header buttons are inline
  SVG arrows now, with the Swedish words moved to `aria-label` and `title` rather than deleted. The
  decision worth keeping is not the glyphs: those buttons are the **only** controls that survive
  [02](./issues/02-notes-store-and-inline-editing.md)'s corrupt-store freeze, so dropping their
  labels moved a load-bearing instruction off the screen. Robert took option (a) — icons always, and
  the **freeze banner now names the recovery in words**, glyph included ("export first, *pilen ned
  uppe till höger*, then import a working file"), as does the frozen branch of the import confirm.
  Rejected: two rendering modes for one button. Inline SVG rather than an icon font, for the same
  reason SortableJS is vendored — no build step, and no fetch that can fail; empty squares where the
  recovery buttons should be is the one failure this change could not afford. Not deployed.

## Not yet specified

In scope, but not yet sharp enough to ticket:

- **Whether the Network tab earns its place at all.** The question the whole map rests on, and
  Robert's to answer rather than a ticket's — the same shape as event-hub-v1's "is the hub useful
  enough to be worth finishing." Only use answers it. Everything deferred below is deferred
  *because* this is unanswered: it is cheaper to be told "I want search" than to guess.
- **How he actually uses it, and therefore whether notes need structure.** The MVP is deliberately
  shapeless. What real use might reveal: that most notes are people-lists and a person deserves to
  be a first-class thing; that categories are really the note titles and want grouping; that
  activities and people are two different kinds of note. None of this is guessable now, and all of
  it is cheap to add to a title-and-text store later.
- **Search.** The one deferred item expected to be wanted first — it becomes obvious past ~20 notes.
  Cheap to add, costs nothing to defer, and its *shape* (filter the grid vs. jump-to) depends on how
  many notes there turn out to be.
- **Mobile, and with it sync.** Wanted if the idea validates. Two separate questions hiding in one:
  whether the grid is usable on a phone (cheap — the grid is responsive and the drag library handles
  touch) and whether the notes follow him there (expensive — see the sync note above). The first may
  be answerable without the second.
- **~~Whether the bfcache hop earns its keep.~~** Graduated into
  [08 — One document, and the view swap that replaces navigating](./issues/08-one-document-view-swap.md).
  Robert saw the repaint for himself and named the fix: *"cant we just let javascript decide which one
  to show?"* One document has no navigation to repaint, which retires the hop, the `max-age` floor
  under it and the hotkey handler duplicated across `lib/page.ts` and `public/network.js` all at once.
  Deferred past the deploy gate at his call, not dropped — prod is also the only place the hop's
  behaviour could have been observed, so if 08 is ever abandoned this question comes back with it.
- **Whether reordering needs a keyboard path.** [04](./issues/04-reorder-by-drag.md) shipped drag
  only: a card can be moved by pointer or touch and by nothing else, so ordering — which the map
  calls the information itself — is unreachable without a mouse. Not sharp enough to ticket because
  the shape depends on answers nobody has: a single-user page on one desktop browser may never need
  it, and if it does, "move up / move down" on the focused card and a full keyboard drag are very
  different builds. Revisit alongside mobile, which is the other input question.
- **Whether the backup habit needs a nudge.** [05](./issues/05-export-and-import.md) built export
  and import, and the map calls them *a backup habit, not a feature* — but nothing on the page says
  when Robert last exported, so the whole protection rests on him remembering unprompted. Not sharp
  enough to ticket: the shape depends on how he actually uses the page, and the options are very
  different builds (a date in the footer, a nudge after N changes, an automatic download). Cheapest
  first look is whether he has exported at all a fortnight after the deploy — if he has, there is
  nothing to build.
- **Whether the hotkey wants company.** The switcher was cut from the MVP, not rejected. If the app
  ever has a third page the hotkey stops scaling, and that is when to look at it.
- **Whether the hub and Network should share more than CSS.** Right now they share a stylesheet and
  nothing else — different routes, different render paths, no shared chrome component. If a header
  or switcher becomes common to both, that is the moment the duplication starts costing. Ticket 01
  produced the first concrete instance: the hotkey handler exists twice, once inline in `lib/page.ts`
  and once in `public/network.js`, deliberately duplicated because the hub must not gain a runtime
  dependency on a script it can fail to fetch. Two copies of ~10 lines is cheap; a third page would
  not be.

## Out of scope

Ruled beyond this destination. Returns only as a fresh effort, not a resumption.

- **Note colours, pinning, labels/tags, archive, checkbox lists, images in notes.** The Keep feature
  set beyond the core. Named explicitly at charting time so they cannot creep in; all cheap to add
  once there is a reason.
- **Any server-side storage, and therefore auth.** The URL is public and unauthenticated. Server
  storage without auth is world-writable; server storage with auth is a different project. This is
  the same refusal that keeps the hub secretless.
- **A visible page switcher UI.** Deferred by Robert to keep the MVP small; see *Not yet specified*.
- **React, Vite, and a build step.** See the standing preference above. Not rejected forever —
  rejected until the Network page has a reason.
