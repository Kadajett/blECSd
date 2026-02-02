/**
 * Fuzzy Search Tests
 */

import { describe, expect, it } from 'vitest';
import {
	fuzzyFilter,
	fuzzyMatch,
	fuzzySearch,
	fuzzySearchBy,
	fuzzyTest,
	highlightMatch,
} from './fuzzySearch';

describe('Fuzzy Search', () => {
	describe('fuzzyMatch', () => {
		it('should match exact strings', () => {
			const result = fuzzyMatch('apple', 'apple');
			expect(result).not.toBeNull();
			expect(result?.score).toBe(1);
			expect(result?.indices).toEqual([0, 1, 2, 3, 4]);
		});

		it('should match prefix', () => {
			const result = fuzzyMatch('app', 'apple');
			expect(result).not.toBeNull();
			expect(result?.indices).toEqual([0, 1, 2]);
			expect(result?.score).toBeGreaterThan(0.5);
		});

		it('should match scattered characters', () => {
			const result = fuzzyMatch('ae', 'apple');
			expect(result).not.toBeNull();
			expect(result?.indices).toEqual([0, 4]);
		});

		it('should return null for non-matching queries', () => {
			const result = fuzzyMatch('xyz', 'apple');
			expect(result).toBeNull();
		});

		it('should return null if not all characters match', () => {
			const result = fuzzyMatch('appxle', 'apple');
			expect(result).toBeNull();
		});

		it('should handle empty query', () => {
			const result = fuzzyMatch('', 'apple');
			expect(result).not.toBeNull();
			expect(result?.score).toBe(1);
			expect(result?.indices).toEqual([]);
		});

		it('should handle case insensitive matching', () => {
			const result = fuzzyMatch('APP', 'apple', { caseSensitive: false });
			expect(result).not.toBeNull();
			expect(result?.indices).toEqual([0, 1, 2]);
		});

		it('should handle case sensitive matching', () => {
			const result = fuzzyMatch('APP', 'apple', { caseSensitive: true });
			expect(result).toBeNull();
		});

		it('should give bonus for consecutive matches', () => {
			const consecutive = fuzzyMatch('app', 'application');
			const scattered = fuzzyMatch('aln', 'application');

			expect(consecutive).not.toBeNull();
			expect(scattered).not.toBeNull();
			expect(consecutive!.score).toBeGreaterThan(scattered!.score);
		});

		it('should give bonus for word boundary matches', () => {
			const boundary = fuzzyMatch('gc', 'getUserConfig');
			const nonBoundary = fuzzyMatch('gc', 'magnificence');

			expect(boundary).not.toBeNull();
			expect(nonBoundary).not.toBeNull();
			expect(boundary!.score).toBeGreaterThan(nonBoundary!.score);
		});

		it('should give bonus for prefix matches', () => {
			const prefix = fuzzyMatch('app', 'apple');
			const middle = fuzzyMatch('ppl', 'apple');

			expect(prefix).not.toBeNull();
			expect(middle).not.toBeNull();
			expect(prefix!.score).toBeGreaterThan(middle!.score);
		});
	});

	describe('fuzzySearch', () => {
		const items = ['apple', 'application', 'banana', 'apply', 'apartment'];

		it('should return matches sorted by score', () => {
			const results = fuzzySearch('app', items);
			expect(results.length).toBeGreaterThan(0);

			// Check scores are descending
			for (let i = 1; i < results.length; i++) {
				expect(results[i - 1]?.score).toBeGreaterThanOrEqual(results[i]?.score ?? 0);
			}
		});

		it('should find all matching items', () => {
			const results = fuzzySearch('app', items);
			const matchedItems = results.map((r) => r.item);

			expect(matchedItems).toContain('apple');
			expect(matchedItems).toContain('application');
			expect(matchedItems).toContain('apply');
			// 'apartment' does NOT match 'app' - it has 'a-p-a-r...' not 'a-p-p'
			expect(matchedItems).not.toContain('apartment');
			expect(matchedItems).not.toContain('banana');
		});

		it('should respect threshold option', () => {
			const lowThreshold = fuzzySearch('a', items, { threshold: 0 });
			const highThreshold = fuzzySearch('a', items, { threshold: 0.9 });

			expect(lowThreshold.length).toBeGreaterThan(highThreshold.length);
		});

		it('should respect limit option', () => {
			const results = fuzzySearch('a', items, { limit: 2 });
			expect(results.length).toBe(2);
		});

		it('should handle empty array', () => {
			const results = fuzzySearch('app', []);
			expect(results).toEqual([]);
		});

		it('should handle empty query', () => {
			const results = fuzzySearch('', items);
			expect(results.length).toBe(items.length);
		});
	});

	describe('fuzzySearchBy', () => {
		interface Item {
			name: string;
			id: number;
		}

		const items: Item[] = [
			{ name: 'Apple', id: 1 },
			{ name: 'Application', id: 2 },
			{ name: 'Banana', id: 3 },
		];

		it('should search by custom text extractor', () => {
			const results = fuzzySearchBy('app', items, {
				getText: (item) => item.name,
			});

			expect(results.length).toBe(2);
			expect(results[0]?.item.name).toBe('Apple');
		});

		it('should preserve original item in results', () => {
			const results = fuzzySearchBy('app', items, {
				getText: (item) => item.name,
			});

			expect(results[0]?.item.id).toBe(1);
		});

		it('should respect all fuzzy options', () => {
			const results = fuzzySearchBy('app', items, {
				getText: (item) => item.name,
				caseSensitive: true,
				threshold: 0.5,
			});

			// "APP" won't match "Apple" case-sensitively
			expect(results.length).toBe(0);
		});
	});

	describe('highlightMatch', () => {
		it('should highlight matched characters', () => {
			const result = highlightMatch('apple', [0, 1, 2]);
			expect(result).toBe('[a][p][p]le');
		});

		it('should handle custom highlight function', () => {
			const result = highlightMatch('apple', [0, 1, 2], (c) => `<b>${c}</b>`);
			expect(result).toBe('<b>a</b><b>p</b><b>p</b>le');
		});

		it('should handle empty indices', () => {
			const result = highlightMatch('apple', []);
			expect(result).toBe('apple');
		});

		it('should handle scattered indices', () => {
			const result = highlightMatch('apple', [0, 4]);
			expect(result).toBe('[a]ppl[e]');
		});

		it('should handle full text match', () => {
			const result = highlightMatch('abc', [0, 1, 2]);
			expect(result).toBe('[a][b][c]');
		});
	});

	describe('fuzzyFilter', () => {
		const items = ['apple', 'application', 'banana', 'apply'];

		it('should return filtered items', () => {
			const result = fuzzyFilter('app', items);

			expect(result).toContain('apple');
			expect(result).toContain('application');
			expect(result).toContain('apply');
			expect(result).not.toContain('banana');
		});

		it('should return strings, not FuzzyMatch objects', () => {
			const result = fuzzyFilter('app', items);

			expect(typeof result[0]).toBe('string');
		});

		it('should preserve sort order', () => {
			const result = fuzzyFilter('app', items);

			// Should be sorted by score, so exact prefix matches should come first
			expect(result.indexOf('apple')).toBeLessThan(result.indexOf('application'));
		});
	});

	describe('fuzzyTest', () => {
		it('should return true for matching strings', () => {
			expect(fuzzyTest('app', 'apple')).toBe(true);
			expect(fuzzyTest('app', 'application')).toBe(true);
		});

		it('should return false for non-matching strings', () => {
			expect(fuzzyTest('xyz', 'apple')).toBe(false);
			expect(fuzzyTest('banana', 'apple')).toBe(false);
		});

		it('should respect threshold', () => {
			// 'a' in 'apple' is a weak match
			expect(fuzzyTest('a', 'apple', { threshold: 0 })).toBe(true);
			expect(fuzzyTest('a', 'apple', { threshold: 0.99 })).toBe(false);
		});

		it('should handle empty query', () => {
			expect(fuzzyTest('', 'apple')).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle single character queries', () => {
			const result = fuzzyMatch('a', 'apple');
			expect(result).not.toBeNull();
			expect(result?.indices).toEqual([0]);
		});

		it('should handle single character items', () => {
			const result = fuzzyMatch('a', 'a');
			expect(result).not.toBeNull();
			expect(result?.score).toBe(1);
		});

		it('should handle queries longer than items', () => {
			const result = fuzzyMatch('apple pie', 'apple');
			expect(result).toBeNull();
		});

		it('should handle special characters', () => {
			// Match 'f_b' in text containing special characters
			const result = fuzzyMatch('f_b', 'foo_bar_baz');
			expect(result).not.toBeNull();
			expect(result?.indices).toEqual([0, 3, 4]);
		});

		it('should handle unicode characters', () => {
			const result = fuzzyMatch('日本', '日本語');
			expect(result).not.toBeNull();
			expect(result?.indices).toEqual([0, 1]);
		});

		it('should handle repeated characters', () => {
			const result = fuzzyMatch('aaa', 'aaaaaa');
			expect(result).not.toBeNull();
			expect(result?.indices).toEqual([0, 1, 2]);
		});

		it('should match camelCase word boundaries', () => {
			const result = fuzzyMatch('gc', 'getUserConfig');
			expect(result).not.toBeNull();
			// Should match 'g' at 0 and 'C' at 7
			expect(result?.indices).toEqual([0, 7]);
		});
	});

	describe('performance', () => {
		it('should handle large item lists', () => {
			const items = Array.from({ length: 10000 }, (_, i) => `item_${i}_test`);
			const start = performance.now();
			const results = fuzzySearch('it', items);
			const duration = performance.now() - start;

			expect(results.length).toBeGreaterThan(0);
			expect(duration).toBeLessThan(500); // Should complete in under 500ms
		});

		it('should handle long strings', () => {
			const longString = 'a'.repeat(10000);
			const result = fuzzyMatch('aaa', longString);
			expect(result).not.toBeNull();
		});
	});
});
