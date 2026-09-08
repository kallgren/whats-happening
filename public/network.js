/* The Network page: the `h` hotkey back to the hub, and the notes themselves.
 *
 * Ticket 01 built the hotkey half; ticket 02 added everything below the
 * HOTKEY / NOTES divide. The store lives in store.js — this file is the DOM
 * and nothing else.
 *
 * This is a module (see the <script type="module"> in network.html), which is
 * how store.js is a separate file with no build step. Modules are deferred, so
 * the DOM is parsed by the time anything here runs.
 */

import { load, parse, save, newNote, rawText } from "/store.js";

/* ==================================================================== HOTKEY */

/** True while focus is anywhere text goes: a note, or any future input. */
function editing() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return /^(input|textarea|select)$/i.test(el.tagName);
}

/**
 * Go to `path` — but as a *history traversal* when that is where we just came
 * from, rather than as a fresh navigation.
 *
 * The difference is the whole feature. `location.href = "/"` re-fetches and
 * re-renders the hub, which is a server-rendered scrape: an edge-cache hit at
 * best, a ~2.5 s scrape at worst, and a fresh document either way. A
 * `history.back()` restores the page from the browser's back/forward cache —
 * the live document, frozen, with its scroll position and its open <details>
 * intact. No request, no reload, no flash.
 *
 * `document.referrer` is what makes the choice safe: we only go back when the
 * previous entry really is the page we want. Opened cold in a new tab, or
 * arrived at from anywhere else, and this falls through to a plain navigation.
 *
 * Deliberately no timeout fallback around `history.back()`. A pending timer is
 * *paused* when the page is frozen into the bfcache and fires on the way back
 * in, so a "did the back() work?" safety net is precisely a way to fire a
 * spurious navigation later. The referrer check is the guard instead.
 */
function hop(path) {
  let from = null;
  try { from = new URL(document.referrer); } catch (e) { /* empty or opaque */ }
  if (from && from.origin === location.origin && from.pathname === path && history.length > 1) {
    history.back();
  } else {
    location.href = path;
  }
}

/**
 * The guard is the substance of the handler. Every note is a contenteditable,
 * so an unguarded single-letter hotkey would navigate away the moment Robert
 * types an "h" into a name — the fastest way to build a feature that eats your
 * work.
 *
 * Shared in shape with the hub's inline `n` handler, deliberately duplicated
 * rather than factored into a file both pages load: the hub must not gain a
 * runtime dependency on an external script it can fail to fetch. See the map's
 * "whether the hub and Network should share more than CSS" — this is that
 * question's first concrete instance.
 */
document.addEventListener("keydown", (e) => {
  if (e.key !== "h" || e.isComposing || e.defaultPrevented) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (editing()) return;
  hop("/");
});

/* ===================================================================== NOTES */

const grid = document.getElementById("notes");
const emptyHint = document.getElementById("empty");
const banner = document.getElementById("trouble");

/** The live document. Array order is the user's order — set by dragging, see
    saveOrder — and this array is what gets written verbatim on every save. */
let notes = [];

/** Set when the page must not write: a corrupt load, or a failed save. The
    load-bearing half of "fail loudly" is refusing to overwrite — a banner that
    explains the damage while the next keystroke saves an empty document over
    the evidence would be worse than no banner at all. */
let frozen = false;

/**
 * Show a failure and stop writing.
 *
 * A corrupt or unreadable store must never look like a first run: silently
 * starting from empty is indistinguishable from data loss, and by the time
 * Robert notices, the autosave has made it real. So the grid is left out of
 * the page entirely, the reason is stated, and the raw text is put on screen
 * where it can be copied out and repaired by hand — it is JSON, and the notes
 * inside it are readable even when the wrapper is not.
 *
 * Ticket 07 made this banner load-bearing in a way it was not before. The two
 * header buttons are the only controls that survive a freeze, and they no
 * longer carry their words — so the recovery has to be spelled out *here*,
 * naming both the action and the glyph. This is the half of the icon change
 * that is not cosmetic: the words did not get deleted, they moved to the one
 * place that is read when they matter.
 */
