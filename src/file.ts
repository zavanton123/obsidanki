/*Performing plugin operations on markdown file contents*/

import { FROZEN_FIELDS_DICT } from './interfaces/field-interface'
import { AnkiConnectNote, AnkiConnectNoteAndID } from './interfaces/note-interface'
import { FileData } from './interfaces/settings-interface'
import { Note, InlineNote, RegexNote, CLOZE_ERROR, NOTE_TYPE_ERROR, TAG_SEP, ID_REGEXP_STR, TAG_REGEXP_STR } from './note'
import { Md5 } from 'ts-md5/dist/md5';
import * as AnkiConnect from './anki'
import * as c from './constants'
import { FormatConverter } from './format'
import { CachedMetadata } from 'obsidian'

const double_regexp: RegExp = /(?:\r\n|\r|\n)((?:\r\n|\r|\n)(?:<!--)?ID: \d+)/g

const FRONTMATTER_REGEXP = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
/** Lines that are only an ID (so we don't remove inline note lines that contain "ID: 123" in the middle). */
const ID_ONLY_LINE_REGEXP = /^\s*(?:<!--)?ID: \d+(?:-->)?\s*$/
/** First H1 line (for stripping from back content when creating file-as-card). */
const H1_LINE_REGEXP = /^#\s+.+$/m

function setFrontmatterAnkiIds(content: string, id: number, propName: string): string {
    const key = propName + ":"
    const newLine = key + " " + id
    const match = content.match(FRONTMATTER_REGEXP)
    if (match) {
        const rest = content.slice(match[0].length)
        const fm = match[1]
        const keyRegex = new RegExp("^" + propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":.*$", "m")
        const newFm = keyRegex.test(fm) ? fm.replace(keyRegex, newLine) : fm.trimEnd() + "\n" + newLine
        return "---\n" + newFm + "\n---\n" + rest
    }
    return "---\n" + newLine + "\n---\n" + content
}

/** Remove a property line from frontmatter (e.g. anki-id). */
function removeFrontmatterProperty(content: string, propName: string): string {
    const match = content.match(FRONTMATTER_REGEXP)
    if (!match) return content
    const rest = content.slice(match[0].length)
    const fm = match[1]
    const keyRegex = new RegExp("^" + propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":.*$\\r?\\n?", "m")
    const newFm = fm.replace(keyRegex, "").replace(/\n{2,}/g, "\n").trimEnd()
    if (!newFm) return rest.trimStart() ? rest : content
    return "---\n" + newFm + "\n---\n" + rest
}

/** Remove ID-only lines from body (IDs are stored in frontmatter anki-id). */
function removeIdLinesFromBody(content: string): string {
    return content.split(/\r?\n/).filter((line) => !ID_ONLY_LINE_REGEXP.test(line)).join("\n")
}

function id_to_str(identifier:number, inline:boolean = false, comment:boolean = false): string {
    let result = "ID: " + identifier.toString()
    if (comment) {
        result = "<!--" + result + "-->"
    }
    if (inline) {
        result += " "
    } else {
        result += "\n"
    }
    return result
}

function string_insert(text: string, position_inserts: Array<[number, string]>): string {
	/*Insert strings in position_inserts into text, at indices.

    position_inserts will look like:
    [(0, "hi"), (3, "hello"), (5, "beep")]*/
	let offset = 0
	let sorted_inserts: Array<[number, string]> = position_inserts.sort((a, b):number => a[0] - b[0])
	for (let insertion of sorted_inserts) {
		let position = insertion[0]
		let insert_str = insertion[1]
		text = text.slice(0, position + offset) + insert_str + text.slice(position + offset)
		offset += insert_str.length
	}
	return text
}

function spans(pattern: RegExp, text: string): Array<[number, number]> {
	/*Return a list of span-tuples for matches of pattern in text.*/
	let output: Array<[number, number]> = []
	let matches = text.matchAll(pattern)
	for (let match of matches) {
		output.push(
			[match.index, match.index + match[0].length]
		)
	}
	return output
}

function contained_in(span: [number, number], spans: Array<[number, number]>): boolean {
	/*Return whether span is contained in spans (+- 1 leeway)*/
	return spans.some(
		(element) => span[0] >= element[0] - 1 && span[1] <= element[1] + 1
	)
}

