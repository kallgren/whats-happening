// Films from Uppsala's two readable cinemas.
//
// Ticket 02 established the sources and the one thing that shapes everything
// here: Filmstaden — the city's biggest operator by a distance — is behind a
// Cloudflare challenge and is permanently out of reach. So the ranking rests on
// two cinemas, not four, and the counts it ranks on are *undercounts* for any
// title also playing at Filmstaden.
//
// That single fact is why the screening count is never printed. It is a good
// enough signal to sort by (the multiplex slate still dominates) and a bad
// enough number to publish. Rank on it, never show it.
//
// Two GETs, no key, no cookies, ~660 KB. Both parses hang off the most stable
// thing each page has — a booking URL — rather than off theme classes.

import { addDays } from "./dates.js";

/** How far "den här veckan" reaches. Rolling from today, not a calendar week. */
export const FILM_WINDOW_DAYS = 7;

/**
 * Five on the page, five behind a fold. The claim the section makes is "top 5";
 * the next five are there because the cut-off is arbitrary at the margin — a
 * film sitting sixth on two cinemas' counts might be third in the city — and
 * because the tail is where the art-house titles live. They cost nothing: the
 * screenings are already in hand, and `<details>` needs no script.
 */
export const TOP_N = 5;
export const EXTRA_N = 5;

/** Which of the two cinemas a screening belongs to. */
export type CinemaId = "nfbio" | "fyris";

export const CINEMA_NAME: Record<CinemaId, string> = {
  nfbio: "Nordisk Film Bio",
  fyris: "Fyrisbiografen",
};

type Screening = {
  cinema: CinemaId;
  /** ISO date. */
  date: string;
  title: string;
  /** Where to send someone who wants this film. */
  url: string;
};

export type Film = {
  title: string;
  url: string;
  cinemas: CinemaId[];
  /** Ranks the list. Deliberately never rendered — see the note above. */
  count: number;
};

export type Cinema = {
  /** Ranked, longest list first: the top TOP_N show, the rest sit behind a fold. */
  films: Film[];
  /** Names of sources that could not be read. One dead source is survivable. */
  failed: string[];
  /** Set only when *both* sources are gone and there is nothing to rank. */
  error: string | null;
};

// --- title matching -----------------------------------------------------
// There are no ids to join the two sources on, so titles are the key. Both
// sites take their titles from the same distributor material, so the observed
// differences are punctuation and stray whitespace ("Moonrise Kingdom "), not
// wording. Fold those away and compare; do not try to be cleverer than that —
// a fuzzy match that merges two genuinely different films is a worse failure
// than showing one film twice.

function key(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,:;!?'"()[\]–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Nordisk Film Bio ---------------------------------------------------

const NFBIO_URL = "https://www.nfbio.se/biograf/uppsala?city=uppsala";

/**
 * One document holds the cinema's whole forward schedule, laid out as
 * film block → date → screening buttons. Nothing nests in a way a regex can
 * see, so the parse walks the document in order and carries the current film
 * and the current date forward onto each screening it meets.
 *
 * The screening link and `<time datetime>` are machine-readable and the least
 * likely things on the page to churn; the title span is the soft dependency,
 * and the slug in the film link is the fallback when it moves.
 */
export function parseNfbio(html: string): Screening[] {
  const token =
    /href="\/([a-z0-9\-]+)\?city=uppsala"|field--name-title[^>]*>([^<]+)<|<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"|href="https:\/\/www\.nfbio\.se\/screening\/\d+\/([0-9a-f\-]{36})"/gi;

  let slug: string | null = null;
  let title: string | null = null;
  let date: string | null = null;
  const seen = new Set<string>();
  const out: Screening[] = [];

  let m: RegExpExecArray | null;
  while ((m = token.exec(html))) {
    if (m[1]) {
      // A new film block. The title span sits inside this anchor, so drop the
      // previous film's title rather than letting it leak onto this one.
      if (m[1] !== slug) { slug = m[1]; title = null; }
    } else if (m[2]) {
      title = decodeEntities(m[2]).trim();
    } else if (m[3]) {
      date = m[3];
    } else if (m[4] && slug && date && !seen.has(m[4])) {
      seen.add(m[4]);
      out.push({
        cinema: "nfbio",
        date,
        title: title || humanise(slug),
        url: `https://www.nfbio.se/${slug}?city=uppsala`,
      });
    }
  }

  return out;
}

/** Only ever used when the title span moves; ugly, but it still ranks. */
const humanise = (slug: string) =>
  slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&quot;": '"', "&#039;": "'", "&apos;": "'", "&nbsp;": " ",
  "&ndash;": "–", "&mdash;": "—",
};

const decodeEntities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-zA-Z]+;/g, (x) => ENTITIES[x] ?? x);

