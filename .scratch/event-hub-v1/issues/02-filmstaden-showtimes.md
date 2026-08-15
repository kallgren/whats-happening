# 02 — Get Uppsala cinema showtimes

Type: research
Status: open
Blocked by: —

## Question

How do we get **film showtimes for Filmstaden Uppsala**, cheaply and without a fragile scraper?

Probing found the obvious paths are defended:

- `https://www.filmstaden.se/api/cinemas` → **403**
- `https://www.filmstaden.se/api/v2/movies` → **403**
- `api.filmstaden.se` → does not resolve
- `robots.txt` → 200 (read it; it may disclose real API paths)

The 403s look like bot protection or wrong paths rather than genuine absence — Filmstaden's own
site is a SPA and must be calling *something*. Determine which, and whether it is reachable with
plain headers.

Investigate, in order:

1. What XHR/fetch calls the Filmstaden site actually makes when browsing Uppsala showtimes
   (the browser tools are available for this). Capture the real endpoint, params and headers.
2. Whether those endpoints work server-side with a normal `User-Agent`, or whether the 403 is
   Cloudflare-style protection that a scheduled GitHub Action cannot pass.
3. Fallbacks if Filmstaden is genuinely closed: `bio.se`, Google/JustWatch showtimes, or the
   individual Uppsala cinema sites (Fyrisbiografen, Slottsbiografen, Bio Regina).

**Ranking is already decided**: top 5 films by **number of showings this week**. Confirm the chosen
source actually carries enough data to compute that — it needs per-film showtime counts, not just
a "now showing" list.

**Also decide here**: which cinemas the *link-out* points at. v1 pulls data from Filmstaden only,
but the link should give easy access to all Uppsala cinemas — one link to a listing that covers
them, or several links.

**Deliverable**: a working request that returns Uppsala showtimes, or a clear finding that
Filmstaden is closed plus a recommended alternative source. Flag explicitly if the only viable
route is browser automation, since that is incompatible with a static scheduled build and would
force this section to be reconsidered.
