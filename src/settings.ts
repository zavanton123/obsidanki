import { PluginSettingTab, Setting, Notice } from 'obsidian'
import * as AnkiConnect from './anki'

const defaultDescs = {
	"Tag": "The tag that the plugin automatically adds to any generated cards.",
	"Add File Link": "Append a link to the file that generated the flashcard on the field specified in the table."
}

export const DEFAULT_IGNORED_FILE_GLOBS = [
	'**/*.excalidraw.md'
];

export class SettingsTab extends PluginSettingTab {

	create_collapsible(name: string) {
		let {containerEl} = this;
		let div = containerEl.createEl('div', {cls: "collapsible-item"})
		div.innerHTML = `
			<div class="collapsible-item-self"><div class="collapsible-item-collapse collapse-icon anki-rotated"><svg viewBox="0 0 100 100" width="8" height="8" class="right-triangle"><path fill="currentColor" stroke="currentColor" d="M94.9,20.8c-1.4-2.5-4.1-4.1-7.1-4.1H12.2c-3,0-5.7,1.6-7.1,4.1c-1.3,2.4-1.2,5.2,0.2,7.6L43.1,88c1.5,2.3,4,3.7,6.9,3.7 s5.4-1.4,6.9-3.7l37.8-59.6C96.1,26,96.2,23.2,94.9,20.8L94.9,20.8z"></path></svg></div><div class="collapsible-item-inner"></div><header>${name}</header></div>
		`
		div.addEventListener('click', function () {
			this.classList.toggle("active")
			let icon = this.firstElementChild.firstElementChild as HTMLElement
			icon.classList.toggle("anki-rotated")
			let content = this.nextElementSibling as HTMLElement
			if (content.style.display === "block") {
				content.style.display = "none"
			} else {
				content.style.display = "block"
			}
		})
	}

	setup_syntax() {
		let {containerEl} = this;
		const plugin = (this as any).plugin
		const obsoleteKeys = ["Target Deck Line", "File Tags Line", "Delete Note Line", "Begin Note", "End Note", "Frozen Fields Line"]
		for (const k of obsoleteKeys) {
			if (plugin.settings["Syntax"].hasOwnProperty(k)) delete plugin.settings["Syntax"][k]
		}
		// Migrate old Syntax key names to new names
		if (plugin.settings["Syntax"].hasOwnProperty("Deck Frontmatter Property")) {
			plugin.settings["Syntax"]["Anki Deck Property"] = plugin.settings["Syntax"]["Deck Frontmatter Property"]
			delete plugin.settings["Syntax"]["Deck Frontmatter Property"]
		}
		if (plugin.settings["Syntax"].hasOwnProperty("Tags Frontmatter Property")) {
			plugin.settings["Syntax"]["Anki Tags Property"] = plugin.settings["Syntax"]["Tags Frontmatter Property"]
			delete plugin.settings["Syntax"]["Tags Frontmatter Property"]
		}
		if (plugin.settings["Syntax"].hasOwnProperty("Front Frontmatter Property")) {
			plugin.settings["Syntax"]["Anki Card Front Property"] = plugin.settings["Syntax"]["Front Frontmatter Property"]
			delete plugin.settings["Syntax"]["Front Frontmatter Property"]
		}
		if (plugin.settings["Syntax"].hasOwnProperty("ID Frontmatter Property")) {
			plugin.settings["Syntax"]["Anki Card ID Property"] = plugin.settings["Syntax"]["ID Frontmatter Property"]
			delete plugin.settings["Syntax"]["ID Frontmatter Property"]
		}
		if (!plugin.settings["Syntax"].hasOwnProperty("Anki Deck Property")) {
			plugin.settings["Syntax"]["Anki Deck Property"] = "deck"
		}
		if (!plugin.settings["Syntax"].hasOwnProperty("Anki Tags Property")) {
			plugin.settings["Syntax"]["Anki Tags Property"] = "tags"
		}
		if (!plugin.settings["Syntax"].hasOwnProperty("Anki Card Front Property")) {
			plugin.settings["Syntax"]["Anki Card Front Property"] = "anki-front"
		}
		if (!plugin.settings["Syntax"].hasOwnProperty("Anki Card ID Property")) {
			plugin.settings["Syntax"]["Anki Card ID Property"] = "anki-id"
		}
		if (!plugin.settings["Syntax"].hasOwnProperty("ID Delete Postfix")) {
			plugin.settings["Syntax"]["ID Delete Postfix"] = "-delete"
		}
		if (!plugin.settings["Syntax"].hasOwnProperty("Begin Inline Note")) {
			plugin.settings["Syntax"]["Begin Inline Note"] = "««"
		}
		if (!plugin.settings["Syntax"].hasOwnProperty("End Inline Note")) {
			plugin.settings["Syntax"]["End Inline Note"] = "»»"
		}
		const syntaxKeysOrder = [
			"Anki Deck Property",
			"Anki Tags Property",
			"Anki Card Front Property",
			"Anki Card ID Property",
			"ID Delete Postfix",
			"Begin Inline Note",
			"End Inline Note"
		]
		let syntax_settings = containerEl.createEl('h3', {text: 'Syntax Settings'})
		for (const key of syntaxKeysOrder) {
			if (!plugin.settings["Syntax"].hasOwnProperty(key)) continue
			new Setting(syntax_settings)
				.setName(key)
				.addText(
						text => text.setValue(plugin.settings["Syntax"][key])
						.onChange((value) => {
							plugin.settings["Syntax"][key] = value
							plugin.saveAllData()
						})
				)
		}
	}

