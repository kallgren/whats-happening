# 06 — The prod deploy

Type: task
Status: open
Blocked by: 05

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
