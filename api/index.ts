// The page, rendered per request.
//
// Ticket 08: there is no build and no cron. A request that misses the CDN cache
// scrapes hejauppsala (three fetches, ~2.5 s) and renders; everything else is
// served from the edge for an hour, and kept servable for a day after that
// while a new copy is fetched behind it. There are no secrets and no state.

import { fetchEvents } from "../lib/hejauppsala.js";
import { fetchForecast } from "../lib/smhi.js";
import { buildEventsView, HORIZON_DAYS } from "../lib/events-view.js";
import { renderPage } from "../lib/page.js";
import { addDays, todayInUppsala } from "../lib/dates.js";

export default async function handler(_req: unknown, res: any) {
  const today = todayInUppsala();
  const horizon = addDays(today, HORIZON_DAYS - 1);

  // Two independent sources, in parallel. Neither can throw — each returns its
  // own error for its own section to render, so one dead source never costs the
  // other. That is the whole failure story from ticket 08.
  const [{ events, fetchedAt, error }, forecast] = await Promise.all([
    fetchEvents(new Date(`${today}T12:00:00Z`), horizon),
    fetchForecast(),
  ]);
  const view = buildEventsView(events, today);

  const html = renderPage({ today, view, forecast, fetchedAt, error });

  res.setHeader("content-type", "text/html; charset=utf-8");
  // A failed source must not sit in the cache for an hour. Events retry fastest,
  // since they are the page. A weather-only failure backs off further: retrying
  // every minute would re-scrape hejauppsala sixty times an hour to fix a strip
  // of icons, which is rude to a source we depend on far more.
  const maxAge = error ? 60 : forecast.error ? 300 : 3600;
  res.setHeader(
    "cache-control",
    maxAge === 3600 ? "s-maxage=3600, stale-while-revalidate=86400" : `s-maxage=${maxAge}`,
  );
  res.status(200).send(html);
}