	setup_defaults() {
		let {containerEl} = this;
		const plugin = (this as any).plugin
		let defaults_settings = containerEl.createEl('h3', {text: 'Defaults'})

		if (plugin.settings["Defaults"].hasOwnProperty("Scan Directory")) {
			delete plugin.settings["Defaults"]["Scan Directory"]
		}
		if (plugin.settings["Defaults"].hasOwnProperty("Deck")) {
			delete plugin.settings["Defaults"]["Deck"]
		}
		if (plugin.settings["Defaults"].hasOwnProperty("Scheduling Interval")) {
			delete plugin.settings["Defaults"]["Scheduling Interval"]
		}
		if (plugin.settings.hasOwnProperty("FOLDER_DECKS")) {
			delete plugin.settings["FOLDER_DECKS"]
		}
		if (plugin.settings.hasOwnProperty("FOLDER_TAGS")) {
			delete plugin.settings["FOLDER_TAGS"]
		}
		if (plugin.settings.hasOwnProperty("CONTEXT_FIELDS")) {
			delete plugin.settings["CONTEXT_FIELDS"]
		}
		if (plugin.settings["Defaults"].hasOwnProperty("Add Context")) {
			delete plugin.settings["Defaults"]["Add Context"]
		}
		if (plugin.settings["Defaults"].hasOwnProperty("CurlyCloze")) {
			delete plugin.settings["Defaults"]["CurlyCloze"]
		}
		if (plugin.settings["Defaults"].hasOwnProperty("CurlyCloze - Highlights to Clozes")) {
			delete plugin.settings["Defaults"]["CurlyCloze - Highlights to Clozes"]
		}
		if (plugin.settings["Defaults"].hasOwnProperty("Add Obsidian Tags")) {
			delete plugin.settings["Defaults"]["Add Obsidian Tags"]
		}
		for (let key of Object.keys(plugin.settings["Defaults"])) {
			if (key === "Regex" || key === "ID Comments" || key === "Scan Directory" || key === "Deck" || key === "Scheduling Interval" || key === "Add Context" || key === "CurlyCloze" || key === "CurlyCloze - Highlights to Clozes" || key === "Add Obsidian Tags") {
				continue
			}
			if (typeof plugin.settings["Defaults"][key] === "string") {
				new Setting(defaults_settings)
					.setName(key)
					.setDesc(defaultDescs[key])
					.addText(
						text => text.setValue(plugin.settings["Defaults"][key])
						.onChange((value) => {
							plugin.settings["Defaults"][key] = value
							plugin.saveAllData()
						})
				)
			} else if (typeof plugin.settings["Defaults"][key] === "boolean") {
				new Setting(defaults_settings)
					.setName(key)
					.setDesc(defaultDescs[key])
					.addToggle(
						toggle => toggle.setValue(plugin.settings["Defaults"][key])
						.onChange((value) => {
							plugin.settings["Defaults"][key] = value
							plugin.saveAllData()
						})
					)
			}
		}
	}

