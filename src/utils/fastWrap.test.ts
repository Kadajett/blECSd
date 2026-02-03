/**
 * Tests for Fast Word Wrap with Caching
 *
 * @module utils/fastWrap.test
 */

import { describe, expect, it } from 'vitest';
import {
	clearWrapCache,
	continueWrap,
	createWrapCache,
	getWrapCacheStats,
	invalidateAll,
	invalidateParagraph,
	invalidateRange,
	lineToPosition,
	positionToLine,
	resizeWrapCache,
	wrapVisibleFirst,
	wrapWithCache,
} from './fastWrap';

// =============================================================================
// CACHE CREATION
// =============================================================================

describe('createWrapCache', () => {
	it('creates cache with specified width', () => {
		const cache = createWrapCache(80);
		expect(cache.width).toBe(80);
	});

	it('starts with empty entries', () => {
		const cache = createWrapCache(80);
		expect(cache.entries.size).toBe(0);
	});

	it('starts with full invalidate flag', () => {
		const cache = createWrapCache(80);
		expect(cache.fullInvalidate).toBe(true);
	});
});

describe('clearWrapCache', () => {
	it('clears all entries', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		clearWrapCache(cache);

		expect(cache.entries.size).toBe(0);
		expect(cache.totalLines).toBe(0);
	});

	it('resets fullInvalidate flag', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Test');
		cache.fullInvalidate = false;

		clearWrapCache(cache);

		expect(cache.fullInvalidate).toBe(true);
	});
});

describe('resizeWrapCache', () => {
	it('updates width', () => {
		const cache = createWrapCache(80);
		resizeWrapCache(cache, 120);

		expect(cache.width).toBe(120);
	});

	it('marks all entries dirty on width change', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		resizeWrapCache(cache, 120);

		expect(cache.fullInvalidate).toBe(true);
		expect(cache.dirty.size).toBe(3);
	});

	it('does nothing if width unchanged', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Test');
		cache.fullInvalidate = false;

		resizeWrapCache(cache, 80);

		expect(cache.fullInvalidate).toBe(false);
	});
});

// =============================================================================
// BASIC WRAPPING
// =============================================================================

describe('wrapWithCache', () => {
	it('wraps simple text', () => {
		const cache = createWrapCache(10);
		const lines = wrapWithCache(cache, 'Hello World');

		expect(lines).toEqual(['Hello', 'World']);
	});

	it('handles empty text', () => {
		const cache = createWrapCache(80);
		const lines = wrapWithCache(cache, '');

		expect(lines).toEqual(['']);
	});

	it('preserves newlines', () => {
		const cache = createWrapCache(80);
		const lines = wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
	});

	it('wraps long lines', () => {
		const cache = createWrapCache(5);
		const lines = wrapWithCache(cache, 'abcdefghij');

		expect(lines[0]).toBe('abcde');
		expect(lines[1]).toBe('fghij');
	});

	it('uses cache on repeated calls', () => {
		const cache = createWrapCache(10);
		const text = 'Hello World';

		wrapWithCache(cache, text);
		const stats1 = getWrapCacheStats(cache);

		wrapWithCache(cache, text);
		const stats2 = getWrapCacheStats(cache);

		expect(stats1.cachedParagraphs).toBe(1);
		expect(stats2.cachedParagraphs).toBe(1);
	});

	it('updates totalLines', () => {
		const cache = createWrapCache(10);
		wrapWithCache(cache, 'Hello World\nAnother line here');

		expect(cache.totalLines).toBe(4);
	});

	it('handles very long words with breakWord', () => {
		const cache = createWrapCache(5);
		const lines = wrapWithCache(cache, 'abcdefghij', { breakWord: true });

		expect(lines[0]).toBe('abcde');
		expect(lines[1]).toBe('fghij');
	});
});

// =============================================================================
// VISIBLE-FIRST WRAPPING
// =============================================================================

