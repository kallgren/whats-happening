# 06 — SMHI 7-day forecast for Uppsala, as icons

Type: research
Status: resolved
Blocked by: —

## Question

Which SMHI endpoint gives a **7-day forecast for Uppsala**, and how do we render it as icons?

[SMHI Open Data](https://opendata.smhi.se/) is free and unauthenticated. The relevant product is
the meteorological forecast API (`pmp3g`), which is a **point forecast** — it takes a lat/lon, not
a place name. Uppsala is roughly `59.8586, 17.6389`.

Determine:

1. The exact request URL for a point forecast at Uppsala's coordinates, and how far ahead it
   reaches. Confirm 7 days is actually available (SMHI's high-resolution product may be shorter —
   if so, say what the real horizon is rather than assuming).
2. The response shape: it returns hourly `timeSeries` entries with numbered parameters. Work out
   how to collapse hourly data into **one representative icon per day**. Midday? Worst weather of
   the day? Daily min/max temperature alongside?
3. The `Wsymb2` weather-symbol parameter: its full 1–27 value range and a mapping to icons or
   emoji. Prefer emoji or inline SVG over an icon dependency — a static page with no build-time
   asset pipeline is the goal.
4. Any attribution requirement SMHI imposes on reuse.

**Deliverable**: a working URL, a documented `Wsymb2` → icon mapping table, and a recommended
daily-collapse rule.

This is the smallest and most self-contained ticket on the map. Weather is decoration, not
load-bearing — if it turns out to be more than an hour of work, say so and it gets cut from v1.

## Answer

**Full findings, including the paste-ready 1–27 symbol table and a validated collapse
implementation: [research/06-smhi-forecast.md](../research/06-smhi-forecast.md).**

**This ticket's premise was out of date: `pmp3g` is dead.** SMHI retired it on 2026-03-31 and every
path under it now 404s (independently re-verified by the parent session — `pmp3g/version/2` → 404,
same host, same grammar). The replacement is **`snow1g` version 1**.

1. **Working URL** (verified 200, no auth — note `lon` before `lat`):

   ```
   https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/17.6389/lat/59.8586/data.json
   ```

   Adding `?parameters=air_temperature,symbol_code` cuts the payload from 66 KB to 10.8 KB.

2. **Horizon is ~10 days, not 7.** The live response spanned 10 days 4 hours over 80 entries, so a
   7-day display sits safely inside it. But **time resolution degrades**: hourly for ~2.5 days, then
   6-hourly, then 12-hourly. Day 1 is always partial (it starts at the current hour), and from day 7
   on a daily min/max is computed from just two samples. Those two land at 02:00 and 14:00 local, so
   they do bracket the diurnal cycle — but it argues for showing **7 days, not 10**.

3. **Response shape**: `timeSeries[]` of `{ time, intervalParametersStartTime, data: {...} }`, where
   `data` is a **flat object of human-readable names** — the old numbered parameter arrays (`t`,
   `Wsymb2`) are gone. The symbol is `symbol_code`; its 1–27 semantics survived the migration
   unchanged, so existing `Wsymb2` mappings still apply.

4. **Daily collapse rule** (both naive options were tested against real data and both fail — pure
   midday misses a rainy morning, pure worst-of-day renders an almost-clear day as "Overcast"):
   group by Europe/Stockholm day, consider samples 06:00–18:00 local; **if any sample has
   `symbol_code >= 7`, take the max; otherwise take the median** of the cloud codes. Min/max
   temperature over the whole day.

5. **Attribution**: CC BY 4.0, requiring both a credit to SMHI *and* an indication that the data was
   modified — the daily collapse is a modification, so the credit line must say so.

**Cost: well under an hour. Weather is not cut from v1.**

**One thing for [08 — Build pipeline](./08-build-pipeline.md)**: `pmp3g` dying under us is exactly
the "sources breaking" failure this map fears, and `snow1g` is version 1 of a fresh product. The
build must **throw on a non-200** rather than render an empty weather strip.
