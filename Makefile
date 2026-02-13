PLUGINS_DIR := /Users/zavanton/Desktop/ObsidianVaults/develop-anki/.obsidian/plugins
VERSION := $(shell node -p "require('./manifest.json').version")

.PHONY: install release
install:
	npm run build
	rm -rf obsidanki
	mkdir -p obsidanki
	cp main.js manifest.json styles.css README.md obsidanki
	zip -r obsidanki-$(VERSION).zip obsidanki
	rm -rf $(PLUGINS_DIR)/obsidanki
	mv obsidanki $(PLUGINS_DIR)/

release:
	npm run build
	rm -rf obsidanki obsidanki.zip
	mkdir -p obsidanki
	cp main.js manifest.json styles.css README.md obsidanki
	zip -r obsidanki.zip obsidanki
	rm -rf obsidanki
	git tag v$(VERSION)
	git push origin v$(VERSION)
	@if command -v gh >/dev/null 2>&1; then \
		gh release create v$(VERSION) obsidanki.zip --generate-notes; \
	else \
		node scripts/upload-release.js v$(VERSION) obsidanki.zip; \
	fi
