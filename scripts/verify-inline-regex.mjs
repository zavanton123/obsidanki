#!/usr/bin/env node
/**
 * Verifies that the inline-note regex logic works for custom begin/end markers
 * (e.g. "anki-start" and "anki-end"). Run: node scripts/verify-inline-regex.mjs
 */

function escapeRegex(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function buildInlineRegex(begin, end) {
  const b = (typeof begin === 'string' && begin.trim()) ? begin.trim() : '««';
  const e = (typeof end === 'string' && end.trim()) ? end.trim() : '»»';
  return new RegExp(escapeRegex(b) + String.raw`([\s\S]*?)` + escapeRegex(e), 'g');
}

const textWithAnkiStartEnd = `
Some prose here.
anki-start [Basic] Capital of France Paris anki-end
More text.
anki-start [Cloze] The capital is {{c1::Paris}}. anki-end
`;

const textWithNewline = `
anki-start [Basic] Front content
Back content anki-end
`;

function run() {
  const re = buildInlineRegex('anki-start', 'anki-end');
  let count = 0;
  for (const m of textWithAnkiStartEnd.matchAll(re)) {
    count++;
    console.log('Match', count, ':', JSON.stringify(m[1]));
  }
  if (count !== 2) {
    console.error('Expected 2 matches in first text, got', count);
    process.exit(1);
  }
  const re2 = new RegExp(re.source, re.flags);
  const matchesNewline = [...textWithNewline.matchAll(re2)];
  if (matchesNewline.length !== 1 || !matchesNewline[0][1].includes('Back content')) {
    console.error('Expected 1 match spanning newline with "Back content", got', matchesNewline);
    process.exit(1);
  }
  console.log('OK: anki-start / anki-end inline regex works (single-line and multiline).');
}

run();
