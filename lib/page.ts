// The whole page, as a string.
//
// No framework and no client-side fetching: the page must arrive complete, so
// that a broken script can never cost Robert the content. A "component" here is
// a function that returns a string, which is all the templating this needs.
//
// The design comes from the ticket 07 prototype (prototype/layout-variants.html)
// in its "Spalter" view. The one addition is ticket 11's "Pågår just nu" block.

import type { Event } from "./hejauppsala.js";
import type { EventsView } from "./events-view.js";
import type { DayForecast, Forecast } from "./smhi.js";
import type { Cinema, Film } from "./cinema.js";
import { CINEMA_NAME, TOP_N } from "./cinema.js";
import { weatherEmoji, weatherLabel } from "./smhi.js";
import { clockInUppsala, dayMonth, isWeekend, longDate, weekdayLong, weekdayShort } from "./dates.js";

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const LINKS = {
  smhi: "https://www.smhi.se/vader/prognoser/ortsprognoser/q/Uppsala/2666199",
  smhiHome: "https://www.smhi.se/",
  ccby: "https://creativecommons.org/licenses/by/4.0/deed.sv",
  heja: "https://hejauppsala.com/kalender",
  facebook: "https://www.facebook.com/events/",
  ticketmaster: "https://www.ticketmaster.se/",
  songkick: "https://www.songkick.com/",
  gigwhere: "https://www.gigwhere.com/",
  // Ticket 02: one link per operator, and only the three that publish a
  // programme. Slottsbiografen is a rental hall and Bio Regina is a theatre —
  // both were in the v0 chip row and neither shows films on a schedule.
  // Filmstaden's link 403s to curl but is fine in a browser; never link-check it.
  filmstaden: "https://www.filmstaden.se/uppsala/",
  nfbio: "https://www.nfbio.se/biograf/uppsala?city=uppsala",
  fyris: "https://www.fyrisbiografen.se/kalendarium",
};

/** The genre axis only. Categories also mix geography and editorial flags. */
const GENRE_LABEL: Record<string, string> = {
  musik: "Musik", konst: "Konst", scen: "Scen", sport: "Sport", familj: "Familj",
  foredrag: "Föredrag", "mat-dryck": "Mat & dryck", "dans-event": "Dans",
  kurser: "Kurs", museum: "Museum",
};

function genre(e: Event): string | null {
  const g = e.cats.find((c) => c in GENRE_LABEL);
  return g ? GENRE_LABEL[g] : null;
}

/** "Katalin · Konsert", as in the prototype. */
function meta(e: Event): string {
  return [e.venue, genre(e)].filter(Boolean).map(esc).join(" · ");
}

/**
 * Ticket 14. The image is decorative: the title it belongs to is always the
 * next thing in the row, so `alt=""` keeps a screen reader from reading every
 * event twice. Hotlinked straight at hejauppsala's own resized derivative — no
 * proxy, no storage. `lazy` because the fourteen slices put ~87 of these in the
 * document and all but the first column are off-screen; the browser still
 * fetches whatever is in the initial viewport eagerly, so nothing above the
 * fold pays for it.
 */
const thumb = (e: Event) =>
  e.image
    ? `<img class="thumb" src="${esc(e.image)}" alt="" loading="lazy" decoding="async">`
    : `<span class="thumb"></span>`;

const eventRow = (e: Event) => `
        <div class="row">${e.end && e.end !== e.start
          ? `\n          <div class="time">t.o.m. ${esc(dayMonth(e.end))}</div>`
          : ""}
          <div class="main">${thumb(e)}
            <div class="body">
              <div class="title"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a></div>
              <div class="meta">${meta(e)}</div>
            </div>
          </div>
        </div>`;

// --- weather ------------------------------------------------------------
// Ticket 12. Emoji carry no intensity and no colour cue for a screen reader, so
// every glyph gets its Swedish label as an aria-label and the full reading —
// label plus the day's range — as a tooltip on the cell around it.

const glyph = (d: DayForecast) =>
  `<span role="img" aria-label="${esc(weatherLabel(d.symbolCode))}">${weatherEmoji(d.symbolCode)}</span>`;

