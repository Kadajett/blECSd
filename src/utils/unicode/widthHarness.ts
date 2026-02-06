/**
 * Terminal Width Testing Harness
 *
 * Provides a comprehensive corpus of tricky Unicode sequences for testing
 * width accuracy across terminals, a known-bad sequence database, and
 * runtime width override injection.
 *
 * @module utils/unicode/widthHarness
 */

import { z } from 'zod';
import type { WidthOptions } from './stringWidth';
import { stringWidth } from './stringWidth';
import { getCharWidth } from './widthTables';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single width test case.
 */
export interface WidthTestCase {
	/** Human-readable label */
	readonly label: string;
	/** The Unicode string to test */
	readonly input: string;
	/** Expected display width in terminal columns */
	readonly expectedWidth: number;
	/** Category for grouping */
	readonly category: WidthTestCategory;
	/** Optional notes about terminal-specific behavior */
	readonly notes?: string;
}

/**
 * Categories of width test sequences.
 */
export type WidthTestCategory =
	| 'emoji-zwj'
	| 'regional-indicators'
	| 'variation-selectors'
	| 'cjk'
	| 'combining'
	| 'tabs'
	| 'control'
	| 'fullwidth'
	| 'halfwidth'
	| 'ambiguous'
	| 'surrogate-pairs'
	| 'mixed';

/**
 * A known-bad sequence with terminal-specific width information.
 */
export interface KnownBadSequence {
	/** Human-readable label */
	readonly label: string;
	/** The Unicode string */
	readonly input: string;
	/** Expected logical width */
	readonly expectedWidth: number;
	/** Map of terminal name to actual measured width */
	readonly terminalWidths: Readonly<Record<string, number>>;
	/** Severity of the discrepancy */
	readonly severity: 'minor' | 'major' | 'critical';
}

/**
 * A runtime width override entry.
 */
export interface WidthOverride {
	/** Code point to override */
	readonly codePoint: number;
	/** Overridden width (0, 1, or 2) */
	readonly width: number;
}

/**
 * Width override table for a specific terminal.
 */
export interface TerminalWidthProfile {
	/** Terminal identifier (e.g., 'xterm-256color', 'kitty', 'alacritty') */
	readonly terminal: string;
	/** Override entries */
	readonly overrides: readonly WidthOverride[];
}

/**
 * Result of running the width test corpus.
 */
export interface WidthTestResult {
	/** Total test cases */
	readonly total: number;
	/** Passed test cases */
	readonly passed: number;
	/** Failed test cases */
	readonly failed: number;
	/** Individual failures */
	readonly failures: readonly WidthTestFailure[];
}

/**
 * A single test failure.
 */
export interface WidthTestFailure {
	/** The test case that failed */
	readonly testCase: WidthTestCase;
	/** Actual width computed */
	readonly actualWidth: number;
}

// =============================================================================
// SCHEMAS
// =============================================================================

export const WidthOverrideSchema = z.object({
	codePoint: z.number().int().nonnegative(),
	width: z.number().int().min(0).max(2),
});

export const TerminalWidthProfileSchema = z.object({
	terminal: z.string().min(1),
	overrides: z.array(WidthOverrideSchema),
});

// =============================================================================
// TEST CORPUS
// =============================================================================

/**
 * Builds the comprehensive width test corpus.
 *
 * @returns Array of width test cases covering all tricky Unicode categories
 *
 * @example
 * ```typescript
 * import { buildTestCorpus, runWidthTests } from 'blecsd';
 *
 * const corpus = buildTestCorpus();
 * const results = runWidthTests(corpus);
 * console.log(`${results.passed}/${results.total} passed`);
 * ```
 */
