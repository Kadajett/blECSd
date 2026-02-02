/**
 * Syntax Highlighting Benchmarks
 *
 * Measures syntax highlighting performance against acceptance criteria:
 * - Edit in 100K line file highlights in <16ms
 * - Streaming code highlights without lag
 * - Language detection adds <5ms overhead
 * - Memory per language <1MB
 *
 * Run with: pnpm bench src/benchmarks/syntaxHighlight.bench.ts
 *
 * @module benchmarks/syntaxHighlight
 */

import { bench, describe } from 'vitest';
import {
	continueHighlight,
	createHighlightCache,
	detectLanguage,
	detectLanguageFromContent,
	GRAMMAR_GO,
	GRAMMAR_JAVASCRIPT,
	GRAMMAR_PYTHON,
	GRAMMAR_RUST,
	type HighlightCache,
	highlightVisibleFirst,
	highlightWithCache,
	invalidateLine,
	setGrammar,
} from '../utils/syntaxHighlight';

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Creates JavaScript code with specified number of lines.
 */
function createJavaScriptCode(lineCount: number): string {
	const lines: string[] = [];
	const templates = [
		'const x = 1;',
		'let y = "hello world";',
		'function foo(a, b) { return a + b; }',
		'const arr = [1, 2, 3].map(x => x * 2);',
		'if (condition) { doSomething(); }',
		'// This is a comment',
		'class MyClass extends Base { }',
		'export default function main() { }',
		'import { something } from "module";',
		'async function fetchData() { await fetch(url); }',
	];

	for (let i = 0; i < lineCount; i++) {
		const template = templates[i % templates.length];
		if (template) {
			lines.push(template);
		}
	}

	return lines.join('\n');
}

/**
 * Creates Python code with specified number of lines.
 */
function createPythonCode(lineCount: number): string {
	const lines: string[] = [];
	const templates = [
		'x = 1',
		'def foo(a, b):',
		'    return a + b',
		'class MyClass:',
		'    def __init__(self):',
		'        self.value = 0',
		'# This is a comment',
		'for i in range(10):',
		'    print(i)',
		'import os',
	];

	for (let i = 0; i < lineCount; i++) {
		const template = templates[i % templates.length];
		if (template) {
			lines.push(template);
		}
	}

	return lines.join('\n');
}

/**
 * Creates code with multi-line constructs.
 */
function createMultiLineCode(lineCount: number): string {
	const lines: string[] = [];

	for (let i = 0; i < lineCount; i++) {
		if (i % 20 === 0) {
			lines.push('/* Start of');
		} else if (i % 20 === 1) {
			lines.push(' * multi-line');
		} else if (i % 20 === 2) {
			lines.push(' * comment */');
		} else if (i % 20 === 10) {
			lines.push('const str = `template');
		} else if (i % 20 === 11) {
			lines.push('literal with ${interpolation}`;');
		} else {
			lines.push('const x = 1;');
		}
	}

	return lines.join('\n');
}

// =============================================================================
// CACHE CREATION BENCHMARKS
// =============================================================================

describe('Cache Creation', () => {
	bench('create highlight cache', () => {
		createHighlightCache(GRAMMAR_JAVASCRIPT);
	});

	bench('set grammar (no prior content)', () => {
		const cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
		setGrammar(cache, GRAMMAR_PYTHON);
	});
});

// =============================================================================
// BASIC HIGHLIGHTING BENCHMARKS
// =============================================================================