function fail(reason, raw) {
  frozen = true;
  banner.hidden = false;
  banner.innerHTML = "";

  const h = document.createElement("p");
  h.textContent = "Anteckningarna kunde inte läsas — inget sparas nu.";
  banner.append(h);

  const why = document.createElement("p");
  why.className = "why";
  why.textContent =
    reason +
    " Sidan skriver ingenting så länge, så texten nedan finns kvar orörd." +
    " Spara undan den med Exportera — pilen ned uppe till höger — och återställ sedan" +
    " med Importera, pilen upp bredvid, från en fil som fungerar.";
  banner.append(why);

  if (raw) {
    const pre = document.createElement("pre");
    pre.className = "rawdump";
    pre.textContent = raw;
    banner.append(pre);
  }

  grid.hidden = true;
  emptyHint.hidden = true;
}

/**
 * The way back out of `fail`, and the only one.
 *
 * There is exactly one thing that can honestly clear a freeze: a whole, valid
 * document arriving to replace the unreadable one — which is a successful
 * import and nothing else. Notably *not* a retry button: rereading the same
 * bytes gives the same answer, so a page that offers to try again is offering
 * to fail again.
 *
 * Undoes `fail` completely rather than partly. A banner left standing over a
 * working grid, or a `frozen` still true under one, is a page lying in the
 * other direction.
 */
function unfreeze() {
  frozen = false;
  banner.hidden = true;
  banner.innerHTML = "";
  grid.hidden = false;
}

/* --- saving ---
   Debounced while typing, unconditional on blur and on the way out. Robert
   should never think about saving; localStorage writes are synchronous and
   tiny, so the debounce is about not doing pointless work, not about cost. */

let saveTimer = null;
let dirty = false;

function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!dirty || frozen) return;
  if (save(notes)) {
    dirty = false;
  } else {
    // A failed write is corruption's quieter twin: everything keeps looking
    // fine and nothing is being kept. Freeze and say so.
    fail("Webbläsaren vägrade spara — lagringen kan vara full.", rawText());
  }
}

function touch() {
  if (frozen) return;
  dirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 300);
}

/* `pagehide`, never `unload`: an unload listener disqualifies the page from
   the bfcache, which is what makes `h`/`n` switch without a reload. `pagehide`
   is bfcache-safe and fires on freeze.

   `visibilitychange` alongside it because a mobile browser killing a
   backgrounded tab may never run `pagehide` at all — and it is the same
   bfcache-safe bargain. */
window.addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});

/* --- rendering ---
   Built once on load, then mutated per note. A full re-render on every
   keystroke would destroy the caret, which is the one thing an in-line editor
   may not do — so typing writes straight into the model and touches no DOM. */

/** Read a contenteditable back as plain text. `innerText` rather than
    `textContent` because the browser represents a line break as a <br> or a
    block, and only `innerText` renders those back into "\n". */
function readText(el) {
  // A contenteditable is happy to hand back U+00A0 where you typed a space —
  // invisible on screen, and a mismatch the first time anything searches or
  // compares this text.
  return el.innerText.replace(/\u00a0/g, " ");
}

/** Feature test rather than a version check: `plaintext-only` keeps rich paste
    and rich key commands out of the note in the first place. Where it is
    missing we fall back to a plain editable — the paste handler below is what
    actually holds the line in both cases. */
const PLAINTEXT = (() => {
  const probe = document.createElement("div");
  try { probe.contentEditable = "plaintext-only"; } catch (e) { return false; }
  return probe.contentEditable === "plaintext-only";
})();

function editable(cls, placeholder) {
  const el = document.createElement("div");
  el.className = cls;
  el.contentEditable = PLAINTEXT ? "plaintext-only" : "true";
  el.spellcheck = false;
  el.dataset.placeholder = placeholder;
  return el;
}

function markEmpty(el, value) {
  el.classList.toggle("is-empty", value === "");
}

function cardFor(note) {
  const card = document.createElement("article");
  card.className = "note";
  card.dataset.id = note.id;

  /* A non-editable strip along the top of every card. It carries the delete
     button — and it is also the handle ticket 04 needs: SortableJS refuses to
     start a drag from a contenteditable target, so a card made entirely of
     editable text has nowhere to grab. */
  const bar = document.createElement("div");
  bar.className = "note-bar";

  const del = document.createElement("button");
  del.type = "button";
  del.className = "note-del";
  del.title = "Ta bort anteckningen";
  del.setAttribute("aria-label", "Ta bort anteckningen");
  del.textContent = "×";
  bar.append(del);

  const title = editable("note-title", "Rubrik");
  title.textContent = note.title;
  markEmpty(title, note.title);

  const body = editable("note-body", "Skriv något…");
  body.textContent = note.body;
  markEmpty(body, note.body);

  card.append(bar, title, body);
  return card;
}

