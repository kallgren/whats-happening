# 13 — Upgrade "På bio" to the real top 5

Type: task
Status: open
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
