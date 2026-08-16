# 07 — Build v0: the link hub

Type: prototype
Status: resolved
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

## Comments

**2026-08-16 — v0 page built at `index.html`, deploy outstanding.**

Built from the layout prototype, with one deliberate change: **skeletons instead of fake rows**.
The prototype's approach — plausible fake events marked `FEJK` — asked the reader to keep
remembering that "Livemusik på Katalin" was invented. Grey placeholder bars can't be misread at
all, and they still fix the shape for a later fill. Point 2 of this ticket ("keep it obviously
fake") resolves to *show no content at all*, not *show marked-up fake content*.

What shipped:

1. **Section order.** Weather is a skeleton strip in the header band, beside the title — present,
   never competing. Then *Vad händer*, then *På bio*, then *Dina band*. On desktop, events in the
   main column with the two link cards in a sticky right sidebar.
2. **Skeletons only where data is coming into a shape.** Weather and events have them. *På bio* and
   *Dina band* are heading + link chips with no skeleton: until they hold data they are link lists,
   and drawing rows there implied more than v0 has.
3. **One event view: Spalter.** The prototype's three-way picker (grid / slices / list) was built
   and then cut back to horizontal day slices, the view worth testing against real data. Note the
   picker is gone with it, so the `:target`/`:has()` CSS switching is gone too. Below 60rem slices
   stack into a plain day-grouped list — which is what the dropped "Lista" view was, so mobile lost
   nothing.
4. **Effectively zero JavaScript.** One inline script sets today's date, because a hardcoded date
   in a build-step-less file is wrong by tomorrow. It fails safe: no script, no date line, page
   intact. Moves to render time at [08 — Build pipeline and stack](./08-build-pipeline.md).
5. All outgoing links open in new tabs. Added **GigWhere** alongside Ticketmaster and Songkick.

**Not decided here, despite the ticket asking:** *empty vs broken* (point 5). Everything currently
reads as "loading forever", and nothing on the page says otherwise — the explanatory text was
deliberately removed. The first ticket to land real data must make a quiet week look different
from a failed source.

Still open before this ticket resolves: **deploy to a URL reachable from Robert's phone**.

## Answer

**v0 is live at https://whats-happening-events.vercel.app** — the page described in the comment
above, on a real URL, reachable from a phone. This ticket is resolved.

**Hosting is Vercel, not GitHub Pages** — a deliberate change to the map's standing preference,
made while resolving this ticket. Pages *was* set up first and worked, but a GitHub project site
inherits the account's user-level custom domain: it served at `robertkallgren.com/whats-happening/`,
and Robert does not want this hanging off his personal domain. There is no way to opt a project site
out of that domain while keeping Pages. The Pages site has been **deleted**; that URL now 404s.

How it is deployed, and the facts later tickets depend on:

- **Vercel project `whats-happening`** under scope `kallgrens-projects`. No framework, no build
  step — `index.html` at the repo root is served as-is.
- **The production URL is `whats-happening-events.vercel.app`**, added as a *project domain* so it
  follows the latest production deployment. This matters: the project's auto-generated
  `whats-happening-ashy.vercel.app` also still resolves, and deployment-specific URLs
  (`whats-happening-<hash>-kallgrens-projects.vercel.app`) sit behind **Vercel Authentication** and
  serve a login wall, not the page. Only the two project domains are public. Never hand out or
  hardcode a deployment-specific URL.
- **Site root is `/`**, unlike the Pages subpath, so root-absolute asset paths are safe here.
- **`.vercelignore`** keeps `.scratch`, `docs`, `prototype` and `CLAUDE.md` out of the upload.
  `vercel link` added `.vercel` and `.env*.local` to a new `.gitignore`.
- **Deploy is `vercel deploy --prod --yes`** from the repo root. **Git integration is not
  connected** — `vercel git connect` fails, most likely because the Vercel GitHub App is not
  installed on this repo. Connecting it (a dashboard step, Robert only) would make every push to
  `main` deploy automatically.
- **The repo is public** and `.scratch/` — this map and its tickets — is public with it. Consistent
  with the standing preference that nothing here is secret, but worth knowing before an API key
  lands anywhere near the tree. Keys go in CI secrets, never in the repo.

**Consequence for [08 — Build pipeline and stack](./08-build-pipeline.md)**, which assumed Pages:
a scheduled Action can no longer publish by committing to `main` and letting the host notice. Two
options, deliberately left to 08: **connect Vercel's Git integration**, so the Action commits the
regenerated `index.html` and the push deploys with no credentials anywhere; or have the Action run
`vercel deploy --prod` directly with a `VERCEL_TOKEN` secret. The first keeps the "no expiring
tokens" preference intact and is the reason to fix the Git connection.

Point 5 of this ticket — **empty vs broken** — remains undecided and is inherited by whichever
research ticket first lands real data. Recorded in the map's *Not yet specified*.
