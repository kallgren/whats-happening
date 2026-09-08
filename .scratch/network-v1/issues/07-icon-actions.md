# 07 — Icons for export and import

Type: task
Status: resolved
Blocked by: 05

## Question

Robert, on seeing the whole page at once ahead of the deploy gate: *"can we swap text for icons in
the import export buttons?"*

Cosmetic on its face, but it collides with a decision [05](./05-export-and-import.md) made
deliberately. Those two buttons are not ordinary secondary actions: when the store is corrupt the
grid is hidden, every save path is blocked, and **they are the only two controls left on the page**
— export is the rescue (it writes the damaged bytes to a file before anything can touch them) and
import is the recovery. Today they say *Exportera* and *Importera* in words at exactly the moment
someone is reading the page in a panic. Icon-only takes those words away.

So the question is not "which glyphs" but **what carries the recovery once the labels are gone**.

Two options were put to Robert:

- **(a)** Icons always, and the freeze banner is rewritten to name the recovery in words itself.
- **(b)** Icons normally, reverting to text labels while the page is frozen.

Robert chose **(a)**: *"q4 a, agree."* Two rendering modes for one button is more machinery than the
problem deserves, and the banner is the thing that actually gets read.

### The work

- Replace the two labels with inline SVG. **Inline, not an icon font and not a sprite file** — the
  same reason SortableJS is vendored: this page has no build step and must not gain a runtime
  dependency on a fetch that can fail. A freeze banner whose recovery buttons render as empty
  squares because a font 404'd is the exact failure this ticket must not create.
- The Swedish words move to `aria-label` and `title`, so the button is still named for a screen
  reader and still hoverable.
- Rewrite the freeze banner's second line so the recovery is stated in words: export first, then
  import a working file.

### Done when

The header shows two icons, hovering names them, a screen reader names them, and the freeze banner
tells you what to press without relying on the icons to explain themselves.

## Answer

Both header buttons are now inline SVG — a down-arrow into a tray for export, an up-arrow out of one
for import — with the Swedish words moved to `aria-label` and `title` rather than deleted. `.act`
became a circle instead of a pill: with no label to sit around, the horizontal padding had nothing
to do, so the button is sized from the glyph and centred with `display: grid`, which also avoids the
inline-baseline wobble a lone `<svg>` in a `<button>` otherwise gets. The glyphs are drawn in
`currentColor`, so the existing `:hover` rule recolours the icon along with the border and the SVG
never learns the accent's name.

**The half of this that is not cosmetic is the freeze banner.** Option (a) traded the labels for a
banner that says the recovery out loud, so `fail()`'s second line now names both the action and the
glyph: export first — *pilen ned uppe till höger* — then import a working file. The frozen branch of
the import confirm got the same treatment, since it also told Robert to "tryck Exportera" for a
button that no longer says so. The words did not disappear; they moved to the two places that are
actually read when they matter.

Inline SVG rather than an icon font or a sprite, for the same reason SortableJS is vendored: no
build step, and no fetch that can fail. On a page where these two buttons are the only recovery from
a corrupt store, rendering them as empty squares because a font 404'd is the one failure that would
have made this change a net loss.
