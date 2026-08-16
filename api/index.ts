// The page, rendered per request.
//
// Ticket 08: there is no build and no cron. A request that misses the CDN cache
// scrapes hejauppsala (three fetches, ~2.5 s) and renders; everything else is
// served from the edge for an hour, and kept servable for a day after that
// while a new copy is fetched behind it. There are no secrets and no state.

import { fetchEvents } from "../lib/hejauppsala.js";
import { buildEventsView, HORIZON_DAYS } from "../lib/events-view.js";
import { renderPage } from "../lib/page.js";
import { addDays, todayInUppsala } from "../lib/dates.js";

export default async function handler(_req: unknown, res: any) {
  const today = todayInUppsala();
  const horizon = addDays(today, HORIZON_DAYS - 1);

  const { events, fetchedAt, error } = await fetchEvents(new Date(`${today}T12:00:00Z`), horizon);
  const view = buildEventsView(events, today);

  const html = renderPage({ today, view, fetchedAt, error });

  res.setHeader("content-type", "text/html; charset=utf-8");
  // A failed scrape must not be cached for an hour — retry on the next request.
  res.setHeader(
    "cache-control",
    error ? "s-maxage=60" : "s-maxage=3600, stale-while-revalidate=86400",
  );
  res.status(200).send(html);
}
