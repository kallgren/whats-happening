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
- **In-line editing means in-line.** No modal, no detail view. The focused card grows in place to
  fit its content and collapses back on blur.

**The agreed v1 surface:**

- A **uniform responsive grid** of note cards, each capped in height with internal scroll, in
  explicit user order.
- A **"+" tile as the first cell** — click it and you are typing in a new note.
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

_None yet — the map was charted 2026-09-08._

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
- **Whether the hotkey wants company.** The switcher was cut from the MVP, not rejected. If the app
  ever has a third page the hotkey stops scaling, and that is when to look at it.
- **Whether the hub and Network should share more than CSS.** Right now they share a stylesheet and
  nothing else — different routes, different render paths, no shared chrome component. If a header
  or switcher becomes common to both, that is the moment the duplication starts costing.

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
