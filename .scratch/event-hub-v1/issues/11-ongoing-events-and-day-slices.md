# 11 — Ongoing events, and whether day slices survive real volume

Type: prototype
Status: resolved
Blocked by: 01

## Question

Graduated from the map's fog by [01 — hejauppsala event dates](./01-hejauppsala-event-dates.md),
which made the volumes and the multi-day problem concrete enough to state precisely.

**Where do multi-day, already-running events go, and how many day slices does the page show?**

These are one question, not two, because the same finding creates both: hejauppsala's listing
**clamps an already-running event's displayed start date to today**. A card badged `16 aug – 30 aug`
may have started weeks ago. Taken literally, every ongoing exhibition, every month-long
installation, piles onto day 1 — the first slice becomes a dumping ground and the honest daily
rhythm disappears behind it.

The real numbers, from 01: **~87 events in a 14-day window**, and once the day-1 pile-up is removed,
**1–14 per day, median ~4**, with weekend spikes (both Saturdays hit 10 and 14).

Decide:

1. **Ongoing runs: separate strip or inline?** The research recommends pulling them into their own
   *"pågår just nu"* strip, which fixes the day-1 bulge and the "where does a 3-week exhibition go"
   question in one move. Does that earn its place on the page, or is it a second thing to scan?
2. **If separate, what is the cut?** Every event whose start is clamped? Anything spanning more than
   N days? Note the clamping means we cannot always recover the true start without fetching the
   detail page — decide whether that per-event fetch is worth it or whether "started earlier" is
   enough to know.
3. **How many day slices?** v0 ships horizontal slices above 60rem. Fourteen days of ~90 cards on one
   page may not scan; 7 slices with a link out for the rest may. Pick a number against the real
   distribution, not a guess.
4. **The Saturday spike.** A slice holding 14 cards next to one holding 2 breaks a fixed-height row.
   Does a slice scroll, truncate with a "+9 fler", or does the layout stack?

Settled going in — do not reopen: **day-grouped, never a month grid**; **three sections, never one
merged timeline**; ~14-day horizon as the data window (how much is *displayed* is question 3).

**Deliverable**: the layout decision, applied to the live page against real hejauppsala data.
Per the map's progressive-replacement strategy, this ticket ships working software.

## Answer

**Ongoing runs get their own card, above the day slices. Fourteen slices, each
scrolling internally. No detail-page fetches, ever.**

Decided against a prototype of four variants built on real data (117 posts
scraped 2026-08-16, 84 in Uppsala inside the window). Shipped: the events
section of the live page now renders real hejauppsala data.

### 1. Ongoing runs: separate, and above

Separate. It earns its place — the day-1 pile-up is exactly what the ticket
feared, and nothing else fixes it. Placed **above** the slices as its own card
rather than folded under them: "what is running right now" and "what starts on
which day" are two different questions, and the card boundary is what keeps
them from reading as one list.

### 2. The cut: a run of **7 days or more**

The number barely matters, which is the useful finding. Every long run sitting
on day 1 spanned **14+ days**, so any cut between 3 and 10 lifts the identical
7 events. Seven is chosen because it states a rule — "longer than a week" —
rather than a tuned constant, and it leaves a Fri–Sun gallery opening in the
day slices where it belongs.

Effect on day 1: **23 → 15** (7 lifted, 1 dropped as non-Uppsala). That is
inside the same band as a normal Saturday, so day 1 stops being a special case.

**Per-event detail fetches are not worth it — and not needed.** Fetching the
detail page for all 13 day-1 events that carried no badged end date showed 6
were in fact running (`15 aug – 16 aug`, `1 aug – 16 aug`, `10 jun – 30 aug`).
So the listing genuinely cannot tell you. But five of the six end today or
tomorrow, so filing them under today is what a reader wants anyway. The one
real straggler is a single long run. At 605 KB per detail page this would cost
~14 MB to correct one card. Do not do it.

### 3. Slices: **all 14 days**

Seven was the alternative, and the real distribution does not justify cutting.
After the long runs come out, the fourteen days hold 15, 3, 4, 1, 4, 5, 14, 9,
2, 4, 1, 2, 5, 10 — 75 rows total, and the far end of the horizon is where the
things worth planning for live. Sideways scrolling makes the second week cheap
to reach; dropping it would only send Robert to hejauppsala.

### 4. The spike: the slice scrolls

`max-height: 26rem; overflow-y: auto` on each slice, with the day header
sticky inside it. A Saturday holding 14 against a median of 4 scrolls in its
own column instead of stretching the whole row to its height. Rejected
truncation with "+N fler": a hidden count on the busiest day of the week hides
exactly the thing the page exists to surface.

### What shipped alongside

The server ticket 08 specified but never stood up, since real events cannot
reach the page without it — `api/index.ts` rendering per request on Vercel,
with `lib/hejauppsala.ts` (fetch + parse), `lib/events-view.ts` (this
ticket's decision), `lib/page.ts` and `public/style.css`.

**Zero runtime dependencies**, where 08 anticipated one (`node-html-parser`).
The parse splits on the stable `/kalender/<slug>/` permalinks rather than the
theme's utility classes, exactly as ticket 01 recommended, so a DOM parser buys
nothing. `@vercel/node` and `typescript` are dev-only.

Failure surfaces per 08's requirement: a `hämtat HH:MM` stamp on the section, a
`kunde inte hämta` block carrying the reason, a distinct quiet-week state, and
a guard that treats "40 permalinks but few parsed dates" as a broken theme
rather than an empty calendar. A failed scrape is cached for 60 s, not an hour.

Design is the ticket 07 prototype (`prototype/layout-variants.html`) in its
**Spalter** view. Its `.fake` styling — warm block, orange left bar — now
carries real event rows, since nothing on the page is invented any more. The
three-view picker is dropped; one view, the chosen one.

### Two findings the ticket did not know

- **hejauppsala publishes recurring events as one post per occurrence**, with
  `-2-2-2-2` slugs — 117 posts across 98 distinct titles. This is mostly good:
  the badge dates are honest per occurrence, so a weekly market lands correctly
  on each of its days. But the same title can appear three times down the
  horizon, and a naive dedupe-by-title would delete real occurrences. Dedupe by
  slug only.
- **The Uppsala-only filter costs almost nothing**: 4 of 117 posts are
  Östhammar, Tierp or Enköping, and all four are genuinely elsewhere.
