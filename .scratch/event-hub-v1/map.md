# Map: Uppsala Hub v1

Label: `wayfinder:map`

## Destination

A **buildable spec** for v1 of a personal, single-user "what's on in Uppsala" hub: one static page,
regenerated daily, that answers three questions at a glance and links out for everything else.
Done when someone (human or agent) can build it from the spec without further decisions.

The v1 hub is deliberately a **jump-off point**, not a complete product. Its job is to be valuable
immediately and to let real needs emerge from use rather than from speculation.

## Notes

**This effort carries execution, not just planning.** Overriding wayfinder's plan-don't-do default:
the strategy is **progressive replacement** — ship [07 — Build v0: the link hub](./issues/07-hub-page-layout.md)
first as a real, deployed page with outgoing links standing in for data, then let each research
ticket upgrade one link into live data in place. Tickets deliver working software, not only
decisions. [10 — Assemble the v1 spec](./issues/10-write-v1-spec.md) then documents what was built.

Why: it gives value on day one (gathering the links alone removes most of the friction), it removes
the critical path — no single research ticket can leave Robert with nothing — and it makes every
ticket independently shippable.

**v0 has shipped** — [07 — Build v0: the link hub](./issues/07-hub-page-layout.md) is resolved and
the page is live at **https://whats-happening-events.vercel.app**. Every remaining ticket upgrades
one link on that live page into real data, in place.

**The first section is live.** [11 — Ongoing events, and whether day slices survive real
volume](./issues/11-ongoing-events-and-day-slices.md) put **real hejauppsala events into the
Spalter view**, and in doing so built the server [08](./issues/08-build-pipeline.md) had only
specified. Progressive replacement is now literally true: there is a running renderer, and each
remaining section is a link waiting to be swapped for data in it.

That made two build tickets specifiable that were fog until then — they had no pipeline to land in.
Both are pure execution with every decision already made. **The first of them has landed**:
[12 — Weather strip](./issues/12-weather-strip.md) is resolved, so the header carries a real
forecast and the page has no skeletons left anywhere.
[13 — Top 5 on bio](./issues/13-films-top-five.md) is the remaining one, on the frontier.
[09 — Data model](./issues/09-data-model.md) is unblocked too, though 11 has already
answered a good part of it in code.

**Two of the three sections now hold real data.** After 13, every section that will ever hold data
does — and the only tickets left are the two that write it down (09, 10).

**The question the map rests on is now Robert's to answer, not a ticket's**: whether the hub is
useful enough to be worth finishing. One section of real data is on the page; living with it is
the only way to find out.

**Domain**: personal event aggregation, Uppsala, Sweden. Single user (Robert). Swedish-language sources.

**Skills every session should consult**: `/grilling` and `/domain-modeling` by default.
`/research` for the research tickets. `/prototype` for the layout ticket.

**Standing preferences for this effort** — these are settled and should not be re-litigated:

- **Minimum work, 80/20.** Every decision resolves toward less to build and less to maintain.
- **"Build it and never touch it again."** The feared cost is *sources breaking*, not state.
  Prefer no runtime, no database, no auth, no expiring tokens.
- **~~Static site + scheduled GitHub Action~~ → rendered at request time by a Vercel function.**
  *Amended twice.* By [07](./issues/07-hub-page-layout.md): the host was GitHub Pages, but a Pages
  project site is forced onto the account's user-level custom domain (`robertkallgren.com`), which
  Robert rejected — so the host moved to Vercel. Then by
  [08](./issues/08-build-pipeline.md): the *shape* moved too. There is no Action, no cron and no
  committed build output; a stateless function renders the page per request behind a one-hour CDN
  cache. This keeps the rationale below intact — no database, no auth, no expiring tokens, no
  secrets at all — while dropping the scheduler. The URL is public; nothing here is secret.
  A broken source no longer surfaces as a failed-workflow email but **on the page itself**.
- **Vanilla HTML/CSS/JS, no framework, for as long as it holds.** Considered and rejected React for
  now — v0 has no client state whatsoever, so the decision is not yet due, and how far vanilla
  carries this is a deliberate experiment. Repeated rows are templating, not a framework concern:
  a "component" here is a function returning a string. Revisit only when real interaction arrives
  and vanilla stops paying — converting one page later is a couple of hours, and by then it is a
  decision against known requirements rather than predicted ones.
