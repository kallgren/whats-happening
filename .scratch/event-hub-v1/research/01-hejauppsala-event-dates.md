# Research: recovering event start dates from hejauppsala.com

Ticket: [01 — Recover event start dates from hejauppsala](../issues/01-hejauppsala-event-dates.md)
Investigated: 2026-08-16. Every claim below is backed by a real request against
`hejauppsala.com`, quoted inline.

## Answer in one paragraph

**Candidates 1, 2 and 3 are all dead.** The REST API genuinely has no date, no ACF, no meta
and no `Event` JSON-LD anywhere — not on the API, not on the rendered event page. The only
route is **candidate 4: parsing the rendered listing at `/kalender/`**. It is much better than
the ticket feared: the listing is already **upcoming-only, ordered by event start date ascending,
40 events per page**, so a 14-day horizon costs **3 page fetches (~2.4 MB, ~2.1 s)** — not 53
API pages, and certainly not 5,295 detail fetches. Categories come free on the same pages, and
can be cross-checked against the REST API's `class_list` in one extra batched request. The
fragile part is narrow and can be made narrower: only the day/month badge truly depends on the
theme's utility-class markup.

---

## Candidate 1 — undocumented REST query params: **dead**

The route's own published schema lists every accepted argument. No `meta_key`, no meta
`orderby`, no ACF flag:

```
curl -s https://hejauppsala.com/wp-json/ | jq '.routes["/wp/v2/event"].endpoints[0].args | keys'
```

```
["after","before","context","exclude","include","modified_after","modified_before",
 "offset","order","orderby","page","per_page","search","search_columns",
 "search_semantics","slug","status"]
```

`orderby` is a closed enum with no meta option:

```
"enum": ["author","date","id","include","modified","parent","relevance","slug","include_slugs","title"]
```

Note also there is **no taxonomy filter argument** — the `event-category` taxonomy is not
registered for REST querying, so you cannot even filter the API by category.

`acf_format=standard` changes nothing:

```
curl -s "https://hejauppsala.com/wp-json/wp/v2/event/38577?acf_format=standard"
```

```
acf:     []
meta:    (absent)
content: ""
yoast schema @graph types: ["WebPage","BreadcrumbList","WebSite","Organization"]
```

`after`/`before` filter the WordPress *publish* date, not the event date, so they are useless
for an upcoming-events window.

## Candidate 2 — another REST namespace: **dead**

```
curl -s https://hejauppsala.com/wp-json/ | jq .namespaces
```

```
["oembed/1.0","redirection/v1","simple-page-ordering/v1","wcc/v1","cookieyes/v1",
 "yoast/v1","yop-poll/v1","duplicate-post/v1","wp/v2","wp-site-health/v1",
 "wp-block-editor/v1","wp-abilities/v1"]
```

No `acf/v3`, no `tribe/events/v1`, no custom theme namespace. All 341 routes are stock
WordPress plus cookie-consent / SEO / redirect plugin admin endpoints. There is also **no
`/wp/v2/event-category` route** — the taxonomy is not exposed to REST at all.

## Candidate 3 — `Event` JSON-LD on the detail page: **dead**

```
curl -s https://hejauppsala.com/kalender/lilith-eve-oppen-scen-2026-2/
```

605 KB of HTML. It contains exactly one `application/ld+json` block, the same Yoast graph as
the API (`WebPage`, `BreadcrumbList`, `WebSite`, `Organization`). Counting occurrences in the
page: `"Event"` → **0**, `startDate` → **0**, `datetime` → **0**, `event-date` → **0**.

The date exists only as free prose under a `<h4>När och var?</h4>` heading:

```html
<h4>När och var?</h4>
<p>29 aug 2026<br />
Kl 15:00 &#8211; 16:00<br />
Valegårdens trädgård (RSMH Verkstan), Alsikegatan 6, 753 23 Uppsala</p>
```

This is the *only* place a **year** and a **clock time** appear. But at 605 KB per event it is
unusable as a bulk source — and unnecessary, see below.

## Candidate 4 — the rendered listing: **this is the route**

### The key discovery: the listing is already upcoming-only and date-sorted

```
curl -s https://hejauppsala.com/kalender/
```

`200`, 806 KB, **0.74 s**. It yields 40 event cards. Their start-date badges run
`16 aug, 16 aug, … 17 aug, 18 aug, 19 aug, 20 aug, 21 aug` — monotonically ascending, starting
at **today** (the request was made 2026-08-16). Nothing in the past appears.

