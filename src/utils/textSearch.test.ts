/**
 * Tests for Efficient Text Search
 *
 * @module utils/textSearch.test
 */

import { describe, expect, it } from 'vitest';
import {
	boyerMooreHorspool,
	clearSearchCache,
	createSearchCache,
	findNearestMatch,
	getMatchAt,
	getMatchStatus,
	getNextMatch,
	getPreviousMatch,
	getVisibleMatches,
	search,
	searchBatch,
	searchLiteral,
	searchRegex,
	searchReverse,
	searchWithCache,
	updateSearchQuery,
} from './textSearch';

// =============================================================================
// BOYER-MOORE-HORSPOOL
// =============================================================================

describe('boyerMooreHorspool', () => {
	it('finds single match', () => {
		const matches = boyerMooreHorspool('hello world', 'world');
		expect(matches).toEqual([6]);
	});

	it('finds multiple matches', () => {
		const matches = boyerMooreHorspool('abcabc', 'abc');
		expect(matches).toEqual([0, 3]);
	});

	it('handles no matches', () => {
		const matches = boyerMooreHorspool('hello world', 'xyz');
		expect(matches).toEqual([]);
	});

	it('handles empty pattern', () => {
		const matches = boyerMooreHorspool('hello world', '');
		expect(matches).toEqual([]);
	});

	it('handles pattern longer than text', () => {
		const matches = boyerMooreHorspool('hi', 'hello world');
		expect(matches).toEqual([]);
	});

	it('respects case sensitivity', () => {
		const matchesSensitive = boyerMooreHorspool('Hello World', 'hello', true);
		const matchesInsensitive = boyerMooreHorspool('Hello World', 'hello', false);

		expect(matchesSensitive).toEqual([]);
		expect(matchesInsensitive).toEqual([0]);
	});

	it('respects start position', () => {
		const matches = boyerMooreHorspool('abcabc', 'abc', true, 1);
		expect(matches).toEqual([3]);
	});

	it('finds overlapping matches', () => {
		const matches = boyerMooreHorspool('aaaa', 'aa');
		expect(matches).toEqual([0, 1, 2]);
	});
});

// =============================================================================
// LITERAL SEARCH
// =============================================================================

describe('searchLiteral', () => {
	it('finds matches with line info', () => {
		const result = searchLiteral('line 1\nfoo\nline 3', 'foo');

		expect(result.matches.length).toBe(1);
		expect(result.matches[0]?.line).toBe(1);
		expect(result.matches[0]?.column).toBe(0);
		expect(result.matches[0]?.text).toBe('foo');
	});

	it('handles multi-line text', () => {
		const result = searchLiteral('foo\nbar\nfoo\nbaz', 'foo');

		expect(result.matches.length).toBe(2);
		expect(result.matches[0]?.line).toBe(0);
		expect(result.matches[1]?.line).toBe(2);
	});

	it('case-insensitive by default', () => {
		const result = searchLiteral('Hello World', 'hello');

		expect(result.matches.length).toBe(1);
	});

	it('respects caseSensitive option', () => {
		const result = searchLiteral('Hello World', 'hello', { caseSensitive: true });

		expect(result.matches.length).toBe(0);
	});

	it('respects wholeWord option', () => {
		const result1 = searchLiteral('football foo foobar', 'foo', { wholeWord: true });
		const result2 = searchLiteral('football foo foobar', 'foo', { wholeWord: false });

		expect(result1.matches.length).toBe(1);
		expect(result1.matches[0]?.start).toBe(9); // Only standalone 'foo'
		expect(result2.matches.length).toBe(3);
	});

	it('respects maxMatches', () => {
		const result = searchLiteral('aaa', 'a', { maxMatches: 2 });

		expect(result.matches.length).toBe(2);
		expect(result.truncated).toBe(true);
	});

	it('handles empty query', () => {
		const result = searchLiteral('hello', '');

		expect(result.matches.length).toBe(0);
	});

	it('returns correct timing', () => {
		const result = searchLiteral('hello world', 'world');

		expect(result.timeMs).toBeGreaterThanOrEqual(0);
	});
});

// =============================================================================
// REGEX SEARCH
// =============================================================================

