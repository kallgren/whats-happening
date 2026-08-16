// Weather from SMHI.
//
// One unauthenticated GET, no key, no token — ticket 06 established the whole
// contract. Two things from that research are load-bearing and easy to lose:
//
//   1. The product is `snow1g`. The `pmp3g` endpoint every tutorial on the
//      internet still names was retired 2026-03-31 and 404s.
//   2. `?parameters=` is not an optimisation, it is 84% of the payload
//      (66 KB → 11 KB). We use two of the twenty-four fields.
//
// SMHI data is CC BY 4.0. Collapsing hourly samples into one icon per day is a
// modification, so the footer credit has to say so — that is a licence
// obligation, not a courtesy. See renderPage.

import { TZ } from "./dates.js";

const URL_ =
  "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1" +
  "/geotype/point/lon/17.6389/lat/59.8586/data.json" +
  "?parameters=air_temperature,symbol_code";

/** SMHI's sentinel for a missing reading. Not null, not zero. */
const MISSING = 9999;

/**
 * Seven, not the ten the API offers. Resolution degrades across the horizon —
 * hourly for ~2.5 days, then 6-hourly, then 12-hourly — so days 8–10 rest on
 * two spot readings each and carry little skill.
 */
export const FORECAST_DAYS = 7;

export type DayForecast = {
  /** ISO date, in Uppsala's calendar. */
  date: string;
  symbolCode: number;
  tmin: number;
  tmax: number;
};

export type Forecast = {
  days: DayForecast[];
  /** Set when SMHI could not be read; the strip renders a failure instead. */
  error: string | null;
};

type Sample = { hour: number; symbol_code: number; air_temperature: number };

/** SMHI answers in UTC; the page is Swedish. Group by *local* calendar day. */
function localParts(iso: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  })
    .formatToParts(new Date(iso))
    .filter((p) => p.type !== "literal");
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  // sv-SE renders midnight as hour 24; % 24 folds it back onto the day it
  // belongs to, which formatToParts has already got right.
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}

/**
 * One symbol for a whole day, in two tiers — because neither obvious rule works
 * alone. Midday-only misses a rainy morning; worst-of-day renders an almost
 * entirely clear day as "mulet" because of a single cloudy hour.
 *
 * So: precipitation is the thing you need to know about, cloud is only texture.
 * Codes 7+ (fog and everything wetter) are significant, and the worst of them
 * wins, since within 7–27 a higher number is broadly worse. Codes 1–6 are a
 * pure cloudiness ramp, where the median is representative and the max lies.
 *
 * Validated in ticket 06 against real data: a day of [1,1,1,1,1,1,1,1,1,1,2,2,
 * 1,1,1,2,3,3,4,4,6,4,4,3] reads as clear, and a day of [4,3,8,2] correctly
 * surfaces the shower hiding among the cloud.
 */
function collapse(samples: Sample[]): number {
  // Daylight only — nobody is deciding their day on the 03:00 weather. Falls
  // back to the whole day, which matters for day 1 after 18:00 local.
  const daylight = samples.filter((s) => s.hour >= 6 && s.hour <= 18);
  const window = daylight.length ? daylight : samples;

  const significant = window.filter((s) => s.symbol_code >= 7).map((s) => s.symbol_code);
  if (significant.length) return Math.max(...significant);

  const cloud = window.map((s) => s.symbol_code).sort((a, b) => a - b);
  return cloud[Math.floor(cloud.length / 2)];
}

type Response = {
  timeSeries?: { time: string; data: Record<string, number> }[];
};