function* findignore(pattern: RegExp, text: string, ignore_spans: Array<[number, number]>): IterableIterator<RegExpMatchArray> {
	let matches = text.matchAll(pattern)
	for (let match of matches) {
		if (!(contained_in([match.index, match.index + match[0].length], ignore_spans))) {
			yield match
		}
	}
}

abstract class AbstractFile {
    file: string
    path: string
    url: string
    original_file: string
    data: FileData
    file_cache: CachedMetadata

    frozen_fields_dict: FROZEN_FIELDS_DICT
    target_deck: string
    global_tags: string

    notes_to_add: AnkiConnectNote[]
    id_indexes: number[]
    notes_to_edit: AnkiConnectNoteAndID[]
    notes_to_delete: number[]
    all_notes_to_add: AnkiConnectNote[]

    note_ids: Array<number | null>
    /** Ordered list of note IDs (null for newly added, filled from note_ids after sync). Used for frontmatter anki-id. */
    frontmatter_ids_ordered: (number | null)[]
    /** True when frontmatter had anki-id with "-delete" suffix (so we remove anki-id on write if no other notes). */
    hadDeleteMarkerInFrontmatter: boolean
    card_ids: number[]
    tags: string[]

    formatter: FormatConverter

    constructor(file_contents: string, path:string, url: string, data: FileData, file_cache: CachedMetadata) {
        this.data = data
        this.file = file_contents
        this.path = path
        this.url = url
        this.original_file = this.file
        this.file_cache = file_cache
        this.formatter = new FormatConverter(file_cache, this.data.vault_name)
        this.frontmatter_ids_ordered = []
        this.hadDeleteMarkerInFrontmatter = false
    }

    setup_frozen_fields_dict() {
        let frozen_fields_dict: FROZEN_FIELDS_DICT = {}
        for (let note_type in this.data.fields_dict) {
            let fields: string[] = this.data.fields_dict[note_type]
            let temp_dict: Record<string, string> = {}
            for (let field of fields) {
                temp_dict[field] = ""
            }
            frozen_fields_dict[note_type] = temp_dict
        }
        for (let match of this.file.matchAll(this.data.FROZEN_REGEXP)) {
            const [note_type, fields]: [string, string] = [match[1], match[2]]
            const virtual_note = note_type + "\n" + fields
            const parsed_fields: Record<string, string> = new Note(
                virtual_note,
                this.data.fields_dict,
                this.formatter
            ).getFields()
            frozen_fields_dict[note_type] = parsed_fields
        }
        this.frozen_fields_dict = frozen_fields_dict
    }

    setup_target_deck() {
        const prop = this.data.deckFrontmatterProperty
        const frontmatterDeck = prop && this.file_cache?.frontmatter != null && this.file_cache.frontmatter[prop]
        if (frontmatterDeck != null && frontmatterDeck !== "") {
            this.target_deck = c.toAnkiDeckName(String(frontmatterDeck))
            return
        }
        this.target_deck = c.toAnkiDeckName(this.data.template["deckName"])
    }

    setup_global_tags() {
        const prop = this.data.tagsFrontmatterProperty
        const frontmatterTags = prop && this.file_cache?.frontmatter != null && this.file_cache.frontmatter[prop]
        if (frontmatterTags != null) {
            if (Array.isArray(frontmatterTags)) {
                this.global_tags = frontmatterTags.map((t: unknown) => c.toAnkiTagName(String(t))).join(TAG_SEP)
            } else {
                const parts = String(frontmatterTags).split(TAG_SEP).map((s) => s.trim()).filter(Boolean)
                this.global_tags = parts.map((s) => c.toAnkiTagName(s)).join(TAG_SEP)
            }
            return
        }
        this.global_tags = ""
    }

    /** True when frontmatter has deck property (file should become one Basic card). Tags alone do not trigger creation. */
    hasAnkiFrontmatter(): boolean {
        const fm = this.file_cache?.frontmatter
        if (fm == null) return false
        const deckProp = this.data.deckFrontmatterProperty
        return deckProp != null && fm[deckProp] !== undefined
    }

    /** Note name from path: basename without .md extension. */
    getNoteNameFromPath(): string {
        const base = this.path.split("/").pop() ?? this.path
        return base.replace(/\.md$/i, "") ?? base
    }

