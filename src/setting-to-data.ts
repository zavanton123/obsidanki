import { PluginSettings, ParsedSettings } from './interfaces/settings-interface'
import { App } from 'obsidian'
import * as AnkiConnect from './anki'
import { escapeRegex, toAnkiDeckName } from './constants'

export async function settingToData(app: App, settings: PluginSettings, fields_dict: Record<string, string[]>): Promise<ParsedSettings> {
    let result: ParsedSettings = <ParsedSettings>{}

    //Some processing required
    result.vault_name = app.vault.getName()
    result.fields_dict = fields_dict
    result.custom_regexps = settings.CUSTOM_REGEXPS
    result.file_link_fields = settings.FILE_LINK_FIELDS
    result.template = {
        deckName: toAnkiDeckName("Default"),
        modelName: "",
        fields: {},
        options: {
            allowDuplicate: false,
            duplicateScope: "deck"
        },
        tags: [settings.Defaults.Tag]
    }
    result.EXISTING_IDS = await AnkiConnect.invoke('findNotes', {query: ""}) as number[]

    //RegExp section (Begin/End Note and Frozen Fields removed; use never-match so code paths stay intact)
    result.FROZEN_REGEXP = /(?!)/g
    result.NOTE_REGEXP = /(?!)/g
    const beginInline = (typeof settings.Syntax["Begin Inline Note"] === "string" && settings.Syntax["Begin Inline Note"].trim())
        ? settings.Syntax["Begin Inline Note"].trim()
        : "««"
    const endInline = (typeof settings.Syntax["End Inline Note"] === "string" && settings.Syntax["End Inline Note"].trim())
        ? settings.Syntax["End Inline Note"].trim()
        : "»»"
    // [\s\S]*? matches any character including newlines (dot does not in JS)
    result.INLINE_REGEXP = new RegExp(escapeRegex(beginInline) + String.raw`([\s\S]*?)` + escapeRegex(endInline), "g")
    result.deckFrontmatterProperty = settings.Syntax["Anki Deck Property"] ?? "deck"
    result.tagsFrontmatterProperty = settings.Syntax["Anki Tags Property"] ?? "tags"
    result.frontFrontmatterProperty = settings.Syntax["Anki Card Front Property"] ?? "anki-front"
    result.idFrontmatterProperty = settings.Syntax["Anki Card ID Property"] ?? "anki-id"
    result.idDeletePostfix = settings.Syntax["ID Delete Postfix"] ?? "-delete"

    //Just a simple transfer
    result.add_file_link = settings.Defaults["Add File Link"]
    result.ignored_file_globs = settings.IGNORED_FILE_GLOBS ?? [];

    return result
}