export function buildTestCorpus(): readonly WidthTestCase[] {
	return [
		// === EMOJI WITH ZWJ ===
		{
			label: 'Family emoji (ZWJ sequence)',
			input: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
			expectedWidth: 2,
			category: 'emoji-zwj',
			notes: 'Most terminals render as single 2-wide glyph, some render 8-wide',
		},
		{
			label: 'Couple with heart (ZWJ)',
			input: '\u{1F469}\u200D\u2764\uFE0F\u200D\u{1F468}',
			expectedWidth: 2,
			category: 'emoji-zwj',
			notes: 'ZWJ joins three characters into one grapheme',
		},
		{
			label: 'Person with white hair (ZWJ)',
			input: '\u{1F9D1}\u200D\u{1F9B3}',
			expectedWidth: 2,
			category: 'emoji-zwj',
		},
		{
			label: 'Pirate flag (ZWJ)',
			input: '\u{1F3F4}\u200D\u2620\uFE0F',
			expectedWidth: 2,
			category: 'emoji-zwj',
		},
		{
			label: 'ZWJ character alone',
			input: '\u200D',
			expectedWidth: 0,
			category: 'emoji-zwj',
		},

		// === REGIONAL INDICATORS (FLAGS) ===
		{
			label: 'US flag (regional indicators)',
			input: '\u{1F1FA}\u{1F1F8}',
			expectedWidth: 2,
			category: 'regional-indicators',
			notes: 'Two regional indicators form a flag',
		},
		{
			label: 'Japan flag',
			input: '\u{1F1EF}\u{1F1F5}',
			expectedWidth: 2,
			category: 'regional-indicators',
		},
		{
			label: 'Single regional indicator',
			input: '\u{1F1FA}',
			expectedWidth: 2,
			category: 'regional-indicators',
			notes: 'Unpaired regional indicators vary by terminal',
		},

		// === VARIATION SELECTORS ===
		{
			label: 'Text presentation (VS15)',
			input: '\u2764\uFE0E',
			expectedWidth: 1,
			category: 'variation-selectors',
			notes: 'VS15 forces text presentation (narrow)',
		},
		{
			label: 'Emoji presentation (VS16)',
			input: '\u2764\uFE0F',
			expectedWidth: 2,
			category: 'variation-selectors',
			notes: 'VS16 forces emoji presentation (wide)',
		},
		{
			label: 'Number sign with VS16',
			input: '#\uFE0F\u20E3',
			expectedWidth: 2,
			category: 'variation-selectors',
			notes: 'Keycap sequence',
		},
		{
			label: 'Variation selector alone',
			input: '\uFE0F',
			expectedWidth: 0,
			category: 'variation-selectors',
		},

		// === CJK CHARACTERS ===
		{
			label: 'CJK ideograph (U+4E2D)',
			input: '\u4E2D',
			expectedWidth: 2,
			category: 'cjk',
		},
		{
			label: 'CJK string "中文测试"',
			input: '中文测试',
			expectedWidth: 8,
			category: 'cjk',
		},
		{
			label: 'Hangul syllable (가)',
			input: '\uAC00',
			expectedWidth: 2,
			category: 'cjk',
		},
		{
			label: 'Katakana (カタカナ)',
			input: 'カタカナ',
			expectedWidth: 8,
			category: 'cjk',
		},
		{
			label: 'CJK compatibility ideograph',
			input: '\uF900',
			expectedWidth: 2,
			category: 'cjk',
		},

		// === COMBINING CHARACTERS ===
		{
			label: 'Latin a + combining acute',
			input: 'a\u0301',
			expectedWidth: 1,
			category: 'combining',
		},
		{
			label: 'Multiple combining marks (Zalgo-style)',
			input: 'a\u0300\u0301\u0302\u0303',
			expectedWidth: 1,
			category: 'combining',
			notes: 'All combining marks are zero-width',
		},
		{
			label: 'Devanagari with combining',
			input: '\u0915\u094D\u0937',
			expectedWidth: 2,
			category: 'combining',
			notes: 'Consonant cluster',
		},
		{
			label: 'Korean jamo with combining',
			input: '\u1100\u1161',
			expectedWidth: 2,
			category: 'combining',
			notes: 'Lead + vowel jamo',
		},

		// === TAB CHARACTERS ===
		{
			label: 'Single tab',
			input: '\t',
			expectedWidth: 8,
			category: 'tabs',
			notes: 'Default tab width is 8',
		},
		{
			label: 'Tab after 3 chars',
			input: 'abc\t',
			expectedWidth: 8,
			category: 'tabs',
			notes: 'Tab extends to next 8-column boundary',
		},

		// === CONTROL CHARACTERS ===
		{
			label: 'Null character',
			input: '\0',
			expectedWidth: 0,
			category: 'control',
		},
		{
			label: 'Bell character',
			input: '\x07',
			expectedWidth: 0,
			category: 'control',
		},
		{
			label: 'Backspace',
			input: '\x08',
			expectedWidth: 0,
			category: 'control',
		},
		{
			label: 'Soft hyphen',
			input: '\u00AD',
			expectedWidth: 1,
			category: 'control',
			notes: 'Soft hyphen is technically a format character but width=1 in most terminals',
		},

		// === FULLWIDTH CHARACTERS ===
		{
			label: 'Fullwidth A',
			input: '\uFF21',
			expectedWidth: 2,
			category: 'fullwidth',
		},
		{
			label: 'Fullwidth digits',
			input: '\uFF10\uFF11\uFF12',
			expectedWidth: 6,
			category: 'fullwidth',
		},
		{
			label: 'Fullwidth exclamation mark',
			input: '\uFF01',
			expectedWidth: 2,
			category: 'fullwidth',
		},

		// === HALFWIDTH CHARACTERS ===
		{
			label: 'Halfwidth katakana',
			input: '\uFF66',
			expectedWidth: 1,
			category: 'halfwidth',
		},
		{
			label: 'Halfwidth Hangul',
			input: '\uFFA0',
			expectedWidth: 1,
			category: 'halfwidth',
		},

		// === AMBIGUOUS WIDTH ===
		{
			label: 'Greek alpha',
			input: '\u03B1',
			expectedWidth: 1,
			category: 'ambiguous',
			notes: 'Ambiguous width - 1 in Western locale, 2 in CJK locale',
		},
		{
			label: 'Box drawing (light horizontal)',
			input: '\u2500',
			expectedWidth: 1,
			category: 'ambiguous',
		},
		{
			label: 'Bullet (•)',
			input: '\u2022',
			expectedWidth: 1,
			category: 'ambiguous',
		},

		// === SURROGATE PAIR (ASTRAL) CHARACTERS ===
		{
			label: 'Musical symbol (U+1D11E)',
			input: '\u{1D11E}',
			expectedWidth: 1,
			category: 'surrogate-pairs',
		},
		{
			label: 'Emoji face (U+1F600)',
			input: '\u{1F600}',
			expectedWidth: 2,
			category: 'surrogate-pairs',
		},
		{
			label: 'Skin tone modifier (U+1F3FD)',
			input: '\u{1F44B}\u{1F3FD}',
			expectedWidth: 2,
			category: 'surrogate-pairs',
			notes: 'Waving hand + medium skin tone',
		},

		// === MIXED SEQUENCES ===
		{
			label: 'ASCII + CJK mixed',
			input: 'Hello世界',
			expectedWidth: 9,
			category: 'mixed',
		},
		{
			label: 'Emoji + text mixed',
			input: '🎉 Party!',
			expectedWidth: 9,
			category: 'mixed',
		},
		{
			label: 'Empty string',
			input: '',
			expectedWidth: 0,
			category: 'mixed',
		},
		{
			label: 'Newline only',
			input: '\n',
			expectedWidth: 0,
			category: 'mixed',
		},
	];
}

