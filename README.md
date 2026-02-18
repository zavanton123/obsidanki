# Obsidanki

Use this Obsidian plugin to create Anki cards from markdown notes in an easy way!

To create a card, just add a "deck" property and sync.

The "front" of the Anki card is the Obsidian note's name, while the "back" is the note's content.

This plugin is a fork of the famous [Obsidian_to_Anki plugin](https://github.com/ObsidianToAnki/Obsidian_to_Anki).

## Features

- **One Basic card per note** when `deck` is set in frontmatter (front = note name or anki-front, back = body without frontmatter and first H1).
- **Inline notes** for any Anki note type (Basic, Cloze, etc.) with `|> [Type] ... <|`.
- **Cloze support**: `{{c1::...}}`, `{...}`, `==...==` in Cloze inline notes.
- **Deck and tags** from frontmatter; hierarchical format (slash in frontmatter → `::` in Anki).
- **Sync and delete**: anki-id in frontmatter for updates; anki-id with delete postfix for deletion.
- **Ignore files** via glob patterns.
- **Markdown, math, images, audio, links** in note content (rendered in Anki).
- **File link**: optional link back to the Obsidian note on the card.


## What You Need

- [Obsidian](https://obsidian.md/) must be installed on your PC/Mac.
- Install the **Obsidanki** plugin 
- [Anki](https://apps.ankiweb.net/) is installed on your PC/Mac.
- [AnkiConnect](https://git.foosoft.net/alex/anki-connect) plugin is installed in Anki.


## How to Setup

1. Install Anki and AnkiConnect; open your desired Anki profile.
2. In Anki: **Tools → Add-ons → AnkiConnect → Config**. Set `webCorsOriginList` to include `app://obsidian.md` and `http://localhost`, e.g.:

```json 
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
```

3. Restart Anki.
4. In Obsidian: **Settings → Community plugins → Browse**, search for **Obsidanki** (or install manually from releases), enable it.
5. With Anki running, open Obsidanki settings to customize the settings to your needs.

## How to Install Obsidanki Manually

1. Download the latest `obsidanki.zip` from [Releases](https://github.com/zavanton123/obsidanki/releases).
2. Unzip into your vault's `.obsidian/plugins/` folder so that the folder is named **obsidanki** (and contains `main.js`, `manifest.json`, `styles.css`).
3. Enable **Obsidanki** in **Settings → Community plugins**.

## How to Sync Obsidian Notes with Anki Notes

To sync with Anki, you need to scan the obsidian vault.

To scan the vault (i.e. create new Anki note and update/delete existing ones):
- Click the Anki icon in the ribbon
- Call the "Obsidanki: Scan Vault" command

The plugin scans the **entire vault**.

## How to Create an Anki Note from an Obsidian Note

To create an Anki card from a markdown note, you only need to add a frontmatter property "deck" to the note, e.g.:

```
---
deck: Hobbies
---
```

## How to Create an Anki Note with Tags

You can also include tags, which will be added to Anki note as well, e.g.:

```
---
deck: Hobbies
tags:
  - anki
  - obsidian
---
```

## How to Create an Anki Note with Nested Deck and Nested Tags

Nested decks and tags are also supported, e.g.:

```
---
deck: Demo/Hobbies
tags:
    - misc/anki
    - misc/obsidian
---
```

## How to Create an Anki Card with a Custom "front" Text

When you sync the obsidian vault with Anki, a new Anki card of "Basic" type will be created. Its "front" will be the name of the note (its filename), the "back" of the card will be the whole content of the obsidian note.

You can set a custom name of the note in the "front" property, e.g.:

```
---
deck: Hobbies
front: "This is a custom name of the note"
---
```

## What is Anki-id Property

You can be sure that an Anki note is created, if you can see a new "anki-id" property in the frontmatter properties, e.g.:

```
---
deck: Hobbies
anki-id: 1771434828942
---
```

## How to Update an Anki Note

If you update the content of an obsidian note, the corresponding Anki card will also be updated after scanning.

## How to Delete an Anki Note

To delete an Anki note, you need to add a deletion postfix `-del` to the anki-id, e.g.:

```
deck: Hobbies
anki-id: 1771434828942-del
```

You need to scan the vault, if the note is successfully deleted, the "anki-id" property will be gone.

## How to Customize Property Names

You can change all these default values of all the properties in the settings:
- deck
- tags
- front
- anki-id
- -del

## How to Create Inline Anki Notes

You can also create inline notes (of Basic and Cloze types) using this syntax.

Use the inline markers (default `|>` and `<|`; configurable in settings). Format:

`|> [NoteType] Front: some_content Back: some_content <|`

- **NoteType** must match an Anki note type (e.g. `Basic`, `Cloze`).
- For **Cloze**, all of these work: `{{c1::cloze}}`, `{cloze}`, `==cloze==`.

**Examples:**

- Basic: `|> [Basic] Front: Capital of France Back: Paris <|`
- Basic: `|> [Basic] Capital of France Back: Paris <|`
- Cloze: `|> [Cloze] The capital is {{c1::Paris}}. <|`
- Cloze: `|> [Cloze] The capital is {Paris}. <|`
- Cloze: `|> [Cloze] The capital is ==Paris==. <|`

## Settings

- **Syntax Settings** – Frontmatter property names and inline markers (Begin/End Inline Note, ID Delete Postfix).
- **Defaults** – Default tag added to new cards (default: empty), and **Add File Link** (default: on) to append an Obsidian link to the card.
- **Actions** – Clear Media Cache; Clear File Hash Cache.
- **Ignored File Settings** – Glob patterns so certain files are not scanned (e.g. `**/*.excalidraw.md`, `Templates/**`). See [glob syntax](https://en.wikipedia.org/wiki/Glob_(programming)#Syntax); you can test patterns at [globster.xyz](https://globster.xyz/).

## Frontmatter Properties

| Property (default name) | Purpose |
|-------------------------|--------|
| **deck** (Anki Deck Property) | **Required** for creating a Basic card from the note. Value is the target Anki deck. |
| **tags** (Anki Tags Property) | Tags applied to the card(s). Array or space-separated string. |
| **anki-front** (Anki Card Front Property) | Override for the Basic card front; if missing, note name is used. |
| **anki-id** (Anki Card ID Property) | Sync ID written back after adding to Anki. To delete the note in Anki, set e.g. `anki-id: 123-delete` (with your configured delete postfix). |
