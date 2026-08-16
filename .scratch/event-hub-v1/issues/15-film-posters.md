# 15 — Film posters on "På bio"

Type: task
Status: resolved
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
  carries no dates and must **never** become a ranking input — [02](./02-filmstaden-showtimes.md)
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

## Answer

**The top 5 have posters, and so do films 6–10 behind the fold.** Verified against a live render on
2026-08-16: 10 of 10 rendered films carried a picture, all ten hotlinks returned 200 with a foreign
`Referer`, and the section's failure behaviour is unchanged.

### What was built

- `parseNfbioPosters` — no new request, off the document `parseNfbio` already has.
- `parseFyrisPosters` + `fetchFyrisPosters` — the one new GET, to the **homepage** (74 KB).
- `Film.poster`, joined inside `rank()` on the key 13 already normalises titles with.
- A 3rem, 2:3 poster between the rank and the title in `.frow`.

### What the research got right, and the one thing it got wrong

01, 02, 06 and 14's research all held up on contact; this one **did not, in one particular**, and it
was the particular that could have shipped a silently wrong page.

**The Fyrisbiografen pairing was off by one.** The research prescribed taking the title from "the
wrapping anchor's `title=`". But the site's *Veckans program* promo is an **untitled** anchor around
an `<img title="Veckans program">` — so a rule that accepts any nearby `title=` adopts the promo as a
film, hands it the first poster, and **shifts every subsequent film onto the previous film's
picture**. The first implementation did exactly that: eight posters parsed, eight films matched,
nothing thrown, and every art-house poster wrong. It was caught only by printing the parsed keys and
noticing *Stand By Me* was absent from a map that had eight entries.

Two guards now make the pairing structural rather than positional, and either alone would have
caught it: the title must be on the **`<a>` tag itself**, and the image must be **inside that
anchor** — no `</a>` may fall between them. This is the same class of failure 13 refused fuzzy title
matching to avoid, arriving from a direction 13 did not anticipate: not a bad merge, but a
**bad offset**, which is worse, because a bad merge shows one film twice and an offset shows every
film wrong while looking perfectly normal.

**nfbio, by contrast, was better than advertised.** The research proposed nearest-title-anchor at
197/222 characters; measured, it is the **next** title anchor at 439–517, with the previous film's
title ~19,000 characters back — a 40× separation, so the match is unambiguous with room to spare.
A 2,000-character window bounds it, which turns a future layout change into *missing* posters rather
than *wrong* ones.

### The `alt` trap, rejected

The nfbio poster `<img>` carries `alt="Spider-Man: Brand New Day"` — the film title, on all 26
posters, and vastly simpler than any anchor walk. **It is not the join key**, because it is the
*media asset's* name rather than the film's, and in 4 of 26 they diverge: `HP del 5-8` for
*Harry Potter Maraton, Film 5-8*, `Quiz` for *Filmquiz på Bio*, `Hunger games maraton poster` for
*Hunger Games Maraton*, and two with a leading space. A key that is right 85% of the time and
silently wrong the rest is precisely what this section has twice now refused.

### The four questions the ticket left to settle

- **Missing posters degrade to an empty grey box, not to a bare row.** The case is real, unlike on
  events: **6 of 23** films in the sample week had no poster at either source. All six were
  Fyrisbiografen-only and ranked 16–23, i.e. below the fold and never rendered — but that is this
  week's luck, not a property. Dropping the box would start one row's title 3rem out of line with
  its neighbours, which reads as broken rather than as sparse; the box is what `.thumb` already does
  for the same reason, and it doubles as the hotlink-404 story since the geometry is fixed either way.
- **The rank stays a quiet number in its own column.** A badge laid over the artwork was considered
  and dropped: it needs a solid high-contrast chip to stay legible against arbitrary poster art, and
  loud furniture over the images is the opposite of what asking for images meant. 13's "big and pale,
  orders the list without competing with the titles" now has to not compete with the posters either,
  and the cheapest way to honour that is to leave it alone.
- **The fold still folds.** Closed, it shows five posters; open, it adds five more. It is a much
  bigger reveal than ten text rows were, but a `<details>` that reveals a lot is still a `<details>`,
  and the section's claim above the fold is unchanged.
- **The poster column costs nothing on a narrow screen.** The concern was backwards: below 60rem the
  aside stops being a 20rem sidebar and goes full width, so the title has *more* room with a poster
  than it had in the sidebar without one. No media query was needed. The 20rem desktop sidebar is the
  binding constraint, and it is what caps the poster at 3rem.

### A third failure shape, deliberately kept off the page

The Fyrisbiografen homepage can die independently of its kalendarium, so `fetchFyrisPosters` catches
to an empty map and — the load-bearing part — **never reaches `cinema.failed`**. That flag prints
*"listan är ofullständig"* and shortens the cache to 300 s, and both would be lies: the ranking is
complete and correct without a single poster. Missing posters report themselves by being missing.
This is a deliberate narrowing of 13's "any degraded section holds for 300 s" — posters are not a
section and a missing one is not a wrong answer.

### The honest measurement on the extra GET

**On the sample day it contributed nothing to the rendered ten** — all 10 posters came from nfbio,
and Fyrisbiografen's eight supplied ranks 11, 13, 15 and 23 only. It is kept anyway, because the
alternative is a gap that correlates perfectly with art-house: the multiplex dominates the ranking by
screening count, so Fyrisbiografen-only titles rise into 6–10 exactly on the thin weeks when nfbio
has few releases — the weeks the fold is most worth opening. One 74 KB GET beside ~660 KB already in
flight, on a cache miss only, is cheap insurance. Worth re-checking against real use rather than
assuming: if the fold never fills with art-house, this fetch is the first thing to cut.