The pagination widget on page 1 reads `1 2 3 … 10 Nästa »`, i.e. the whole listing is
**~10 pages ≈ 400 events**, not 5,302. The REST API's `x-wp-total: 5302` counts every event
ever published; the listing shows only what is still upcoming. This is the single fact that
makes the whole thing cheap.

### Server-side filtering exists too

The page carries a month `<select>` whose options are absolute URLs:

```html
<option value="https://hejauppsala.com/kalender/?month=202608">augusti 2026</option>
<option value="https://hejauppsala.com/kalender/?month=202609">september 2026</option>
...
<option value="https://hejauppsala.com/kalender/?month=202708">augusti 2027</option>
```

The options begin at the current month — further confirmation the site itself thinks in
upcoming terms. Verified working:

```
curl -s "https://hejauppsala.com/kalender/?month=202609"
```

`200`, 801 KB. Returns 40 cards, all September 2026 (plus a couple of ongoing runs spilling in),
paginated as `/kalender/page/2/?month=202609`.

**Recommendation: do not use `?month=`.** The plain `/kalender/page/N/` sequence already gives
upcoming-only in date order, a 14-day window never needs more than 3 pages, and a month filter
would need two requests at month boundaries anyway. `?month=` also appeared to miss the page
cache — it took **7.0 s** versus 0.7 s for the unfiltered pages.

### So: is upcoming-only filtering server-side?

**Yes, effectively.** `/kalender/` is a server-side upcoming-only, start-date-ascending feed.
You never pull the 5,295-event archive. You stop fetching pages as soon as the last card on a
page is past your horizon.

---

## The concrete strategy

1. `GET https://hejauppsala.com/kalender/` — parse 40 cards.
2. If the last card's start date is still inside the 14-day horizon,
   `GET https://hejauppsala.com/kalender/page/2/`, then `page/3/`, and so on. Stop at the first
   page whose last card is past the horizon.
3. **Dedupe by slug.** Consecutive pages overlap: page 2 repeated 3 slugs from page 1
   (`aroir-katalins-terrassen-2026-2`, `kommande-event-jam-juice-dance-festival-2026`,
   `sirius-hacken-21-aug-2026`), and one page-1 slug did not reappear. 3 pages × 40 cards
   produced **117 unique events**, not 120. Do not assume a clean offset.
4. **Infer the year.** Badges carry day + Swedish month abbreviation only, never a year. Since
   the feed is date-ascending starting from today, assign the current year and roll forward one
   year whenever the month number decreases relative to the previous card.
5. *(Optional, recommended)* One batched REST call to recover canonical titles and categories
   from a stable JSON contract instead of HTML — see below.

### Cost per daily build

| Requests | Bytes | Wall clock |
|---|---|---|
| 3 listing pages | ~2.4 MB | **~2.1 s** (measured 0.74 + 0.66 + 0.74 s) |
| + 1 optional REST batch | ~30 KB | +0.47 s |
| **Total** | **~2.4 MB** | **~2.6 s** |

Four HTTP requests, under three seconds, for a full 14-day horizon. The pages are large (~800 KB)
because they are ad- and CSS-heavy, but they are served from cache and the parse is trivial.

### Example request and trimmed response

```
curl -s https://hejauppsala.com/kalender/
```

One card, trimmed to the load-bearing parts:

```html
<div class="o-grid__item o-reverse__item o-gutter__item [ u-width-1/2 ... ]">
  <a href="https://hejauppsala.com/kalender/sirius-hacken-21-aug-2026/" class="c-img-module u-block">
    <figure class="c-lazy-img ...">
      <div class="[ u-position-absolute u-index-1 ] u-background-zeta ...">
        <p class="u-push-bottom-clear u-inline-block u-text-bold">21 </p>
        <span class="u-text-uppercase u-text-6xs">aug</span>
      </div>
      <div class="... js-lazy-img__img"
           data-xl-src="https://hejauppsala.com/wp-content/uploads/.../....webp"></div>
    </figure>
  </a>
  <a href="https://hejauppsala.com/kalender/sirius-hacken-21-aug-2026/" class="u-block [ c-ui-link ... ]">
    <p class="[ u-text-sm u-text-md@lg u-text-bold ] o-truncate u-push-bottom-xs u-text-currentColor">
      Sirius-Häcken    </p>
  </a>
  <ul class="o-inline-list o-breadcrumbs u-text-nu">
    <li class="o-inline-list__item o-breadcrumbs__item u-text-4xs" data-breadcrumb="|">
      <a href="https://hejauppsala.com/event-category/hojdpunkter-hejauppsala/">Höjdpunkter</a>,
      <a href="https://hejauppsala.com/event-category/sport/">Sport</a>,
      <a href="https://hejauppsala.com/event-category/uppsala/">Uppsala</a>
    </li>
    <li ...>Studenternas IP, Uppsala</li>
  </ul>
</div>
```

