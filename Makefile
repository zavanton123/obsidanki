PLUGINS_DIR := /Users/zavanton/Desktop/ObsidianVaults/develop-anki/.obsidian/plugins

.PHONY: install
install:
	npm run build
	rm -rf obsidanki
	mkdir -p obsidanki
	cp main.js manifest.json styles.css README.md obsidanki
	rm -rf $(PLUGINS_DIR)/obsidanki
	mv obsidanki $(PLUGINS_DIR)/
