# Obsidanki

Obsidian plugin that syncs markdown notes to Anki as flashcards. Uses frontmatter and optional inline syntax. **Separate from the original Obsidian_to_Anki** (plugin id: `obsidanki`), so you can install both in the same vault if needed.

## Requirements

- [Obsidian](https://obsidian.md/)
- [Anki](https://apps.ankiweb.net/) with [AnkiConnect](https://git.foosoft.net/alex/anki-connect)

## Setup

1. Install Anki and AnkiConnect; open your desired Anki profile.
2. In Anki: **Tools → Add-ons → AnkiConnect → Config**. Set `webCorsOriginList` to include `app://obsidian.md` and `http://localhost`, e.g.:

*_-_
json
{
    "apiKey": null,
    "apiLogPath": null,
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOrigin": "http://localhost",
    "webCorsOriginList": [
        "http://localhost",
        "app://obsidian.md"
    ]
}
*_-_

3. Restart Anki.
4. In Obsidian: **Settings → Community plugins → Browse**, search for **Obsidanki** (or install manually from releases), enable it.
5. With Anki running, open Obsidanki settings once so the plugin can fetch note types from Anki.

To sync: use the **Anki icon** on the left ribbon or the **Scan Vault** command. The plugin scans the **entire vault** (no scan-directory setting).

---

## How flashcards are created

### 1. One Basic card per note (frontmatter deck)

If a note has the **deck** property in its frontmatter, the note becomes **one Basic card**:

- **Front**: Note name (file name without `.md`), or the value of **anki-front** in frontmatter if set.
- **Back**: Note body **without** the frontmatter block and **without** the first `# Heading` line (formatted as HTML).

**Example note** `My Topic.md`:

*_-_
deck: "Learning/Science"
tags: [biology, review]
anki-front: "What is photosynthesis?"
*_-_

# Photosynthesis

Photosynthesis is the process...

→ One Basic card: front = "What is photosynthesis?", back = "Photosynthesis is the process..." (HTML).

### 2. Inline notes (any note type)

Use the inline markers (default **««** and **»»**; configurable in settings). Format:

`«« [NoteType] FrontContent BackContent »»`

- **NoteType** must match an Anki note type (e.g. `Basic`, `Cloze`).
- For **Cloze**, all of these work: `{{c1::cloze}}`, `{cloze}`, `==cloze==`.

**Examples:**

- Basic: `«« [Basic] Capital of France Paris »»`
- Cloze: `«« [Cloze] The capital is {{c1::Paris}}. »»` or `{Paris}` or `==Paris==`
- Optional: add `Tags: tag1 tag2` and `ID: 123` at the end for sync/edits.

---

## Frontmatter

| Property (default name) | Purpose |
|-------------------------|--------|
| **deck** (Anki Deck Property) | **Required** for creating a Basic card from the note. Value is the target Anki deck. |
| **tags** (Anki Tags Property) | Tags applied to the card(s). Array or space-separated string. |
| **anki-front** (Anki Card Front Property) | Override for the Basic card front; if missing, note name is used. |
| **anki-id** (Anki Card ID Property) | Sync ID written back after adding to Anki. To delete the note in Anki, set e.g. `anki-id: 123-delete` (with your configured delete postfix). |

**Hierarchical deck/tags:** Use slashes in frontmatter (e.g. `deck: "Learning/Science"`). The plugin sends them to Anki with `::` (e.g. `Learning::Science`).

Property **names** can be changed in **Settings → Obsidanki → Syntax Settings** (Anki Deck Property, Anki Tags Property, etc.).

---

## Settings

- **Syntax Settings** – Frontmatter property names and inline markers (Begin/End Inline Note, ID Delete Postfix).
- **Defaults** – Default tag added to new cards (default: empty), and **Add File Link** (default: on) to append an Obsidian link to the card.
- **Actions** – Clear Media Cache; Clear File Hash Cache.
- **Ignored File Settings** – Glob patterns so certain files are not scanned (e.g. `**/*.excalidraw.md`, `Templates/**`). See [glob syntax](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax); you can test patterns at [globster.xyz](https://globster.xyz/).

---

## Features

- **One Basic card per note** when `deck` is set in frontmatter (front = note name or anki-front, back = body without frontmatter and first H1).
- **Inline notes** for any Anki note type (Basic, Cloze, etc.) with `«« [Type] ... »»`.
- **Cloze support**: `{{c1::...}}`, `{...}`, `==...==` in Cloze inline notes.
- **Deck and tags** from frontmatter; hierarchical format (slash in frontmatter → `::` in Anki).
- **Sync and delete**: anki-id in frontmatter for updates; anki-id with delete postfix for deletion.
- **Ignore files** via glob patterns.
- **Markdown, math, images, audio, links** in note content (rendered in Anki).
- **File link**: optional link back to the Obsidian note on the card.

---

## Manual install

1. Download the latest `obsidanki.zip` from [Releases](https://github.com/zavanton123/obsidanki/releases).
2. Unzip into your vault’s `.obsidian/plugins/` folder so that the folder is named **obsidanki** (and contains `main.js`, `manifest.json`, `styles.css`).
3. Enable **Obsidanki** in **Settings → Community plugins**.

---

For more detail and examples, see the [Wiki](https://github.com/zavanton123/obsidanki/wiki).