A card for a multi-day event carries an end date in the same badge:

```html
<p class="u-push-bottom-clear u-inline-block u-text-bold">17 </p>
<span class="u-text-uppercase u-text-6xs">aug</span>
 -
 <p ...>19 </p><span ...>aug</span>
```

Parsed, that card becomes:

```json
{ "slug": "sirius-hacken-21-aug-2026",
  "title": "Sirius-Häcken",
  "start": "2026-08-21", "end": null,
  "cats": ["hojdpunkter-hejauppsala", "sport", "uppsala"],
  "link": "https://hejauppsala.com/kalender/sirius-hacken-21-aug-2026/" }
```

### Optional REST cross-check

`/wp/v2/event` accepts a comma-separated `slug` list, up to 100 per request. This lets you take
**only the dates** from HTML and everything else from JSON:

```
curl -s "https://hejauppsala.com/wp-json/wp/v2/event?per_page=100\
&_fields=slug,link,title,class_list\
&slug=orup-parksnackan-2026,aroir-katalins-terrassen-2026-2,sirius-hacken-21-aug-2026"
```

`200`, 0.47 s:

```json
[{ "slug": "sirius-hacken-21-aug-2026",
   "link": "https://hejauppsala.com/kalender/sirius-hacken-21-aug-2026/",
   "title": { "rendered": "Sirius-Häcken" },
   "class_list": ["post-37715","event","type-event","status-publish","hentry",
                  "event-category-hojdpunkter-hejauppsala","event-category-sport",
                  "event-category-uppsala"] }]
```

Worth doing: one request covers a whole 14-day window, and it moves title and category parsing
off the fragile markup onto a documented JSON contract.

---

## How fragile is the parse, exactly?

The parse depends on four things, in descending order of stability:

| What | Selector / pattern | Fragility |
|---|---|---|
| Event identity + link | `href="https://hejauppsala.com/kalender/<slug>/"` | **Stable.** Public permalink structure; changing it would break every inbound link. |
| Categories | `href=".../event-category/<slug>/"` | **Stable**, same reason. Also independently recoverable from REST `class_list`. |
| Title | `<p class="… o-truncate u-push-bottom-xs u-text-currentColor">` | **Fragile** — pure utility-class soup. But recoverable from REST `title.rendered`, so don't depend on it. |
| **Start / end date** | `<p class="u-push-bottom-clear u-inline-block u-text-bold">DD</p>` followed by `<span class="u-text-uppercase u-text-6xs">mon</span>` | **Fragile, and the one thing with no fallback.** This is the whole risk. |

Card boundaries: I split on `<div class="o-grid__item o-reverse__item o-gutter__item` — also
utility classes, also fragile. **Better: split on the `/kalender/<slug>/` anchors themselves**
(stable) and take, for each slug, the day/month text that appears between it and the next slug.
That reduces the entire fragile surface to "a bare number and a three-letter Swedish month
abbreviation appear as text between the anchor and the title", which survives any amount of
class renaming.

Residual risks worth naming:

- **No year, ever.** Inferred from ordering. A gap of more than 12 months between consecutive
  cards would break the inference — irrelevant at a 14-day horizon.
- **No clock time in the listing.** Only the detail page has `Kl 15:00 – 16:00`. If v1 wants
  times, that costs one 605 KB fetch per event, which at ~87 events per window is ~53 MB. Do not
  do this for v1; show the day only.
- **The theme is bespoke.** These are hand-rolled utility classes, not a popular plugin, so
  there is no upstream to track. A redesign breaks the date parse silently — it would yield
  cards with no date rather than an error. **The build must fail loudly if a listing page
  yields 40 links but fewer than ~35 parsed dates.** This is exactly the "silently returns zero
  rows" case the map lists under *Not yet specified*.
- **Ongoing events are clamped to today.** See below — a real semantic gotcha, not just a
  parsing one.

## The ongoing-event gotcha

A card badged `16 aug – 30 aug` on today's page does **not** mean the event starts today. Its
detail page says:

```
curl -s https://hejauppsala.com/kalender/skulskulpturer-av-sean-henry-aug-2026/
```