// =============================================================================
// KNOWN-BAD SEQUENCES DATABASE
// =============================================================================

/**
 * Returns a database of sequences known to have inconsistent widths
 * across different terminals.
 *
 * @returns Array of known-bad sequences with per-terminal width info
 *
 * @example
 * ```typescript
 * import { getKnownBadSequences } from 'blecsd';
 *
 * const badSeqs = getKnownBadSequences();
 * for (const seq of badSeqs) {
 *   console.log(`${seq.label}: expected=${seq.expectedWidth}`);
 *   for (const [term, width] of Object.entries(seq.terminalWidths)) {
 *     console.log(`  ${term}: ${width}`);
 *   }
 * }
 * ```
 */
export function getKnownBadSequences(): readonly KnownBadSequence[] {
	return [
		{
			label: 'Family ZWJ emoji',
			input: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
			expectedWidth: 2,
			terminalWidths: {
				'xterm-256color': 8,
				kitty: 2,
				alacritty: 2,
				wezterm: 2,
				'gnome-terminal': 2,
				iterm2: 2,
				'windows-terminal': 2,
			},
			severity: 'major',
		},
		{
			label: 'Flag sequence (regional indicators)',
			input: '\u{1F1FA}\u{1F1F8}',
			expectedWidth: 2,
			terminalWidths: {
				'xterm-256color': 4,
				kitty: 2,
				alacritty: 2,
				wezterm: 2,
				iterm2: 2,
			},
			severity: 'major',
		},
		{
			label: 'Unpaired regional indicator',
			input: '\u{1F1FA}',
			expectedWidth: 2,
			terminalWidths: {
				'xterm-256color': 2,
				kitty: 1,
				alacritty: 2,
			},
			severity: 'minor',
		},
		{
			label: 'Skin tone emoji',
			input: '\u{1F44B}\u{1F3FD}',
			expectedWidth: 2,
			terminalWidths: {
				'xterm-256color': 4,
				kitty: 2,
				alacritty: 2,
				iterm2: 2,
			},
			severity: 'major',
		},
		{
			label: 'VS16 heart emoji',
			input: '\u2764\uFE0F',
			expectedWidth: 2,
			terminalWidths: {
				'xterm-256color': 1,
				kitty: 2,
				alacritty: 2,
				iterm2: 2,
			},
			severity: 'minor',
		},
		{
			label: 'Keycap sequence #️⃣',
			input: '#\uFE0F\u20E3',
			expectedWidth: 2,
			terminalWidths: {
				'xterm-256color': 2,
				kitty: 2,
				alacritty: 1,
			},
			severity: 'minor',
		},
		{
			label: 'Devanagari conjunct',
			input: '\u0915\u094D\u0937',
			expectedWidth: 2,
			terminalWidths: {
				'xterm-256color': 1,
				kitty: 2,
				alacritty: 1,
			},
			severity: 'minor',
		},
		{
			label: 'Zalgo text (heavy combining)',
			input: 'a\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307',
			expectedWidth: 1,
			terminalWidths: {
				'xterm-256color': 1,
				kitty: 1,
				alacritty: 1,
			},
			severity: 'critical',
		},
	];
}