/* The "+" tile is a real cell of the same grid rather than a button above it —
   it lines up with the cards because it *is* one of them. It sits at the *end*,
   so it reads as the next empty slot rather than as a toolbar. Rendering
   therefore inserts cards ahead of it and leaves the tile itself alone.
   Ticket 04 excludes it from dragging with Sortable's `draggable` selector. */
const addTile = document.getElementById("add");

function mount() {
  for (const card of grid.querySelectorAll(".note")) card.remove();
  for (const note of notes) grid.insertBefore(cardFor(note), addTile);
  syncEmptyHint();
  markAllClipped();
}

/* Which cards are cut off by the cap, and so should wear the fade. It has to be
   measured rather than guessed: whether a note overflows depends on how its
   lines wrap, which depends on the column width. Cheap enough to redo on every
   keystroke — it is a read of two numbers per card. */
function markClipped(card) {
  const body = card.querySelector(".note-body");
  card.classList.toggle("is-clipped", body.scrollHeight > body.clientHeight + 1);
}

function markAllClipped() {
  for (const card of grid.querySelectorAll(".note")) markClipped(card);
}

/* Resizing rewraps every note, so the answer changes for cards nobody touched.
   Coalesced to one pass per frame — a drag of the window edge fires this
   continuously. */
let clipFrame = null;
window.addEventListener("resize", () => {
  if (clipFrame) return;
  clipFrame = requestAnimationFrame(() => { clipFrame = null; markAllClipped(); });
});

function syncEmptyHint() {
  emptyHint.hidden = frozen || notes.length > 0;
}

function noteOf(el) {
  const card = el.closest(".note");
  if (!card) return null;
  return notes.find((n) => n.id === card.dataset.id) || null;
}

/* --- editing --- */

/* One delegated listener for the whole grid rather than two per card: the grid
   gains and loses cards, and per-card listeners are a leak waiting for the
   day a note is removed while a timer still points at it. */
grid.addEventListener("input", (e) => {
  const el = e.target;
  const note = noteOf(el);
  if (!note) return;

  const value = readText(el);
  if (el.classList.contains("note-title")) note.title = value;
  else if (el.classList.contains("note-body")) note.body = value;
  else return;

  markEmpty(el, value);
  markClipped(el.closest(".note"));
  touch();
});

/* Blur saves unconditionally — the moment Robert's attention leaves the note is
   the moment the debounce must not still be pending. */
grid.addEventListener("focusout", flush);

/* Paste is where a note stops being plain text if you let it. Strip to text in
   both the plaintext-only and the fallback case: one browser's "plain" paste
   still carries newlines and non-breaking spaces we would rather normalise
   ourselves. */
grid.addEventListener("paste", (e) => {
  const el = e.target;
  if (!el.isContentEditable) return;
  e.preventDefault();
  const text = (e.clipboardData ? e.clipboardData.getData("text/plain") : "").replace(/\r\n?/g, "\n");
  if (!text) return;
  document.execCommand("insertText", false, text);
});

/* Enter in a title should leave the title, not grow it into a second line: a
   title is one line by definition, and the next thing you want to type is the
   body. */
grid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.shiftKey) return;
  const el = e.target;
  if (!el.classList || !el.classList.contains("note-title")) return;
  e.preventDefault();
  const body = el.closest(".note").querySelector(".note-body");
  placeCaretAtEnd(body);
});

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/* --- creating and deleting --- */

/* A new note appears where the "+" was — at the end, which is where the click
   happened and so where the eye already is. This follows the tile: were "+"
   first, the same argument would put new notes first. Order is the user's to
   change from here (ticket 04). */
addTile.addEventListener("click", () => {
  if (frozen) return;
  const note = newNote();
  notes.push(note);
  const card = cardFor(note);
  addTile.before(card);
  syncEmptyHint();
  touch();
  placeCaretAtEnd(card.querySelector(".note-title"));
});

/* There is no undo — Robert chose a confirm over an undo-toast — which makes
   this dialog the only thing standing between a click and a lost list. So it
   names the note it is about to destroy. */
