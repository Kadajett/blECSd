/**
 * Fast Word Wrap Benchmarks
 *
 * Measures word wrap performance against acceptance criteria:
 * - Rewrap 10K lines in <100ms
 * - Resize doesn't block input
 * - Visible region rewraps first (<16ms)
 * - Unicode emoji/CJK handled correctly
 *
 * Run with: pnpm bench src/benchmarks/fastWrap.bench.ts
 *
 * @module benchmarks/fastWrap
 */

import { bench, describe } from 'vitest';
import {
	clearWrapCache,
	continueWrap,
	createWrapCache,
	invalidateAll,
	resizeWrapCache,
	type WrapCache,
	wrapVisibleFirst,
	wrapWithCache,
} from '../utils/fastWrap';

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Creates text with specified number of lines.
 */
function createTextLines(lineCount: number, avgLineLength: number = 60): string {
	const lines: string[] = [];
	const words = ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'];

	for (let i = 0; i < lineCount; i++) {
		let line = '';
		while (line.length < avgLineLength) {
			const word = words[i % words.length];
			if (word) {
				line += (line.length > 0 ? ' ' : '') + word;
			}
		}
		lines.push(line);
	}

	return lines.join('\n');
}

/**
 * Creates text with long paragraphs that will wrap.
 */
function createWrappingText(paragraphCount: number, paragraphLength: number = 500): string {
	const paragraphs: string[] = [];
	const words = [
		'Lorem',
		'ipsum',
		'dolor',
		'sit',
		'amet',
		'consectetur',
		'adipiscing',
		'elit',
	];

	for (let i = 0; i < paragraphCount; i++) {
		let para = '';
		while (para.length < paragraphLength) {
			const word = words[Math.floor(Math.random() * words.length)];
			if (word) {
				para += (para.length > 0 ? ' ' : '') + word;
			}
		}
		paragraphs.push(para);
	}

	return paragraphs.join('\n');
}

/**
 * Creates text with Unicode content.
 */
function createUnicodeText(lineCount: number): string {
	const lines: string[] = [];
	const content = [
		'Hello 世界 🌍',
		'你好 World 👋',
		'こんにちは Earth 🌏',
		'Emoji test: 😀🎉🚀💻',
		'Mixed: ABC 日本語 123 한국어',
	];

	for (let i = 0; i < lineCount; i++) {
		const line = content[i % content.length];
		if (line) {
			lines.push(line);
		}
	}

	return lines.join('\n');
}

// =============================================================================
// CACHE CREATION BENCHMARKS
// =============================================================================

describe('Cache Creation', () => {
	bench('create cache', () => {
		createWrapCache(80);
	});

	bench('clear cache with 1000 entries', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, createTextLines(1000));
		clearWrapCache(cache);
	});
});

// =============================================================================
// BASIC WRAP BENCHMARKS
// =============================================================================

describe('Basic Wrapping', () => {
	let cache: WrapCache;
	let text100: string;
	let text1k: string;
	let text10k: string;

	describe('initial wrap', () => {
		bench(
			'100 lines',
			() => {
				wrapWithCache(cache, text100);
			},
			{
				setup() {
					cache = createWrapCache(80);
					text100 = createTextLines(100);
				},
			},
		);

		bench(
			'1K lines',
			() => {
				wrapWithCache(cache, text1k);
			},
			{
				setup() {
					cache = createWrapCache(80);
					text1k = createTextLines(1000);
				},
			},
		);

		bench(
			'10K lines (ACCEPTANCE: <100ms)',
			() => {
				wrapWithCache(cache, text10k);
			},
			{
				setup() {
					cache = createWrapCache(80);
					text10k = createTextLines(10000);
				},
			},
		);
	});

	describe('cached re-wrap', () => {
		bench(
			'10K lines (cached)',
			() => {
				wrapWithCache(cache, text10k);
			},
			{
				setup() {
					cache = createWrapCache(80);
					text10k = createTextLines(10000);
					wrapWithCache(cache, text10k); // Pre-warm cache
				},
			},
		);
	});
});

// =============================================================================
// RESIZE BENCHMARKS
// =============================================================================

describe('Resize Operations', () => {
	let cache: WrapCache;
	let text10k: string;

	bench(
		'resize cache 80 -> 120',
		() => {
			resizeWrapCache(cache, 120);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
				wrapWithCache(cache, text10k);
			},
		},
	);

	bench(
		'resize + rewrap 10K lines',
		() => {
			resizeWrapCache(cache, 120);
			wrapWithCache(cache, text10k);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
				wrapWithCache(cache, text10k);
			},
		},
	);
});