	setup_buttons() {
		let {containerEl} = this
		const plugin = (this as any).plugin
		let action_buttons = containerEl.createEl('h3', {text: 'Actions'})
		new Setting(action_buttons)
			.setName("Clear Media Cache")
			.setDesc(`Clear the cached list of media filenames that have been added to Anki.

			The plugin will skip over adding a media file if it's added a file with the same name before, so clear this if e.g. you've updated the media file with the same name.`)
			.addButton(
				button => {
					button.setButtonText("Clear").setClass("mod-cta")
					.onClick(async () => {
						plugin.added_media = []
						await plugin.saveAllData()
						new Notice("Media Cache cleared successfully!")
					})
				}
			)
		new Setting(action_buttons)
			.setName("Clear File Hash Cache")
			.setDesc(`Clear the cached dictionary of file hashes that the plugin has scanned before.

			The plugin will skip over a file if the file path and the hash is unaltered.`)
			.addButton(
				button => {
					button.setButtonText("Clear").setClass("mod-cta")
					.onClick(async () => {
						plugin.file_hashes = {}
						await plugin.saveAllData()
						new Notice("File Hash Cache cleared successfully!")
					})
				}
			)
	}
	setup_ignore_files() {
		let { containerEl } = this;
		const plugin = (this as any).plugin
		let ignored_files_settings = containerEl.createEl('h3', { text: 'Ignored File Settings' })
		plugin.settings["IGNORED_FILE_GLOBS"] = plugin.settings.hasOwnProperty("IGNORED_FILE_GLOBS") ? plugin.settings["IGNORED_FILE_GLOBS"] : DEFAULT_IGNORED_FILE_GLOBS
		const descriptionFragment = document.createDocumentFragment();
		descriptionFragment.createEl("span", { text: "Glob patterns for files to ignore. You can add multiple patterns. One per line. Have a look at the " })
		descriptionFragment.createEl("a", { text: "README.md", href: "https://github.com/zavanton123/obsidanki?tab=readme-ov-file#features" });
		descriptionFragment.createEl("span", { text: " for more information, examples and further resources." })


		new Setting(ignored_files_settings)
			.setName("Patterns to ignore")
			.setDesc(descriptionFragment)
			.addTextArea(text => {
				text.setValue(plugin.settings.IGNORED_FILE_GLOBS.join("\n"))
					.setPlaceholder("Examples: '**/*.excalidraw.md', 'Templates/**'")
					.onChange((value) => {
						let ignoreLines = value.split("\n")
						ignoreLines = ignoreLines.filter(e => e.trim() != "") //filter out empty lines and blank lines
						plugin.settings.IGNORED_FILE_GLOBS = ignoreLines

						plugin.saveAllData()
					}
					)
				text.inputEl.rows = 10
				text.inputEl.cols = 30
			});
	}

	setup_display() {
		let {containerEl} = this

		containerEl.empty()
		containerEl.createEl('h2', {text: 'Obsidanki settings'})
		containerEl.createEl('a', {text: 'For more information check the wiki', href: "https://github.com/zavanton123/obsidanki/wiki"})
		containerEl.createEl('h2', {text: ''})
		this.setup_syntax()
		this.setup_defaults()
		this.setup_buttons()
		this.setup_ignore_files()
	}

	async display() {
		this.setup_display()
	}
}