- **The page must arrive as complete, server-rendered HTML.** No client-side fetching, no loading
  states; a broken script must never cost Robert the page. *Unchanged in substance by
  [08](./issues/08-build-pipeline.md)* — only *when* the render happens moved, from build time to
  request time.
- **Three distinct sections, never merged into one timeline.** They come from three separate
  questions and have three different data shapes.
- **Day-grouped vertical list, not a month grid.** ~14-day horizon.
- **Uppsala only** for events. **All of Sweden** for band gigs (worth travelling for).
- **Robert cannot yet specify his taste, and that is a design constraint.** Nothing in v1 may
  require him to declare preferences up front.

**The three questions v1 must answer** (Robert's own words):

1. *Vad händer just nu / i helgen / kommande vecka i min närhet som kan vara intressant?*
2. *Spelar några av mina favoritband snart?*
3. *Vilka filmer går på bio idag / nuförtiden?*

**The v1 surface**, agreed:

- Events from **hejauppsala.com**, day-grouped, + link out to hejauppsala
- **Weather**, coming 7 days as icons, from **SMHI** + link out to SMHI
- **Top 5 films** now showing in Uppsala (ranked by number of showings this week) + link out to cinemas
- ~~**Band gigs** in Sweden for a configured artist list, via **Ticketmaster Discovery API**~~ —
  **cut from v1 by [08](./issues/08-build-pipeline.md)**; the card stays as link-outs. See *Out of scope*.
- **Link out to Facebook Events** for manual browsing — no scraping

Each of the first three ships as a **link first**, then upgrades to live data. The Facebook link and
the band card are permanent link-outs and never upgrade. **v1 therefore answers two of Robert's
three questions with data, and the third with links.**

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [07 — Build v0: the link hub](./issues/07-hub-page-layout.md) — **v0 is live at
  https://whats-happening-events.vercel.app**. Single hand-written `index.html` at the repo root,
  served by **Vercel** — GitHub Pages was set up, then dropped because a project site inherits the
  account's custom domain and Robert does not want this on `robertkallgren.com`. Weather strip in
  the header, then *Vad händer* (horizontal day slices, stacking to a list under 60rem), *På bio*,
  *Dina band*. Skeletons, not fake rows, where data will land. Deploy is `vercel deploy --prod`;
  Git integration is not connected yet, which [08](./issues/08-build-pipeline.md) must resolve.

- [01 — Recover event start dates from hejauppsala](./issues/01-hejauppsala-event-dates.md) —
  **parse the rendered `/kalender/` listing**; the REST API, other namespaces and JSON-LD are all
  dead ends. The listing is already upcoming-only and date-sorted, 40/page, so a 14-day window
  costs **4 requests, ~2.4 MB, ~2.6 s** — the 5,302-event archive is never pulled. Dedupe by slug
  (pages overlap). The date badge's theme classes are the one brittle dependency; fail the build
  loudly when links outnumber parsed dates. Two real gotchas: **day-1 start dates are clamped**, so
  a running event looks like it starts today; and ~87 events fall in 14 days, median ~4/day with
  Saturday spikes to 14.

- [06 — SMHI 7-day forecast for Uppsala](./issues/06-smhi-forecast.md) — **`pmp3g` is retired**
  (2026-03-31, now 404); the product is **`snow1g` version 1**, same host and grammar, no auth.
  One request, 10.8 KB with `?parameters=air_temperature,symbol_code`. Horizon ~10 days but
  resolution degrades to 12-hourly, so **display 7**. `symbol_code` keeps `Wsymb2`'s 1–27 semantics.
  Collapse rule: 06:00–18:00 local, max symbol if any `>= 7` else median. CC BY 4.0 — the credit
  must state the data was modified. Under an hour of work, so weather stays in v1.

- [02 — Get Uppsala cinema showtimes](./issues/02-filmstaden-showtimes.md) — **Filmstaden is closed
  to us** (Cloudflare challenge on every path, all API subdomains NXDOMAIN), but it is not needed.
  Two GETs — **nfbio.se/biograf/uppsala?city=uppsala** (mainstream, 122 screenings, `?city=` is
  load-bearing) and **fyrisbiografen.se/kalendarium** (art-house, thin on Thursdays) — give exact
  per-film counts, so **top-5-by-showings survives unchanged**. The counts undercount titles also
  playing at Filmstaden: rank on them, never print them. Three link-outs, one per operator.

- [08 — Build pipeline and stack](./issues/08-build-pipeline.md) — **there is no build.** The page is
  rendered **at request time by a Vercel serverless function**, behind
  `s-maxage=3600, stale-while-revalidate=86400`. No Action, no cron, no committed output, **no
  secrets at all**. Client-side scraping was never possible — hejauppsala and nfbio send no CORS
  headers — so a server was forced; the win is that it deletes 07's unresolved deploy plumbing and
  makes the spike and the product the same artifact (`vercel dev` → `vercel deploy --prod`).
  TypeScript native on Vercel, one dependency (`node-html-parser`), CSS to a static file.
  **Failure shows on the page, not in email**: per-section `senast uppdaterad`, explicit
  `kunde inte hämta`, explicit quiet-week empty state, one dead source never costs the others. A
  scheduled watchdog was considered and rejected — Robert is the only consumer, so an alert can
  never beat him to it, and GitHub disables cron workflows in a repo quiet for 60 days, so it would
  switch itself off during exactly the calm it was meant to cover.

- [11 — Ongoing events, and whether day slices survive real volume](./issues/11-ongoing-events-and-day-slices.md) —
  **real hejauppsala events are on the page.** Long runs (**7+ days**) lift into their own
  *Pågår just nu* card **above** the slices; that takes day 1 from 23 to 15, the same band as a
  normal Saturday, so it stops being a special case. The cut is insensitive — every long run on
  day 1 spanned 14+ days, so 3 through 10 lift the identical events. **All 14 slices stay**, each
  scrolling internally so the Saturday spike (14 vs a median of 4) doesn't stretch the row.
  **No detail-page fetches ever**: they *are* the only way to see a clamped start, but at 605 KB
  each they'd cost ~14 MB to correct one card. Design is 07's prototype in its *Spalter* view;
  the three-view picker is dropped. This also **built the server 08 only specified** — with
  **zero runtime dependencies**, since parsing splits on the stable permalinks. New fact: the site
  publishes recurring events as **one post per occurrence** (117 posts, 98 titles), so dedupe by
  slug and never by title.

- [12 — Upgrade the weather strip to real SMHI data](./issues/12-weather-strip.md) — **the second
  section is live, and the last skeleton is gone from the page.** 06's research held up in every
  particular against a fresh live response. Four judgement calls settled while building: **emoji
  survive** (zero assets, zero bytes; the intensity and cloud-ramp precision they drop is recovered
  in `aria-label` and a `title="Halvklart, 16–22°"` on every cell); the **CC BY credit goes in a new
  page footer**, worded to say the data was *modified*, which the licence requires and the daily
  collapse makes true; **no per-section freshness stamp** — one render per request means both
  fetches share the header's existing `uppdaterad HH:MM`, and a second clock would imply a
  difference that does not exist; **slices past day 7 render an empty weather slot**, because a
  forecast that visibly stops is legible where a row of dashes reads as broken. A dead SMHI prints
  one quiet line in place of seven cells, link out intact, header uncollapsed. Amends 08's cache
  rule to three tiers — events failed 60 s, weather-only 300 s, healthy an hour — since retrying
  every minute to fix a strip of icons would re-scrape hejauppsala sixty times an hour.

## Not yet specified

In scope, but not yet sharp enough to ticket:

- **Whether hejauppsala's category taxonomy is worth surfacing beyond a label.** 01 found 17
  categories mixing three axes — genre, geography, editorial flags. 11 put two of them to work:
  `uppsala` is the geography filter (it drops 4 posts in 117) and the genre axis prints as the
  second half of each row's meta line. What is still open is whether genre earns anything *more* —
  a filter, a grouping, a quality signal. Now answerable from the live page rather than from data.

- **Dismissal / "not interested".** Wanted eventually; needs client-side state on a static site
  (localStorage) and a stable per-event identity. Deferred until v1 is in real use, since the
  right shape depends on how noisy the feed actually turns out to be.
- **Whether hejauppsala alone is enough.** Destination Uppsala, Uppsala City, kalender.se and
  uppsala.se all exist and are unexplored. Only worth surveying if v1 proves thin in practice.
- **Whether the Filmstaden gap is big enough to matter in practice.** v1 ranks films on two of
  Uppsala's cinemas, missing Luxe's 13 screens and Royal. Only visible once the top 5 is on the page
  and Robert can tell whether it matches what is actually on in town. See
  [02](./issues/02-filmstaden-showtimes.md).
- **Whether the page ever needs a framework.** Deliberately deferred, not settled. v0 has no client
  state. The trigger to revisit is real interaction — dismissal, filters, view toggles — outgrowing
  vanilla JS, most likely during the LLM-ranking effort. Decide then, against real requirements.
- **Whether the hub is useful enough to be worth finishing at all.** The one question the whole map
  rests on. [11](./issues/11-ongoing-events-and-day-slices.md) has now put it in front of Robert —
  real events, in the Spalter view, on the live page — but only use answers it, so it stays here
  until it does. 12 and 13 are worth building either way; 09 and 10 are the ones that would be
  wasted if the answer is no.
- **Whether the second week of the horizon earns its keep.** 11 kept all 14 slices rather than
  cutting to 7, on the grounds that the far end is where plannable things live. That is a
  prediction about how Robert reads the page, and the page can now check it.
  [12](./issues/12-weather-strip.md) sharpened the question without answering it: the forecast
  reaches 7 days, so the back half of the fortnight is now visibly thinner than the front — same
  events, no weather. If the second week is worth keeping, it has to be worth keeping like that.

<!-- Ticketmaster coverage of small Uppsala venues moved to Out of scope with the band section -->


## Out of scope

Ruled beyond this destination. Returns only as a fresh effort, not a resumption.

- **Band gigs / Ticketmaster, and everything feeding them.** Cut from v1 while resolving
  [08](./issues/08-build-pipeline.md): Robert deferred the section outright. It carried the design's
  only API key, its only secret, and its only source needing a curated input list from him — so
  cutting it makes v1 secretless. The card and its link-outs (Ticketmaster, Songkick, GigWhere) stay
  on the page permanently, the same treatment the Facebook link gets. Closed with it, undone rather
  than resolved: [03 — Ticketmaster API key](./issues/03-ticketmaster-api-key.md),
  [04 — Artist matching](./issues/04-ticketmaster-artist-matching.md),
  [05 — Export Spotify artists](./issues/05-export-spotify-artists.md). This is a strong candidate
  for the effort *after* the LLM-ranking one.

- **LLM prose-taste relevance ranking.** The agreed design — Robert writes a paragraph describing
  what he likes, an LLM scores each event at ingest, ranking not hiding. **This is the intended
  next effort**, deliberately deferred so real needs emerge from using v1 first.
- **Filmstaden as a data source.** Cloudflare managed challenge on every path, no reachable API
  subdomain; only headless-browser challenge-solving gets in, which the static build cannot host and
  which is the exact maintenance liability this map avoids. v1 links out to
  `filmstaden.se/uppsala/` instead. See [02](./issues/02-filmstaden-showtimes.md).
- **Facebook event scraping.** No legitimate API path; Graph API covers only assets you own.
  Scraping is brittle, against ToS, and a permanent maintenance tax. v1 links out instead.
- **Bandsintown API.** Gated behind a partnership program restricted to artists and their
  representatives. Revisit only if Ticketmaster coverage proves inadequate in real use.
- **Month calendar grid.** More work, bad on mobile, mostly empty squares. The day-grouped list
  answers "vad händer i helgen" better.
- **Multi-user, auth, hosting scale.** Single user, permanently.
- **General Stockholm-area events.** Band gigs are Sweden-wide; everything else is Uppsala only.
- **Live Spotify integration.** OAuth tokens expire — a one-off export violates nothing and
  breaks never. See [05 — Export Spotify artist list](./issues/05-export-spotify-artists.md).
- **Film ratings / TMDB.** A whole extra integration for a nice-to-have.