// =============================================================================
// RUNTIME WIDTH OVERRIDE INJECTION
// =============================================================================

/** Active override map: codePoint -> width */
const overrideMap = new Map<number, number>();

/**
 * Installs width overrides from a terminal profile.
 *
 * @param profile - Terminal width profile with overrides
 *
 * @example
 * ```typescript
 * import { installWidthOverrides } from 'blecsd';
 *
 * installWidthOverrides({
 *   terminal: 'xterm-256color',
 *   overrides: [
 *     { codePoint: 0x2764, width: 1 },  // Heart in xterm is narrow
 *   ],
 * });
 * ```
 */
export function installWidthOverrides(profile: TerminalWidthProfile): void {
	const validated = TerminalWidthProfileSchema.parse(profile);
	for (const override of validated.overrides) {
		overrideMap.set(override.codePoint, override.width);
	}
}

/**
 * Clears all installed width overrides.
 */
export function clearWidthOverrides(): void {
	overrideMap.clear();
}

/**
 * Gets the currently installed override count.
 */
export function getOverrideCount(): number {
	return overrideMap.size;
}

/**
 * Gets the override width for a code point, or null if no override exists.
 */
export function getOverrideWidth(codePoint: number): number | null {
	return overrideMap.get(codePoint) ?? null;
}

/**
 * Measures string width with override support.
 * Uses installed overrides for specific code points, falls back to
 * standard width calculation for others.
 *
 * @param str - String to measure
 * @param options - Width options
 * @returns Display width in terminal columns
 *
 * @example
 * ```typescript
 * import { measureWidthWithOverrides, installWidthOverrides } from 'blecsd';
 *
 * // Without overrides: same as stringWidth
 * measureWidthWithOverrides('Hello'); // 5
 *
 * // With overrides: uses terminal-specific widths
 * installWidthOverrides({
 *   terminal: 'xterm',
 *   overrides: [{ codePoint: 0x2764, width: 1 }],
 * });
 * measureWidthWithOverrides('\u2764\uFE0F'); // Uses override
 * ```
 */
