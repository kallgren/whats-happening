// Turning a flat list of events into the two things the page shows.
//
// This is ticket 11's decision, and it exists because of one quirk in the
// source: hejauppsala clamps an already-running event's displayed start date to
// today. Taken literally, every month-long exhibition in the city lands on day
// 1 — 23 events against a median of 4 — and the daily rhythm disappears behind
// a wall of things that have been running since June.
//
// So long runs come out into their own "pågår just nu" list and the day slices
// keep only what actually starts on a given day. Measured on real data
// (2026-08-16): this moves 7 events off day 1, taking it from 23 to 16, which
// puts it in the same band as a normal Saturday. Every remaining day holds
// 1–14, median 4.

import type { Event } from "./hejauppsala.js";
import { addDays, spanDays } from "./dates.js";

/**
 * A run of this many days or more is "ongoing" rather than "starting today".
 *
 * The exact number matters much less than it looks: every long run observed on
 * day 1 spanned 14+ days, so anything from 3 to 10 lifts the same events. Seven
 * is chosen because it reads as a rule ("longer than a week") rather than a
 * tuned constant, and it leaves weekend-block events — a gallery open Fri–Sun —
 * in the day slices where they belong.
 */
export const ONGOING_MIN_SPAN = 7;

/** The data window. How much of it is *shown* is the same 14 — see below. */
export const HORIZON_DAYS = 14;

/**
 * Uppsala only, per the map. The category is on 97% of events, and the few
 * without it are genuinely elsewhere — Östhammar, Tierp, Enköping.
 */
const isUppsala = (e: Event) => e.cats.includes("uppsala");

export type DaySlice = { date: string; events: Event[] };

export type EventsView = {
  ongoing: Event[];
  days: DaySlice[];
  /** True when the window is genuinely empty rather than broken. */
  quiet: boolean;
};

export function buildEventsView(events: Event[], today: string): EventsView {
  const horizon = addDays(today, HORIZON_DAYS - 1);

  const window = events
    .filter(isUppsala)
    .filter((e) => e.start >= today && e.start <= horizon);

  const ongoing: Event[] = [];
  const dated: Event[] = [];
  for (const e of window) {
    (spanDays(e.start, e.end) >= ONGOING_MIN_SPAN ? ongoing : dated).push(e);
  }

  // Longest run last: the ones ending soonest are the ones worth acting on.
  ongoing.sort((a, b) => (a.end ?? "").localeCompare(b.end ?? "") || a.title.localeCompare(b.title, "sv"));

  const days: DaySlice[] = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = addDays(today, i);
    days.push({ date, events: dated.filter((e) => e.start === date) });
  }

  return { ongoing, days, quiet: window.length === 0 };
}