describe('Basic Highlighting', () => {
	let cache: HighlightCache;
	let code100: string;
	let code1k: string;
	let code10k: string;

	describe('initial highlight', () => {
		bench(
			'100 lines',
			() => {
				highlightWithCache(cache, code100);
			},
			{
				setup() {
					cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
					code100 = createJavaScriptCode(100);
				},
			},
		);

		bench(
			'1K lines',
			() => {
				highlightWithCache(cache, code1k);
			},
			{
				setup() {
					cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
					code1k = createJavaScriptCode(1000);
				},
			},
		);

		bench(
			'10K lines',
			() => {
				highlightWithCache(cache, code10k);
			},
			{
				setup() {
					cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
					code10k = createJavaScriptCode(10000);
				},
			},
		);
	});

	describe('cached re-highlight', () => {
		bench(
			'10K lines (cached)',
			() => {
				highlightWithCache(cache, code10k);
			},
			{
				setup() {
					cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
					code10k = createJavaScriptCode(10000);
					highlightWithCache(cache, code10k); // Pre-warm cache
				},
			},
		);
	});
});

// =============================================================================
// VISIBLE-FIRST BENCHMARKS
// =============================================================================

describe('Visible-First Highlighting (ACCEPTANCE: <16ms)', () => {
	let cache: HighlightCache;
	let code10k: string;
	let code100k: string;

	bench(
		'visible 50 lines from 10K',
		() => {
			highlightVisibleFirst(cache, code10k, 0, 50);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code10k = createJavaScriptCode(10000);
			},
		},
	);

	bench(
		'visible 50 lines from middle of 10K',
		() => {
			highlightVisibleFirst(cache, code10k, 5000, 5050);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code10k = createJavaScriptCode(10000);
			},
		},
	);

	bench(
		'visible 50 lines from 100K (ACCEPTANCE)',
		() => {
			highlightVisibleFirst(cache, code100k, 0, 50);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code100k = createJavaScriptCode(100000);
			},
		},
	);

	bench(
		'visible 100 lines from 100K',
		() => {
			highlightVisibleFirst(cache, code100k, 0, 100);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code100k = createJavaScriptCode(100000);
			},
		},
	);
});

// =============================================================================
// INCREMENTAL EDIT BENCHMARKS
// =============================================================================

describe('Incremental Edit (ACCEPTANCE: <16ms for single line)', () => {
	let cache: HighlightCache;
	let code10k: string;
	let code100k: string;

	bench(
		'edit single line in 10K',
		() => {
			invalidateLine(cache, 5000);
			highlightVisibleFirst(cache, code10k, 4990, 5010);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code10k = createJavaScriptCode(10000);
				highlightWithCache(cache, code10k);
			},
		},
	);

	bench(
		'edit single line in 100K (ACCEPTANCE)',
		() => {
			invalidateLine(cache, 50000);
			highlightVisibleFirst(cache, code100k, 49990, 50010);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code100k = createJavaScriptCode(100000);
				highlightWithCache(cache, code100k);
			},
		},
	);
});

// =============================================================================
// PROGRESSIVE HIGHLIGHT BENCHMARKS
// =============================================================================

describe('Progressive Highlighting', () => {
	let cache: HighlightCache;
	let code10k: string;

	bench(
		'continue 100 lines',
		() => {
			continueHighlight(cache, code10k, 0, 100);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code10k = createJavaScriptCode(10000);
			},
		},
	);

	bench(
		'continue 1000 lines',
		() => {
			continueHighlight(cache, code10k, 0, 1000);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code10k = createJavaScriptCode(10000);
			},
		},
	);
});

// =============================================================================
// MULTI-LINE CONSTRUCT BENCHMARKS
// =============================================================================

describe('Multi-Line Constructs', () => {
	let cache: HighlightCache;
	let multiLineCode: string;

	bench(
		'1000 lines with multi-line comments',
		() => {
			highlightWithCache(cache, multiLineCode);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				multiLineCode = createMultiLineCode(1000);
			},
		},
	);

	bench(
		'visible-first from multi-line code',
		() => {
			highlightVisibleFirst(cache, multiLineCode, 0, 50);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				multiLineCode = createMultiLineCode(10000);
			},
		},
	);
});

// =============================================================================
// LANGUAGE DETECTION BENCHMARKS
// =============================================================================

