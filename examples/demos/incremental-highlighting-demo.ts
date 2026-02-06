/**
 * Incremental Highlighting Demo
 *
 * Demonstrates syntax highlighting with caching and incremental updates.
 * Shows how only changed lines need re-highlighting.
 *
 * Run: npx tsx examples/demos/incremental-highlighting-demo.ts
 * @module demos/incremental-highlighting
 */
import {
	createHighlightCache, highlightWithCache, tokenizeLine,
	getHighlightStats, clearHighlightCache, invalidateLine,
	GRAMMAR_JAVASCRIPT, GRAMMAR_PYTHON, GRAMMAR_JSON, GRAMMAR_SHELL,
	EMPTY_STATE,
} from 'blecsd';
import type { Grammar, HighlightCache, Token } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, parseArrowKey, getTerminalSize, moveTo } from './demo-utils';

// Sample code snippets per language
const snippets: Record<string, string[]> = {
	JavaScript: [
		'// JavaScript example',
		'const greeting = "Hello, world!";',
		'function fibonacci(n) {',
		'  if (n <= 1) return n;',
		'  return fibonacci(n - 1) + fibonacci(n - 2);',
		'}',
		'',
		'const result = fibonacci(10);',
		'console.log(`Fib(10) = ${result}`);',
		'',
		'const arr = [1, 2, 3, 4, 5];',
		'const doubled = arr.map(x => x * 2);',
		'// End of example',
	],
	Python: [
		'# Python example',
		'def fibonacci(n: int) -> int:',
		'    if n <= 1:',
		'        return n',
		'    return fibonacci(n - 1) + fibonacci(n - 2)',
		'',
		'result = fibonacci(10)',
		'print(f"Fib(10) = {result}")',
		'',
		'numbers = [1, 2, 3, 4, 5]',
		'doubled = [x * 2 for x in numbers]',
		'# End of example',
	],
	JSON: [
		'{',
		'  "name": "blecsd",',
		'  "version": "0.0.1",',
		'  "description": "Terminal UI library",',
		'  "keywords": ["terminal", "tui", "ecs"],',
		'  "main": "dist/index.js",',
		'  "scripts": {',
		'    "build": "tsc",',
		'    "test": "vitest"',
		'  },',
		'  "dependencies": {',
		'    "bitecs": "^0.3.0"',
		'  }',
		'}',
	],
	Shell: [
		'#!/bin/bash',
		'# Shell script example',
		'NAME="world"',
		'echo "Hello, $NAME!"',
		'',
		'for i in $(seq 1 10); do',
		'  echo "Number: $i"',
		'done',
		'',
		'if [ -f "package.json" ]; then',
		'  echo "Found package.json"',
		'fi',
	],
};

const grammars: Record<string, Grammar> = {
	JavaScript: GRAMMAR_JAVASCRIPT,
	Python: GRAMMAR_PYTHON,
	JSON: GRAMMAR_JSON,
	Shell: GRAMMAR_SHELL,
};

const langNames = Object.keys(snippets);
let langIdx = 0;
let cache = createHighlightCache();
let scrollPos = 0;

// Token type to ANSI color
function tokenColor(type: string): string {
	const colors: Record<string, string> = {
		keyword: '\x1b[35m', string: '\x1b[32m', number: '\x1b[33m',
		comment: '\x1b[90m', operator: '\x1b[36m', punctuation: '\x1b[37m',
		function: '\x1b[34m', variable: '\x1b[36m', type: '\x1b[33m',
		property: '\x1b[36m', builtin: '\x1b[35m', key: '\x1b[34m',
		value: '\x1b[32m', shebang: '\x1b[90m', command: '\x1b[33m',
	};
	return colors[type] ?? '\x1b[0m';
}

function highlightLine(tokens: readonly Token[], line: string): string {
	if (tokens.length === 0) return line;
	let result = '';
	let pos = 0;
	for (const token of tokens) {
		if (token.start > pos) result += line.slice(pos, token.start);
		result += tokenColor(token.type) + line.slice(token.start, token.end) + '\x1b[0m';
		pos = token.end;
	}
	if (pos < line.length) result += line.slice(pos);
	return result;
}

function render(): void {
	const { width, height } = getTerminalSize();
	const lang = langNames[langIdx]!;
	const lines = snippets[lang]!;
	const grammar = grammars[lang]!;
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Incremental Highlighting Demo') + '\n');

	const stats = getHighlightStats(cache);
	out.push(`  Language: \x1b[33m${lang}\x1b[0m  Lines: \x1b[36m${lines.length}\x1b[0m  Cached: \x1b[32m${stats.cachedLines}\x1b[0m  Hits: \x1b[90m${stats.cacheHits}\x1b[0m  Misses: \x1b[90m${stats.cacheMisses}\x1b[0m\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 60)) + '\n\n');

	// Highlight and render lines
	let state = EMPTY_STATE;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const result = highlightWithCache(cache, i, line, grammar, state);
		state = result.state;
		const tokens = result.tokens;
		const highlighted = highlightLine(tokens, line);
		const lineNum = `\x1b[90m${String(i + 1).padStart(3)}\x1b[0m`;
		out.push(`  ${lineNum} ${highlighted}\n`);
	}

	out.push(`\n  \x1b[90mPress [i] to invalidate line 1 (forces re-highlight)\x1b[0m\n`);
	out.push(moveTo(height, 1) + formatHelpBar('[Left/Right] Language  [i] Invalidate  [c] Clear cache  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '\x1b[C' || ch === 'l') { langIdx = (langIdx + 1) % langNames.length; cache = createHighlightCache(); }
	if (ch === '\x1b[D' || ch === 'h') { langIdx = (langIdx - 1 + langNames.length) % langNames.length; cache = createHighlightCache(); }
	if (ch === 'i') invalidateLine(cache, 0);
	if (ch === 'c') cache = createHighlightCache();
	render();
});
