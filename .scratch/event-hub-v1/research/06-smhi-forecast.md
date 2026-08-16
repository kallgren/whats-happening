# Research: SMHI forecast for Uppsala, as icons

Ticket: [06 — SMHI 7-day forecast for Uppsala, as icons](../issues/06-smhi-forecast.md)
Investigated: 2026-08-16. Every URL, parameter and field below is confirmed against **a live
request made during this investigation** or against **SMHI's own published documentation** at
`opendata.smhi.se`. Each claim says which. Nothing here is from memory.

## Answer in one paragraph

**The API the ticket names (`pmp3g`) is dead** — SMHI retired it on 2026-03-31 and every path on
`opendata-download-metfcst.smhi.se/api/category/pmp3g/...` now returns HTTP 404. The replacement is
**`snow1g` version 1** ("SNOW — Swedish National Operational Weather forecast"), same host, same URL
grammar, and it is *better* than what the ticket hoped for: the horizon is **~10 days, not 7**, and
the old numbered parameters (`t`, `Wsymb2`, …) are now **human-readable names** (`air_temperature`,
`symbol_code`, …). The `Wsymb2` 1–27 weather-symbol scale survives unchanged as `symbol_code`, so
the icon mapping the ticket asked for is still exactly a 27-row table. Licence is **CC BY 4.0**,
needing only a visible "Källa: SMHI" credit.