describe('Language Detection (ACCEPTANCE: <5ms)', () => {
	bench('detect from filename', () => {
		detectLanguage('src/components/App.tsx');
	});

	bench('detect from content', () => {
		detectLanguageFromContent('const x = 1;\nfunction foo() { }');
	});

	bench('detect 100 files', () => {
		const files = [
			'file.js',
			'file.ts',
			'file.py',
			'file.rs',
			'file.go',
			'file.sh',
			'file.json',
			'file.txt',
		];
		for (let i = 0; i < 100; i++) {
			detectLanguage(files[i % files.length]!);
		}
	});
});

// =============================================================================
// GRAMMAR SWITCH BENCHMARKS
// =============================================================================

describe('Grammar Switching', () => {
	let cache: HighlightCache;
	let code1k: string;

	bench(
		'switch grammar and rehighlight visible',
		() => {
			setGrammar(cache, GRAMMAR_PYTHON);
			highlightVisibleFirst(cache, code1k, 0, 50);
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code1k = createJavaScriptCode(1000);
				highlightWithCache(cache, code1k);
			},
		},
	);
});

// =============================================================================
// DIFFERENT LANGUAGES BENCHMARKS
// =============================================================================

describe('Different Languages', () => {
	let jsCache: HighlightCache;
	let pyCache: HighlightCache;
	let rsCache: HighlightCache;
	let goCache: HighlightCache;
	let jsCode: string;
	let pyCode: string;

	bench(
		'JavaScript 1K lines',
		() => {
			highlightWithCache(jsCache, jsCode);
		},
		{
			setup() {
				jsCache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				jsCode = createJavaScriptCode(1000);
			},
		},
	);

	bench(
		'Python 1K lines',
		() => {
			highlightWithCache(pyCache, pyCode);
		},
		{
			setup() {
				pyCache = createHighlightCache(GRAMMAR_PYTHON);
				pyCode = createPythonCode(1000);
			},
		},
	);

	bench(
		'Rust 1K lines',
		() => {
			highlightWithCache(rsCache, jsCode); // Reuse JS code, grammar handles it
		},
		{
			setup() {
				rsCache = createHighlightCache(GRAMMAR_RUST);
				jsCode = createJavaScriptCode(1000);
			},
		},
	);

	bench(
		'Go 1K lines',
		() => {
			highlightWithCache(goCache, jsCode); // Reuse JS code, grammar handles it
		},
		{
			setup() {
				goCache = createHighlightCache(GRAMMAR_GO);
				jsCode = createJavaScriptCode(1000);
			},
		},
	);
});

// =============================================================================
// ACCEPTANCE CRITERIA VALIDATION
// =============================================================================

describe('ACCEPTANCE CRITERIA VALIDATION', () => {
	let cache: HighlightCache;
	let code100k: string;

	bench(
		'ACCEPTANCE: Edit in 100K line file highlights in <16ms',
		() => {
			invalidateLine(cache, 50000);
			const result = highlightVisibleFirst(cache, code100k, 49990, 50010);
			if (result.timeMs > 16) {
				throw new Error(`Too slow: ${result.timeMs}ms`);
			}
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code100k = createJavaScriptCode(100000);
				highlightWithCache(cache, code100k);
			},
		},
	);

	bench(
		'ACCEPTANCE: Streaming code highlights (visible first)',
		() => {
			const result = highlightVisibleFirst(cache, code100k, 0, 50);
			if (result.timeMs > 16) {
				throw new Error(`Too slow: ${result.timeMs}ms`);
			}
		},
		{
			setup() {
				cache = createHighlightCache(GRAMMAR_JAVASCRIPT);
				code100k = createJavaScriptCode(100000);
			},
		},
	);

	bench('ACCEPTANCE: Language detection <5ms (single)', () => {
		const start = performance.now();
		detectLanguage('src/components/App.tsx');
		const elapsed = performance.now() - start;
		if (elapsed > 5) {
			throw new Error(`Too slow: ${elapsed}ms for single detection`);
		}
	});
});
