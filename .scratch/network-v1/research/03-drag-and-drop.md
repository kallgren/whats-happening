# Research: drag-and-drop for a grid of contenteditable cards

Verified **2026-09-08** against the SortableJS repo, the npm registry, MDN and the WHATWG HTML
spec, plus experiments run locally in Chrome 152 (see §5). Feeds
[03](../issues/03-drag-and-drop-research.md) and [04](../issues/04-reorder-by-drag.md).

**Headline: the prior holds — vendor SortableJS. Take `Sortable.min.js` from the `1.15.7` tag,
45,478 bytes, MIT, UMD, one `<script src>` and no bundler. And the risk the ticket was written for
does not exist: Sortable already refuses to start a drag whose mousedown landed on editable text.
No drag handle is required, no `filter` configuration is required. Confirmed by running it, not by
reading about it.**

The one thing the build must do is give each card a strip of *non-editable* surface to grab.

---

## 1. Is SortableJS still the right pick?

| Fact | Value | Source |
| --- | --- | --- |
| Latest version | **1.15.7** | [releases/tag/1.15.7](https://github.com/SortableJS/Sortable/releases/tag/1.15.7), npm `dist-tags.latest` |
| Published | **2026-02-11** | npm registry `time["1.15.7"]` = `2026-02-11T22:42:31Z` |
| Licence | **MIT** | `package.json` `"license": "MIT"`, and the shipped `LICENSE` file |
| Repo | not archived, 31,179 stars, 526 open issues | GitHub API, 2026-09-08 |
| Last commit on `master` | **2026-03-24** ("Fix multidrag dragel memory leak") | GitHub API |
| Runtime dependencies | **none** — `package.json` has no `dependencies` key | npm registry |

The licence text is the standard MIT grant — *"to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute"* — so
vendoring the file into `public/` is permitted. The only obligation is that the copyright notice
travels with it, and it already does: `Sortable.min.js` carries
`/*! Sortable 1.15.7 - MIT | git://github.com/SortableJS/Sortable.git */` as its first line. Copy
the file unmodified and that condition is met with no extra work.

**Maintenance, honestly.** 1.15.6 → 1.15.7 was a 15-month gap (2024-11-28 → 2026-02-11), and 526
issues are open. This is a mature, slow, low-churn project rather than an abandoned one — a
consideration, not a blocker, and the mitigation is the same either way: the file is vendored, so a
quiet upstream costs us nothing until we choose to bump it.

### The exact file to vendor

**`Sortable.min.js`** → `public/sortable.min.js`.

| Build | Format | Raw | gzip | Verdict |
| --- | --- | --- | --- | --- |
| `Sortable.min.js` | **UMD**, minified | **45,478** | 15,060 | **vendor this** |
| `Sortable.js` | UMD, unminified | 126,278 | 28,412 | source-map-less debug copy; not needed |
| `modular/sortable.esm.js` | ESM, **unminified** | 119,505 | 27,983 | 2.6× bigger for nothing |
| `modular/sortable.core.esm.js` | ESM, no plugins | 119,505 | 27,988 | same |
| `modular/sortable.complete.esm.js` | ESM, all plugins | 119,508 | 27,982 | same |

Sizes measured with `wc -c` / `gzip -9` on the files inside `sortablejs-1.15.7.tgz`.

**On the ESM question (ticket item 1).** Yes, it ships an ES module, and yes it works from a plain
`<script type="module">` with no bundler — the modular builds contain **zero `import` statements**,
so there are no bare specifiers for a bundler to resolve. I loaded
`import Sortable from './sortable.esm.js'` in a bare module script and got
`loaded v1.15.7 create=function`. **But don't use it**: upstream ships no minified ESM build, so
choosing it costs 74 KB on the wire to buy an `import` keyword. The UMD build defines
`window.Sortable` from an ordinary `<script src>`, which is what the rest of this app already does.

### Provenance

The file served at the git tag and the file inside the npm tarball are **byte-identical**:

```
bf4241bc73fef7f11c59a283a69fe8051cdd31c6d8ff5a2b9ba219e7831fcf76  Sortable.min.js
```

(sha256; same value from `raw.githubusercontent.com/SortableJS/Sortable/1.15.7/Sortable.min.js` and
from the `sortablejs-1.15.7.tgz` npm tarball, whose own npm integrity is
`sha512-Kk8wLQPlS+yi1ZEf48a4+fzHa4yxjC30M/Sr2AnQu+f/MPwvvX9XjZ6OWejiz8crBsLwSq8GHqaxaET7u6ux0A==`.)
Worth recording the sha256 next to the vendored file so a future bump is a diff rather than an act
of faith.

---

## 2. The `contenteditable` interaction — the ticket's actual risk

**SortableJS handles this itself, in eight lines, and has done for years.** In
`src/Sortable.js`, inside `_onTapStart` — the `pointerdown`/`mousedown`/`touchstart` entry point —
before any drag setup happens:

```js
// cancel dnd if original target is content editable
if (originalTarget.isContentEditable) {
    return;
}
```

`originalTarget` is the deepest event target (composed-path aware, so it works through shadow
roots). `isContentEditable` is the **computed** editability of a node, not a reflection of the
attribute on that node alone, so it is `true` for descendants of an editable region too — I
confirmed this directly: a `<b>` nested inside a `contenteditable` div reports
`isContentEditable === true`, while a plain sibling `<div>` reports `false`.

The consequence is exactly the split the map wants, for free:

- mousedown lands on editable text → **no drag**, the browser does its normal caret/selection thing
- mousedown lands anywhere else on the card → **drag**

### What I observed

Four scenarios, run in Chrome 152 against the real vendored `Sortable.min.js` on a 3-card grid where
each card is `<div class=hdl>` (plain) + `<div class=t contenteditable>` + `<div class=b
contenteditable>`. Full event log per scenario:

| Scenario | `handle` option | Drag started from | Events fired | Order after |
| --- | --- | --- | --- | --- |
| A | none | inside the `contenteditable` body | **(nothing)** | unchanged |
| B | none | the non-editable strip | `choose` → `start` → `update` → `end oldIndex=0 newIndex=2` | reordered |
| C | `.hdl` | the handle | `choose` → `start` → `update` → `end oldIndex=0 newIndex=2` | reordered |
| D | `.hdl` | inside the `contenteditable` body | **(nothing)** | unchanged |

A vs. B is the finding: **with no `handle` and no `filter` configured at all**, the editable regions
already do not drag and the non-editable chrome already does. C and D show the `handle` option
narrows the grab surface further but is not what produces the separation — A already had it.

### The accepted pattern, and what it means for the build

Upstream's own guidance is the `handle` option, and the README frames it as being about text
selection: *"To make list items draggable, Sortable disables text selection by the user. That's not
always desirable. To allow text selection, define a drag handler."* That advice predates the
`isContentEditable` guard and is aimed at plain (non-editable) text. For **editable** text the guard
already covers it.

So `handle` is optional here. I'd still lean toward one small explicit grab affordance, for a
reason that is about design rather than mechanism: because the guard makes *every* non-editable
pixel draggable, a card whose editable regions run edge-to-edge has nothing left to grab. The map's
card already has non-editable chrome (the hover delete control lives there), so the cheapest
correct thing is to make sure the card has a visible non-editable header strip with
`cursor: grab`, and leave `handle` unset — the whole strip then works, which is a bigger target
than a grip icon.

### Two smaller things I checked while I was there

- **Sortable moves the node, it does not re-create it.** After a completed drag, `evt.item === ` the
  original element reference, the body was still `isContentEditable === true`, edited text was
  preserved verbatim, and the transient `sortable-chosen` / `sortable-ghost` classes were gone
  (`className` back to just `card`). So editing state and any listeners on the card survive a
  reorder — no re-binding needed in 04.
- **Sortable clears the selection on drag start** (`window.getSelection().removeAllRanges()` in
  `_triggerDragStart`). Harmless here, since a drag can never begin from inside editable text
  anyway.

Not checked: whether caret *focus* is retained if a card is dragged while one of its fields has
focus. Worth a look during 04; it is a polish question, not a mechanism question.

---

## 3. Is a library needed at all?

Native HTML5 drag-and-drop is genuinely viable for the `contenteditable` half of this problem —
better than its reputation — and still loses on the whole.

**The contenteditable conflict does not appear in Chrome.** MDN's warning is real but narrower than
it sounds: *"When an element is made draggable, text or other elements within it can no longer be
selected in the normal way by clicking and dragging with the mouse. Instead, the user must hold down
the Alt key to select text with the mouse, or use the keyboard."*
([MDN, HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API))
That describes plain text inside a `draggable="true"` element. I tested whether it also applies to
an *editable* descendant, using real trusted input (CDP `Input.dispatchMouseEvent` with
`Input.setInterceptDrags`, so a genuine drag is observable):

| Trial | Drag across… | Native `dragstart` | `Input.dragIntercepted` | Text selected |
| --- | --- | --- | --- | --- |
| B1 | a `contenteditable` child of a `draggable="true"` card | no | no | **yes** — `"GGG HHHH"` |
| B2 | control: same markup, parent **not** draggable | no | no | yes — `"GGG HHHH"` |
| B3 | control: the **non-editable** strip of the draggable card | **yes** | **yes** | no |

B3 proves the harness detects real drags; B1 matching B2 exactly shows Chrome gives
`contenteditable` precedence over an ancestor's `draggable` attribute. So native converges on the
same behaviour as Sortable's explicit guard. *Caveat*: this is one engine. The spec grants the
UA total latitude here — *"This specification does not define exactly what a drag-and-drop
operation actually is"*
([WHATWG HTML §dnd](https://html.spec.whatwg.org/multipage/dnd.html)) — so Firefox and Safari are
free to differ, and MDN's Alt-key note suggests at least one browser once did.

**Where native actually loses:**

1. **Touch is zero, permanently.** Native drag events are not initiated by touch on mobile browsers.
   Sortable knows this and routes around it in code, not in prose:
   `supportDraggable = documentExists && !ChromeForAndroid && !IOS && ('draggable' in ...)` — it
   *disables* the native path on iOS and Chrome for Android and drives its own pointer/touch
   fallback there, binding `touchstart`/`touchmove`/`touchend` and suppressing the page scroll while
   a drag is live. Native gives us nothing on a phone; there is no configuration that fixes it.
2. **We would own the sort algorithm.** Native hands us `dragstart`/`dragover`/`drop` and a string
   clipboard. Everything that makes reordering *feel* right — deciding the insertion point from
   cursor position within a **two-dimensional** grid, drawing the drop indicator, animating the
   displaced cards — is ours to write and ours to keep debugging. A grid is meaningfully harder than
   a list here; `swapThreshold` and `direction` exist in Sortable because this is fiddly.
3. **The drag image is the browser's.** A translucent snapshot, styled by the UA, adjustable only via
   `setDragImage`.

**On "less to maintain always wins".** It does, and it points at the library. 45 KB of unmodified,
MIT, hash-pinned third-party code that we never open is *less to maintain* than ~80–150 lines of our
own grid-insertion and drop-indicator logic, which we would own forever and which would need
rewriting the first time the map's mobile question gets answered. The vendored file is a single
static asset with no build step, no npm entry, no CDN — the same category of thing as
`public/style.css`.

**Verdict: use the library.** Native is close enough that this was a real question, and the answer
is still SortableJS.

---

## 4. Touch — what it would cost

**Nothing, if we pick Sortable.** It is already in the file, already exercised on the paths above,
and needs no code at our end. Two options are worth knowing about when the map's mobile question
comes up:

- `delay` — "*Time in milliseconds to define when the sorting should start*". A long-press before a
  drag begins, which on touch is what stops a drag from stealing a scroll.
- `delayOnTouchOnly` — "*Whether or not the delay should be applied only if the user is using touch
  (eg. on a mobile device). No delay will be applied in any other case. Defaults to `false`.*"

The standard pairing is `delay: 200, delayOnTouchOnly: true`: instant on the desktop where the MVP
lives, long-press on a phone. **Not needed for v1** — mentioned only so that when mobile is
picked up it is a two-line change rather than a re-decision.

If we picked native instead, touch would cost a second implementation from scratch. That asymmetry
is most of the argument in §3.

---

## 5. Persisting the order

**Hang the store write on `onUpdate`, and re-derive the order from the DOM — never from the
indices.**

Sortable mutates the DOM as the sole record of the new order. `onEnd` supplies `oldIndex` /
`newIndex`, but reconstructing the array from those is arithmetic we would get to write and get
wrong; the DOM already holds the answer.

Which event:

| Event | Fires | Use |
| --- | --- | --- |
| `onEnd` | on **every** drop, including one that changed nothing | fine, but writes on no-op drops |
| `onUpdate` | only when the order **actually changed** within this list | **this one** |
| `onSort` | any change (add / update / remove) | equivalent here — one list, no cross-list drags |

`onUpdate` fired in exactly the reordering scenarios (B and C above) and not in the cancelled ones
(A and D), which is precisely the write condition.

Two ways to read the order back, both verified working:

- `sortable.toArray()` — "*Serializes the sortable's item `data-id`'s (`dataIdAttr` option) into an
  array of string*". Requires a `data-id` on each card; `dataIdAttr` defaults to `'data-id'`. In the
  probe this returned `["2","3","1"]` after dragging card 1 to the end.
- Reading `[...grid.children].map(el => el.dataset.id)` directly. Identical result. One fewer
  library API to depend on.

Either is a one-liner. `toArray()` is the documented path; the manual read is the one that keeps the
store code independent of Sortable, which matters if the library is ever swapped.

Note that this is a **second** write path alongside the map's debounced-typing / blur / `pagehide`
saves. Same store, same single versioned JSON document; a reorder is just another mutation of it.

---

## 6. Considered and rejected

| Option | Latest | Why not |
| --- | --- | --- |
| **Native HTML5 DnD** | — | See §3. Zero bytes, but zero touch and we own the grid-insertion logic. |
| **dnd-kit** (`@dnd-kit/core`) | 6.3.1, **2024-12-05** | The map already ruled on this: it needs React and a bundler, which is a larger change to the project than the feature. Also 21 months without a release. |
| **dragula** | 3.7.3, **2020-09-29** | Six years without a release. MIT and vendorable, but no reason to prefer it over a maintained library that solves the same problem. |
| **html5sortable** | 0.14.0, **2024-05-28** | Maintained and MIT, but Sortable's README explicitly claims better behaviour on the exact axis that matters here (*"Supports drag handles **and selectable text** (better than voidberg's html5sortable)"*), which is a self-serving claim but points at a real difference — and I verified Sortable's side of it in §2. |
| **@shopify/draggable** | 1.2.1, **2025-10-22** | Actively maintained, but ships as ESM/UMD modules per feature rather than one drop-in file, and offers nothing Sortable lacks for a single sortable grid. |
| **A CDN `<script>`** | — | Ruled out by the map: no runtime CDN dependency. The README's suggested `sortablejs@latest` tag is doubly wrong for us — unpinned. |

---

## 7. What 04 should do

1. `curl -L https://raw.githubusercontent.com/SortableJS/Sortable/1.15.7/Sortable.min.js -o public/sortable.min.js`
   and verify sha256 `bf4241bc…cf76`. Do not modify the file; the MIT notice is line 1.
2. `<script src="/sortable.min.js"></script>` before the page script. It defines `window.Sortable`.
3. Give each card a non-editable header strip with `cursor: grab`. Leave `handle` unset.
4. `Sortable.create(grid, { animation: 150, onUpdate: () => saveOrder() })`, where `saveOrder()`
   reads the order back off the DOM.
5. Don't add `delay` / `delayOnTouchOnly` yet — §4 is a note for the mobile ticket, not for this one.

---

## Appendix — how the experiments were run

No Chrome extension was involved. `Chrome 152` (`HeadlessChrome/152.0.0.0`, macOS) was launched with
`--remote-debugging-port` and driven over the DevTools Protocol from a dependency-free Node script,
against local `file://` fixtures serving the real `Sortable.min.js` extracted from the npm tarball.

- **§2 (Sortable)** used synthetic `MouseEvent`s with `supportPointer: false, forceFallback: true`
  so the whole drag runs through mouse listeners. Two things bit and are worth recording: Sortable
  defers `onStart` through a `setTimeout`, so a synchronous event sequence produces `choose` and
  then silently nothing — the sequence has to `await` between steps. `forceFallback` bypasses the
  browser's native drag machinery, which is what makes it scriptable at all; the
  `isContentEditable` guard being tested sits in `_onTapStart`, *upstream* of that split, so it is
  the same code path either way.
- **§3 (native)** could not use synthetic events — the native drag machinery ignores untrusted
  ones. It used real trusted input via `Input.dispatchMouseEvent` with `Input.setInterceptDrags`
  enabled, which makes Chrome emit `Input.dragIntercepted` instead of performing the drag, so a real
  drag is observable. Trial B3 is the control proving the harness detects one.

Everything not marked as observed in this document — the licence, versions, dates, file names, byte
sizes, hashes, and every quoted line of README or source — was read from the 1.15.7 tarball, the
1.15.7 git tag, the npm registry, MDN, or the WHATWG spec on 2026-09-08. Nothing here is from
memory.