```html
<h4>När och var?</h4>
<p>pågår till &#8211; 30 aug 2026<br />
Kl 08:00 &#8211; 18:00<br />
Domkyrkan<br />Uppsala kommun</p>
```

"pågår till" = *runs until*. The listing clamps any already-running event's displayed start to
today, so today's bucket collects every ongoing exhibition, guided tour and installation in the
city. The **end** date is real; the **start** date on day 1 is not.

Two consequences for the page:

1. Today's slice will always look far busier than any other day (23 of 117 events in my sample).
2. If the day-slice layout renders each event only on its start date, multi-day runs vanish from
   every day but the first. The parse gives you `start` **and** `end`, so the layout can decide:
   either repeat the event across the days it spans, or give ongoing runs their own strip
   ("pågår just nu") separate from the day slices. **The second is probably right** — it stops
   long-running exhibitions from flooding all 14 slices.

---

## Categories available for grouping

Harvested from 117 unique events across `/kalender/` pages 1–3 (count = events tagged with it):

| Slug | Label | n |
|---|---|---|
| `uppsala` | Uppsala | 113 |
| `hojdpunkter-hejauppsala` | Höjdpunkter | 95 |
| `musik` | Musik | 45 |
| `gratis` | Gratis | 35 |
| `familj` | Familj | 21 |
| `ovrigt` | Övrigt | 19 |
| `konst` | Konst | 17 |
| `museum` | Museum | 15 |
| `scen` | Scen | 10 |
| `sport` | Sport | 9 |
| `foredrag` | Föredrag | 4 |
| `mat-dryck` | Mat & Dryck | 4 |
| `osthammar` | Östhammar | 2 |
| `tierp` | Tierp | 1 |
| `dans-event` | Dans | 1 |
| `enkoping` | Enköping | 1 |
| `kurser` | Kurser | 1 |

Notes for whoever uses these:

- Categories mix **three different axes**: genre (`musik`, `konst`, `scen`, `sport`, `familj`,
  `foredrag`, `mat-dryck`, `dans-event`, `kurser`, `museum`), **geography**
  (`uppsala`, `osthammar`, `tierp`, `enkoping`), and **editorial/price flags**
  (`hojdpunkter-hejauppsala`, `gratis`). Group on the genre axis only.
- `uppsala` is on 97% of events — useless for grouping, but a **usable filter** to enforce the
  map's *Uppsala only* rule and drop the Östhammar / Tierp / Enköping strays.
- `hojdpunkter-hejauppsala` (81%) is the site's own editorial "highlight" flag and is far too
  broad to act as a relevance signal.
- Events carry multiple genre categories, so any grouping must pick a primary or allow
  duplication.

---

## Secondary observation: event volume in a 14-day window

**The map's open question — "whether the day-slice view survives contact with real data" — the
number is roughly 90 to 120 events per 14 days, and today's slice alone holds 20+.**

Distribution over 2026-08-16 → 2026-08-29 (14 days), by badged start date, from
`/kalender/` pages 1–3:

```
16 aug  23   <- today; inflated by ongoing runs clamped to today
17 aug   3
18 aug   4
19 aug   1
20 aug   4
21 aug   5
22 aug  14
23 aug   9
24 aug   2
25 aug   4
26 aug   1
27 aug   2
28 aug   5
29 aug  10
        ---
        87 events starting in the window
```

Reading the shape:

- **87 events start in the 14-day window**, ~117 unique events across the ~22 days the three
  pages cover.
- Strip out day 1's ongoing pile-up and the honest per-day rate is **1–14 events, median ~4**,
  with clear weekend spikes (22 aug and 29 aug are Saturdays: 14 and 10).
- **Day slices are viable** for a typical day — 4 cards fit a slice comfortably; 10–14 on a
  Saturday is the real stress case and will need either a scroll inside the slice or a "+6 till"
  overflow affordance.
- **Day 1 is the problem, and it is not really a volume problem.** Its 23 entries are mostly
  ongoing exhibitions, not things happening today. Pulling ongoing runs out into their own
  "pågår just nu" strip fixes both the day-1 bulge and the multi-day-event question at once, and
  brings today's slice down to the same 1–14 band as every other day.
- 14 slices × ~6 average = the full horizon is ~90 cards on one page. That is a lot for a
  horizontal slice layout at 60rem+; **7 days may scan better than 14**, with the second week
  behind a "visa mer" or simply dropped. Worth deciding once the data is actually on the page.
