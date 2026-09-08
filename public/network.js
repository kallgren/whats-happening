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

import { load, save, newNote, rawText } from "/store.js";

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

/** The live document. Array order is the user's order (ticket 04 reorders it);
    this array is what gets written verbatim on every save. */
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
  why.textContent = reason + " Sidan skriver ingenting så länge, så texten nedan finns kvar orörd.";
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

/* --- start --- */

const opened = load();
if (opened.ok) {
  notes = opened.notes;
  mount();
} else {
  fail(opened.reason, opened.raw);
}
