import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	buildTestCorpus,
	clearWidthOverrides,
	filterByCategory,
	formatTestReport,
	getCategories,
	getKnownBadSequences,
	getOverrideCount,
	getOverrideWidth,
	installWidthOverrides,
	measureWidthWithOverrides,
	runWidthTests,
	TerminalWidthProfileSchema,
	WidthOverrideSchema,
} from './widthHarness';

describe('widthHarness', () => {
	describe('buildTestCorpus', () => {
		it('returns a non-empty array', () => {
			const corpus = buildTestCorpus();
			expect(corpus.length).toBeGreaterThan(0);
		});

		it('covers all expected categories', () => {
			const corpus = buildTestCorpus();
			const categories = getCategories(corpus);
			expect(categories).toContain('emoji-zwj');
			expect(categories).toContain('regional-indicators');
			expect(categories).toContain('variation-selectors');
			expect(categories).toContain('cjk');
			expect(categories).toContain('combining');
			expect(categories).toContain('tabs');
			expect(categories).toContain('control');
			expect(categories).toContain('fullwidth');
			expect(categories).toContain('halfwidth');
			expect(categories).toContain('ambiguous');
			expect(categories).toContain('surrogate-pairs');
			expect(categories).toContain('mixed');
		});

		it('each test case has required fields', () => {
			const corpus = buildTestCorpus();
			for (const tc of corpus) {
				expect(tc.label).toBeTruthy();
				expect(typeof tc.input).toBe('string');
				expect(typeof tc.expectedWidth).toBe('number');
				expect(tc.category).toBeTruthy();
			}
		});
	});

	describe('getKnownBadSequences', () => {
		it('returns a non-empty array', () => {
			const seqs = getKnownBadSequences();
			expect(seqs.length).toBeGreaterThan(0);
		});

		it('each entry has required fields', () => {
			const seqs = getKnownBadSequences();
			for (const seq of seqs) {
				expect(seq.label).toBeTruthy();
				expect(typeof seq.input).toBe('string');
				expect(typeof seq.expectedWidth).toBe('number');
				expect(Object.keys(seq.terminalWidths).length).toBeGreaterThan(0);
				expect(['minor', 'major', 'critical']).toContain(seq.severity);
			}
		});

		it('includes family ZWJ emoji as known-bad', () => {
			const seqs = getKnownBadSequences();
			const family = seqs.find((s) => s.label.includes('Family'));
			expect(family).toBeDefined();
			expect(family!.severity).toBe('major');
		});
	});

	describe('runtime width overrides', () => {
		beforeEach(() => {
			clearWidthOverrides();
		});

		afterEach(() => {
			clearWidthOverrides();
		});

		it('starts with zero overrides', () => {
			expect(getOverrideCount()).toBe(0);
		});

		it('installs overrides from a profile', () => {
			installWidthOverrides({
				terminal: 'test-terminal',
				overrides: [
					{ codePoint: 0x2764, width: 1 },
					{ codePoint: 0x1f600, width: 2 },
				],
			});
			expect(getOverrideCount()).toBe(2);
		});

		it('retrieves override width for a code point', () => {
			installWidthOverrides({
				terminal: 'test',
				overrides: [{ codePoint: 0x2764, width: 1 }],
			});
			expect(getOverrideWidth(0x2764)).toBe(1);
		});

		it('returns null for non-overridden code points', () => {
			expect(getOverrideWidth(0x41)).toBeNull();
		});

		it('clears all overrides', () => {
			installWidthOverrides({
				terminal: 'test',
				overrides: [{ codePoint: 0x2764, width: 1 }],
			});
			clearWidthOverrides();
			expect(getOverrideCount()).toBe(0);
			expect(getOverrideWidth(0x2764)).toBeNull();
		});

		it('validates profile with Zod schema', () => {
			expect(() =>
				installWidthOverrides({
					terminal: '',
					overrides: [],
				}),
			).toThrow();
		});
	});

	describe('measureWidthWithOverrides', () => {
		beforeEach(() => {
			clearWidthOverrides();
		});

		afterEach(() => {
			clearWidthOverrides();
		});

		it('returns standard width when no overrides installed', () => {
			const w = measureWidthWithOverrides('Hello');
			expect(w).toBe(5);
		});

		it('uses override width for overridden code points', () => {
			installWidthOverrides({
				terminal: 'test',
				overrides: [{ codePoint: 0x41, width: 2 }],
			});
			// 'A' is code point 0x41, override to width 2
			const w = measureWidthWithOverrides('A');
			expect(w).toBe(2);
		});

		it('handles tabs with overrides', () => {
			installWidthOverrides({
				terminal: 'test',
				overrides: [{ codePoint: 0x41, width: 2 }],
			});
			const w = measureWidthWithOverrides('\t');
			expect(w).toBe(8);
		});

		it('handles newlines with overrides', () => {
			installWidthOverrides({
				terminal: 'test',
				overrides: [{ codePoint: 0x41, width: 2 }],
			});
			const w = measureWidthWithOverrides('\n');
			expect(w).toBe(0);
		});
	});

	describe('runWidthTests', () => {
		it('returns results with correct totals', () => {
			const corpus = buildTestCorpus();
			const results = runWidthTests(corpus);
			expect(results.total).toBe(corpus.length);
			expect(results.passed + results.failed).toBe(results.total);
		});

		it('failures contain the test case and actual width', () => {
			const corpus = buildTestCorpus();
			const results = runWidthTests(corpus);
			for (const f of results.failures) {
				expect(f.testCase).toBeDefined();
				expect(typeof f.actualWidth).toBe('number');
				expect(f.actualWidth).not.toBe(f.testCase.expectedWidth);
			}
		});
	});

	describe('filterByCategory', () => {
		it('returns only cases matching the category', () => {
			const corpus = buildTestCorpus();
			const cjk = filterByCategory(corpus, 'cjk');
			expect(cjk.length).toBeGreaterThan(0);
			for (const tc of cjk) {
				expect(tc.category).toBe('cjk');
			}
		});

		it('returns empty array for non-existent category', () => {
			const corpus = buildTestCorpus();
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			const result = filterByCategory(corpus, 'nonexistent' as any);
			expect(result.length).toBe(0);
		});
	});

	describe('getCategories', () => {
		it('returns unique categories', () => {
			const corpus = buildTestCorpus();
			const categories = getCategories(corpus);
			const unique = new Set(categories);
			expect(unique.size).toBe(categories.length);
		});
	});

	describe('formatTestReport', () => {
		it('formats passing results', () => {
			const report = formatTestReport({
				total: 5,
				passed: 5,
				failed: 0,
				failures: [],
			});
			expect(report).toContain('5/5 passed');
			expect(report).toContain('All tests passed');
		});

		it('formats failing results', () => {
			const report = formatTestReport({
				total: 2,
				passed: 1,
				failed: 1,
				failures: [
					{
						testCase: {
							label: 'Test case',
							input: 'x',
							expectedWidth: 2,
							category: 'cjk',
						},
						actualWidth: 1,
					},
				],
			});
			expect(report).toContain('1/2 passed');
			expect(report).toContain('Failures (1)');
			expect(report).toContain('Test case');
			expect(report).toContain('Expected: 2, Got: 1');
		});

		it('includes notes in failure output', () => {
			const report = formatTestReport({
				total: 1,
				passed: 0,
				failed: 1,
				failures: [
					{
						testCase: {
							label: 'Noted test',
							input: 'x',
							expectedWidth: 2,
							category: 'cjk',
							notes: 'Special note',
						},
						actualWidth: 1,
					},
				],
			});
			expect(report).toContain('Special note');
		});
	});

	describe('Zod schemas', () => {
		it('WidthOverrideSchema validates correct data', () => {
			const result = WidthOverrideSchema.parse({ codePoint: 65, width: 1 });
			expect(result.codePoint).toBe(65);
			expect(result.width).toBe(1);
		});

		it('WidthOverrideSchema rejects negative codePoint', () => {
			expect(() => WidthOverrideSchema.parse({ codePoint: -1, width: 1 })).toThrow();
		});

		it('WidthOverrideSchema rejects width > 2', () => {
			expect(() => WidthOverrideSchema.parse({ codePoint: 65, width: 3 })).toThrow();
		});

		it('TerminalWidthProfileSchema validates correct data', () => {
			const result = TerminalWidthProfileSchema.parse({
				terminal: 'xterm',
				overrides: [{ codePoint: 65, width: 1 }],
			});
			expect(result.terminal).toBe('xterm');
			expect(result.overrides.length).toBe(1);
		});

		it('TerminalWidthProfileSchema rejects empty terminal', () => {
			expect(() =>
				TerminalWidthProfileSchema.parse({
					terminal: '',
					overrides: [],
				}),
			).toThrow();
		});
	});
});
