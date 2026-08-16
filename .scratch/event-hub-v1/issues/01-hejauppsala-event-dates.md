# 01 — Recover event start dates from hejauppsala

Type: research
Status: resolved
Blocked by: —

## Question

How do we get the **start (and end) date** of each event from hejauppsala.com?

The REST API is open and unauthenticated:

- `https://hejauppsala.com/wp-json/wp/v2/event?per_page=100&page=N`
- `x-wp-total: 5295`, `x-wp-totalpages: 2648` at `per_page=2` (so ~53 pages at 100/page)
- Returns: `id`, `title.rendered`, `link`, `slug`, `class_list` (carries `event-category-*` terms)

**The problem**: the actual event date is *not* in the payload. `acf` is `[]`, `content.rendered`
is empty, `yoast_head_json.schema` contains only `WebPage`/`BreadcrumbList`/`WebSite`/`Organization`
— no `Event` node. The `date` field is the WordPress *publish* date, not the event date.
The listing page renders dates as `"12 aug - 30 aug"`.

Find the cheapest reliable route. Candidates to test, roughly in order of preference:

1. Undocumented query params on the REST route — `?_fields=`, `?acf_format=standard`, `?meta_key=`,
   ordering by a meta field. Does the ACF-to-REST integration expose dates under any flag?
2. Another REST namespace — check `/wp-json/` for non-`wp/v2` namespaces (ACF, Tribe Events,
   custom theme routes). `/wp-json/wp/v2/place` exists, so the theme has custom post types;
   there may be custom routes too.
3. `Event` JSON-LD on the individual event page (`/kalender/<slug>/`) — likely present even though
   it is absent from the API's Yoast payload.
4. Parsing the rendered listing pages at `/kalender/page/N/` — gives date + title + link together,
   avoiding 5,295 individual fetches.

Also determine: is there a way to fetch **only upcoming** events, or must we pull everything and
filter locally? At a 14-day horizon, pulling 5,295 events daily to find ~100 is wasteful but
survivable — quantify it.

**Deliverable**: a concrete, working fetch strategy with an example request/response, the cost per
daily build (number of HTTP requests, approximate time), and the categories available for grouping.

Note: `/feed/` and `/kalender/feed/` both return **403** — RSS is not an option.

## Answer

**Full findings: [research/01-hejauppsala-event-dates.md](../research/01-hejauppsala-event-dates.md).**

Candidates 1–3 are all dead; **candidate 4 — parsing the rendered `/kalender/` listing — is the
route**, and it is far cheaper than this ticket assumed.

- **1, undocumented REST params**: dead. The route's published schema has no `meta_key`, `orderby`
  is a closed enum with no meta option, and `acf_format=standard` still returns `acf: []`. There is
  no taxonomy filter arg either.
- **2, other namespaces**: dead. 12 namespaces, all stock WordPress plus cookie/SEO/redirect
  plugins. No ACF, no Tribe, no theme routes, no `event-category` route.
- **3, `Event` JSON-LD on detail pages**: dead. A 605 KB page carrying one Yoast graph with zero
  occurrences of `"Event"`, `startDate` or `datetime`. The date exists only as prose under
  `<h4>När och var?</h4>`.

**The key discovery**: `/kalender/` is already **upcoming-only, sorted by event start date
ascending, 40 per page**, and paginates to ~10 pages. So the live horizon is ~400 upcoming events —
the archive's `x-wp-total: 5302` never has to be pulled at all, which was this ticket's main fear.

**Cost per daily build: 4 requests, ~2.4 MB, ~2.6 s** for a full 14-day window (three listing pages
at ~0.7 s each, plus one optional batched REST call). Server-side `?month=YYYYMM` filtering exists
and works, but is **not** recommended: the plain page sequence is already upcoming-only, and
`?month=` misses the page cache (7.0 s vs 0.7 s).

**Gotchas**:

- **Pages overlap.** 3 pages × 40 cards yielded 117 unique, not 120. Dedupe by slug.
- **Day-1 start dates are a lie.** The listing clamps an already-running event's displayed start to
  today, so a card badged `16 aug – 30 aug` may have started weeks ago (verified against a detail
  page reading `pågår till – 30 aug 2026`). End dates are real; day-1 starts are not.

**Fragility**: identity and categories rest on stable permalink patterns (`/kalender/<slug>/`,
`/event-category/<slug>/`), which is fine. The **date badge depends on the theme's utility classes**
(`u-push-bottom-clear u-inline-block u-text-bold` + `u-text-uppercase u-text-6xs`) with no fallback —
this is the one genuinely brittle dependency. Mitigations: anchor the card split on slug URLs rather
than class names, take title and categories from a batched `?slug=a,b,c` REST call instead of HTML,
and **fail the build loudly** when a page yields 40 links but under ~35 dates, so a theme redesign
cannot degrade silently into an empty page.

**Categories**: 17, mixing three axes — genre, geography and editorial flags. `uppsala` appears on
97% of events (useless for grouping, but it is the Uppsala-only filter) and
`hojdpunkter-hejauppsala` on 81%.