    /** Body text after frontmatter, with the first H1 line removed. */
    getBodyWithoutFrontmatterAndH1(): string {
        let body = this.file.replace(FRONTMATTER_REGEXP, "").trimStart()
        body = body.replace(H1_LINE_REGEXP, "").trimStart()
        return body.trim()
    }

    getHash(): string {
        return Md5.hashStr(this.file) as string
    }

    abstract scanFile(): void

    scanDeletions() {
        const prop = this.data.idFrontmatterProperty
        const postfix = this.data.idDeletePostfix ?? "-delete"
        const raw = prop && this.file_cache?.frontmatter != null && this.file_cache.frontmatter[prop]
        if (typeof raw === "string" && postfix && raw.endsWith(postfix)) {
            const id = parseInt(raw.slice(0, -postfix.length), 10)
            if (!Number.isNaN(id)) {
                this.notes_to_delete.push(id)
                this.hadDeleteMarkerInFrontmatter = true
            }
        }
    }

    abstract writeIDs(): void

    removeEmpties() {
        // No-op: body-based "Delete Note Line" removed; deletion is via anki-id postfix only.
    }

    getCreateDecks(): AnkiConnect.AnkiConnectRequest {        
        let actions: AnkiConnect.AnkiConnectRequest[] = []
        for (let note of this.all_notes_to_add) {
            actions.push(AnkiConnect.createDeck(note.deckName))
        }
        return AnkiConnect.multi(actions)
    }

    getAddNotes(): AnkiConnect.AnkiConnectRequest {
        let actions: AnkiConnect.AnkiConnectRequest[] = []
        for (let note of this.all_notes_to_add) {
            actions.push(AnkiConnect.addNote(note))
        }
        return AnkiConnect.multi(actions)
    }

    getDeleteNotes(): AnkiConnect.AnkiConnectRequest {
        return AnkiConnect.deleteNotes(this.notes_to_delete)
    }

    getUpdateFields(): AnkiConnect.AnkiConnectRequest {
        let actions: AnkiConnect.AnkiConnectRequest[] = []
        for (let parsed of this.notes_to_edit) {
            actions.push(
                AnkiConnect.updateNoteFields(
                    parsed.identifier, parsed.note.fields
                )
            )
        }
        return AnkiConnect.multi(actions)
    }

    getNoteInfo(): AnkiConnect.AnkiConnectRequest {
        let IDs: number[] = []
        for (let parsed of this.notes_to_edit) {
            IDs.push(parsed.identifier)
        }
        return AnkiConnect.notesInfo(IDs)
    }

    getChangeDecks(): AnkiConnect.AnkiConnectRequest {
        return AnkiConnect.changeDeck(this.card_ids, this.target_deck)
    }

    getClearTags(): AnkiConnect.AnkiConnectRequest {
        let IDs: number[] = []
        for (let parsed of this.notes_to_edit) {
            IDs.push(parsed.identifier)
        }
        return AnkiConnect.removeTags(IDs, this.tags.join(" "))
    }

    getAddTags(): AnkiConnect.AnkiConnectRequest {
        let actions: AnkiConnect.AnkiConnectRequest[] = []
        for (let parsed of this.notes_to_edit) {
            actions.push(
                AnkiConnect.addTags([parsed.identifier], parsed.note.tags.join(" ") + " " + this.global_tags)
            )
        }
        return AnkiConnect.multi(actions)
    }

}

export class AllFile extends AbstractFile {
    ignore_spans: [number, number][]
    custom_regexps: Record<string, string>
    inline_notes_to_add: AnkiConnectNote[]
    inline_id_indexes: number[]
    regex_notes_to_add: AnkiConnectNote[]
    regex_id_indexes: number[]

    constructor(file_contents: string, path:string, url: string, data: FileData, file_cache: CachedMetadata) {
        super(file_contents, path, url, data, file_cache)
        this.custom_regexps = data.custom_regexps
    }

    add_spans_to_ignore() {
        this.ignore_spans = []
        this.ignore_spans.push(...spans(this.data.INLINE_REGEXP, this.file))
        this.ignore_spans.push(...spans(c.OBS_INLINE_MATH_REGEXP, this.file))
        this.ignore_spans.push(...spans(c.OBS_DISPLAY_MATH_REGEXP, this.file))
        this.ignore_spans.push(...spans(c.OBS_CODE_REGEXP, this.file))
        this.ignore_spans.push(...spans(c.OBS_DISPLAY_CODE_REGEXP, this.file))
    }