describe('wrapVisibleFirst', () => {
	it('wraps visible range', () => {
		const cache = createWrapCache(80);
		const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

		const result = wrapVisibleFirst(cache, text, 1, 4);

		expect(result.lines).toEqual(['Line 2', 'Line 3', 'Line 4']);
	});

	it('returns hasMore when more paragraphs exist', () => {
		const cache = createWrapCache(80);
		const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

		const result = wrapVisibleFirst(cache, text, 0, 2);

		expect(result.hasMore).toBe(true);
		expect(result.nextParagraph).toBeGreaterThan(0);
	});

	it('returns hasMore=false when all done', () => {
		const cache = createWrapCache(80);
		const text = 'Line 1\nLine 2';

		const result = wrapVisibleFirst(cache, text, 0, 10);

		expect(result.hasMore).toBe(false);
	});

	it('tracks time taken', () => {
		const cache = createWrapCache(80);
		const result = wrapVisibleFirst(cache, 'Test text', 0, 10);

		expect(result.timeMs).toBeGreaterThanOrEqual(0);
	});

	it('handles empty range', () => {
		const cache = createWrapCache(80);
		const result = wrapVisibleFirst(cache, 'Line 1\nLine 2', 5, 5);

		expect(result.lines).toEqual([]);
	});
});

describe('continueWrap', () => {
	it('continues from specified paragraph', () => {
		const cache = createWrapCache(80);
		const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

		// First wrap visible
		wrapVisibleFirst(cache, text, 0, 2);

		// Continue from paragraph 2
		const result = continueWrap(cache, text, 2);

		expect(result.lines.length).toBeGreaterThan(0);
	});

	it('respects batch size', () => {
		const cache = createWrapCache(80);
		const text = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n');

		const result = continueWrap(cache, text, 0, 10);

		expect(result.nextParagraph).toBe(10);
		expect(result.hasMore).toBe(true);
	});

	it('returns hasMore=false when complete', () => {
		const cache = createWrapCache(80);
		const text = 'Line 1\nLine 2\nLine 3';

		const result = continueWrap(cache, text, 0, 100);

		expect(result.hasMore).toBe(false);
	});
});

// =============================================================================
// INVALIDATION
// =============================================================================

describe('invalidateRange', () => {
	it('marks paragraphs as dirty', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3\nLine 4');

		invalidateRange(cache, 1, 3);

		expect(cache.dirty.has(1)).toBe(true);
		expect(cache.dirty.has(2)).toBe(true);
		expect(cache.dirty.has(0)).toBe(false);
		expect(cache.dirty.has(3)).toBe(false);
	});
});

describe('invalidateParagraph', () => {
	it('marks single paragraph as dirty', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		invalidateParagraph(cache, 1);

		expect(cache.dirty.has(1)).toBe(true);
		expect(cache.dirty.has(0)).toBe(false);
		expect(cache.dirty.has(2)).toBe(false);
	});
});

describe('invalidateAll', () => {
	it('sets fullInvalidate flag', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Test');
		cache.fullInvalidate = false;

		invalidateAll(cache);

		expect(cache.fullInvalidate).toBe(true);
	});
});

// =============================================================================
// LINE MAPPING
// =============================================================================

describe('lineToPosition', () => {
	it('maps line 0 to paragraph 0', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		const pos = lineToPosition(cache, 0);

		expect(pos?.paragraph).toBe(0);
		expect(pos?.lineInParagraph).toBe(0);
	});

	it('maps wrapped lines correctly', () => {
		const cache = createWrapCache(5);
		wrapWithCache(cache, 'Hello World'); // Wraps to 2 lines

		const pos = lineToPosition(cache, 1);

		expect(pos?.paragraph).toBe(0);
		expect(pos?.lineInParagraph).toBe(1);
	});

	it('returns undefined for out of bounds', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2');

		expect(lineToPosition(cache, -1)).toBeUndefined();
		expect(lineToPosition(cache, 100)).toBeUndefined();
	});

	it('handles multiple paragraphs', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		const pos = lineToPosition(cache, 2);

		expect(pos?.paragraph).toBe(2);
		expect(pos?.lineInParagraph).toBe(0);
	});
});

describe('positionToLine', () => {
	it('maps paragraph 0 to line 0', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		const line = positionToLine(cache, 0);

		expect(line).toBe(0);
	});

	it('maps paragraph 2 correctly', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		const line = positionToLine(cache, 2);

		expect(line).toBe(2);
	});

	it('returns -1 for invalid paragraph', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1');

		expect(positionToLine(cache, -1)).toBe(-1);
		expect(positionToLine(cache, 100)).toBe(-1);
	});

	it('handles lineInParagraph offset', () => {
		const cache = createWrapCache(5);
		wrapWithCache(cache, 'Hello World'); // Wraps to 2 lines

		const line = positionToLine(cache, 0, 1);

		expect(line).toBe(1);
	});
});