describe('searchRegex', () => {
	it('finds regex matches', () => {
		const result = searchRegex('abc 123 def 456', '\\d+');

		expect(result.matches.length).toBe(2);
		expect(result.matches[0]?.text).toBe('123');
		expect(result.matches[1]?.text).toBe('456');
	});

	it('handles invalid regex gracefully', () => {
		const result = searchRegex('hello', '[invalid');

		expect(result.matches.length).toBe(0);
		expect(result.timedOut).toBe(false);
	});

	it('case-insensitive by default', () => {
		const result = searchRegex('Hello World', 'hello');

		expect(result.matches.length).toBe(1);
	});

	it('respects caseSensitive option', () => {
		const result = searchRegex('Hello World', 'hello', { caseSensitive: true });

		expect(result.matches.length).toBe(0);
	});

	it('handles groups', () => {
		const result = searchRegex('foo bar', 'foo|bar');

		expect(result.matches.length).toBe(2);
		expect(result.matches[0]?.text).toBe('foo');
		expect(result.matches[1]?.text).toBe('bar');
	});

	it('respects maxMatches', () => {
		const result = searchRegex('aaa', 'a', { maxMatches: 2 });

		expect(result.matches.length).toBe(2);
		expect(result.truncated).toBe(true);
	});

	it('prevents infinite loop on empty match', () => {
		const result = searchRegex('aaa', 'a*', { maxMatches: 10 });

		// Should not hang, should return matches
		expect(result.matches.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// UNIFIED SEARCH
// =============================================================================

describe('search', () => {
	it('uses literal search by default', () => {
		const result = search('hello world', 'world');

		expect(result.matches.length).toBe(1);
	});

	it('uses regex search when option set', () => {
		const result = search('abc 123', '\\d+', { regex: true });

		expect(result.matches.length).toBe(1);
		expect(result.matches[0]?.text).toBe('123');
	});
});

// =============================================================================
// BATCH SEARCH
// =============================================================================

describe('searchBatch', () => {
	it('searches in batches', () => {
		const text = 'abc'.repeat(100);
		const result = searchBatch(text, 'abc', 0, 50);

		expect(result.matches.length).toBeGreaterThan(0);
		expect(result.hasMore).toBe(true);
		expect(result.nextPosition).toBe(50);
	});

	it('returns hasMore=false when done', () => {
		const text = 'hello world';
		const result = searchBatch(text, 'world', 0, 100);

		expect(result.hasMore).toBe(false);
	});

	it('handles start position', () => {
		const text = 'abc abc abc';
		// First batch searches 0-5, finds match at 0
		const result1 = searchBatch(text, 'abc', 0, 5);
		// Second batch searches from 5-11, finds matches at 4 and 8
		// But match at 4 starts before position 5, so only match at 8 is included
		const result2 = searchBatch(text, 'abc', 5, 100);

		expect(result1.matches.length).toBe(1);
		expect(result2.matches.length).toBe(1); // Only match at 8
	});
});

// =============================================================================
// SEARCH CACHE
// =============================================================================

describe('createSearchCache', () => {
	it('creates empty cache', () => {
		const cache = createSearchCache();

		expect(cache.query).toBe('');
		expect(cache.matches.length).toBe(0);
		expect(cache.currentIndex).toBe(-1);
		expect(cache.complete).toBe(false);
	});
});

describe('clearSearchCache', () => {
	it('clears all cache data', () => {
		const cache = createSearchCache();
		cache.query = 'test';
		cache.matches = [{ start: 0, end: 4, line: 0, column: 0, text: 'test' }];
		cache.currentIndex = 0;

		clearSearchCache(cache);

		expect(cache.query).toBe('');
		expect(cache.matches.length).toBe(0);
		expect(cache.currentIndex).toBe(-1);
	});
});

describe('updateSearchQuery', () => {
	it('returns true when query changes', () => {
		const cache = createSearchCache();
		cache.query = 'old';

		const invalidated = updateSearchQuery(cache, 'text', 'new');

		expect(invalidated).toBe(true);
		expect(cache.query).toBe('new');
	});

	it('returns false when query unchanged', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'text', 'query');

		const invalidated = updateSearchQuery(cache, 'text', 'query');

		expect(invalidated).toBe(false);
	});

	it('invalidates when options change', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'text', 'query', { caseSensitive: false });

		const invalidated = updateSearchQuery(cache, 'text', 'query', { caseSensitive: true });

		expect(invalidated).toBe(true);
	});
});

describe('searchWithCache', () => {
	it('caches search results', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'abc abc abc', 'abc');

		const result1 = searchWithCache(cache, 'abc abc abc', 1000);
		const result2 = searchWithCache(cache, 'abc abc abc', 1000);

		expect(result1.matches.length).toBe(3);
		expect(result2.matches.length).toBe(3);
		expect(cache.complete).toBe(true);
	});

	it('performs incremental search', () => {
		const cache = createSearchCache();
		const text = 'abc '.repeat(1000); // 4000 chars
		updateSearchQuery(cache, text, 'abc');

		// First batch searches 0-100, finds some matches
		searchWithCache(cache, text, 100);
		expect(cache.complete).toBe(false);

		// Continue searching, should find more
		while (!cache.complete) {
			searchWithCache(cache, text, 100);
		}

		expect(cache.matches.length).toBe(1000);
	});
});

// =============================================================================
// NAVIGATION
// =============================================================================

describe('getNextMatch', () => {
	it('cycles through matches', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'a b c', 'a');
		searchWithCache(cache, 'a b c');

		const match1 = getNextMatch(cache);
		expect(match1?.start).toBe(0);
		expect(cache.currentIndex).toBe(0);
	});

	it('returns undefined when no matches', () => {
		const cache = createSearchCache();

		const match = getNextMatch(cache);

		expect(match).toBeUndefined();
	});

	it('wraps around', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'aa', 'a');
		searchWithCache(cache, 'aa');

		getNextMatch(cache); // 0
		getNextMatch(cache); // 1
		const match = getNextMatch(cache); // Wrap to 0

		expect(cache.currentIndex).toBe(0);
		expect(match?.start).toBe(0);
	});
});

