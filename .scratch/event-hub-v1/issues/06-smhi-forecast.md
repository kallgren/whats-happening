# 06 — SMHI 7-day forecast for Uppsala, as icons

Type: research
Status: open
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