export function toDailyForecast(res: Response, days = FORECAST_DAYS): DayForecast[] {
  const byDay = new Map<string, Sample[]>();

  for (const entry of res.timeSeries ?? []) {
    const { date, hour } = localParts(entry.time);
    const symbol_code = entry.data?.symbol_code;
    const air_temperature = entry.data?.air_temperature;
    if (typeof symbol_code !== "number" || typeof air_temperature !== "number") continue;
    if (air_temperature === MISSING) continue;

    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date)!.push({ hour, symbol_code, air_temperature });
  }

  return [...byDay]
    .slice(0, days)
    .map(([date, samples]) => {
      // Temperature spans the whole day, not just the daylight window — the
      // overnight low is half of what "how cold is it" means.
      const temps = samples.map((s) => s.air_temperature);
      return {
        date,
        symbolCode: collapse(samples),
        tmin: Math.round(Math.min(...temps)),
        tmax: Math.round(Math.max(...temps)),
      };
    });
}

export async function fetchForecast(): Promise<Forecast> {
  try {
    const res = await fetch(URL_, { headers: { "user-agent": "whats-happening (personal hub)" } });
    if (!res.ok) throw new Error(`SMHI svarade ${res.status}`);

    const days = toDailyForecast((await res.json()) as Response);

    // Weather has a tell events do not: there is no such thing as a legitimately
    // quiet week. An empty strip means broken, so say broken.
    if (!days.length) throw new Error("SMHI svarade utan prognosdata");

    return { days, error: null };
  } catch (err) {
    return { days: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// SMHI's symbol_code, 1–27. The meanings are SMHI's own; the emoji are ours —
// SMHI publishes no icon set, and emoji cost zero assets and zero bytes over
// the HTML, which no icon font or SVG sprite can match.
//
// Two deliberate losses. The cloud ramp has six steps and Unicode has five
// usable faces, so 3 and 4 (växlande molnighet / halvklart) share one glyph.
// And emoji have no intensity axis, so light, moderate and heavy rain all read
// 🌧️. Both are recoverable from LABEL, which rides in the tooltip and the
// aria-label. What emoji *do* preserve is showers (🌦️) against steady rain
// (🌧️) — the distinction that actually decides whether you go out.
const EMOJI: Record<number, string> = {
  1: "☀️", 2: "🌤️", 3: "⛅", 4: "⛅", 5: "🌥️", 6: "☁️", 7: "🌫️",
  8: "🌦️", 9: "🌦️", 10: "🌧️", 11: "⛈️", 12: "🌨️", 13: "🌨️", 14: "🌨️",
  15: "🌨️", 16: "🌨️", 17: "❄️", 18: "🌧️", 19: "🌧️", 20: "🌧️", 21: "🌩️",
  22: "🌨️", 23: "🌨️", 24: "🌨️", 25: "🌨️", 26: "❄️", 27: "❄️",
};

const LABEL: Record<number, string> = {
  1: "Klart", 2: "Nästan klart", 3: "Växlande molnighet", 4: "Halvklart",
  5: "Molnigt", 6: "Mulet", 7: "Dimma",
  8: "Lätta regnskurar", 9: "Måttliga regnskurar", 10: "Kraftiga regnskurar",
  11: "Åskskurar",
  12: "Lätta byar av snöblandat regn", 13: "Måttliga byar av snöblandat regn",
  14: "Kraftiga byar av snöblandat regn",
  15: "Lätta snöbyar", 16: "Måttliga snöbyar", 17: "Kraftiga snöbyar",
  18: "Lätt regn", 19: "Måttligt regn", 20: "Kraftigt regn", 21: "Åska",
  22: "Lätt snöblandat regn", 23: "Måttligt snöblandat regn",
  24: "Kraftigt snöblandat regn",
  25: "Lätt snöfall", 26: "Måttligt snöfall", 27: "Kraftigt snöfall",
};

// Ticket 06 saw only 1, 2, 3, 4, 6, 8 and 18 in the wild — it was an August
// week. The other twenty are SMHI's documented contract, not something anyone
// has exercised end to end, so an unknown code must degrade to a dot rather
// than print "undefined".
export const weatherEmoji = (code: number): string => EMOJI[code] ?? "·";
export const weatherLabel = (code: number): string => LABEL[code] ?? "Okänt väder";
