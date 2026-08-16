# Research: images for events and films

Verified live on **2026-08-16** against all three sources. Feeds
[14 — Event thumbnails](../issues/14-event-thumbnails.md) and
[15 — Film posters](../issues/15-film-posters.md).

**Headline: images are available for every surface that needs them, and almost all of them are free
— they are already inside HTML the renderer fetches today.**

## 1. Events — hejauppsala.com

The `/kalender/` listing already carries a per-card image. No detail-page fetches, no second source,
**no extra requests at all**.

The markup, per card, is the `c-lazy-img` figure that
[01](./01-hejauppsala-event-dates.md) already recorded but had no use for:

```html
<div class="... js-lazy-img__img"
     data-xl-src="https://hejauppsala.com/wp-content/uploads/2026/05/gruppviking02-500x303.webp"></div>
```

Measured on page 1 (806,997 bytes, the same fetch the renderer already makes):

| Fact | Value |
| --- | --- |
| Cards on the page | 40 |
| Cards carrying `data-xl-src` | **40 — 100%** |
| `data-xl-src` on the page in total | 49 (9 are site chrome outside any card) |
| Distinct image URLs | 47 |
| URLs that look like stock filler (`adobestock` etc.) | 9 of 49 |

Notes that matter for the build:

- **Coverage is total.** Not one card lacked an image, so there is no "missing image" layout case to
  design for on the events side — only a *broken-at-request-time* case.
- **The images are already thumbnail-scale.** WordPress serves the resized derivative, not the
  original: `500x303`, `500x336`, `500x388`, `388x388`, `500x281`, `500x333`. A handful lack a size
  suffix and are full-size.
- **Aspect ratios are wildly inconsistent** — 1.65:1, 1.49:1, 1.29:1, 1.78:1 and a 1:1 all appear in
  the first eight. Any row layout must impose a fixed aspect box and crop; nothing here can be
  trusted to be uniform.
- **Most images are real event photography**, not filler — roughly 9 of 49 URLs look like stock, and
  some of those are chrome rather than cards.
- The attribute is `data-xl-src` because the theme lazy-loads client-side. We are server-rendering,
  so we read the attribute and emit a normal `src`. `data-lg/md/sm/xs-src` also appear but only on
  chrome, never reliably per card — **use `data-xl-src` only**.

**Parsing**: the URL sits inside the card region the existing `cards()` splitter in
`lib/hejauppsala.ts` already computes, between one `/kalender/<slug>/` permalink and the next. This
inherits 01's deliberate property of not depending on theme utility classes.

## 2. Films, mainstream — nfbio.se

The Uppsala listing the renderer **already fetches** carries posters inline:

```html
<img src="/sites/nfbio.se/files/styles/movie_poster_teaser/public/media-images/2026-08/gmnt-cd2cd98e7e-22042-vst-6a75c7b7bd52d.jpeg?itok=kqRyaXzp">
```

Measured on `https://www.nfbio.se/biograf/uppsala?city=uppsala` (601,856 bytes):

| Fact | Value |
| --- | --- |
| Distinct film slugs on the page | 49 |
| `movie_poster_teaser` images | 26 |
| Films successfully matched to a poster | **26** |
| Character distance, poster → title anchor (median / max) | **197 / 222** |

- **Every one of the top five ranked films has a poster** — Spider-Man: Brand New Day, The Odyssey,
  Paw Patrol: Dinosaurie-filmen, Minioner & Monster, The End of Oak Street.
- The 49 slugs exceed the 26 posters because the page also links films with no current screenings;
  the poster block corresponds to what is actually showing.
- **Attribution is safe.** The distance from poster to its film's title anchor is extremely tight and
  consistent (197 median, 222 max), so nearest-anchor matching has a wide margin and no ambiguity.
  This is a much stronger signal than a heuristic usually gets.
- Paths are root-relative — prefix `https://www.nfbio.se`. The `?itok=` is a Drupal image-style
  signature and **must be preserved**; the URL 403s without it.

## 3. Films, art-house — fyrisbiografen.se

**The kalendarium has no posters.** Confirmed on
`https://www.fyrisbiografen.se/kalendarium` (55,645 bytes): every image is either the site logo or a
single generic `images/ticket-calendar.png` repeated per screening row. Nothing film-specific.

**The homepage does.** `https://www.fyrisbiografen.se/` serves proper posters at a clean, uniform
path, with the film title in an adjacent `title=` attribute on the wrapping anchor:

```html
<a title="Stand By Me" ...><img src="https://fyrisbiografen.se/uploads/images/media-posters/1838-500x680.jpg">
```

- Uniform **500×680** portrait posters — a true poster aspect (1:1.36), unlike the events.
- 49 non-system upload images on the page; the `media-posters/` subset is the reliable one.
  `uploads/images/mtwidgets/` also appears and is **not** a poster — exclude by path.
- Beware: the `title=`/`<img>` pairing also matches the generic `ticket-calendar.png` rows. Filter to
  `media-posters/` and the noise disappears.
- This is the **one extra request** the whole effort costs. It is a now-showing list with **no
  dates** — usable only as a title→poster lookup table, **never as a ranking input**, which would
  violate [02](./02-cinema-showtimes.md)'s finding that Fyrisbiografen must never be a sole input.

## 4. Considered and rejected

- **bio.se `POST /api/films/on-cinemas-now`** — genuinely works and returns `poster_url`
  (16 films for Uppsala's coordinates on the sample date, 15 of them with a poster). Rejected for the
  same coverage reason [02](./02-cinema-showtimes.md) rejected it as a ranking source: the only
  Uppsala cinema it knows is Fyrisbiografen, and everything else in the payload is 27–58 km away. It
  would be a *third* source and a POST, to obtain posters the Fyrisbiografen homepage gives us
  directly in a GET. Keep as a fallback only if the homepage layout breaks.
- **TMDB for posters.** Out of scope on the map for ratings, and the same objection applies harder
  here: a whole extra integration, an API key — which would end v1's secretless property — and title
  matching against a global database, to replace posters two sources hand us for free.
- **nfbio per-film detail pages.** They carry a larger poster, but at one fetch per film that is 5–10
  extra requests to improve images we already have at teaser resolution.

## 5. Hotlinking

Both sources serve pre-scaled derivatives, so hotlinking costs us nothing to host and nothing to
build. Neither returned a `Referer`-based block during these checks. The exposure is that a future
hotlink protection, or a moved file, degrades an image to its `alt` text — one card, never the page,
consistent with [08](../issues/08-build-pipeline.md)'s failure principle.