/** "Halvklart, 12–21°" — the precision the icon and the single number drop. */
const reading = (d: DayForecast) => `${weatherLabel(d.symbolCode)}, ${d.tmin}–${d.tmax}°`;

/** One cell: icon, the day's high, and the day's name. Weekend cells get a warm
    tint, so "is that on a Saturday?" is answered by scanning rather than reading. */
const wxCell = (d: DayForecast, offset: number) => `
          <div class="${isWeekend(d.date) ? "we" : ""}" title="${esc(reading(d))}">
            <span class="ic">${glyph(d)}</span>
            <span class="t">${esc(d.tmax)}°</span>
            <span class="dn">${esc(offset === 0 ? "idag" : weekdayShort(d.date))}</span>
          </div>`;

/**
 * The strip lives in the page header, so it has to fail without collapsing the
 * header around it — one line in place of seven cells, the link to SMHI intact
 * so the answer is still one tap away.
 */
function weatherStrip(forecast: Forecast): string {
  const body = forecast.error
    ? `
        <div class="wxfail">Väder kunde inte hämtas — <span class="why">${esc(forecast.error)}</span></div>`
    : `
        <div class="wx">${forecast.days.map((d, i) => wxCell(d, i)).join("")}
        </div>`;

  return `
    <div class="ph-wx">
      <a href="${LINKS.smhi}" target="_blank" rel="noopener">${body}
      </a>
    </div>`;
}

/**
 * The right-hand slot in a day header. The strip reaches 7 days and the slices
 * reach 14, so the back half of the fortnight simply has none — and shows
 * nothing rather than a placeholder. A forecast that stops is legible; a row of
 * dashes reads as broken.
 */
const dayWeather = (d: DayForecast | undefined) =>
  d ? `<span class="dw" title="${esc(reading(d))}">${glyph(d)} ${esc(d.tmax)}°</span>` : `<span class="dw"></span>`;

/** "Söndag 16 aug · idag" — the relative label only for the two days it helps. */
function dayHead(date: string, offset: number, wx: DayForecast | undefined): string {
  const rel = offset === 0 ? "idag" : offset === 1 ? "imorgon" : "";
  return `
        <div class="day">
          <span>${esc(weekdayLong(date))} ${esc(dayMonth(date))}${rel ? ` <span class="rel">· ${rel}</span>` : ""}</span>
          ${dayWeather(wx)}
        </div>`;
}

const daySlice = (date: string, events: Event[], offset: number, wx: DayForecast | undefined) => `
      <div class="slice">${dayHead(date, offset, wx)}
        ${events.length ? events.map(eventRow).join("") : '<div class="quiet">Inget inrapporterat</div>'}
      </div>`;

// The ongoing card gets a bigger picture than a slice row does: this card is
// full-width and holds a handful of events, where a slice is a 15rem column
// holding up to fourteen.
const ongoingCard = (e: Event) => `
          <a class="onc" href="${esc(e.url)}" target="_blank" rel="noopener">${thumb(e)}
            <span class="body">
              <span class="title">${esc(e.title)}</span>
              <span class="meta">${e.venue ? esc(e.venue) + " · " : ""}t.o.m. ${esc(dayMonth(e.end!))}</span>
            </span>
          </a>`;

function eventsBody(view: EventsView, error: string | null, wxByDate: Map<string, DayForecast>): string {
  if (error) {
    return `
      <div class="failed">
        Kunde inte hämta evenemang från hejauppsala just nu.
        <p class="why">${esc(error)}</p>
      </div>`;
  }

  if (view.quiet) {
    return `
      <div class="slicecard">
        <div class="quiet">Inget listat i Uppsala de närmaste två veckorna. Det är ovanligt — prova länken nedan.</div>
      </div>`;
  }

  return `${view.ongoing.length ? `
      <div class="ongoing">
        <h3>Pågår just nu</h3>
        <div class="ongrid">${view.ongoing.map(ongoingCard).join("")}
        </div>
      </div>` : ""}
      <div class="slicecard">
        <div class="slices">${view.days.map((d, i) => daySlice(d.date, d.events, i, wxByDate.get(d.date))).join("")}
        </div>
      </div>`;
}