describe('getPreviousMatch', () => {
	it('goes backwards', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'aa', 'a');
		searchWithCache(cache, 'aa');
		cache.currentIndex = 1;

		const match = getPreviousMatch(cache);

		expect(match?.start).toBe(0);
		expect(cache.currentIndex).toBe(0);
	});

	it('wraps around to end', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'aa', 'a');
		searchWithCache(cache, 'aa');
		cache.currentIndex = 0;

		getPreviousMatch(cache);

		expect(cache.currentIndex).toBe(1);
	});
});

describe('getMatchAt', () => {
	it('gets match at index', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'abc', 'a');
		searchWithCache(cache, 'abc');

		const match = getMatchAt(cache, 0);

		expect(match?.start).toBe(0);
		expect(cache.currentIndex).toBe(0);
	});

	it('returns undefined for invalid index', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'abc', 'a');
		searchWithCache(cache, 'abc');

		expect(getMatchAt(cache, -1)).toBeUndefined();
		expect(getMatchAt(cache, 100)).toBeUndefined();
	});
});

describe('findNearestMatch', () => {
	it('finds nearest match after position', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'abc abc abc', 'abc');
		searchWithCache(cache, 'abc abc abc');

		const result = findNearestMatch(cache, 5);

		expect(result?.match.start).toBe(8); // Third match at position 8
	});

	it('finds nearest match before position', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'abc abc abc', 'abc');
		searchWithCache(cache, 'abc abc abc');

		const result = findNearestMatch(cache, 5, false);

		expect(result?.match.start).toBe(4); // Second match at position 4
	});

	it('returns undefined when no matches', () => {
		const cache = createSearchCache();

		const result = findNearestMatch(cache, 0);

		expect(result).toBeUndefined();
	});
});

// =============================================================================
// VISIBLE MATCHES
// =============================================================================

describe('getVisibleMatches', () => {
	it('filters matches by line range', () => {
		const cache = createSearchCache();
		const text = 'abc\nabc\nabc\nabc\nabc';
		updateSearchQuery(cache, text, 'abc');
		searchWithCache(cache, text);

		const visible = getVisibleMatches(cache, 1, 3);

		expect(visible.length).toBe(2);
		expect(visible[0]?.line).toBe(1);
		expect(visible[1]?.line).toBe(2);
	});
});

describe('getMatchStatus', () => {
	it('returns current and total', () => {
		const cache = createSearchCache();
		updateSearchQuery(cache, 'aaa', 'a');
		searchWithCache(cache, 'aaa');
		cache.currentIndex = 1;

		const status = getMatchStatus(cache);

		expect(status.current).toBe(2);
		expect(status.total).toBe(3);
		expect(status.complete).toBe(true);
	});
});

// =============================================================================
// REVERSE SEARCH
// =============================================================================

describe('searchReverse', () => {
	it('returns matches in reverse order', () => {
		const result = searchReverse('abc abc abc', 'abc');

		expect(result.matches.length).toBe(3);
		expect(result.matches[0]?.start).toBe(8);
		expect(result.matches[1]?.start).toBe(4);
		expect(result.matches[2]?.start).toBe(0);
	});
});

// =============================================================================
// PERFORMANCE SCENARIOS
// =============================================================================

describe('performance scenarios', () => {
	it('handles large text', () => {
		const text = 'abc '.repeat(10000);
		const result = search(text, 'abc');

		expect(result.matches.length).toBe(10000);
	});

	it('handles many matches', () => {
		const text = 'a'.repeat(10000);
		const result = search(text, 'a', { maxMatches: 5000 });

		expect(result.matches.length).toBe(5000);
		expect(result.truncated).toBe(true);
	});

	it('incremental search is faster on second call', () => {
		const cache = createSearchCache();
		const text = 'abc '.repeat(1000);
		updateSearchQuery(cache, text, 'abc');

		const start1 = performance.now();
		searchWithCache(cache, text);
		const time1 = performance.now() - start1;

		const start2 = performance.now();
		searchWithCache(cache, text);
		const time2 = performance.now() - start2;

		// Cached should be much faster
		expect(time2).toBeLessThan(time1);
	});
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('edge cases', () => {
	it('handles empty text', () => {
		const result = search('', 'query');
		expect(result.matches.length).toBe(0);
	});

	it('handles query at start', () => {
		const result = search('abc def', 'abc');
		expect(result.matches[0]?.start).toBe(0);
		expect(result.matches[0]?.column).toBe(0);
	});

	it('handles query at end', () => {
		const result = search('abc def', 'def');
		expect(result.matches[0]?.start).toBe(4);
	});

	it('handles newlines in query', () => {
		const result = search('abc\ndef', 'c\nd');
		expect(result.matches.length).toBe(1);
	});

	it('handles unicode', () => {
		const result = search('hello 世界 world', '世界');
		expect(result.matches.length).toBe(1);
	});

	it('handles special regex characters in literal search', () => {
		const result = search('a.b a*b a+b', 'a.b');
		expect(result.matches.length).toBe(1);
	});
});
