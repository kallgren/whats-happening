# 11 — Ongoing events, and whether day slices survive real volume

Type: prototype
Status: claimed
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
