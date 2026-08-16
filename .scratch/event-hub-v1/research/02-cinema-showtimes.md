# Research: Uppsala cinema showtimes

Ticket: [02 — Get Uppsala cinema showtimes](../issues/02-filmstaden-showtimes.md)
Date: 2026-08-16
Method: every claim below was verified with a plain server-side `curl` from this machine, with an
ordinary desktop User-Agent and no cookies, no session, no browser. The Chrome automation tools were
unavailable this session (extension not connected), which is incidental — the consumer is a scheduled
GitHub Action, so a browser-only result would have been useless anyway.

## Answer in one line

**Filmstaden is closed** — Cloudflare challenges the entire domain, so a GitHub Action can never read
it. But Uppsala has two *other* cinemas that publish their full week of showtimes as plain
server-rendered HTML, and **two GET requests per build** produce exact per-film showtime counts for
Uppsala. The agreed ranking rule ("top 5 by number of showings this week") survives unchanged.

No national fallback is needed. The loosened scope is not required.

---

## 1. Filmstaden is genuinely closed (not a wrong path)

The ticket suspected the 403s were bot protection rather than absence. Confirmed — and it is worse
than the ticket assumed: **the 403 is not limited to `/api/`, it covers the homepage too.**

```
$ curl -s -o /dev/null -w "%{http_code}\n" -A "<desktop Chrome UA>" https://www.filmstaden.se/
403
```

Response headers on that 403:

```
cf-mitigated: challenge
server: cloudflare
content-security-policy: ... https://challenges.cloudflare.com ...
set-cookie: __cf_bm=...
```

Body is `<title>Just a moment...</title>` — the standard Cloudflare interstitial.

| URL | Result |
| --- | --- |
| `https://www.filmstaden.se/` | 403 challenge |
| `https://filmstaden.se/` (no www) | 403 challenge |
| `https://www.filmstaden.se/api/cinemas` | 403 challenge |
| `https://www.filmstaden.se/api/v2/movies` | 403 challenge |
| `https://www.filmstaden.se/sitemap-index.xml` | 403 challenge |
| `https://www.filmstaden.se/uppsala/` | 403 challenge |
| `https://www.svenskabio.se/` | 403 (redirects to filmstaden.se) |

Things that were tried and did **not** help:

- A full browser header set — `Accept`, `Accept-Language`, `sec-ch-ua`, `sec-ch-ua-platform`,
  `Sec-Fetch-*`, `Upgrade-Insecure-Requests` — still 403.
- Node's built-in `fetch` (i.e. undici, what a GitHub Action would actually use) — still 403.
- `robots.txt` is one of the few things that *is* served (200). It discloses nothing useful:
  `User-agent: * / Allow: / / Sitemap: https://www.filmstaden.se/sitemap-index.xml`. The sitemap it
  points at is itself 403.
- No separate API host exists. `api.`, `apiv2.`, `web-api.`, `gateway.`, `m.`, `cdn.`, `static.`,
  `app.` `.filmstaden.se` are all **NXDOMAIN**, so the SPA must call the protected origin. There is
  nowhere else to look.

**Conclusion: Filmstaden is unreachable from a scheduled build, permanently and by design.** The only
route in would be browser automation (headless Chrome solving a managed challenge), which is
incompatible with the effort's "static file, no runtime" constraint, arguably against their terms, and
a maintenance liability of exactly the kind ticket 02 exists to avoid. **Do not build on Filmstaden.**
Link out to it instead (see §5).

## 2. What Uppsala actually has

