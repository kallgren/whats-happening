# 02 — Get Uppsala cinema showtimes

Type: research
Status: resolved
Blocked by: —

## Question

How do we get **film showtimes for Filmstaden Uppsala**, cheaply and without a fragile scraper?

Probing found the obvious paths are defended:

- `https://www.filmstaden.se/api/cinemas` → **403**
- `https://www.filmstaden.se/api/v2/movies` → **403**
- `api.filmstaden.se` → does not resolve
- `robots.txt` → 200 (read it; it may disclose real API paths)

The 403s look like bot protection or wrong paths rather than genuine absence — Filmstaden's own
site is a SPA and must be calling *something*. Determine which, and whether it is reachable with
plain headers.

Investigate, in order:

1. What XHR/fetch calls the Filmstaden site actually makes when browsing Uppsala showtimes
   (the browser tools are available for this). Capture the real endpoint, params and headers.
2. Whether those endpoints work server-side with a normal `User-Agent`, or whether the 403 is
   Cloudflare-style protection that a scheduled GitHub Action cannot pass.
3. Fallbacks if Filmstaden is genuinely closed: `bio.se`, Google/JustWatch showtimes, or the
   individual Uppsala cinema sites (Fyrisbiografen, Slottsbiografen, Bio Regina).

**Ranking is already decided**: top 5 films by **number of showings this week**. Confirm the chosen
source actually carries enough data to compute that — it needs per-film showtime counts, not just
a "now showing" list.

**Also decide here**: which cinemas the *link-out* points at. v1 pulls data from Filmstaden only,
but the link should give easy access to all Uppsala cinemas — one link to a listing that covers
them, or several links.

**Scope loosened (2026-08-16)**: Uppsala-specific showtimes are the goal, but they are not the bar
for resolving this ticket. If the cheapest reliable source is a **national** "now showing in Sweden"
list with no per-city breakdown, take it and say so — a Sweden-wide top list is an acceptable first
landing, and the city filter can be added later. Prefer the easiest thing that puts real film titles
on the page over the correct thing that puts none there.

**Deliverable**: a working request that returns Uppsala showtimes, or a clear finding that
Filmstaden is closed plus a recommended alternative source. Flag explicitly if the only viable
route is browser automation, since that is incompatible with a static scheduled build and would
force this section to be reconsidered.

## Answer

**Full findings, including the rejected alternatives with evidence:
[research/02-cinema-showtimes.md](../research/02-cinema-showtimes.md).**

**Filmstaden is permanently closed to us — and it turns out we do not need it.** Two *other* Uppsala
cinemas publish a full week of showtimes as plain server-rendered HTML, giving exact per-film
showtime counts in **two GET requests per build**. The loosened national-list fallback is not needed:
this ticket lands Uppsala-specific data, which was the original goal.

**Filmstaden**: Cloudflare managed challenge (`cf-mitigated: challenge`) on **every path, including
the homepage** — not just `/api/`. It defeats full browser header sets and Node's `fetch`, which is
what a GitHub Action would use. Every plausible API subdomain (`api.`, `apiv2.`, `web-api.`,
`gateway.`, `m.`, `cdn.`, `static.`, `app.`) is NXDOMAIN, so the SPA calls the protected origin and
there is nowhere else to look. The only way in is headless-browser challenge-solving — incompatible
with a static scheduled build, and precisely the maintenance liability this ticket exists to avoid.

**The sources** (both re-verified by the parent session):

1. **`GET https://www.nfbio.se/biograf/uppsala?city=uppsala`** — 200, 608 KB, 122 screenings in one
   document. Nordisk Film Bio Uppsala (Gränby) is a mainstream multiplex that was missing from this
   ticket's fallback list; it carries the blockbuster slate. Works with curl's *default* UA, and
   `robots.txt` permits it. Each screening carries `<time datetime="YYYY-MM-DD">`, a screen, a time
   and a UUID booking link. **`?city=uppsala` is load-bearing** — without it, 302 and zero screenings.
2. **`GET https://www.fyrisbiografen.se/kalendarium`** — 200, 56 KB, 27 art-house showtimes, each
   booking URL carrying `&t=HH:MM&d=YYYY-MM-DD`. **Caveat**: its horizon is the remaining Fri–Thu
   playing week, so on Thursdays it is nearly empty. It must never be the sole input.

**The agreed ranking survives unchanged.** Exact counts are available — 104 screenings in the next
7 days from nfbio alone (Spider-Man 37, The Odyssey 17, Minioner & Monster 11, Paw Patrol 11, End of
Oak Street 7), cross-checked against the per-film page for The Odyssey, which independently lists 17.

**The honest caveat**: without Filmstaden's Luxe (13 screens) and Royal, a title playing at both
chains is undercounted. The ranking *shape* holds, but the numbers are "showings at Uppsala's two
readable cinemas", not "showings in Uppsala" — so **rank on them, never print them as authoritative**.

**Fragility**: low–medium for nfbio (stable Drupal, ISO dates), medium for Fyrisbiografen
(hand-rolled PHP). Both break loudly, as zero rows. Since a thin week is indistinguishable from a
broken parse, the guard for [08](./08-build-pipeline.md): **fail the build if nfbio yields under 5
screenings in 7 days**; treat a thin Fyrisbiografen as normal.

**Link-outs — three, one per operator**: `https://www.filmstaden.se/uppsala/` (covers both Luxe and
Royal; it is the link that compensates for the data we cannot fetch, and it **403s to curl while
working fine in a browser** — exclude it from any link-checking), plus the two source URLs above.
Slottsbiografen is a heritage rental venue with no programme, and "Bio Regina" is a theatre, not a
cinema — both drop off the list this ticket started with.

**Back-pocket alternative**: `bio.se` has an unauthenticated `POST /api/films/on-cinemas-now`
taking `{lat, lon, date}` that does work server-side. Rejected: its only Uppsala cinema is
Fyrisbiografen, it carries **no times at all** (ranking would degrade to a days-showing proxy at
7 POSTs/build), and its `screenings` route appears broken.