grid.addEventListener("click", (e) => {
  const button = e.target.closest(".note-del");
  if (!button || frozen) return;
  const note = noteOf(button);
  if (!note) return;

  const name = note.title.trim() || note.body.trim().split("\n")[0].trim();
  const what = name ? `"${name.slice(0, 60)}"` : "den tomma anteckningen";
  if (!confirm(`Ta bort ${what}? Det går inte att ångra.`)) return;

  notes = notes.filter((n) => n.id !== note.id);
  button.closest(".note").remove();
  syncEmptyHint();
  dirty = true;
  flush();
});

/* --- reordering (ticket 04) --- */

/* SortableJS, vendored into public/ and loaded as a plain script before this
   module — window.Sortable, no import. See the <script> comment in
   network.html and research/03-drag-and-drop.md.

   Two options and no more:

   `draggable: ".note"` keeps the "+" tile out of the drag. It is the last cell
   of the grid rather than a note, and a tile you can shuffle into the middle
   would read as one.

   No `handle`, and none is needed: Sortable refuses outright to start a drag
   whose mousedown landed on a contenteditable target, so the note text is for
   selecting and everything else on the card — the top strip, the padding — is
   for grabbing. That split comes for free, which is the finding ticket 03 was
   written to establish. The CSS only has to say so with a cursor. */
let sortable = null;

function enableDragging() {
  // Guarded because there are now two ways in: the normal load, and a recovery
  // import that mounts a grid the failed load never mounted (see unfreeze). A
  // second Sortable over the same element binds a second set of listeners and
  // saves the order twice per drop.
  if (sortable) return;
  sortable = Sortable.create(grid, {
    draggable: ".note",
    animation: 150,
    onUpdate: saveOrder,
  });
}

/**
 * Persist the order the drag just produced.
 *
 * The DOM is read back as the record of the new order rather than the
 * `oldIndex`/`newIndex` Sortable hands us: reconstructing the array from a pair
 * of indices is arithmetic we would get to write and get wrong, and the grid
 * already holds the answer. Read straight off `dataset.id` rather than through
 * `sortable.toArray()` so the store stays independent of the library.
 *
 * The array *is* the order — see the store's note on ids being identity
 * precisely because position is not — so this reorders `notes` in place and
 * saves the whole document, the same write every other mutation makes.
 */
function saveOrder() {
  if (frozen) return;

  const byId = new Map(notes.map((n) => [n.id, n]));
  const reordered = [];
  for (const card of grid.querySelectorAll(".note")) {
    const note = byId.get(card.dataset.id);
    // A card with no note behind it should be impossible; dropping it silently
    // would quietly delete a note, so leave the model alone and say nothing was
    // reordered rather than write a document we cannot account for.
    if (!note) return;
    reordered.push(note);
  }
  if (reordered.length !== notes.length) return;

  notes = reordered;

  // Sortable can drop a card past the "+" tile even though the tile itself is
  // not draggable. The model above is already right either way, but the tile
  // must go back to being the last cell or it stops reading as the next empty
  // slot.
  grid.append(addTile);

  // Not `touch()`: a drop is a finished gesture, not a keystroke mid-word, so
  // there is nothing to debounce.
  dirty = true;
  flush();
}

/* --- export and import (ticket 05) --- */

/* The notes live in one browser and nowhere else, and clearing site data
   destroys them with no warning and no undo. These two buttons are the only
   protection they have — a backup habit, not a sync feature; the map is
   explicit that following Robert to his phone is a different question and out
   of this effort's scope.

   Both stay live while the page is frozen, which is the opposite of every other
   control here. That is deliberate and it is the point: a corrupt store is
   exactly when a copy of the bytes matters most, and importing a good backup
   over a broken document is the only recovery this page can offer. The freeze
   exists to stop *incidental* writes — a keystroke, a debounce — not a
   deliberate, confirmed replacement. */

const exportButton = document.getElementById("export");
const importButton = document.getElementById("import");
const filePicker = document.getElementById("importfile");

/** Swedish declines the noun, so a bare `${n} anteckningar` reads as broken the
    one time it matters most — the confirm dialog standing in front of a
    destructive act. */
function countNotes(n) {
  return n === 1 ? "1 anteckning" : `${n} anteckningar`;
}

