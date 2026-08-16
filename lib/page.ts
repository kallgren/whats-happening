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
import { clockInUppsala, dayMonth, longDate, weekdayLong } from "./dates.js";

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const LINKS = {
  smhi: "https://www.smhi.se/vader/prognoser/ortsprognoser/q/Uppsala/2666199",
  heja: "https://hejauppsala.com/kalender",
  facebook: "https://www.facebook.com/events/",
  ticketmaster: "https://www.ticketmaster.se/",
  songkick: "https://www.songkick.com/",
  gigwhere: "https://www.gigwhere.com/",
  filmstaden: "https://www.filmstaden.se/",
  fyris: "https://www.fyrisbiografen.se/",
  slotts: "https://www.slottsbiografen.se/",
  regina: "https://www.bioregina.se/",
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

const eventRow = (e: Event) => `
        <div class="row">${e.end && e.end !== e.start
          ? `\n          <div class="time">t.o.m. ${esc(dayMonth(e.end))}</div>`
          : ""}
          <div class="body">
            <div class="title"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a></div>
            <div class="meta">${meta(e)}</div>
          </div>
        </div>`;

/** "Söndag 16 aug · idag" — the relative label only for the two days it helps. */
function dayHead(date: string, offset: number): string {
  const rel = offset === 0 ? "idag" : offset === 1 ? "imorgon" : "";
  return `
        <div class="day">
          <span>${esc(weekdayLong(date))} ${esc(dayMonth(date))}${rel ? ` <span class="rel">· ${rel}</span>` : ""}</span>
          <span class="dw"></span>
        </div>`;
}

const daySlice = (date: string, events: Event[], offset: number) => `
      <div class="slice">${dayHead(date, offset)}
        ${events.length ? events.map(eventRow).join("") : '<div class="quiet">Inget inrapporterat</div>'}
      </div>`;

const ongoingCard = (e: Event) => `
          <a class="onc" href="${esc(e.url)}" target="_blank" rel="noopener">
            <span class="title">${esc(e.title)}</span>
            <span class="meta">${e.venue ? esc(e.venue) + " · " : ""}t.o.m. ${esc(dayMonth(e.end!))}</span>
          </a>`;

function eventsBody(view: EventsView, error: string | null): string {
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
        <div class="slices">${view.days.map((d, i) => daySlice(d.date, d.events, i)).join("")}
        </div>
      </div>`;
}

export function renderPage(opts: {
  today: string;
  view: EventsView;
  fetchedAt: Date;
  error: string | null;
}): string {
  const { today, view, fetchedAt, error } = opts;

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
      <p class="sub">${esc(longDate(today))}</p>
    </div>
    <div class="ph-wx">
      <a href="${LINKS.smhi}" target="_blank" rel="noopener">
        <div class="wx" aria-hidden="true">
${Array.from({ length: 7 }, () => '          <div><span class="sk ic"></span><span class="sk t"></span><span class="sk dn"></span></div>').join("\n")}
        </div>
      </a>
    </div>
  </header>

  <div class="cols">
    <div class="main">

      <section>
        <h2>
          <span>Vad händer</span>
          <span class="stamp">hämtat ${esc(clockInUppsala(fetchedAt))}</span>
        </h2>
${eventsBody(view, error)}
        <div class="linkrow">
          <a class="chip" href="${LINKS.heja}" target="_blank" rel="noopener">hejauppsala kalender</a>
          <a class="chip" href="${LINKS.facebook}" target="_blank" rel="noopener">Facebook Events</a>
        </div>
      </section>

    </div>
    <div class="aside">

      <section class="card">
        <h2>På bio</h2>
        <div class="linkrow">
          <a class="chip" href="${LINKS.filmstaden}" target="_blank" rel="noopener">Filmstaden</a>
          <a class="chip" href="${LINKS.fyris}" target="_blank" rel="noopener">Fyrisbiografen</a>
          <a class="chip" href="${LINKS.slotts}" target="_blank" rel="noopener">Slottsbiografen</a>
          <a class="chip" href="${LINKS.regina}" target="_blank" rel="noopener">Bio Regina</a>
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

</div>
</body>
</html>
`;
}
