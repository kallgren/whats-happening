// The page, rendered per request.
//
// Ticket 08: there is no build and no cron. A request that misses the CDN cache
// scrapes hejauppsala (three fetches, ~2.5 s) and renders; everything else is
// served from the edge for an hour, and kept servable for a day after that
// while a new copy is fetched behind it. There are no secrets and no state.

import { fetchEvents } from "../lib/hejauppsala.js";
import { fetchForecast } from "../lib/smhi.js";
import { fetchFilms } from "../lib/cinema.js";
import { buildEventsView, HORIZON_DAYS } from "../lib/events-view.js";
import { renderPage } from "../lib/page.js";
import { addDays, todayInUppsala } from "../lib/dates.js";

export default async function handler(_req: unknown, res: any) {
  const today = todayInUppsala();
  const horizon = addDays(today, HORIZON_DAYS - 1);

  // Four fetches across three sections, in parallel. None can throw — each
  // returns its own error for its own section to render, so one dead source
  // never costs the others. That is the whole failure story from ticket 08.
  const [{ events, fetchedAt, error }, forecast, cinema] = await Promise.all([
    fetchEvents(new Date(`${today}T12:00:00Z`), horizon),
    fetchForecast(),
    fetchFilms(today),
  ]);
  const view = buildEventsView(events, today);

  const html = renderPage({ today, view, forecast, cinema, fetchedAt, error });

  res.setHeader("content-type", "text/html; charset=utf-8");
  // A failed source must not sit in the cache for an hour. Events retry fastest,
  // since they are the page. Any other section failing backs off further:
  // retrying every minute would re-scrape hejauppsala sixty times an hour to fix
  // a strip of icons or a film list, which is rude to a source we depend on far
  // more. A partly-failed cinema counts — the ranking is incomplete until both
  // sources are back.
  const degraded = forecast.error || cinema.failed.length > 0;
  const maxAge = error ? 60 : degraded ? 300 : 3600;

  // Network v1, ticket 01. `s-maxage` is shared-cache only, so before this the
  // browser had no freshness lifetime of its own and revalidated on every
  // navigation — which is what made pressing `h` back to the hub feel like a
  // reload, and what makes `vercel dev` (no CDN at all) re-scrape on every
  // single request.
  //
  // A browser-side lifetime turns that return trip into a disk-cache hit: no
  // request, no scrape. It is the floor under the bfcache hop in
  // public/network.js rather than a replacement for it — the hop is still what
  // makes the switch instant *and* preserves scroll position, but it depends on
  // the browser agreeing to freeze the page, and an extension content script or
  // an open DevTools panel is enough to refuse it. This works either way.
  //
  // Capped well under the edge's hour: the visible cost is that "uppdaterad
  // HH:MM" can lag by this much, and a stale clock on a page whose whole claim
  // is freshness is worth more than the round trip it saves. Failures keep
  // their own short backoff, so a dead source is never pinned in a browser for
  // longer than it is pinned at the edge.
  const browserMaxAge = Math.min(maxAge, 300);
  res.setHeader(
    "cache-control",
    maxAge === 3600
      ? `max-age=${browserMaxAge}, s-maxage=3600, stale-while-revalidate=86400`
      : `max-age=${browserMaxAge}, s-maxage=${maxAge}`,
  );
  res.status(200).send(html);
}
