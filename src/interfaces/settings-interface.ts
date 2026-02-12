import { FIELDS_DICT } from './field-interface'
import { AnkiConnectNote } from './note-interface'

export interface PluginSettings {
	CUSTOM_REGEXPS: Record<string, string>,
	FILE_LINK_FIELDS: Record<string, string>,
	Syntax: {
		"Begin Inline Note": string,
		"End Inline Note": string,
		"Anki Deck Property": string,
		"Anki Tags Property": string,
		"Anki Card Front Property": string,
		"Anki Card ID Property": string,
		"ID Delete Postfix": string
	},
	Defaults: {
		"Tag": string,
		"Add File Link": boolean
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
