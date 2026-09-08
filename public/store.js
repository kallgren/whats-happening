/* The store: the single versioned JSON document that *is* the Network feature.
   Every note lives in one localStorage key, and nothing else on this page
   persists anything.

   Kept deliberately apart from the rendering (network.js). This module is the
   thing a future sync replaces — "PUT this blob" instead of a rewrite — so it
   knows about notes and localStorage and nothing about the DOM. See the map's
   standing preference on localStorage being knowingly one-browser.

   The whole document is rewritten on every save. It is a few kilobytes of text
   and localStorage writes are synchronous and tiny; a partial-update scheme
   would buy nothing and cost the guarantee that what is on disk is always a
   complete, valid document. */

/** One key, one document. The key never changes — the `version` *inside* the
    document is what moves, so an old browser's data is always findable. */
const KEY = "whats-happening:network";

/** Bumped when the shape of a note or of the document changes. Present from day
    one precisely so there is something for a future import, merge or sync to
    stand on — a document with no version is a document you cannot safely read
    in two years. */
export const VERSION = 1;

/** Stable ids, because array position is the user's ordering (ticket 04) and
    therefore cannot also be identity. */
function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "n-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/** A note is a title plus free-form multiline text, and nothing else. The
    generality is the point — see the map's glossary. */
export function newNote() {
  return { id: newId(), title: "", body: "" };
}

/** Every field checked, because a half-valid document is the case that silently
    eats data: a note missing `body` renders as empty and then saves that
    emptiness back over the real text on the next keystroke. */
function isNote(n) {
  return n
    && typeof n === "object"
    && typeof n.id === "string" && n.id !== ""
    && typeof n.title === "string"
    && typeof n.body === "string";
}

/**
 * Bring an older document up to VERSION. Identity today — there is only one
 * version — but the seam exists now so that the day there are two, the change
 * is a case in this switch rather than a decision about where migration lives.
 *
 * Returns null when the document cannot be migrated, which the caller must
 * treat as corruption rather than as "start empty".
 */
function migrate(doc) {
  if (doc.version === VERSION) return doc;
  // A document from the *future* — written by a newer deploy, then opened in a
  // stale tab or an old cached page. Refusing it is the only safe move: we
  // cannot know what we would be dropping, and writing our shape back over it
  // would destroy whatever the newer version added.
  if (doc.version > VERSION) return null;
  return null; // no older versions exist yet
}

/**
 * Read a document out of text: the single definition of what this page is
 * willing to accept.
 *
 * Split out of `load` for ticket 05's import, and that split is the point — an
 * importer carrying its own validator is a second opinion about what a valid
 * document is, and two opinions drift. An imported file passes exactly the
 * checks a reload passes, so a file the page accepts is a file the page can
 * re-open.
 *
 * Returns `{ ok: true, notes }` or `{ ok: false, reason }`. The caller supplies
 * the context: `load` attaches the raw bytes, the importer names the file.
 *
 * Note what it does *not* do: it never repairs, and it never keeps the parts it
 * did understand. A document is accepted whole or refused whole — a
 * half-applied read is the failure that looks like success.
 */
export function parse(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: "Innehållet är inte giltig JSON." };
  }

  if (!doc || typeof doc !== "object" || !Number.isInteger(doc.version) || !Array.isArray(doc.notes)) {
    return { ok: false, reason: "Innehållet har fel form." };
  }

  const migrated = migrate(doc);
  if (!migrated) {
    return {
      ok: false,
      reason: doc.version > VERSION
        ? `Sparat av en nyare version (${doc.version}) än den här sidan förstår (${VERSION}).`
        : `Okänd version: ${doc.version}.`,
    };
  }

  if (!migrated.notes.every(isNote)) {
    return { ok: false, reason: "En eller flera anteckningar har fel form." };
  }

  /* Ids are identity — see newId, which says so precisely because position is
     the user's ordering and therefore cannot also be identity. Two notes
     sharing an id is not a cosmetic flaw: the next lookup by id finds one of
     them twice and the other never, which reorders a note away and silently
     drops its twin. Unreachable through this page's own writes; reachable the
     moment a file arrives, because a hand-edited backup, or two exports someone
     tried to merge with a text editor, is exactly how it happens. */
  const ids = new Set(migrated.notes.map((n) => n.id));
  if (ids.size !== migrated.notes.length) {
    return { ok: false, reason: "Två anteckningar har samma id." };
  }

  return { ok: true, notes: migrated.notes };
}

/**
 * Read the store.
 *
 * Returns `{ ok: true, notes }`, or `{ ok: false, reason, raw }` when the
 * stored value exists but cannot be read. **An absent key is `ok` with no
 * notes — a corrupt one is not.** That distinction is the whole contract: a
 * first run and a destroyed document look identical if you treat both as empty,
 * and the caller's job on `ok: false` is to say so loudly and *not write*, so
 * that the raw text is still there to be recovered by hand.
 */
export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    // Private-mode Safari and blocked-storage settings throw on access rather
    // than returning null. Not corruption, but not usable either.
    return { ok: false, reason: "Webbläsaren tillåter inte lagring på den här sidan.", raw: null };
  }

  if (raw === null) return { ok: true, notes: [] };

  const read = parse(raw);
  // The raw bytes ride along on failure and only on failure: they are the
  // recovery path — the banner prints them and the export saves them — and
  // there is nothing to recover from a document that read cleanly.
  return read.ok ? read : { ...read, raw };
}

/**
 * Write the whole document. Array order is the user's order, so the caller's
 * array is written verbatim.
 *
 * Returns false when the write failed — a full quota, or storage denied. The
 * caller has to surface that: a save that silently does nothing is the same
 * failure as corruption, just later.
 */
export function save(notes) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, notes }));
    return true;
  } catch (e) {
    return false;
  }
}

/** For export (ticket 05) and for the recovery text on a corrupt load: the
    exact bytes on disk, not a re-serialisation of what we managed to parse. */
export function rawText() {
  try {
    return localStorage.getItem(KEY);
  } catch (e) {
    return null;
  }
}