// =============================================================================
// VISIBLE-FIRST BENCHMARKS
// =============================================================================

describe('Visible-First Wrapping (ACCEPTANCE: <16ms)', () => {
	let cache: WrapCache;
	let text10k: string;

	bench(
		'visible 50 lines from 10K',
		() => {
			wrapVisibleFirst(cache, text10k, 0, 50);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
			},
		},
	);

	bench(
		'visible 50 lines from middle of 10K',
		() => {
			wrapVisibleFirst(cache, text10k, 5000, 5050);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
			},
		},
	);

	bench(
		'visible 100 lines from 10K',
		() => {
			wrapVisibleFirst(cache, text10k, 0, 100);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
			},
		},
	);
});

// =============================================================================
// PROGRESSIVE WRAP BENCHMARKS
// =============================================================================

describe('Progressive Wrapping', () => {
	let cache: WrapCache;
	let text10k: string;

	bench(
		'continue 100 paragraphs',
		() => {
			continueWrap(cache, text10k, 0, 100);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
			},
		},
	);

	bench(
		'continue 1000 paragraphs',
		() => {
			continueWrap(cache, text10k, 0, 1000);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
			},
		},
	);
});

// =============================================================================
// WRAPPING TEXT BENCHMARKS
// =============================================================================

describe('Text That Wraps', () => {
	let cache: WrapCache;
	let wrappingText: string;

	bench(
		'1000 paragraphs (500 chars each)',
		() => {
			wrapWithCache(cache, wrappingText);
		},
		{
			setup() {
				cache = createWrapCache(80);
				wrappingText = createWrappingText(1000, 500);
			},
		},
	);

	bench(
		'visible first from long paragraphs',
		() => {
			wrapVisibleFirst(cache, wrappingText, 0, 50);
		},
		{
			setup() {
				cache = createWrapCache(80);
				wrappingText = createWrappingText(1000, 500);
			},
		},
	);
});

// =============================================================================
// UNICODE BENCHMARKS
// =============================================================================

describe('Unicode Content', () => {
	let cache: WrapCache;
	let unicodeText: string;

	bench(
		'1000 lines with CJK/emoji',
		() => {
			wrapWithCache(cache, unicodeText);
		},
		{
			setup() {
				cache = createWrapCache(40);
				unicodeText = createUnicodeText(1000);
			},
		},
	);

	bench(
		'visible first with unicode',
		() => {
			wrapVisibleFirst(cache, unicodeText, 0, 50);
		},
		{
			setup() {
				cache = createWrapCache(40);
				unicodeText = createUnicodeText(1000);
			},
		},
	);
});

// =============================================================================
// INVALIDATION BENCHMARKS
// =============================================================================

describe('Invalidation', () => {
	let cache: WrapCache;
	let text10k: string;

	bench(
		'invalidate all + rewrap visible',
		() => {
			invalidateAll(cache);
			wrapVisibleFirst(cache, text10k, 0, 50);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
				wrapWithCache(cache, text10k);
			},
		},
	);

	bench(
		'invalidate all + full rewrap',
		() => {
			invalidateAll(cache);
			wrapWithCache(cache, text10k);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
				wrapWithCache(cache, text10k);
			},
		},
	);
});

// =============================================================================
// ACCEPTANCE CRITERIA VALIDATION
// =============================================================================

describe('ACCEPTANCE CRITERIA VALIDATION', () => {
	let cache: WrapCache;
	let text10k: string;

	bench(
		'ACCEPTANCE: Rewrap 10K lines in <100ms',
		() => {
			invalidateAll(cache);
			wrapWithCache(cache, text10k);
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
				wrapWithCache(cache, text10k); // Pre-build cache structure
			},
		},
	);

	bench(
		'ACCEPTANCE: Visible region rewraps first (<16ms)',
		() => {
			const result = wrapVisibleFirst(cache, text10k, 0, 50);
			if (result.timeMs > 16) {
				throw new Error(`Too slow: ${result.timeMs}ms`);
			}
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
			},
		},
	);

	bench(
		'ACCEPTANCE: Resize doesn\'t block (visible first)',
		() => {
			resizeWrapCache(cache, 120);
			const result = wrapVisibleFirst(cache, text10k, 0, 50);
			if (result.timeMs > 16) {
				throw new Error(`Too slow after resize: ${result.timeMs}ms`);
			}
		},
		{
			setup() {
				cache = createWrapCache(80);
				text10k = createTextLines(10000);
				wrapWithCache(cache, text10k);
			},
		},
	);
});
