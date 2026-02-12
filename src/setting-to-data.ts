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
    result.INLINE_REGEXP = new RegExp(escapeRegex(settings.Syntax["Begin Inline Note"]) + String.raw`(.*?)` + escapeRegex(settings.Syntax["End Inline Note"]), "g")
    result.deckFrontmatterProperty = settings.Syntax["Deck Frontmatter Property"] ?? "deck"
    result.tagsFrontmatterProperty = settings.Syntax["Tags Frontmatter Property"] ?? "tags"
    result.frontFrontmatterProperty = settings.Syntax["Front Frontmatter Property"] ?? "anki-front"
    result.idFrontmatterProperty = settings.Syntax["ID Frontmatter Property"] ?? "anki-id"
    result.idDeletePostfix = settings.Syntax["ID Delete Postfix"] ?? "-delete"

    //Just a simple transfer
    result.curly_cloze = settings.Defaults.CurlyCloze
    result.highlights_to_cloze = settings.Defaults["CurlyCloze - Highlights to Clozes"]
    result.add_file_link = settings.Defaults["Add File Link"]
    result.add_obs_tags = settings.Defaults["Add Obsidian Tags"]
    result.ignored_file_globs = settings.IGNORED_FILE_GLOBS ?? [];

    return result
}
