# 01 — Recover event start dates from hejauppsala

Type: research
Status: open
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
