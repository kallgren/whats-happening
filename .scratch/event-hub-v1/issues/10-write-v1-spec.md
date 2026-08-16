# 10 — Assemble the v1 spec

Type: grilling
Status: open
Blocked by: 01, 02, 06, 07, 08, 09, 11

## Question

Write the spec that is this map's destination.

Every decision is made by the time this ticket is takeable. This ticket does not decide anything
new — it collects the resolved tickets into one document and checks the seams between them, which
is where gaps hide.

Because this effort ships progressively, v1 will already **exist** by the time this ticket is
takeable. The spec therefore documents what was built and why, rather than instructing someone to
build it from scratch — but it must still be complete enough to rebuild from. It covers:

- The three questions v1 answers, and the sections that answer them
- Each source: endpoint, request strategy, request count per build, failure mode
- The domain types and the timezone rule
- The page layout, referencing the prototype
- The build pipeline, schedule, secrets, and deploy target
- What is explicitly *not* in v1, and why — the map's **Out of scope** section carries this, and
  the spec should restate it so a builder does not helpfully add it back

Write it to `.scratch/event-hub-v1/spec.md`.

**Before closing**: re-read the map's Notes against the finished spec. If any standing preference
was quietly violated along the way — most likely "minimum work" or "never touch it again" — say so
plainly rather than shipping a spec that has drifted from what Robert asked for.
