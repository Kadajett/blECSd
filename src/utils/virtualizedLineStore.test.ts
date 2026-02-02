/**
 * Tests for VirtualizedLineStore
 */

import { describe, expect, it } from 'vitest';
import {
	appendLines,
	appendToStore,
	createEmptyLineStore,
	createLineStore,
	createLineStoreFromLines,
	exportContent,
	exportLineRange,
	getByteSize,
	getLineAtIndex,
	getLineCount,
	getLineForOffset,
	getLineInfo,
	getLineRange,
	getOffsetForLine,
	getStoreStats,
	getVisibleLines,
	isStoreEmpty,
	trimToLineCount,
} from './virtualizedLineStore';

describe('virtualizedLineStore', () => {
	describe('createLineStore', () => {
		it('creates empty store', () => {
			const store = createLineStore('');
			expect(store.lineCount).toBe(0);
			expect(store.byteSize).toBe(0);
			expect(store.indexed).toBe(true);
		});

		it('creates store with single line', () => {
			const store = createLineStore('Hello, World!');
			expect(store.lineCount).toBe(1);
			expect(store.byteSize).toBe(13);
		});

		it('creates store with multiple lines', () => {
			const store = createLineStore('Line 1\nLine 2\nLine 3');
			expect(store.lineCount).toBe(3);
		});

		it('handles trailing newline', () => {
			const store = createLineStore('Line 1\nLine 2\n');
			expect(store.lineCount).toBe(3);
		});

		it('handles empty lines', () => {
			const store = createLineStore('Line 1\n\nLine 3');
			expect(store.lineCount).toBe(3);
			expect(getLineAtIndex(store, 1)).toBe('');
		});
	});

	describe('createLineStoreFromLines', () => {
		it('creates store from array', () => {
			const store = createLineStoreFromLines(['Line 1', 'Line 2', 'Line 3']);
			expect(store.lineCount).toBe(3);
			expect(getLineAtIndex(store, 0)).toBe('Line 1');
			expect(getLineAtIndex(store, 1)).toBe('Line 2');
			expect(getLineAtIndex(store, 2)).toBe('Line 3');
		});

		it('handles empty array', () => {
			const store = createLineStoreFromLines([]);
			expect(store.lineCount).toBe(0);
		});

		it('handles single line', () => {
			const store = createLineStoreFromLines(['Only line']);
			expect(store.lineCount).toBe(1);
			expect(getLineAtIndex(store, 0)).toBe('Only line');
		});
	});

	describe('createEmptyLineStore', () => {
		it('creates empty store', () => {
			const store = createEmptyLineStore();
			expect(store.lineCount).toBe(0);
			expect(store.byteSize).toBe(0);
			expect(isStoreEmpty(store)).toBe(true);
		});
	});

	describe('getLineAtIndex', () => {
		it('returns line at valid index', () => {
			const store = createLineStore('Line 1\nLine 2\nLine 3');
			expect(getLineAtIndex(store, 0)).toBe('Line 1');
			expect(getLineAtIndex(store, 1)).toBe('Line 2');
			expect(getLineAtIndex(store, 2)).toBe('Line 3');
		});

		it('returns undefined for negative index', () => {
			const store = createLineStore('Line 1');
			expect(getLineAtIndex(store, -1)).toBeUndefined();
		});

		it('returns undefined for index out of bounds', () => {
			const store = createLineStore('Line 1');
			expect(getLineAtIndex(store, 1)).toBeUndefined();
			expect(getLineAtIndex(store, 100)).toBeUndefined();
		});
	});

	describe('getLineInfo', () => {
		it('returns full line info', () => {
			const store = createLineStore('Line 1\nLine 2');
			const info = getLineInfo(store, 1);

			expect(info).toBeDefined();
			expect(info?.text).toBe('Line 2');
			expect(info?.offset).toBe(7);
			expect(info?.length).toBe(6);
			expect(info?.lineNumber).toBe(1);
		});

		it('returns undefined for invalid index', () => {
			const store = createLineStore('Line 1');
			expect(getLineInfo(store, -1)).toBeUndefined();
			expect(getLineInfo(store, 1)).toBeUndefined();
		});
	});

	describe('getLineRange', () => {
		it('returns range of lines', () => {
			const store = createLineStore('Line 0\nLine 1\nLine 2\nLine 3\nLine 4');
			const range = getLineRange(store, 1, 4);

			expect(range.lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
			expect(range.startLine).toBe(1);
			expect(range.endLine).toBe(4);
		});

		it('clamps to valid range', () => {
			const store = createLineStore('Line 0\nLine 1');
			const range = getLineRange(store, -5, 100);

			expect(range.lines).toEqual(['Line 0', 'Line 1']);
			expect(range.startLine).toBe(0);
			expect(range.endLine).toBe(2);
		});

		it('returns empty for invalid range', () => {
			const store = createLineStore('Line 0');
			const range = getLineRange(store, 5, 3);

			expect(range.lines).toEqual([]);
		});

		it('includes extractTimeMs', () => {
			const store = createLineStore('Line 0\nLine 1');
			const range = getLineRange(store, 0, 2);

			expect(range.extractTimeMs).toBeGreaterThanOrEqual(0);
		});
	});

	describe('getVisibleLines', () => {
		it('includes overscan', () => {
			const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}`);
			const store = createLineStoreFromLines(lines);

			const visible = getVisibleLines(store, 50, 10, 5, 5);

			expect(visible.startLine).toBe(45);
			expect(visible.endLine).toBe(65);
			expect(visible.lines.length).toBe(20);
		});

		it('clamps overscan at boundaries', () => {
			const lines = Array.from({ length: 20 }, (_, i) => `Line ${i}`);
			const store = createLineStoreFromLines(lines);

			// At start
			const startVisible = getVisibleLines(store, 0, 10, 5, 5);
			expect(startVisible.startLine).toBe(0);

			// At end
			const endVisible = getVisibleLines(store, 15, 10, 5, 5);
			expect(endVisible.endLine).toBe(20);
		});
	});

	describe('appendToStore', () => {
		it('appends content', () => {
			let store = createLineStore('Line 1');
			store = appendToStore(store, '\nLine 2');

			expect(store.lineCount).toBe(2);
			expect(getLineAtIndex(store, 1)).toBe('Line 2');
		});

		it('returns same store for empty append', () => {
			const store = createLineStore('Line 1');
			const same = appendToStore(store, '');

			expect(same).toBe(store);
		});

		it('handles multiple newlines', () => {
			let store = createLineStore('Line 1');
			store = appendToStore(store, '\nLine 2\nLine 3\nLine 4');

			expect(store.lineCount).toBe(4);
			expect(getLineAtIndex(store, 3)).toBe('Line 4');
		});
	});

	describe('appendLines', () => {
		it('appends array of lines', () => {
			let store = createLineStore('Line 1');
			store = appendLines(store, ['Line 2', 'Line 3']);

			expect(store.lineCount).toBe(3);
			expect(getLineAtIndex(store, 1)).toBe('Line 2');
			expect(getLineAtIndex(store, 2)).toBe('Line 3');
		});

		it('handles empty array', () => {
			const store = createLineStore('Line 1');
			const same = appendLines(store, []);

			expect(same).toBe(store);
		});

		it('handles append to empty store', () => {
			let store = createEmptyLineStore();
			store = appendLines(store, ['Line 1', 'Line 2']);

			expect(store.lineCount).toBe(2);
			expect(getLineAtIndex(store, 0)).toBe('Line 1');
		});
	});

	describe('getLineCount / getByteSize', () => {
		it('returns correct counts', () => {
			const store = createLineStore('Line 1\nLine 2');

			expect(getLineCount(store)).toBe(2);
			expect(getByteSize(store)).toBe(13);
		});
	});

	describe('isStoreEmpty', () => {
		it('returns true for empty store', () => {
			expect(isStoreEmpty(createEmptyLineStore())).toBe(true);
			expect(isStoreEmpty(createLineStore(''))).toBe(true);
		});

		it('returns false for non-empty store', () => {
			expect(isStoreEmpty(createLineStore('x'))).toBe(false);
		});
	});

	describe('getStoreStats', () => {
		it('returns statistics', () => {
			const store = createLineStore('Line 1\nLine 2\nLine 3');
			const stats = getStoreStats(store);

			expect(stats.lineCount).toBe(3);
			expect(stats.byteSize).toBe(20);
			expect(stats.indexed).toBe(true);
			expect(stats.avgLineLength).toBeCloseTo(6.67, 1);
			expect(stats.offsetArrayBytes).toBeGreaterThan(0);
			expect(stats.totalMemoryBytes).toBeGreaterThan(0);
		});
	});

	describe('getLineForOffset', () => {
		it('finds line for byte offset', () => {
			const store = createLineStore('Line 1\nLine 2\nLine 3');

			expect(getLineForOffset(store, 0)).toBe(0);
			expect(getLineForOffset(store, 3)).toBe(0);
			expect(getLineForOffset(store, 7)).toBe(1);
			expect(getLineForOffset(store, 14)).toBe(2);
		});

		it('handles edge cases', () => {
			const store = createLineStore('Line 1\nLine 2');

			expect(getLineForOffset(store, -1)).toBe(0);
			expect(getLineForOffset(store, 1000)).toBe(1);
		});

		it('handles empty store', () => {
			const store = createEmptyLineStore();
			expect(getLineForOffset(store, 0)).toBe(0);
		});
	});

	describe('getOffsetForLine', () => {
		it('returns offset for valid line', () => {
			const store = createLineStore('Line 1\nLine 2\nLine 3');

			expect(getOffsetForLine(store, 0)).toBe(0);
			expect(getOffsetForLine(store, 1)).toBe(7);
			expect(getOffsetForLine(store, 2)).toBe(14);
		});

		it('returns -1 for invalid line', () => {
			const store = createLineStore('Line 1');

			expect(getOffsetForLine(store, -1)).toBe(-1);
			expect(getOffsetForLine(store, 1)).toBe(-1);
		});
	});

	describe('exportContent', () => {
		it('exports full content', () => {
			const content = 'Line 1\nLine 2\nLine 3';
			const store = createLineStore(content);

			expect(exportContent(store)).toBe(content);
		});
	});

	describe('exportLineRange', () => {
		it('exports range as string', () => {
			const store = createLineStore('Line 0\nLine 1\nLine 2\nLine 3');
			const exported = exportLineRange(store, 1, 3);

			expect(exported).toBe('Line 1\nLine 2');
		});
	});

	describe('trimToLineCount', () => {
		it('trims to max lines', () => {
			const store = createLineStore('Line 0\nLine 1\nLine 2\nLine 3\nLine 4');
			const trimmed = trimToLineCount(store, 3);

			expect(trimmed.lineCount).toBe(3);
			expect(getLineAtIndex(trimmed, 0)).toBe('Line 2');
			expect(getLineAtIndex(trimmed, 1)).toBe('Line 3');
			expect(getLineAtIndex(trimmed, 2)).toBe('Line 4');
		});

		it('returns same store if under limit', () => {
			const store = createLineStore('Line 1\nLine 2');
			const same = trimToLineCount(store, 10);

			expect(same).toBe(store);
		});

		it('handles exact limit', () => {
			const store = createLineStore('Line 1\nLine 2');
			const same = trimToLineCount(store, 2);

			expect(same).toBe(store);
		});
	});

	describe('large content', () => {
		it('handles 100K lines', () => {
			const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i.toString().padStart(6, '0')}`);
			const store = createLineStoreFromLines(lines);

			expect(store.lineCount).toBe(100000);
			expect(getLineAtIndex(store, 0)).toBe('Line 000000');
			expect(getLineAtIndex(store, 50000)).toBe('Line 050000');
			expect(getLineAtIndex(store, 99999)).toBe('Line 099999');
		});

		it('getLineRange is fast for large content', () => {
			const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i}`);
			const store = createLineStoreFromLines(lines);

			const range = getLineRange(store, 50000, 50025);

			expect(range.lines.length).toBe(25);
			expect(range.extractTimeMs).toBeLessThan(10); // Should be < 10ms
		});

		it('getVisibleLines with overscan is fast', () => {
			const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i}`);
			const store = createLineStoreFromLines(lines);

			const visible = getVisibleLines(store, 50000, 25, 5, 5);

			expect(visible.lines.length).toBe(35);
			expect(visible.extractTimeMs).toBeLessThan(10);
		});
	});

	describe('streaming append performance', () => {
		it('appends many lines efficiently', () => {
			let store = createEmptyLineStore();

			const start = performance.now();

			// Simulate streaming 1000 lines
			for (let i = 0; i < 100; i++) {
				const batch = Array.from({ length: 10 }, (_, j) => `Log entry ${i * 10 + j}`);
				store = appendLines(store, batch);
			}

			const elapsed = performance.now() - start;

			expect(store.lineCount).toBe(1000);
			expect(elapsed).toBeLessThan(100); // Should be < 100ms
		});
	});
});