/** Local time, not UTC: this name is read by a human deciding which of two
    files is the newer one, and the answer has to match the clock on his wall.
    Minutes, not just the date, because the ticket asks that successive backups
    not collide and "twice on the same afternoon" is the normal case for a
    habit — a browser resolving that with "(1)" leaves two files whose order is
    guesswork. ASCII throughout; a filename is not the place to find out how a
    filesystem feels about "ä". */
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * Save `text` as `name`.
 *
 * An <a download> clicked and thrown away, which is the whole of the platform's
 * "hand the user a file" story. The object URL is revoked on the next turn of
 * the loop rather than immediately: the click only *starts* the download, and
 * revoking in the same tick has historically raced it.
 */
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Export: the store's own bytes, verbatim.
 *
 * `rawText()` rather than a re-serialisation of `notes`, so the file *is* the
 * store rather than this page's opinion of it. Three things follow from that,
 * and all three are the reason for it: the round trip is byte-exact, an
 * unreadable document can still be saved (there is nothing to serialise from —
 * `notes` is empty when frozen), and the export cannot invent a document that
 * was never stored.
 *
 * `flush()` first, because the debounce means the last word typed may still be
 * 300 ms away from disk, and a backup missing the thing you just wrote is a
 * backup that has quietly failed at its one job.
 */
function exportStore() {
  flush();

  const text = rawText();
  if (text === null) {
    // No key at all: a browser that has never held a note, or one that refuses
    // storage. Writing an empty document to a file would be worse than saying
    // so — it is a live grenade, indistinguishable later from a real backup and
    // capable of wiping a real store on import.
    alert("Det finns inget att exportera ännu.");
    return;
  }

  download(`natverk-${stamp()}.json`, text);
}

/**
 * Import: replace everything, or change nothing.
 *
 * Replace rather than merge, per the map — merging needs conflict rules that
 * cannot be written before there are two devices to conflict, and inventing
 * them now would be inventing a sync feature nobody has asked for. Replacing is
 * the honest MVP semantic, and the confirm says so in those words.
 *
 * The order below is the substance: **validate, then confirm, then write.** The
 * file is checked against `parse` — the same rules a reload runs, so anything
 * accepted here is re-openable — before Robert is asked anything, so a bad file
 * costs a dialog he never sees rather than a "replace everything?" he answers
 * yes to and then loses to a syntax error. And the write is one `setItem` of a
 * fully-built document: it either lands or leaves the old value alone. There is
 * no state in which half a file has been applied.
 */
async function importFile(file) {
  let text;
  try {
    text = await file.text();
  } catch (e) {
    alert("Filen kunde inte läsas. Inget har ändrats.");
    return;
  }

  const read = parse(text);
  if (!read.ok) {
    alert(`Filen kunde inte importeras: ${read.reason}\n\nInget har ändrats.`);
    return;
  }

  // What is at stake differs, so the question does. Frozen, the current
  // document is unreadable and its worth is unknown — the honest warning is
  // that the bytes on screen are about to go, and that Exportera is how to keep
  // them. Otherwise the cost is countable, so count it.
  const what = frozen
    ? `Importera ${countNotes(read.notes.length)}?\n\nDet skadade innehåll som visas på sidan skrivs över. Vill du behålla det, avbryt och tryck Exportera — pilen ned uppe till höger — först.`
    : `Importera ${countNotes(read.notes.length)}?\n\nAlla ${countNotes(notes.length)} som finns här nu tas bort. Det går inte att ångra.`;
  if (!confirm(what)) return;

  if (!save(read.notes)) {
    fail("Webbläsaren vägrade spara — lagringen kan vara full.", rawText());
    return;
  }

  // Only now is the model allowed to move: everything above could still have
  // backed out, and a `notes` that no longer matches what is on disk is the one
  // inconsistency this page has no way to notice.
  notes = read.notes;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  dirty = false;

  // Ordered: unfreeze before mount, because the empty hint asks whether the
  // page is frozen. A no-op on the ordinary path, and the recovery on the
  // frozen one — where this is also the first time the grid is built at all,
  // which is why enableDragging has to be idempotent.
  unfreeze();
  mount();
  enableDragging();
}

exportButton.addEventListener("click", exportStore);

importButton.addEventListener("click", () => filePicker.click());

filePicker.addEventListener("change", () => {
  const file = filePicker.files && filePicker.files[0];
  // Cleared unconditionally and up front: the input keeps its value, so picking
  // the same file twice — the obvious thing to do after cancelling the confirm
  // — fires no second `change` unless this is reset. Before the await, so the
  // reset cannot be skipped by an early return further down.
  filePicker.value = "";
  if (file) importFile(file);
});

/* --- start --- */

const opened = load();
if (opened.ok) {
  notes = opened.notes;
  mount();
  enableDragging();
} else {
  fail(opened.reason, opened.raw);
}
