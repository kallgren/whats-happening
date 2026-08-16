# 09 — Data model across the three sections

Type: grilling
Status: open
Blocked by: 01, 02, 06, 14, 15

## Question

What are the domain types, and do the three sections share one?

The three sections come from three genuinely different shapes:

- **Event** (hejauppsala): one occurrence, one date range, a venue, categories.
- ~~**Gig** (Ticketmaster)~~ — **cut from v1 by [08](./08-build-pipeline.md)**; the band section is
  out of scope and ships as link-outs only. Two shapes remain, which weakens the case for a
  supertype further still.
- **Film** (Filmstaden): a title with *many* showtimes, ranked by showing count. It is not an
  occurrence at all, and forcing it into an Event shape is precisely what makes existing
  aggregators unusable.

**Amended by images.** [14](./14-event-thumbnails.md) and [15](./15-film-posters.md) each add an
image to their type, which is the *first* attribute the two remaining shapes genuinely share — and
they share it with different guarantees. An event's image is always present and arbitrarily
proportioned; a film's poster is sometimes absent and a uniform portrait. Whether that is one
nullable field on a supertype or two unrelated fields is now a live part of this ticket's question
rather than a detail, which is why both block it.

Decide:

1. **One `Event` supertype, or three independent types?** Strong prior: **three types.** They are
   never merged in the UI, so a shared supertype would buy nothing and cost precision. Argue it
   properly rather than assuming.
2. **Vocabulary.** Settle the canonical terms and write them into `CONTEXT.md`. Sources are
   Swedish and the UI will be Swedish — decide whether the code speaks Swedish or English, and be
   consistent. Note that *event* is already overloaded (a hejauppsala event, a Ticketmaster event,
   and the generic sense).
3. **Time.** All-day vs timed events, multi-day ranges (hejauppsala shows `"12 aug - 30 aug"`, so
   ranges are real), and how a 30-day exhibition behaves in a 14-day day-grouped list — it must not
   appear in all 14 groups. This is the most likely source of ugly bugs.
4. **Identity.** A stable per-item id, needed both for deduplication and for the fogged dismissal
   feature later. hejauppsala gives a WordPress post id; Ticketmaster gives an event id. Films may
   need a synthesised one.
5. **Timezone.** Everything is `Europe/Stockholm`, but SMHI returns UTC and the build runs on a
   UTC runner. Pin this explicitly — it is the classic silent bug.

Uses `/grilling` and `/domain-modeling`. Blocked because the real shapes are unknown until the
research tickets report actual payloads.