**This is comfortably under an hour of work — weather does not need to be cut.** One unauthenticated
GET, no key, no token, a ~25-line collapse function and a 27-entry lookup object. See
[Implementation cost](#implementation-cost) for the estimate.

The one real gotcha is not the API but the **time resolution, which degrades across the horizon** —
hourly for ~2.5 days, then 6-hourly, then 12-hourly. That is fine for icons but it means daily
min/max temperature is a genuine daily extreme only for the first few days. Details in
[The resolution gotcha](#the-resolution-gotcha).

---

## 1. The endpoint

### The ticket's endpoint is gone

Verified live. Every path under the old product, including the API root, 404s:

```
curl -sS -o /dev/null -w '%{http_code}\n' \
  "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/17.6389/lat/59.8586/data.json"
```

```
404
```

This is not a host outage — the sibling observations host on the same naming scheme still answers
normally, so the 404 is specific to the retired product:

```
curl -sS "https://opendata-download-metobs.smhi.se/api.json" | head -c 80
```

```
{"key":"metobs","updated":1786864020000,"title":"Meteorologiska observationer från SMHI...
```

`pmp3g` is also **absent from SMHI's current documentation sitemap** (`opendata.smhi.se/sitemap.xml`,
fetched live) — the only `metfcst` products documented are `snow1gv1`, `fwif` and `snow1gv1`'s
siblings. The deprecation date (2026-03-31) and the `snow1g` replacement are corroborated by the
downstream breakage it caused in
[Home Assistant issue #166935](https://github.com/home-assistant/core/issues/166935) and
[MagicMirror issue #4081](https://github.com/MagicMirrorOrg/MagicMirror/issues/4081).

### The working URL for Uppsala

**This is the answer to the ticket's question 1.** Verified live, HTTP 200:

```
https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/17.6389/lat/59.8586/data.json
```

Note the **`lon` comes before `lat`** in the path. No API key, no headers, no auth.

The documented grammar (SMHI docs, *Get Point Forecast*) is:

```
GET /api/category/snow1g/version/1/geotype/point/lon/{longitude}/lat/{latitude}/data.json
```

SMHI's *Geographic Area* page states longitude and latitude may be given "as integer or floating
point with **up to six decimal places**"; more decimals return HTTP 404. Uppsala's `17.6389` /
`59.8586` (4 decimals) is fine. A point outside the domain returns **HTTP 400 — FIELD POINT OUT OF
BOUNDS** per the docs; note that in practice the domain is large — a London coordinate returned 200
with data, so do not rely on the 400 as a validation signal.

The response `geometry` echoes back the **nearest grid point**, not what you asked for. For Uppsala
that is `[17.635448, 59.85689]` — about 200 m away. Fine for our purposes.

### Payload trimming (recommended)

Two documented query parameters cut the payload. Both verified live. Note SMHI's own SYNTAX line has
a typo (it shows `?timeseries=...?parameters=...`); the **second separator must be `&`**:

| Request | Bytes |
|---|---|
| full response | 66,106 |
| `?parameters=air_temperature,symbol_code` | 10,800 |
| `?timeseries=1` | 983 |

So the request to actually ship is:

```
https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/17.6389/lat/59.8586/data.json?parameters=air_temperature,symbol_code
```

That is an **84% payload reduction** and it is the only request the build needs to make.

### Horizon: ~10 days, not 7

**This is the answer to the ticket's "confirm 7 days is actually available".** It is more.

SMHI's *Get Point Forecast* page states verbatim:

> The API response is a forecast for maximum approximately 10 days ahead of the latest current
> forecast. All times in the answer are given in UTC.

Confirmed live against the response fetched 2026-08-16:

| | |
|---|---|
| `createdTime` | `2026-08-16T07:15:53Z` |
| `referenceTime` | `2026-08-16T07:00:00Z` |
| first `timeSeries` entry | `2026-08-16T08:00:00Z` |
| last `timeSeries` entry | `2026-08-26T12:00:00Z` |
| entries | 80 |
| **span** | **10 days, 4 hours** |

The map's weather strip asks for 7 days. **7 days is comfortably inside the horizon** — you could
show 10, but see the resolution caveat before deciding.

---

## 2. Response shape

**This is the answer to the ticket's question 2.** All times UTC (per docs and confirmed by the `Z`
suffix on every value).

```
{
  createdTime    // when this forecast run was produced
  referenceTime  // forecast start time
  geometry       // GeoJSON Point — the nearest GRID point, [lon, lat]
  timeSeries[]   // the data
    time                          // instant this entry is valid for
    intervalParametersStartTime   // start of the window for interval params (precipitation)
    data { ...24 named parameters... }
}
```

Per the docs: all parameters **except precipitation** are instantaneous at `time`; precipitation
parameters are distributed over the interval from `intervalParametersStartTime` to `time`. Since we
only use `air_temperature` and `symbol_code`, both instantaneous, this subtlety does not bite us.

### The two parameters we need

Confirmed live from `/api/category/snow1g/version/1/parameter.json`:

| Name | Unit | Description (SMHI's own wording) | Missing value |
|---|---|---|---|
| `air_temperature` | `Cel` | Air temperature at 2 metres height. | 9999 |
| `symbol_code` | (integer 1–27) | weather symbol | — |

The full parameter set (24 fields, live-confirmed on every one of the 80 entries) also includes
`wind_speed`, `wind_speed_of_gust`, `relative_humidity`, `cloud_area_fraction`,
`probability_of_precipitation`, `thunderstorm_probability`, `precipitation_amount_mean` and
friends. We need none of them for v1.

Two traps documented by SMHI, worth knowing if the parameter list ever widens:
- `precipitation_frozen_part` is **-9**, not 0 or null, when there is no precipitation.
- `missingValue` is **9999**, not null.

### Real example request and response

Request (run 2026-08-16, HTTP 200):

```
curl -sS "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/17.6389/lat/59.8586/data.json?parameters=air_temperature,symbol_code"
```

Real response, verbatim, trimmed to the first 3 of 80 `timeSeries` entries:

```json
{
  "createdTime": "2026-08-16T07:15:53Z",
  "referenceTime": "2026-08-16T07:00:00Z",
  "geometry": {
    "type": "Point",
    "coordinates": [17.635448, 59.85689]
  },
  "timeSeries": [
    {
      "time": "2026-08-16T08:00:00Z",
      "intervalParametersStartTime": "2026-08-16T07:00:00Z",
      "data": { "air_temperature": 15.2, "symbol_code": 18 }
    },
    {
      "time": "2026-08-16T09:00:00Z",
      "intervalParametersStartTime": "2026-08-16T08:00:00Z",
      "data": { "air_temperature": 15.3, "symbol_code": 6 }
    },
    {
      "time": "2026-08-16T10:00:00Z",
      "intervalParametersStartTime": "2026-08-16T09:00:00Z",
      "data": { "air_temperature": 16.0, "symbol_code": 18 }
    }
  ]
}
```

### The resolution gotcha

**The `timeSeries` is not uniformly hourly.** Measured directly from the 80 real entries:

| Step | Count | From |
|---|---|---|
| 1 h | 56 | start (`2026-08-16T08:00Z`) |
| 2 h | 1 | `2026-08-18T16:00Z` |
| 6 h | 13 | `2026-08-18T18:00Z` |
| 12 h | 9 | `2026-08-22T00:00Z` |

Grouped into local (Europe/Stockholm) calendar days, the real coverage was:

| Local day | Samples | Local hours present |
|---|---|---|
| 2026-08-16 (today) | 14 | 10–23 — **partial, starts at the current hour** |
| 2026-08-17 | 24 | 0–23 |
| 2026-08-18 | 20 | 0–18, 20 |
| 2026-08-19 | 4 | 2, 8, 14, 20 |
| 2026-08-20 | 4 | 2, 8, 14, 20 |
| 2026-08-21 | 4 | 2, 8, 14, 20 |
| 2026-08-22 … 08-26 | 2 each | 2, 14 |

Three consequences for the page:

1. **Day 1 is always partial** — it begins at the current hour, so on an afternoon build there is no
   overnight low and possibly no morning at all. Either label day 1 "idag" and accept a truncated
   range, or start the strip at tomorrow.
2. **Daily min/max is a true daily extreme only for roughly days 2–3.** From day 7 on it is the
   min/max of just two spot values. Happily those two land at **02:00 and 14:00 local**, which
   bracket the diurnal cycle rather well — so the numbers stay plausible, they are just coarser than
   they look. Do not advertise them as records.
3. **7 days is the right choice, not 10.** Days 8–10 carry two samples each and low skill. The map
   already specifies 7.

---

## 3. Collapsing hourly data into one icon per day

**This is the answer to the ticket's question 2 (the collapse rule).**

The ticket floats "midday? worst weather of the day?". Tested against the real data, **neither alone
is right**: pure midday misses a rainy morning, and pure worst-of-day makes an almost entirely clear
day render as `6 Overcast` because of one cloudy hour. The recommended rule is a two-tier
compromise — *precipitation is the thing you need to know about, cloud is just texture*:

> **Recommended rule.** Group entries by **Europe/Stockholm** calendar day. Within a day, consider
> only samples in the **daylight window 06:00–18:00 local** (fall back to all of the day's samples if
> that window is empty). Then:
> - if **any** of those samples has `symbol_code >= 7` (fog and everything wetter), the day's icon is
>   the **maximum** such code — the most significant weather;
> - otherwise the day's icon is the **median** of the cloud codes (1–6).
>
> `tmin` / `tmax` are the min and max `air_temperature` over **all** of that day's samples, not just
> the daylight window.

Rationale: within codes 7–27 a higher number is broadly worse, so `max` is a cheap severity proxy.
Within 1–6 the values are a pure cloudiness ramp where the median is representative and the max is
misleading. Two tiers, no severity lookup table, ~25 lines.

Validated against the real 2026-08-16 response — the `all=[...]` column is every raw `symbol_code`
for that local day:

```
2026-08-16 n=14 icon=18 tmin=15.2 tmax=21.5  all=[18,6,18,18,4,4,3,4,2,3,1,3,1,1]
2026-08-17 n=24 icon= 1 tmin=11.2 tmax=21.5  all=[1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2,3,3,4,4,6,4,4,3]
2026-08-18 n=20 icon= 3 tmin=10.5 tmax=19.5  all=[2,3,2,1,1,1,1,1,1,1,1,1,3,4,4,4,4,3,4,1]
2026-08-19 n= 4 icon= 3 tmin=11.8 tmax=19.5  all=[1,1,3,6]
2026-08-20 n= 4 icon= 8 tmin=12.5 tmax=20.7  all=[4,3,8,2]
2026-08-21 n= 4 icon= 1 tmin=13.6 tmax=21.5  all=[1,1,1,3]
2026-08-22 n= 2 icon= 8 tmin=14.0 tmax=18.5  all=[4,8]
```

Reading the results: 08-16 correctly surfaces the morning rain (`18`) rather than the clear evening;
08-17 correctly reads as a clear day (`1`) despite one `6` in the samples, which a naive max would
have picked; 08-20 correctly surfaces the rain shower (`8`) hiding among cloud codes.

The working implementation, which produced exactly the table above:

```js
const TZ = 'Europe/Stockholm';

// SMHI gives UTC; the page is Swedish. Group by LOCAL calendar day.
const localParts = (iso) => {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(
    fmt.formatToParts(new Date(iso)).filter((x) => x.type !== 'literal')
       .map((x) => [x.type, x.value]),
  );
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
};

export const toDailyForecast = (response, days = 7) => {
  const byDay = new Map();
  for (const entry of response.timeSeries) {
    const { day, hour } = localParts(entry.time);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({ hour, ...entry.data });
  }

  return [...byDay].slice(0, days).map(([day, samples]) => {
    const daylight = samples.filter((s) => s.hour >= 6 && s.hour <= 18);
    const window = daylight.length ? daylight : samples;

    const significant = window.filter((s) => s.symbol_code >= 7);
    const symbolCode = significant.length
      ? Math.max(...significant.map((s) => s.symbol_code))
      : window.map((s) => s.symbol_code).sort((a, b) => a - b)[
          Math.floor(window.length / 2)
        ];

    const temps = samples.map((s) => s.air_temperature);
    return {
      day,
      symbolCode,
      tmin: Math.round(Math.min(...temps)),
      tmax: Math.round(Math.max(...temps)),
    };
  });
};
```

`Intl.DateTimeFormat` with an IANA zone handles CEST/CET automatically, so there is no DST branch to
maintain and nothing to break in October.

---

## 4. The `symbol_code` (ex-`Wsymb2`) table

**This is the answer to the ticket's question 3.** The *Meaning* column is quoted **verbatim from
SMHI's own parameters documentation**, which states:

> The weather symbol, `symbol_code`, consists of integers, 1 to 27. Every value represents a
> different kind of weather situation.

The emoji column is my recommendation, not SMHI's — SMHI publishes no emoji mapping.

| Value | Meaning (SMHI) | Emoji | Svenska |
|---:|---|:---:|---|
| 1 | Clear sky | ☀️ | Klart |
| 2 | Nearly clear sky | 🌤️ | Nästan klart |
| 3 | Variable cloudiness | ⛅ | Växlande molnighet |
| 4 | Halfclear sky | ⛅ | Halvklart |
| 5 | Cloudy sky | 🌥️ | Molnigt |
| 6 | Overcast | ☁️ | Mulet |
| 7 | Fog | 🌫️ | Dimma |
| 8 | Light rain showers | 🌦️ | Lätta regnskurar |
| 9 | Moderate rain showers | 🌦️ | Måttliga regnskurar |
| 10 | Heavy rain showers | 🌧️ | Kraftiga regnskurar |
| 11 | Thunderstorm | ⛈️ | Åskskurar |
| 12 | Light sleet showers | 🌨️ | Lätta byar av snöblandat regn |
| 13 | Moderate sleet showers | 🌨️ | Måttliga byar av snöblandat regn |
| 14 | Heavy sleet showers | 🌨️ | Kraftiga byar av snöblandat regn |
| 15 | Light snow showers | 🌨️ | Lätta snöbyar |
| 16 | Moderate snow showers | 🌨️ | Måttliga snöbyar |
| 17 | Heavy snow showers | ❄️ | Kraftiga snöbyar |
| 18 | Light rain | 🌧️ | Lätt regn |
| 19 | Moderate rain | 🌧️ | Måttligt regn |
| 20 | Heavy rain | 🌧️ | Kraftigt regn |
| 21 | Thunder | 🌩️ | Åska |
| 22 | Light sleet | 🌨️ | Lätt snöblandat regn |
| 23 | Moderate sleet | 🌨️ | Måttligt snöblandat regn |
| 24 | Heavy sleet | 🌨️ | Kraftigt snöblandat regn |
| 25 | Light snowfall | 🌨️ | Lätt snöfall |
| 26 | Moderate snowfall | ❄️ | Måttligt snöfall |
| 27 | Heavy snowfall | ❄️ | Kraftigt snöfall |

Ready to paste:

```js
// SMHI symbol_code 1-27. Meanings verbatim from SMHI; emoji chosen by us.
export const WEATHER_EMOJI = {
   1: '☀️',  2: '🌤️',  3: '⛅',  4: '⛅',  5: '🌥️',  6: '☁️',  7: '🌫️',
   8: '🌦️',  9: '🌦️', 10: '🌧️', 11: '⛈️', 12: '🌨️', 13: '🌨️', 14: '🌨️',
  15: '🌨️', 16: '🌨️', 17: '❄️', 18: '🌧️', 19: '🌧️', 20: '🌧️', 21: '🌩️',
  22: '🌨️', 23: '🌨️', 24: '🌨️', 25: '🌨️', 26: '❄️', 27: '❄️',
};

export const WEATHER_LABEL = {
   1: 'Klart', 2: 'Nästan klart', 3: 'Växlande molnighet', 4: 'Halvklart',
   5: 'Molnigt', 6: 'Mulet', 7: 'Dimma',
   8: 'Lätta regnskurar', 9: 'Måttliga regnskurar', 10: 'Kraftiga regnskurar',
  11: 'Åskskurar',
  12: 'Lätta byar av snöblandat regn', 13: 'Måttliga byar av snöblandat regn',
  14: 'Kraftiga byar av snöblandat regn',
  15: 'Lätta snöbyar', 16: 'Måttliga snöbyar', 17: 'Kraftiga snöbyar',
  18: 'Lätt regn', 19: 'Måttligt regn', 20: 'Kraftigt regn', 21: 'Åska',
  22: 'Lätt snöblandat regn', 23: 'Måttligt snöblandat regn',
  24: 'Kraftigt snöblandat regn',
  25: 'Lätt snöfall', 26: 'Måttligt snöfall', 27: 'Kraftigt snöfall',
};
```

Notes on the emoji choices:

- **The cloud ramp is 6 levels but Unicode gives 5 usable faces** (`☀️ 🌤️ ⛅ 🌥️ ☁️`), so **3 and 4
  share ⛅**. They are adjacent shades of "partly cloudy" and the distinction is not worth an SVG.
- **Intensity is not encoded** — light/moderate/heavy rain all render 🌧️. Emoji have no intensity
  axis. `WEATHER_LABEL` carries the full precision; put it in `title`/`aria-label` so the
  distinction is available to anyone who wants it, and the icons stay scannable.
- Showers (🌦️, sun behind rain) vs steady rain (🌧️) *is* preserved, which is the distinction that
  actually matters when deciding whether to go out.
- This satisfies the ticket's "prefer emoji or inline SVG over an icon dependency" — **zero assets,
  zero build pipeline, zero bytes** over the HTML itself.

Accessibility: emoji alone are not accessible. Render as
`<span role="img" aria-label="Lätt regn">🌧️</span>`, using `WEATHER_LABEL`.

---

## 5. Attribution

**This is the answer to the ticket's question 4.** From
[SMHI, *Villkor för användning*](https://www.smhi.se/data/om-smhis-data/villkor-for-anvandning):

- Licence: **Creative Commons Erkännande 4.0 SE (CC BY 4.0)**.
- You may copy, distribute and adapt the data, **including commercially**.
- You **must credit SMHI as the source** ("ange SMHI som källa") and **indicate if you have modified
  the material**.
- Exception, not applicable to us: consequence-based weather **warnings** (`warnings` API) carry
  separate terms — they must not be altered.

Since our daily collapse *is* a derivation of SMHI's hourly data, the honest credit names both the
source and the fact of processing. A single line in the footer or on the weather strip discharges it:

```html
<p class="attribution">
  Väderdata från <a href="https://www.smhi.se/">SMHI</a>
  (<a href="https://creativecommons.org/licenses/by/4.0/deed.sv">CC BY 4.0</a>),
  bearbetad till dygnsvärden.
</p>
```

No registration, no key, no rate-limit terms encountered.

---

## Implementation cost

**Well under an hour — weather stays in v1.** The ticket's cut-if-over-an-hour clause is not
triggered.

| Piece | Cost |
|---|---|
| Fetch (one unauthenticated GET, no key) | ~5 min |
| `toDailyForecast` collapse | ~15 min (written and validated above — paste it) |
| `WEATHER_EMOJI` / `WEATHER_LABEL` tables | ~5 min (paste from above) |
| Render into the existing v0 weather strip | ~15 min |
| Attribution line | ~2 min |

Everything that would normally *be* the hour — finding the endpoint, discovering `pmp3g` is dead,
deriving the collapse rule, transcribing 27 symbol meanings — is already done in this document.

Fits the map's standing constraints cleanly: no runtime, no database, no auth, no expiring tokens; a
build-time fetch rendering to static HTML; failure surfaces as a failed GitHub Action.

## Risks

- **The `pmp3g` retirement is exactly the "sources breaking" failure the map fears**, and it happened
  ~5 months ago. `snow1g` is `version/1` of a freshly-launched product, so its shape may still move.
  Mitigation is cheap: the build fetches at build time, so a break is a red Action, not a broken
  page — but only if the fetch **throws on a non-200 rather than rendering an empty strip**.
- **`symbol_code` values 7 and 9–17, 19–27 were not observed live** (the 2026-08-16 response
  contained only `1, 2, 3, 4, 6, 8, 18` — it was an August week). The 1–27 range is SMHI's
  documented contract, not something I could exercise end to end. The lookup tables are complete, so
  an unobserved value renders correctly; still, **default the lookup** (`WEATHER_EMOJI[code] ?? '·'`)
  rather than emitting `undefined`.
- **Empty vs broken**, the open question the map inherits to whichever ticket lands data first: a
  weather strip has a natural tell — if `timeSeries` is empty or the fetch fails, fail the build.
  Weather is never legitimately "a quiet week", unlike events, so there is no ambiguity to resolve
  here. This ticket does not settle the question for the event sections.

## Sources

Live requests, all made 2026-08-16 (see command lines quoted inline):

- `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/17.6389/lat/59.8586/data.json` — 200
- `.../snow1g/version/1/parameter.json` — 200, parameter names/units/missing values
- `.../snow1g/version/1/times.json` — 200, 80 timestamps, `2026-08-16T08:00Z` → `2026-08-26T12:00Z`
- `.../pmp3g/version/2/...` — 404 (retired)
- `https://opendata-download-metobs.smhi.se/api.json` — 200 (control, proves the 404 is product-specific)
- `https://opendata.smhi.se/sitemap.xml` — 200, `pmp3g` absent

SMHI published documentation (`opendata.smhi.se`, Docusaurus; content extracted from the site's own
page bundles since the site is client-rendered):

- [Get Point Forecast](https://opendata.smhi.se/metfcst/snow1gv1/get_point_forecast) — URL grammar, ~10-day horizon, UTC, response objects, `timeseries`/`parameters` query params
- [Parameters](https://opendata.smhi.se/metfcst/snow1gv1/parameters) — the `symbol_code` 1–27 table quoted above
- [Geographic Area](https://opendata.smhi.se/metfcst/snow1gv1/geographic_area) — six decimal places, HTTP 400 out of bounds
- [Times](https://opendata.smhi.se/metfcst/snow1gv1/times) / [Created Time](https://opendata.smhi.se/metfcst/snow1gv1/created_time)
- [Villkor för användning](https://www.smhi.se/data/om-smhis-data/villkor-for-anvandning) — CC BY 4.0

Corroboration of the retirement date only (not relied on for any API fact):

- [home-assistant/core#166935](https://github.com/home-assistant/core/issues/166935)
- [MagicMirrorOrg/MagicMirror#4081](https://github.com/MagicMirrorOrg/MagicMirror/issues/4081)
