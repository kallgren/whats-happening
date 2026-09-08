# 06 — The prod deploy

Type: task
Status: resolved
Blocked by: 05, 07

## Question

Nothing left to decide, and nothing left to build: with [05](./05-export-and-import.md) in, every
part of the agreed v1 surface exists and works against `vercel dev`. This ticket is the map's
**deploy gate** — the one Robert moved to the end of the effort while testing
[01](./01-network-route-and-hotkeys.md): *"no prod deploy until I've tested it myself. we'll
probably do prod deploy when the whole feature is in place."*

It exists as a ticket rather than as a line in the Notes because the destination is not "the feature
is built" but **"live and in daily use"**, and an undeployed page is neither. Leaving it implicit
would let the map close with its own destination unreached.

### The work

- **HITL first.** Robert runs `npm start` and uses the page for real: writes actual notes, drags
  them into an order he means, exports, and looks at the file. Ticket by ticket he has seen pieces;
  this is the first time the whole thing is in front of him at once.
- Then one `vercel --prod`, and the same pass against the deployed URL — the route, the two hotkeys,
  a note, a drag, an export.
- **The one thing that only prod can answer**: the bfcache hop. `vercel dev` has no CDN, so the
  `max-age` fix from 01 behaves differently there. Five minutes in plain Chrome and in Safari on the
  phone settles the *Not yet specified* item about whether the hop engages anywhere at all.

### Done when

The page is live, Robert has notes in it, and the next question the map asks is his to answer: does
the Network tab earn its place?

## Answer

**The page is live at https://whats-happening-ashy.vercel.app and the gate is closed.** Deployment
`whats-happening-mkun7bt66`, one `vercel --prod` from a clean `main`.

### What shipped with it

The deploy carried one change that was not in 01–07: the `/network` header was **trimmed of its
subtitle and its whole footer** at Robert's request, immediately before deploying. The footer held
the `h` hint-that-is-also-a-link and the localStorage warning; his reasoning is that he is the only
reader and does not want either reminder on every visit. The consequence he accepted explicitly:
**/network → hub is now `h` or the back button, with no tappable link**, which matters on a phone —
and it makes the hint asymmetric, since the hub keeps its `n` line. Nothing in `style.css` went dead
with the removal (the hub still renders `.sub`, `.pagefoot`, `.hotkey` and `<kbd>`); what did need
saying is that the shared `.pagehead h1` carries a `.15rem` bottom margin purely to clear the `.sub`
line, so `network.css` now zeroes it on this page alone. Commit `a6f0500`.

### The bfcache hop, which only prod could answer

Answered, and it is the reason this ticket existed as a gate rather than a Notes line. Robert tested
the deployed page in the **docked Safari web app on macOS** and reports the hop working with *"very
minimal flashing, thats good enough for now."*

So the `max-age=300` floor from [01](./01-network-route-and-hotkeys.md) does its job in production,
where `vercel dev` structurally could not show it — there is no CDN locally. The residual flash is
real but small. This does **not** retire
[08](./08-one-document-view-swap.md): one document still removes the repaint entirely rather than
shrinking it, and 08 was deferred past this gate rather than made conditional on it. What the result
changes is 08's *urgency*, not its case — the hop is tolerable, so 08 is now an improvement rather
than a fix.

### The deploy chain — the finding that outlives this ticket

Checking after the fact turned up something the map did not record: **the Vercel project is already
git-connected** to `github.com/kallgren/whats-happening` with `productionBranch: "main"`. A push to
`main` triggers a production deploy on its own; the CLI deploy was never necessary.

It had never fired because **`main` was ten commits ahead of `origin`** — the entire effort, from
the charting commit through today's cleanup, existed only on Robert's laptop. Every deployment in
the project's history is attributed to the CLI user rather than to a git event, which is the visible
symptom of the same thing. For the window between the CLI deploy and the push, production was
serving code that existed nowhere but the laptop and Vercel's build cache.

**From here on, deploying to prod is `git push` on `main`.** Recorded as a standing preference on
the map. `vercel --prod` keeps one narrow use: deploying the working tree rather than a commit,
which is not usually what anyone wants.

### Done when — met

The page is live and Robert has it docked. The next question is his and not a ticket's: does the
Network tab earn its place? It sits in *Not yet specified*, where the map has always kept it.
