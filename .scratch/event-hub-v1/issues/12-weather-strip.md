# 12 — Upgrade the weather strip to real SMHI data

Type: task
Status: resolved
Blocked by: 06, 11

## Question

Nothing to decide — [06](./06-smhi-forecast.md) settled every question and
[11](./11-ongoing-events-and-day-slices.md) built the render pipeline this needs. This ticket is
the work: replace the seven shimmering skeletons in the page header with the real forecast.

Graduated once 11 shipped. Before that there was no server to fetch from, so it could not be
stated as a task.

From 06, already decided and not to be revisited:

- Product is **`snow1g` version 1** (`pmp3g` is retired and 404s since 2026-03-31). No auth.
- One request, ~10.8 KB with `?parameters=air_temperature,symbol_code`.
- Horizon is ~10 days but degrades to 12-hourly, so **display 7**.
- `symbol_code` keeps `Wsymb2`'s 1–27 semantics.
- Collapse a day with: **06:00–18:00 local, max symbol if any `>= 7`, else median**.
- **CC BY 4.0 — the credit must state the data was modified.** This is a licence obligation,
  not a nicety, and the page currently carries no credit at all.

What this ticket has to work out for itself:

- Which of the 27 symbols map to which glyphs. The v0 prototype used emoji
  (`☀️ 🌤 🌧 ⛅️`); whether that survives on the real page is a judgement call to make while
  building, not a decision to escalate.
- Where the CC BY credit goes. There is no footer on the page today.
- The failure mode, following the pattern 11 established: a per-section `hämtat HH:MM` stamp,
  an explicit `kunde inte hämta`, and one dead source never costing the others. The weather is
  in the page header, so it needs a shape that degrades without collapsing the header.
- `.day .dw` — the right-hand slot in each day-slice header — is reserved for that day's weather
  and currently renders empty. Filling it is part of this ticket. Note that the strip shows 7
  days and the slices show 14, so half the slices will have no forecast; decide what they show.

## Answer

**Real SMHI data is on the page.** The seven shimmering skeletons in the header are gone, replaced
by seven live cells; the `.day .dw` slot is filled for the first week of slices; the page has a
footer carrying the CC BY credit. `lib/smhi.ts` is the whole integration — one unauthenticated GET,
no key, no state, and **still zero runtime dependencies** on the project.

Verified against a live SMHI response fetched while building (2026-08-16, HTTP 200, 82 entries,
11 KB). 06's research held up in every particular: `snow1g` is up, `?parameters=` still trims 84%
of the payload, and the two-tier collapse produced a plausible week — `⛅ 16–22`, `☀️ 11–22`,
`☀️ 10–20`, `⛅ 13–20`, `⛅ 13–21`, `☀️ 14–22`, `🌦️ 14–19`, with the shower on day 7 correctly
surfaced out from under the cloud codes. Full page render: 117 events, 7 forecast days, no errors,
35 KB of HTML. `tsc --noEmit` clean.

### The four judgement calls the ticket left open

**Emoji survive.** They cost zero assets and zero bytes over the HTML, which no icon font or SVG
sprite can match, and they are the vocabulary people already read weather in. The two losses 06
predicted are real and both are recovered in text rather than in pixels: codes 3 and 4 share ⛅
because Unicode has five cloud faces for a six-step ramp, and light/moderate/heavy rain all render
🌧️ because emoji have no intensity axis. Every glyph therefore carries its Swedish label as an
`aria-label`, and each cell carries the full reading — `title="Halvklart, 16–22°"` — so the
precision the icon drops is one hover or one screen reader away. What emoji *do* keep is showers
(🌦️) against steady rain (🌧️), which is the distinction that actually decides whether you go out.

**The credit goes in a new page footer**, not on the strip. It has to name SMHI *and* say the data
was modified — collapsing hourly samples to one icon a day is a derivation — so the line reads
"Väderdata från SMHI (CC BY 4.0), bearbetad till dygnsvärden." Since a footer had to exist anyway,
hejauppsala is credited beside it.

**No per-section freshness stamp.** The ticket asked for one following 11's pattern, and it turns
out not to be needed: there is one render per request, so both fetches are the same instant and the
header's existing `uppdaterad HH:MM` is already honest for both. Adding a second identical clock
would suggest a difference that does not exist. The rest of 11's pattern does apply — a dead SMHI
prints `Väder kunde inte hämtas` plus the reason, in one quiet line where seven cells were, with
the link out to SMHI still intact so the answer is one tap away. The header does not collapse and
the events are untouched. The two fetches run in `Promise.all` and neither can throw.

**Slices past day 7 show nothing.** The strip reaches 7 days (06 chose 7 over the API's 10 because
resolution degrades to two spot readings) and the slices reach 14, so half of them have no forecast.
They render an empty slot rather than a dash or a placeholder glyph: a forecast that visibly stops
is legible, whereas a row of dashes reads as broken.

### One thing changed outside the ticket

**Cache TTL is now three-tiered**, amending 08's two. A failed source still must not sit in the
cache for an hour, but "any error → 60 s" would mean re-scraping hejauppsala sixty times an hour to
fix a strip of icons — rude to the source this page depends on far more. So: events failed → 60 s,
weather-only failed → 300 s, all well → the original hour with a day of stale-while-revalidate.

Also deleted: the `.sk` skeleton CSS and its shimmer keyframes, plus the `--skel` variables. Weather
was the last placeholder on the page, so there is nothing left to shimmer.

Files: `lib/smhi.ts` (new), `lib/page.ts`, `lib/dates.ts` (`weekdayShort`), `api/index.ts`,
`public/style.css`.
