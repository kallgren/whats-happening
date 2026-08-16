# 13 — Upgrade "På bio" to the real top 5

Type: task
Status: resolved
Blocked by: 02, 11

## Question

Nothing to decide — [02](./02-filmstaden-showtimes.md) settled the sources and
[11](./11-ongoing-events-and-day-slices.md) built the render pipeline. This ticket is the work:
replace the four cinema chips with the five films actually playing most in Uppsala this week,
keeping the chips underneath as link-outs.

Graduated once 11 shipped, for the same reason as [12](./12-weather-strip.md).

From 02, already decided and not to be revisited:

- Two GETs: **`nfbio.se/biograf/uppsala?city=uppsala`** (mainstream — the `?city=` parameter is
  load-bearing) and **`fyrisbiografen.se/kalendarium`** (art-house, thin on Thursdays).
- These give exact per-film screening counts, so **top-5-by-showings survives unchanged**.
- **Rank on the counts, never print them.** They undercount any title also playing at Filmstaden,
  which is closed to us behind a Cloudflare challenge and is out of scope.
- Three link-outs, one per operator.

What this ticket has to work out for itself:

- Title matching across the two sources. The same film at nfbio and Fyrisbiografen must not
  occupy two of the five slots. Expect punctuation, subtitle and casing differences; there are no
  ids to join on.
- What "this week" means as a window, and where it is anchored.
- The row shape. The v0 prototype had a rank number and a mini poster placeholder; there are no
  poster images in scope (TMDB is out of scope), so decide what the left column carries.
- The same failure treatment 11 established — and note there are **two** sources here, so one
  failing must degrade to the other rather than emptying the section.

## Answer

**The third section is live, and every section that will ever hold data now does.** `lib/cinema.ts`
fetches both cinemas in parallel and ranks them; `På bio` carries the real top 5 with the three
operator chips beneath. 02's research held up exactly — 109 nfbio screenings and 25 Fyris ones on a
fresh fetch, and the ranking it predicted came out unchanged.

Five judgement calls the ticket left open, settled while building:

- **Title matching is exact-after-normalising, not fuzzy.** Lowercase, strip punctuation, collapse
  whitespace, compare. That is all that was needed: both sites take titles from the same distributor
  material, so the real differences were punctuation and a stray trailing space ("Moonrise Kingdom ").
  Deliberately went no further — a fuzzy match that merges two different films is a worse failure
  than showing one film twice, and it fails invisibly. It works: *The Odyssey* correctly merges
  16 + 3 into 19, and three more titles merge in the tail.

- **"This week" is a rolling 7 days from today in Uppsala**, matching the weather horizon and never
  hitting an empty edge. Not a calendar week and explicitly not Fyrisbiografen's Friday–Thursday
  playing week — that would go nearly empty every Thursday, which is exactly the failure 02 warned
  about.

- **The left column carries the rank and nothing else.** The prototype had a rank *and* a poster
  placeholder, but there are no poster images in scope, so the placeholder had nothing to become.
  The meta line carries the cinema(s) instead of 02's "12 visningar denna vecka" — the count must
  never be printed, and where to go and see it is the more useful thing anyway. A row showing both
  cinemas is genuinely informative: it means the film is playing across town.

- **Which cinema a row links to is decided from the finished counts**, preferring the one showing it
  more, nfbio on a tie. This was got wrong first: deciding it as screenings arrived let the *last*
  one parsed win, which sent *Det grönaste gräset* and *Hjärtat mitt* to Fyrisbiografen despite nfbio
  matching it. The ranking is now stable under shuffling its input, which is the property that was
  actually missing.

- **Films 6–10 fold into a `<details>`** (added after review). Zero script, zero state, and it
  degrades to an open list if the CSS never loads — the same bargain the rest of the page makes. It
  earns its place because the cut at five is arbitrary at the margin *and* because the tail is where
  the art-house titles live: on the sample day, three of the five behind the fold play at both
  cinemas, versus one of the five above it.

**Failure has three shapes here, not two**, because there are two sources. Both dead → the section
shows the standard `.failed` block. One dead → the ranking still renders from the other, above a
quiet line naming what is missing. Only nfbio gets an emptiness check (a multiplex with no forward
schedule means the load-bearing `?city=uppsala` broke); Fyrisbiografen is legitimately near-empty
on Thursdays, so treating its silence as breakage would cry wolf weekly.

Both parses hang off a **booking URL** rather than theme classes. Fyrisbiografen renders its calendar
twice — once for phones, once for desktop — and the booking URL's `(screen, time, date)` triple is
both the most stable anchor on the page and a natural unique key, so deduping on it solves the double
render for free. A screening too late to book loses that URL and drops out, which is the right answer.

Amends 12's cache tiers: any degraded section, not just weather, now caches for 300 s rather than an
hour — a partly-failed cinema counts, since the ranking is incomplete until both sources are back.

**Chips corrected while here**: v0 linked Slottsbiografen (a rental hall) and Bio Regina (a theatre),
neither of which shows films on a schedule. They are replaced by Nordisk Film Bio, per 02's three
link-outs. The footer now names both scraped cinemas and says plainly that Filmstaden is not included.
