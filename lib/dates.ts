// Everything on this page is "what day is it in Uppsala", never "what day is it
// on the server". Vercel runs in UTC, so between 22:00 and midnight local time a
// naive server date is already tomorrow — the page would silently drop today.

export const TZ = "Europe/Stockholm";

/** Today's date in Uppsala, as YYYY-MM-DD. */
export function todayInUppsala(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(now);
}

/** Parsed at noon, so a DST shift can never roll the date over. */
export const at = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);

export function addDays(isoDate: string, days: number): string {
  return new Date(at(isoDate).getTime() + days * 86400000).toISOString().slice(0, 10);
}

export function spanDays(start: string, end: string | null): number {
  if (!end) return 0;
  return Math.round((at(end).getTime() - at(start).getTime()) / 86400000);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("sv-SE", opts);

/** "Söndag" — capitalised, since it opens a day header. */
export function weekdayLong(isoDate: string): string {
  const s = fmt({ weekday: "long" }).format(at(isoDate));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// sv-SE abbreviates with a trailing period ("27 aug."), which reads badly after
// "t.o.m." — two full stops in a row. Drop it.
export const dayMonth = (isoDate: string) =>
  fmt({ day: "numeric", month: "short" }).format(at(isoDate)).replace(/\.$/, "");

export function longDate(isoDate: string): string {
  const s = fmt({ weekday: "long", day: "numeric", month: "long" }).format(at(isoDate));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "14:32" in Uppsala — for the "uppdaterad" time beside the date in the header. */
export function clockInUppsala(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}
