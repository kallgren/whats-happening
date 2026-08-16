# 15 — Film posters on "På bio"

Type: task
Status: open
Blocked by: —

## Question

Put posters on the top-5 film rows.

This **reopens a decision [13](./13-films-top-five.md) made**, and does so legitimately, because the
premise it rested on has changed. 13 dropped the prototype's poster placeholder on the grounds that
*"there are no poster images in scope, so the placeholder had nothing to become"* — TMDB being out
of scope. [research/14-images.md](../research/14-images.md) shows posters were reachable all along,
in a page the renderer already fetches. The placeholder now has something to become.

### Settled before this ticket

- **Posters go in the row.** A poster rail is the largest visual upgrade per unit of work available
  on this page, and film posters are the one image type users genuinely navigate by.
- **Pay the one extra fetch for Fyrisbiografen.** Without it the art-house titles are
  *systematically* poster-less — and since [13](./13-films-top-five.md) found those are exactly what
  lives in the `<details>` fold, the gap would correlate perfectly with the fold and read as broken
  rather than as missing data.
- **Hotlink directly**, as in [14](./14-event-thumbnails.md).
- **Rank rule unchanged.** The Fyrisbiografen homepage is a title→poster lookup table only. It
  carries no dates and must **never** become a ranking input — [02](./02-cinema-showtimes.md)
  established that Fyrisbiografen can never be a sole input, and 13's rolling-7-day rule stands.

### The work

- **nfbio** (no new request): match `movie_poster_teaser` images to films by nearest title anchor.
  Distance is 197 characters median, 222 max, so the margin is wide. Prefix root-relative paths with
  `https://www.nfbio.se` and **preserve the `?itok=` signature** — the URL 403s without it.
- **Fyrisbiografen** (one new GET to the homepage, *not* the kalendarium, which has no posters):
  build a title→poster map from `uploads/images/media-posters/NNNN-500x680.jpg`, taking the title
  from the wrapping anchor's `title=`. Filter by the `media-posters/` path — the same `title=`/`img`
  pairing also matches the generic `ticket-calendar.png` rows and the `mtwidgets/` images.
- Join to films using **13's existing normalisation** — lowercase, strip punctuation, collapse
  whitespace — and deliberately no fuzzier, for 13's reason: a bad merge fails invisibly.
- Posters are a uniform **500×680** from Fyrisbiografen; nfbio's teasers are their own size. Impose
  one poster aspect box across both.

### To settle while building

- **The missing-poster case is real here**, unlike [14](./14-event-thumbnails.md). nfbio has 26
  posters across 49 slugs, and a film in neither source's poster set gets nothing. Decide what the
  left column shows then — 13's bare rank number is already a working answer, so the row must
  degrade to it cleanly rather than leaving a hole.
- **What happens to the rank number** once a poster occupies the left column.
- **The `<details>` fold with posters in it.** Ten posters is a lot more page than ten text rows;
  check the fold still feels like a fold.
- **A third failure shape.** 13 handles both-dead / one-dead for *showtimes*; the Fyrisbiografen
  homepage is a new request that can fail **independently of** its kalendarium. Posters must degrade
  without touching the ranking — a dead homepage means no art-house posters, never a broken section.
- Whether the poster column earns its width on a narrow screen at all.
