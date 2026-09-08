# 08 — One document, and the view swap that replaces navigating

Type: task
Status: open
Blocked by: 06

## Question

Robert, seeing the finished feature ahead of the deploy gate: *"theres some flashing when navigating
between the views — cant we do like this: load both views immediately and just let javascript decide
which one to show? so n and h simply swap the view out with javascript? instead of actually
navigating to a different path. i think we can scratch the whole /network path, just have it all in
one."*

**The premise is correct**, and the map already knows why. [01](./01-network-route-and-hotkeys.md)
built a `history.back()` hop precisely to avoid this repaint, and the *Not yet specified* entry on it
records that the hop fires but **Arc refuses the bfcache restore** — so what Robert sees is a genuine
document teardown and repaint. The `max-age` fix underneath it removes the *request*, not the flash.
Nothing short of a single document removes the flash.

Deferred by Robert on 2026-09-08 rather than built: *"ok just fix the icons and ill come back to the
navigation at some other point."* It sits behind [06](./06-prod-deploy.md) because the deploy is the
thing that answers whether the page earns its place at all, and because prod is the only place the
bfcache question can actually be settled.

### What the first grilling round already settled — do not re-derive

Four of the five questions were put to Robert and are still open, but the reasoning is worth keeping:

1. **The notes must not become hostage to the scraper.** Today `/network` is a static file and the
   serverless function never runs for it, so a dead hejauppsala, a thrown `api/index.ts` or a cold
   function that dies costs Robert the hub and *nothing else*. Merging puts the notes inside a
   document produced by four fetches against three third parties. Recommended mitigation: keep
   `public/network.html` on disk as an unlinked **lifeboat** — it already exists and already works
   over the same store — rather than deleting it for tidiness.
2. **The path and the navigation come apart.** "Scratch the /network path" probably means scratch the
   *navigation*. Recommended: `history.pushState` keeps the real URL (bookmarks, history, the phone's
   home screen) while no navigation ever happens, with `vercel.json` rewriting `/network` to `/api`
   so a hard load of that URL serves the merged document with the notes view already up. The
   alternatives are no URL at all, or a `#natverk` hash.
3. **Eager, as asked — but server-render the notes shell inert.** ~70 KB of it is SortableJS. A swap
   that has to wait for a script to mount the grid is the same flash wearing a different hat.
4. **The staleness the merge creates.** The hub says *uppdaterad HH:MM* and is browser-cached for 5
   minutes; today bouncing to notes and back re-checks it. A document that never navigates can sit
   open all day claiming a freshness it no longer has. Recommended: accept for v1.

Unasked, because they hang on (2): what the back button does (`popstate`), whether `document.title`
swaps between *Uppsala* and *Nätverk*, and how [02](./02-notes-store-and-inline-editing.md)'s
corrupt-store freeze scopes to the notes view without ever reaching the hub.

### Also in scope, because this is the moment they resolve

- **The bfcache hop becomes dead code and can go** — both copies, plus the duplicated hotkey handler
  in `lib/page.ts` and `public/network.js` that only exists because the two pages must not share a
  runtime dependency. One document is the event that retires that duplication; the *Not yet
  specified* entries on both should close with it.
- **The map's standing preference that `/network` is a static file** is the thing this ticket
  overturns. It cannot be quietly dropped — whatever lands here rewrites it in the map's Notes.

### Done when

`n` and `h` swap the view with no repaint, and the map's Notes say what replaced the static-file
guarantee.