The ticket named Fyrisbiografen, Slottsbiografen and Bio Regina. The real list — cross-checked
against [Destination Uppsala's cinema page](https://destinationuppsala.se/se-gora-ata/biografer/)
(200, readable server-side) — is:

| Cinema | Type | Server-readable? |
| --- | --- | --- |
| **Nordisk Film Bio Uppsala**, Marknadsgatan 1 (Gränby) | mainstream multiplex, 4DX | **yes** |
| **Fyrisbiografen**, S:t Olofsgatan 10 | art house (Folkets Bio) | **yes** |
| **Filmstaden Luxe Uppsala**, Dragarbrunnsgatan 22 (13 screens, IMAX/iSense) | mainstream multiplex | no — Cloudflare |
| **Royal Uppsala** (Filmstaden) | mainstream | no — Cloudflare |
| **Slottsbiografen**, Nedre Slottsgatan 6D | heritage venue / rental hall, no regular programme | n/a |

Nordisk Film Bio Uppsala was **not** in the ticket's fallback list and is the important find: it is a
mainstream multiplex carrying the blockbuster slate (Spider-Man, The Odyssey, Toy Story 5, Vaiana…),
and it publishes everything as static HTML. "Bio Regina" is a theatre, not a cinema, and has no film
programme.

## 3. Recommended source — two requests, exact showtime counts

### 3a. Nordisk Film Bio Uppsala (primary)

```
GET https://www.nfbio.se/biograf/uppsala?city=uppsala
```

Verified:

```
$ curl -s -o t2.html -w "%{http_code} %{size_download} %{time_total}s\n" \
    -A "<desktop Chrome UA>" "https://www.nfbio.se/biograf/uppsala?city=uppsala"
200 608408 ...
$ grep -c 'nfbio.se/screening/' t2.html
122
```

- **No API key, no cookies, no session.** It also returns 200 with curl's *default* `curl/8.x`
  User-Agent, so it is not even UA-sniffing. Nothing to expire, nothing to rotate.
- **Fully server-rendered.** One 600 KB HTML document contains the cinema's entire forward schedule —
  122 distinct screenings spanning 2026-08-16 to 2026-10-31 in the sample.
- `robots.txt` allows it. The `Disallow` list is Drupal boilerplate (`/core/`, `/admin/`,
  `/user/login`, README files); nothing under `/biograf/` or the film pages is disallowed.
- The `?city=uppsala` query string **is required** — without it the URL 302s to a city-select page and
  returns no screenings. Verified: `curl https://www.nfbio.se/biograf/uppsala` → `302`, 0 screenings.

Markup shape (all of it plain HTML, no JS needed):

```html
<a href="/spider-man-brand-new-day?city=uppsala">
  <span class="field field--name-title ...">Spider-Man: Brand New Day</span></a>
...
<time datetime="2026-08-16">sön, 16/8</time>
<a href="https://www.nfbio.se/screening/4/d86319f1-04b7-452b-8ab9-f2e9b00caae9" ...>
  <div class="room">Salong 4</div>
  <div class="time"><div> 14.00 </div></div>
  <div class="version"> 2D, (Eng. tal), (Sv.text) </div></a>
```

Each screening carries a **machine-readable ISO date** (`<time datetime="YYYY-MM-DD">`) and a stable
UUID in the booking href. Title, poster URL, runtime and age rating are all on the same page.

Parsing recipe that was actually run and validated: collect every
`href="https://www.nfbio.se/screening/<n>/<uuid>"`, attribute each to the nearest preceding
`<time datetime>` and the nearest preceding `href="/<slug>?city=uppsala"`, dedupe by UUID.

Result for the 7 days from 2026-08-16 (**104 screenings**):

```
  37  Spider-Man: Brand New Day
  17  The Odyssey
  11  Minioner & Monster
  11  Paw Patrol: Dinosaurie-filmen
   7  The End of Oak Street
   6  Toy Story 5
   6  Vaiana
   2  Det grönaste gräset
   2  Insidious: Out of the Further
   2  Hjärtat mitt
   1  Obsession / The Invite / De Gaulle: Motståndets pris
```

**Cross-checked**: the individual film page `https://www.nfbio.se/odyssey?city=uppsala` independently
lists 17 screenings for The Odyssey — exactly matching the count derived from the cinema page. The
one-request aggregate loses nothing versus one-request-per-film.

### 3b. Fyrisbiografen (secondary, art house)

```
GET https://www.fyrisbiografen.se/kalendarium
```

Verified: `200`, 55 709 bytes, 0.47 s. Server-rendered by "Kinoplex". `robots.txt` is empty (200, no
rules).

Each showtime appears as a booking URL carrying screen, time and **ISO date**:

```html
window.open('https://fyrisbiografen.se/includes/load-booking.php?s=Fyris 2&t=15:10&d=2026-08-16', ...)
...
<span class="calendar_media_large"> <a title="Rebuilding" href="rebuilding">Rebuilding</a> (Salong 2)</span>
```

Parsing `load-booking\.php\?s=([^&]+)&t=(\d\d:\d\d)&d=(\d{4}-\d\d-\d\d)` paired with the following
`<a title="...">` yields 27 showtimes across 2026-08-16 → 2026-09-03:

```
   3  Rebuilding        3  Arco        3  The Odyssey
   2  Det grönaste gräset   2  Hjärtat mitt   2  De Gaulle: Motståndets pris
   1  Stand By Me, Backrooms, Sentimental Value, Mästaren och Margarita, Carola!, …
```

**Caveat, and it is a real one**: the page states its own horizon — *"Kalendariet visar resterande
dagar av nuvarande spelvecka (fredag–torsdag). Fr.o.m. onsdag visas även nästa spelvecka."* The
playing week runs Friday→Thursday, so **on a Thursday this page is nearly empty**. Fyrisbiografen must
therefore never be the sole input to the ranking. It is a topping-up source; nfbio.se carries a long
horizon and is unaffected.

Fallback within the same source if the calendar is thin: the homepage `https://www.fyrisbiografen.se/`
has a "Visas nu" poster block (8 titles, `<a title="…">` + poster image) that is a straight
now-showing list with no dates.

## 4. Answers to the ticket's specific questions

**Per-film showtime counts — available?** **Yes, exactly.** Both sources give individual screenings
with an ISO date, a time and a screen, so "number of showings this week" is a literal count, not a
proxy. **The agreed ranking rule does not need to change.**

Recommended computation: union the screenings from both sources, filter to `date <= today + 6`, group
by title, count, take top 5. On the sample day that yields Spider-Man: Brand New Day (37), The Odyssey
(17+3=20), Minioner & Monster (11), Paw Patrol: Dinosaurie-filmen (11), The End of Oak Street (7).

One wrinkle worth knowing: because Filmstaden is missing, a title playing at both chains is
undercounted relative to reality. It does not change the *shape* of the answer — the multiplex slate
still dominates — but the numbers are "showings at Uppsala's two readable cinemas", not "showings in
Uppsala". Do not print the raw count as an authoritative figure; use it to rank, and label the section
honestly.

**Request count per daily build:** **2 GETs.** ~660 KB total, both under 1.2 s. No key, no auth, no
rate limit encountered.

**Fragility assessment:**

| | Risk |
| --- | --- |
| nfbio.se | **Low–medium.** Drupal site, stable URL, static HTML. The `?city=uppsala` param is load-bearing — if it changes the build reads a 302 and gets zero screenings. The dates come from `<time datetime>` (machine-readable, low churn); the CSS class names (`.room`, `.time`) are the softer dependency, but the screening-link + `<time>` pairing alone is enough and is the most stable part. |
| fyrisbiografen.se | **Medium.** Hand-rolled "Kinoplex" PHP. The booking URL carries ISO date + time as query params, which is a good anchor; the title comes from an `<a title>` next to it. Small site, low redesign frequency, but no contract of any kind. Its Friday→Thursday horizon means legitimately-empty results are normal, which the build must not mistake for breakage. |
| Both | Neither is an API. Neither promises anything. This is scraping, and it will break eventually — but it breaks *loudly* (zero rows), and the effort's map already accepts a failed workflow email as the alerting mechanism. |

Because a thin week is indistinguishable from a broken parse, this ticket lands squarely on the map's
open question *"How source failures surface, and empty vs broken on the page."* Concrete suggestion:
have the build **fail** if nfbio.se returns fewer than ~5 screenings in the next 7 days (that is
never legitimately true for a multiplex), and treat a thin Fyrisbiografen as normal.

**Is browser automation required?** **No** — for the recommended sources. It *is* the only route to
Filmstaden, which is precisely why Filmstaden is dropped from v1's data path.

## 5. Link-out targets

The ticket asks whether one link or several. **Several — three, one per operator**, because no single
Swedish page lists all Uppsala cinemas' showtimes, and the one aggregator that comes close
(Destination Uppsala) is a tourist directory with no times.

| Label | URL | Why |
| --- | --- | --- |
| Filmstaden | `https://www.filmstaden.se/uppsala/` | Covers **both** Filmstaden Luxe Uppsala and Royal Uppsala. This is the link that compensates for the data we cannot fetch, so it matters most. |
| Nordisk Film Bio | `https://www.nfbio.se/biograf/uppsala?city=uppsala` | Same page the build scrapes — cheap consistency, and the `?city=uppsala` is needed or the visitor gets a city picker. |
| Fyrisbiografen | `https://www.fyrisbiografen.se/kalendarium` | Full art-house programme. |

Slottsbiografen is deliberately omitted — it is a rental venue with no public film programme.

Note `https://www.filmstaden.se/uppsala/` returns 403 to curl but works normally in a real browser, so
it is fine as a link and must **not** be link-checked by the build.

## 6. Considered and rejected

- **bio.se** — genuinely useful and worth recording, but not needed. It is the portal for Sweden's
  ~250 *independent* cinemas. Its Next.js frontend calls same-origin routes that work server-side with
  plain headers and no key:
  - `POST https://www.bio.se/api/films/on-cinemas-now`, body `{"lat":59.8586,"lon":17.6389,"date":"2026-08-16"}`
    → `200`, `{"uniqueFilms":[{"id":42010,"title":"Backrooms","distanceKm":0.57,"poster_url":…,"release_date":…,"synopsis":…}, …]}`.
    26 films for Uppsala; genuinely location-filtered (the same call for Kiruna returns 0 films).
  - `GET https://www.bio.se/api/films/coming-soon` → 200, 124 KB.
  - `GET https://www.bio.se/api/cinemas/slug/fyrisbiografen` → 200, cinema metadata.
  - `GET https://www.bio.se/biografer` → 200, 463 KB, all ~250 cinemas server-rendered.

  Rejected as the primary source for three reasons. (1) **Coverage**: the only Uppsala cinema on
  bio.se is Fyrisbiografen — everything else in the response is 27–67 km away (Knivsta, Bålsta,
  Stockholm), so the "Uppsala" list is polluted unless filtered to `distanceKm < 5`, at which point it
  is just Fyrisbiografen, which we can read directly and better. (2) **No showtimes**: the payload has
  no times at all, only a per-date film list, so ranking would degrade to "number of *days* showing",
  a proxy. It would cost 7 POSTs (one per date) to get even that. (3) `POST /api/films/screenings`
  exists (returns 500, not 404) but is **undocumented and appears broken** — every body shape tried
  (`filmId`, `movieId`, `parentFilmId`, `filmIds`, `slug`, `postId`, path variants, query variants)
  returns the identical `{"error":"Failed to resolve parent film ID"}`. Not something to build on.

  Keep bio.se in the back pocket: if Fyrisbiografen's own site ever changes shape, bio.se is a second
  route to the same cinema's listings.

- **A national "now showing in Sweden" list** (the loosened-scope escape hatch) — not taken. It would
  have been a downgrade: no showtime counts, no Uppsala relevance, and in TMDB's case a new API key to
  manage, which the effort's "no expiring tokens" preference argues against. Two plain GETs beat it on
  every axis.

- **moviezine.se / filmtipset.se** showtime sections — both 404 at the obvious paths; not pursued once
  the direct cinema sites proved readable.

## 7. Suggested wording for the page

The section can honestly say *"Mest visade filmerna i Uppsala den här veckan"* with the three link-outs
beneath. Ranking on ~130 real screenings from the city's two readable cinemas is a defensible answer to
Robert's question 3 (*"Vilka filmer går på bio idag / nuförtiden?"*) — and materially better than the
national list the loosened scope would have settled for.