// --- film ---------------------------------------------------------------
// Ticket 13 built this row as rank + title + cinemas, dropping the prototype's
// poster because TMDB was out of scope and the placeholder had nothing to
// become. Ticket 15 found that premise was simply wrong — both cinemas ship
// posters in pages we fetch anyway — so the placeholder is back, filled.
//
// The count stays unprinted. That part of 13 was never about images: Filmstaden
// is unreachable, so every count is an undercount, fit to sort by and unfit to
// show.

/**
 * Ticket 15. `alt=""` for ticket 14's reason — the title is the next thing in
 * the row and this whole row is the link, so any honest alt is a verbatim
 * repeat. The empty `<span>` is the missing-poster case, which is real here
 * unlike on events: six of the twenty-three films in a sample week had no
 * poster at either source. It keeps the titles on one left edge, because one
 * row starting 3rem out of line reads as broken rather than as sparse — and
 * the rank beside it still does the whole job the row had before 15.
 */
const poster = (f: Film) =>
  f.poster
    ? `<img class="poster" src="${esc(f.poster)}" alt="" loading="lazy" decoding="async">`
    : `<span class="poster"></span>`;

/**
 * A line of its own, under the cinemas. Both facts are meta, but they answer
 * different questions — *where can I see it* and *how long is it* — and running
 * them together on one line pushed the two-cinema rows ("Nordisk Film Bio ·
 * Fyrisbiografen · 172 min") into a wrap inside the 20rem sidebar, which read
 * as one long muddled string rather than as two facts.
 *
 * Minutes, not "2 timmar 20 min": a runtime is a number you compare, not a
 * sentence you read, and the short form fits the column without wrapping.
 *
 * Genre and director are not here: nfbio publishes them only on its per-film
 * detail pages, at 83 KB each against ~735 KB for the whole section, and
 * Fyrisbiografen publishes them nowhere we read.
 */
const duration = (f: Film) =>
  f.runtime ? `\n              <span class="meta">${esc(f.runtime)} min</span>` : "";

const filmRow = (f: Film, i: number) => `
          <a class="frow" href="${esc(f.url)}" target="_blank" rel="noopener">
            <span class="rank">${i + 1}</span>${poster(f)}
            <span class="body">
              <span class="title">${esc(f.title)}</span>
              <span class="meta">${f.cinemas.map((c) => esc(CINEMA_NAME[c])).join(" · ")}</span>${duration(f)}
            </span>
          </a>`;

/**
 * Two sources, so failure has three shapes rather than two: both gone is the
 * only one that empties the section. One gone still ranks — worse, but not
 * wrong in a way anyone can see — so it says so in a line and shows the list.
 */
function filmBody(cinema: Cinema): string {
  if (cinema.error) {
    return `
        <div class="failed">
          Kunde inte hämta biotablån just nu.
          <p class="why">${esc(cinema.error)}</p>
        </div>`;
  }

  const note = cinema.failed.length
    ? `\n        <div class="quiet">${esc(cinema.failed.join(" och "))} kunde inte läsas — listan är ofullständig.</div>`
    : "";

  if (!cinema.films.length) {
    return `${note}
        <div class="quiet">Inga visningar de närmaste sju dagarna.</div>`;
  }

  // The tail folds away in a <details>, which is the whole feature: no script,
  // no state, and it still works if the CSS never loads. The section keeps its
  // "top 5" claim above the fold and the rest is one tap away.
  const top = cinema.films.slice(0, TOP_N);
  const rest = cinema.films.slice(TOP_N);

  return `${note}
        <div class="films">${top.map(filmRow).join("")}
        </div>${rest.length ? `
        <details class="more">
          <summary>${rest.length} till</summary>
          <div class="films">${rest.map((f, i) => filmRow(f, i + TOP_N)).join("")}
          </div>
        </details>` : ""}`;
}

