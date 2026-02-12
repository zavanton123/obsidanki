import { FIELDS_DICT } from './field-interface'
import { AnkiConnectNote } from './note-interface'

export interface PluginSettings {
	CUSTOM_REGEXPS: Record<string, string>,
	FILE_LINK_FIELDS: Record<string, string>,
	Syntax: {
		"Begin Inline Note": string,
		"End Inline Note": string,
		"Deck Frontmatter Property": string,
		"Tags Frontmatter Property": string,
		"Front Frontmatter Property": string,
		"ID Frontmatter Property": string,
		"ID Delete Postfix": string
	},
	Defaults: {
		"Tag": string,
		"Add File Link": boolean,
		"CurlyCloze": boolean,
		"CurlyCloze - Highlights to Clozes": boolean,
		"Add Obsidian Tags": boolean
	},
	IGNORED_FILE_GLOBS:string[]
}

export interface FileData {
	//All the data that a file would need.
	fields_dict: FIELDS_DICT
	custom_regexps: Record<string, string>
	file_link_fields: Record<string, string>
	template: AnkiConnectNote
	EXISTING_IDS: number[]
	vault_name: string

	FROZEN_REGEXP: RegExp
	NOTE_REGEXP: RegExp
	INLINE_REGEXP: RegExp

	curly_cloze: boolean
	highlights_to_cloze: boolean
	add_obs_tags: boolean
	deckFrontmatterProperty: string
	tagsFrontmatterProperty: string
	frontFrontmatterProperty: string
	idFrontmatterProperty: string
	/** Postfix on anki-id value to mark note for deletion (e.g. "-delete"). */
	idDeletePostfix: string
}

export interface ParsedSettings extends FileData {
	add_file_link: boolean
	ignored_file_globs: string[]
}
