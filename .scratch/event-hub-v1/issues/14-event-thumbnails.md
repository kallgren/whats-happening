# 14 — Event thumbnails

Type: task
Status: resolved
Blocked by: —

## Question

Nothing to decide about *whether* — [research/14-images.md](../research/14-images.md) established
that every hejauppsala card carries an image in HTML the renderer already fetches, so this costs
**zero extra requests**. This ticket is the work: put a thumbnail on every event row.

Robert's reason, in his own words: *"when I'm browsing, I'm really looking at the images."* That is
the first design signal to come from **using** the live page rather than from speculation, which is
exactly what the map deferred [11](./11-ongoing-events-and-day-slices.md)'s layout questions to
wait for.

### Settled before this ticket

- **Thumbnail in the row**, not image-topped cards — a fixed-aspect image to the left of the title,
  in both the *Pågår just nu* card and the 14 day slices. Chosen because it disturbs nothing
  [11](./11-ongoing-events-and-day-slices.md) settled: the 14 slices stay, each still scrolling
  internally, and a 14-event Saturday column does not become unreadably tall.
- **Larger in *Pågår just nu*** than in the slices. That card is wide and holds few events; the
  slices are narrow columns and hold up to 14.
- **Hotlink directly** — `src` pointing at hejauppsala. No proxying through the function, no
  storage. Proxying would double bandwidth and turn a static page into an image CDN, which is the
  maintenance liability this map keeps refusing.
- **Placement is explicitly revisitable.** Robert: *"we can adjust the image placement later."* Ship
  the thumbnail, then look at it. See the map's *Not yet specified* on image-first browsing.

### The work

- Parse `data-xl-src` out of each card in `lib/hejauppsala.ts`, inside the region the existing
  `cards()` splitter already computes. Keep 01's property of not depending on theme utility classes.
- Add the field to the `Event` type and render it in `lib/events-view.ts` / `lib/page.ts`.
- **Impose a fixed aspect box and crop** (`object-fit: cover`). Source aspect ratios are inconsistent
  — 1.65:1, 1.49:1, 1.29:1, 1.78:1 and 1:1 all appear among the first eight — so nothing can be
  trusted to be uniform.

### To settle while building

- **The crop's aspect ratio and the two sizes.** Landscape reads naturally given the sources, but the
  slice column is narrow; pick against the live page, not in the abstract.
- **`loading="lazy"` or eager.** The 14 slices put ~87 images in the document, most of them
  off-screen. Lazy is the obvious default — but confirm it does not fight the internally-scrolling
  columns, which are not the viewport scroll that `lazy` reasons about.
- **Alt text.** The event title is the only honest description available. Consider whether these are
  decorative — the title is always right there in the row — in which case `alt=""` is more correct
  than repeating it to a screen reader.
- **The broken-image case.** Coverage is 100%, so there is no missing-image layout case — only an
  image that fails at request time. Per [08](./08-build-pipeline.md), that must cost one card, never
  the page, and must not collapse the row's layout.
- Whether the ~9-in-49 stock-photo images are worth detecting and suppressing, or whether a generic
  photo still beats a blank box for scanning.

## Answer

**Every event row on the page now carries a picture, at zero extra requests.** The research held up
exactly: `data-xl-src` was present on **40/40 cards** on a fresh live fetch, and across the full
three-page window the renderer actually pulls, **120/120 events** parsed an image. Eighty-seven of
them reach the document — 9 in *Pågår just nu*, the rest across the fourteen slices — and not one
rendered the empty-box fallback.

### What was built

- `lib/hejauppsala.ts` — `Event` gains `image: string | null`, read from the card chunk `cards()`
  already computes. The pattern is deliberately **anchored to `/wp-content/uploads/`** rather than
  matching `data-xl-src` loosely. That is not tidiness: the chunk boundaries are permalink-to-
  permalink, not element-to-element, and 9 of the 49 `data-xl-src` on page 1 are site chrome — so an
  unanchored match would let a chrome block sitting between two cards be adopted as one card's photo.
  01's property of never depending on a theme utility class survives intact.
- `lib/page.ts` — one `thumb()` used by both surfaces. The row grew an inner `.main` wrapper, so
  picture and text stay side by side even where `.row` itself becomes a column (the desktop slices).
- `public/style.css` — a fixed `3 / 2` box with `object-fit: cover`, at three sizes.

### The judgement calls the ticket left open

- **3:2, cropped, at three sizes.** The sources are 1.65:1, 1.49:1, 1.29:1, 1.78:1 and 1:1 in the
  first eight cards alone, so 3:2 was picked as the **middle of that spread** — it crops the least on
  average — and landscape because event photography mostly is. Sizes: **3.25rem in a slice**,
  **4rem in the mobile list**, **5.25rem in *Pågår just nu***. The slice is the constrained one: the
  column is 15rem and a Saturday puts fourteen rows in it, so anything wider pushes titles onto a
  second line and undoes what [11](./11-ongoing-events-and-day-slices.md) settled. *Pågår just nu*
  gets the big one because it is full-width, holds a handful of events, and those events are
  exhibitions and installations — the ones whose picture is most of what tells you what they are.

- **`loading="lazy"`, uniformly.** The worry that it would fight the internally-scrolling columns was
  unfounded, and backwards: `lazy` tests intersection with the **viewport**, honouring ancestor
  clipping, so the columns scrolled off to the right are exactly the ones it should defer — which is
  the behaviour we wanted. And it costs nothing above the fold, because browsers fetch images already
  in the initial viewport eagerly regardless. `decoding="async"` alongside it.

- **`alt=""` — decorative.** The title is the very next thing in the row and is itself the link, so
  any honest alt text is a verbatim repeat. Non-empty alt would make a screen reader read all 87
  events twice for no added information. This also makes the broken-image case quieter: browsers
  render nothing for a failed `alt=""` image rather than a broken-icon-plus-text.

- **The broken-image case is a grey box, and the box is why the dimensions are fixed.** `width` +
  `aspect-ratio` + a `var(--line)` fill mean a 404 or a future hotlink block costs **one picture and
  reflows nothing** — an empty box of the right size reads as "no photo", where a collapsed one reads
  as broken layout. This is [08](./08-build-pipeline.md)'s failure rule at the smallest scale it has
  yet had to apply: one card, never the page.

- **Stock photos are left alone.** Detection would be filename heuristics (`adobestock` and friends)
  against a source that can change its uploads any day — brittle, and failing *silently* when it
  drifts. And the premise is wrong anyway: a generic photo still gives the eye a fixed anchor to
  scan past, which a hole in the column does not. ~9 of 49, several of them chrome rather than cards,
  is not worth a rule that can rot.

### What this does not settle

Robert's words were *"I'm really looking at the images"*, and a 3.25rem thumbnail serves
**recognition**, not browsing. That gap is intact and stays on the map's *Not yet specified* — but
it is now a question that can be looked at rather than argued about, which was the whole point of
shipping the cheap version first.