    setupScan() {
        this.setup_frozen_fields_dict()
        this.setup_target_deck()
        this.setup_global_tags()
        this.add_spans_to_ignore()
        this.notes_to_add = []
        this.inline_notes_to_add = []
        this.regex_notes_to_add = []
        this.id_indexes = []
        this.inline_id_indexes = []
        this.regex_id_indexes = []
        this.notes_to_edit = []
        this.notes_to_delete = []
        this.frontmatter_ids_ordered = []
        this.hadDeleteMarkerInFrontmatter = false
    }

    getFrontmatterIds(): number[] | null {
        const prop = this.data.idFrontmatterProperty
        const raw = prop && this.file_cache?.frontmatter != null && this.file_cache.frontmatter[prop]
        if (raw == null) return null
        const postfix = this.data.idDeletePostfix ?? "-delete"
        if (typeof raw === "string" && postfix && raw.endsWith(postfix)) return null
        if (Array.isArray(raw)) return raw.map((x: unknown) => Number(x)).filter((n) => !Number.isNaN(n))
        const n = Number(raw)
        return Number.isNaN(n) ? null : [n]
    }

    /** Create one Basic card from the whole file: front = anki-front or note name, back = body without frontmatter and H1. */
    scanAsBasicCard() {
        const BASIC = "Basic"
        const fieldNames: string[] = this.data.fields_dict[BASIC] ?? ["Front", "Back"]
        const frontProp = this.data.frontFrontmatterProperty
        const frontFromFm = frontProp && this.file_cache?.frontmatter != null && this.file_cache.frontmatter[frontProp]
        const frontText = (frontFromFm != null && String(frontFromFm).trim() !== "")
            ? String(frontFromFm).trim()
            : this.getNoteNameFromPath()
        const backRaw = this.getBodyWithoutFrontmatterAndH1()
        const backFormatted = this.formatter.format(backRaw, false, false)

        const template = JSON.parse(JSON.stringify(this.data.template)) as AnkiConnectNote
        template.modelName = BASIC
        template.fields = {} as Record<string, string>
        for (let i = 0; i < fieldNames.length; i++) {
            template.fields[fieldNames[i]] = i === 0 ? frontText : i === 1 ? backFormatted : ""
        }
        template.deckName = this.target_deck
        template.tags = [...(this.data.template.tags ?? [])]

        const fileLinkField = this.data.file_link_fields?.[BASIC]
        if (this.url && fileLinkField && template.fields[fileLinkField] !== undefined) {
            this.formatter.format_note_with_url(template, this.url, this.data.file_link_fields[BASIC])
        }
        if (Object.keys(this.frozen_fields_dict).length && this.frozen_fields_dict[BASIC]) {
            this.formatter.format_note_with_frozen_fields(template, this.frozen_fields_dict)
        }

        const optionalId = this.getFrontmatterIds()?.[0] ?? null
        const parsed: AnkiConnectNoteAndID = { note: template, identifier: optionalId }

        if (parsed.identifier != null && this.data.EXISTING_IDS.includes(parsed.identifier)) {
            this.notes_to_edit.push(parsed)
        } else {
            if (parsed.identifier != null && !this.data.EXISTING_IDS.includes(parsed.identifier)) {
                console.warn("Note with id", parsed.identifier, " in file ", this.path, " does not exist in Anki!")
            }
            template.tags.push(...this.global_tags.split(TAG_SEP))
            this.notes_to_add.push(parsed.note)
        }
        this.frontmatter_ids_ordered.push(parsed.identifier)
    }