export function renderPage(opts: {
  today: string;
  view: EventsView;
  forecast: Forecast;
  cinema: Cinema;
  fetchedAt: Date;
  error: string | null;
}): string {
  const { today, view, forecast, cinema, fetchedAt, error } = opts;
  const wxByDate = new Map(forecast.days.map((d) => [d.date, d]));

  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>Uppsala</title>
<meta name="description" content="Vad händer i Uppsala — evenemang, bio, konserter och väder på en sida.">

<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#faf9f7">

<link rel="icon" type="image/svg+xml" href="/icons/icon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<link rel="apple-touch-icon" href="/icons/icon-180.png">

<!-- iOS home-screen pin -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Uppsala">

<link rel="stylesheet" href="/style.css">
</head>
<body>

<div class="wrap">

  <header class="pagehead">
    <div class="ph-title">
      <h1>Uppsala</h1>
      <p class="sub">${esc(longDate(today))} · uppdaterad ${esc(clockInUppsala(fetchedAt))}</p>
    </div>
${weatherStrip(forecast)}
  </header>

  <div class="cols">
    <div class="main">

      <section>
        <h2><span>Vad händer</span></h2>
${eventsBody(view, error, wxByDate)}
        <div class="linkrow">
          <a class="chip" href="${LINKS.heja}" target="_blank" rel="noopener">hejauppsala kalender</a>
          <a class="chip" href="${LINKS.facebook}" target="_blank" rel="noopener">Facebook Events</a>
        </div>
      </section>

    </div>
    <div class="aside">

      <section class="card">
        <h2><span>På bio</span> <span class="hint">mest visat i veckan</span></h2>
${filmBody(cinema)}
        <div class="linkrow">
          <a class="chip" href="${LINKS.filmstaden}" target="_blank" rel="noopener">Filmstaden</a>
          <a class="chip" href="${LINKS.nfbio}" target="_blank" rel="noopener">Nordisk Film Bio</a>
          <a class="chip" href="${LINKS.fyris}" target="_blank" rel="noopener">Fyrisbiografen</a>
        </div>
      </section>

      <section class="card">
        <h2>Dina band</h2>
        <div class="linkrow">
          <a class="chip" href="${LINKS.ticketmaster}" target="_blank" rel="noopener">Ticketmaster SE</a>
          <a class="chip" href="${LINKS.gigwhere}" target="_blank" rel="noopener">GigWhere</a>
          <a class="chip" href="${LINKS.songkick}" target="_blank" rel="noopener">Songkick</a>
        </div>
      </section>

    </div>
  </div>

  <footer class="pagefoot">
    <p class="hotkey"><a href="/network">Nätverk</a> — eller tryck <kbd>n</kbd></p>
    Väderdata från <a href="${LINKS.smhiHome}" target="_blank" rel="noopener">SMHI</a>
    (<a href="${LINKS.ccby}" target="_blank" rel="noopener">CC BY 4.0</a>), bearbetad till dygnsvärden.
    Evenemang från <a href="${LINKS.heja}" target="_blank" rel="noopener">hejauppsala</a>.
    Biotablå från <a href="${LINKS.nfbio}" target="_blank" rel="noopener">Nordisk Film Bio</a>
    och <a href="${LINKS.fyris}" target="_blank" rel="noopener">Fyrisbiografen</a> — Filmstaden ingår inte.
  </footer>

</div>

<!-- The first client-side script this page has ever carried, and it stays
     that way on purpose: the hub's defining property is that the page arrives
     complete, so nothing here may be load-bearing for the content. It is
     inline rather than a file for the same reason — an external script the hub
     has to fetch is a fetch that can fail. If this never runs, the footer link
     still goes to /network.

     "hop" prefers a history traversal over a fresh navigation so the
     destination comes back from the browser's back/forward cache: no request,
     no reload, no flash. It matters far more in the other direction — /network
     is a static file, while this page is a scrape — so the mirror of this in
     public/network.js is the one doing the real work. See the comment there.

     Nothing on this page may ever register an unload listener: that
     disqualifies it from the bfcache and is what would make the return trip
     slow again. -->
<script>
document.addEventListener("keydown", function (e) {
  if (e.key !== "n" || e.isComposing || e.defaultPrevented) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var el = document.activeElement;
  if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
  var from = null;
  try { from = new URL(document.referrer); } catch (err) {}
  if (from && from.origin === location.origin && from.pathname === "/network" && history.length > 1) {
    history.back();
  } else {
    location.href = "/network";
  }
});
</script>
</body>
</html>
`;
}
