// Events from hejauppsala.com.
//
// There is no API worth using — ticket 01 established that the REST route
// carries no date at all and the detail pages have no JSON-LD, so the rendered
// listing at /kalender/ is the only source. It is already upcoming-only and
// sorted by start date, 40 per page, so a 14-day window costs three fetches.
//
// The parse deliberately does NOT hang off the theme's utility classes. It
// splits on the /kalender/<slug>/ permalinks, which are public and stable, and
// reads the date badge as "a number and a Swedish month abbreviation appearing
// between one permalink and the next". A redesign can rename every class in the
// file and this still works.

export type Event = {
  slug: string;
  title: string;
  /** ISO date. On day 1 this may be clamped by the site — see isClamped below. */
  start: string;
  /** ISO date, or null for a single-day event. */
  end: string | null;
  cats: string[];
  venue: string | null;
  url: string;
  /**
   * Ticket 14. The theme lazy-loads client-side, so the card's image sits in a
   * `data-xl-src` attribute rather than an `src`; we render server-side and emit
   * a normal `src` from it. Coverage was 40/40 on two separate live checks, but
   * this stays nullable — a missing image must cost a picture, never a card.
   */
  image: string | null;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&quot;": '"', "&#039;": "'", "&apos;": "'", "&nbsp;": " ",
  "&auml;": "ä", "&ouml;": "ö", "&aring;": "å",
  "&Auml;": "Ä", "&Ouml;": "Ö", "&Aring;": "Å",
  "&ndash;": "–", "&mdash;": "—",
};

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-zA-Z]+;|&#\d+;/g, (m) => ENTITIES[m] ?? m);
}

function text(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** A card in the listing: two anchors to the same permalink, then the badge. */
type Card = { slug: string; imgEnd: number; titleEnd: number | null; from: number };

function cards(html: string): Card[] {
  const anchor = /<a\s[^>]*href="https:\/\/hejauppsala\.com\/kalender\/([a-z0-9\-]+)\/"[^>]*>/gi;
  const hits: { slug: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html))) hits.push({ slug: m[1], start: m.index, end: anchor.lastIndex });

  const out: Card[] = [];
  for (const h of hits) {
    const last = out[out.length - 1];
    // The image link and the title link are consecutive and share a permalink.
    if (last && last.slug === h.slug && last.titleEnd === null) last.titleEnd = h.end;
    else out.push({ slug: h.slug, imgEnd: h.end, titleEnd: null, from: h.start });
  }
  return out;
}

/**
 * Dates carry a day and a Swedish month, never a year. The listing is ascending
 * from today, so the year is "this year, rolled forward once the month wraps".
 */
function inferYear(month: number, today: Date): number {
  const y = today.getFullYear();
  return month < today.getMonth() + 1 ? y + 1 : y;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function parseListing(html: string, today: Date): Event[] {
  const list = cards(html);
  const out: Event[] = [];

  for (let i = 0; i < list.length; i++) {
    const card = list[i];
    const next = list[i + 1];
    const chunk = html.slice(card.imgEnd, next ? next.from : Math.min(html.length, card.imgEnd + 6000));

    const dates: { day: number; mon: number }[] = [];
    const dateRe = /\b(\d{1,2})\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\b/gi;
    let d: RegExpExecArray | null;
    const badge = text(chunk);
    while ((d = dateRe.exec(badge))) dates.push({ day: Number(d[1]), mon: MONTHS[d[2].toLowerCase()] });
    if (!dates.length) continue;

    let title = "";
    if (card.titleEnd !== null) {
      const close = html.indexOf("</a>", card.titleEnd);
      title = text(html.slice(card.titleEnd, close < 0 ? card.titleEnd + 400 : close));
    }
    if (!title) continue;

    const cats: string[] = [];
    const catRe = /href="https:\/\/hejauppsala\.com\/event-category\/([a-z0-9\-]+)\//gi;
    let c: RegExpExecArray | null;
    while ((c = catRe.exec(chunk))) if (!cats.includes(c[1])) cats.push(c[1]);

    // The image. Restricted to the uploads path on purpose: `data-xl-src` also
    // appears on site chrome (9 of the 49 on page 1), and the chunk boundaries
    // are permalink-to-permalink rather than element-to-element, so a chrome
    // block sitting between two cards would otherwise be adopted by one of them.
    const img = /data-xl-src="(https:\/\/hejauppsala\.com\/wp-content\/uploads\/[^"]+)"/i.exec(chunk);

    // The venue is the last breadcrumb item; the earlier ones are categories.
    const crumbs: string[] = [];
    const liRe = /<li[^>]*breadcrumbs__item[^>]*>([\s\S]*?)<\/li>/gi;
    let l: RegExpExecArray | null;
    while ((l = liRe.exec(chunk))) crumbs.push(text(l[1]));

    out.push({
      slug: card.slug,
      title,
      start: iso(inferYear(dates[0].mon, today), dates[0].mon, dates[0].day),
      end: dates[1] ? iso(inferYear(dates[1].mon, today), dates[1].mon, dates[1].day) : null,
      cats,
      venue: crumbs.length > 1 ? crumbs[crumbs.length - 1] : null,
      url: `https://hejauppsala.com/kalender/${card.slug}/`,
      image: img ? decode(img[1]) : null,
    });
  }

  return out;
}

export type Fetched = {
  events: Event[];
  fetchedAt: Date;
  /** Set when the source could not be read; the section renders an error. */
  error: string | null;
};

const PAGE_1 = "https://hejauppsala.com/kalender/";
const MAX_PAGES = 5;

export async function fetchEvents(today: Date, horizon: string): Promise<Fetched> {
  const bySlug = new Map<string, Event>();

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1 ? PAGE_1 : `${PAGE_1}page/${page}/`;
      const res = await fetch(url, { headers: { "user-agent": "whats-happening (personal hub)" } });
      if (!res.ok) throw new Error(`${url} svarade ${res.status}`);
      const html = await res.text();

      const parsed = parseListing(html, today);

      // The one genuinely brittle thing is the date badge, and when it breaks it
      // yields no dates rather than an error. A page with permalinks but almost
      // no parsed dates means the theme changed — say so instead of rendering a
      // convincingly empty calendar.
      const links = new Set(
        [...html.matchAll(/href="https:\/\/hejauppsala\.com\/kalender\/([a-z0-9\-]+)\/"/gi)].map((m) => m[1]),
      ).size;
      if (links >= 20 && parsed.length < links * 0.8) {
        throw new Error(`sidan ${page}: ${links} länkar men bara ${parsed.length} tolkade datum — layouten har nog ändrats`);
      }

      // Consecutive pages overlap by a few events; slug is the identity.
      for (const e of parsed) if (!bySlug.has(e.slug)) bySlug.set(e.slug, e);

      const last = parsed[parsed.length - 1];
      if (!last || last.start > horizon) break;
    }
  } catch (err) {
    return {
      events: [...bySlug.values()],
      fetchedAt: new Date(),
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return { events: [...bySlug.values()], fetchedAt: new Date(), error: null };
}