    scanInlineNotes() {
        for (let note_match of this.file.matchAll(this.data.INLINE_REGEXP)) {
            let [note, position]: [string, number] = [note_match[1], note_match.index + note_match[0].indexOf(note_match[1]) + note_match[1].length]
            const frontIds = this.getFrontmatterIds()
            const optionalId = frontIds && this.frontmatter_ids_ordered.length < frontIds.length ? frontIds[this.frontmatter_ids_ordered.length] : undefined
            let parsed = new InlineNote(
                note,
                this.data.fields_dict,
                this.formatter,
                optionalId
            ).parse(
                this.target_deck,
                this.url,
                this.frozen_fields_dict,
                this.data
            )
            if (parsed.identifier == null) {
                // Need to make sure global_tags get added
                parsed.note.tags.push(...this.global_tags.split(TAG_SEP))
                this.inline_notes_to_add.push(parsed.note)
                this.inline_id_indexes.push(position)
            } else if (!this.data.EXISTING_IDS.includes(parsed.identifier)) {
                // Need to show an error
                if (parsed.identifier == CLOZE_ERROR) {
                    continue
                }
                console.warn("Note with id", parsed.identifier, " in file ", this.path, " does not exist in Anki!")
            } else {
                this.notes_to_edit.push(parsed)
            }
            this.frontmatter_ids_ordered.push(parsed.identifier)
        }
    }

    search(note_type: string, regexp_str: string) {
        //Search the file for regex matches
        //ignoring matches inside ignore_spans,
        //and adding any matches to ignore_spans.
        for (let search_id of [true, false]) {
            for (let search_tags of [true, false]) {
                let id_str = search_id ? ID_REGEXP_STR : ""
                let tag_str = search_tags ? TAG_REGEXP_STR : ""
                let regexp: RegExp = new RegExp(regexp_str + tag_str + id_str, 'gm')
                for (let match of findignore(regexp, this.file, this.ignore_spans)) {
                    this.ignore_spans.push([match.index, match.index + match[0].length])
                    const frontIds = this.getFrontmatterIds()
                    const optionalId = frontIds && this.frontmatter_ids_ordered.length < frontIds.length ? frontIds[this.frontmatter_ids_ordered.length] : undefined
                    const parsed: AnkiConnectNoteAndID = new RegexNote(
                        match, note_type, this.data.fields_dict,
                        search_tags, search_id, this.formatter,
                        optionalId
                    ).parse(
                        this.target_deck,
                        this.url,
                        this.frozen_fields_dict,
                        this.data
                    )
                    if (search_id) {
                        if (!(this.data.EXISTING_IDS.includes(parsed.identifier))) {
                            if (parsed.identifier == CLOZE_ERROR) {
                                // This means it wasn't actually a note! So we should remove it from ignore_spans
                                this.ignore_spans.pop()
                                continue
                            }
                            console.warn("Note with id", parsed.identifier, " in file ", this.path, " does not exist in Anki!")
                        } else {
                            this.notes_to_edit.push(parsed)
                            this.frontmatter_ids_ordered.push(parsed.identifier)
                        }
                    } else {
                        if (parsed.identifier == CLOZE_ERROR) {
                            // This means it wasn't actually a note! So we should remove it from ignore_spans
                            this.ignore_spans.pop()
                            continue
                        }
                        parsed.note.tags.push(...this.global_tags.split(TAG_SEP))
                        this.regex_notes_to_add.push(parsed.note)
                        this.regex_id_indexes.push(match.index + match[0].length)
                        this.frontmatter_ids_ordered.push(parsed.identifier)
                    }
                }
            }
        }
    }

    scanFile() {
        this.setupScan()
        if (this.hasAnkiFrontmatter()) {
            this.scanAsBasicCard()
        } else {
            this.scanInlineNotes()
            for (const note_type of Object.keys(this.custom_regexps)) {
                const regexp_str = this.custom_regexps[note_type]
                if (regexp_str) {
                    this.search(note_type, regexp_str)
                }
            }
        }
        this.all_notes_to_add = this.notes_to_add.concat(this.inline_notes_to_add).concat(this.regex_notes_to_add)
        this.scanDeletions()
    }

    fix_newline_ids() {
        this.file = this.file.replace(double_regexp, "$1")
    }

    writeIDs() {
        const ids = this.frontmatter_ids_ordered.filter((x): x is number => x != null)
        if (ids.length === 0) {
            if (this.hadDeleteMarkerInFrontmatter) {
                this.file = removeFrontmatterProperty(
                    removeIdLinesFromBody(this.file),
                    this.data.idFrontmatterProperty
                )
            }
            return
        }
        this.file = setFrontmatterAnkiIds(
            removeIdLinesFromBody(this.file),
            ids[0],
            this.data.idFrontmatterProperty
        )
    }
}