async function fetchNfbio(): Promise<Screening[]> {
  const res = await fetch(NFBIO_URL, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`nfbio svarade ${res.status}`);
  const html = await res.text();

  const screenings = parseNfbio(html);

  // The `?city=uppsala` parameter is load-bearing: without it the URL 302s to a
  // city picker and the page is real, complete and empty. A multiplex with no
  // forward schedule is never true, so treat it as breakage, not a quiet week.
  const links = new Set(
    [...html.matchAll(/nfbio\.se\/screening\/\d+\/([0-9a-f\-]{36})/gi)].map((x) => x[1]),
  ).size;
  if (!screenings.length) throw new Error("nfbio listade inga visningar alls");
  if (links >= 20 && screenings.length < links * 0.8) {
    throw new Error(`nfbio: ${links} visningar men bara ${screenings.length} tolkade — layouten har nog ändrats`);
  }

  return screenings;
}

// --- Fyrisbiografen -----------------------------------------------------

const FYRIS_URL = "https://www.fyrisbiografen.se/kalendarium";

/**
 * The calendar renders twice — once for phones, once for desktop — so anything
 * counted naively is doubled. The booking URL carries screen, time and ISO date,
 * which is both the most stable anchor on the page and a natural unique key, so
 * deduping on it solves the double render for free.
 *
 * Screenings too late to book lose their booking URL, so a showing that has
 * already started today drops out. That is the right answer anyway.
 */
export function parseFyris(html: string): Screening[] {
  const booking = /load-booking\.php\?s=([^&]+)&t=(\d\d:\d\d)&d=(\d{4}-\d{2}-\d{2})/g;
  const seen = new Set<string>();
  const out: Screening[] = [];

  let m: RegExpExecArray | null;
  while ((m = booking.exec(html))) {
    const id = `${m[3]} ${m[2]} ${m[1]}`;
    if (seen.has(id)) continue;

    // The title is the next linked title after the booking script.
    const t = /class="calendar_media[^"]*">\s*<a\s+title="([^"]*)"\s+href="([^"]*)"/i.exec(
      html.slice(m.index, m.index + 1200),
    );
    if (!t) continue;

    seen.add(id);
    out.push({
      cinema: "fyris",
      date: m[3],
      title: decodeEntities(t[1]).trim(),
      url: new URL(t[2], "https://www.fyrisbiografen.se/").toString(),
    });
  }

  return out;
}

async function fetchFyris(): Promise<Screening[]> {
  const res = await fetch(FYRIS_URL, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Fyrisbiografen svarade ${res.status}`);

  // No emptiness check here, unlike nfbio. This calendar shows the rest of the
  // current playing week (Friday–Thursday) and only opens the next one from
  // Wednesday, so on a Thursday it is legitimately almost bare. Empty is
  // normal; treating it as breakage would cry wolf every week.
  return parseFyris(await res.text());
}

const UA = "whats-happening (personal hub)";

// --- ranking ------------------------------------------------------------

/** Both cinemas first, so ties resolve toward the one with more seats. */
const ORDER: CinemaId[] = ["nfbio", "fyris"];

export function rank(screenings: Screening[], today: string, topN = TOP_N + EXTRA_N): Film[] {
  const horizon = addDays(today, FILM_WINDOW_DAYS - 1);

  /** Per film, per cinema: how many screenings, and how that cinema names it. */
  type Group = { count: number; at: Partial<Record<CinemaId, { n: number; title: string; url: string }>> };
  const groups = new Map<string, Group>();

  for (const s of screenings) {
    if (s.date < today || s.date > horizon) continue;

    const k = key(s.title);
    let g = groups.get(k);
    if (!g) groups.set(k, (g = { count: 0, at: {} }));

    g.count++;
    const seen = g.at[s.cinema];
    if (seen) seen.n++;
    else g.at[s.cinema] = { n: 1, title: s.title, url: s.url };
  }

  return [...groups.values()]
    .map((g): Film => {
      // The two sources spell the same film slightly differently and the row
      // links to exactly one of them, so both the title and the link come from
      // whichever cinema shows it more — that is where someone is likeliest to
      // find a seat. Decided once, from the finished counts: deciding it as the
      // screenings arrive lets the last one parsed win, which is no rule at all.
      const cinemas = ORDER.filter((c) => g.at[c]);
      const main = cinemas.reduce((a, b) => (g.at[b]!.n > g.at[a]!.n ? b : a));
      return { title: g.at[main]!.title, url: g.at[main]!.url, cinemas, count: g.count };
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "sv"))
    .slice(0, topN);
}

export async function fetchFilms(today: string): Promise<Cinema> {
  // Independently, in parallel: the whole point of two sources is that one of
  // them dying degrades the ranking instead of emptying the section.
  const [a, b] = await Promise.all([
    fetchNfbio().then(ok, () => fail("nfbio")),
    fetchFyris().then(ok, () => fail("fyris")),
  ]);

  const failed = [...a.failed, ...b.failed];
  return {
    films: rank([...a.screenings, ...b.screenings], today),
    failed,
    error: failed.length === 2 ? "båda biograferna kunde inte läsas" : null,
  };
}

const ok = (screenings: Screening[]) => ({ screenings, failed: [] as string[] });
const fail = (id: CinemaId) => ({ screenings: [] as Screening[], failed: [CINEMA_NAME[id]] });