// =============================================================================
// STATISTICS
// =============================================================================

describe('getWrapCacheStats', () => {
	it('returns correct stats', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');

		const stats = getWrapCacheStats(cache);

		expect(stats.cachedParagraphs).toBe(3);
		expect(stats.totalLines).toBe(3);
		expect(stats.width).toBe(80);
		expect(stats.fullInvalidate).toBe(false);
	});

	it('tracks dirty paragraphs', () => {
		const cache = createWrapCache(80);
		wrapWithCache(cache, 'Line 1\nLine 2\nLine 3');
		invalidateParagraph(cache, 1);

		const stats = getWrapCacheStats(cache);

		expect(stats.dirtyParagraphs).toBe(1);
	});
});

// =============================================================================
// PERFORMANCE SCENARIOS
// =============================================================================

describe('performance scenarios', () => {
	it('handles 1000 paragraphs', () => {
		const cache = createWrapCache(80);
		const text = Array.from({ length: 1000 }, (_, i) => `Paragraph ${i} with some text`).join('\n');

		const lines = wrapWithCache(cache, text);

		expect(lines.length).toBe(1000);
	});

	it('caches efficiently on re-wrap', () => {
		const cache = createWrapCache(80);
		const text = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n');

		// First wrap
		const start1 = performance.now();
		wrapWithCache(cache, text);
		const time1 = performance.now() - start1;

		// Second wrap (should use cache)
		const start2 = performance.now();
		wrapWithCache(cache, text);
		const time2 = performance.now() - start2;

		// Cached should be faster (or at least not slower)
		expect(time2).toBeLessThanOrEqual(time1 * 2);
	});

	it('handles width change efficiently', () => {
		const cache = createWrapCache(80);
		const text = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n');

		wrapWithCache(cache, text);
		resizeWrapCache(cache, 120);

		const lines = wrapWithCache(cache, text);

		expect(lines.length).toBe(100);
	});

	it('visible-first is fast for large documents', () => {
		const cache = createWrapCache(80);
		const text = Array.from({ length: 10000 }, (_, i) => `Line ${i}`).join('\n');

		const result = wrapVisibleFirst(cache, text, 0, 50);

		expect(result.timeMs).toBeLessThan(100); // Should be fast
		expect(result.lines.length).toBe(50);
	});
});

// =============================================================================
// UNICODE HANDLING
// =============================================================================

describe('unicode handling', () => {
	it('handles CJK characters', () => {
		const cache = createWrapCache(10);
		const lines = wrapWithCache(cache, '你好世界测试文本');

		// CJK characters are typically 2 cells wide
		expect(lines.length).toBeGreaterThan(1);
	});

	it('handles emoji', () => {
		const cache = createWrapCache(10);
		const lines = wrapWithCache(cache, '😀🎉🚀💻🌍');

		expect(lines.length).toBeGreaterThanOrEqual(1);
	});

	it('handles mixed content', () => {
		const cache = createWrapCache(20);
		const lines = wrapWithCache(cache, 'Hello 世界 🌍 Test');

		expect(lines.length).toBeGreaterThanOrEqual(1);
	});
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('edge cases', () => {
	it('handles very narrow width', () => {
		const cache = createWrapCache(1);
		const lines = wrapWithCache(cache, 'abc', { breakWord: true });

		expect(lines).toEqual(['a', 'b', 'c']);
	});

	it('handles width of 0', () => {
		const cache = createWrapCache(0);
		const lines = wrapWithCache(cache, 'Test');

		expect(lines).toEqual(['']);
	});

	it('handles only whitespace', () => {
		const cache = createWrapCache(80);
		const lines = wrapWithCache(cache, '   ');

		expect(lines.length).toBeGreaterThanOrEqual(1);
	});

	it('handles very long single line', () => {
		const cache = createWrapCache(10);
		const longLine = 'a'.repeat(1000);
		const lines = wrapWithCache(cache, longLine, { breakWord: true });

		expect(lines.length).toBe(100);
	});

	it('handles trailing newlines', () => {
		const cache = createWrapCache(80);
		const lines = wrapWithCache(cache, 'Line 1\n\n\n');

		expect(lines).toEqual(['Line 1', '', '', '']);
	});
});
