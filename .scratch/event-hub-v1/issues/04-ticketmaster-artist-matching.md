# 04 — Match a personal artist list against Ticketmaster events in Sweden

Type: research
Status: open
Blocked by: 03, 05

## Question

Given a list of followed artists and a Ticketmaster Discovery API key, how do we reliably answer
*"spelar några av mina favoritband snart?"* for **all of Sweden**?

Work out:

1. **Query shape.** Is it one request per artist, or one broad `countryCode=SE` sweep filtered
   locally? With a few hundred artists and a 5,000/day quota, per-artist queries are affordable —
   but a single sweep of upcoming SE events may be cheaper *and* catch name variations. Compare.
2. **Identity matching.** Ticketmaster has `attractionId`s. Fuzzy name matching against a Spotify
   export will produce false positives ("Låpsley" vs "Lapsley") and misses (different
   transliterations, "&" vs "and", tribute acts named after the real band). Is there a one-time
   resolution step that maps each Spotify artist to a Ticketmaster `attractionId`, so the daily
   build does exact-ID lookups instead of fuzzy matching?
3. **Coverage reality check.** Take a handful of artists from the real export and verify against
   known upcoming Swedish gigs. Quantify how much Ticketmaster actually misses — this directly
   informs the fogged question of whether Bandsintown is ever worth revisiting.
4. **Horizon.** Events sections use ~14 days, but gigs are worth knowing about months ahead
   because tickets sell out. Recommend a separate horizon for this section.

**Deliverable**: a concrete query strategy with request counts per build, a recommended matching
approach, and an honest assessment of coverage gaps.
