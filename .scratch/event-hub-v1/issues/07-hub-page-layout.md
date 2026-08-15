# 07 — Build v0: the link hub

Type: prototype
Status: claimed
Blocked by: —

## Question

Build and ship **v0**: the real page, in its destination layout, with **outgoing links where the
data will eventually go**.

This is the map's start point. It replaces the throwaway layout prototype that used to live here —
there is no reason to prototype a layout and then build the same thing again. v0 *is* the
prototype, and it is also immediately useful: gathering all the sources behind one page already
removes most of the friction, since the current alternative is visiting five sites by hand.

Every later ticket then upgrades one link into live data, in place, without touching the layout.

Settled going in — do not reopen:

- Three distinct sections, never merged into one timeline
- Events as a day-grouped vertical list, ~14-day horizon
- Uppsala only for events; all of Sweden for gigs

**Ship a page containing:**

| Section | v0 content | Upgraded by |
|---|---|---|
| Väder | Link to SMHI Uppsala | [06](./06-smhi-forecast.md) |
| Vad händer | Link to hejauppsala.com/kalender + link to Facebook Events | [01](./01-hejauppsala-event-dates.md) |
| Dina band | Link to Ticketmaster SE / Songkick | [04](./04-ticketmaster-artist-matching.md) |
| På bio | Links to Filmstaden Uppsala, Fyrisbiografen, Slottsbiografen, Bio Regina | [02](./02-filmstaden-showtimes.md) |

The Facebook Events link stays permanently — it is never replaced by data.

**Decide while building:**

1. **Section order and prominence on a phone.** *Vad händer* is the reason the page exists.
   Weather may earn a thin strip at the top. What is the vertical order?
2. **Placeholder shape.** Each section should look like the section it will become, so that
   dropping real data in later is a fill, not a redesign. Sketch one fake row per section to
   fix the shape — but keep it obviously fake so v0 is never mistaken for live data.
3. **Event row density.** Title, time, venue, category — enough to decide without clicking,
   few enough to scan a hundred quickly.
4. **The Friday-evening test.** Robert opens it on a Friday having planned nothing and within
   ~ten seconds has a sense of the weekend. Judge every choice against this explicitly.
5. **Empty vs broken.** A quiet week and a failed source must not look identical. Relevant from
   the first ticket that adds real data.
6. **Horizontal day scrolling.** Robert asked about scrolling days sideways. Deliberately deferred
   — it cannot be judged without real event volumes. Revisit after [01](./01-hejauppsala-event-dates.md).

**Stack — settled**: a single hand-written `index.html` plus CSS. No framework, no build step, no
dependencies. React was considered and deliberately deferred: v0 has no client state, so the
question is not yet due, and seeing how far vanilla carries this is an intentional experiment.
Revisit only when real interaction arrives. See [08 — Build pipeline and stack](./08-build-pipeline.md).

Deploy it. v0 is not done until it is on a URL reachable from Robert's phone.

No *"not interested"* affordance in v1 — dismissal is fogged. Do not design for it, but avoid a
layout that makes adding it painful later.