export function measureWidthWithOverrides(str: string, options?: WidthOptions): number {
	if (overrideMap.size === 0) {
		return stringWidth(str, options);
	}

	const tabWidth = options?.tabWidth ?? 8;
	let width = 0;
	let col = 0;

	for (let i = 0; i < str.length; i++) {
		const code = str.codePointAt(i);
		if (code === undefined) continue;

		// Handle newline
		if (code === 0x0a) {
			col = 0;
			continue;
		}

		// Handle tab
		if (code === 0x09) {
			const tabStop = tabWidth - (col % tabWidth);
			width += tabStop;
			col += tabStop;
			continue;
		}

		// Check override
		const override = overrideMap.get(code);
		if (override !== undefined) {
			width += override;
			col += override;
		} else {
			const w = getCharWidth(code);
			width += w;
			col += w;
		}

		// Skip low surrogate
		if (code > 0xffff) {
			i++;
		}
	}

	return width;
}

// =============================================================================
// TEST RUNNER
// =============================================================================

/**
 * Runs the width test corpus and returns results.
 *
 * @param corpus - Test cases to run
 * @param options - Width calculation options
 * @returns Test results with pass/fail counts and failure details
 *
 * @example
 * ```typescript
 * import { buildTestCorpus, runWidthTests } from 'blecsd';
 *
 * const corpus = buildTestCorpus();
 * const results = runWidthTests(corpus);
 *
 * console.log(`Passed: ${results.passed}/${results.total}`);
 * for (const f of results.failures) {
 *   console.log(`  FAIL: ${f.testCase.label}`);
 *   console.log(`    Expected: ${f.testCase.expectedWidth}, Got: ${f.actualWidth}`);
 * }
 * ```
 */
export function runWidthTests(
	corpus: readonly WidthTestCase[],
	options?: WidthOptions,
): WidthTestResult {
	const failures: WidthTestFailure[] = [];
	let passed = 0;

	for (const testCase of corpus) {
		const actual = stringWidth(testCase.input, options);
		if (actual === testCase.expectedWidth) {
			passed++;
		} else {
			failures.push({ testCase, actualWidth: actual });
		}
	}

	return {
		total: corpus.length,
		passed,
		failed: failures.length,
		failures,
	};
}

/**
 * Gets test cases filtered by category.
 *
 * @param corpus - Full test corpus
 * @param category - Category to filter by
 * @returns Filtered test cases
 */
export function filterByCategory(
	corpus: readonly WidthTestCase[],
	category: WidthTestCategory,
): readonly WidthTestCase[] {
	return corpus.filter((tc) => tc.category === category);
}

/**
 * Gets all unique categories in the corpus.
 */
export function getCategories(corpus: readonly WidthTestCase[]): readonly WidthTestCategory[] {
	const seen = new Set<WidthTestCategory>();
	for (const tc of corpus) {
		seen.add(tc.category);
	}
	return [...seen];
}

/**
 * Generates a human-readable report from test results.
 *
 * @param results - Test results from runWidthTests
 * @returns Formatted report string
 */
export function formatTestReport(results: WidthTestResult): string {
	const lines: string[] = [];
	lines.push(`Width Test Results: ${results.passed}/${results.total} passed`);
	lines.push('');

	if (results.failures.length === 0) {
		lines.push('All tests passed!');
		return lines.join('\n');
	}

	lines.push(`Failures (${results.failed}):`);
	for (const f of results.failures) {
		lines.push(`  [${f.testCase.category}] ${f.testCase.label}`);
		lines.push(`    Expected: ${f.testCase.expectedWidth}, Got: ${f.actualWidth}`);
		lines.push(`    Input: ${JSON.stringify(f.testCase.input)}`);
		if (f.testCase.notes) {
			lines.push(`    Note: ${f.testCase.notes}`);
		}
	}

	return lines.join('\n');
}
