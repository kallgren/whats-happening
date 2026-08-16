# 12 — Upgrade the weather strip to real SMHI data

Type: task
Status: open
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
