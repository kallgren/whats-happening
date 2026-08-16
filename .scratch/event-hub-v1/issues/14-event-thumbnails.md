# 14 — Event thumbnails

Type: task
Status: open
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
