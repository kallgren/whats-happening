# 03 — Register a Ticketmaster developer account and get an API key

Type: task
Status: resolved
Blocked by: —

## Question

Nothing to decide — this unblocks the band-gig research, which cannot be done without a key.

Register at the [Ticketmaster Developer Portal](https://developer.ticketmaster.com/) and obtain a
Consumer Key for the **Discovery API v2**.

Known facts:

- Registration is self-serve; the default application and Consumer Key are created instantly.
- Free quota: **2 requests/second, 5,000 requests/day** — far beyond what a daily build needs.
- Sweden (`countryCode=SE`) is covered.
- Use the **Discovery API**, *not* the International Discovery API — Ticketmaster has stopped
  issuing keys for the latter and recommends Discovery for new integrations.

This is HITL: Robert must create the account himself.

**Record in the answer**: where the key is stored (it must end up as a **GitHub Actions secret**,
never committed), and the exact secret name the build will read. Do not paste the key into this
file or into the map.

## Answer

**Closed as out of scope**, not done. Robert deferred the band section entirely while resolving
[08 — Build pipeline and stack](./08-build-pipeline.md); the placeholder card and its link-outs
stay on the page unchanged. Ticketmaster is now a future effort, not part of this map. See the
map's *Out of scope*.
