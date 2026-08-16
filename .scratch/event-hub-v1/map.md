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
the page is live at **https://robertkallgren.com/whats-happening/**. Every remaining ticket upgrades
one link on that live page into real data, in place. They can proceed in any order, or in parallel;
[08 — Build pipeline and stack](./issues/08-build-pipeline.md) is due as soon as the first of them
is ready to land data.

**Domain**: personal event aggregation, Uppsala, Sweden. Single user (Robert). Swedish-language sources.

**Skills every session should consult**: `/grilling` and `/domain-modeling` by default.
`/research` for the research tickets. `/prototype` for the layout ticket.

**Standing preferences for this effort** — these are settled and should not be re-litigated:

- **Minimum work, 80/20.** Every decision resolves toward less to build and less to maintain.
- **"Build it and never touch it again."** The feared cost is *sources breaking*, not state.
  Prefer no runtime, no database, no auth, no expiring tokens.
- **Static site + scheduled GitHub Action, published to Vercel.** No server. A broken source
  surfaces as a failed workflow email. The URL is public; nothing here is secret. *Amended by
  [07](./issues/07-hub-page-layout.md)*: the host was GitHub Pages until v0 shipped, but a Pages
  project site is forced onto the account's user-level custom domain (`robertkallgren.com`), which
  Robert rejected. The *shape* — static file, no runtime, scheduled regeneration — is unchanged;
  only the host moved.
- **Vanilla HTML/CSS/JS, no framework, for as long as it holds.** Considered and rejected React for
  now — v0 has no client state whatsoever, so the decision is not yet due, and how far vanilla
  carries this is a deliberate experiment. Repeated rows are templating, not a framework concern:
  a "component" here is a function returning a string. Revisit only when real interaction arrives
  and vanilla stops paying — converting one page later is a couple of hours, and by then it is a
  decision against known requirements rather than predicted ones.
- **Render to static HTML at build time**, whatever the eventual stack. The page must arrive as
  complete HTML; a broken script must never cost Robert the page.
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
- **Band gigs** in Sweden for a configured artist list, via **Ticketmaster Discovery API**
- **Link out to Facebook Events** for manual browsing — no scraping

Each of the first four ships as a **link first**, then upgrades to live data. The Facebook link is
permanent and never upgrades.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [07 — Build v0: the link hub](./issues/07-hub-page-layout.md) — **v0 is live at
  https://whats-happening-events.vercel.app**. Single hand-written `index.html` at the repo root,
  served by **Vercel** — GitHub Pages was set up, then dropped because a project site inherits the
  account's custom domain and Robert does not want this on `robertkallgren.com`. Weather strip in
  the header, then *Vad händer* (horizontal day slices, stacking to a list under 60rem), *På bio*,
  *Dina band*. Skeletons, not fake rows, where data will land. Deploy is `vercel deploy --prod`;
  Git integration is not connected yet, which [08](./issues/08-build-pipeline.md) must resolve.

## Not yet specified

In scope, but not yet sharp enough to ticket:

- **Dismissal / "not interested".** Wanted eventually; needs client-side state on a static site
  (localStorage) and a stable per-event identity. Deferred until v1 is in real use, since the
  right shape depends on how noisy the feed actually turns out to be.
- **Whether hejauppsala alone is enough.** Destination Uppsala, Uppsala City, kalender.se and
  uppsala.se all exist and are unexplored. Only worth surveying if v1 proves thin in practice.
- **How source failures surface, and empty vs broken on the page.** A failed Action emails, but a
  source that silently returns zero rows does not. Today every section reads as "loading forever",
  which will be indistinguishable from a quiet week the moment data lands. Left undecided by
  [07 — Build v0](./issues/07-hub-page-layout.md) (its point 5) and inherited by whichever research
  ticket first lands real data.
- **Whether the day-slice view survives contact with real data.** v0 ships horizontal day slices
  above 60rem, stacking to a day-grouped list below. Whether slices beat the plain list — and how
  many days fit before it stops scanning — only becomes decidable once event volumes are visible.
  Revisit after [01 — hejauppsala event dates](./issues/01-hejauppsala-event-dates.md).
- **Whether the page ever needs a framework.** Deliberately deferred, not settled. v0 has no client
  state. The trigger to revisit is real interaction — dismissal, filters, view toggles — outgrowing
  vanilla JS, most likely during the LLM-ranking effort. Decide then, against real requirements.
- **Ticketmaster's real coverage of small Uppsala venues**, and whether the gap is big enough to
  justify revisiting Bandsintown later.

## Out of scope

Ruled beyond this destination. Returns only as a fresh effort, not a resumption.

- **LLM prose-taste relevance ranking.** The agreed design — Robert writes a paragraph describing
  what he likes, an LLM scores each event at ingest, ranking not hiding. **This is the intended
  next effort**, deliberately deferred so real needs emerge from using v1 first.
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
