# 05 — Export the followed-artist list from Spotify, once

Type: task
Status: resolved
Blocked by: —

## Question

Nothing to decide — the approach is settled: **seed once from Spotify, then maintain by hand.**

A live Spotify integration is explicitly out of scope: OAuth refresh tokens expire and would
violate "build it and never touch it again". A committed file breaks never.

Produce a checked-in file (e.g. `data/artists.json`) listing Robert's followed Spotify artists.
Route options, cheapest first:

1. Spotify's own [privacy data export](https://www.spotify.com/account/privacy/) — no code, but
   takes days to arrive and may not include follows in a usable shape.
2. A one-off script against `GET /v1/me/following?type=artist` using a temporary token from the
   [Spotify Web API console](https://developer.spotify.com/documentation/web-api) — fastest, and
   the token is discarded immediately after.
3. Typing the list by hand, if the follow list turns out to be short.

**Record in the answer**: the file path, its schema, how many artists it contains, and the exact
steps to regenerate it later — that regeneration procedure is the whole point of doing this as a
task rather than a live integration.

Keep both the Spotify artist name **and** its Spotify ID in the file; the ID may help disambiguate
during Ticketmaster matching. See
[04 — Ticketmaster artist matching](./04-ticketmaster-artist-matching.md).

## Answer

**Closed as out of scope**, not done. Robert deferred the band section entirely while resolving
[08 — Build pipeline and stack](./08-build-pipeline.md); the placeholder card and its link-outs
stay on the page unchanged. Ticketmaster is now a future effort, not part of this map. See the
map's *Out of scope*.
