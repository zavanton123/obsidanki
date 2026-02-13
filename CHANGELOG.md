# Changelog

## 1.0.0

- **Deck + inline notes**: When a note has **deck** in frontmatter **and** contains inline notes, only the inline notes are created (in that deck); the whole-note Basic card is not created. When deck is set but there are no inline notes, the single Basic card is created as before.
- **Inline begin/end defaults**: Default markers changed from STARTI/ENDI to **««** and **»»**.
- **Custom inline markers**: Custom "Begin Inline Note" and "End Inline Note" values now work: defensive defaults when building the regex, content can span newlines, fresh RegExp per use (no shared `lastIndex`). Migration ensures both keys exist in Syntax settings.
- **File link on Back**: With "Add File Link" on, the Obsidian link is appended at the **end of the Back** field instead of the Front.

## 0.0.3

- **Plugin identity**: Renamed to Obsidanki; plugin id set to `obsidanki` so it can be installed alongside the original Obsidian_to_Anki.
- **Flashcards from notes**: One **Basic** card per note when **deck** is set in frontmatter. Front = note name or `anki-front`; back = body without frontmatter and without first H1.
- **Frontmatter**: Configurable property names (Anki Deck, Anki Tags, Anki Card Front, Anki Card ID). Hierarchical deck/tags: use `/` in frontmatter, sent to Anki as `::`.
- **Inline notes**: Unchanged; begin/end markers for Basic, Cloze, etc.
- **Settings**: Syntax, Defaults (Tag, Add File Link), Actions (clear caches), Ignored File globs. Removed: scan directory (always full vault), default Deck, scheduling, folder table, note type table, custom regex, Begin/End Note, Frozen Fields, Add Context, CurlyCloze toggles, Add Obsidian Tags.
- **Defaults**: Default tag = empty; Add File Link = on.
- **Docs**: README updated to match behavior.

## 0.0.2

- Earlier release. Base fork with Obsidian–Anki sync and inline notes.
